export interface CloudinaryUploadResult {
  url: string
  secureUrl: string
  mediaType: 'image' | 'video'
  publicId: string
  format: string
  width?: number
  height?: number
  duration?: number
}

export async function uploadToCloudinary(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'iq17lqxf'
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', endpoint)

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          onProgress(percent)
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          const isVideo =
            response.resource_type === 'video' || file.type.startsWith('video/')
          resolve({
            url: response.url,
            secureUrl: response.secure_url,
            mediaType: isVideo ? 'video' : 'image',
            publicId: response.public_id,
            format: response.format,
            width: response.width,
            height: response.height,
            duration: response.duration,
          })
        } catch {
          reject(new Error('Failed to parse Cloudinary upload response.'))
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText)
          reject(
            new Error(errRes.error?.message || `Cloudinary upload failed with status ${xhr.status}`)
          )
        } catch {
          reject(new Error(`Cloudinary upload failed with status ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error occurred while uploading media to Cloudinary.'))
    }

    xhr.send(formData)
  })
}
