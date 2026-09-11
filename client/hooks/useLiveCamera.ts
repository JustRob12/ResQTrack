'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export function useLiveCamera(onMediaReady: (file: File, type: 'image' | 'video') => void) {
  const [liveCameraMode, setLiveCameraMode] = useState<'photo' | 'video' | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const stopLiveCamera = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null
    }

    setIsRecordingVideo(false)
    setRecordingDuration(0)
    setLiveCameraMode(null)
    setCameraError(null)
    setCameraLoading(false)
  }, [])

  const startLiveCamera = useCallback(
    async (mode: 'photo' | 'video', targetFacing: 'environment' | 'user' = facingMode) => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }

      setLiveCameraMode(mode)
      setCameraLoading(true)
      setCameraError(null)
      setIsRecordingVideo(false)
      setRecordingDuration(0)

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: mode === 'video',
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        mediaStreamRef.current = stream

        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream
          await liveVideoRef.current.play().catch(() => {})
        }
        setCameraLoading(false)
      } catch (err: unknown) {
        console.error('Camera access error:', err)
        let msg = 'Could not access the camera. Please check camera permissions.'
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            msg = 'Camera permission was denied. Please allow camera access in browser settings.'
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            msg = 'No camera device was detected on your device.'
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            msg = 'Camera is currently in use by another application.'
          }
        }
        setCameraError(msg)
        setCameraLoading(false)
      }
    },
    [facingMode]
  )

  const switchCameraFacing = useCallback(() => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextFacing)
    if (liveCameraMode) {
      startLiveCamera(liveCameraMode, nextFacing)
    }
  }, [facingMode, liveCameraMode, startLiveCamera])

  const capturePhotoFromLiveStream = useCallback(() => {
    if (!liveVideoRef.current) return
    const video = liveVideoRef.current

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')

    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const photoFile = new File(
              [blob],
              `incident-photo-${Date.now()}.jpg`,
              { type: 'image/jpeg' }
            )
            onMediaReady(photoFile, 'image')
            stopLiveCamera()
          }
        },
        'image/jpeg',
        0.92
      )
    }
  }, [facingMode, onMediaReady, stopLiveCamera])

  const stopVideoRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecordingVideo(false)
  }, [])

  const startVideoRecording = useCallback(() => {
    if (!mediaStreamRef.current) return
    const stream = mediaStreamRef.current
    recordedChunksRef.current = []

    let options: MediaRecorderOptions = {}
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' }
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' }
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' }
      }
    }

    try {
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm'
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
        const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType })
        const videoFile = new File(
          [videoBlob],
          `incident-video-${Date.now()}.${ext}`,
          { type: mimeType }
        )
        onMediaReady(videoFile, 'video')
        stopLiveCamera()
      }

      recorder.start(500)
      setIsRecordingVideo(true)
      setRecordingDuration(0)

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 60) {
            stopVideoRecording()
            return 60
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err)
      setCameraError('Failed to record video on this browser. Try uploading from gallery.')
    }
  }, [onMediaReady, stopLiveCamera, stopVideoRecording])

  useEffect(() => {
    return () => {
      stopLiveCamera()
    }
  }, [stopLiveCamera])

  return {
    liveCameraMode,
    facingMode,
    cameraLoading,
    cameraError,
    isRecordingVideo,
    recordingDuration,
    liveVideoRef,
    startLiveCamera,
    stopLiveCamera,
    switchCameraFacing,
    capturePhotoFromLiveStream,
    startVideoRecording,
    stopVideoRecording,
  }
}
