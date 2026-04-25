/**
 * Admin tool — local-dev-only entry point.
 *
 * Three modes:
 *  1. Single add — paste one Google Maps URL → auto-fill from Places →
 *     fill patio fields + draw polygon → save to venues.json
 *  2. Bulk add — paste many URLs → batch lookup → set defaults → save all
 *  3. Polygon-only — list existing venues without polygons → draw + save
 *
 * Save = direct write to src/data/venues.json via /__api/save dev endpoint.
 * You then `git commit && git push` when you're happy.
 */
import { useMemo, useState } from 'react'
import venuesData from '../../data/venues.json'
import type { Venue } from '../../types'
import SingleAdd from './SingleAdd'
import BulkAdd from './BulkAdd'
import PolygonOnly from './PolygonOnly'
import { existingNeighborhoods } from './utils'

type Mode = 'single' | 'bulk' | 'polygon'

export default function AdminPage() {
  const [mode, setMode] = useState<Mode>('single')
  // Local working copy of venues — written back on save. Initial value comes
  // from the JSON imported at build time. Save-then-reload is the cheapest
  // way to refresh, so we don't bother with hot reloading the JSON.
  const venues = useMemo(() => venuesData as Venue[], [])
  const neighborhoods = useMemo(() => existingNeighborhoods(venues), [venues])

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#0D1B2A] p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight leading-none">
              Sunny<span className="text-[#FFC72C]">6ix</span> admin
            </h1>
            <p className="text-[13px] text-[#0D1B2A]/55 mt-1.5 font-medium">
              Local-only tool · {venues.length} venues currently in db ·
              <span className="text-[#0D1B2A]/40 ml-1">writes directly to <code>venues.json</code></span>
            </p>
          </div>
          <a
            href="/app"
            className="text-[12px] text-[#0D1B2A]/60 hover:text-[#0D1B2A] font-medium"
          >
            ← back to map
          </a>
        </header>

        <nav className="flex gap-2 mb-6 border-b border-[#0D1B2A]/10 pb-3">
          <ModeTab active={mode === 'single'} onClick={() => setMode('single')}>
            Single add
          </ModeTab>
          <ModeTab active={mode === 'bulk'} onClick={() => setMode('bulk')}>
            Bulk add
          </ModeTab>
          <ModeTab active={mode === 'polygon'} onClick={() => setMode('polygon')}>
            Polygons
          </ModeTab>
        </nav>

        {mode === 'single' && <SingleAdd existingVenues={venues} neighborhoods={neighborhoods} />}
        {mode === 'bulk' && <BulkAdd existingVenues={venues} neighborhoods={neighborhoods} />}
        {mode === 'polygon' && <PolygonOnly existingVenues={venues} />}
      </div>
    </div>
  )
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
        active
          ? 'bg-[#0D1B2A] text-white'
          : 'bg-white text-[#0D1B2A]/65 hover:text-[#0D1B2A]'
      }`}
    >
      {children}
    </button>
  )
}
