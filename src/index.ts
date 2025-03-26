import { Hono } from 'hono/quick'
import { customAlphabet } from 'nanoid'
import { dataSchema } from './schema'
import { formVaild } from './middleware'
import { highlight } from './highlight'
import home from './home'

type Env = {
  HOST: string
  DB: D1Database
}

type Variables = {
  content: string | Uint8Array
  contentType: string
  hostname: string
  ttl?: number
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

function generateSlug(length = 6): string {
  return customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', length)()
}

app.route('/', home)

app.use('/:id?', formVaild)

app.post('/:label?', async (c) => {
  const label = c.req.param('label')
  
  if (label) {
    if (!label.startsWith('@') && !label.startsWith('~')) {
      return c.text('Invalid label: must start with @ or ~\n', 400)
    }
    if (label.length !== 5) {
      return c.text('Invalid label: must be exactly 5 characters long (including @ or ~)\n', 400)
    }
  }

  const hostname = c.get('hostname')
  const content = c.get('content')
  const contentType = c.get('contentType')
  const db = c.env.DB

  const ttl = c.get('ttl') ?? 60 * 60 * 24 * 7
  const sunset = new Date(Date.now() + ttl * 1000).toISOString()

  let slug = label || generateSlug()
  let tries = 0

  while (tries < 5) {
    try {
      const id = generateSlug(13);
      await db.prepare(`
        INSERT INTO pastes (id, slug, content, content_type, expires_at) VALUES (?, ?, ?, ?, ?)
      `).bind(id, slug, content, contentType, sunset).run()

      if (c.req.query('u') === '1') {
        return c.text(`url: https://${hostname}/${slug}`)
      }

      return c.text(`url: https://${hostname}/${slug}\nid: ${id}\nsunset: ${sunset}\n`)
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

app.get('/:id/:hl?', async (c) => {
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
    if (data.content_type.startsWith('text/')) {
      const hl = c.req.param('hl')
      if (hl) {
        return c.html(highlight(data.content, hl))
      }
    }
    return c.body((data.content))
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
    return c.text(`${c.get('hostname')}/${row.slug} updated\n`)
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
