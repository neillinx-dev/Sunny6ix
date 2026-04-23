import { useEffect, useRef, useState, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import SunCalc from 'suncalc'
import { useAppStore } from '../../store/useAppStore'
import { buildingsInBounds } from '../../data/buildings'
import { calculateBuildingShadow, computeVenueSunPct } from '../../lib/shadowEngine'
import { createShadowOverlay } from '../../lib/shadowOverlay'
import type { Venue, VenueSunStatus } from '../../types'

const TORONTO_CENTER = { lat: 43.6500, lng: -79.3960 }
const TORONTO_LAT = 43.65
const TORONTO_LNG = -79.396
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string

interface MapContainerProps { venues: Venue[] }

export default function MapContainer({ venues }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const patioPolysRef = useRef<google.maps.Polygon[]>([])
  const shadowOverlayRef = useRef<ReturnType<typeof createShadowOverlay> | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const selectedVenueId = useAppStore((s) => s.selectedVenueId)
  const setSelectedVenue = useAppStore((s) => s.setSelectedVenue)
  const sunStatuses = useAppStore((s) => s.sunStatuses)
  const setSunStatuses = useAppStore((s) => s.setSunStatuses)
  const filters = useAppStore((s) => s.filters)
  const currentTime = useAppStore((s) => s.currentTime)
  const weather = useAppStore((s) => s.weather)
  const selectedDayOffset = useAppStore((s) => s.selectedDayOffset)
  const hourlyCloud = useAppStore((s) => s.hourlyCloud)

  const getCloudForTime = useCallback((time: Date): { cloud: number; raining: boolean } => {
    if (!hourlyCloud || hourlyCloud.length === 0) {
      return { cloud: weather?.cloudCover ?? 0, raining: weather?.isRaining ?? false }
    }
    const hour = time.getHours()
    const dayOfMonth = time.getDate()
    const target = hour + dayOfMonth * 24
    let best = hourlyCloud[0]
    let bestDiff = Math.abs(best.hour - target)
    for (const h of hourlyCloud) {
      const diff = Math.abs(h.hour - target)
      if (diff < bestDiff) { best = h; bestDiff = diff }
    }
    return { cloud: best.cloudCover, raining: best.weatherCode >= 51 && best.weatherCode <= 82 }
  }, [hourlyCloud, weather])

  const updateSunStatus = useCallback(() => {
    if (!mapReady) return

    const { cloud, raining: rain } = getCloudForTime(currentTime)
    const sunPos = SunCalc.getPosition(currentTime, TORONTO_LAT, TORONTO_LNG)
    const sunUp = sunPos.altitude > 0.05
    const statuses = new Map<string, VenueSunStatus>()

    // Cloud/rain multiplier applied on top of geometric sun%
    const weatherFactor = (c: number, raining: boolean): number => {
      if (raining) return 0
      if (c >= 90) return 0
      if (c >= 70) return 0.15
      if (c >= 50) return 0.4
      if (c >= 30) return 0.7
      return 1
    }

    // Shadow cache shared across all venues + hours within this update.
    // A single downtown building may fall within 5–10 venues' 150m radii,
    // and each venue checks 12 hours — so without caching we'd redundantly
    // project the same building up to ~120× per update. Cache makes it ~1×.
    const shadowCache = new Map<string, [number, number][] | null>()

    // Pre-fetch nearby buildings per-venue once (doesn't change with time)
    // 150m radius generous — long shadows near sunrise/sunset reach ~100m+.
    const nearbyCache = new Map<string, ReturnType<typeof buildingsInBounds>>()
    const getNearby = (lat: number, lng: number, cacheKey: string) => {
      let list = nearbyCache.get(cacheKey)
      if (!list) {
        const dLat = 150 / 111000
        const dLng = 150 / (111000 * Math.cos(lat * Math.PI / 180))
        list = buildingsInBounds(lng - dLng, lat - dLat, lng + dLng, lat + dLat)
        nearbyCache.set(cacheKey, list)
      }
      return list
    }

    for (const v of venues) {
      const nearby = getNearby(v.lat, v.lng, v.id)

      // Current-time sun %: shadow-aware geometric × weather
      let geo = 0
      if (sunUp) {
        if (v.covered === true) geo = 0
        else if (v.manualSunWindows) {
          if (v.manualSunWindows.length === 0) geo = 0
          else {
            const h = currentTime.getHours() + currentTime.getMinutes() / 60
            for (const w of v.manualSunWindows) {
              if (h >= w.start && h < w.end) { geo = 100; break }
            }
          }
        } else {
          // ← The real win: compute from actual building shadows
          geo = computeVenueSunPct(v, currentTime, nearby, shadowCache)
        }
      }
      const pct = Math.round(geo * weatherFactor(cloud, rain))

      // Hourly forecast: same treatment, 11am–9pm
      const hf: { hour: number; percentage: number }[] = []
      for (let h = 11; h <= 21; h++) {
        const t = new Date(currentTime)
        t.setHours(h, 30, 0, 0)
        const hSun = SunCalc.getPosition(t, TORONTO_LAT, TORONTO_LNG)
        let hp = 0
        if (hSun.altitude > 0.05) {
          if (v.covered === true) hp = 0
          else if (v.manualSunWindows?.length) {
            for (const w of v.manualSunWindows) {
              if (h + 0.5 >= w.start && h + 0.5 < w.end) { hp = 100; break }
            }
          } else {
            hp = computeVenueSunPct(v, t, nearby, shadowCache)
          }
        }
        const { cloud: hCloud, raining: hRain } = getCloudForTime(t)
        hp = Math.round(hp * weatherFactor(hCloud, hRain))
        hf.push({ hour: h, percentage: hp })
      }

      statuses.set(v.id, { venueId: v.id, sunPercentage: pct, hourlyForecast: hf })
    }
    setSunStatuses(statuses)
  }, [venues, currentTime, weather, selectedDayOffset, mapReady, setSunStatuses, getCloudForTime])

  // Initialize Google Maps
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Only set options once (Google Maps API can't be re-loaded)
    if (!(window as any).__gmapsOptionsSet) {
      setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly' })
      ;(window as any).__gmapsOptionsSet = true
    }

    importLibrary('maps').then(({ Map }: any) => {
      const map = new Map(el, {
        center: TORONTO_CENTER,
        zoom: 14,
        // mapId removed — not needed for basic markers
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      })

      mapRef.current = map

      // Add venue markers
      const newMarkers: google.maps.Marker[] = []
      for (const v of venues) {
        const marker = new google.maps.Marker({
          map,
          position: { lat: v.lat, lng: v.lng },
          title: v.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#0D1B2A',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        })
        marker.set('venueId', v.id)
        marker.addListener('click', () => setSelectedVenue(v.id))
        newMarkers.push(marker)
      }
      markersRef.current = newMarkers
      setMapReady(true)

      // Initialize single-canvas shadow overlay (flattens overlapping
      // shadows into one uniform shade — no compound darkness)
      const shadowOverlay = createShadowOverlay()
      shadowOverlay.setMap(map)
      shadowOverlayRef.current = shadowOverlay

      // Render real patio polygons (OSM-sourced or hand-drawn).
      // Brand yellow outline, visible at zoom >= 16 to avoid clutter at lower zooms.
      const patioPolys: google.maps.Polygon[] = []
      for (const v of venues) {
        if (!v.patioPolygon || v.patioPolygon.length < 3) continue
        const poly = new google.maps.Polygon({
          paths: v.patioPolygon.map(([lng, lat]) => ({ lat, lng })),
          strokeColor: '#E6A800',
          strokeOpacity: 0.95,
          strokeWeight: 2,
          fillColor: '#FFC72C',
          fillOpacity: 0.2,
          clickable: false,
          visible: false, // toggled on zoom >= 16
        })
        poly.setMap(map)
        patioPolys.push(poly)
      }
      patioPolysRef.current = patioPolys

      // Show patio polygons at zoom ≥ 16
      map.addListener('zoom_changed', () => {
        const z = map.getZoom() ?? 0
        const visible = z >= 16
        patioPolysRef.current.forEach(p => p.setVisible(visible))
      })

      // Click map to deselect
      map.addListener('click', () => setSelectedVenue(null))
    })

    return () => {
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
      patioPolysRef.current.forEach(p => p.setMap(null))
      patioPolysRef.current = []
      if (shadowOverlayRef.current) {
        shadowOverlayRef.current.setMap(null)
        shadowOverlayRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update marker colors when sun status changes
  useEffect(() => {
    if (!mapReady) return

    markersRef.current.forEach((marker) => {
      const venueId = marker.get('venueId') as string
      if (!venueId) return
      const venue = venues.find(v => v.id === venueId)
      if (!venue) return

      const status = sunStatuses.get(venueId)
      const pct = status?.sunPercentage ?? 0
      let visible = true
      if (filters.sunnyOnly && pct < 20) visible = false
      if (filters.rooftopOnly && venue.patioType !== 'rooftop') visible = false
      if (filters.neighborhood && venue.neighborhood !== filters.neighborhood) visible = false

      marker.setVisible(visible)

      // Sunny6ix marker palette: yellow = sunny, navy = shade, sky = partial
      let color = '#0D1B2A'
      if (pct >= 60) color = '#FFC72C'
      else if (pct >= 20) color = '#7EC8E3'

      const scale = venueId === selectedVenueId ? 14 : 10
      const strokeWeight = venueId === selectedVenueId ? 4 : 3
      const strokeColor = venueId === selectedVenueId ? '#FFC72C' : '#ffffff'

      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale,
        fillColor: color,
        fillOpacity: 1,
        strokeColor,
        strokeWeight,
      })
    })
  }, [sunStatuses, filters, selectedVenueId, venues, mapReady])

  // Render building shadows (viewport-filtered, single flat canvas)
  const renderShadows = useCallback(() => {
    const map = mapRef.current
    const overlay = shadowOverlayRef.current
    if (!map || !overlay) return

    const sunPos = SunCalc.getPosition(currentTime, TORONTO_LAT, TORONTO_LNG)
    const zoom = map.getZoom()
    const sunDown = sunPos.altitude <= 0.05
    const tooZoomedOut = !zoom || zoom < 15

    if (sunDown || tooZoomedOut) {
      overlay.setShadows([])
      return
    }

    const bounds = map.getBounds()
    if (!bounds) return
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()

    const viewportBuildings = buildingsInBounds(
      sw.lng(), sw.lat(), ne.lng(), ne.lat()
    )

    const shadows: [number, number][][] = []
    for (const building of viewportBuildings) {
      const shadow = calculateBuildingShadow(building, currentTime)
      if (shadow) shadows.push(shadow)
    }

    overlay.setShadows(shadows)
  }, [currentTime])

  // Re-render shadows when time changes
  useEffect(() => {
    if (!mapReady) return
    renderShadows()
  }, [currentTime, mapReady, renderShadows])

  // Re-render shadows when user pans/zooms (viewport changes)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const idleListener = map.addListener('idle', renderShadows)
    return () => idleListener.remove()
  }, [mapReady, renderShadows])

  // Update sun status when time/weather changes
  useEffect(() => {
    if (!mapReady) return
    updateSunStatus()
  }, [currentTime, mapReady, updateSunStatus])

  // Fly to selected venue
  useEffect(() => {
    if (!selectedVenueId || !mapRef.current) return
    const venue = venues.find(v => v.id === selectedVenueId)
    if (!venue) return
    mapRef.current.panTo({ lat: venue.lat, lng: venue.lng })
    if ((mapRef.current.getZoom() || 14) < 16) mapRef.current.setZoom(16)
  }, [selectedVenueId, venues])

  // Slim top-banner notification for weather/night conditions that mean "no sun".
  // Unlike the old full-screen overlay, this doesn't dim the map — shadows stay
  // visible so users can still explore the geometric sun geometry at any time.
  // Priority: night > rain > overcast > (nothing).
  const sunAltitude = SunCalc.getPosition(currentTime, TORONTO_LAT, TORONTO_LNG).altitude
  const isNight = sunAltitude <= 0
  const { cloud: tCloud, raining: tRain } = getCloudForTime(currentTime)

  let banner: null | { bg: string; emoji: string; label: string } = null
  if (isNight) {
    banner = { bg: 'rgba(13,27,42,0.92)', emoji: '🌙', label: 'Sun has set — no sun on any patio' }
  } else if (tRain) {
    banner = { bg: 'rgba(13,27,42,0.90)', emoji: '☔', label: 'Raining — no sun on any patio' }
  } else if (tCloud >= 85) {
    banner = { bg: 'rgba(30,41,59,0.88)', emoji: '☁️', label: 'Overcast — no direct sun on any patio' }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {banner && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: '50%',
            transform: 'translateX(-50%)',
            background: banner.bg,
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.015em',
            boxShadow: '0 6px 24px rgba(13,27,42,0.32)',
            border: '1px solid rgba(255,199,44,0.25)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            whiteSpace: 'nowrap',
            zIndex: 15,
          }}
        >
          <span style={{ fontSize: 15 }}>{banner.emoji}</span>
          {banner.label}
        </div>
      )}
    </div>
  )
}
