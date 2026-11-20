'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  useEffect(() => {
    // Old admin page removed - use superadmin panel at admin.sahajvyapar.in
    router.replace('/dashboard/settings')
  }, [])
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-slate-400 text-sm">Redirecting...</div>
    </div>
  )
}
