import { useAppStore } from '../../store/useAppStore'
import type { WeatherData } from '../../store/useAppStore'

export default function Header() {
  const weather = useAppStore((s) => s.weather)

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex items-start justify-between px-5 py-4 gap-3">
        {/* Brand */}
        <div className="pointer-events-auto glass-card rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <Sunny6ixMark className="w-9 h-9" />
          <div className="flex flex-col">
            <span className="font-extrabold text-[#0D1B2A] text-[17px] leading-none tracking-tight">
              Sunny<span className="text-[#FFC72C]">6ix</span>
            </span>
            <span className="text-[10px] text-[#0D1B2A]/55 font-medium tracking-[0.14em] uppercase mt-1">
              Chase the sun
            </span>
          </div>
        </div>

        {weather && <WeatherBadge weather={weather} />}
      </div>
    </header>
  )
}

/**
 * Sunny6ix icon mark: yellow sun rising behind a navy CN-Tower silhouette.
 * Matches the brand guideline logo.
 */
function Sunny6ixMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* Sun */}
      <circle cx="24" cy="22" r="11" fill="#FFC72C" />
      {/* Sun rays */}
      <g stroke="#FFC72C" strokeWidth="2.5" strokeLinecap="round">
        <line x1="24" y1="3" x2="24" y2="7" />
        <line x1="5" y1="22" x2="9" y2="22" />
        <line x1="39" y1="22" x2="43" y2="22" />
        <line x1="10.5" y1="8.5" x2="13.2" y2="11.2" />
        <line x1="34.8" y1="11.2" x2="37.5" y2="8.5" />
      </g>
      {/* CN Tower silhouette */}
      <g fill="#0D1B2A">
        <rect x="22.5" y="14" width="3" height="24" rx="0.5" />
        <path d="M21 22 Q24 19 27 22 L26 26 Q24 28 22 26 Z" />
        <rect x="21" y="12" width="6" height="2" rx="0.5" />
        <rect x="23.3" y="6" width="1.4" height="6" />
        {/* Skyline buildings */}
        <rect x="8" y="28" width="6" height="12" />
        <rect x="14.5" y="24" width="4.5" height="16" />
        <rect x="28.5" y="26" width="5.5" height="14" />
        <rect x="34.5" y="30" width="5.5" height="10" />
      </g>
      {/* Ground line */}
      <rect x="4" y="39" width="40" height="2" fill="#0D1B2A" />
    </svg>
  )
}

function WeatherBadge({ weather }: { weather: WeatherData }) {
  const isCloudy = weather.cloudCover >= 70
  const isOvercast = weather.cloudCover >= 90

  return (
    <div className="pointer-events-auto glass-card rounded-2xl px-4 py-2.5">
      <div className="flex items-center gap-3.5">
        <div className="text-[22px] leading-none">
          {weather.isRaining ? '🌧' : isOvercast ? '☁' : isCloudy ? '⛅' : weather.cloudCover >= 30 ? '🌤' : '☀'}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xl font-bold text-[#0D1B2A] leading-none tabular-nums">
            {weather.temp}°
          </span>
          <span className="text-[10px] text-[#0D1B2A]/50 capitalize mt-1 font-medium">
            {weather.description}
          </span>
        </div>
        <div className="w-px h-9 bg-[#0D1B2A]/10 mx-1" />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-[#0D1B2A]/55 font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
            </svg>
            {weather.windSpeed} km/h
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#0D1B2A]/55 font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
            {weather.cloudCover}%
          </div>
        </div>
      </div>
    </div>
  )
}
