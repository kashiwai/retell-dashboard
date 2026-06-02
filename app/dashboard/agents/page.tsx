'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Agent {
  agent_id: string
  agent_name: string
  voice_id?: string
  todayCalls?: number
  status?: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.ok ? r.json() : { agents: [] })
      .then(d => { setAgents(d.agents ?? d ?? []); setLoading(false) })
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
            { href: '/dashboard/agents', label: 'AIエージェント', icon: '🤖', active: true },
            { href: '/dashboard/knowledge-base', label: 'ナレッジベース', icon: '📚' },
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
            <h1 className="text-xl font-bold text-white">AIエージェント</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,255,0.45)' }}>Retell AIエージェント一覧</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(31,191,117,0.15)', color: '#1FBF75' }}>
              {agents.length}体 稼働中
            </span>
          </div>
        </div>

        <div className="px-8 py-6">
          {loading ? (
            <div className="text-center py-20" style={{ color: 'rgba(240,244,255,0.35)' }}>エージェント情報を読み込んでいます...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-20" style={{ color: 'rgba(240,244,255,0.35)' }}>エージェントが見つかりません</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div key={agent.agent_id} className="p-5 rounded-3xl transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: 'rgba(1,201,253,0.15)' }}>🤖</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-white truncate">{agent.agent_name ?? '無名エージェント'}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                          style={{ background: 'rgba(31,191,117,0.15)', color: '#1FBF75' }}>稼働中</span>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(240,244,255,0.4)' }}>
                        ID: {agent.agent_id.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <p className="text-xl font-bold" style={{ color: '#01C9FD' }}>{agent.todayCalls ?? 0}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(240,244,255,0.4)' }}>本日の通話数</p>
                    </div>
                    <div className="p-3 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#1FBF75' }}>v2.1.0</p>
                      <p className="text-[10px]" style={{ color: 'rgba(240,244,255,0.4)' }}>バージョン</p>
                    </div>
                  </div>
                  {agent.voice_id && (
                    <p className="text-xs mt-3" style={{ color: 'rgba(240,244,255,0.35)' }}>
                      🎙 音声ID: {agent.voice_id.slice(0, 20)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
