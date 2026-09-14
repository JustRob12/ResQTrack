'use client'

import { useState, useCallback, useRef } from 'react'
import type { GpsLocation } from '@/types/report'

export function useGpsLocation() {
  const [gpsLocation, setGpsLocation] = useState<GpsLocation | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gpsStatus, setGpsStatus] = useState<string | null>(null)

  // Guard to prevent concurrent duplicate acquisition calls
  const isAcquiringRef = useRef(false)

  const acquireGpsLocation = useCallback(() => {
    // If already acquiring, avoid firing overlapping requests
    if (isAcquiringRef.current) return

    // 1. Check if browser environment supports geolocation
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.')
      setGpsLoading(false)
      return
    }

    // 2. Check for secure context (HTTPS / localhost required by modern mobile browsers)
    if (
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setGpsError(
        'GPS requires a secure connection (HTTPS). When deployed to Vercel (HTTPS), this will work automatically.'
      )
      setGpsLoading(false)
      return
    }

    isAcquiringRef.current = true
    setGpsLoading(true)
    setGpsError(null)
    setGpsStatus('Connecting to GPS sensor...')

    // Tier 2: Fallback to standard/network accuracy (Wi-Fi / Cellular / Cached)
    const runFallbackAcquisition = () => {
      setGpsStatus('Acquiring network location fallback...')

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
            source: 'network',
          })
          setGpsLoading(false)
          setGpsStatus(null)
          isAcquiringRef.current = false
        },
        (fallbackErr) => {
          let msg = 'Unable to acquire location.'
          if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
            msg =
              'Location permission was denied. Please allow location access in your phone/browser settings.'
          } else if (fallbackErr.code === fallbackErr.POSITION_UNAVAILABLE) {
            msg = 'Location unavailable. Please ensure device Location / GPS is turned ON.'
          } else if (fallbackErr.code === fallbackErr.TIMEOUT) {
            msg =
              'Location request timed out. Tap "Refresh GPS" or enter landmarks in the description.'
          }
          setGpsError(msg)
          setGpsLoading(false)
          setGpsStatus(null)
          isAcquiringRef.current = false
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache accepted for fast fallback
        }
      )
    }

    // Tier 1: Try High Accuracy GPS first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          source: 'satellite',
        })
        setGpsLoading(false)
        setGpsStatus(null)
        isAcquiringRef.current = false
      },
      (error) => {
        // If user denied permission, do not retry fallback - stop immediately
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError(
            'Location access was denied. Please allow location access in your browser or device settings.'
          )
          setGpsLoading(false)
          setGpsStatus(null)
          isAcquiringRef.current = false
          return
        }

        // For TIMEOUT or POSITION_UNAVAILABLE (very common indoors on mobile phones),
        // seamlessly fall back to network/coarse positioning
        runFallbackAcquisition()
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 30000, // Accept 30-sec recent GPS fix immediately
      }
    )
  }, [])

  const clearGpsError = useCallback(() => {
    setGpsError(null)
  }, [])

  return {
    gpsLocation,
    gpsLoading,
    gpsError,
    gpsStatus,
    acquireGpsLocation,
    setGpsLocation,
    clearGpsError,
  }
}
