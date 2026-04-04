import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // ログインユーザーのテナントを取得
  const { data: tenantUser } = await admin
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!tenantUser) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, company_name, plan, monthly_fee, minute_rate, monthly_limit, status, suspended_at, billing_start_date')
    .eq('id', tenantUser.tenant_id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  const startOfMonth = new Date(`${month}-01T00:00:00Z`)
  const endOfMonth = new Date(startOfMonth)
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)

  const { data: calls } = await admin
    .from('calls')
    .select('duration_ms, created_at, status')
    .eq('tenant_id', tenant.id)
    .gte('created_at', startOfMonth.toISOString())
    .lt('created_at', endOfMonth.toISOString())

  const callList = calls ?? []
  const totalMs = callList.reduce((sum, c) => sum + (c.duration_ms ?? 0), 0)
  const totalMinutes = Math.ceil(totalMs / 60000)
  const callCount = callList.length
  const usageFee = totalMinutes * tenant.minute_rate
  const totalFee = tenant.monthly_fee + usageFee
  const monthlyLimit: number | null = tenant.monthly_limit ?? null
  const remaining = monthlyLimit != null ? Math.max(0, monthlyLimit - totalFee) : null
  const usagePercent = monthlyLimit != null && monthlyLimit > 0
    ? Math.min(100, Math.round((totalFee / monthlyLimit) * 100))
    : null

  // 過去3ヶ月の履歴
  const history: { month: string; totalFee: number; callCount: number }[] = []
  for (let i = 1; i <= 3; i++) {
    const hStart = new Date(startOfMonth)
    hStart.setMonth(hStart.getMonth() - i)
    const hEnd = new Date(hStart)
    hEnd.setMonth(hEnd.getMonth() + 1)
    const hMonth = hStart.toISOString().slice(0, 7)

    const { data: hCalls } = await admin
      .from('calls')
      .select('duration_ms')
      .eq('tenant_id', tenant.id)
      .gte('created_at', hStart.toISOString())
      .lt('created_at', hEnd.toISOString())

    const hMs = (hCalls ?? []).reduce((s, c) => s + (c.duration_ms ?? 0), 0)
    const hMin = Math.ceil(hMs / 60000)
    history.push({
      month: hMonth,
      totalFee: tenant.monthly_fee + hMin * tenant.minute_rate,
      callCount: (hCalls ?? []).length,
    })
  }

  return NextResponse.json({
    month,
    callCount,
    totalMinutes,
    monthlyFee: tenant.monthly_fee,
    usageFee,
    totalFee,
    minuteRate: tenant.minute_rate,
    plan: tenant.plan,
    monthlyLimit,
    remaining,
    usagePercent,
    status: tenant.status,
    suspendedAt: tenant.suspended_at ?? null,
    history: history.reverse(),
  })
}
