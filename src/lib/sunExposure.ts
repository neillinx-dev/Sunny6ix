import SunCalc from 'suncalc'
import type { Venue } from '../types'

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

export function getGeometricExposure(venue: Venue, time: Date): number {
  const sun = getSunPosition(time)
  if (sun.altitudeDeg <= 0) return 0
  if (venue.covered === true) return 0

  const hour = time.getHours() + time.getMinutes() / 60

  if (venue.manualSunWindows) {
    if (venue.manualSunWindows.length === 0) return 0
    for (const w of venue.manualSunWindows) {
      if (hour >= w.start && hour < w.end) return 100
    }
    return 0
  }

  return sun.altitudeDeg > 5 ? 80 : 0
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
