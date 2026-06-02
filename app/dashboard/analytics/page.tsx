'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AnalyticsData {
  dailyStats: { date: string; calls: number; minutes: number }[]
  totalCalls: number
  totalMinutes: number
  avgDuration: number
  resolutionRate: number
  peakHour: string
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const maxCalls = Math.max(...(data?.dailyStats?.map(d => d.calls) ?? [1]))

  return (
    <div className="flex min-h-screen" style={{ background: '#0E1530' }}>
      {/* Sidebar */}
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
            { href: '/dashboard/analytics', label: '分析レポート', icon: '📈', active: true },
            { href: '/dashboard/agents', label: 'AIエージェント', icon: '🤖' },
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

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div>
            <h1 className="text-xl font-bold text-white">分析レポート</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,255,0.45)' }}>過去7日間の通話パフォーマンス</p>
          </div>
          <button className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,244,255,0.7)' }}>
            ⬇ エクスポート
          </button>
        </div>

        <div className="px-8 py-6">
          {/* KPI */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: '総通話数（7日）', value: loading ? '—' : (data?.totalCalls ?? 0).toString(), unit: '件', color: '#01C9FD' },
              { label: '総通話時間', value: loading ? '—' : Math.round((data?.totalMinutes ?? 0) / 60).toString(), unit: '時間', color: '#1FBF75' },
              { label: '平均通話時間', value: loading ? '—' : `${data?.avgDuration ?? 0}`, unit: '分', color: '#F5A623' },
              { label: 'AI解決率', value: loading ? '—' : `${data?.resolutionRate ?? 0}`, unit: '%', color: '#FD7783' },
            ].map(k => (
              <div key={k.label} className="p-5 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs mb-2" style={{ color: 'rgba(240,244,255,0.45)' }}>{k.label}</p>
                <p className="text-3xl font-bold" style={{ color: k.color }}>
                  {k.value}<span className="text-base font-normal ml-1" style={{ color: 'rgba(240,244,255,0.4)' }}>{k.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Daily Chart */}
          <div className="p-6 rounded-3xl mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="font-semibold text-white mb-5">日別通話数（過去7日間）</h2>
            {loading ? (
              <div className="h-40 flex items-center justify-center" style={{ color: 'rgba(240,244,255,0.3)' }}>データ読み込み中...</div>
            ) : (
              <div className="flex items-end gap-3" style={{ height: 160 }}>
                {(data?.dailyStats ?? []).map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <p className="text-xs font-bold" style={{ color: '#01C9FD' }}>{d.calls}</p>
                    <div className="w-full rounded-t-xl" style={{ height: `${Math.max((d.calls / maxCalls) * 120, 4)}px`, background: i === (data?.dailyStats?.length ?? 1) - 1 ? 'linear-gradient(to top,#01C9FD,#00A5FD)' : 'rgba(1,201,253,0.3)', transition: 'height 0.5s' }}/>
                    <p className="text-[10px]" style={{ color: 'rgba(240,244,255,0.4)' }}>{d.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Peak hours & resolution */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="font-semibold text-white mb-4">ピーク時間帯</h2>
              <div className="text-center py-4">
                <p className="text-5xl font-bold" style={{ color: '#01C9FD' }}>{loading ? '—' : (data?.peakHour ?? '—')}</p>
                <p className="text-sm mt-2" style={{ color: 'rgba(240,244,255,0.5)' }}>最も通話が多い時間帯</p>
              </div>
            </div>
            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="font-semibold text-white mb-4">AI対応 vs 転送</h2>
              <div className="flex flex-col gap-3 mt-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">AI自動解決</span>
                    <span style={{ color: '#1FBF75' }}>{loading ? '—' : `${data?.resolutionRate ?? 0}%`}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ height: '100%', width: `${data?.resolutionRate ?? 0}%`, borderRadius: 999, background: 'linear-gradient(90deg,#1FBF75,#01C9FD)', transition: 'width 1s' }}/>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">担当者転送</span>
                    <span style={{ color: '#FD7783' }}>{loading ? '—' : `${100 - (data?.resolutionRate ?? 0)}%`}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ height: '100%', width: `${100 - (data?.resolutionRate ?? 0)}%`, borderRadius: 999, background: 'linear-gradient(90deg,#FD7783,#FD4B83)', transition: 'width 1s' }}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
