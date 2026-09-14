import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

// Decodes Google Maps Encoded Polyline Algorithm Format
function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  const len = encoded.length
  let lat = 0
  let lng = 0

  while (index < len) {
    let b: number
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push([lat / 1e5, lng / 1e5])
  }

  return points
}

// Fetch JSON with IPv4 enforcement for resilient server-side DNS resolution
function fetchJsonIpv4<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        family: 4,
        headers: {
          'User-Agent': 'ResQTrack-Emergency-Router/1.0',
          Accept: 'application/json',
        },
        timeout: 8000,
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(body))
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 150)}`))
            }
          } catch (e) {
            reject(e)
          }
        })
      }
    )

    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy(new Error('Request timed out'))
    })
  })
}

interface OsrmResponse {
  code: string
  routes: Array<{
    distance: number
    duration: number
    geometry: {
      coordinates: [number, number][]
    }
    legs?: Array<{ summary?: string }>
  }>
}

interface GoogleDirectionsResponse {
  status: string
  routes: Array<{
    summary?: string
    overview_polyline: { points: string }
    legs: Array<{
      distance?: { value: number }
      duration?: { value: number }
    }>
  }>
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'Origin and destination are required in lat,lng format' },
      { status: 400 }
    )
  }

  const [origLatStr, origLngStr] = origin.split(',')
  const [destLatStr, destLngStr] = destination.split(',')

  const origLat = parseFloat(origLatStr)
  const origLng = parseFloat(origLngStr)
  const destLat = parseFloat(destLatStr)
  const destLng = parseFloat(destLngStr)

  if (
    isNaN(origLat) ||
    isNaN(origLng) ||
    isNaN(destLat) ||
    isNaN(destLng)
  ) {
    return NextResponse.json(
      { error: 'Invalid origin or destination coordinates' },
      { status: 400 }
    )
  }

  const googleApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // 1. Try Google Maps Directions API if API key is configured
  if (googleApiKey) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origLat},${origLng}&destination=${destLat},${destLng}&mode=driving&key=${googleApiKey}`
      const data = await fetchJsonIpv4<GoogleDirectionsResponse>(googleUrl)

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const points = decodeGooglePolyline(route.overview_polyline.points)
        const leg = route.legs?.[0]
        const distanceKm = leg?.distance?.value
          ? Math.round((leg.distance.value / 1000) * 10) / 10
          : null
        const durationMinutes = leg?.duration?.value
          ? Math.round(leg.duration.value / 60)
          : null

        return NextResponse.json({
          coordinates: points,
          distanceKm,
          durationMinutes,
          summary: route.summary || 'via Google Maps Driving Route',
          source: 'google',
        })
      }
    } catch (err) {
      console.warn('Google Maps Directions failed, falling back to OSRM:', err)
    }
  }

  // 2. Open Source Routing Machine (OSRM) driving route
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson`
    const osrmData = await fetchJsonIpv4<OsrmResponse>(osrmUrl)

    if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
      const route = osrmData.routes[0]
      // OSRM coordinates are [lng, lat], convert to Leaflet [lat, lng]
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        (c) => [c[1], c[0]]
      )

      const distanceKm = Math.round((route.distance / 1000) * 10) / 10
      const durationMinutes = Math.round(route.duration / 60)

      return NextResponse.json({
        coordinates,
        distanceKm,
        durationMinutes,
        summary: route.legs?.[0]?.summary || 'Road Route (Route 902)',
        source: 'osrm',
      })
    }
  } catch (err) {
    console.error('OSRM directions query failed:', err)
  }

  // 3. Fallback: direct line if routing services unreachable
  return NextResponse.json({
    coordinates: [
      [origLat, origLng],
      [destLat, destLng],
    ],
    distanceKm: null,
    durationMinutes: null,
    summary: 'Direct trajectory',
    source: 'fallback',
  })
}
