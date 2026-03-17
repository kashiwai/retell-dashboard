'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Call, Tenant } from '@/lib/supabase/types'

export default function TenantCallsPage() {
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Call | null>(null)

  useEffect(() => {
    const load = async () => {
      const tenantRes = await fetch('/api/me/tenant')
      if (tenantRes.status === 401) { router.push('/login'); return }
      if (!tenantRes.ok) { setLoading(false); return }

      const { tenant: t } = await tenantRes.json()
      setTenant(t)

      const callsRes = await fetch(`/api/calls?tenant_id=${t.id}&limit=100`)
      if (callsRes.ok) {
        const data = await callsRes.json()
        setCalls(Array.isArray(data) ? data : (data.calls ?? []))
      }
      setLoading(false)
    }
    load()
  }, [router])

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    const sec = Math.floor(ms / 1000)
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  const statusColor = (status: string | null) => {
    if (status === 'ended') return 'bg-green-100 text-green-700'
    if (status === 'error') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-600'
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
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ダッシュボード
          </Link>
          <h1 className="text-xl font-bold text-gray-900">通話履歴</h1>
          <span className="text-sm text-gray-500">{tenant?.company_name}</span>
        </div>
        <span className="text-sm text-gray-500">{calls.length}件</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {calls.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📞</div>
            <p>通話履歴がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">日時</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">発信番号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">通話時間</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">解決状況</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">故障コード</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {calls.map(call => (
                  <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600">
                      {call.start_timestamp
                        ? new Date(call.start_timestamp).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : new Date(call.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{call.from_number ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDuration(call.duration_ms)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(call.status)}`}>
                        {call.status ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{call.resolution_status ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{call.fault_code ?? '-'}</td>
                    <td className="px-4 py-3">
                      {call.summary && (
                        <button
                          onClick={() => setSelected(selected?.id === call.id ? null : call)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          要約
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 要約パネル */}
        {selected?.summary && (
          <div className="mt-4 bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">通話要約</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}
