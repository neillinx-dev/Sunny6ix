/**
 * Thin client wrappers around the dev-only /__api/places and /__api/save
 * endpoints exposed by vite-plugin-admin.ts.
 */
import type { PlacesLookupResult } from './types'
import type { Venue } from '../../types'

export async function placesLookup(input: { url?: string; query?: string }): Promise<PlacesLookupResult> {
  const res = await fetch('/__api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Places lookup failed (${res.status}): ${body}`)
  }
  return res.json()
}

export async function saveVenue(venue: Venue, mode: 'add' | 'update' = 'add'): Promise<{ action: string; total: number }> {
  const res = await fetch('/__api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ venue, mode }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`)
  return data
}
