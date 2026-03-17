import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ tenantId: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants').select('*').eq('id', tenantId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const body = await req.json()
  const admin = createAdminClient()

  const allowed = [
    'company_name', 'contact_person', 'email', 'status', 'plan',
    'notes', 'primary_color', 'features',
    'line_access_token', 'line_user_id', 'line_channel_secret',
    'monthly_fee', 'minute_rate',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await admin
    .from('tenants').update(updates).eq('id', tenantId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('tenants').delete().eq('id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
