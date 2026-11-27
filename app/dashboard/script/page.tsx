'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ScriptPage() {
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/script')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || '読み込みに失敗しました')
        setPrompt(d.prompt ?? '')
        setProvider(d.provider ?? null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/script', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '保存に失敗しました')
      setSavedAt(new Date().toLocaleTimeString('ja-JP'))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
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
            { href: '/dashboard/script', label: '台本の編集', icon: '📝', active: true },
            { href: '/dashboard/knowledge-base', label: 'ナレッジベース', icon: '📚' },
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
            <h1 className="text-xl font-bold text-white">台本の編集</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,255,0.8)' }}>
              電話に出るAIの話し方・対応内容をここで編集できます(接続先の会社の画面を開く必要はありません)
            </p>
          </div>
        </div>

        <div className="px-8 py-6 max-w-4xl">
          {loading ? (
            <div className="text-center py-20" style={{ color: 'rgba(240,244,255,0.7)' }}>読み込み中...</div>
          ) : (
            <>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(253,119,131,0.12)', color: '#FD7783', border: '1px solid rgba(253,119,131,0.25)' }}>
                  {error}
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={24}
                className="w-full rounded-2xl p-4 text-sm font-mono leading-relaxed outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,244,255,1.0)' }}
                placeholder="台本(AIの話し方・対応の流れ)をここに書きます"
              />
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#01C9FD,#1FBF75)', color: '#0E1530' }}
                >
                  {saving ? '保存しています...' : '保存して公開する'}
                </button>
                {savedAt && (
                  <span className="text-xs" style={{ color: '#1FBF75' }}>✓ {savedAt} に保存しました</span>
                )}
              </div>
              <p className="text-xs mt-3" style={{ color: 'rgba(240,244,255,0.7)' }}>
                保存すると、次の通話からすぐにこの内容で応答します。
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
