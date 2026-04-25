/**
 * Bulk-add mode. Paste 1–20 Google Maps URLs (one per line). Each gets
 * looked up in parallel; result rendered as a card. User can set defaults
 * (e.g. "all sidewalk patios") that pre-fill every card; per-card overrides
 * still work. Polygon drawing is intentionally NOT here — easier to do
 * polygons one-at-a-time in the Polygons tab after import.
 */
import { useState } from 'react'
import type { Venue } from '../../types'
import type { VenueDraft } from './types'
import { PATIO_TYPES, COVERED_OPTIONS } from './types'
import { placesLookup, saveVenue } from './api'
import { venueFromLookup, randomKey } from './utils'
import VenueForm from './VenueForm'

interface Props {
  existingVenues: Venue[]
  neighborhoods: string[]
}

interface Defaults {
  patioType: Venue['patioType']
  covered: Venue['covered']
  popularity: number
  neighborhood: string
}

export default function BulkAdd({ existingVenues, neighborhoods }: Props) {
  const [input, setInput] = useState('')
  const [drafts, setDrafts] = useState<VenueDraft[]>([])
  const [defaults, setDefaults] = useState<Defaults>({
    patioType: 'sidewalk',
    covered: false,
    popularity: 2,
    neighborhood: '',
  })
  const [savingAll, setSavingAll] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  async function lookupAll() {
    const lines = input.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    const fresh: VenueDraft[] = lines.map((l) => ({
      draftKey: randomKey(),
      url: l,
      status: 'looking-up',
      venue: {},
    }))
    setDrafts(fresh)
    setSavedMsg(null)

    // Fetch in parallel — Places API rate limit is generous (100s/sec)
    await Promise.all(
      fresh.map(async (d) => {
        try {
          const result = await placesLookup({ url: d.url })
          if (!result.found) {
            updateDraft(d.draftKey, { status: 'error', error: 'No match', lookup: result })
            return
          }
          const seeded = venueFromLookup(result)
          // Apply defaults for any fields the lookup left blank or default
          if (defaults.neighborhood && !seeded.neighborhood) seeded.neighborhood = defaults.neighborhood
          seeded.patioType = defaults.patioType
          seeded.covered = defaults.covered
          if (seeded.popularity === 2) seeded.popularity = defaults.popularity
          updateDraft(d.draftKey, { status: 'ready', lookup: result, venue: seeded })
        } catch (e) {
          updateDraft(d.draftKey, { status: 'error', error: (e as Error).message })
        }
      })
    )
  }

  function updateDraft(key: string, patch: Partial<VenueDraft>) {
    setDrafts((prev) => prev.map((d) => (d.draftKey === key ? { ...d, ...patch } : d)))
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.draftKey !== key))
  }

  async function saveAll() {
    setSavingAll(true)
    setSavedMsg(null)
    let added = 0
    let updated = 0
    let failed = 0
    for (const d of drafts) {
      if (d.status !== 'ready') continue
      const v = d.venue as Venue
      if (!v.id || !v.name || !v.lat || !v.lng) { failed++; continue }
      const exists = existingVenues.some((e) => e.id === v.id)
      try {
        const final: Venue = {
          ...v,
          samplePoints: v.samplePoints?.length ? v.samplePoints : [[v.lng, v.lat]],
          tags: v.tags || [],
        }
        const result = await saveVenue(final, exists ? 'update' : 'add')
        if (result.action === 'updated') updated++
        else added++
      } catch {
        failed++
      }
    }
    setSavingAll(false)
    setSavedMsg(`Added ${added}, updated ${updated}${failed ? `, failed ${failed}` : ''}.`)
    setDrafts([])
    setInput('')
  }

  const ready = drafts.filter((d) => d.status === 'ready').length
  const errored = drafts.filter((d) => d.status === 'error').length

  return (
    <div>
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <label className="block text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider mb-2">
          Google Maps URLs (one per line)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          placeholder={'https://maps.app.goo.gl/abc\nhttps://maps.app.goo.gl/def\nVenue Name 1\nVenue Name 2'}
          className="form-input font-mono text-[12px]"
        />

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DefaultSelect label="Default patio type" value={defaults.patioType}
            onChange={(v) => setDefaults({ ...defaults, patioType: v as Venue['patioType'] })}
            options={PATIO_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <DefaultSelect label="Default covered" value={String(defaults.covered)}
            onChange={(v) => setDefaults({ ...defaults, covered: v === 'true' ? true : v === 'false' ? false : (v as 'partial' | 'retractable') })}
            options={COVERED_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
          />
          <DefaultSelect label="Default popularity" value={String(defaults.popularity)}
            onChange={(v) => setDefaults({ ...defaults, popularity: Number(v) })}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
          />
          <div>
            <label className="block text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider mb-1">
              Default neighborhood
            </label>
            <input
              list="bulk-neighborhoods"
              value={defaults.neighborhood}
              onChange={(e) => setDefaults({ ...defaults, neighborhood: e.target.value })}
              className="form-input"
            />
            <datalist id="bulk-neighborhoods">
              {neighborhoods.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={lookupAll}
            disabled={!input.trim()}
            className="px-4 py-2 rounded-lg bg-[#0D1B2A] text-white text-[13px] font-semibold disabled:opacity-40"
          >
            Look up all
          </button>
          {ready > 0 && (
            <button
              onClick={saveAll}
              disabled={savingAll}
              className="px-5 py-2 rounded-lg bg-[#FFC72C] text-[#0D1B2A] text-[13px] font-bold disabled:opacity-50"
            >
              {savingAll ? 'Saving…' : `Save all ${ready}`}
            </button>
          )}
        </div>
      </div>

      {savedMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[#2ECC71]/15 text-[#1E7F44] text-[12px] font-semibold">
          ✓ {savedMsg}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="text-[12px] text-[#0D1B2A]/55 font-medium mb-3">
          {ready} ready · {drafts.length - ready - errored} pending · {errored} errored
        </div>
      )}

      <div className="space-y-3">
        {drafts.map((d) => (
          <div key={d.draftKey} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <p className="text-[11px] text-[#0D1B2A]/40 font-mono truncate">{d.url}</p>
                {d.status === 'looking-up' && <p className="text-[12px] text-[#0D1B2A]/55 mt-1">Looking up…</p>}
                {d.status === 'error' && <p className="text-[12px] text-red-600 mt-1 font-medium">{d.error}</p>}
                {d.status === 'ready' && (
                  <p className="text-[14px] font-bold text-[#0D1B2A] mt-1">{d.venue.name}</p>
                )}
              </div>
              <button onClick={() => removeDraft(d.draftKey)} className="text-[12px] text-[#0D1B2A]/40 hover:text-red-600">
                remove
              </button>
            </div>
            {d.status === 'ready' && (
              <VenueForm
                venue={d.venue}
                neighborhoods={neighborhoods}
                onChange={(next) => updateDraft(d.draftKey, { venue: next })}
                hidePolygon
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DefaultSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider mb-1">
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="form-input">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
