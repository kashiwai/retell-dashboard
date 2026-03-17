'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface BillingData {
  month: string
  callCount: number
  totalMinutes: number
  monthlyFee: number
  usageFee: number
  totalFee: number
  minuteRate: number
  plan: string
  companyName: string
}

export default function BillingPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [data, setData] = useState<BillingData | null>(null)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/tenants/${tenantId}/billing?month=${month}`)
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    load()
  }, [tenantId, month])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/admin/tenants/${tenantId}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← テナント詳細
        </Link>
        <h1 className="text-xl font-bold text-gray-900">請求・利用料金</h1>
        {data && <span className="text-gray-500 text-sm">{data.companyName}</span>}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* 月選択 */}
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
            {/* 請求サマリー */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-6">{month} 請求サマリー</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{data.callCount}</div>
                  <div className="text-sm text-blue-600 mt-1">通話件数</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-purple-700">{data.totalMinutes}</div>
                  <div className="text-sm text-purple-600 mt-1">合計分数</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">¥{data.totalFee.toLocaleString()}</div>
                  <div className="text-sm text-green-600 mt-1">請求合計</div>
                </div>
              </div>

              {/* 内訳 */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700">料金内訳</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">月額基本料金（{data.plan}）</span>
                  <span className="font-medium">¥{data.monthlyFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">通話料金（{data.totalMinutes}分 × ¥{data.minuteRate}/分）</span>
                  <span className="font-medium">¥{data.usageFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-3">
                  <span>合計（税抜）</span>
                  <span className="text-green-700">¥{data.totalFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>消費税（10%）</span>
                  <span>¥{Math.round(data.totalFee * 0.1).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-blue-700 border-t pt-3">
                  <span>合計（税込）</span>
                  <span>¥{Math.round(data.totalFee * 1.1).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
