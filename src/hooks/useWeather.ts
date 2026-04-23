import { useEffect } from 'react'
import { useAppStore, type WeatherData, type DailyForecast, type HourlyCloud } from '../store/useAppStore'

const TORONTO_LAT = 43.6500
const TORONTO_LNG = -79.3960
const CACHE_KEY = 'patiosun_weather_v6'
const CACHE_DURATION = 10 * 60 * 1000

interface CachedData {
  weather: WeatherData
  daily: DailyForecast[]
  timestamp: number
}

function getCached(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: CachedData = JSON.parse(raw)
    if (Date.now() - parsed.timestamp > CACHE_DURATION) return null
    return parsed
  } catch { return null }
}

function setCache(weather: WeatherData, daily: DailyForecast[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ weather, daily, timestamp: Date.now() }))
}

export function useWeather() {
  const setWeather = useAppStore((s) => s.setWeather)
  const setDailyForecast = useAppStore((s) => s.setDailyForecast)
  const setHourlyCloud = useAppStore((s) => s.setHourlyCloud)
  const weather = useAppStore((s) => s.weather)

  useEffect(() => {
    const cached = getCached()
    if (cached) {
      setWeather(cached.weather)
      setDailyForecast(cached.daily)
      return
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${TORONTO_LAT}&longitude=${TORONTO_LNG}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover,rain&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=cloud_cover,weather_code,temperature_2m,precipitation,precipitation_probability&forecast_days=4&timezone=America/Toronto`

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!data.current) throw new Error('No weather data')

        const c = data.current
        const code = c.weather_code as number

        const weather: WeatherData = {
          temp: Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          description: wmoDesc(code),
          icon: wmoIcon(code),
          windSpeed: Math.round(c.wind_speed_10m),
          humidity: Math.round(c.relative_humidity_2m),
          cloudCover: Math.round(c.cloud_cover ?? 0),
          isRaining: (c.rain ?? 0) > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82),
        }

        const daily: DailyForecast[] = (data.daily?.time || []).map((date: string, i: number) => ({
          date,
          weatherCode: data.daily.weather_code[i],
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
        }))

        // Parse hourly cloud cover for accurate time-based sun status
        const hourlyCloud: HourlyCloud[] = (data.hourly?.time || []).map((time: string, i: number) => {
          const d = new Date(time)
          return {
            hour: d.getHours() + d.getDate() * 24, // unique hour across days
            cloudCover: Math.round(data.hourly.cloud_cover[i] ?? 0),
            weatherCode: data.hourly.weather_code[i] ?? 0,
            temperature: Math.round(data.hourly.temperature_2m?.[i] ?? 0),
            precipitation: data.hourly.precipitation?.[i] ?? 0,
            precipitationProb: Math.round(data.hourly.precipitation_probability?.[i] ?? 0),
          }
        })

        setWeather(weather)
        setDailyForecast(daily)
        setHourlyCloud(hourlyCloud)
        setCache(weather, daily)
      })
      .catch((err) => console.error('Weather fetch failed:', err))
  }, [setWeather, setDailyForecast, setHourlyCloud])

  return weather
}

export function wmoDesc(code: number): string {
  const m: Record<number, string> = {
    0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog',
    51: 'Drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
    95: 'Thunderstorm', 96: 'T-storm + hail',
  }
  return m[code] || 'Unknown'
}

export function wmoEmoji(code: number): string {
  if (code <= 1) return '☀️'
  if (code === 2) return '⛅'
  if (code === 3) return '☁️'
  if (code >= 45 && code <= 48) return '🌫️'
  if (code >= 51 && code <= 57) return '🌦️'
  if (code >= 61 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 77) return '🌨️'
  if (code >= 80 && code <= 82) return '🌧️'
  if (code >= 95) return '⛈️'
  return '🌤️'
}

function wmoIcon(code: number): string {
  if (code <= 1) return '01d'
  if (code === 2) return '02d'
  if (code === 3) return '04d'
  if (code >= 51 && code <= 67) return '09d'
  if (code >= 71 && code <= 77) return '13d'
  if (code >= 80 && code <= 82) return '09d'
  if (code >= 95) return '11d'
  return '03d'
}
