'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA ServiceWorker registered successfully:', registration.scope)
          })
          .catch((error) => {
            console.warn('PWA ServiceWorker registration failed:', error)
          })
      })
    }
  }, [])

  return null
}
