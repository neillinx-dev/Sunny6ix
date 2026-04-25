/**
 * Internal types for the admin tool. Most of these mirror the Venue schema
 * in src/types.ts but allow undefined fields during the editing phase.
 */
import type { Venue } from '../../types'

export interface PlacesLookupResult {
  found: boolean
  placeId?: string
  name?: string
  address?: string
  shortAddress?: string
  website?: string
  types?: string[]
  rating?: number
  ratingCount?: number
  lat?: number
  lng?: number
  coords?: { lat: number; lng: number }
  nameHint?: string | null
  error?: string
}

/** Editable form-state for a venue mid-creation. */
export interface VenueDraft {
  /** Stable key while editing (random nanoid-ish). Becomes the venue id on save. */
  draftKey: string
  /** User-pasted Google Maps URL (kept for reference / re-fetch). */
  url: string
  status: 'idle' | 'looking-up' | 'ready' | 'error'
  error?: string
  /** Place API result snapshot. */
  lookup?: PlacesLookupResult
  /** Final venue payload — fields are filled progressively. */
  venue: Partial<Venue>
}

export const PATIO_TYPES: Venue['patioType'][] = ['sidewalk', 'rooftop', 'backyard', 'courtyard']

export const COVERED_OPTIONS: Array<{ value: Venue['covered']; label: string }> = [
  { value: false, label: 'No (open)' },
  { value: 'partial', label: 'Partial' },
  { value: 'retractable', label: 'Retractable' },
  { value: true, label: 'Yes (covered)' },
]

export const ORIENTATIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'N (0°)' },
  { value: 45, label: 'NE (45°)' },
  { value: 90, label: 'E (90°)' },
  { value: 135, label: 'SE (135°)' },
  { value: 180, label: 'S (180°)' },
  { value: 225, label: 'SW (225°)' },
  { value: 270, label: 'W (270°)' },
  { value: 315, label: 'NW (315°)' },
]
