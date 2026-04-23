import SunCalc from 'suncalc'
import type { Venue, VenueSunStatus } from '../types'

const TORONTO_LAT = 43.6500
const TORONTO_LNG = -79.3960

export function getSunPosition(date: Date) {
  const pos = SunCalc.getPosition(date, TORONTO_LAT, TORONTO_LNG)
  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth + Math.PI,
    altitudeDeg: (pos.altitude * 180) / Math.PI,
    azimuthDeg: ((pos.azimuth + Math.PI) * 180) / Math.PI,
  }
}

export function getSunTimes(date: Date) {
  return SunCalc.getTimes(date, TORONTO_LAT, TORONTO_LNG)
}

/**
 * Calculate geometric sun exposure for a venue at a specific time.
 * This is "would this patio get sun if the sky were clear?"
 * Uses manualSunWindows as the source of truth.
 */
export function getGeometricExposure(venue: Venue, time: Date): number {
  const sun = getSunPosition(time)
  if (sun.altitudeDeg <= 0) return 0

  // Covered patios never get direct sun
  if (venue.covered) return 0

  const hour = time.getHours() + time.getMinutes() / 60

  // Use manualSunWindows if defined
  if (venue.manualSunWindows) {
    if (venue.manualSunWindows.length === 0) return 0
    for (const w of venue.manualSunWindows) {
      if (hour >= w.start && hour < w.end) return 100
    }
    return 0
  }

  // Fallback: if no manualSunWindows defined, assume sun when sun is up
  return sun.altitudeDeg > 5 ? 80 : 0
}

/**
 * Apply weather factor to geometric exposure.
 * cloudCover: 0-100 (0=clear, 100=overcast)
 * isRaining: boolean
 *
 * On a clear day (0% clouds), full geometric exposure.
 * On a partly cloudy day (50%), reduced but still some direct sun possible.
 * On an overcast day (90%+), essentially no direct sun.
 * If raining, no sun at all.
 */
export function applyWeatherFactor(
  geometricPct: number,
  cloudCover: number,
  isRaining: boolean
): number {
  if (isRaining) return 0
  if (cloudCover >= 90) return 0
  if (cloudCover >= 70) return Math.round(geometricPct * 0.15) // mostly blocked
  if (cloudCover >= 50) return Math.round(geometricPct * 0.4)  // intermittent
  if (cloudCover >= 30) return Math.round(geometricPct * 0.7)  // partly cloudy
  return geometricPct // clear or mostly clear
}

/**
 * Calculate full sun status for a venue including hourly forecast.
 * cloudCover and isRaining affect the "actual" sun exposure.
 */
export function getVenueSunStatus(
  venue: Venue,
  currentTime: Date,
  cloudCover: number = 0,
  isRaining: boolean = false
): VenueSunStatus {
  const geometricPct = getGeometricExposure(venue, currentTime)
  const sunPercentage = applyWeatherFactor(geometricPct, cloudCover, isRaining)

  const today = new Date(currentTime)
  const BAR_OPEN = 11
  const BAR_CLOSE = 21

  const hourlyForecast: { hour: number; percentage: number }[] = []
  for (let h = BAR_OPEN; h <= BAR_CLOSE; h++) {
    const t = new Date(today)
    t.setHours(h, 30, 0, 0)
    const geoPct = getGeometricExposure(venue, t)
    // For hourly forecast, show geometric (clear-sky) exposure
    // The user can see current weather conditions separately
    hourlyForecast.push({ hour: h, percentage: Math.round(geoPct) })
  }

  return { venueId: venue.id, sunPercentage, hourlyForecast }
}

export function getAllVenueSunStatuses(
  venues: Venue[],
  time: Date,
  cloudCover: number = 0,
  isRaining: boolean = false
): Map<string, VenueSunStatus> {
  const statuses = new Map<string, VenueSunStatus>()
  for (const venue of venues) {
    statuses.set(venue.id, getVenueSunStatus(venue, time, cloudCover, isRaining))
  }
  return statuses
}

export function getSunStatusColor(percentage: number): string {
  if (percentage >= 60) return 'sun-full'
  if (percentage >= 20) return 'sun-partial'
  return 'sun-shade'
}

export function getSunStatusLabel(percentage: number): string {
  if (percentage >= 60) return 'Sunny'
  if (percentage >= 20) return 'Partial Sun'
  return 'Shade'
}
