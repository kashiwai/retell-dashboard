'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  monthlyLimit: number | null
  remaining: number | null
  usagePercent: number | null
  status: string
  suspendedAt: string | null
  history: { month: string; totalFee: number; callCount: number }[]
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'トライアル', basic: 'ベーシック', pro: 'プロ', enterprise: 'エンタープライズ',
}

export default function BillingPage() {
  const router = useRouter()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  const thisMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/me/billing?month=${thisMonth}`)
      if (res.status === 401) { router.push('/login'); return }
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    load()
  }, [router, thisMonth])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">データを取得できませんでした</p>
      </div>
    )
  }

  const isSuspended = data.status === 'suspended'
  const usagePct = data.usagePercent ?? 0
  const barColor = usagePct >= 100 ? 'bg-red-500' : usagePct >= 80 ? 'bg-orange-400' : 'bg-blue-500'
  const borderColor = usagePct >= 100 ? 'border-red-200' : usagePct >= 80 ? 'border-orange-200' : 'border-gray-200'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">
          ← ダッシュボード
        </Link>
        <h1 className="text-xl font-bold text-gray-900">ご利用状況・料金</h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* 停止中バナー */}
        {isSuspended && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h2 className="text-red-800 font-semibold text-lg">サービスが停止されています</h2>
            <p className="text-red-600 text-sm mt-1">
              月額ご利用上限を超えたため、受発信が一時停止されました。
              {data.suspendedAt && (
                <span> 停止日時：{new Date(data.suspendedAt).toLocaleString('ja-JP')}</span>
              )}
            </p>
            <p className="text-red-600 text-sm mt-1">
              再開をご希望の場合は、担当者までお問い合わせください。
            </p>
          </div>
        )}

        {/* 今月の利用状況 */}
        <div className={`bg-white rounded-xl border ${borderColor} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">今月の利用状況</h2>
            <span className="text-sm text-gray-500">
              {data.month.replace('-', '年')}月
            </span>
          </div>

          {/* 上限プログレスバー */}
          {data.monthlyLimit != null && (
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-gray-700">
                  ¥{data.totalFee.toLocaleString()}
                  <span className="text-gray-400 font-normal"> / ¥{data.monthlyLimit.toLocaleString()}</span>
                </span>
                <span className={`font-semibold ${usagePct >= 100 ? 'text-red-600' : usagePct >= 80 ? 'text-orange-500' : 'text-gray-600'}`}>
                  {usagePct}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`${barColor} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, usagePct)}%` }}
                />
              </div>
              {usagePct >= 80 && usagePct < 100 && (
                <p className="text-orange-600 text-xs mt-1.5 font-medium">
                  ⚠️ 上限の {usagePct}% に達しています。まもなく自動停止される可能性があります。
                </p>
              )}
              {usagePct >= 100 && (
                <p className="text-red-600 text-xs mt-1.5 font-medium">
                  上限に達しています。受発信が停止されました。
                </p>
              )}
              {data.remaining != null && data.remaining > 0 && (
                <p className="text-gray-500 text-xs mt-1.5">
                  残り ¥{data.remaining.toLocaleString()}（約{Math.floor(data.remaining / data.minuteRate)}分）
                </p>
              )}
            </div>
          )}

          {/* 料金内訳 */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">プラン</span>
              <span className="font-medium">{PLAN_LABELS[data.plan] ?? data.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">月額基本料金</span>
              <span className="font-medium">¥{data.monthlyFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">通話料金（{data.totalMinutes}分 × ¥{data.minuteRate}）</span>
              <span className="font-medium">¥{data.usageFee.toLocaleString()}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-semibold text-base">
              <span>当月合計（税抜）</span>
              <span>¥{data.totalFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>消費税（10%）</span>
              <span>¥{Math.floor(data.totalFee * 0.1).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>当月合計（税込）</span>
              <span>¥{Math.floor(data.totalFee * 1.1).toLocaleString()}</span>
            </div>
          </div>

          {/* 通話件数 */}
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.callCount}</p>
              <p className="text-gray-500 text-xs mt-0.5">今月の通話件数</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.totalMinutes}</p>
              <p className="text-gray-500 text-xs mt-0.5">今月の通話分数</p>
            </div>
          </div>
        </div>

        {/* 過去の利用履歴 */}
        {data.history.length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">過去の利用履歴</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-500">対象月</th>
                  <th className="text-right py-2 font-medium text-gray-500">通話件数</th>
                  <th className="text-right py-2 font-medium text-gray-500">合計金額（税抜）</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.history.map(h => (
                  <tr key={h.month}>
                    <td className="py-3 text-gray-700">{h.month.replace('-', '年')}月</td>
                    <td className="py-3 text-right text-gray-700">{h.callCount}件</td>
                    <td className="py-3 text-right font-medium">¥{h.totalFee.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 契約情報 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-3">ご契約内容</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">プラン</dt>
              <dd className="font-medium">{PLAN_LABELS[data.plan] ?? data.plan}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">月額基本料金</dt>
              <dd className="font-medium">¥{data.monthlyFee.toLocaleString()}/月</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">通話従量料金</dt>
              <dd className="font-medium">¥{data.minuteRate}/分</dd>
            </div>
            {data.monthlyLimit != null && (
              <div className="flex justify-between">
                <dt className="text-gray-500">月額利用上限</dt>
                <dd className="font-medium">¥{data.monthlyLimit.toLocaleString()}/月</dd>
              </div>
            )}
          </dl>
          <p className="text-xs text-gray-400 mt-4">
            ご契約内容の変更は担当者までお問い合わせください。
          </p>
        </div>

      </div>
    </div>
  )
}
