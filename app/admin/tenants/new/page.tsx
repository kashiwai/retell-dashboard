'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PLANS = [
  { id: 'trial', name: 'トライアル', price: '無料', minuteRate: '¥35/分', description: 'まずお試しで' },
  { id: 'basic', name: 'ベーシック', price: '¥9,800/月', minuteRate: '¥30/分', description: 'LINE通知付き' },
  { id: 'pro', name: 'プロ', price: '¥29,800/月', minuteRate: '¥25/分', description: '全機能 + 優先サポート' },
  { id: 'enterprise', name: 'エンタープライズ', price: '¥98,000/月', minuteRate: '¥20/分', description: '専任サポート付き' },
]

export default function NewTenantPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    plan: 'basic' as string,
    notes: '',
  })

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (res.ok) {
      router.push(`/admin/tenants/${data.id}`)
    } else {
      setError(data.error ?? '登録に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href="/admin/tenants" className="text-gray-500 hover:text-gray-700 text-sm">
          ← テナント一覧
        </Link>
        <h1 className="text-xl font-bold text-gray-900">新規テナント登録</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">基本情報</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={e => update('company_name', e.target.value)}
                placeholder="例：株式会社パックライン"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                担当者名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.contact_person}
                onChange={e => update('contact_person', e.target.value)}
                placeholder="例：山田 太郎"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="例：yamada@packline.co.jp"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">プロビジョニング完了後、このアドレスに招待メールを送信します</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
              <textarea
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                rows={3}
                placeholder="特記事項があれば入力"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* プラン選択 */}
          <div className="bg-white rounded-xl border p-6 space-y-3">
            <h2 className="text-base font-semibold text-gray-900">料金プラン</h2>
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map(plan => (
                <label
                  key={plan.id}
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    form.plan === plan.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={form.plan === plan.id}
                    onChange={e => update('plan', e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold text-gray-900">{plan.name}</span>
                  <span className="text-blue-600 font-bold text-lg mt-1">{plan.price}</span>
                  <span className="text-xs text-gray-500">{plan.minuteRate}</span>
                  <span className="text-xs text-gray-400 mt-1">{plan.description}</span>
                  {form.plan === plan.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <Link
              href="/admin/tenants"
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-center"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '登録中...' : 'テナントを登録'}
            </button>
          </div>
          <p className="text-xs text-center text-gray-500">
            登録後、テナント詳細ページから050番号の自動発行ができます
          </p>
        </form>
      </div>
    </div>
  )
}
