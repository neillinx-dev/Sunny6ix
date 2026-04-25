/**
 * Editable form for a single venue draft. Used by SingleAdd directly; BulkAdd
 * uses a slimmer card variant. Includes the polygon editor (lazy — only
 * mounts when toggled open to keep the page fast for bulk views).
 */
import { useState } from 'react'
import type { Venue } from '../../types'
import { PATIO_TYPES, COVERED_OPTIONS, ORIENTATIONS } from './types'
import { slugify } from './utils'
import PolygonEditor from './PolygonEditor'

interface VenueFormProps {
  venue: Partial<Venue>
  neighborhoods: string[]
  onChange: (next: Partial<Venue>) => void
  /** Hide the polygon section entirely (e.g. compact bulk row). */
  hidePolygon?: boolean
}

export default function VenueForm({ venue, neighborhoods, onChange, hidePolygon }: VenueFormProps) {
  const [polyOpen, setPolyOpen] = useState(false)

  const update = <K extends keyof Venue>(key: K, value: Venue[K]) => {
    onChange({ ...venue, [key]: value })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Name">
        <input
          value={venue.name || ''}
          onChange={(e) => {
            const name = e.target.value
            const auto = slugify(name)
            // If id was the auto-slug from prior name, keep it in sync
            const nextId = !venue.id || venue.id === slugify(venue.name || '') ? auto : venue.id
            onChange({ ...venue, name, id: nextId })
          }}
          className="form-input"
        />
      </Field>
      <Field label="ID (auto from name)">
        <input
          value={venue.id || ''}
          onChange={(e) => update('id', e.target.value)}
          className="form-input font-mono text-[12px]"
        />
      </Field>

      <Field label="Address" full>
        <input
          value={venue.address || ''}
          onChange={(e) => update('address', e.target.value)}
          className="form-input"
        />
      </Field>

      <Field label="Neighborhood">
        <input
          list="neighborhoods"
          value={venue.neighborhood || ''}
          onChange={(e) => update('neighborhood', e.target.value)}
          className="form-input"
        />
        <datalist id="neighborhoods">
          {neighborhoods.map((n) => <option key={n} value={n} />)}
        </datalist>
      </Field>

      <Field label="Patio type">
        <select
          value={venue.patioType || 'sidewalk'}
          onChange={(e) => update('patioType', e.target.value as Venue['patioType'])}
          className="form-input"
        >
          {PATIO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>

      <Field label="Covered?">
        <select
          value={String(venue.covered)}
          onChange={(e) => {
            const v = e.target.value
            const parsed: Venue['covered'] = v === 'true' ? true : v === 'false' ? false : (v as 'partial' | 'retractable')
            update('covered', parsed)
          }}
          className="form-input"
        >
          {COVERED_OPTIONS.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Patio floor (0 = ground)">
        <input
          type="number"
          min={0}
          max={50}
          value={venue.patioFloor ?? 0}
          onChange={(e) => update('patioFloor', Number(e.target.value))}
          className="form-input"
        />
      </Field>

      <Field label="Orientation (degrees from N)">
        <select
          value={venue.orientation ?? 180}
          onChange={(e) => update('orientation', Number(e.target.value))}
          className="form-input"
        >
          {ORIENTATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>

      <Field label="Popularity (1–5)">
        <select
          value={venue.popularity ?? 2}
          onChange={(e) => update('popularity', Number(e.target.value))}
          className="form-input"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} {n === 5 ? '(iconic)' : n === 4 ? '(very popular)' : n === 3 ? '(solid)' : n === 2 ? '(default)' : '(niche)'}</option>
          ))}
        </select>
      </Field>

      <Field label="Latitude">
        <input
          type="number"
          step="0.0000001"
          value={venue.lat ?? 0}
          onChange={(e) => update('lat', Number(e.target.value))}
          className="form-input font-mono text-[12px]"
        />
      </Field>
      <Field label="Longitude">
        <input
          type="number"
          step="0.0000001"
          value={venue.lng ?? 0}
          onChange={(e) => update('lng', Number(e.target.value))}
          className="form-input font-mono text-[12px]"
        />
      </Field>

      <Field label="Website" full>
        <input
          value={venue.website || ''}
          onChange={(e) => update('website', e.target.value || undefined)}
          className="form-input"
          placeholder="https://"
        />
      </Field>

      <Field label="Tags (comma-separated)" full>
        <input
          value={(venue.tags || []).join(', ')}
          onChange={(e) =>
            update(
              'tags',
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          className="form-input"
        />
      </Field>

      {!hidePolygon && (
        <div className="sm:col-span-2 mt-2">
          <button
            type="button"
            onClick={() => setPolyOpen((o) => !o)}
            className="text-[12px] font-semibold text-[#0D1B2A]/70 hover:text-[#0D1B2A]"
          >
            {polyOpen ? '▾' : '▸'} Patio polygon {venue.patioPolygon?.length ? `(${venue.patioPolygon.length} points)` : '(none)'}
          </button>
          {polyOpen && venue.lat && venue.lng && (
            <div className="mt-2">
              <PolygonEditor
                centerLat={venue.lat}
                centerLng={venue.lng}
                initialPolygon={venue.patioPolygon}
                onChange={(poly) => update('patioPolygon', poly || undefined)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="block text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}
