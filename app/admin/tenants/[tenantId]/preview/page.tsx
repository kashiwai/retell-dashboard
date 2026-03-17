'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tenant, Call } from '@/lib/supabase/types'

interface KPI {
  month: string
  totalCalls: number
  resolved: number
  escalated: number
  resolutionRate: number
  escalationRate: number
  avgDurationMin: number
  growthRate: number | null
  faultDistribution: { code: string; count: number }[]
  daily: { date: string; count: number }[]
}

export default function TenantPreviewPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  const thisMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    const load = async () => {
      const tenantRes = await fetch(`/api/admin/tenants/${tenantId}`)
      if (tenantRes.status === 401) { router.push('/login'); return }
      if (!tenantRes.ok) { setLoading(false); return }

      const t: Tenant = await tenantRes.json()
      setTenant(t)

      const [kpiRes, callsRes] = await Promise.all([
        fetch(`/api/dashboard/kpi?tenant_id=${tenantId}&month=${thisMonth}`),
        fetch(`/api/calls?tenant_id=${tenantId}&limit=20`),
      ])

      if (kpiRes.ok) setKpi(await kpiRes.json())
      if (callsRes.ok) {
        const data = await callsRes.json()
        setCalls(Array.isArray(data) ? data : (data.calls ?? []))
      }
      setLoading(false)
    }
    load()
  }, [tenantId, router, thisMonth])

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    const sec = Math.floor(ms / 1000)
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/tenants/${tenantId}`}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← テナント詳細
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{tenant?.company_name}</h1>
            <p className="text-xs text-gray-400">ダッシュボードプレビュー（superadmin）</p>
          </div>
        </div>
        <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
          管理者プレビュー
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* KPIカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: '今月の通話件数',
              value: `${kpi?.totalCalls ?? 0}件`,
              sub: kpi?.growthRate != null ? `先月比 ${kpi.growthRate >= 0 ? '+' : ''}${kpi.growthRate}%` : undefined,
              color: 'blue',
            },
            {
              label: '解決率',
              value: `${kpi?.resolutionRate ?? 0}%`,
              sub: `${kpi?.resolved ?? 0}件 解決`,
              color: 'green',
            },
            {
              label: 'エスカレーション率',
              value: `${kpi?.escalationRate ?? 0}%`,
              sub: `${kpi?.escalated ?? 0}件`,
              color: kpi && kpi.escalationRate > 20 ? 'orange' : 'gray',
            },
            {
              label: '平均対応時間',
              value: `${kpi?.avgDurationMin ?? 0}分`,
              sub: '1通話あたり',
              color: 'purple',
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-white rounded-xl border p-6">
              <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
              {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>

        {/* 故障コード分布 */}
        {kpi && kpi.faultDistribution.length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">故障コード分布</h2>
            <div className="space-y-3">
              {kpi.faultDistribution.slice(0, 8).map(({ code, count }) => {
                const maxCount = kpi.faultDistribution[0].count
                const pct = Math.round((count / maxCount) * 100)
                return (
                  <div key={code} className="flex items-center gap-3">
                    <div className="w-28 text-sm text-gray-600 truncate">{code}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-8 text-sm text-gray-500 text-right">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 直近通話履歴 */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">直近の通話（最新20件）</h2>
          </div>
          {calls.length === 0 ? (
            <div className="p-8 text-center text-gray-400">通話データなし</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">日時</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">発信番号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">通話時間</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">解決状況</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">故障コード</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {calls.map(call => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {call.start_timestamp
                        ? new Date(call.start_timestamp).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : new Date(call.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{call.from_number ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDuration(call.duration_ms)}</td>
                    <td className="px-4 py-3 text-gray-600">{call.resolution_status ?? '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{call.fault_code ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
