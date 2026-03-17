import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ tenantId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants').select('*').eq('id', tenantId).single()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const startOfMonth = new Date(`${month}-01T00:00:00Z`)
  const endOfMonth = new Date(startOfMonth)
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)

  const { data: calls } = await admin
    .from('calls')
    .select('duration_ms, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', startOfMonth.toISOString())
    .lt('created_at', endOfMonth.toISOString())

  const callList = calls ?? []
  const totalMs = callList.reduce((sum, c) => sum + (c.duration_ms ?? 0), 0)
  const totalMinutes = Math.ceil(totalMs / 60000)
  const callCount = callList.length
  const usageFee = totalMinutes * tenant.minute_rate
  const totalFee = tenant.monthly_fee + usageFee

  return NextResponse.json({
    month,
    callCount,
    totalMinutes,
    monthlyFee: tenant.monthly_fee,
    usageFee,
    totalFee,
    minuteRate: tenant.minute_rate,
    plan: tenant.plan,
    companyName: tenant.company_name,
  })
}
