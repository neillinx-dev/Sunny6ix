import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Venue } from '../../types'

interface FilterBarProps {
  venues: Venue[]
}

/**
 * Collapsible filter menu. A single pill-button shows the active-filter
 * count; clicking it expands a panel containing all filter controls plus the
 * shadow-display toggle. Designed mobile-first — the trigger is small enough
 * to live next to the brand mark, and the panel anchors below.
 */
export default function FilterBar({ venues }: FilterBarProps) {
  const filters = useAppStore((s) => s.filters)
  const toggleSunnyOnly = useAppStore((s) => s.toggleSunnyOnly)
  const setNeighborhood = useAppStore((s) => s.setNeighborhood)
  const toggleRooftopOnly = useAppStore((s) => s.toggleRooftopOnly)
  const toggleFavoritesOnly = useAppStore((s) => s.toggleFavoritesOnly)
  const sunStatuses = useAppStore((s) => s.sunStatuses)
  const showShadows = useAppStore((s) => s.showShadows)
  const toggleShowShadows = useAppStore((s) => s.toggleShowShadows)
  const showSunnyList = useAppStore((s) => s.showSunnyList)
  const toggleShowSunnyList = useAppStore((s) => s.toggleShowSunnyList)
  const user = useAppStore((s) => s.user)
  const favorites = useAppStore((s) => s.favorites)

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const neighborhoods = [...new Set(venues.map((v) => v.neighborhood))].sort()

  const sunnyCount = venues.filter((v) => {
    const s = sunStatuses.get(v.id)
    return s && s.sunPercentage >= 20
  }).length
  const rooftopCount = venues.filter((v) => v.patioType === 'rooftop').length

  // Active filter count drives the badge on the trigger pill.
  const activeCount =
    (filters.sunnyOnly ? 1 : 0) +
    (filters.rooftopOnly ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0) +
    (filters.neighborhood ? 1 : 0) +
    (showShadows ? 0 : 1) + // shadows-hidden counts as a setting flipped from default
    (showSunnyList ? 1 : 0)

  return (
    <div ref={rootRef} className="absolute top-5 left-5 sm:top-[84px] z-20">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all ${
          open
            ? 'bg-[#0D1B2A] text-white shadow-md shadow-[#0D1B2A]/30'
            : 'glass-card text-[#0D1B2A]/80 hover:text-[#0D1B2A]'
        }`}
        aria-expanded={open}
        aria-label="Filters"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h18M6 12h12M10 19h4" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span
            className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
              open ? 'bg-[#FFC72C] text-[#0D1B2A]' : 'bg-[#FFC72C] text-[#0D1B2A]'
            }`}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="pointer-events-auto mt-2 glass-card rounded-2xl p-3 w-[260px] slide-up-enter shadow-lg">
          {/* Sunny */}
          <FilterRow
            label="Sunny patios only"
            sub={`${sunnyCount} right now`}
            active={filters.sunnyOnly}
            onToggle={toggleSunnyOnly}
            accent="yellow"
          />
          {/* Rooftop */}
          <FilterRow
            label="Rooftop only"
            sub={`${rooftopCount} venues`}
            active={filters.rooftopOnly}
            onToggle={toggleRooftopOnly}
            accent="sky"
          />
          {/* Favorites */}
          <FilterRow
            label="My Favorites only"
            sub={user ? `${favorites.size} saved` : 'Sign in to use favorites'}
            active={filters.favoritesOnly}
            onToggle={toggleFavoritesOnly}
            accent="yellow"
            disabled={!user}
          />

          {/* Neighborhood */}
          <div className="px-1 py-2.5 border-t border-[#0D1B2A]/8 mt-1">
            <label className="block text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider mb-1.5">
              Neighborhood
            </label>
            <div className="relative">
              <select
                value={filters.neighborhood || ''}
                onChange={(e) => setNeighborhood(e.target.value || null)}
                className={`w-full px-3 py-2 rounded-lg text-[13px] font-semibold border-none outline-none cursor-pointer appearance-none pr-8 transition-all ${
                  filters.neighborhood
                    ? 'bg-[#0D1B2A] text-white'
                    : 'bg-[#F2F4F7] text-[#0D1B2A]/80'
                }`}
              >
                <option value="">All Areas</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <svg
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${
                  filters.neighborhood ? 'text-white/70' : 'text-[#0D1B2A]/40'
                }`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Display options */}
          <div className="px-1 pt-2.5 border-t border-[#0D1B2A]/8 mt-1">
            <label className="block text-[10px] font-bold text-[#0D1B2A]/50 uppercase tracking-wider mb-1.5">
              Display
            </label>
            <FilterRow
              label="Show building shadows"
              sub="Visible at zoom 15+"
              active={showShadows}
              onToggle={toggleShowShadows}
              accent="navy"
              compact
            />
            <FilterRow
              label="Show sunny list"
              sub="Ranks patios by sun + popularity"
              active={showSunnyList}
              onToggle={toggleShowSunnyList}
              accent="yellow"
              compact
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface FilterRowProps {
  label: string
  sub?: string
  active: boolean
  onToggle: () => void
  accent: 'yellow' | 'sky' | 'navy'
  compact?: boolean
  disabled?: boolean
}

function FilterRow({ label, sub, active, onToggle, accent, compact, disabled }: FilterRowProps) {
  const trackOn =
    accent === 'yellow' ? 'bg-[#FFC72C]'
    : accent === 'sky' ? 'bg-[#7EC8E3]'
    : 'bg-[#0D1B2A]'

  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      title={disabled ? 'Sign in to use favorites' : undefined}
      className={`w-full flex items-center justify-between gap-3 px-2 ${compact ? 'py-1.5' : 'py-2'} rounded-lg transition-colors text-left ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#0D1B2A]/4'
      }`}
      role="switch"
      aria-checked={active}
    >
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-[#0D1B2A]">{label}</span>
        {sub && <span className="text-[11px] text-[#0D1B2A]/50 font-medium">{sub}</span>}
      </div>
      <span
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${
          active ? trackOn : 'bg-[#0D1B2A]/15'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            active ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
