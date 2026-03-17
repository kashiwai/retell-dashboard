'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tenant } from '@/lib/supabase/types'
import { STATUS_LABELS, STATUS_COLORS, PLAN_LABELS } from '@/lib/supabase/types'

interface TenantUserItem {
  id: string
  user_id: string
  role: string
  email: string
  confirmed: boolean
  last_sign_in: string | null
  created_at: string
}

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [existingPhone, setExistingPhone] = useState('')

  // LINE設定
  const [lineToken, setLineToken] = useState('')
  const [lineUserId, setLineUserId] = useState('')
  const [lineSecret, setLineSecret] = useState('')

  // ユーザー管理
  const [users, setUsers] = useState<TenantUserItem[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  const fetchTenant = useCallback(async () => {
    const res = await fetch(`/api/admin/tenants/${tenantId}`)
    if (res.ok) {
      const data: Tenant = await res.json()
      setTenant(data)
      setLineToken(data.line_access_token ?? '')
      setLineUserId(data.line_user_id ?? '')
      setLineSecret(data.line_channel_secret ?? '')
    }
    setLoading(false)
  }, [tenantId])

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`/api/admin/tenants/${tenantId}/users`)
    if (res.ok) setUsers(await res.json())
  }, [tenantId])

  useEffect(() => {
    fetchTenant()
    fetchUsers()
  }, [fetchTenant, fetchUsers])

  // provisioningステータスをポーリング
  useEffect(() => {
    if (tenant?.status !== 'provisioning') return
    const timer = setInterval(fetchTenant, 5000)
    return () => clearInterval(timer)
  }, [tenant?.status, fetchTenant])

  const handleProvision = async (useExisting: boolean) => {
    setProvisioning(true)
    setProvisionError(null)
    const body = useExisting && existingPhone
      ? { existing_phone_number: existingPhone }
      : {}
    const res = await fetch(`/api/admin/tenants/${tenantId}/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      await fetchTenant()
    } else {
      setProvisionError(data.error ?? 'プロビジョニングに失敗しました')
    }
    setProvisioning(false)
  }

  const handleSaveLine = async () => {
    setSaving(true)
    const res = await fetch(`/api/admin/tenants/${tenantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        line_access_token: lineToken,
        line_user_id: lineUserId,
        line_channel_secret: lineSecret,
        features: { ...tenant?.features, lineNotification: !!lineToken && !!lineUserId },
      }),
    })
    if (res.ok) {
      setSaveMsg('保存しました')
      await fetchTenant()
    } else {
      setSaveMsg('保存に失敗しました')
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleInviteUser = async () => {
    if (!inviteEmail) return
    setInviting(true)
    setInviteMsg('')
    const res = await fetch(`/api/admin/tenants/${tenantId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: 'owner' }),
    })
    if (res.ok) {
      setInviteMsg('招待メールを送信しました')
      setInviteEmail('')
      await fetchUsers()
    } else {
      const data = await res.json()
      setInviteMsg(data.error ?? '招待に失敗しました')
    }
    setInviting(false)
    setTimeout(() => setInviteMsg(''), 5000)
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('このユーザーのアクセスを削除しますか？')) return
    await fetch(`/api/admin/tenants/${tenantId}/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    await fetchUsers()
  }

  const handleDeleteTenant = async () => {
    if (!confirm(`「${tenant?.company_name}」を削除しますか？この操作は取り消せません。`)) return
    await fetch(`/api/admin/tenants/${tenantId}`, { method: 'DELETE' })
    router.push('/admin/tenants')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">テナントが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/tenants" className="text-gray-500 hover:text-gray-700 text-sm">
            ← テナント一覧
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{tenant.company_name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[tenant.status]}`}>
            {STATUS_LABELS[tenant.status]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/tenants/${tenantId}/preview`}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 font-medium"
          >
            ダッシュボードをプレビュー
          </Link>
          <button
            onClick={handleDeleteTenant}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            削除
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 基本情報 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">会社名</dt>
              <dd className="font-medium mt-0.5">{tenant.company_name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">担当者</dt>
              <dd className="font-medium mt-0.5">{tenant.contact_person}</dd>
            </div>
            <div>
              <dt className="text-gray-500">メール</dt>
              <dd className="font-medium mt-0.5">{tenant.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">プラン</dt>
              <dd className="font-medium mt-0.5">{PLAN_LABELS[tenant.plan]}</dd>
            </div>
            <div>
              <dt className="text-gray-500">月額</dt>
              <dd className="font-medium mt-0.5">¥{tenant.monthly_fee.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">分単価</dt>
              <dd className="font-medium mt-0.5">¥{tenant.minute_rate}/分</dd>
            </div>
            {tenant.billing_start_date && (
              <div>
                <dt className="text-gray-500">サービス開始</dt>
                <dd className="font-medium mt-0.5">{new Date(tenant.billing_start_date).toLocaleDateString('ja-JP')}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">登録日</dt>
              <dd className="font-medium mt-0.5">{new Date(tenant.created_at).toLocaleDateString('ja-JP')}</dd>
            </div>
          </dl>
        </div>

        {/* 050番号・エージェント */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">AI電話設定</h2>

          {tenant.status === 'active' ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">050番号</dt>
                <dd className="font-mono font-medium mt-0.5 text-green-600">{tenant.phone_number ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">エージェントID</dt>
                <dd className="font-mono text-xs mt-0.5 text-gray-600 break-all">{tenant.agent_id ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">LLM ID</dt>
                <dd className="font-mono text-xs mt-0.5 text-gray-600 break-all">{tenant.llm_id ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">SIP Trunk SID</dt>
                <dd className="font-mono text-xs mt-0.5 text-gray-600 break-all">{tenant.trunk_sid ?? '-'}</dd>
              </div>
              {tenant.llm_id && (
                <div className="col-span-2">
                  <Link
                    href={`/admin/tenants/${tenantId}/prompt`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                  >
                    AIプロンプトを編集
                  </Link>
                </div>
              )}
            </dl>
          ) : tenant.status === 'provisioning' ? (
            <div className="flex items-center gap-3 text-yellow-700 bg-yellow-50 rounded-lg p-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600" />
              <span>050番号を発行中です... 自動更新しています</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">050番号の発行と、Retell AIエージェントの自動作成を行います。</p>

              {/* 既存番号を使う場合 */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">既存の購入済み番号を使う場合</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="例: +815017941185"
                    value={existingPhone}
                    onChange={e => setExistingPhone(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                  />
                  <button
                    onClick={() => handleProvision(true)}
                    disabled={!existingPhone || provisioning}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {provisioning ? '発行中...' : '既存番号で発行'}
                  </button>
                </div>
              </div>

              {/* 新規購入 */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t" />
                <span className="text-xs text-gray-400">または</span>
                <div className="flex-1 border-t" />
              </div>
              <button
                onClick={() => handleProvision(false)}
                disabled={provisioning}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {provisioning ? '発行中...' : '新規050番号を自動購入して発行'}
              </button>

              {provisionError && (
                <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  {provisionError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* LINE通知設定 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">LINE通知設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LINE Channel Access Token
              </label>
              <input
                type="text"
                value={lineToken}
                onChange={e => setLineToken(e.target.value)}
                placeholder="KCRF1FAH57a1..."
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LINE User ID（通知送信先）
              </label>
              <input
                type="text"
                value={lineUserId}
                onChange={e => setLineUserId(e.target.value)}
                placeholder="U1234567890abcdef..."
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LINE Channel Secret
              </label>
              <input
                type="text"
                value={lineSecret}
                onChange={e => setLineSecret(e.target.value)}
                placeholder="806e26f795ca..."
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveLine}
                disabled={saving}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : 'LINE設定を保存'}
              </button>
              {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
            </div>
          </div>
        </div>

        {/* ユーザー管理 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">ユーザー管理</h2>

          {/* 招待フォーム */}
          <div className="flex gap-3 mb-4">
            <input
              type="email"
              placeholder="招待するメールアドレス"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInviteUser()}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleInviteUser}
              disabled={!inviteEmail || inviting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {inviting ? '送信中...' : '招待を送信'}
            </button>
          </div>
          {inviteMsg && (
            <p className={`text-sm mb-4 ${inviteMsg.includes('失敗') || inviteMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {inviteMsg}
            </p>
          )}

          {/* ユーザー一覧 */}
          {users.length === 0 ? (
            <p className="text-sm text-gray-400">まだユーザーがいません。上のフォームから招待してください。</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">メールアドレス</th>
                  <th className="text-left py-2 font-medium text-gray-600">役割</th>
                  <th className="text-left py-2 font-medium text-gray-600">ステータス</th>
                  <th className="text-left py-2 font-medium text-gray-600">最終ログイン</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="py-2.5 text-gray-800">{u.email}</td>
                    <td className="py-2.5 text-gray-600">{u.role}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {u.confirmed ? '確認済み' : '招待中'}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400 text-xs">
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleRemoveUser(u.user_id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 請求・レポートリンク */}
        {tenant.status === 'active' && (
          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/admin/tenants/${tenantId}/billing`}
              className="bg-white rounded-xl border p-6 hover:border-blue-300 transition-colors"
            >
              <div className="text-2xl mb-2">💰</div>
              <div className="font-semibold">請求・利用料金</div>
              <div className="text-sm text-gray-500 mt-1">月次請求額・通話分数を確認</div>
            </Link>
            <Link
              href={`/admin/tenants/${tenantId}/report`}
              className="bg-white rounded-xl border p-6 hover:border-blue-300 transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold">通話分析レポート</div>
              <div className="text-sm text-gray-500 mt-1">月次サマリー・エスカレーション率</div>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
