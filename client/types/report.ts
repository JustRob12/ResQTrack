export type ReportStatus = 'pending' | 'accepted' | 'rejected'

export type MissionStatus = 'pending' | 'dispatched' | 'en_route' | 'on_scene' | 'completed'

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
  // Responder Tracking & Proof of Rescue
  responder_id?: string | null
  responder_name?: string | null
  responder_phone?: string | null
  mission_status?: MissionStatus | null
  responder_latitude?: number | null
  responder_longitude?: number | null
  responder_updated_at?: string | null
  resolution_image_url?: string | null
  resolution_images?: string[] | null
  resolution_notes?: string | null
  resolved_at?: string | null
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
  source?: 'satellite' | 'network' | 'cached'
}

export interface ResponderLocationBroadcast {
  report_id: string
  responder_id: string
  responder_name: string
  responder_phone?: string | null
  latitude: number
  longitude: number
  accuracy?: number
  heading?: number | null
  speed?: number | null
  mission_status: MissionStatus
  updated_at: string
}
