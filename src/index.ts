import { Hono } from 'hono/quick'
import { BodyData } from 'hono/utils/body'
import { md5 } from 'hono/utils/crypto'

type Env = {
  HOST: string
  PB: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/:label?', async (c) => {
  const { label } = c.req.param();
  const body = await c.req.parseBody();
  const content = await ex_content(body);
  if (!content) {
    return c.text('Content is empty.', 400);
  }
  try {
    let key = label ? label : (await md5(content))?.slice(0, 4);
    if (!key) {
      return c.status(500);
    }
    const url = constructURL(c.env.HOST, key);

    const existingContent = await c.env.PB.get(key);
    if (existingContent) {
      return c.text(`'${key}' already exists at ${url}\n`);
    }

    await c.env.PB.put(key, content);

    return c.text(`url: ${url}\n`);
  } catch (error) {
    console.error('Error occurred:', error);
    return c.status(500);
  }
});


app.get('/:id', async (c) => {
  const { id } = c.req.param()
  try {
    const content = await c.env.PB.get(id)
    if (content) {
      return c.text(content)
    }
    return c.notFound()
  } catch (error) {
    console.error('Error occurred:', error)
    return c.status(500)
  }
}).put(async (c) => {
  const { id } = c.req.param()
  const body = await c.req.parseBody()
  try {
    const content = await ex_content(body)
    if (!content) {
      return c.text('Content is empty.', 400);
    }
    await c.env.PB.put(id, content)
    return c.text(`${c.req.url} has been updated.\n`)
  } catch (error) {
    console.error('Error occurred:', error)
    return c.status(500)
  }
}).delete(async (c) => {
  const { id } = c.req.param()
  try {
    await c.env.PB.delete(id)
    return c.text('deleted\n')
  } catch (error) {
    console.error('Error occurred:', error)
    return c.status(500)
  }
})

async function ex_content(body: BodyData) {
  let content = ''
  const data = body['c']
  if (typeof data === 'string') {
    content = data
  } else if (data instanceof File) {
    const text = await data.text()
    content = text
  }
  return content
}

function constructURL(host: string, key: string): string {
  return `https://${host}/${key}`
}

export default app
