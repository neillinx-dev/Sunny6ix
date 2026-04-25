import type { Venue } from '../../types'
import type { PlacesLookupResult } from './types'

/**
 * Slugify a place name into a venue id. Matches the convention already in
 * venues.json (e.g. "Bar Raval" → "bar-raval", "Côte de Bœuf" → "cote-de-boeuf").
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Best-effort neighborhood guess from a Toronto address. Falls back to
 * empty string — the user picks from a dropdown then.
 */
const NEIGHBORHOOD_HINTS: Array<[RegExp, string]> = [
  [/\b(king|queen|spadina|bathurst).{0,30}(west|w\b)/i, 'King West'],
  [/\bqueen st w\b|\bqueen w\b/i, 'Queen West'],
  [/\bossington/i, 'Ossington'],
  [/\bdundas (st )?w\b|\bwest end/i, 'West End'],
  [/\bkensington|chinatown/i, 'Kensington/Chinatown'],
  [/\bharbour|queens quay|toronto islands/i, 'Harbourfront'],
  [/\briverside|broadview/i, 'Riverside'],
  [/\bleslieville/i, 'Leslieville'],
  [/\bdistillery/i, 'Distillery District'],
  [/\bfinancial|bay st/i, 'Financial District'],
  [/\bentertainment|john st/i, 'Entertainment District'],
  [/\byorkville|cumberland|bloor st w/i, 'Yorkville'],
  [/\blittle italy|college st/i, 'Little Italy'],
  [/\bportugal/i, 'Little Portugal'],
  [/\bjunction|dundas (st )?w/i, 'The Junction'],
  [/\bparkdale/i, 'Parkdale'],
  [/\bdanforth|greektown/i, 'The Danforth'],
  [/\bsummerhill|rosedale/i, 'Summerhill/Rosedale'],
  [/\bcabbagetown/i, 'Cabbagetown'],
  [/\bport lands?/i, 'Port Lands'],
]

export function guessNeighborhood(address: string): string {
  for (const [pat, hood] of NEIGHBORHOOD_HINTS) {
    if (pat.test(address)) return hood
  }
  return ''
}

export function existingNeighborhoods(venues: Venue[]): string[] {
  return [...new Set(venues.map((v) => v.neighborhood))].sort()
}

/**
 * Map a Places API "type" string to our patioType enum. Best-effort —
 * real-world Places types overlap a lot, so we let the user override.
 */
export function guessPatioType(types: string[] | undefined): Venue['patioType'] {
  if (!types) return 'sidewalk'
  if (types.includes('rooftop')) return 'rooftop'
  if (types.includes('cafe') || types.includes('coffee_shop')) return 'sidewalk'
  return 'sidewalk'
}

/**
 * Best-guess popularity tier from Places rating × log(reviewCount).
 *  - 5: highly-reviewed, high-rating destinations
 *  - 4: very popular
 *  - 3: solid
 *  - 2: default
 */
export function guessPopularity(rating?: number, count?: number): number {
  if (!rating || !count) return 2
  const score = rating * Math.log10(Math.max(10, count))
  if (score >= 16) return 5
  if (score >= 13) return 4
  if (score >= 10) return 3
  return 2
}

/**
 * Default tag set seeded by Places types — user can edit on the form.
 */
export function guessTags(types: string[] | undefined): string[] {
  if (!types) return []
  const out = new Set<string>()
  if (types.includes('bar')) out.add('bar')
  if (types.includes('restaurant')) out.add('restaurant')
  if (types.includes('cafe')) out.add('cafe')
  if (types.includes('night_club')) out.add('nightlife')
  if (types.some((t) => /brewery|brewpub/.test(t))) out.add('brewery')
  if (types.includes('cocktail_bar')) out.add('cocktails')
  if (types.includes('wine_bar')) out.add('wine-bar')
  if (types.includes('italian_restaurant')) out.add('italian')
  if (types.includes('pizza_restaurant')) out.add('pizza')
  return [...out]
}

/**
 * Build a freshly-seeded venue from a Places API lookup result.
 * Caller fills the rest in the form before saving.
 */
export function venueFromLookup(lookup: PlacesLookupResult): Partial<Venue> {
  const lat = lookup.lat ?? lookup.coords?.lat
  const lng = lookup.lng ?? lookup.coords?.lng
  return {
    id: lookup.name ? slugify(lookup.name) : '',
    name: lookup.name || '',
    address: lookup.shortAddress || lookup.address || '',
    neighborhood: guessNeighborhood(lookup.address || ''),
    lat: lat ?? 0,
    lng: lng ?? 0,
    patioType: guessPatioType(lookup.types),
    covered: false,
    patioFloor: 0,
    orientation: 180,
    samplePoints: lat && lng ? [[lng, lat]] : [],
    tags: guessTags(lookup.types),
    website: lookup.website || undefined,
    popularity: guessPopularity(lookup.rating, lookup.ratingCount),
  }
}

export function randomKey(): string {
  return Math.random().toString(36).slice(2, 10)
}
