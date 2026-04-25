/**
 * Mini-map with satellite view + polygon drawing tool. Used in the admin
 * form to capture a precise patio outline for the venue being added.
 *
 * Lifecycle:
 *  - Mount with center lat/lng → renders satellite map at zoom 19
 *  - Click "Draw" → activates Google Maps DrawingManager in polygon mode
 *  - User clicks 4+ points on the satellite imagery → polygon completes
 *  - Polygon coords passed back to parent via `onChange`
 *  - Click "Reset" to redo
 *
 * Coordinates are returned as [[lng, lat], ...] to match venues.json shape.
 */
import { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

interface PolygonEditorProps {
  centerLat: number
  centerLng: number
  initialPolygon?: [number, number][]
  onChange: (polygon: [number, number][] | null) => void
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string

export default function PolygonEditor({
  centerLat,
  centerLng,
  initialPolygon,
  onChange,
}: PolygonEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const drawingMgrRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const polyRef = useRef<google.maps.Polygon | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasPoly, setHasPoly] = useState(!!initialPolygon?.length)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !centerLat || !centerLng) return

    if (!(window as { __gmapsOptionsSet?: boolean }).__gmapsOptionsSet) {
      setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly', libraries: ['drawing'] })
      ;(window as { __gmapsOptionsSet?: boolean }).__gmapsOptionsSet = true
    }

    let cancelled = false
    Promise.all([importLibrary('maps'), importLibrary('drawing')]).then(
      ([{ Map }, { DrawingManager }]: [{ Map: typeof google.maps.Map }, { DrawingManager: typeof google.maps.drawing.DrawingManager }]) => {
        if (cancelled) return
        const map = new Map(el, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 20,
          mapTypeId: 'satellite',
          tilt: 0,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        })
        mapRef.current = map

        // Render an initial polygon if the venue already has one
        if (initialPolygon && initialPolygon.length >= 3) {
          renderPolygon(initialPolygon)
        }

        const dm = new DrawingManager({
          drawingMode: null,
          drawingControl: false,
          polygonOptions: {
            strokeColor: '#FFC72C',
            strokeOpacity: 1,
            strokeWeight: 3,
            fillColor: '#FFC72C',
            fillOpacity: 0.25,
            editable: true,
            draggable: false,
          },
        })
        dm.setMap(map)
        drawingMgrRef.current = dm

        google.maps.event.addListener(dm, 'polygoncomplete', (poly: google.maps.Polygon) => {
          // Replace any prior polygon with the newly-drawn one
          if (polyRef.current) polyRef.current.setMap(null)
          polyRef.current = poly
          dm.setDrawingMode(null)
          setDrawing(false)
          setHasPoly(true)
          emit()
          // Re-emit when user edits vertices
          const path = poly.getPath()
          google.maps.event.addListener(path, 'set_at', emit)
          google.maps.event.addListener(path, 'insert_at', emit)
          google.maps.event.addListener(path, 'remove_at', emit)
        })
      }
    )

    return () => {
      cancelled = true
      if (polyRef.current) polyRef.current.setMap(null)
      polyRef.current = null
      if (drawingMgrRef.current) drawingMgrRef.current.setMap(null)
      drawingMgrRef.current = null
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLng])

  function renderPolygon(coords: [number, number][]) {
    if (!mapRef.current) return
    if (polyRef.current) polyRef.current.setMap(null)
    const poly = new google.maps.Polygon({
      paths: coords.map(([lng, lat]) => ({ lat, lng })),
      strokeColor: '#FFC72C',
      strokeOpacity: 1,
      strokeWeight: 3,
      fillColor: '#FFC72C',
      fillOpacity: 0.25,
      editable: true,
      draggable: false,
    })
    poly.setMap(mapRef.current)
    polyRef.current = poly
    setHasPoly(true)
    const path = poly.getPath()
    google.maps.event.addListener(path, 'set_at', emit)
    google.maps.event.addListener(path, 'insert_at', emit)
    google.maps.event.addListener(path, 'remove_at', emit)
  }

  function emit() {
    const poly = polyRef.current
    if (!poly) {
      onChange(null)
      return
    }
    const path = poly.getPath()
    const coords: [number, number][] = []
    for (let i = 0; i < path.getLength(); i++) {
      const ll = path.getAt(i)
      coords.push([Number(ll.lng().toFixed(7)), Number(ll.lat().toFixed(7))])
    }
    onChange(coords)
  }

  function startDrawing() {
    if (polyRef.current) {
      polyRef.current.setMap(null)
      polyRef.current = null
      setHasPoly(false)
      onChange(null)
    }
    drawingMgrRef.current?.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
    setDrawing(true)
  }

  function clearPoly() {
    if (polyRef.current) polyRef.current.setMap(null)
    polyRef.current = null
    setHasPoly(false)
    setDrawing(false)
    drawingMgrRef.current?.setDrawingMode(null)
    onChange(null)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={startDrawing}
          disabled={drawing}
          className="px-3 py-1.5 text-[12px] font-semibold rounded-full bg-[#FFC72C] text-[#0D1B2A] disabled:opacity-50"
        >
          {drawing ? 'Click points on the map…' : hasPoly ? 'Redraw polygon' : 'Draw patio polygon'}
        </button>
        {hasPoly && (
          <button
            type="button"
            onClick={clearPoly}
            className="px-3 py-1.5 text-[12px] font-medium rounded-full bg-[#0D1B2A]/8 text-[#0D1B2A]/70 hover:bg-[#0D1B2A]/15"
          >
            Clear
          </button>
        )}
        <span className="text-[11px] text-[#0D1B2A]/55">
          Click on the satellite view to outline the patio. 4–8 points usually plenty.
        </span>
      </div>
      <div
        ref={containerRef}
        style={{ width: '100%', height: 320, borderRadius: 12, overflow: 'hidden' }}
      />
    </div>
  )
}
