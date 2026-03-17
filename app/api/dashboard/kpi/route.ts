import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// テナント別KPI集計
// GET /api/dashboard/kpi?tenant_id=xxx&month=YYYY-MM
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id は必須です' }, { status: 400 })
  }

  const admin = createAdminClient()
  const startOfMonth = new Date(`${month}-01T00:00:00Z`)
  const endOfMonth = new Date(startOfMonth)
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)

  const { data: calls, error } = await admin
    .from('calls')
    .select('duration_ms, resolution_status, fault_code, created_at, sentiment')
    .eq('tenant_id', tenantId)
    .gte('created_at', startOfMonth.toISOString())
    .lt('created_at', endOfMonth.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const callList = calls ?? []
  const totalCalls = callList.length
  const resolved = callList.filter(c => c.resolution_status === '解決済み').length
  const escalated = callList.filter(c => c.resolution_status === 'エスカレーション').length
  const totalMs = callList.reduce((sum, c) => sum + (c.duration_ms ?? 0), 0)
  const avgDurationMs = totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0

  // 故障コード分布
  const faultMap: Record<string, number> = {}
  for (const call of callList) {
    if (call.fault_code) {
      faultMap[call.fault_code] = (faultMap[call.fault_code] ?? 0) + 1
    }
  }

  // 日別件数（直近7日）
  const dailyMap: Record<string, number> = {}
  for (const call of callList) {
    const day = call.created_at.slice(0, 10)
    dailyMap[day] = (dailyMap[day] ?? 0) + 1
  }

  // 先月比（先月データも取得）
  const prevStart = new Date(startOfMonth)
  prevStart.setMonth(prevStart.getMonth() - 1)
  const { data: prevCalls } = await admin
    .from('calls')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', startOfMonth.toISOString())

  const prevTotal = prevCalls?.length ?? 0
  const growthRate = prevTotal > 0
    ? Math.round(((totalCalls - prevTotal) / prevTotal) * 100)
    : null

  return NextResponse.json({
    month,
    totalCalls,
    resolved,
    escalated,
    resolutionRate: totalCalls > 0 ? Math.round((resolved / totalCalls) * 100) : 0,
    escalationRate: totalCalls > 0 ? Math.round((escalated / totalCalls) * 100) : 0,
    avgDurationMs,
    avgDurationMin: Math.round(avgDurationMs / 60000 * 10) / 10,
    growthRate,
    faultDistribution: Object.entries(faultMap)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count),
    daily: Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  })
}
