import { create } from 'zustand'
import type { VenueSunStatus } from '../types'

export interface WeatherData {
  temp: number
  feelsLike: number
  description: string
  icon: string
  windSpeed: number
  humidity: number
  cloudCover: number
  isRaining: boolean
}

export interface DailyForecast {
  date: string
  weatherCode: number
  tempMax: number
  tempMin: number
}

export interface HourlyCloud {
  hour: number // encoded hour + day*24
  cloudCover: number // 0-100
  weatherCode: number
  temperature: number // celsius
  precipitation: number // mm (current / forecast)
  precipitationProb: number // 0-100
}

interface AppState {
  selectedVenueId: string | null
  currentTime: Date
  selectedDayOffset: number
  isLiveTime: boolean
  sunStatuses: Map<string, VenueSunStatus>
  weather: WeatherData | null
  dailyForecast: DailyForecast[] | null
  hourlyCloud: HourlyCloud[] | null
  filters: {
    sunnyOnly: boolean
    rooftopOnly: boolean
    neighborhood: string | null
    patioType: string | null
  }

  setSelectedVenue: (id: string | null) => void
  setCurrentTime: (time: Date) => void
  setSelectedDayOffset: (offset: number) => void
  setIsLiveTime: (live: boolean) => void
  setSunStatus: (venueId: string, status: VenueSunStatus) => void
  setSunStatuses: (statuses: Map<string, VenueSunStatus>) => void
  setWeather: (weather: WeatherData | null) => void
  setDailyForecast: (forecast: DailyForecast[] | null) => void
  setHourlyCloud: (hourly: HourlyCloud[] | null) => void
  toggleSunnyOnly: () => void
  toggleRooftopOnly: () => void
  setNeighborhood: (n: string | null) => void
  setPatioType: (t: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedVenueId: null,
  currentTime: new Date(),
  selectedDayOffset: 0,
  isLiveTime: true,
  sunStatuses: new Map(),
  weather: null,
  dailyForecast: null,
  hourlyCloud: null,
  filters: {
    sunnyOnly: false,
    rooftopOnly: false,
    neighborhood: null,
    patioType: null,
  },

  setSelectedVenue: (id) => set({ selectedVenueId: id }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setSelectedDayOffset: (offset) => set({ selectedDayOffset: offset }),
  setIsLiveTime: (live) => set({ isLiveTime: live }),
  setSunStatus: (venueId, status) =>
    set((state) => {
      const next = new Map(state.sunStatuses)
      next.set(venueId, status)
      return { sunStatuses: next }
    }),
  setSunStatuses: (statuses) => set({ sunStatuses: statuses }),
  setWeather: (weather) => set({ weather }),
  setDailyForecast: (forecast) => set({ dailyForecast: forecast }),
  setHourlyCloud: (hourly) => set({ hourlyCloud: hourly }),
  toggleSunnyOnly: () =>
    set((state) => ({ filters: { ...state.filters, sunnyOnly: !state.filters.sunnyOnly } })),
  toggleRooftopOnly: () =>
    set((state) => ({ filters: { ...state.filters, rooftopOnly: !state.filters.rooftopOnly } })),
  setNeighborhood: (n) =>
    set((state) => ({ filters: { ...state.filters, neighborhood: n } })),
  setPatioType: (t) =>
    set((state) => ({ filters: { ...state.filters, patioType: t } })),
}))
