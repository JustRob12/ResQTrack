'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { ResponderLocationBroadcast, MissionStatus } from '@/types/report'

// Tarragona MDRRMO HQ fallback starting location
export const MDRRMO_HQ: [number, number] = [7.0425, 126.4485]

interface ResponderInfo {
  id: string
  name: string
  phone?: string
}

interface DestinationCoords {
  latitude: number
  longitude: number
}

// Calculate distance between two points in km (Haversine formula)
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

export function useResponderTracker() {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
    accuracy: number
    heading?: number | null
    speed?: number | null
    updatedAt: string
  } | null>(null)

  const [isTracking, setIsTracking] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)

  // Tracking references
  const watchIdRef = useRef<number | null>(null)
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastDbUpdateRef = useRef<number>(0)
  const activeReportIdRef = useRef<string | null>(null)
  const responderInfoRef = useRef<ResponderInfo | null>(null)
  const destinationRef = useRef<DestinationCoords | null>(null)
  const currentCoordsRef = useRef<{ lat: number; lng: number }>({
    lat: MDRRMO_HQ[0],
    lng: MDRRMO_HQ[1],
  })

  // 1. Core location update: ALWAYS updates local state immediately
  const updateLocalPosition = useCallback(
    (coords: {
      latitude: number
      longitude: number
      accuracy?: number
      heading?: number | null
      speed?: number | null
    }) => {
      const now = new Date().toISOString()

      setCurrentLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 10,
        heading: coords.heading,
        speed: coords.speed,
        updatedAt: now,
      })

      currentCoordsRef.current = {
        lat: coords.latitude,
        lng: coords.longitude,
      }

      if (destinationRef.current) {
        const d = calculateHaversineDistanceKm(
          coords.latitude,
          coords.longitude,
          destinationRef.current.latitude,
          destinationRef.current.longitude
        )
        setDistanceKm(d)
      }
    },
    []
  )

  // 2. Broadcast to Supabase WebSocket channel & throttled database table
  const broadcastLocation = useCallback(
    async (
      coords: {
        latitude: number
        longitude: number
        accuracy?: number
        heading?: number | null
        speed?: number | null
      },
      missionStatus: MissionStatus = 'en_route'
    ) => {
      // Always update local state first
      updateLocalPosition(coords)

      const reportId = activeReportIdRef.current
      const responder = responderInfoRef.current
      if (!reportId || !responder) return

      const now = new Date().toISOString()
      const supabase = createClient()

      // Realtime broadcast over channel
      try {
        const channel = supabase.channel('resqtrack-dispatch')
        const payload: ResponderLocationBroadcast = {
          report_id: reportId,
          responder_id: responder.id,
          responder_name: responder.name,
          responder_phone: responder.phone,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy || 10,
          heading: coords.heading,
          speed: coords.speed,
          mission_status: missionStatus,
          updated_at: now,
        }

        channel.send({
          type: 'broadcast',
          event: 'responder_location',
          payload,
        })
      } catch (err) {
        console.warn('Realtime broadcast error:', err)
      }

      // Throttled update to database reports table (every 4s)
      const currentTime = Date.now()
      if (currentTime - lastDbUpdateRef.current > 4000) {
        lastDbUpdateRef.current = currentTime
        try {
          await supabase
            .from('reports')
            .update({
              responder_id: responder.id,
              responder_name: responder.name,
              responder_phone: responder.phone || null,
              responder_latitude: coords.latitude,
              responder_longitude: coords.longitude,
              responder_updated_at: now,
              mission_status: missionStatus,
            })
            .eq('id', reportId)
        } catch (dbErr) {
          console.warn('Database location sync error:', dbErr)
        }
      }
    },
    [updateLocalPosition]
  )

  // 3. Manually set coordinates (e.g. from saved mission or station fallback)
  const setManualLocation = useCallback(
    (latitude: number, longitude: number) => {
      updateLocalPosition({
        latitude,
        longitude,
        accuracy: 15,
      })
    },
    [updateLocalPosition]
  )

  // 4. Request device GPS with fast fallback
  const requestDeviceLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      setManualLocation(MDRRMO_HQ[0], MDRRMO_HQ[1])
      return
    }

    setGpsError(null)

    // Fast position attempt (cached / low accuracy for instant response)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocalPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        })
      },
      (err) => {
        console.warn('Low accuracy GPS read failed:', err.message)
        // High accuracy attempt with 8s timeout
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            updateLocalPosition({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            })
          },
          (highErr) => {
            console.warn('High accuracy GPS read failed:', highErr.message)
            setGpsError(
              highErr.code === 1
                ? 'Location permission denied in browser.'
                : 'GPS signal unavailable. Using station coordinates.'
            )
            // Fall back to MDRRMO HQ so user is never stuck
            updateLocalPosition({
              latitude: MDRRMO_HQ[0],
              longitude: MDRRMO_HQ[1],
              accuracy: 100,
            })
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        )
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    )
  }, [updateLocalPosition, setManualLocation])

  // Initial GPS request on component mount
  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) {
        requestDeviceLocation()
      }
    })
    return () => {
      active = false
    }
  }, [requestDeviceLocation])

  // 5. Start active tracking for a mission
  const startTracking = useCallback(
    (reportId: string, responder: ResponderInfo, dest?: DestinationCoords) => {
      activeReportIdRef.current = reportId
      responderInfoRef.current = responder
      if (dest) destinationRef.current = dest

      setIsTracking(true)
      setGpsError(null)

      if (typeof window === 'undefined' || !navigator.geolocation) {
        setGpsError('Geolocation is not supported by your browser.')
        broadcastLocation({
          latitude: MDRRMO_HQ[0],
          longitude: MDRRMO_HQ[1],
          accuracy: 50,
        })
        return
      }

      // Initial read
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          broadcastLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          })
        },
        (err) => {
          console.warn('Initial GPS startTracking error:', err.message)
          const fallbackLat = currentCoordsRef.current.lat || MDRRMO_HQ[0]
          const fallbackLng = currentCoordsRef.current.lng || MDRRMO_HQ[1]
          broadcastLocation({
            latitude: fallbackLat,
            longitude: fallbackLng,
            accuracy: 50,
          })
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      )

      // Continuous watchPosition
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          broadcastLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          })
        },
        (err) => {
          setGpsError(err.message)
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 4000,
        }
      )
    },
    [broadcastLocation]
  )

  // 6. Stop active tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current)
      simIntervalRef.current = null
    }
    setIsTracking(false)
    setIsSimulating(false)
  }, [])

  // 7. Toggle simulated movement along the path
  const toggleSimulatedMovement = useCallback(() => {
    if (isSimulating) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current)
        simIntervalRef.current = null
      }
      setIsSimulating(false)
      return
    }

    if (!destinationRef.current) {
      alert('Destination coordinates not found for simulation.')
      return
    }

    setIsSimulating(true)

    // Move in increments towards target every 2s
    simIntervalRef.current = setInterval(() => {
      const dest = destinationRef.current
      if (!dest) return

      const current = currentCoordsRef.current
      const latDiff = dest.latitude - current.lat
      const lngDiff = dest.longitude - current.lng
      const distRemaining = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)

      if (distRemaining < 0.0008) {
        broadcastLocation(
          {
            latitude: dest.latitude,
            longitude: dest.longitude,
            accuracy: 5,
            speed: 0,
          },
          'on_scene'
        )
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current)
          simIntervalRef.current = null
        }
        setIsSimulating(false)
        return
      }

      const stepFraction = Math.min(0.08, 0.001 / (distRemaining || 1))
      const nextLat = current.lat + latDiff * stepFraction
      const nextLng = current.lng + lngDiff * stepFraction

      broadcastLocation({
        latitude: nextLat,
        longitude: nextLng,
        accuracy: 8,
        speed: 12.5,
      })
    }, 2000)
  }, [isSimulating, broadcastLocation])

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current)
      }
    }
  }, [])

  return {
    currentLocation,
    isTracking,
    gpsError,
    isSimulating,
    distanceKm,
    startTracking,
    stopTracking,
    toggleSimulatedMovement,
    broadcastLocation,
    requestDeviceLocation,
    setManualLocation,
  }
}
