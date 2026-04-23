import { useAppStore } from '../../store/useAppStore'
import { getSunStatusColor, getSunStatusLabel, getGeometricExposure } from '../../lib/sunExposure'
import HourlySunChart from '../Charts/HourlySunChart'
import type { Venue } from '../../types'

interface VenueDetailCardProps {
  venues: Venue[]
}

export default function VenueDetailCard({ venues }: VenueDetailCardProps) {
  const selectedVenueId = useAppStore((s) => s.selectedVenueId)
  const setSelectedVenue = useAppStore((s) => s.setSelectedVenue)
  const sunStatuses = useAppStore((s) => s.sunStatuses)
  const weather = useAppStore((s) => s.weather)
  const currentTime = useAppStore((s) => s.currentTime)

  if (!selectedVenueId) return null

  const venue = venues.find((v) => v.id === selectedVenueId)
  if (!venue) return null

  const status = sunStatuses.get(venue.id)
  const sunPct = status?.sunPercentage ?? 0
  const colorClass = getSunStatusColor(sunPct)
  const label = getSunStatusLabel(sunPct)

  const patioLabel = venue.patioType.charAt(0).toUpperCase() + venue.patioType.slice(1)

  return (
    <div className="absolute bottom-20 left-3 right-3 z-20 flex justify-center pointer-events-none">
      <div className="glass-card rounded-[20px] max-w-md w-full pointer-events-auto overflow-hidden slide-up-enter">
        {/* Close button */}
        <button
          onClick={() => setSelectedVenue(null)}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-gray-400 hover:text-gray-600 transition-all z-10"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Sun status accent bar */}
        <div className={`h-1 w-full ${
          colorClass === 'sun-full'
            ? 'bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300'
            : colorClass === 'sun-partial'
            ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300'
            : 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200'
        }`} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {/* Sun indicator */}
            <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center ${
              colorClass === 'sun-full'
                ? 'bg-emerald-50'
                : colorClass === 'sun-partial'
                ? 'bg-amber-50'
                : 'bg-gray-50'
            }`}>
              {colorClass === 'sun-full' ? (
                <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="4"/>
                  <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
                    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
                  </g>
                </svg>
              ) : colorClass === 'sun-partial' ? (
                <svg className="w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3v2M5.64 5.64l1.41 1.41M3 12h2M5.64 18.36l1.41-1.41M12 19v2" strokeLinecap="round"/>
                  <path d="M12 7a5 5 0 0 1 0 10" fill="currentColor"/>
                  <path d="M12 7a5 5 0 0 0 0 10" fill="currentColor" opacity="0.3"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M3 3l18 18" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-[17px] leading-tight tracking-tight">{venue.name}</h3>
              <p className="text-[13px] text-gray-400 mt-0.5">{venue.address}</p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-semibold ${
              colorClass === 'sun-full'
                ? 'bg-emerald-100 text-emerald-700'
                : colorClass === 'sun-partial'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {label}
            </span>
            <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-medium bg-sky-50 text-sky-600">
              {patioLabel}
            </span>
            {venue.covered && (
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-medium bg-orange-50 text-orange-500">
                Covered
              </span>
            )}
            {venue.patioFloor > 0 && (
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-medium bg-violet-50 text-violet-600">
                Floor {venue.patioFloor}
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-medium bg-gray-50 text-gray-500">
              {venue.neighborhood}
            </span>
          </div>

          {/* Weather context */}
          {weather && weather.cloudCover >= 70 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 mb-3 text-[12px] text-gray-500">
              <span>{weather.isRaining ? '🌧' : '☁'}</span>
              <span>
                {weather.isRaining
                  ? 'Currently raining — no direct sun anywhere'
                  : `${weather.cloudCover}% cloud cover — limited direct sun`
                }
              </span>
            </div>
          )}

          {/* Show if this spot WOULD get sun on a clear day */}
          {weather && weather.cloudCover >= 70 && (() => {
            const geo = getGeometricExposure(venue, currentTime)
            if (geo > 0) {
              return (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 mb-3 text-[12px] text-amber-600">
                  <span>☀</span>
                  <span>On a clear day, this patio would have direct sun right now</span>
                </div>
              )
            }
            return null
          })()}

          {/* Hourly chart */}
          {status && status.hourlyForecast.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Clear-sky sun exposure
                </p>
                {venue.covered && (
                  <p className="text-[10px] text-orange-400 font-medium">
                    Covered patio — no direct sun
                  </p>
                )}
              </div>
              <HourlySunChart forecast={status.hourlyForecast} />
            </div>
          )}

          {/* Tags + link */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {venue.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[12px] text-amber-600 hover:text-amber-700 font-medium transition-colors shrink-0"
              >
                Visit
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
