/**
 * Polygon-only mode: walk through existing venues that don't have a custom
 * patioPolygon yet, draw one on satellite view, save back. Lets you knock
 * out the OSM coverage gap one venue at a time.
 *
 * Two views:
 *  - "Needs polygon" (default) — only venues without one. Sort tier-5 first.
 *  - "All venues" — everything, with a ✓ marker on already-drawn ones, for
 *    when you want to redo a polygon. Search box filters by name.
 */
import { useMemo, useState } from 'react'
import type { Venue } from '../../types'
import { saveVenue } from './api'
import PolygonEditor from './PolygonEditor'

interface Props {
  existingVenues: Venue[]
}

type ViewMode = 'needs' | 'all'

export default function PolygonOnly({ existingVenues }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [poly, setPoly] = useState<[number, number][] | null>(null)
  const [savingMsg, setSavingMsg] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('needs')
  const [search, setSearch] = useState('')

  const queue = useMemo(() => {
    const q = search.trim().toLowerCase()
    return existingVenues
      .filter((v) => {
        if (view === 'needs' && (v.patioPolygon && v.patioPolygon.length >= 3)) return false
        if (q && !v.name.toLowerCase().includes(q) && !v.neighborhood.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => (b.popularity ?? 2) - (a.popularity ?? 2) || a.name.localeCompare(b.name))
  }, [existingVenues, view, search])

  // Active venue lookup also reflects in-session edits (savedIds invalidates
  // the patioPolygon flag for the queue, but for the editor we want the
  // freshest version from props).
  const active = activeId ? existingVenues.find((v) => v.id === activeId) : null

  async function save() {
    if (!active || !poly || poly.length < 3) return
    try {
      const updated = {
        ...active,
        patioPolygon: poly,
        patioSource: 'manual',
      } as Venue & { patioSource: string }
      await saveVenue(updated, 'update')
      setSavingMsg(`✓ saved polygon for "${active.name}" — reload page to see updated state`)
      setActiveId(null)
      setPoly(null)
    } catch (e) {
      setSavingMsg(`error: ${(e as Error).message}`)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      {/* Queue list */}
      <aside className="bg-white rounded-2xl p-3 shadow-sm max-h-[80vh] overflow-y-auto">
        <div className="flex gap-1 p-1 mb-2 bg-[#0D1B2A]/5 rounded-lg">
          <button
            onClick={() => setView('needs')}
            className={`flex-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              view === 'needs' ? 'bg-white text-[#0D1B2A] shadow-sm' : 'text-[#0D1B2A]/55 hover:text-[#0D1B2A]'
            }`}
          >
            Needs polygon
          </button>
          <button
            onClick={() => setView('all')}
            className={`flex-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              view === 'all' ? 'bg-white text-[#0D1B2A] shadow-sm' : 'text-[#0D1B2A]/55 hover:text-[#0D1B2A]'
            }`}
          >
            All venues
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or neighborhood…"
          className="form-input mb-2"
        />

        <h2 className="px-2 py-1 text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider">
          {view === 'needs' ? 'Needs polygon' : 'All'} ({queue.length})
        </h2>
        <ul>
          {queue.map((v) => {
            const hasPoly = v.patioPolygon && v.patioPolygon.length >= 3
            return (
              <li key={v.id}>
                <button
                  onClick={() => { setActiveId(v.id); setPoly(null); setSavingMsg(null) }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start gap-2 ${
                    activeId === v.id ? 'bg-[#FFC72C]/25' : 'hover:bg-[#0D1B2A]/4'
                  }`}
                >
                  <span
                    className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                      hasPoly ? 'bg-[#2ECC71]' : 'bg-[#0D1B2A]/15'
                    }`}
                    title={hasPoly ? 'Has polygon' : 'No polygon yet'}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#0D1B2A] truncate">{v.name}</span>
                    <span className="block text-[11px] text-[#0D1B2A]/50 truncate">
                      {v.neighborhood || 'no neighborhood'} · tier {v.popularity ?? 2}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
          {queue.length === 0 && (
            <li className="px-3 py-3 text-[12px] text-[#0D1B2A]/50">
              {view === 'needs' ? 'All caught up 🎉' : 'No matches.'}
            </li>
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
                <div className="flex items-center gap-2">
                  <h3 className="text-[18px] font-extrabold text-[#0D1B2A] tracking-tight">{active.name}</h3>
                  {active.patioPolygon && active.patioPolygon.length >= 3 && (
                    <span className="text-[10px] font-bold text-[#1E7F44] bg-[#2ECC71]/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      Has polygon — redrawing will replace
                    </span>
                  )}
                </div>
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
