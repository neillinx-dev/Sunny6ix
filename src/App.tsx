import { useEffect, useRef } from 'react'
import { useAppStore } from './store/useAppStore'
import { useWeather } from './hooks/useWeather'
import { supabase } from './lib/supabase'
import MapContainer from './components/Map/MapContainer'
import Header from './components/UI/Header'
import TimeSlider from './components/UI/TimeSlider'
import FilterBar from './components/UI/FilterBar'
import VenueDetailCard from './components/UI/VenueDetailCard'
import SunnyList from './components/UI/SunnyList'
import AuthModal from './components/Auth/AuthModal'
import venueData from './data/venues.json'
import type { Venue } from './types'

const venues: Venue[] = venueData as Venue[]

function App() {
  const isLiveTime = useAppStore((s) => s.isLiveTime)
  const setCurrentTime = useAppStore((s) => s.setCurrentTime)
  const setUser = useAppStore((s) => s.setUser)
  const setFavorites = useAppStore((s) => s.setFavorites)

  useWeather()

  // Live time update
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  useEffect(() => {
    if (!isLiveTime) { clearInterval(liveTimerRef.current); return }
    liveTimerRef.current = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(liveTimerRef.current)
  }, [isLiveTime, setCurrentTime])

  // Hydrate Supabase session + listen for auth changes; sync favorites.
  useEffect(() => {
    let cancelled = false

    const loadFavorites = async (userId: string) => {
      const { data, error } = await supabase
        .from('favorites')
        .select('venue_id')
        .eq('user_id', userId)
      if (error || cancelled) return
      const set = new Set<string>((data ?? []).map((r) => r.venue_id as string))
      setFavorites(set)
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) loadFavorites(u.id)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadFavorites(u.id)
        // On Google (or other OAuth) sign-in, mirror the email into Resend
        // audience. AuthModal already does this for email/password signups,
        // so we only fire here for non-email providers. Resend's POST is
        // idempotent (returns 422 on duplicates) so safe to call twice.
        if (event === 'SIGNED_IN' && u.app_metadata?.provider !== 'email' && u.email) {
          fetch('/__api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: u.email }),
          }).catch(() => { /* fire-and-forget */ })
        }
      } else {
        setFavorites(new Set())
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [setUser, setFavorites])

  return (
    <div className="relative h-full w-full">
      <MapContainer venues={venues} />
      <Header />
      <FilterBar venues={venues} />
      <SunnyList venues={venues} />
      <VenueDetailCard venues={venues} />
      <TimeSlider />
      <AuthModal />
    </div>
  )
}

export default App
