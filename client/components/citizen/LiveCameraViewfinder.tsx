'use client'

import { RefObject } from 'react'
import {
  SwitchCamera,
  X,
  Loader2,
  AlertTriangle,
  Square,
  Circle,
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
}: LiveCameraViewfinderProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 sm:aspect-16/9 w-full max-w-lg mx-auto flex items-center justify-center shadow-md">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
      />

      {/* Camera Loading Overlay */}
      {cameraLoading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white gap-2 z-20">
          <Loader2 className="w-7 h-7 animate-spin text-red-500" />
          <span className="text-xs font-semibold">Opening live camera...</span>
        </div>
      )}

      {/* Camera Error Overlay */}
      {cameraError && (
        <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center text-white gap-3 z-20">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <p className="text-xs text-zinc-300 max-w-xs">{cameraError}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold hover:bg-zinc-700"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-xs font-semibold hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Top Viewfinder Controls */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto z-10">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-bold text-white tracking-wide">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>LIVE {mode === 'photo' ? 'PHOTO' : 'VIDEO'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Front/Rear Camera */}
          <button
            type="button"
            onClick={onSwitchFacing}
            title="Switch Camera"
            className="p-2 rounded-full bg-black/60 backdrop-blur-xs text-white hover:bg-black/80 transition-transform active:scale-95"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Close Camera */}
          <button
            type="button"
            onClick={onClose}
            title="Cancel"
            className="p-2 rounded-full bg-black/60 backdrop-blur-xs text-white hover:bg-black/80 transition-transform active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Shutter / Record Controls */}
      <div className="absolute bottom-4 inset-x-0 flex flex-col items-center justify-center gap-2 pointer-events-auto z-10 px-4">
        {mode === 'photo' && (
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={onCapturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 active:scale-90 transition-all shadow-lg flex items-center justify-center"
            >
              <div className="w-10 h-10 rounded-full bg-white/20" />
            </button>
            <span className="text-[11px] font-bold text-white drop-shadow-md mt-1.5">
              Tap to Capture Photo
            </span>
          </div>
        )}

        {mode === 'video' && (
          <div className="flex flex-col items-center">
            {isRecordingVideo ? (
              <>
                <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider mb-2 shadow-sm animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  REC {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:
                  {String(recordingDuration % 60).padStart(2, '0')} / 01:00
                </div>
                <button
                  type="button"
                  onClick={onStopRecordVideo}
                  className="w-16 h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 active:scale-90 transition-all shadow-lg flex items-center justify-center"
                >
                  <Square className="w-6 h-6 text-white fill-current" />
                </button>
                <span className="text-[11px] font-bold text-white drop-shadow-md mt-1.5">
                  Tap to Stop &amp; Save Video
                </span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onStartRecordVideo}
                  className="w-16 h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 active:scale-90 transition-all shadow-lg flex items-center justify-center"
                >
                  <Circle className="w-7 h-7 text-white fill-current" />
                </button>
                <span className="text-[11px] font-bold text-white drop-shadow-md mt-1.5">
                  Tap to Start Recording
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
