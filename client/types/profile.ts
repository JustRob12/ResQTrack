export type UserRole = 0 | 1 // 0 for Admin, 1 for Citizen/Normal People

export interface UserProfile {
  id?: string
  fullName: string
  phone: string
  email: string
  gender: string
  dob: string
  role: UserRole
}

export const sanitizeDate = (d?: string | null): string | null => {
  if (!d || d === 'Not specified') return null
  const trimmed = d.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}
