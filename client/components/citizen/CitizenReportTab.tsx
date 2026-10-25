'use client'

import { useRef, useEffect } from 'react'
import {
  Camera,
  Image as ImageIcon,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Upload,
} from 'lucide-react'
import { LiveCameraViewfinder } from '@/components/citizen/LiveCameraViewfinder'
import { GpsTracker } from '@/components/citizen/GpsTracker'
import { useLiveCamera } from '@/hooks/useLiveCamera'
import type { GpsLocation } from '@/types/report'

const TITLE_TAGS = [
  'Vehicular Accident',
  'Medical Emergency',
  'Flash Flood / Landslide',
  'Fire Incident',
  'Coastal / Sea Emergency',
]

interface CitizenReportTabProps {
  reportTitle: string
  onTitleChange: (val: string) => void
  reportCaption: string
  onCaptionChange: (val: string) => void
  selectedFile: File | null
  filePreview: string | null
  fileType: 'image' | 'video'
  onMediaSelected: (file: File, type: 'image' | 'video') => void
  onClearMedia: () => void
  gpsLocation: GpsLocation | null
  gpsLoading: boolean
  gpsError: string | null
  gpsStatus?: string | null
  onRefreshGps: () => void
  uploadProgress: number | null
  submittingReport: boolean
  reportError: string | null
  reportSuccess: boolean
  onSubmit: (e: React.FormEvent) => void
  onResetSuccess?: () => void
  citizenName?: string
}

