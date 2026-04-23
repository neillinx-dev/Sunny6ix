import { useMemo } from 'react'
import { getSunPosition, getSunTimes } from '../lib/sunExposure'

export function useSunPosition(time: Date) {
  return useMemo(() => getSunPosition(time), [time.getTime()])
}

export function useSunTimes(date: Date) {
  return useMemo(() => {
    const times = getSunTimes(date)
    return {
      sunrise: times.sunrise,
      sunset: times.sunset,
      sunriseHour: times.sunrise.getHours() + times.sunrise.getMinutes() / 60,
      sunsetHour: times.sunset.getHours() + times.sunset.getMinutes() / 60,
    }
  }, [date.toDateString()])
}
