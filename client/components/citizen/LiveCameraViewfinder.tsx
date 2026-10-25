'use client'

import { RefObject, useEffect } from 'react'
import {
  SwitchCamera,
  X,
  Loader2,
  AlertTriangle,
  Square,
  Circle,
  ImageIcon,
} from 'lucide-react'

interface LiveCameraViewfinderProps {
  mode: 'photo' | 'video'
  facingMode: 'environment' | 'user'
  cameraLoading: boolean
  cameraError: string | null
  isRecordingVideo: boolean
  recordingDuration: number
  videoRef: RefObject<HTMLVideoElement | null>
  onSwitchFacing: () => void
  onClose: () => void
  onCapturePhoto: () => void
  onStartRecordVideo: () => void
  onStopRecordVideo: () => void
  onRetry: () => void
  onUploadImage?: () => void
}

export function LiveCameraViewfinder({
  mode,
  facingMode,
  cameraLoading,
  cameraError,
  isRecordingVideo,
  recordingDuration,
  videoRef,
  onSwitchFacing,
  onClose,
  onCapturePhoto,
  onStartRecordVideo,
  onStopRecordVideo,
  onRetry,
  onUploadImage,
}: LiveCameraViewfinderProps) {
  // Prevent mobile & tablet background page bouncing while camera viewfinder is full screen
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-black xl:relative xl:inset-auto xl:z-10 xl:h-auto xl:aspect-16/9 xl:max-w-lg xl:rounded-2xl xl:shadow-xl flex items-center justify-center overflow-hidden touch-none select-none">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
      />

      {/* Camera Loading Overlay */}
      {cameraLoading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white gap-3 z-30">
          <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-red-500" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-wide">
            Opening live camera...
          </span>
        </div>
      )}

      {/* Camera Error Overlay */}
      {cameraError && (
        <div className="absolute inset-0 bg-black/95 p-6 flex flex-col items-center justify-center text-center text-white gap-4 z-30">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-white">Camera Access Required</h4>
            <p className="text-xs text-zinc-300 max-w-xs mx-auto">{cameraError}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold hover:bg-zinc-700 active:scale-95 transition-all"
            >
              Retry Camera
            </button>
            {onUploadImage && (
              <button
                type="button"
                onClick={onUploadImage}
                className="px-4 py-2 rounded-xl bg-red-600 text-xs font-semibold hover:bg-red-700 active:scale-95 flex items-center gap-2 transition-all shadow-md"
              >
                <ImageIcon className="w-4 h-4" />
                Upload Image
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-700 text-xs font-semibold hover:bg-zinc-600 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Top Viewfinder Controls */}
      <div className="absolute top-0 inset-x-0 pt-4 sm:pt-5 px-4 sm:px-6 pb-8 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between pointer-events-auto max-w-3xl mx-auto">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white tracking-wide border border-white/10 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>LIVE {mode === 'photo' ? 'PHOTO' : 'VIDEO'}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch Front/Rear Camera */}
            <button
              type="button"
              onClick={onSwitchFacing}
              title="Switch Camera Facing"
              className="p-2.5 sm:p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border border-white/10 transition-transform active:scale-90 shadow-sm cursor-pointer"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>

            {/* Close Camera Viewfinder */}
            <button
              type="button"
              onClick={onClose}
              title="Close Camera"
              className="p-2.5 sm:p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border border-white/10 transition-transform active:scale-90 shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Shutter / Action Controls */}
      <div className="absolute bottom-0 inset-x-0 pb-8 sm:pb-6 pt-10 px-6 sm:px-8 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="flex items-center justify-around pointer-events-auto max-w-md mx-auto">
          {/* Left Action: Upload from Device */}
          {onUploadImage && mode === 'photo' ? (
            <button
              type="button"
              onClick={onUploadImage}
              title="Upload Image from Device"
              className="flex flex-col items-center gap-1.5 text-white hover:text-zinc-200 active:scale-90 transition-transform w-16 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg hover:bg-white/25 transition-colors">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-white/90 drop-shadow-sm">Upload</span>
            </button>
          ) : (
            <div className="w-16" />
          )}

          {/* Center Action: Shutter Capture Button */}
          {mode === 'photo' && (
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={onCapturePhoto}
                className="w-18 h-18 sm:w-16 sm:h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 active:scale-90 transition-all shadow-2xl flex items-center justify-center p-1 cursor-pointer ring-4 ring-black/30"
                title="Capture Photo"
              >
                <div className="w-full h-full rounded-full bg-white/25 active:bg-white/40 transition-colors" />
              </button>
              <span className="text-[11px] font-bold text-white drop-shadow-md mt-2 tracking-wide">
                Tap to Capture
              </span>
            </div>
          )}

          {/* Right Action: Flip Camera */}
          {mode === 'photo' ? (
            <button
              type="button"
              onClick={onSwitchFacing}
              title="Flip to Front/Rear Camera"
              className="flex flex-col items-center gap-1.5 text-white hover:text-zinc-200 active:scale-90 transition-transform w-16 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg hover:bg-white/25 transition-colors">
                <SwitchCamera className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-white/90 drop-shadow-sm">Flip</span>
            </button>
          ) : (
            <div className="w-16" />
          )}

          {mode === 'video' && (
            <div className="flex flex-col items-center col-span-3">
              {isRecordingVideo ? (
                <>
                  <div className="flex items-center gap-2 bg-red-600 text-white px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider mb-2.5 shadow-md animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    REC {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:
                    {String(recordingDuration % 60).padStart(2, '0')} / 01:00
                  </div>
                  <button
                    type="button"
                    onClick={onStopRecordVideo}
                    className="w-18 h-18 sm:w-16 sm:h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 active:scale-90 transition-all shadow-2xl flex items-center justify-center cursor-pointer"
                  >
                    <Square className="w-7 h-7 text-white fill-current" />
                  </button>
                  <span className="text-xs font-bold text-white drop-shadow-md mt-2">
                    Tap to Stop &amp; Save Video
                  </span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onStartRecordVideo}
                    className="w-18 h-18 sm:w-16 sm:h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 active:scale-90 transition-all shadow-2xl flex items-center justify-center cursor-pointer"
                  >
                    <Circle className="w-8 h-8 text-white fill-current" />
                  </button>
                  <span className="text-xs font-bold text-white drop-shadow-md mt-2">
                    Tap to Start Recording
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