export function CitizenReportTab({
  reportTitle,
  onTitleChange,
  reportCaption,
  onCaptionChange,
  selectedFile,
  filePreview,
  fileType,
  onMediaSelected,
  onClearMedia,
  gpsLocation,
  gpsLoading,
  gpsError,
  gpsStatus,
  onRefreshGps,
  uploadProgress,
  submittingReport,
  reportError,
  reportSuccess,
  onSubmit,
  onResetSuccess,
  citizenName,
}: CitizenReportTabProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const hasAutoStartedRef = useRef(false)

  const {
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
  } = useLiveCamera((file, type) => {
    onMediaSelected(file, type)
  })

  // Automatically open the camera in photo mode when the citizen arrives/logs in
  useEffect(() => {
    if (!hasAutoStartedRef.current && !selectedFile && !filePreview) {
      hasAutoStartedRef.current = true
      startLiveCamera('photo')
    }
  }, [selectedFile, filePreview, startLiveCamera])

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    stopLiveCamera()
    const isVid = file.type.startsWith('video/')
    onMediaSelected(file, isVid ? 'video' : 'image')
  }

  const handleRetake = () => {
    onClearMedia()
    startLiveCamera('photo')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Hidden input for uploading images from device */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryChange}
        className="hidden"
      />

      {/* 1. REPORT SUCCESS STATE */}
      {reportSuccess && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Emergency Report Sent Successfully!</h2>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 max-w-md mx-auto">
              MDRRMO Tarragona Emergency Response Center has received your incident report with live GPS coordinates and photo evidence.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (onResetSuccess) onResetSuccess()
                onClearMedia()
                startLiveCamera('photo')
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Report Another Incident</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN REPORT WORKFLOW (When not showing success confirmation) */}
      {!reportSuccess && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-7 shadow-xs">
          {/* Header Title & Subtitle */}
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                  Emergency Incident Report
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                  {!selectedFile
                    ? 'Capture a live incident photo or upload an image to begin.'
                    : 'Photo attached. Confirm coordinates and enter incident details.'}
                </p>
              </div>
              {citizenName && (
                <div className="hidden sm:block text-right">
                  <span className="text-[11px] text-zinc-400 block font-medium">Reporting Citizen</span>
                  <span className="text-xs font-semibold text-zinc-700">{citizenName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Notice */}
          {reportError && (
            <div className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>{reportError}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: AUTOMATIC CAMERA CAPTURE OR UPLOAD (Visible when no media selected) */}
          {/* ========================================================================= */}
          {!selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 pb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center font-bold">
                    1
                  </span>
                  Capture or Upload Incident Photo
                </span>
                <span className="text-red-600 font-semibold text-[11px]">* Required</span>
              </div>

              {/* Case 1A: Live Camera Viewfinder is Active (Default on login) */}
              {liveCameraMode && (
                <div className="space-y-3">
                  <LiveCameraViewfinder
                    mode="photo"
                    facingMode={facingMode}
                    cameraLoading={cameraLoading}
                    cameraError={cameraError}
                    isRecordingVideo={isRecordingVideo}
                    recordingDuration={recordingDuration}
                    videoRef={liveVideoRef}
                    onSwitchFacing={switchCameraFacing}
                    onClose={stopLiveCamera}
                    onCapturePhoto={capturePhotoFromLiveStream}
                    onStartRecordVideo={startVideoRecording}
                    onStopRecordVideo={stopVideoRecording}
                    onRetry={() => startLiveCamera('photo', facingMode)}
                    onUploadImage={() => galleryInputRef.current?.click()}
                  />

                  {/* Accessible Upload Button right beneath camera */}
                  <div className="flex flex-col items-center justify-center gap-2 pt-1">
                    <div className="flex items-center gap-3 w-full max-w-sm my-1">
                      <div className="h-px bg-zinc-200 flex-1" />
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        or
                      </span>
                      <div className="h-px bg-zinc-200 flex-1" />
                    </div>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full max-w-sm inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-800 text-xs sm:text-sm font-semibold shadow-2xs transition-all hover:border-zinc-400"
                    >
                      <Upload className="w-4 h-4 text-zinc-600" />
                      <span>Upload Image from Device</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Case 1B: Camera is Inactive / Closed / Denied */}
              {!liveCameraMode && (
                <div className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">Incident Photo Required</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                      Please capture a live photo or upload an image from your device to continue reporting.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => startLiveCamera('photo')}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Open Live Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
                    >
                      <Upload className="w-4 h-4 text-zinc-600" />
                      <span>Upload Image from Device</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: DETAILS INPUT FORM (Revealed after media is captured or uploaded)  */}
          {/* ========================================================================= */}
          {selectedFile && (
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Captured Photo Preview Banner */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">
                      ✓
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-zinc-800">
                      Photo Attached — Input Remaining Details
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake / Change Photo</span>
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 sm:aspect-16/9 w-full max-w-lg mx-auto flex items-center justify-center shadow-md border border-zinc-200">
                  {fileType === 'video' ? (
                    <video src={filePreview || ''} controls className="w-full h-full object-contain" />
                  ) : (
                    <img
                      src={filePreview || ''}
                      alt="Incident preview"
                      className="w-full h-full object-contain"
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleRetake}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                    title="Change photo"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-600/95 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{fileType === 'video' ? 'Video Recorded' : 'Photo Captured'}</span>
                  </div>
                </div>
              </div>

              {/* 1. AUTOMATIC GPS TRACKING */}
              <GpsTracker
                gpsLocation={gpsLocation}
                gpsLoading={gpsLoading}
                gpsError={gpsError}
                gpsStatus={gpsStatus}
                onRefresh={onRefreshGps}
              />

              {/* 2. INCIDENT TITLE */}
              <div>
                <label
                  htmlFor="reportTitle"
                  className="block text-xs sm:text-sm font-bold text-zinc-800 mb-1"
                >
                  Incident Title <span className="text-red-600">*</span>
                </label>
                <input
                  id="reportTitle"
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="e.g. Vehicular Collision near Tarragona Central School"
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />

                {/* Quick suggestion tags */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TITLE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onTitleChange(tag)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. SITUATION DETAILS & LANDMARKS */}
              <div>
                <label
                  htmlFor="reportCaption"
                  className="block text-xs sm:text-sm font-bold text-zinc-800 mb-1"
                >
                  Situation Details &amp; Landmarks
                </label>
                <textarea
                  id="reportCaption"
                  rows={3}
                  value={reportCaption}
                  onChange={(e) => onCaptionChange(e.target.value)}
                  placeholder="Describe what happened, estimated number of injured, nearest barangay or landmarks..."
                  className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>Uploading incident proof to Cloudinary...</span>
                    <span className="font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingReport}
                className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {submittingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting Emergency Report...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Emergency Report</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

