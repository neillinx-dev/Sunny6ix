/**
 * Polygon-only mode: walk through existing venues that don't have a custom
 * patioPolygon yet, draw one on satellite view, save back. Lets you knock
 * out the OSM coverage gap one venue at a time.
 *
 * Sort: tier-5 venues first (most-visited spots benefit most from precise
 * polygons), then descending popularity. Skips venues with manualSunWindows
 * since those use a hand-curated time-window override anyway.
 */
import { useMemo, useState } from 'react'
import type { Venue } from '../../types'
import { saveVenue } from './api'
import PolygonEditor from './PolygonEditor'

interface Props {
  existingVenues: Venue[]
}

export default function PolygonOnly({ existingVenues }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [poly, setPoly] = useState<[number, number][] | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingMsg, setSavingMsg] = useState<string | null>(null)

  const queue = useMemo(() => {
    return existingVenues
      .filter((v) => !v.patioPolygon || v.patioPolygon.length < 3)
      .filter((v) => !savedIds.has(v.id))
      .sort((a, b) => (b.popularity ?? 2) - (a.popularity ?? 2) || a.name.localeCompare(b.name))
  }, [existingVenues, savedIds])

  const active = activeId ? existingVenues.find((v) => v.id === activeId) : null

  async function save() {
    if (!active || !poly || poly.length < 3) return
    try {
      // Mark provenance so the OSM batch script doesn't overwrite later
      const updated = {
        ...active,
        patioPolygon: poly,
        patioSource: 'manual',
      } as Venue & { patioSource: string }
      await saveVenue(updated, 'update')
      setSavedIds((s) => new Set(s).add(active.id))
      setSavingMsg(`✓ saved polygon for "${active.name}"`)
      setActiveId(null)
      setPoly(null)
    } catch (e) {
      setSavingMsg(`error: ${(e as Error).message}`)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Queue list */}
      <aside className="bg-white rounded-2xl p-3 shadow-sm max-h-[80vh] overflow-y-auto">
        <h2 className="px-2 py-2 text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider">
          Needs polygon ({queue.length})
        </h2>
        <ul>
          {queue.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => { setActiveId(v.id); setPoly(null) }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeId === v.id ? 'bg-[#FFC72C]/25' : 'hover:bg-[#0D1B2A]/4'
                }`}
              >
                <div className="text-[13px] font-semibold text-[#0D1B2A] truncate">{v.name}</div>
                <div className="text-[11px] text-[#0D1B2A]/50 truncate">{v.neighborhood} · tier {v.popularity ?? 2}</div>
              </button>
            </li>
          ))}
          {queue.length === 0 && (
            <li className="px-3 py-3 text-[12px] text-[#0D1B2A]/50">All caught up 🎉</li>
          )}
        </ul>
      </aside>

      {/* Editor */}
      <main className="bg-white rounded-2xl p-5 shadow-sm">
        {!active && (
          <div className="text-center py-16 text-[13px] text-[#0D1B2A]/55 font-medium">
            Pick a venue from the list to start drawing.
          </div>
        )}
        {active && (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[18px] font-extrabold text-[#0D1B2A] tracking-tight">{active.name}</h3>
                <p className="text-[12px] text-[#0D1B2A]/55 mt-1 font-medium">{active.address}</p>
              </div>
              {active.website && (
                <a href={active.website} target="_blank" rel="noreferrer" className="text-[12px] text-[#0D1B2A]/65 hover:text-[#0D1B2A] font-semibold">
                  website ↗
                </a>
              )}
            </div>
            <PolygonEditor
              centerLat={active.lat}
              centerLng={active.lng}
              initialPolygon={active.patioPolygon}
              onChange={setPoly}
            />
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={save}
                disabled={!poly || poly.length < 3}
                className="px-5 py-2.5 rounded-full bg-[#FFC72C] text-[#0D1B2A] text-[13px] font-bold disabled:opacity-40"
              >
                Save polygon
              </button>
              <button
                onClick={() => { setActiveId(null); setPoly(null) }}
                className="px-5 py-2.5 rounded-full bg-[#0D1B2A]/8 text-[#0D1B2A]/65 text-[13px] font-medium"
              >
                Skip
              </button>
              {savingMsg && (
                <span className="text-[12px] font-medium text-[#1E7F44] ml-2">{savingMsg}</span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
