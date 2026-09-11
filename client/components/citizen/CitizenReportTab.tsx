'use client'

import { useRef } from 'react'
import {
  Camera,
  Video,
  Image as ImageIcon,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
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
  onRefreshGps: () => void
  uploadProgress: number | null
  submittingReport: boolean
  reportError: string | null
  reportSuccess: boolean
  onSubmit: (e: React.FormEvent) => void
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
  onRefreshGps,
  uploadProgress,
  submittingReport,
  reportError,
  reportSuccess,
  onSubmit,
}: CitizenReportTabProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)

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

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isVid = file.type.startsWith('video/')
    onMediaSelected(file, isVid ? 'video' : 'image')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-7 shadow-xs">
        <div className="mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900">Emergency Incident Report</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Capture photo/video, describe the situation, and transmit coordinates to MDRRMO Tarragona.
          </p>
        </div>

        {reportSuccess && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold">Emergency Report Sent Successfully!</div>
              <div className="text-xs text-emerald-700 mt-0.5">
                MDRRMO Tarragona emergency response team has been notified. Redirecting to your reports...
              </div>
            </div>
          </div>
        )}

        {reportError && (
          <div className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>{reportError}</div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* 1. MEDIA FIRST SECTION */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-zinc-800 mb-1.5">
              1. Incident Photo or Video <span className="text-red-600">*</span>
            </label>

            {/* Hidden input for gallery */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleGalleryChange}
              className="hidden"
            />

            {/* Case 1: In-Website Live Camera Active */}
            {liveCameraMode && (
              <LiveCameraViewfinder
                mode={liveCameraMode}
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
                onRetry={() => startLiveCamera(liveCameraMode, facingMode)}
              />
            )}

            {/* Case 2: No Camera Active & No Media Selected */}
            {!liveCameraMode && !filePreview && (
              <div className="p-4 sm:p-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center">
                <p className="text-xs text-zinc-500 mb-3 font-medium">
                  Choose how to capture incident media:
                </p>
                <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
                  {/* Live Photo */}
                  <button
                    type="button"
                    onClick={() => startLiveCamera('photo')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 text-xs font-semibold shadow-2xs transition-all hover:border-zinc-300"
                  >
                    <Camera className="w-5 h-5 text-red-600 mb-1" />
                    Take Photo
                  </button>

                  {/* Live Video */}
                  <button
                    type="button"
                    onClick={() => startLiveCamera('video')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 text-xs font-semibold shadow-2xs transition-all hover:border-zinc-300"
                  >
                    <Video className="w-5 h-5 text-red-600 mb-1" />
                    Record Video
                  </button>

                  {/* Pick from Gallery */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 text-xs font-semibold shadow-2xs transition-all hover:border-zinc-300"
                  >
                    <ImageIcon className="w-5 h-5 text-zinc-600 mb-1" />
                    Gallery
                  </button>
                </div>
              </div>
            )}

            {/* Case 3: File Captured or Uploaded Preview */}
            {!liveCameraMode && filePreview && (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 sm:aspect-16/9 w-full max-w-lg mx-auto flex items-center justify-center shadow-md border border-zinc-200">
                  {fileType === 'video' ? (
                    <video src={filePreview} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={filePreview} alt="Incident preview" className="w-full h-full object-contain" />
                  )}

                  <button
                    type="button"
                    onClick={onClearMedia}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                    title="Remove media"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{fileType === 'video' ? 'Video Recorded' : 'Photo Captured'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearMedia()
                      startLiveCamera(fileType === 'video' ? 'video' : 'photo')
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 py-1 px-2.5 rounded hover:bg-red-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake {fileType === 'video' ? 'Video' : 'Photo'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. AUTOMATIC GPS TRACKING */}
          <GpsTracker
            gpsLocation={gpsLocation}
            gpsLoading={gpsLoading}
            gpsError={gpsError}
            onRefresh={onRefreshGps}
          />

          {/* 3. INCIDENT TITLE */}
          <div>
            <label htmlFor="reportTitle" className="block text-xs sm:text-sm font-bold text-zinc-800 mb-1">
              2. Incident Title <span className="text-red-600">*</span>
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

          {/* 4. SITUATION DETAILS */}
          <div>
            <label htmlFor="reportCaption" className="block text-xs sm:text-sm font-bold text-zinc-800 mb-1">
              3. Situation Details &amp; Landmarks
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
                <span>Uploading media to Cloudinary...</span>
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
            className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {submittingReport ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transmitting Report to Responders...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Emergency Report</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
