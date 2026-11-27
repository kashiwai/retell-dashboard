'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ScriptTemplateSummary {
  id: string
  name: string
  category: string
  description: string
  prompt: string
}

export default function ScriptPage() {
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ScriptTemplateSummary[]>([])
  const [showTemplates, setShowTemplates] = useState(false)

  const [transferSupported, setTransferSupported] = useState(true)
  const [transferEnabled, setTransferEnabled] = useState(false)
  const [transferNumber, setTransferNumber] = useState('')
  const [transferCondition, setTransferCondition] = useState('')
  const [transferLoading, setTransferLoading] = useState(true)
  const [transferSaving, setTransferSaving] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSavedAt, setTransferSavedAt] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/script')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || '読み込みに失敗しました')
        setPrompt(d.prompt ?? '')
        setProvider(d.provider ?? null)
        setCompanyName(d.companyName ?? '')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

    fetch('/api/dashboard/script-templates')
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {})

    fetch('/api/dashboard/transfer-settings')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || '読み込みに失敗しました')
        setTransferSupported(d.supported !== false)
        setTransferEnabled(!!d.enabled)
        setTransferNumber(d.phoneNumber ?? '')
        setTransferCondition(d.condition ?? '')
      })
      .catch((e) => setTransferError(e.message))
      .finally(() => setTransferLoading(false))
  }, [])

  const handleSaveTransfer = async () => {
    setTransferSaving(true)
    setTransferError(null)
    try {
      const res = await fetch('/api/dashboard/transfer-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: transferEnabled, phoneNumber: transferNumber, condition: transferCondition }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '保存に失敗しました')
      setTransferSavedAt(new Date().toLocaleTimeString('ja-JP'))
    } catch (e: any) {
      setTransferError(e.message)
    } finally {
      setTransferSaving(false)
    }
  }

  const applyTemplate = (t: ScriptTemplateSummary) => {
    const filled = companyName
      ? t.prompt.replaceAll('{{会社名}}', companyName)
      : t.prompt
    setPrompt(filled)
    setShowTemplates(false)
  }

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

              <div className="mb-4">
                <button
                  onClick={() => setShowTemplates((v) => !v)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(1,201,253,0.12)', border: '1px solid rgba(1,201,253,0.3)', color: '#01C9FD' }}
                >
                  📋 テンプレートから選ぶ{showTemplates ? '（閉じる）' : ''}
                </button>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(240,244,255,0.7)' }}>
                  用途に合うテンプレートを選ぶと、会社名を自動で差し込んだ状態で下の欄に入ります。あとは必要な部分だけ直してください。
                </p>

                {showTemplates && (
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {templates.length === 0 ? (
                      <p className="text-xs" style={{ color: 'rgba(240,244,255,0.6)' }}>テンプレートを読み込めませんでした</p>
                    ) : (
                      templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                          className="text-left p-4 rounded-2xl transition-all hover:scale-[1.005]"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(1,201,253,0.15)', color: '#01C9FD' }}>
                              {t.category}
                            </span>
                            <span className="font-bold text-sm text-white">{t.name}</span>
                          </div>
                          <p className="text-xs" style={{ color: 'rgba(240,244,255,0.8)' }}>{t.description}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

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

              <div className="mt-8 p-5 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-sm font-bold text-white mb-1">電話転送の設定</h2>
                <p className="text-xs mb-4" style={{ color: 'rgba(240,244,255,0.75)' }}>
                  この台本で、人による対応が必要な場合に電話を転送するかどうかを決められます。
                </p>

                {transferLoading ? (
                  <p className="text-xs" style={{ color: 'rgba(240,244,255,0.7)' }}>読み込み中...</p>
                ) : !transferSupported ? (
                  <p className="text-xs px-4 py-3 rounded-xl" style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)' }}>
                    Fish Audioのエージェントは、現在この画面からの転送設定には対応していません。転送したい場合は、台本の中に転送先の案内を文章で書いてください。
                  </p>
                ) : (
                  <>
                    {transferError && (
                      <div className="mb-3 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(253,119,131,0.12)', color: '#FD7783', border: '1px solid rgba(253,119,131,0.25)' }}>
                        {transferError}
                      </div>
                    )}
                    <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transferEnabled}
                        onChange={(e) => setTransferEnabled(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-white">この台本から電話転送を使う</span>
                    </label>

                    {transferEnabled && (
                      <div className="space-y-3 mb-2">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'rgba(240,244,255,0.75)' }}>転送先の電話番号</label>
                          <input
                            type="text"
                            value={transferNumber}
                            onChange={(e) => setTransferNumber(e.target.value)}
                            placeholder="例：+819012345678"
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,244,255,1.0)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'rgba(240,244,255,0.75)' }}>転送する条件(任意)</label>
                          <input
                            type="text"
                            value={transferCondition}
                            onChange={(e) => setTransferCondition(e.target.value)}
                            placeholder="例：お客様の用件が、人による対応が必要だと判断した場合"
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,244,255,1.0)' }}
                          />
                          <p className="text-[11px] mt-1" style={{ color: 'rgba(240,244,255,0.6)' }}>
                            AIはこの条件を見て、転送するかどうかをその場で判断します。空欄の場合は「人による対応が必要だと判断した場合」になります。
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={handleSaveTransfer}
                        disabled={transferSaving}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#01C9FD,#1FBF75)', color: '#0E1530' }}
                      >
                        {transferSaving ? '保存しています...' : '転送設定を保存する'}
                      </button>
                      {transferSavedAt && (
                        <span className="text-xs" style={{ color: '#1FBF75' }}>✓ {transferSavedAt} に保存しました</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
