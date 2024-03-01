import { Hono } from 'hono/quick'
import { sha1 } from 'hono/utils/crypto'

const USAGE = `# usage

$ echo HAHA | curl -F c=@- https://p.hoyo.win           
url: https://p.hoyo.win/635e

$ curl https://p.hoyo.win/635e
HAHA

$ echo HAHA | curl -F c=@- https://p.hoyo.win           

'635e' already exists at https://p.hoyo.win/635e

$ echo HAHAHA | curl -X PUT -F c=@- https://p.hoyo.win/635e 
https://p.hoyo.win/635e has been updated

$ curl https://p.hoyo.win/635e
HAHAHA

$ curl -X DELETE https://p.hoyo.win/635e
deleted
`

type Env = {
  HOST: string
  PB: KVNamespace
}

type Variables = {
  content: string
}

const app = new Hono<{ Bindings: Env, Variables: Variables }>()

app.get('/', (c) => {
  return c.text(USAGE)
})

app.use('/:id?', async (c, next) => {
  if (['POST', 'PUT'].includes(c.req.method)) {
    const { c: body } = await c.req.parseBody();
    const content = typeof body === 'string' ? body : body instanceof File ? await body.text() : '';
    if (!content) return c.text('Content is empty.', 400);
    c.set('content', content);
  }
  await next();
});

app.post('/:label?', async (c) => {
  const { label } = c.req.param();
  const content = c.get('content')
  let key = label ? label : (await sha1(content))?.slice(0, 4);
  if (!key) {
    return c.status(500);
  }
  const url = `https://${c.env.HOST}/${key}`;

  const existingContent = await c.env.PB.get(key);
  if (existingContent) {
    return c.text(`'${key}' already exists at ${url}\n`);
  }
  await c.env.PB.put(key, content);
  return c.text(`url: ${url}\n`);
});

app.get('/:id', async (c) => {
  const content = await c.env.PB.get(c.req.param('id'));
  return content ? c.text(content) : c.notFound();
}).put(async (c) => {
  const { id } = c.req.param();
  await c.env.PB.put(id, c.get('content'));
  return c.text(`${c.req.url} has been updated\n`);
}).delete(async (c) => {
  await c.env.PB.delete(c.req.param('id'));
  return c.text('deleted\n');
})

export default app
