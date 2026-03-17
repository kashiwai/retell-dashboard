import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ tenantId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  const admin = createAdminClient()
  const startOfMonth = new Date(`${month}-01T00:00:00Z`)
  const endOfMonth = new Date(startOfMonth)
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)

  const { data: calls } = await admin
    .from('calls').select('*').eq('tenant_id', tenantId)
    .gte('created_at', startOfMonth.toISOString())
    .lt('created_at', endOfMonth.toISOString())
    .order('created_at', { ascending: true })

  const callList = calls ?? []
  const totalCalls = callList.length
  const resolved = callList.filter(c => c.resolution_status === '解決済み').length
  const escalated = callList.filter(c => c.resolution_status === 'エスカレーション').length
  const totalMs = callList.reduce((sum, c) => sum + (c.duration_ms ?? 0), 0)
  const avgDurationMs = totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0

  const dailyMap: Record<string, number> = {}
  for (const call of callList) {
    const day = call.created_at.slice(0, 10)
    dailyMap[day] = (dailyMap[day] ?? 0) + 1
  }
  const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }))

  const faultMap: Record<string, number> = {}
  for (const call of callList) {
    if (call.fault_code) {
      faultMap[call.fault_code] = (faultMap[call.fault_code] ?? 0) + 1
    }
  }

  return NextResponse.json({
    month,
    totalCalls,
    resolved,
    escalated,
    resolutionRate: totalCalls > 0 ? Math.round((resolved / totalCalls) * 100) : 0,
    escalationRate: totalCalls > 0 ? Math.round((escalated / totalCalls) * 100) : 0,
    avgDurationMs,
    daily,
    faultDistribution: Object.entries(faultMap).map(([code, count]) => ({ code, count })),
  })
}
