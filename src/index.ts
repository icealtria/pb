import { Hono } from 'hono/quick'
import { customAlphabet } from 'nanoid'
import { dataSchema } from './schema'

const USAGE = `# usage
$ echo HAHA | curl -F c=@- https://p.kururin.cc           
url: https://p.kururin.cc/xxxx
secret: abcdef123456

$ curl https://p.kururin.cc/xxxx
HAHA

$ echo NEW | curl -X PUT -F c=@- -F secret=abcdef123456 https://p.kururin.cc/xxxx
updated

$ curl -X DELETE -F secret=abcdef123456 https://p.kururin.cc/xxxx
deleted
`

type Env = {
  HOST: string
  DB: D1Database
}

type Variables = {
  content: string | Uint8Array
  contentType: string
  secret: string
  ttl?: number
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

function generateSlug(length = 6): string {
  return customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', length)()
}

app.get('/', (c) => c.html(`<pre>${USAGE}</pre>`))

app.use('/:id?', async (c, next) => {
  if (['POST', 'PUT'].includes(c.req.method)) {
    const { c: body, secret, ttl } = await c.req.parseBody()
    let content: string | Uint8Array
    let contentType: string

    if (body instanceof File) {
      content = new Uint8Array(await body.arrayBuffer())
      contentType = body.type || 'application/octet-stream'
    } else if (typeof body === 'string') {
      content = body
      contentType = 'text/plain'
    } else {
      return c.text('Invalid content format.', 400)
    }

    if (!content.length) return c.text('Content is empty.', 400)
    if (content.length > 2 * 1024 * 1024) return c.text('Content too large. Maximum size is 2MB.', 413)
    c.set('content', content)
    c.set('contentType', contentType)
    if (typeof secret === 'string') c.set('secret', secret)
    if (typeof ttl === 'string' && !isNaN(Number(ttl))) c.set('ttl', Number(ttl))
  }
  await next()
})

app.post('/:label?', async (c) => {
  const label = c.req.param('label')
  const content = c.get('content')
  const contentType = c.get('contentType')
  const db = c.env.DB

  const secret = c.get('secret') || generateSlug(8)
  const ttl = c.get('ttl') ?? 60 * 60 * 24 * 7
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()

  let slug = label || generateSlug()
  let tries = 0

  while (tries < 5) {
    try {
      await db.prepare(`
        INSERT INTO pastes (slug, content, content_type, secret, expires_at) VALUES (?, ?, ?, ?, ?)
      `).bind(slug, content, contentType, secret, expiresAt).run()

      return c.text(`url: https://${c.env.HOST}/${slug}\nsecret: ${secret}\n`)
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        if (label) {
          return c.text(`'${slug}' already exists at https://${c.env.HOST}/${slug}\n`)
        }
        slug = generateSlug()
        tries++
        continue
      }
      return c.text('Internal Server Error\n', 500)
    }
  }

  return c.text('Failed to generate unique slug\n', 500)
})

app.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT content, content_type, expires_at FROM pastes WHERE slug = ?').bind(c.req.param('id')).first()
  const parsed = dataSchema.safeParse(row)
  if (!parsed.success) {
    console.error(parsed.error)
    return c.text('Internal Server Error\n', 500)
  }

  const data = parsed.data

  if (data.expires_at < new Date()) {
    await c.env.DB.prepare('DELETE FROM pastes WHERE slug = ?').bind(c.req.param('id')).run()
    return c.notFound()
  }

  c.header('Content-Type', data.content_type)
  if (data.content_type.startsWith('text/')) {
    return c.body(data.content)
  }
  return c.body((data.content))
})
  .put('/:id', async (c) => {
    const { id } = c.req.param()
    const secret = c.get('secret')
    const content = c.get('content')
    const contentType = c.get('contentType')
    const row = await c.env.DB.prepare('SELECT secret FROM pastes WHERE slug = ?').bind(id).first()
    if (!row) return c.notFound()
    if (row.secret !== secret) return c.text('Invalid secret\n', 403)

    await c.env.DB.prepare('UPDATE pastes SET content = ?, content_type = ? WHERE slug = ?').bind(content, contentType, id).run()
    return c.text('updated\n')
  })
  .delete('/:id', async (c) => {
    const { id } = c.req.param()
    const { secret } = await c.req.parseBody()
    if (typeof secret !== 'string') return c.text('Missing secret\n', 400)
    const row = await c.env.DB.prepare('SELECT secret FROM pastes WHERE slug = ?').bind(id).first()
    if (!row) return c.notFound()
    if (row.secret !== secret) return c.text('Invalid secret\n', 403)
    await c.env.DB.prepare('DELETE FROM pastes WHERE slug = ?').bind(id).run()
    return c.text('deleted\n')
  })

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  await env.DB.prepare("DELETE FROM pastes WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')").run();
}

export default {
  fetch: app.fetch,
  scheduled,
}
