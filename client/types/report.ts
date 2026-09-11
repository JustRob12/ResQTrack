export type ReportStatus = 'pending' | 'accepted' | 'rejected'

export type MediaType = 'image' | 'video'

export interface ReportItem {
  id: string
  user_id: string
  title: string
  caption: string
  media_url: string
  media_type: MediaType
  latitude?: number | null
  longitude?: number | null
  accuracy?: number | null
  status: ReportStatus
  rejection_reason?: string | null
  verified_by?: string | null
  verified_at?: string | null
  created_at: string
  profiles?: {
    full_name: string
    phone_number?: string
    email?: string
  }
}

export interface GpsLocation {
  latitude: number
  longitude: number
  accuracy: number
}
