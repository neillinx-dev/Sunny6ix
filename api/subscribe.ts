/**
 * Vercel serverless: POST { email } -> Resend Audiences contact create.
 * Reads RESEND_API_KEY + RESEND_AUDIENCE_ID from process.env.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

interface VercelRequest extends IncomingMessage {
  body?: unknown
  method?: string
}
interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!apiKey || !audienceId) {
    res.status(500).json({ error: 'Resend env vars missing' })
    return
  }

  let body: unknown = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { /* fallthrough */ }
  }
  // If body wasn't parsed by the platform, try reading the stream.
  if (!body || typeof body !== 'object') {
    try {
      body = await new Promise((resolveJson, reject) => {
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          try {
            const txt = Buffer.concat(chunks).toString('utf-8')
            resolveJson(txt ? JSON.parse(txt) : {})
          } catch (e) { reject(e) }
        })
        req.on('error', reject)
      })
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }
  }

  const email = (body as { email?: unknown }).email
  if (typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'email is required' })
    return
  }

  try {
    const r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    })
    if (!r.ok) {
      const text = await r.text()
      res.status(r.status).json({ error: `Resend ${r.status}: ${text}` })
      return
    }
    const data = await r.json()
    res.status(200).json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
