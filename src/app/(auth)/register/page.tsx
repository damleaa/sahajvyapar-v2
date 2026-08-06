'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '₹399',
    period: '/month',
    desc: 'Home sellers getting started',
    features: ['100 products', 'Sales recording', 'Basic reports', 'Stock alerts'],
    color: 'border-slate-700',
    badge: '',
  },
  {
    id: 'growth' as const,
    name: 'Growth',
    price: '₹699',
    period: '/month',
    desc: 'Active sellers managing customers',
    features: ['500 products', 'GST Invoice + WhatsApp', 'Customer Ledger', 'Suppliers + Purchase Orders', 'Returns & Refunds'],
    color: 'border-blue-500',
    badge: 'Most Popular',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '₹999',
    period: '/month',
    desc: 'Exhibition sellers & serious businesses',
    features: ['Unlimited products', 'Everything in Growth', 'Exhibitions + P&L', 'Full Reports', 'Priority Support'],
    color: 'border-purple-500',
    badge: '',
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultPlan = (searchParams.get('plan') as 'starter' | 'growth' | 'pro') || 'growth'

  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth' | 'pro'>(defaultPlan)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { plan: defaultPlan },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. Create auth user
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

    // 2. Create tenant record via API route
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authData.user.id,
        business_name: data.business_name,
        owner_name: data.owner_name,
        email: data.email,
        phone: data.phone || '',
        plan: selectedPlan,
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
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">S</div>
            <span className="text-white text-lg font-bold">SahajVyapar</span>
          </Link>
          <h1 className="text-white text-2xl font-bold mb-2">Start your 7-day free trial</h1>
          <p className="text-slate-400">Koi credit card nahi chahiye · Kabhi bhi cancel karein</p>
        </div>

        {/* Plan Selection */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                selectedPlan === plan.id ? plan.color + ' bg-slate-900' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300 text-sm font-semibold">{plan.name}</span>
                {selectedPlan === plan.id && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="mb-1">
                <span className="text-white text-2xl font-bold">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <p className="text-slate-500 text-xs mb-3">{plan.desc}</p>
              <ul className="space-y-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Registration Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg mx-auto">
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

            <div className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
              <span className="text-slate-300 text-sm">Selected plan</span>
              <span className="text-white font-semibold text-sm capitalize">{selectedPlan} — {PLANS.find(p => p.id === selectedPlan)?.price}/mo</span>
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
      </div>
    </div>
  )
}
