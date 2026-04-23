import SunCalc from 'suncalc'
import type maplibregl from 'maplibre-gl'

// Small interface for what we need from a venue (avoids circular import)
export interface VenueLike {
  lat: number
  lng: number
  patioPolygon?: [number, number][]
  covered?: boolean
}

const TORONTO_LAT = 43.6500
const TORONTO_LNG = -79.3960
const M_PER_DEG_LAT = 111000
const M_PER_DEG_LNG = 111000 * Math.cos((TORONTO_LAT * Math.PI) / 180)

export interface Building {
  id: string
  footprint: [number, number][] // [lng, lat] polygon
  height: number // meters
}

export function getSunInfo(date: Date) {
  const pos = SunCalc.getPosition(date, TORONTO_LAT, TORONTO_LNG)
  const times = SunCalc.getTimes(date, TORONTO_LAT, TORONTO_LNG)
  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth + Math.PI,
    altitudeDeg: (pos.altitude * 180) / Math.PI,
    azimuthDeg: ((pos.azimuth + Math.PI) * 180) / Math.PI,
    sunrise: times.sunrise,
    sunset: times.sunset,
    isUp: pos.altitude > 0.05, // slightly above horizon
  }
}

/**
 * Extract building footprints from MapLibre vector tile data.
 * Queries the rendered building features from the map's vector source.
 */
export function extractBuildingsFromMap(map: maplibregl.Map): Building[] {
  const buildings: Building[] = []

  try {
    // Find all layers that reference building data
    const buildingLayerIds = map.getStyle().layers
      ?.filter(l => 'source-layer' in l && l['source-layer'] === 'building')
      .map(l => l.id) || []

    // Include our 3D layer
    if (map.getLayer('buildings-3d') && !buildingLayerIds.includes('buildings-3d')) {
      buildingLayerIds.push('buildings-3d')
    }

    if (buildingLayerIds.length === 0) return []

    // Query building source features directly (more reliable than queryRenderedFeatures for fill-extrusion)
    // Find the source that has building data
    const style = map.getStyle()
    let buildingSource = ''
    for (const l of style.layers || []) {
      if ('source-layer' in l && l['source-layer'] === 'building' && 'source' in l) {
        buildingSource = l.source as string
        break
      }
    }

    const features = buildingSource
      ? map.querySourceFeatures(buildingSource, { sourceLayer: 'building' })
      : []

    const seen = new Set<string>()

    for (const f of features) {
      if (!f.geometry || f.geometry.type !== 'Polygon') continue

      const id = `bld-${f.id || Math.random()}`
      if (seen.has(id)) continue
      seen.add(id)

      const height = (f.properties?.render_height as number) ||
                     (f.properties?.height as number) ||
                     10 // default 10m (~3 floors)

      const coords = (f.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][]
      if (coords.length < 4) continue

      buildings.push({ id, footprint: coords, height })
    }
  } catch {
    // Query might fail if layers don't exist
  }

  return buildings
}

/**
 * 2D convex hull via Andrew's monotone chain. O(n log n).
 * Returns points in counter-clockwise order.
 */
function convexHull(points: [number, number][]): [number, number][] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const n = pts.length
  if (n < 3) return pts
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  const lower: [number, number][] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: [number, number][] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

/**
 * Project a building footprint into a shadow polygon based on sun position.
 * The shadow is the convex hull of {base footprint ∪ projected top footprint} —
 * this captures both the building's own footprint AND the swept "wall shadow"
 * between base and where the roof projects to the ground.
 */
export function calculateBuildingShadow(
  building: Building,
  date: Date
): [number, number][] | null {
  const sun = getSunInfo(date)
  if (!sun.isUp || sun.altitudeDeg < 3) return null

  const shadowLength = building.height / Math.tan(sun.altitude)

  // Shadow direction = opposite of sun azimuth
  const shadowAzRad = ((sun.azimuthDeg + 180) * Math.PI) / 180
  const dLat = (shadowLength * Math.cos(shadowAzRad)) / M_PER_DEG_LAT
  const dLng = (shadowLength * Math.sin(shadowAzRad)) / M_PER_DEG_LNG

  const fp = building.footprint
  const projected: [number, number][] = fp.map(([lng, lat]) => [lng + dLng, lat + dLat])

  // Union of base + projected, then take convex hull → correct wall-inclusive silhouette
  return convexHull([...fp, ...projected])
}

