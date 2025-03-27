import { customAlphabet } from 'nanoid'
import { D1Database } from '@cloudflare/workers-types'

export interface PasteData {
    content: string | Uint8Array
    contentType: string
    ttl?: number
    label?: string
}

export class PasteService {
    constructor(private db: D1Database) { }

    private generateSlug(length = 6): string {
        return customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', length)()
    }

    private generateId(): string {
        return this.generateSlug(13)
    }

    private calculateExpiry(ttl: number = 60 * 60 * 24 * 7): string {
        return new Date(Date.now() + ttl * 1000).toISOString()
    }

    async createUrlPaste(url: string, ttl?: number): Promise<{ id: string; slug: string; sunset: string }> {
        let tries = 0
        while (tries < 5) {
            try {
                const id = this.generateId()
                const slug = this.generateSlug()
                const sunset = this.calculateExpiry(ttl)

                await this.db
                    .prepare(`INSERT INTO pastes (id, slug, content, content_type, expires_at) VALUES (?, ?, ?, ?, ?)`)
                    .bind(id, slug, url, 'url', sunset)
                    .run()

                return { id, slug, sunset }
            } catch (err: any) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    tries++
                    continue
                }
                throw err
            }
        }
        throw new Error('Failed to generate unique slug')
    }

    async createPaste(data: PasteData): Promise<{ id: string; slug: string; sunset: string }> {
        const slug = data.label || this.generateSlug()
        const sunset = this.calculateExpiry(data.ttl)

        if (data.label) {
            const existing = await this.db.prepare('SELECT slug FROM pastes WHERE slug = ?').bind(slug).first()
            if (existing) {
                throw new Error(`Label ${slug} already exists`)
            }
        }

        let tries = 0
        while (tries < 5) {
            try {
                const id = this.generateId()
                await this.db
                    .prepare(`INSERT INTO pastes (id, slug, content, content_type, expires_at) VALUES (?, ?, ?, ?, ?)`)
                    .bind(id, slug, data.content, data.contentType, sunset)
                    .run()

                return { id, slug, sunset }
            } catch (err: any) {
                if (err.message.includes('UNIQUE constraint failed') && !data.label) {
                    tries++
                    continue
                }
                throw err
            }
        }
        throw new Error('Failed to generate unique slug')
    }

    async updatePaste(id: string, content: string | Uint8Array, contentType: string): Promise<void> {
        const result = await this.db
            .prepare('UPDATE pastes SET content = ?, content_type = ? WHERE id = ?')
            .bind(content, contentType, id)
            .run()

        if (!result.meta.changes) {
            throw new Error('Paste not found')
        }
    }

    async deletePaste(id: string): Promise<void> {
        const result = await this.db
            .prepare('DELETE FROM pastes WHERE id = ?')
            .bind(id)
            .run()

        if (!result.meta.changes) {
            throw new Error('Paste not found')
        }
    }

    async getPaste(slug: string): Promise<{ content: string | Uint8Array; content_type: string; expires_at: string } | null> {
        return await this.db
            .prepare('SELECT id, slug, content, content_type, expires_at FROM pastes WHERE slug = ?')
            .bind(slug)
            .first()
    }

    async deleteExpired(): Promise<void> {
        await this.db
            .prepare("DELETE FROM pastes WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')")
            .run()
    }
}