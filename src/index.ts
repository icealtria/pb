import { Hono } from 'hono/quick'

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
  content: string
  secret: string
  ttl?: number
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

function generateSlug(length = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return [...array].map(n => chars[n % chars.length]).join('')
}

app.get('/', (c) => c.text(USAGE))

app.use('/:id?', async (c, next) => {
  if (['POST', 'PUT'].includes(c.req.method)) {
    const { c: body, secret, ttl } = await c.req.parseBody()
    const content = typeof body === 'string' ? body : body instanceof File ? await body.text() : ''
    if (!content) return c.text('Content is empty.', 400)
    c.set('content', content)
    if (typeof secret === 'string') c.set('secret', secret)
    if (typeof ttl === 'string' && !isNaN(Number(ttl))) c.set('ttl', Number(ttl))
  }
  await next()
})

app.post('/:label?', async (c) => {
  const label = c.req.param('label')
  const content = c.get('content')
  const db = c.env.DB

  let slug = label || generateSlug()
  const secret = c.get('secret') || crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const ttl = c.get('ttl') ?? 60 * 60 * 24 * 7
  const expiresAt = Math.floor(Date.now() / 1000) + ttl
  
  let existing = await db.prepare('SELECT slug FROM pastes WHERE slug = ?').bind(slug).first()
  if (existing) return c.text(`'${slug}' already exists at https://${c.env.HOST}/${slug}\n`)

  let tries = 0
  while (existing && tries < 5) {
    slug = generateSlug()
    existing = await db.prepare('SELECT slug FROM pastes WHERE slug = ?').bind(slug).first()
    tries++
  }
  if (existing) return c.text('Failed to generate unique slug\n', 500)

  await db.prepare(
    `INSERT INTO pastes (slug, content, secret, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(slug, content, secret, expiresAt).run()

  return c.text(`url: https://${c.env.HOST}/${slug}\nsecret: ${secret}\n`)
})

app.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT content, expires_at FROM pastes WHERE slug = ?').bind(c.req.param('id')).first()
  if (!row) return c.notFound()
  if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
    await c.env.DB.prepare('DELETE FROM pastes WHERE slug = ?').bind(c.req.param('id')).run()
    return c.notFound()
  }
  return c.text(row.content as string)
})

app.put('/:id', async (c) => {
  const { id } = c.req.param()
  const secret = c.get('secret')
  const content = c.get('content')
  const row = await c.env.DB.prepare('SELECT secret FROM pastes WHERE slug = ?').bind(id).first()
  if (!row) return c.notFound()
  if (row.secret !== secret) return c.text('Invalid secret\n', 403)

  await c.env.DB.prepare('UPDATE pastes SET content = ? WHERE slug = ?').bind(content, id).run()
  return c.text('updated\n')
})

app.delete('/:id', async (c) => {
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
  const rows = await env.DB.prepare("DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP").run();
  console.log(`Deleted ${rows.results.length} expired pastes`)
}

export default {
  fetch: app.fetch,
  scheduled,
}
