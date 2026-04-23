import type { Building } from '../lib/shadowEngine'
import rawBuildings from './torontoBuildings.json'

/**
 * Real Toronto building footprints + LIDAR heights from the City of Toronto
 * 3D Massing open dataset (2025). Filtered to downtown (Dufferin → Parliament,
 * Lake → Bloor), simplified to ~3m tolerance, buildings >= 8m height only.
 *
 * Format: [[lng, lat, lng, lat, ...], heightMeters]
 */

type RawBuilding = [number[], number]

const raw = rawBuildings as RawBuilding[]

export const buildings: Building[] = raw.map((b, i) => {
  const flat = b[0]
  const footprint: [number, number][] = []
  for (let j = 0; j < flat.length; j += 2) {
    footprint.push([flat[j], flat[j + 1]])
  }
  return {
    id: `b${i}`,
    footprint,
    height: b[1],
  }
})

/**
 * Spatial index: group buildings into a coarse lng/lat grid so we can
 * quickly find buildings in a viewport without iterating all ~25k.
 */
const GRID_DEG = 0.005 // ~400m cells

function cellKey(lng: number, lat: number): string {
  return `${Math.floor(lng / GRID_DEG)}_${Math.floor(lat / GRID_DEG)}`
}

const spatialIndex = new Map<string, Building[]>()
for (const b of buildings) {
  // Use first point as representative; buildings are small enough that this works
  const key = cellKey(b.footprint[0][0], b.footprint[0][1])
  const bucket = spatialIndex.get(key)
  if (bucket) bucket.push(b)
  else spatialIndex.set(key, [b])
}

/**
 * Return buildings whose footprints likely intersect the given bbox.
 * Checks all grid cells overlapping the bbox (plus one-cell padding so
 * buildings near cell borders aren't missed).
 */
export function buildingsInBounds(
  lngMin: number,
  latMin: number,
  lngMax: number,
  latMax: number
): Building[] {
  const result: Building[] = []
  const cxMin = Math.floor(lngMin / GRID_DEG) - 1
  const cxMax = Math.floor(lngMax / GRID_DEG) + 1
  const cyMin = Math.floor(latMin / GRID_DEG) - 1
  const cyMax = Math.floor(latMax / GRID_DEG) + 1
  for (let cx = cxMin; cx <= cxMax; cx++) {
    for (let cy = cyMin; cy <= cyMax; cy++) {
      const bucket = spatialIndex.get(`${cx}_${cy}`)
      if (!bucket) continue
      for (const b of bucket) {
        const [lng, lat] = b.footprint[0]
        if (lng >= lngMin - 0.001 && lng <= lngMax + 0.001 &&
            lat >= latMin - 0.001 && lat <= latMax + 0.001) {
          result.push(b)
        }
      }
    }
  }
  return result
}
