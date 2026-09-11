'use client'

import { useState, useCallback } from 'react'
import type { GpsLocation } from '@/types/report'

export function useGpsLocation() {
  const [gpsLocation, setGpsLocation] = useState<GpsLocation | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const acquireGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.')
      return
    }

    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        })
        setGpsLoading(false)
      },
      (error) => {
        let msg = 'Unable to acquire location.'
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access was denied. Please enable GPS permissions.'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable. Check your device GPS.'
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try refreshing.'
        }
        setGpsError(msg)
        setGpsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    )
  }, [])

  return {
    gpsLocation,
    gpsLoading,
    gpsError,
    acquireGpsLocation,
    setGpsLocation,
  }
}
