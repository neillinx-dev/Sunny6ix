export interface SunWindow {
  start: number // hour (e.g. 14 = 2pm)
  end: number   // hour (e.g. 19 = 7pm)
}

export interface Venue {
  id: string
  name: string
  address: string
  neighborhood: string
  lat: number
  lng: number
  patioType: 'sidewalk' | 'rooftop' | 'backyard' | 'courtyard'
  covered: boolean | 'partial' | 'retractable' // is the patio covered/sheltered?
  patioFloor: number // 0 = ground level, 5 = 5th floor rooftop, etc.
  orientation: number // degrees from north (180 = south-facing)
  buildingHeight?: number // venue building height in meters (floors * 3.5m)
  patioSide?: 'N' | 'S' | 'E' | 'W' | 'roof' | 'multi' | 'open' // which side of the building the patio is on
  sunNotes?: string // human-readable notes about real sun exposure
  samplePoints: [number, number][] // [lng, lat] pairs
  patioPolygon?: [number, number][] // precise patio footprint as [lng, lat] polygon coordinates
  tags: string[]
  website?: string
  manualSunWindows?: SunWindow[] // manually researched direct-sun hour ranges; empty [] = never gets sun
  popularity?: number // 1-5 hand-curated tier for sort order in Sunny Now list (5 = iconic, 3 = solid, 1 = lesser-known); undefined treated as 2
}

export interface VenueSunStatus {
  venueId: string
  sunPercentage: number // 0-100
  hourlyForecast: { hour: number; percentage: number }[]
}
