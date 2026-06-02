'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface CallData {
  id: string
  caller_name?: string
  caller_topic?: string
  phone?: string
  duration: string
  status: 'active' | 'waiting'
  ai_status: 'ai' | 'transfer' | 'waiting'
  agent: string
}

interface DashboardStats {
  todaysCalls: number
  avgDuration: string
  aiResolutionRate: number
  transferRate?: number
}

const NAVS = [
  { href:'/dashboard',                    label:'ライブモニタリング', icon:'📊', active:true },
  { href:'/dashboard',                    label:'ダッシュボード',     icon:'◼' },
  { href:'/dashboard/calls',              label:'通話履歴',           icon:'📞' },
  { href:'/dashboard/analytics',          label:'分析レポート',       icon:'📈' },
  { href:'/dashboard/agents',             label:'AIエージェント',     icon:'🤖' },
  { href:'/dashboard/knowledge-base',     label:'ナレッジベース',     icon:'📚' },
  { href:'/dashboard',                    label:'設定',               icon:'⚙'  },
]

const COLORS = ['#01C9FD','#FD7783','#1FBF75','#F5A623','#00A5FD','#FD4B83','#4FE0FF']

export default function LiveMonitoringPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [calls, setCalls] = useState<CallData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    try {
      // KPI stats
      const statsRes = await fetch('/api/dashboard')
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }

      // Active calls
      const callsRes = await fetch('/api/calls?limit=20')
      if (callsRes.ok) {
        const data = await callsRes.json()
        const mapped: CallData[] = (data.calls ?? data ?? []).slice(0, 10).map((c: any, i: number) => ({
          id: c.call_id ?? c.id ?? String(i),
          caller_name: c.from_number ? `発信者 ${i + 1}` : `発信者 ${i + 1}`,
          caller_topic: c.call_type ?? c.direction ?? '問い合わせ',
          phone: c.from_number ?? c.to_number ?? '---',
          duration: c.end_timestamp
            ? formatDuration((c.end_timestamp - (c.start_timestamp ?? c.end_timestamp)) / 1000)
            : c.start_timestamp ? formatDuration((Date.now() - c.start_timestamp) / 1000) : '00:00:00',
          status: c.call_status === 'ongoing' ? 'active' : 'waiting',
          ai_status: c.disconnection_reason === 'agent_hangup' ? 'transfer'
            : c.call_status === 'ongoing' ? 'ai' : 'waiting',
          agent: c.agent_id ? 'AIエージェント' : '-',
        }))
        setCalls(mapped)
      }
      setLastUpdated(new Date())
    } catch (e) {
      console.error('fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // 30秒ごと自動更新
    return () => clearInterval(interval)
  }, [fetchData])

  const kpiData = [
    { icon:'📞', label:'本日の総通話数', value: stats?.todaysCalls?.toString() ?? '—',   unit:'件', sub:'リアルタイム',           subColor:'#1FBF75', bg:'rgba(1,201,253,0.15)',    color:'#01C9FD' },
    { icon:'⏱',  label:'平均応答時間',  value: stats?.avgDuration ?? '—',               unit:'',   sub:'目標：3秒以内',          subColor:'#1FBF75', bg:'rgba(1,201,253,0.15)',    color:'#01C9FD' },
    { icon:'📊', label:'AI解決率',      value: stats?.aiResolutionRate ? `${stats.aiResolutionRate.toFixed(1)}` : '—', unit:'%', sub:'目標：80%以上', subColor: stats?.aiResolutionRate && stats.aiResolutionRate >= 80 ? '#1FBF75' : '#F5A623', bg:'rgba(31,191,117,0.15)', color:'#1FBF75' },
    { icon:'👥', label:'転送率',        value: stats?.transferRate ? `${stats.transferRate.toFixed(1)}` : '—',        unit:'%', sub:'目標：20%以下', subColor: stats?.transferRate && stats.transferRate <= 20 ? '#1FBF75' : '#FD7783',        bg:'rgba(253,119,131,0.15)', color:'#FD7783' },
  ]

  return (
    <div className="flex min-h-screen" style={{ background:'#0E1530' }}>

      {/* SIDEBAR */}
      <aside className="hidden w-52 shrink-0 sm:flex flex-col" style={{ background:'linear-gradient(180deg,#111a3e,#0a1228)', borderRight:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 pt-5 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background:'linear-gradient(135deg,#01C9FD,#FD7783)', color:'#0E1530' }}>M</div>
            <span className="font-bold text-sm" style={{ background:'linear-gradient(135deg,#01C9FD,#FD7783)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>MIKATA</span>
          </Link>
        </div>
        <div className="mx-3 mb-3 px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-xs text-white truncate flex-1">株式会社ミカタ</span>
          <span style={{ color:'rgba(240,244,255,0.4)', fontSize:10 }}>▾</span>
        </div>
        <nav className="flex-1 px-2 flex flex-col gap-0.5">
          {NAVS.map((n) => (
            <Link key={n.label} href={n.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={n.active ? { background:'rgba(1,201,253,0.12)', border:'1px solid rgba(1,201,253,0.25)', color:'#01C9FD', fontWeight:600 } : { border:'1px solid transparent', color:'rgba(240,244,255,0.6)' }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background:'linear-gradient(135deg,#01C9FD,#FD7783)', color:'#0E1530' }}>田</div>
            <div>
              <p className="text-xs font-semibold text-white">田中 花子</p>
              <p className="text-[10px]" style={{ color:'#1FBF75' }}>● オペレーター</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">ライブモニタリング</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background:'rgba(253,75,107,0.2)', color:'#FD4B6B', border:'1px solid rgba(253,75,107,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background:'#FD4B6B', animation:'pulse 2s infinite' }}/>LIVE
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color:'rgba(240,244,255,0.45)' }}>
              リアルタイムの通話状況を監視しています
              {!loading && <span className="ml-2">· {lastUpdated.toLocaleTimeString('ja-JP')}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-xl text-sm" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(240,244,255,0.7)' }}>
              ▼ フィルター
            </button>
            <button className="px-4 py-2 rounded-xl text-sm" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(240,244,255,0.7)' }}>
              すべてのチャンネル ▾
            </button>
            <button onClick={fetchData} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(240,244,255,0.7)' }}>↻</button>
          </div>
        </div>

        <div className="px-8 py-6 flex-1">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {kpiData.map((k) => (
              <div key={k.label} className="p-5 rounded-3xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg mb-3" style={{ background:k.bg }}>
                  <span style={{ color:k.color }}>{k.icon}</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {loading ? <span style={{ color:'rgba(240,244,255,0.3)' }}>—</span> : k.value}
                  <span className="text-lg font-normal ml-0.5" style={{ color:'rgba(240,244,255,0.5)' }}>{k.unit}</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color:'rgba(240,244,255,0.45)' }}>{k.label}</p>
                <p className="text-xs mt-1 font-medium" style={{ color:k.subColor }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Live Call Table */}
          <div className="rounded-3xl overflow-hidden" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-white">リアルタイム通話一覧</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background:'rgba(1,201,253,0.15)', color:'#01C9FD' }}>
                  {calls.filter(c=>c.status==='active').length}件の通話中
                </span>
              </div>
              <button className="px-3 py-1.5 rounded-xl text-xs" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(240,244,255,0.6)' }}>⚙ 表示設定</button>
            </div>

            <div className="grid px-6 py-3 text-[10px] font-semibold" style={{ gridTemplateColumns:'110px 1fr 130px 100px 100px 1fr 48px', color:'rgba(240,244,255,0.4)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              {['ステータス','発信者','電話番号','経過時間','AI対応状況','AIエージェント',''].map(h=><span key={h}>{h}</span>)}
            </div>

            {loading ? (
              <div className="text-center py-12" style={{ color:'rgba(240,244,255,0.35)' }}>
                <p className="text-sm">通話データを読み込んでいます...</p>
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-12" style={{ color:'rgba(240,244,255,0.35)' }}>
                <p className="text-sm">現在通話中の呼はありません</p>
              </div>
            ) : (
              calls.map((c, i) => (
                <div key={c.id} className="grid items-center px-6 py-3.5 cursor-pointer transition-all hover:bg-white/5"
                  style={{ gridTemplateColumns:'110px 1fr 130px 100px 100px 1fr 48px', borderBottom:'1px solid rgba(255,255,255,0.04)', background:i===0?'rgba(1,201,253,0.04)':'transparent', borderLeft:i===0?'2px solid #01C9FD':'2px solid transparent' }}>

                  <div>
                    {c.status==='active'
                      ? <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color:'#01C9FD' }}><span className="w-1.5 h-1.5 rounded-full" style={{ background:'#01C9FD' }}/>通話中</span>
                      : <span className="text-xs" style={{ color:'rgba(240,244,255,0.4)' }}>⊙ 待機中</span>}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background:COLORS[i%COLORS.length], color:'#0E1530' }}>
                      {(c.caller_name ?? '?')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{c.caller_name ?? '不明'}</p>
                      <p className="text-xs" style={{ color:'rgba(240,244,255,0.4)' }}>{c.caller_topic}</p>
                    </div>
                  </div>
                  <span className="text-sm" style={{ color:'rgba(240,244,255,0.6)' }}>{c.phone}</span>
                  <span className="text-sm font-mono text-white">{c.duration}</span>
                  <div>
                    {c.ai_status==='ai'       && <span className="badge-active">AI対応中</span>}
                    {c.ai_status==='transfer' && <span className="badge-transfer">転送中</span>}
                    {c.ai_status==='waiting'  && <span className="badge-wait">待機中</span>}
                  </div>
                  <div>
                    {c.agent!=='-' ? <><p className="text-xs text-white">{c.agent}</p><p className="text-[10px]" style={{ color:'rgba(240,244,255,0.35)' }}>v2.1.0</p></> : <span style={{ color:'rgba(240,244,255,0.3)' }}>-</span>}
                  </div>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'rgba(255,255,255,0.06)', color:'rgba(240,244,255,0.5)' }}>···</button>
                </div>
              ))
            )}

            <div className="flex items-center justify-between px-6 py-4">
              <p className="text-xs" style={{ color:'rgba(240,244,255,0.4)' }}>
                全 {calls.length} 件を表示
              </p>
              <div className="flex items-center gap-1">
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background:'rgba(255,255,255,0.05)', color:'rgba(240,244,255,0.4)' }}>‹</button>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background:'#01C9FD', color:'#0E1530' }}>1</button>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background:'rgba(255,255,255,0.05)', color:'rgba(240,244,255,0.4)' }}>›</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const s = Math.floor(Math.abs(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
