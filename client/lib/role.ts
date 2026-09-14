import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Reads the user's role from public.profiles (source of truth),
 * falling back to user_metadata or default 1 (citizen).
 * 
 * Role values:
 * - 0: Admin (MDRRMO Officer / Dispatcher)
 * - 1: Citizen / Normal people
 * - 2: Emergency Responder (Rescue Unit)
 */
export async function getUserRole(
  supabase: SupabaseClient,
  user: User | null | undefined
): Promise<number> {
  if (!user) return 1

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!error && profile && profile.role !== null && profile.role !== undefined) {
      return Number(profile.role)
    }
  } catch (err) {
    console.warn('Could not read role from public.profiles, checking metadata:', err)
  }

  // Fallback to user metadata
  const metaRole = user.user_metadata?.role
  if (metaRole !== undefined && metaRole !== null) {
    return Number(metaRole)
  }

  // Default role is 1 (citizen)
  return 1
}
