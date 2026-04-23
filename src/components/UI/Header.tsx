import { useAppStore } from '../../store/useAppStore'
import type { WeatherData } from '../../store/useAppStore'

export default function Header() {
  const weather = useAppStore((s) => s.weather)

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex items-start justify-between px-5 py-4 gap-3">
        {/* Logo */}
        <div className="pointer-events-auto glass-card rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="4.5"/>
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
                <line x1="12" y1="2" x2="12" y2="5"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="5" y2="12"/>
                <line x1="19" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/>
                <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/>
                <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/>
                <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/>
              </g>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 text-[15px] leading-tight tracking-tight">PatioSun</span>
            <span className="text-[10px] text-amber-600/70 font-medium tracking-[0.15em] uppercase mt-0.5">Toronto</span>
          </div>
        </div>

        {/* Weather */}
        {weather && <WeatherBadge weather={weather} />}
      </div>
    </header>
  )
}

function WeatherBadge({ weather }: { weather: WeatherData }) {
  const isCloudy = weather.cloudCover >= 70
  const isOvercast = weather.cloudCover >= 90

  return (
    <div className="pointer-events-auto glass-card rounded-2xl px-4 py-2.5">
      <div className="flex items-center gap-3.5">
        {/* Weather icon */}
        <div className="text-[22px] leading-none">
          {weather.isRaining ? '🌧' : isOvercast ? '☁' : isCloudy ? '⛅' : weather.cloudCover >= 30 ? '🌤' : '☀'}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xl font-semibold text-gray-900 leading-none tabular-nums">
            {weather.temp}°
          </span>
          <span className="text-[10px] text-gray-400 capitalize mt-1">{weather.description}</span>
        </div>
        <div className="w-px h-9 bg-gray-200/60 mx-1" />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
            </svg>
            {weather.windSpeed} km/h
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
            {weather.cloudCover}%
          </div>
        </div>
      </div>
    </div>
  )
}
