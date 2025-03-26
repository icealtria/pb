import { Hono } from 'hono/quick'
import { customAlphabet } from 'nanoid'
import { dataSchema } from './schema'
import { formVaild } from './middleware'

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
  ttl?: number
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

function generateSlug(length = 6): string {
  return customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', length)()
}

app.get('/', (c) => c.html(`<pre>${USAGE}</pre>`))

app.use('/:id?', formVaild)

app.post('/:label?', async (c) => {
  const url = new URL(c.req.url)
  const hostname = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  const label = c.req.param('label')

  const content = c.get('content')
  const contentType = c.get('contentType')
  const db = c.env.DB

  const ttl = c.get('ttl') ?? 60 * 60 * 24 * 7
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()

  let slug = label || generateSlug()
  let tries = 0

  while (tries < 5) {
    try {
      const id = generateSlug(13);
      await db.prepare(`
        INSERT INTO pastes (id, slug, content, content_type, expires_at) VALUES (?, ?, ?, ?, ?)
      `).bind(id, slug, content, contentType, expiresAt).run()

      return c.text(`url: https://${hostname}/${slug}\nid: ${id}\nexpires_at: ${expiresAt}\n`)
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        if (label) {
          return c.text(`'${slug}' already exists at https://${hostname}/${slug}\n`)
        }
        slug = generateSlug()
        tries++
        continue
      }
      console.error(err)
      return c.text('Internal Server Error\n', 500)
    }
  }
  return c.text('Failed to generate unique slug\n', 500)
})

app.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT content, content_type, expires_at FROM pastes WHERE slug = ?').bind(c.req.param('id')).first()
  if (!row) return c.notFound()
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
    const content = c.get('content')
    const contentType = c.get('contentType')
    const row = await c.env.DB.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first()
    if (!row) return c.notFound()

    await c.env.DB.prepare('UPDATE pastes SET content = ?, content_type = ? WHERE id = ?').bind(content, contentType, id).run()
    return c.text('updated\n')
  })
  .delete('/:id', async (c) => {
    const { id } = c.req.param()
    const row = await c.env.DB.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first()
    if (!row) return c.notFound()
    await c.env.DB.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run()
    return c.text('deleted\n')
  })

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  await env.DB.prepare("DELETE FROM pastes WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')").run();
}

export default {
  fetch: app.fetch,
  scheduled,
}
