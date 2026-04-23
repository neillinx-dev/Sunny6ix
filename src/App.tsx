import { useEffect, useRef } from 'react'
import { useAppStore } from './store/useAppStore'
import { useWeather } from './hooks/useWeather'
import MapContainer from './components/Map/MapContainer'
import Header from './components/UI/Header'
import TimeSlider from './components/UI/TimeSlider'
import FilterBar from './components/UI/FilterBar'
import VenueDetailCard from './components/UI/VenueDetailCard'
import venueData from './data/venues.json'
import type { Venue } from './types'

const venues: Venue[] = venueData as Venue[]

function App() {
  const isLiveTime = useAppStore((s) => s.isLiveTime)
  const setCurrentTime = useAppStore((s) => s.setCurrentTime)

  useWeather()

  // Live time update
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  useEffect(() => {
    if (!isLiveTime) { clearInterval(liveTimerRef.current); return }
    liveTimerRef.current = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(liveTimerRef.current)
  }, [isLiveTime, setCurrentTime])

  return (
    <div className="relative h-full w-full">
      <MapContainer venues={venues} />
      <Header />
      <FilterBar venues={venues} />
      <VenueDetailCard venues={venues} />
      <TimeSlider />
    </div>
  )
}

export default App
