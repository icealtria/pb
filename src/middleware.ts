import { Context, Next } from "hono"
import { formSchema } from "./schema"

export const formVaild = async (c: Context, next: Next) => {
    if (['POST', 'PUT'].includes(c.req.method)) {
        const { c: body, ttl } = await c.req.parseBody()

        const parsed = formSchema.safeParse({ c: body, ttl })
        if (!parsed.success) {
            return c.text('Invalid request format.', 400)
        }
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
        if (typeof ttl === 'string' && !isNaN(Number(ttl))) c.set('ttl', Number(ttl))
    }
    await next()
}