/**
 * Generate shadow GeoJSON from buildings
 */
export function generateShadowGeoJSON(
  buildings: Building[],
  date: Date
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  for (const b of buildings) {
    const shadow = calculateBuildingShadow(b, date)
    if (!shadow) continue
    features.push({
      type: 'Feature',
      properties: { height: b.height },
      geometry: { type: 'Polygon', coordinates: [[...shadow, shadow[0]]] },
    })
  }

  return { type: 'FeatureCollection', features }
}

/**
 * Check if a point is inside a polygon (ray casting)
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Calculate what percentage of a patio polygon is in sun.
 * Samples grid points across the patio and checks each against shadow polygons.
 */
export function calculatePatioSunPercentage(
  patioPolygon: [number, number][],
  shadowPolygons: [number, number][][],
  gridSize: number = 4 // sample grid resolution
): number {
  // Get bounding box of patio
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const [lng, lat] of patioPolygon) {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }

  let totalPoints = 0
  let sunnyPoints = 0

  const dLng = (maxLng - minLng) / gridSize
  const dLat = (maxLat - minLat) / gridSize

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const p: [number, number] = [minLng + i * dLng, minLat + j * dLat]

      // Check if sample point is inside patio
      if (!isPointInPolygon(p, patioPolygon)) continue
      totalPoints++

      // Check if point is in any shadow
      let inShadow = false
      for (const shadow of shadowPolygons) {
        if (isPointInPolygon(p, shadow)) {
          inShadow = true
          break
        }
      }

      if (!inShadow) sunnyPoints++
    }
  }

  return totalPoints === 0 ? 100 : Math.round((sunnyPoints / totalPoints) * 100)
}

/**
 * Find the best centre point for a venue's fallback patio rectangle.
 *
 * Problem: for venues whose address-pin sits inside their own building
 * footprint (very common — Nominatim returns the building centroid), a
 * fallback rect centered on the pin would mostly sample indoor space and
 * the adjacent sidewalk would only be clipped at the edges.
 *
 * Strategy: if the pin is already on open ground, keep it. Otherwise, scan
 * outward in 16 directions at increasing radii until we hit a point outside
 * all buildings — that's the nearest sidewalk/street, which is where the
 * real patio almost certainly is.
 */
function findBestPatioCenter(
  venueLat: number,
  venueLng: number,
  buildings: Building[]
): [number, number] {
  const isInsideAnyBuilding = (p: [number, number]): boolean => {
    for (const b of buildings) {
      if (isPointInPolygon(p, b.footprint)) return true
    }
    return false
  }

  const pin: [number, number] = [venueLng, venueLat]
  if (!isInsideAnyBuilding(pin)) return pin

  // Scan 16 directions × 6 radii (5, 10, 15, 20, 25, 30 m).
  // Take the first open-ground point we find — prefers close offsets.
  const DIRECTIONS = 16
  const RADII_M = [5, 10, 15, 20, 25, 30]
  for (const rM of RADII_M) {
    for (let i = 0; i < DIRECTIONS; i++) {
      const angle = (i / DIRECTIONS) * 2 * Math.PI
      const dLat = (rM * Math.cos(angle)) / M_PER_DEG_LAT
      const dLng = (rM * Math.sin(angle)) / M_PER_DEG_LNG
      const candidate: [number, number] = [venueLng + dLng, venueLat + dLat]
      if (!isInsideAnyBuilding(candidate)) return candidate
    }
  }
  // No open space found within 30m — stick with pin
  return pin
}

/**
 * Build a rectangular fallback polygon around a given centre.
 * Size: sideM × sideM. Kept modest (12m) so the rect doesn't spill across
 * multiple buildings/yards when auto-seeded onto a sidewalk.
 */
