import { Context, Next } from "hono"
import { formSchema } from "./schema"
import { fileTypeFromBuffer } from 'file-type'

const MAX_SIZE = 2 * 1024 * 1024

export const formValid = async (c: Context, next: Next) => {
    if (!['POST', 'PUT'].includes(c.req.method)) return await next()

    const { c: body, sunset } = await c.req.parseBody()

    const parsed = formSchema.safeParse({ c: body, sunset })
    if (!parsed.success) return c.text('Invalid request format.', 400)

    const url = new URL(c.req.url);
    const addr = url.protocol + '//' + url.hostname + (url.port ? ':' + url.port : '')
    c.set('addr', addr)

    const { content, contentType } = await parseContent(body)
    if (!content) return c.text('Invalid content format.', 400)

    if (content.length === 0) return c.text('Content is empty.', 400)
    if (content.length > MAX_SIZE) return c.text('Content too large. Maximum size is 2MB.', 413)

    c.set('content', content)
    c.set('contentType', contentType)
    if (typeof sunset === 'string' && !isNaN(Number(sunset))) c.set('sunset', Number(sunset))

    await next()
}

const parseContent = async (body: any): Promise<{ content: string | Uint8Array | null, contentType: string }> => {
    if (body instanceof File) {
        const content = new Uint8Array(await body.arrayBuffer())
        const contentType = body.type || (await fileTypeFromBuffer(content))?.mime || 'application/octet-stream'

        if (contentType === 'application/octet-stream' && isTextContent(content)) {
            return { content: new TextDecoder('utf-8').decode(content), contentType: 'text/plain' }
        }

        return { content, contentType }
    }

    if (typeof body === 'string') {
        return { content: body, contentType: 'text/plain' }
    }

    return { content: null, contentType: '' }
}

const isTextContent = (buffer: Uint8Array): boolean => {
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(buffer)
        return true
    } catch {
        return false
    }
}
