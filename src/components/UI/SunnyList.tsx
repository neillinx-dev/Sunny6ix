import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Venue } from '../../types'

interface SunnyListProps {
  venues: Venue[]
}

/**
 * "Sunny Now" list — a side panel (desktop) / bottom sheet (mobile) that
 * ranks patios by current sun + popularity for whatever time the slider is
 * pointing at. Live updates as the slider moves because it reads from
 * sunStatuses (recomputed in MapContainer on currentTime change).
 *
 * Sort: sun bucket first (sunny → partial → shade), popularity desc within.
 * Existing filters (sunnyOnly, rooftopOnly, neighborhood) narrow the list.
 *
 * Tap a row → fly map to venue + open the existing detail card.
 */
export default function SunnyList({ venues }: SunnyListProps) {
  const showSunnyList = useAppStore((s) => s.showSunnyList)
  const toggleShowSunnyList = useAppStore((s) => s.toggleShowSunnyList)
  const sunStatuses = useAppStore((s) => s.sunStatuses)
  const setSelectedVenue = useAppStore((s) => s.setSelectedVenue)
  const filters = useAppStore((s) => s.filters)

  const ranked = useMemo(() => {
    const filtered = venues.filter((v) => {
      if (filters.rooftopOnly && v.patioType !== 'rooftop') return false
      if (filters.neighborhood && v.neighborhood !== filters.neighborhood) return false
      const pct = sunStatuses.get(v.id)?.sunPercentage ?? 0
      if (filters.sunnyOnly && pct < 20) return false
      return true
    })

    // Sun bucket: 0=full, 1=partial, 2=shade. Popularity tier: higher first.
    return filtered
      .map((v) => {
        const pct = sunStatuses.get(v.id)?.sunPercentage ?? 0
        const bucket = pct >= 60 ? 0 : pct >= 20 ? 1 : 2
        const pop = v.popularity ?? 2
        return { v, pct, bucket, pop }
      })
      .sort((a, b) => {
        if (a.bucket !== b.bucket) return a.bucket - b.bucket
        if (a.pop !== b.pop) return b.pop - a.pop
        return a.v.name.localeCompare(b.v.name)
      })
  }, [venues, sunStatuses, filters])

  if (!showSunnyList) return null

  const totalSunny = ranked.filter((r) => r.bucket === 0).length

  return (
    <>
      {/* Mobile dim backdrop (taps to close). Desktop has no backdrop —
          the panel docks to the right and the map stays interactive. */}
      <div
        onClick={toggleShowSunnyList}
        className="fixed inset-0 bg-[#0D1B2A]/30 z-30 sm:hidden"
        aria-hidden="true"
      />

      <aside
        className={[
          // Mobile: bottom sheet, ~70vh, drag-handle on top
          'fixed left-0 right-0 bottom-0 z-40 max-h-[70vh] rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(13,27,42,0.18)]',
          // Desktop: anchored side panel, full-height minus header
          'sm:left-auto sm:right-5 sm:top-[84px] sm:bottom-[160px] sm:max-h-none sm:w-[340px] sm:rounded-2xl sm:shadow-xl sm:bg-white/97 sm:backdrop-blur-xl',
          'flex flex-col slide-up-enter overflow-hidden',
        ].join(' ')}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#0D1B2A]/15" />
        </div>

        <header className="flex items-center justify-between px-5 py-3 border-b border-[#0D1B2A]/8">
          <div>
            <h2 className="font-extrabold text-[#0D1B2A] text-[17px] leading-tight tracking-tight">
              Sunny Now
            </h2>
            <p className="text-[11px] text-[#0D1B2A]/55 font-medium mt-0.5">
              {totalSunny} {totalSunny === 1 ? 'patio' : 'patios'} in full sun · {ranked.length} total
            </p>
          </div>
          <button
            onClick={toggleShowSunnyList}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0D1B2A]/5 hover:bg-[#0D1B2A]/12 text-[#0D1B2A]/60 hover:text-[#0D1B2A] transition-all"
            aria-label="Close list"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <ul className="overflow-y-auto flex-1 overscroll-contain">
          {ranked.length === 0 && (
            <li className="px-5 py-8 text-[13px] text-[#0D1B2A]/55 text-center font-medium">
              No patios match your filters.
            </li>
          )}
          {ranked.map(({ v, pct, bucket, pop }) => (
            <li key={v.id}>
              <button
                onClick={() => setSelectedVenue(v.id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#FFC72C]/8 transition-colors text-left border-b border-[#0D1B2A]/5"
              >
                {/* Sun pct badge */}
                <div className="shrink-0 flex flex-col items-center">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-[12px] tabular-nums ${
                      bucket === 0
                        ? 'bg-[#FFC72C]/25 text-[#8F6A00]'
                        : bucket === 1
                        ? 'bg-[#FFC72C]/12 text-[#B38500]'
                        : 'bg-[#0D1B2A]/8 text-[#0D1B2A]/60'
                    }`}
                  >
                    {pct}%
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#0D1B2A] text-[14px] leading-tight truncate">
                      {v.name}
                    </span>
                    <PopularityDots tier={pop} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-[#0D1B2A]/50 font-medium truncate">
                      {v.neighborhood}
                    </span>
                    <span className="text-[10px] text-[#0D1B2A]/30">·</span>
                    <span className="text-[11px] text-[#0D1B2A]/50 font-medium capitalize">
                      {v.patioType}
                    </span>
                    {v.covered === true && (
                      <>
                        <span className="text-[10px] text-[#0D1B2A]/30">·</span>
                        <span className="text-[11px] text-[#0D1B2A]/50 font-medium">covered</span>
                      </>
                    )}
                  </div>
                </div>

                <svg className="shrink-0 w-4 h-4 text-[#0D1B2A]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  )
}

function PopularityDots({ tier }: { tier: number }) {
  // Show only 4-5 tier with a small accent dot. Avoids visual noise on common spots.
  if (tier < 4) return null
  return (
    <span
      className={`shrink-0 w-1.5 h-1.5 rounded-full ${tier >= 5 ? 'bg-[#FFC72C]' : 'bg-[#FFD65A]'}`}
      title={tier >= 5 ? 'Iconic' : 'Very popular'}
    />
  )
}
