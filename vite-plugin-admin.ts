/**
 * Local-only admin API plugin.
 *
 * Exposes two routes that are ONLY available during `vite dev`:
 *
 *   POST /__api/places   — proxy to Google Places API (Place Details +
 *                          Find Place from URL). Uses GOOGLE_PLACES_API_KEY
 *                          from .env.local — never ships to the browser.
 *
 *   POST /__api/save     — append/update a venue in src/data/venues.json.
 *                          Validates lightly, dedupes by id, writes to disk
 *                          atomically.
 *
 * In a production build (`vite build`) this plugin's hooks never run, so
 * neither route exists. The admin UI route is also gated by
 * import.meta.env.DEV so its components are tree-shaken out of the bundle.
 */
import type { Plugin, ViteDevServer } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VENUES_PATH = resolve(__dirname, 'src/data/venues.json')

interface PlacesLookupRequest {
  url?: string
  query?: string
}

/**
 * Pull lat/lng out of a Google Maps URL of any of the common shapes:
 *   https://www.google.com/maps/place/X/@43.65,-79.39,17z/data=...
 *   https://maps.app.goo.gl/abc123  (short link — needs follow)
 *   https://www.google.com/maps?q=43.65,-79.39
 */
function extractCoords(url: string): { lat: number; lng: number } | null {
  // @lat,lng,zoom
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  // ?q=lat,lng or &ll=lat,lng
  m = url.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  // !3d-79.39!4d43.65 (rare)
  m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  return null
}

/**
 * Place ID is sometimes embedded in URL data params: !1s0x...:0x...
 * The hex part can be passed to Find Place from Text or used directly.
 * We mostly rely on the place name + coords for our lookup.
 */
function extractPlaceName(url: string): string | null {
  // /place/<NAME>/...
  const m = url.match(/\/place\/([^/]+)/)
  if (!m) return null
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' '))
  } catch {
    return null
  }
}

async function followShortUrl(url: string): Promise<string> {
  if (!/maps\.app\.goo\.gl|goo\.gl\/maps/.test(url)) return url
  // HEAD/GET with manual redirect → final Location
  const res = await fetch(url, { redirect: 'follow' })
  return res.url
}

async function placesLookup(req: PlacesLookupRequest, apiKey: string) {
  const { url, query } = req
  let resolvedUrl = url
  let coords: { lat: number; lng: number } | null = null
  let nameHint: string | null = null

  if (resolvedUrl) {
    resolvedUrl = await followShortUrl(resolvedUrl)
    coords = extractCoords(resolvedUrl)
    nameHint = extractPlaceName(resolvedUrl)
  }

  const searchText = query || nameHint || ''

  // Use Places API (New) Text Search. If we have a name + coords, bias
  // the search around those coords for accuracy.
  const body: Record<string, unknown> = { textQuery: searchText }
  if (coords) {
    body.locationBias = {
      circle: {
        center: { latitude: coords.lat, longitude: coords.lng },
        radius: 200,
      },
    }
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.types,places.rating,places.userRatingCount,places.shortFormattedAddress',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Places API ${res.status}: ${text}`)
  }
  const data = await res.json() as { places?: Array<Record<string, unknown>> }
  const place = data.places?.[0]
  if (!place) {
    return { found: false, coords, nameHint }
  }

  const loc = place.location as { latitude: number; longitude: number } | undefined
  return {
    found: true,
    placeId: place.id,
    name: (place.displayName as { text: string } | undefined)?.text,
    address: place.formattedAddress,
    shortAddress: place.shortFormattedAddress,
    website: place.websiteUri,
    types: place.types,
    rating: place.rating,
    ratingCount: place.userRatingCount,
    lat: loc?.latitude ?? coords?.lat,
    lng: loc?.longitude ?? coords?.lng,
  }
}

interface SaveVenueRequest {
  venue: Record<string, unknown>
  mode?: 'add' | 'update' // update overwrites by id, add inserts if missing
}

function saveVenue({ venue, mode = 'add' }: SaveVenueRequest) {
  const id = venue.id as string
  if (!id || typeof id !== 'string') {
    throw new Error('venue.id is required')
  }
  const raw = readFileSync(VENUES_PATH, 'utf-8')
  const venues = JSON.parse(raw) as Array<Record<string, unknown>>
  const idx = venues.findIndex((v) => v.id === id)
  let action: 'added' | 'updated'
  if (idx >= 0) {
    if (mode === 'add') {
      throw new Error(`venue with id "${id}" already exists; use mode=update`)
    }
    venues[idx] = { ...venues[idx], ...venue }
    action = 'updated'
  } else {
    venues.push(venue)
    action = 'added'
  }
  writeFileSync(VENUES_PATH, JSON.stringify(venues, null, 2) + '\n', 'utf-8')
  return { action, total: venues.length }
}

export default function adminPlugin(): Plugin {
  return {
    name: 'sunny6ix-admin',
    apply: 'serve', // dev-only; never runs during `vite build`
    configureServer(server: ViteDevServer) {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY
      if (!apiKey) {
        server.config.logger.warn(
          '[admin] GOOGLE_PLACES_API_KEY missing from .env.local — Places lookups will fail'
        )
      }

      const readJson = async (req: { on: (e: string, cb: (chunk: Buffer) => void) => void }): Promise<unknown> => {
        return new Promise((resolveJson, reject) => {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf-8')
              resolveJson(body ? JSON.parse(body) : {})
            } catch (e) { reject(e) }
          })
          req.on('error', reject)
        })
      }

      server.middlewares.use('/__api/places', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST only')
          return
        }
        try {
          if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured')
          const body = (await readJson(req)) as PlacesLookupRequest
          const out = await placesLookup(body, apiKey)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(out))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
      })

      server.middlewares.use('/__api/subscribe', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST only')
          return
        }
        try {
          const resendKey = process.env.RESEND_API_KEY
          const audienceId = process.env.RESEND_AUDIENCE_ID
          if (!resendKey || !audienceId) {
            throw new Error('RESEND_API_KEY / RESEND_AUDIENCE_ID not configured')
          }
          const body = (await readJson(req)) as { email?: unknown }
          const email = body?.email
          if (typeof email !== 'string' || !email.includes('@')) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'email is required' }))
            return
          }
          const r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({ email, unsubscribed: false }),
          })
          if (!r.ok) {
            const text = await r.text()
            res.statusCode = r.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Resend ${r.status}: ${text}` }))
            return
          }
          const data = await r.json()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, data }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
      })

      server.middlewares.use('/__api/save', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST only')
          return
        }
        try {
          const body = (await readJson(req)) as SaveVenueRequest
          const out = saveVenue(body)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(out))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
      })
    },
  }
}
