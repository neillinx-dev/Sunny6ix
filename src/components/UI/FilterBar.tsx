import { useAppStore } from '../../store/useAppStore'
import type { Venue } from '../../types'

interface FilterBarProps {
  venues: Venue[]
}

export default function FilterBar({ venues }: FilterBarProps) {
  const filters = useAppStore((s) => s.filters)
  const toggleSunnyOnly = useAppStore((s) => s.toggleSunnyOnly)
  const setNeighborhood = useAppStore((s) => s.setNeighborhood)
  const toggleRooftopOnly = useAppStore((s) => s.toggleRooftopOnly)
  const sunStatuses = useAppStore((s) => s.sunStatuses)

  const neighborhoods = [...new Set(venues.map((v) => v.neighborhood))].sort()

  const sunnyCount = venues.filter((v) => {
    const s = sunStatuses.get(v.id)
    return s && s.sunPercentage >= 20
  }).length

  const rooftopCount = venues.filter((v) => v.patioType === 'rooftop').length

  return (
    <div className="absolute top-[76px] left-5 z-10">
      <div className="flex flex-wrap gap-2 max-w-[calc(100vw-60px)]">
        {/* Sun filter */}
        <button
          onClick={toggleSunnyOnly}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ${
            filters.sunnyOnly
              ? 'bg-amber-400 text-white shadow-md shadow-amber-200/50'
              : 'glass-card text-gray-600 hover:text-amber-600'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4"/>
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
            </g>
          </svg>
          Sunny
          <span className={`text-[11px] px-1.5 py-px rounded-full font-semibold ${
            filters.sunnyOnly ? 'bg-white/25' : 'bg-amber-100 text-amber-600'
          }`}>
            {sunnyCount}
          </span>
        </button>

        {/* Rooftop filter */}
        <button
          onClick={toggleRooftopOnly}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ${
            filters.rooftopOnly
              ? 'bg-sky-500 text-white shadow-md shadow-sky-200/50'
              : 'glass-card text-gray-600 hover:text-sky-600'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M5 21V7l7-4 7 4v14"/>
          </svg>
          Rooftop
          <span className={`text-[11px] px-1.5 py-px rounded-full font-semibold ${
            filters.rooftopOnly ? 'bg-white/25' : 'bg-sky-100 text-sky-600'
          }`}>
            {rooftopCount}
          </span>
        </button>

        {/* Neighborhood */}
        <div className="relative">
          <select
            value={filters.neighborhood || ''}
            onChange={(e) => setNeighborhood(e.target.value || null)}
            className={`px-3.5 py-2 rounded-full text-[13px] font-medium border-none outline-none cursor-pointer appearance-none pr-7 transition-all ${
              filters.neighborhood
                ? 'bg-purple-500 text-white shadow-md shadow-purple-200/50'
                : 'glass-card text-gray-600'
            }`}
          >
            <option value="">All Areas</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <svg
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${
              filters.neighborhood ? 'text-white/70' : 'text-gray-400'
            }`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
