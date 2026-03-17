'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Tenant } from '@/lib/supabase/types'
import { STATUS_LABELS, STATUS_COLORS, PLAN_LABELS } from '@/lib/supabase/types'

export default function TenantsPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/tenants')
      if (res.status === 401) { router.push('/login'); return }
      if (res.ok) setTenants(await res.json())
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = tenants.filter(t =>
    t.company_name.includes(search) || t.email.includes(search) || (t.phone_number ?? '').includes(search)
  )

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    pending: tenants.filter(t => t.status === 'pending').length,
    provisioning: tenants.filter(t => t.status === 'provisioning').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← ダッシュボード</Link>
          <h1 className="text-xl font-bold text-gray-900">テナント管理</h1>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          新規テナント登録
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* 統計 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '全テナント', value: stats.total, color: 'gray' },
            { label: 'アクティブ', value: stats.active, color: 'green' },
            { label: '未発行', value: stats.pending, color: 'yellow' },
            { label: '発行中', value: stats.provisioning, color: 'blue' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* 検索 */}
        <input
          type="text"
          placeholder="会社名・メール・電話番号で検索"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white"
        />

        {/* テナント一覧 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            {search ? '検索結果がありません' : 'テナントがありません。新規登録してください。'}
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">会社名</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">担当者</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">050番号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">プラン</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">登録日</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{tenant.company_name}</td>
                    <td className="px-4 py-3 text-gray-600">{tenant.contact_person}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">
                      {tenant.phone_number ?? <span className="text-gray-400">未発行</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{PLAN_LABELS[tenant.plan]}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[tenant.status]}`}>
                        {STATUS_LABELS[tenant.status]}
                        {tenant.status === 'provisioning' && (
                          <span className="ml-1 inline-block animate-pulse">●</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
