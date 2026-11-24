'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'

function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { plan: 'starter' },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          business_name: data.business_name,
          owner_name: data.owner_name,
        }
      }
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'Registration failed')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authData.user.id,
        business_name: data.business_name,
        owner_name: data.owner_name,
        email: data.email,
        phone: data.phone || '',
        plan: 'starter',
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to create account')
      setLoading(false)
      return
    }

    router.push('/dashboard?welcome=1')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">S</div>
            <span className="text-white text-lg font-bold">SahajVyapar</span>
          </Link>
          <h1 className="text-white text-2xl font-bold mb-2">Start your 7-day free trial</h1>
          <p className="text-slate-400 text-sm">Koi credit card nahi chahiye · Kabhi bhi cancel karein</p>
        </div>

        {/* Registration Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-white font-semibold mb-6">Create your account</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Name *</label>
                <input {...register('business_name')} className="input-base" placeholder="Priya's Handmade" />
                {errors.business_name && <p className="text-red-400 text-xs mt-1">{errors.business_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Name *</label>
                <input {...register('owner_name')} className="input-base" placeholder="Priya Sharma" />
                {errors.owner_name && <p className="text-red-400 text-xs mt-1">{errors.owner_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
              <input {...register('email')} type="email" className="input-base" placeholder="priya@example.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
              <input {...register('phone')} type="tel" className="input-base" placeholder="9876543210" maxLength={10} />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password *</label>
              <input {...register('password')} type="password" className="input-base" placeholder="Min 8 chars, 1 uppercase, 1 number" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Creating account...' : 'Start Free Trial →'}
            </button>

            <p className="text-center text-slate-500 text-xs">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
            </p>
          </form>
        </div>

        <div className="mt-4 flex justify-center gap-4">
          <Link href="/privacy-policy" className="text-slate-600 text-xs hover:text-slate-400">Privacy Policy</Link>
          <Link href="/terms-of-service" className="text-slate-600 text-xs hover:text-slate-400">Terms</Link>
          <Link href="/contact" className="text-slate-600 text-xs hover:text-slate-400">Contact</Link>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>}>
      <RegisterForm />
    </Suspense>
  )
}
