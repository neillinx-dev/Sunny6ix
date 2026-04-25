/**
 * Single-add mode: paste one Google Maps URL → auto-fill from Places API
 * → user fills patio fields + draws polygon → save.
 */
import { useState } from 'react'
import type { Venue } from '../../types'
import { placesLookup, saveVenue } from './api'
import { venueFromLookup } from './utils'
import VenueForm from './VenueForm'

interface Props {
  existingVenues: Venue[]
  neighborhoods: string[]
}

export default function SingleAdd({ existingVenues, neighborhoods }: Props) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'looking-up' | 'ready' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [venue, setVenue] = useState<Partial<Venue>>({})
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  async function lookup() {
    setStatus('looking-up')
    setError(null)
    setSavedMsg(null)
    try {
      const result = await placesLookup({ url })
      if (!result.found) {
        setStatus('error')
        setError(result.error || 'No place found for that URL. Try pasting the long-form Google Maps URL or just a place name.')
        return
      }
      setVenue(venueFromLookup(result))
      setStatus('ready')
    } catch (e) {
      setStatus('error')
      setError((e as Error).message)
    }
  }

  async function save() {
    if (!venue.id || !venue.name || !venue.lat || !venue.lng) {
      setError('Need at least name, id, lat, lng')
      return
    }
    setStatus('saving')
    setError(null)
    try {
      const exists = existingVenues.some((v) => v.id === venue.id)
      const final: Venue = {
        ...(venue as Venue),
        samplePoints: venue.samplePoints?.length ? venue.samplePoints : [[venue.lng!, venue.lat!]],
        tags: venue.tags || [],
      }
      const result = await saveVenue(final, exists ? 'update' : 'add')
      setStatus('saved')
      setSavedMsg(`${result.action} "${final.name}" — ${result.total} venues now in db`)
      setUrl('')
      setVenue({})
    } catch (e) {
      setStatus('error')
      setError((e as Error).message)
    }
  }

  const isDuplicate = venue.id && existingVenues.some((v) => v.id === venue.id)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="mb-5">
        <label className="block text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider mb-2">
          Google Maps URL
        </label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && url) lookup() }}
            placeholder="https://maps.app.goo.gl/… or full /place/ URL or just a venue name"
            className="form-input flex-1"
          />
          <button
            onClick={lookup}
            disabled={!url || status === 'looking-up'}
            className="px-4 py-2 rounded-lg bg-[#0D1B2A] text-white text-[13px] font-semibold disabled:opacity-40"
          >
            {status === 'looking-up' ? 'Looking up…' : 'Look up'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-[12px] font-medium">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[#2ECC71]/15 text-[#1E7F44] text-[12px] font-semibold">
          ✓ {savedMsg} — reload <code className="bg-white/50 px-1 rounded">/app</code> to see it on the map.
        </div>
      )}

      {(status === 'ready' || status === 'saving' || (status === 'saved' && Object.keys(venue).length > 0)) && (
        <>
          {isDuplicate && (
            <div className="mb-4 p-3 rounded-lg bg-[#FFC72C]/20 text-[#8F6A00] text-[12px] font-semibold">
              Heads up: a venue with id <code>{venue.id}</code> already exists. Saving will <strong>update</strong> it.
            </div>
          )}
          <VenueForm venue={venue} neighborhoods={neighborhoods} onChange={setVenue} />

          <div className="mt-6 flex gap-2">
            <button
              onClick={save}
              disabled={status === 'saving'}
              className="px-5 py-2.5 rounded-full bg-[#FFC72C] text-[#0D1B2A] text-[13px] font-bold disabled:opacity-50"
            >
              {status === 'saving' ? 'Saving…' : isDuplicate ? 'Update venue' : 'Save venue'}
            </button>
            <button
              onClick={() => { setVenue({}); setStatus('idle'); setError(null) }}
              className="px-5 py-2.5 rounded-full bg-[#0D1B2A]/8 text-[#0D1B2A]/65 text-[13px] font-medium"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
