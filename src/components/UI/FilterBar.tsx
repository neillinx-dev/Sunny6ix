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
    <div className="absolute top-[84px] left-5 z-10">
      <div className="flex flex-wrap gap-2 max-w-[calc(100vw-60px)]">
        {/* Sunny filter — brand yellow */}
        <button
          onClick={toggleSunnyOnly}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all ${
            filters.sunnyOnly
              ? 'bg-[#FFC72C] text-[#0D1B2A] shadow-md shadow-[#FFC72C]/40'
              : 'glass-card text-[#0D1B2A]/70 hover:text-[#0D1B2A]'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4" />
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </g>
          </svg>
          Sunny
          <span
            className={`text-[11px] px-1.5 py-px rounded-full font-bold ${
              filters.sunnyOnly ? 'bg-[#0D1B2A]/10 text-[#0D1B2A]' : 'bg-[#FFC72C]/25 text-[#B38500]'
            }`}
          >
            {sunnyCount}
          </span>
        </button>

        {/* Rooftop filter — sky blue */}
        <button
          onClick={toggleRooftopOnly}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all ${
            filters.rooftopOnly
              ? 'bg-[#7EC8E3] text-[#0D1B2A] shadow-md shadow-[#7EC8E3]/40'
              : 'glass-card text-[#0D1B2A]/70 hover:text-[#0D1B2A]'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M5 21V7l7-4 7 4v14" />
          </svg>
          Rooftop
          <span
            className={`text-[11px] px-1.5 py-px rounded-full font-bold ${
              filters.rooftopOnly ? 'bg-[#0D1B2A]/10 text-[#0D1B2A]' : 'bg-[#7EC8E3]/30 text-[#2B7A99]'
            }`}
          >
            {rooftopCount}
          </span>
        </button>

        {/* Neighborhood — navy */}
        <div className="relative">
          <select
            value={filters.neighborhood || ''}
            onChange={(e) => setNeighborhood(e.target.value || null)}
            className={`px-3.5 py-2 rounded-full text-[13px] font-semibold border-none outline-none cursor-pointer appearance-none pr-7 transition-all ${
              filters.neighborhood
                ? 'bg-[#0D1B2A] text-white shadow-md shadow-[#0D1B2A]/30'
                : 'glass-card text-[#0D1B2A]/70'
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
    </div>
  )
}
