'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { ReportItem } from '@/types/report'
import { useLiveCamera } from '@/hooks/useLiveCamera'
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Plus,
  Trash2,
  RotateCcw,
  Maximize2,
} from 'lucide-react'

interface RescueCompletionModalProps {
  report: ReportItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: ReportItem) => void
}

interface PhotoItem {
  id: string
  file: File
  previewUrl: string
}

export function RescueCompletionModal({
  report,
  isOpen,
  onClose,
  onSuccess,
}: RescueCompletionModalProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number>(0)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Native File Inputs
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Helper to append a photo
  const addPhoto = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP).')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image exceeds maximum size limit of 15MB.')
      return
    }

    setErrorMessage(null)
    const newPhoto: PhotoItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }

    setPhotos((prev) => [...prev, newPhoto])
  }, [])

  // Live in-browser Camera Hook
  const {
    liveCameraMode,
    cameraLoading,
    cameraError,
    liveVideoRef,
    startLiveCamera,
    stopLiveCamera,
    switchCameraFacing,
    capturePhotoFromLiveStream,
  } = useLiveCamera(addPhoto)

  if (!isOpen || !report) return null

  // Handle Gallery Selection (multiple allowed)
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      addPhoto(file)
    })

    if (galleryInputRef.current) {
      galleryInputRef.current.value = ''
    }
  }

  // Handle Native Mobile Camera Snap
  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      addPhoto(file)
    })

    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  // Remove a photo
  const handleRemovePhoto = (id: string, index: number) => {
    setPhotos((prev) => {
      const target = prev[index]
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((p) => p.id !== id)
    })
    if (activePreviewIndex === index) {
      setActivePreviewIndex(null)
    }
  }

  // Clean up all photos
  const handleClearAllPhotos = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setPhotos([])
    setActivePreviewIndex(null)
    stopLiveCamera()
  }

  // Submit Completion & Upload All Photos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (photos.length === 0) {
      setErrorMessage('Please capture or upload at least one photo as proof of rescue completion.')
      return
    }

    setUploading(true)
    setErrorMessage(null)

    try {
      const uploadedUrls: string[] = []

      // Upload photos to Cloudinary sequentially
      for (let i = 0; i < photos.length; i++) {
        setCurrentUploadIndex(i + 1)
        const photo = photos[i]
        const uploadResult = await uploadToCloudinary(photo.file, (percent) => {
          const overallProgress = Math.round(
            ((i + percent / 100) / photos.length) * 100
          )
          setUploadProgress(overallProgress)
        })
        uploadedUrls.push(uploadResult.secureUrl)
      }

      const resolvedAt = new Date().toISOString()
      const supabase = createClient()

      // Base update payload
      const basePayload: Record<string, unknown> = {
        mission_status: 'completed',
        resolution_image_url: uploadedUrls[0] || null,
        resolution_notes:
          notes.trim() || 'Rescue operation successfully resolved by MDRRMO emergency responder.',
        resolved_at: resolvedAt,
      }

      // Try updating with resolution_images array, with graceful fallback
      let updateErr = null
      try {
        const { error } = await supabase
          .from('reports')
          .update({
            ...basePayload,
            resolution_images: uploadedUrls,
          })
          .eq('id', report.id)
        updateErr = error
      } catch (e) {
        updateErr = e
      }

      // If array column not present, fallback to base payload
      if (updateErr) {
        console.warn('Fallback to standard resolution_image_url:', updateErr)
        await supabase.from('reports').update(basePayload).eq('id', report.id)
      }

      // Broadcast completion event over realtime WebSocket channel
      try {
        const channel = supabase.channel('resqtrack-dispatch')
        channel.send({
          type: 'broadcast',
          event: 'responder_location',
          payload: {
            report_id: report.id,
            responder_id: report.responder_id || '',
            responder_name: report.responder_name || 'Responder',
            latitude: report.latitude || 7.0425,
            longitude: report.longitude || 126.4485,
            mission_status: 'completed',
            updated_at: resolvedAt,
          },
        })
      } catch (bcErr) {
        console.warn('Realtime completion broadcast warning:', bcErr)
      }

      const updatedReport: ReportItem = {
        ...report,
        mission_status: 'completed',
        resolution_image_url: uploadedUrls[0],
        resolution_images: uploadedUrls,
        resolution_notes: notes.trim() || 'Rescue operation completed successfully.',
        resolved_at: resolvedAt,
      }

      onSuccess(updatedReport)
      handleClearAllPhotos()
      setNotes('')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload rescue proof photos.'
      setErrorMessage(msg)
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  const handleCloseModal = () => {
    if (uploading) return
    handleClearAllPhotos()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-zinc-200 shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Rescue Completion &amp; Proof Photos
              </h3>
              <p className="text-xs text-zinc-500">
                Capture or upload multiple proof images &bull; MDRRMO Tarragona
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            disabled={uploading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryChange}
          className="hidden"
          id="proof-gallery-input"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraChange}
          className="hidden"
          id="proof-camera-input"
        />

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 flex-1">
          {/* Incident Info Summary */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs">
            <div className="font-bold text-zinc-800 truncate">{report.title}</div>
            <div className="text-zinc-500 text-[11px] mt-0.5">
              Citizen: {report.profiles?.full_name || 'Resident'} &bull; Status: Dispatched
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode 1: Live In-Browser Camera Viewfinder */}
          {liveCameraMode ? (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 w-full max-w-md mx-auto flex items-center justify-center border border-zinc-300 shadow-md">
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {cameraLoading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-xs font-semibold">Starting Camera...</span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-black/80 p-4 flex flex-col items-center justify-center text-center text-red-400 text-xs gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Shutter & Controls Overlay */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-10">
                  <button
                    type="button"
                    onClick={switchCameraFacing}
                    className="p-2.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                    title="Switch Camera Facing"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={capturePhotoFromLiveStream}
                    disabled={cameraLoading}
                    className="w-14 h-14 rounded-full bg-white border-4 border-emerald-500 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    title="Snap Proof Photo"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-600" />
                  </button>

                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="p-2.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                    title="Close Live Camera"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-center text-[11px] text-zinc-500 font-medium">
                Tap the center button to capture proof photo into your gallery.
              </p>
            </div>
          ) : (
            /* Mode 2: Action Choice Buttons (Capture vs Upload) */
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Proof of Rescue Photos</span>
                  <span className="text-red-500">*</span>
                </span>
                {photos.length > 0 && (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {photos.length} Photo{photos.length > 1 ? 's' : ''} Selected
                  </span>
                )}
              </label>

              {/* Two Choice Action Cards: 1. Take Photo (Camera), 2. Upload from Gallery */}
              <div className="grid grid-cols-2 gap-3">
                {/* Choice 1: Camera Capture */}
                <button
                  type="button"
                  onClick={() => {
                    // On desktop, try in-browser live stream; on mobile, native capture input
                    if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                      cameraInputRef.current?.click()
                    } else {
                      startLiveCamera('photo')
                    }
                  }}
                  className="p-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 text-center transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-2xs"
                >
                  <div className="p-2.5 rounded-full bg-white text-emerald-700 shadow-xs border border-emerald-200 group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">Take Photo</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Use device camera</div>
                  </div>
                </button>

                {/* Choice 2: Gallery Upload (Multiple) */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 text-center transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-2xs"
                >
                  <div className="p-2.5 rounded-full bg-white text-blue-700 shadow-xs border border-blue-200 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">Upload Gallery</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Select multiple photos</div>
                  </div>
                </button>
              </div>

              {/* Photos Gallery Grid Preview */}
              {photos.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span className="font-bold text-zinc-800">
                      Captured Proof Gallery ({photos.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllPhotos}
                      disabled={uploading}
                      className="text-[11px] text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="relative group rounded-xl overflow-hidden aspect-square bg-black border border-zinc-200 shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.previewUrl}
                          alt={`Proof ${index + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Remove button */}
                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo.id, index)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors"
                            title="Remove this photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}

                        {/* Enlargement zoom icon */}
                        <button
                          type="button"
                          onClick={() => setActivePreviewIndex(index)}
                          className="absolute bottom-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black text-white transition-colors"
                          title="View larger"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>

                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white">
                          #{index + 1}
                        </div>
                      </div>
                    ))}

                    {/* Add More button tile */}
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="rounded-xl border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-zinc-800 transition-colors aspect-square"
                    >
                      <Plus className="w-5 h-5 text-zinc-400" />
                      <span className="text-[10px] font-bold">+ Add More</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Operation Resolution Notes */}
          <div>
            <label
              htmlFor="resolution-notes"
              className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5 text-zinc-500" />
              Operation Summary &amp; Completion Notes
            </label>
            <textarea
              id="resolution-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Patient stabilized, scene cleared, team safely returning to base. No casualties."
              rows={3}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-zinc-300 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Upload Progress Bar for Multiple Photos */}
          {uploadProgress !== null && (
            <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex justify-between text-xs font-semibold text-emerald-900">
                <span>
                  Uploading photo {currentUploadIndex} of {photos.length}...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-emerald-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={uploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={uploading || photos.length === 0}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting {photos.length} Proof Photo{photos.length > 1 ? 's' : ''}...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Complete Rescue ({photos.length} Photo{photos.length !== 1 ? 's' : ''})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Full Image Preview Modal */}
        {activePreviewIndex !== null && photos[activePreviewIndex] && (
          <div
            className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setActivePreviewIndex(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[activePreviewIndex].previewUrl}
                alt="Enlarged Proof"
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setActivePreviewIndex(null)}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
