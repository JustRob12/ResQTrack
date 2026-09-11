'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getUserRole } from '@/lib/role'
import { AuthHeader } from '@/components/auth/AuthHeader'
import { LoginForm } from '@/components/auth/LoginForm'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        const role = await getUserRole(supabase, session.user)
        if (role === 0) {
          router.replace('/admin')
        } else {
          router.replace('/dashboard')
        }
      } else {
        setCheckingAuth(false)
      }
    }
    checkUser()
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <p className="text-sm text-zinc-500 font-medium">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 text-zinc-900 px-4 py-8 sm:px-6 lg:px-8">
      <AuthHeader />

      <main className="w-full max-w-md mx-auto my-auto">
        <LoginForm />
      </main>

      <footer className="w-full max-w-md mx-auto text-center py-4">
        <p className="text-[11px] text-zinc-400">
          ResQTrack &bull; Municipal Disaster Risk Reduction &amp; Management Office &bull; Tarragona
        </p>
      </footer>
    </div>
  )
}
