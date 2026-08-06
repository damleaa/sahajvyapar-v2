import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, business_name, owner_name, email, phone, plan } = body

    if (!user_id || !business_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        owner_id: user_id,
        business_name,
        owner_name,
        email,
        phone: phone || null,
        plan: plan || 'starter',
        plan_status: 'trial',
        plan_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
    }

    // Create default categories
    const defaultCategories = ['General', 'Products', 'Accessories']
    await supabase.from('categories').insert(
      defaultCategories.map(name => ({ tenant_id: tenant.id, name }))
    )

    // Create empty business profile
    await supabase.from('business_profiles').insert({
      tenant_id: tenant.id,
      invoice_prefix: 'INV',
      financial_year: '2025-26',
      state: 'Maharashtra',
    })

    return NextResponse.json({ success: true, tenant_id: tenant.id })
  } catch (err) {
    console.error('Register API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
