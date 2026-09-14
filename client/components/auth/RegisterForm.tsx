'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { sanitizeDate } from '@/types/profile'
import {
  User,
  Phone,
  Mail,
  Lock,
  Calendar,
  Eye,
  EyeOff,
  ShieldAlert,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

export function RegisterForm() {
  const router = useRouter()
  const [completeName, setCompleteName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    if (!phoneNumber.trim()) {
      setErrorMessage('Please provide your active phone number.')
      return
    }

    if (!gender) {
      setErrorMessage('Please select your gender.')
      return
    }

    if (!dateOfBirth) {
      setErrorMessage('Please provide your date of birth.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const DEFAULT_ROLE = 1 // All users automatically register as Citizen (Role 1). Admin assigns Responder (Role 2) or Admin (Role 0)

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: completeName.trim(),
            phone_number: phoneNumber.trim(),
            gender,
            date_of_birth: dateOfBirth,
            role: DEFAULT_ROLE,
          },
        },
      })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      // Sync to public.profiles table if user created
      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: completeName.trim(),
            phone_number: phoneNumber.trim(),
            gender,
            date_of_birth: sanitizeDate(dateOfBirth),
            role: DEFAULT_ROLE,
          })
        } catch {
          // If profile upsert fails or table not ready, auth user_metadata still holds details
        }
      }

      // If email confirmation is disabled, auto sign in if no session yet
      if (!data.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInErr) {
          setSuccessMessage('Registration successful! Redirecting to login...')
          setTimeout(() => router.push('/login'), 1500)
          return
        }
      }

      setSuccessMessage('Registration successful! Directing to citizen dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 800)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 sm:p-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-zinc-900">Create your account</h2>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Register as a citizen with MDRRMO Tarragona.
        </p>
      </div>

      {/* Error feedback */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs sm:text-sm font-medium leading-tight">{errorMessage}</div>
        </div>
      )}

      {/* Success feedback */}
      {successMessage && (
        <div
          role="status"
          className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-xs sm:text-sm font-medium leading-tight">{successMessage}</div>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-3.5">
        {/* Complete Name */}
        <div>
          <label
            htmlFor="completeName"
            className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-1"
          >
            Complete Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="completeName"
              type="text"
              required
              value={completeName}
              onChange={(e) => setCompleteName(e.target.value)}
              placeholder="Juan Dela Cruz"
              className="w-full pl-10 pr-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-1"
          >
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              id="phoneNumber"
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0912 345 6789"
              className="w-full pl-10 pr-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>
        </div>

        {/* Gender & Date of Birth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="gender"
              className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-1"
            >
              Gender
            </label>
            <select
              id="gender"
              required
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            >
              <option value="" disabled>
                Select Gender
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other / Prefer not to say</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="dob"
              className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-1"
            >
              Date of Birth
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <input
                id="dob"
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-1"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@example.com"
              className="w-full pl-10 pr-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full pl-10 pr-10 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-1"
          >
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full pl-10 pr-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Link to Login */}
      <div className="mt-5 pt-4 border-t border-zinc-100 text-center">
        <p className="text-xs sm:text-sm text-zinc-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  )
}
