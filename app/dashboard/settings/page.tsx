'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface TenantInfo {
  company_name?: string
  contact_person?: string
  email?: string
  phone_number?: string
  plan?: string
  voice_provider?: string
  status?: string
}

const PROVIDER_LABEL: Record<string, string> = {
  retell: 'Retell AI',
  fish_audio: 'Fish Audio',
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSavedAt, setPwSavedAt] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me/tenant')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setTenant(d.tenant ?? null)
          setRole(d.role ?? null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleChangePassword = async () => {
    setPwError(null)
    if (newPassword.length < 8) {
      setPwError('パスワードは8文字以上にしてください')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('確認用のパスワードが一致しません')
      return
    }
    setPwSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPwSavedAt(new Date().toLocaleTimeString('ja-JP'))
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      setPwError(e.message ?? 'パスワードの変更に失敗しました')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0E1530' }}>
      <aside className="hidden w-52 shrink-0 sm:flex flex-col" style={{ background: 'linear-gradient(180deg,#111a3e,#0a1228)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 pt-5 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: 'linear-gradient(135deg,#01C9FD,#FD7783)', color: '#0E1530' }}>M</div>
            <span className="font-bold text-sm" style={{ background: 'linear-gradient(135deg,#01C9FD,#FD7783)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MIKATA</span>
          </Link>
        </div>
        <nav className="flex-1 px-2 flex flex-col gap-0.5">
          {[
            { href: '/dashboard', label: 'ライブモニタリング', icon: '📊' },
            { href: '/dashboard/calls', label: '通話履歴', icon: '📞' },
            { href: '/dashboard/analytics', label: '分析レポート', icon: '📈' },
            { href: '/dashboard/agents', label: 'AIエージェント', icon: '🤖' },
            { href: '/dashboard/script', label: '台本の編集', icon: '📝' },
            { href: '/dashboard/knowledge-base', label: 'ナレッジベース', icon: '📚' },
            { href: '/dashboard/settings', label: '設定', icon: '⚙', active: true },
          ].map((n) => (
            <Link key={n.label} href={n.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={(n as any).active ? { background: 'rgba(1,201,253,0.12)', border: '1px solid rgba(1,201,253,0.25)', color: '#01C9FD', fontWeight: 600 } : { border: '1px solid transparent', color: 'rgba(240,244,255,0.95)' }}>
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div>
            <h1 className="text-xl font-bold text-white">設定</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,255,0.8)' }}>会社情報の確認とログインパスワードの変更ができます</p>
          </div>
        </div>

        <div className="px-8 py-6 max-w-2xl space-y-6">
          {loading ? (
            <div className="text-center py-20" style={{ color: 'rgba(240,244,255,0.7)' }}>読み込み中...</div>
          ) : (
            <>
              <section className="p-5 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-sm font-bold text-white mb-4">会社情報</h2>
                {tenant ? (
                  <dl className="grid grid-cols-2 gap-y-3 text-sm">
                    <dt style={{ color: 'rgba(240,244,255,0.7)' }}>会社名</dt>
                    <dd className="text-white">{tenant.company_name || '—'}</dd>
                    <dt style={{ color: 'rgba(240,244,255,0.7)' }}>ご担当者</dt>
                    <dd className="text-white">{tenant.contact_person || '—'}</dd>
                    <dt style={{ color: 'rgba(240,244,255,0.7)' }}>メールアドレス</dt>
                    <dd className="text-white">{tenant.email || '—'}</dd>
                    <dt style={{ color: 'rgba(240,244,255,0.7)' }}>電話番号</dt>
                    <dd className="text-white">{tenant.phone_number || '—'}</dd>
                    <dt style={{ color: 'rgba(240,244,255,0.7)' }}>利用サービス</dt>
                    <dd className="text-white">{PROVIDER_LABEL[tenant.voice_provider ?? ''] ?? (tenant.voice_provider || '—')}</dd>
                    <dt style={{ color: 'rgba(240,244,255,0.7)' }}>プラン</dt>
                    <dd className="text-white">{tenant.plan || '—'}</dd>
                    <dt style={{ color: 'rgba(240,244,255,0.7)' }}>権限</dt>
                    <dd className="text-white">{role || '—'}</dd>
                  </dl>
                ) : (
                  <p className="text-sm" style={{ color: 'rgba(240,244,255,0.7)' }}>会社情報が見つかりませんでした</p>
                )}
                <p className="text-xs mt-4" style={{ color: 'rgba(240,244,255,0.6)' }}>
                  会社名・電話番号などの変更が必要な場合はお問い合わせください。
                </p>
              </section>

              <section className="p-5 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-sm font-bold text-white mb-4">パスワードの変更</h2>
                {pwError && (
                  <div className="mb-3 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(253,119,131,0.12)', color: '#FD7783', border: '1px solid rgba(253,119,131,0.25)' }}>
                    {pwError}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'rgba(240,244,255,0.75)' }}>新しいパスワード(8文字以上)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      placeholder="新しいパスワードを入力"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'rgba(240,244,255,0.75)' }}>新しいパスワード(確認)</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      placeholder="もう一度入力してください"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleChangePassword}
                      disabled={pwSaving || !newPassword}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#01C9FD,#1FBF75)', color: '#0E1530' }}
                    >
                      {pwSaving ? '変更しています...' : 'パスワードを変更する'}
                    </button>
                    {pwSavedAt && (
                      <span className="text-xs" style={{ color: '#1FBF75' }}>✓ {pwSavedAt} に変更しました</span>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
