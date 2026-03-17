'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface ReportData {
  month: string
  totalCalls: number
  resolved: number
  escalated: number
  resolutionRate: number
  escalationRate: number
  avgDurationMs: number
  daily: { date: string; count: number }[]
  faultDistribution: { code: string; count: number }[]
}

const FAULT_CODE_LABELS: Record<string, string> = {
  '01': '本体交換',
  '02': 'プリンター交換',
  '03': 'スキャナー交換',
  '04': 'ルーター交換',
  '05': 'その他',
  '06': 'カードリーダー',
  '07': 'プリンター(白)',
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

export default function ReportPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/tenants/${tenantId}/report?month=${month}`)
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    load()
  }, [tenantId, month])

  const avgDurationMin = data ? Math.floor(data.avgDurationMs / 60000) : 0
  const avgDurationSec = data ? Math.floor((data.avgDurationMs % 60000) / 1000) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/admin/tenants/${tenantId}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← テナント詳細
        </Link>
        <h1 className="text-xl font-bold text-gray-900">通話分析レポート</h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">対象月:</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : !data ? (
          <div className="bg-red-50 text-red-700 rounded-xl p-6">データの取得に失敗しました</div>
        ) : (
          <>
            {/* KPIカード */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: '総通話数', value: `${data.totalCalls}件`, color: 'blue' },
                { label: 'AI解決率', value: `${data.resolutionRate}%`, color: 'green' },
                { label: 'エスカレーション率', value: `${data.escalationRate}%`, color: 'orange' },
                { label: '平均通話時間', value: `${avgDurationMin}分${avgDurationSec}秒`, color: 'purple' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`bg-${color}-50 rounded-xl p-4 text-center`}>
                  <div className={`text-2xl font-bold text-${color}-700`}>{value}</div>
                  <div className={`text-xs text-${color}-600 mt-1`}>{label}</div>
                </div>
              ))}
            </div>

            {/* 日次通話数グラフ */}
            {data.daily.length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-base font-semibold mb-4">日次通話数</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.daily}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="通話数" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 障害コード分布 */}
            {data.faultDistribution.length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-base font-semibold mb-4">障害コード分布</h2>
                <div className="flex gap-8 items-center">
                  <ResponsiveContainer width={240} height={240}>
                    <PieChart>
                      <Pie
                        data={data.faultDistribution}
                        dataKey="count"
                        nameKey="code"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                      >
                        {data.faultDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, FAULT_CODE_LABELS[name as string] ?? name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {data.faultDistribution.map((item, i) => (
                      <div key={item.code} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600">{item.code}: {FAULT_CODE_LABELS[item.code] ?? item.code}</span>
                        <span className="font-medium ml-auto">{item.count}件</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {data.totalCalls === 0 && (
              <div className="bg-gray-50 text-gray-500 rounded-xl p-8 text-center">
                {month} の通話データはありません
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
