/**
 * Vercel Edge function: POST { email } -> Resend Audiences contact create.
 * Edge runtime uses Web standard Request/Response — no Node types required.
 * Reads RESEND_API_KEY + RESEND_AUDIENCE_ID from environment.
 */

export const config = { runtime: 'edge' }

// Vercel Edge exposes env vars on globalThis.process.env. We read it via
// a typed shim so the file builds cleanly without @types/node.
const env: Record<string, string | undefined> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((globalThis as any).process?.env as Record<string, string | undefined>) ?? {}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405)
  }

  const apiKey = env.RESEND_API_KEY
  const audienceId = env.RESEND_AUDIENCE_ID
  if (!apiKey || !audienceId) {
    return json({ error: 'Resend env vars missing' }, 500)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const email = (body as { email?: unknown } | null)?.email
  if (typeof email !== 'string' || !email.includes('@')) {
    return json({ error: 'email is required' }, 400)
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
      return json({ error: `Resend ${r.status}: ${text}` }, r.status)
    }
    const data = await r.json()
    return json({ ok: true, data }, 200)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
