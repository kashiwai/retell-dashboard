'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface KnowledgeBase {
  id: string
  name: string
  description?: string
  updated_at?: string
  document_count?: number
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')

  useEffect(() => {
    fetch('/api/knowledge-base')
      .then(r => r.ok ? r.json() : { knowledge_bases: [] })
      .then(d => { setItems(d.knowledge_bases ?? d ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
            { href: '/dashboard', label: 'ダッシュボード', icon: '◼' },
            { href: '/dashboard/calls', label: '通話履歴', icon: '📞' },
            { href: '/dashboard/analytics', label: '分析レポート', icon: '📈' },
            { href: '/dashboard/agents', label: 'AIエージェント', icon: '🤖' },
            { href: '/dashboard/knowledge-base', label: 'ナレッジベース', icon: '📚', active: true },
            { href: '/dashboard', label: '設定', icon: '⚙' },
          ].map(n => (
            <Link key={n.label} href={n.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={(n as any).active ? { background: 'rgba(1,201,253,0.12)', border: '1px solid rgba(1,201,253,0.25)', color: '#01C9FD', fontWeight: 600 } : { border: '1px solid transparent', color: 'rgba(240,244,255,0.6)' }}>
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div>
            <h1 className="text-xl font-bold text-white">ナレッジベース</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,255,0.45)' }}>AIが参照するFAQ・対応マニュアル</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#01C9FD,#00A5FD)', color: '#0E1530' }}>
            + 新規追加
          </button>
        </div>

        <div className="px-8 py-6">

          {/* Add FAQ */}
          <div className="p-6 rounded-3xl mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(1,201,253,0.2)' }}>
            <h2 className="font-semibold text-white mb-4">FAQ を追加</h2>
            <div className="flex flex-col gap-3">
              <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                placeholder="質問を入力（例：営業時間はいつですか？）"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0F4FF' }}/>
              <textarea value={newAnswer} onChange={e => setNewAnswer(e.target.value)}
                placeholder="回答を入力"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0F4FF' }}/>
              <div className="flex justify-end">
                <button className="px-6 py-2.5 rounded-2xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg,#01C9FD,#00A5FD)', color: '#0E1530' }}
                  onClick={() => { setNewQuestion(''); setNewAnswer('') }}>
                  保存する
                </button>
              </div>
            </div>
          </div>

          {/* Knowledge Base List */}
          {loading ? (
            <div className="text-center py-12" style={{ color: 'rgba(240,244,255,0.35)' }}>読み込み中...</div>
          ) : items.length === 0 ? (
            <div className="p-6 rounded-3xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p className="text-4xl mb-3">📚</p>
              <p className="text-sm font-semibold text-white mb-1">ナレッジベースが未設定です</p>
              <p className="text-xs" style={{ color: 'rgba(240,244,255,0.4)' }}>上のフォームからFAQを追加するか、Retellダッシュボードで設定してください</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((kb) => (
                <div key={kb.id} className="p-5 rounded-3xl flex items-center gap-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'rgba(1,201,253,0.12)' }}>📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{kb.name}</p>
                    {kb.description && <p className="text-xs truncate" style={{ color: 'rgba(240,244,255,0.45)' }}>{kb.description}</p>}
                    {kb.updated_at && <p className="text-[10px] mt-0.5" style={{ color: 'rgba(240,244,255,0.3)' }}>更新: {new Date(kb.updated_at).toLocaleDateString('ja-JP')}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {kb.document_count !== undefined && (
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(1,201,253,0.1)', color: '#01C9FD' }}>{kb.document_count}件</span>
                    )}
                    <button className="text-xs px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,255,0.6)' }}>編集</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
