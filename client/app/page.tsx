'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getUserRole } from '@/lib/role'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const role = await getUserRole(supabase, session.user)
        if (role === 0) {
          router.replace('/admin')
        } else if (role === 2) {
          router.replace('/responder')
        } else {
          router.replace('/dashboard')
        }
      } else {
        router.replace('/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <p className="text-sm text-zinc-500 font-medium">Connecting to ResQTrack...</p>
      </div>
    </div>
  )
}
