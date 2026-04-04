'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tenant } from '@/lib/supabase/types'

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

export default function TenantDashboardPage() {
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const thisMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    const load = async () => {
      // テナント情報取得
      const tenantRes = await fetch('/api/me/tenant')
      if (tenantRes.status === 401) { router.push('/login'); return }
      if (tenantRes.status === 404) { setError('テナントが見つかりません。管理者にお問い合わせください。'); setLoading(false); return }
      if (!tenantRes.ok) { setError('テナント情報の取得に失敗しました'); setLoading(false); return }

      const { tenant: t } = await tenantRes.json()
      setTenant(t)

      // オンボーディング未完了なら誘導
      if (t.status === 'active' && t.onboarding_completed === false) {
        router.push('/onboarding')
        return
      }

      // KPI取得
      const kpiRes = await fetch(`/api/dashboard/kpi?tenant_id=${t.id}&month=${thisMonth}`)
      if (kpiRes.ok) {
        setKpi(await kpiRes.json())
      }
      setLoading(false)
    }
    load()
  }, [router, thisMonth])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tenant?.company_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI受付ダッシュボード — {thisMonth}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            料金・利用状況
          </Link>
          <Link
            href="/dashboard/calls"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            通話履歴
          </Link>
          <Link href="/api/auth/logout" className="text-gray-500 hover:text-gray-700 text-sm">
            ログアウト
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* 停止中バナー */}
        {tenant?.status === 'suspended' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-red-800 font-semibold">サービスが停止されています</p>
              <p className="text-red-600 text-sm">月額利用上限に達したため受発信が停止されました。</p>
            </div>
            <Link
              href="/dashboard/billing"
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 whitespace-nowrap"
            >
              詳細を確認
            </Link>
          </div>
        )}

        {/* KPIカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: '今月の通話件数',
              value: kpi?.totalCalls ?? 0,
              unit: '件',
              sub: kpi?.growthRate != null
                ? `先月比 ${kpi.growthRate >= 0 ? '+' : ''}${kpi.growthRate}%`
                : undefined,
              color: 'blue',
            },
            {
              label: '解決率',
              value: kpi?.resolutionRate ?? 0,
              unit: '%',
              sub: `${kpi?.resolved ?? 0}件 解決`,
              color: 'green',
            },
            {
              label: 'エスカレーション率',
              value: kpi?.escalationRate ?? 0,
              unit: '%',
              sub: `${kpi?.escalated ?? 0}件`,
              color: kpi && kpi.escalationRate > 20 ? 'orange' : 'gray',
            },
            {
              label: '平均対応時間',
              value: kpi?.avgDurationMin ?? 0,
              unit: '分',
              sub: '1通話あたり',
              color: 'purple',
            },
          ].map(({ label, value, unit, sub, color }) => (
            <div key={label} className="bg-white rounded-xl border p-6">
              <div className={`text-3xl font-bold text-${color}-600`}>
                {value}<span className="text-lg ml-0.5">{unit}</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
              {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>

        {/* 日別件数バーチャート */}
        {kpi && kpi.daily.length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">日別通話件数</h2>
            <div className="flex items-end gap-1 h-32">
              {kpi.daily.map(({ date, count }) => {
                const max = Math.max(...kpi.daily.map(d => d.count), 1)
                const heightPct = Math.max((count / max) * 100, 4)
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{count}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-xs text-gray-400 rotate-45 origin-left whitespace-nowrap">
                      {date.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-8 text-sm text-gray-500 text-right">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* データなし */}
        {kpi && kpi.totalCalls === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📞</div>
            <p>今月の通話データはまだありません</p>
          </div>
        )}

        {/* 設定情報 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">契約情報</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">050番号</dt>
              <dd className="font-mono mt-0.5 text-green-700">{tenant?.phone_number ?? '未発行'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">プラン</dt>
              <dd className="mt-0.5">{tenant?.plan === 'trial' ? 'トライアル' : tenant?.plan}</dd>
            </div>
            <div>
              <dt className="text-gray-500">月額基本料</dt>
              <dd className="mt-0.5">¥{tenant?.monthly_fee.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">分単価</dt>
              <dd className="mt-0.5">¥{tenant?.minute_rate}/分</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
