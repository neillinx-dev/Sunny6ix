import { useAppStore } from '../../store/useAppStore'
import { getSunStatusColor, getSunStatusLabel, getGeometricExposure } from '../../lib/sunExposure'
import { supabase } from '../../lib/supabase'
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
  const user = useAppStore((s) => s.user)
  const favorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen)

  if (!selectedVenueId) return null

  const venue = venues.find((v) => v.id === selectedVenueId)
  if (!venue) return null

  const status = sunStatuses.get(venue.id)
  const sunPct = status?.sunPercentage ?? 0
  const colorClass = getSunStatusColor(sunPct)
  const label = getSunStatusLabel(sunPct)

  const patioLabel = venue.patioType.charAt(0).toUpperCase() + venue.patioType.slice(1)
  const isFavorited = favorites.has(venue.id)

  const toggleFavorite = async () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    if (isFavorited) {
      removeFavorite(venue.id)
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ user_id: user.id, venue_id: venue.id })
      if (error) addFavorite(venue.id) // revert on failure
    } else {
      addFavorite(venue.id)
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, venue_id: venue.id })
      if (error) removeFavorite(venue.id)
    }
  }

  return (
    <div className="absolute bottom-20 left-3 right-3 z-20 flex justify-center pointer-events-none">
      <div className="glass-card rounded-[20px] max-w-md w-full pointer-events-auto overflow-hidden slide-up-enter relative">
        <button
          onClick={() => setSelectedVenue(null)}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-[#0D1B2A]/5 hover:bg-[#0D1B2A]/12 text-[#0D1B2A]/50 hover:text-[#0D1B2A] transition-all z-10"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={toggleFavorite}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorited}
          className="absolute top-3 right-12 w-7 h-7 flex items-center justify-center rounded-full bg-[#0D1B2A]/5 hover:bg-[#FFC72C]/25 transition-all z-10"
        >
          {isFavorited ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FFC72C" stroke="#FFC72C" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#0D1B2A" strokeOpacity="0.4" strokeWidth="2" strokeLinejoin="round">
              <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
            </svg>
          )}
        </button>

        {/* Sun status accent bar — Sunny6ix palette */}
        <div className={`h-1 w-full ${
          colorClass === 'sun-full'
            ? 'bg-gradient-to-r from-[#FFC72C] via-[#FFD65A] to-[#FFC72C]'
            : colorClass === 'sun-partial'
            ? 'bg-gradient-to-r from-[#FFC72C]/60 via-[#FFD65A]/80 to-[#FFC72C]/60'
            : 'bg-gradient-to-r from-[#0D1B2A]/15 via-[#0D1B2A]/25 to-[#0D1B2A]/15'
        }`} />

        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center ${
              colorClass === 'sun-full'
                ? 'bg-[#FFC72C]/15'
                : colorClass === 'sun-partial'
                ? 'bg-[#FFC72C]/8'
                : 'bg-[#0D1B2A]/5'
            }`}>
              {colorClass === 'sun-full' ? (
                <svg className="w-6 h-6 text-[#FFC72C]" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="4" />
                  <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
                    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                  </g>
                </svg>
              ) : colorClass === 'sun-partial' ? (
                <svg className="w-6 h-6 text-[#E6A800]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3v2M5.64 5.64l1.41 1.41M3 12h2M5.64 18.36l1.41-1.41M12 19v2" strokeLinecap="round" />
                  <path d="M12 7a5 5 0 0 1 0 10" fill="currentColor" />
                  <path d="M12 7a5 5 0 0 0 0 10" fill="currentColor" opacity="0.3" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-[#0D1B2A]/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M3 3l18 18" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-[#0D1B2A] text-[17px] leading-tight tracking-tight">{venue.name}</h3>
              <p className="text-[13px] text-[#0D1B2A]/50 mt-0.5 font-medium">{venue.address}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-bold ${
              colorClass === 'sun-full'
                ? 'bg-[#FFC72C]/25 text-[#8F6A00]'
                : colorClass === 'sun-partial'
                ? 'bg-[#FFC72C]/15 text-[#B38500]'
                : 'bg-[#0D1B2A]/8 text-[#0D1B2A]/60'
            }`}>
              {label}
            </span>
            <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-[#7EC8E3]/20 text-[#2B7A99]">
              {patioLabel}
            </span>
            {venue.covered && (
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-[#0D1B2A]/8 text-[#0D1B2A]/70">
                Covered
              </span>
            )}
            {venue.patioFloor > 0 && (
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-[#2ECC71]/15 text-[#1E7F44]">
                Floor {venue.patioFloor}
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-medium bg-[#F2F4F7] text-[#0D1B2A]/60">
              {venue.neighborhood}
            </span>
          </div>

          {weather && weather.cloudCover >= 70 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F2F4F7] mb-3 text-[12px] text-[#0D1B2A]/60 font-medium">
              <span>{weather.isRaining ? '🌧' : '☁'}</span>
              <span>
                {weather.isRaining
                  ? 'Currently raining — no direct sun anywhere'
                  : `${weather.cloudCover}% cloud cover — limited direct sun`}
              </span>
            </div>
          )}

          {weather && weather.cloudCover >= 70 && (() => {
            const geo = getGeometricExposure(venue, currentTime)
            if (geo > 0) {
              return (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFC72C]/12 mb-3 text-[12px] text-[#8F6A00] font-medium">
                  <span>☀</span>
                  <span>On a clear day, this patio would have direct sun right now</span>
                </div>
              )
            }
            return null
          })()}

          {status && status.hourlyForecast.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-[#0D1B2A]/45 uppercase tracking-wider">
                  Clear-sky sun exposure
                </p>
                {venue.covered && (
                  <p className="text-[10px] text-[#0D1B2A]/50 font-semibold">
                    Covered patio — no direct sun
                  </p>
                )}
              </div>
              <HourlySunChart forecast={status.hourlyForecast} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {venue.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-[10px] text-[#0D1B2A]/50 bg-[#F2F4F7] px-2 py-0.5 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[12px] text-[#0D1B2A] hover:text-[#E6A800] font-bold transition-colors shrink-0"
              >
                Visit
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