function defaultPatioRect(lat: number, lng: number, sizeM = 12): [number, number][] {
  const dLat = (sizeM / 2) / M_PER_DEG_LAT
  const dLng = (sizeM / 2) / M_PER_DEG_LNG
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
  ]
}

/**
 * Geometric sun percentage for a venue given:
 * - the current time (for sun position)
 * - a list of buildings whose shadows could affect the venue
 *
 * Steps:
 * 1. Determine the patio polygon (venue.patioPolygon, else a small rect
 *    around venue.lat/lng).
 * 2. Project each nearby building's shadow at this time.
 * 3. Grid-sample the patio polygon; count how many sample points are lit.
 * 4. Return a 0–100 integer.
 *
 * Returns 0 when:
 *  - covered === true (roof always blocks direct sun)
 *  - sun is below the horizon
 */
export function computeVenueSunPct(
  venue: VenueLike,
  date: Date,
  nearbyBuildings: Building[],
  shadowCache?: Map<string, [number, number][] | null>
): number {
  if (venue.covered) return 0
  const sun = getSunInfo(date)
  if (!sun.isUp) return 0

  const hasCustomPolygon = !!(venue.patioPolygon && venue.patioPolygon.length >= 3)
  let patio: [number, number][]
  if (hasCustomPolygon) {
    patio = venue.patioPolygon!
  } else {
    // Auto-seed: anchor the fallback rect on the nearest open ground
    // (sidewalk/street) rather than centering on the venue pin — which is
    // often inside the building's own footprint.
    const [cx, cy] = findBestPatioCenter(venue.lat, venue.lng, nearbyBuildings)
    patio = defaultPatioRect(cy, cx)
  }

  // Project nearby buildings' shadows at this time.
  // Optional shadowCache keyed by `${buildingId}@${ms}` avoids recomputing
  // when a single building shadows multiple neighbouring venues.
  const shadows: [number, number][][] = []
  const ms = date.getTime()
  for (const b of nearbyBuildings) {
    let s: [number, number][] | null | undefined
    if (shadowCache) {
      const k = `${b.id}@${ms}`
      if (shadowCache.has(k)) s = shadowCache.get(k)
      else { s = calculateBuildingShadow(b, date); shadowCache.set(k, s) }
    } else {
      s = calculateBuildingShadow(b, date)
    }
    if (s) shadows.push(s)
  }

  // Grid-sample the patio polygon. Critically, SKIP samples that fall inside
  // any building — those aren't ground, they're walls/interiors, and would
  // always register as "in shadow" even though they aren't outdoor space.
  // This matters most when the venue's fallback rect overlaps the building
  // the restaurant lives in.
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const [lng, lat] of patio) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const GRID = 4 // 5×5 = 25 samples
  const dLng = (maxLng - minLng) / GRID
  const dLat = (maxLat - minLat) / GRID

  let totalGroundSamples = 0
  let litSamples = 0
  for (let i = 0; i <= GRID; i++) {
    for (let j = 0; j <= GRID; j++) {
      const p: [number, number] = [minLng + i * dLng, minLat + j * dLat]
      // Must be inside the patio polygon
      if (!isPointInPolygon(p, patio)) continue
      // Must NOT be inside a building (skip wall/interior samples)
      let insideBuilding = false
      for (const b of nearbyBuildings) {
        if (isPointInPolygon(p, b.footprint)) { insideBuilding = true; break }
      }
      if (insideBuilding) continue
      totalGroundSamples++
      // Is this ground point inside any building's cast shadow?
      let shaded = false
      for (const sh of shadows) {
        if (isPointInPolygon(p, sh)) { shaded = true; break }
      }
      if (!shaded) litSamples++
    }
  }

  // If every sample landed inside a building (tiny venue pin deep inside a
  // large building footprint), we can't tell — fall back to 50% as "unknown"
  // rather than 0 or 100.
  if (totalGroundSamples === 0) return 50
  return Math.round((litSamples / totalGroundSamples) * 100)
}
