/**
 * ResQTrack Real-Time Driving Route & Navigation Engine
 * Fetches real road trajectories along highways (Route 902, Tarragona, Davao Oriental)
 * avoiding straight lines over water/mountains.
 */

export interface DrivingRouteResult {
  coordinates: [number, number][] // [latitude, longitude] pairs for Leaflet
  distanceKm: number | null
  durationMinutes: number | null
  summary: string
  source: 'google' | 'osrm' | 'fallback'
}

// In-memory cache for recent routes (keyed by rounded origin + destination)
const routeCache = new Map<string, { data: DrivingRouteResult; timestamp: number }>()
const CACHE_TTL_MS = 60 * 1000 // Cache for 1 minute

function cacheKey(
  origLat: number,
  origLng: number,
  destLat: number,
  destLng: number
): string {
  // Round to ~3 decimal places (~110 meters) so small GPS jitters reuse the path
  const r = (n: number) => n.toFixed(3)
  return `${r(origLat)},${r(origLng)}->${r(destLat)},${r(destLng)}`
}

/**
 * Fetch road driving route between origin and destination.
 */
export async function getDrivingRoute(
  origLat: number,
  origLng: number,
  destLat: number,
  destLng: number
): Promise<DrivingRouteResult> {
  const key = cacheKey(origLat, origLng, destLat, destLng)
  const cached = routeCache.get(key)
  const now = Date.now()

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  // 1. Try our Next.js Directions API route (with Google Maps & OSRM)
  try {
    const res = await fetch(
      `/api/directions?origin=${origLat},${origLng}&destination=${destLat},${destLng}`
    )
    if (res.ok) {
      const data: DrivingRouteResult = await res.json()
      if (data.coordinates && data.coordinates.length > 2) {
        routeCache.set(key, { data, timestamp: now })
        return data
      }
    }
  } catch (err) {
    console.warn('Internal directions API failed, trying browser direct OSRM:', err)
  }

  // 2. Client-side browser fallback directly to OSRM
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson`
    const osrmRes = await fetch(osrmUrl)
    if (osrmRes.ok) {
      const osrmData = await osrmRes.json()
      if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
        const route = osrmData.routes[0]
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        )
        const result: DrivingRouteResult = {
          coordinates,
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMinutes: Math.round(route.duration / 60),
          summary: route.legs?.[0]?.summary || 'Road Route',
          source: 'osrm',
        }
        routeCache.set(key, { data: result, timestamp: now })
        return result
      }
    }
  } catch (err) {
    console.error('Browser direct OSRM routing failed:', err)
  }

  // 3. Fallback to 2-point line if all routing servers are down
  const fallback: DrivingRouteResult = {
    coordinates: [
      [origLat, origLng],
      [destLat, destLng],
    ],
    distanceKm: null,
    durationMinutes: null,
    summary: 'Direct line',
    source: 'fallback',
  }
  return fallback
}
