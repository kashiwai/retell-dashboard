'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Phone, Plus, RefreshCw, CheckCircle, XCircle, Loader2, Bot, Search } from 'lucide-react'

interface PhoneNumber {
  phone_number: string
  friendly_name: string
  sid: string
  status: string
  retell_registered: boolean
  retell_phone_id: string | null
  inbound_agent_id: string | null
  nickname: string | null
  sip_trunk_sid: string | null
  created_at: string | null
}

interface Agent {
  agent_id: string
  agent_name: string
}

interface AvailableNumber {
  phone_number: string
  friendly_name: string
  locality: string
  region: string
}

export default function PhoneNumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [trunkSid, setTrunkSid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 新規購入モーダル
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedForPurchase, setSelectedForPurchase] = useState<string | null>(null)

  // エージェント割り当てモーダル
  const [assignModal, setAssignModal] = useState<PhoneNumber | null>(null)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [nicknameInput, setNicknameInput] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [numbersRes, agentsRes] = await Promise.all([
        fetch('/api/admin/phone-numbers'),
        fetch('/api/agents'),
      ])
      if (numbersRes.ok) {
        const data = await numbersRes.json()
        setNumbers(data.numbers || [])
        setTrunkSid(data.trunk_sid)
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(Array.isArray(data) ? data : (data.agents || []))
      }
    } finally {
      setLoading(false)
    }
  }

  // 番号を Retell AI にインポート
  async function handleImport(phone: string) {
    setActionLoading(phone)
    try {
      const res = await fetch('/api/admin/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', phone_number: phone }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`✅ ${phone} を Retell AI にインポートしました`)
        await loadData()
      } else {
        alert(`❌ エラー: ${data.error}`)
      }
    } finally {
      setActionLoading(null)
    }
  }

  // 全未登録番号を一括インポート
  async function handleImportAll() {
    const unregistered = numbers.filter(n => !n.retell_registered)
    if (unregistered.length === 0) {
      alert('インポートが必要な番号はありません')
      return
    }
    if (!confirm(`${unregistered.length}件の番号を Retell AI にインポートしますか?`)) return

    setActionLoading('all')
    let success = 0
    for (const n of unregistered) {
      try {
        const res = await fetch('/api/admin/phone-numbers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', phone_number: n.phone_number }),
        })
        if (res.ok) success++
      } catch {}
    }
    alert(`${success}/${unregistered.length} 件のインポートが完了しました`)
    setActionLoading(null)
    await loadData()
  }

  // エージェント割り当て保存
  async function handleAssignSave() {
    if (!assignModal) return
    setActionLoading(assignModal.phone_number)
    try {
      const res = await fetch(
        `/api/admin/phone-numbers/${encodeURIComponent(assignModal.phone_number)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inbound_agent_id: selectedAgent || null,
            nickname: nicknameInput || null,
          }),
        }
      )
      if (res.ok) {
        await loadData()
        setAssignModal(null)
      } else {
        const data = await res.json()
        alert(`❌ エラー: ${data.error}`)
      }
    } finally {
      setActionLoading(null)
    }
  }

  // 利用可能な050番号を検索
  async function handleSearch() {
    setSearchLoading(true)
    try {
      const res = await fetch('/api/admin/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search' }),
      })
      const data = await res.json()
      if (res.ok) {
        setAvailableNumbers(data.available || [])
      } else {
        alert(`❌ 検索エラー: ${data.error}`)
      }
    } finally {
      setSearchLoading(false)
    }
  }

  // 番号を購入してインポート
  async function handlePurchaseAndImport() {
    if (!selectedForPurchase) return
    setActionLoading('purchase')
    try {
      // 購入
      const buyRes = await fetch('/api/admin/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', phone_number: selectedForPurchase }),
      })
      if (!buyRes.ok) {
        const d = await buyRes.json()
        alert(`❌ 購入エラー: ${d.error}`)
        return
      }

      // インポート
      const importRes = await fetch('/api/admin/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', phone_number: selectedForPurchase }),
      })
      if (importRes.ok) {
        alert(`✅ ${selectedForPurchase} の購入・インポートが完了しました`)
        setShowPurchaseModal(false)
        await loadData()
      } else {
        const d = await importRes.json()
        alert(`⚠️ 購入は完了しましたが、インポートに失敗しました: ${d.error}`)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const unregisteredCount = numbers.filter(n => !n.retell_registered).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/tenants" className="text-gray-500 hover:text-gray-700 text-sm">
            ← テナント管理
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Phone size={20} />
            電話番号管理
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {unregisteredCount > 0 && (
            <button
              onClick={handleImportAll}
              disabled={actionLoading === 'all'}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {actionLoading === 'all' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              未登録 {unregisteredCount}件を一括インポート
            </button>
          )}
          <button
            onClick={() => { setShowPurchaseModal(true); setAvailableNumbers([]); setSelectedForPurchase(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} />
            新規050番号を取得
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            更新
          </button>
        </div>
      </div>

      {/* SIP Trunk 情報バナー */}
      {trunkSid && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 text-sm text-blue-700 flex items-center gap-2">
          <span className="font-medium">SIP Trunk:</span>
          <span className="font-mono">{trunkSid}.pstn.twilio.com</span>
          <span className="text-blue-500">（Retell AI に接続済み）</span>
        </div>
      )}

      {/* メインテーブル */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : numbers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Phone size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Twilio アカウントに電話番号が見つかりません</p>
            <p className="text-sm mt-1">「新規050番号を取得」から番号を追加してください</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">電話番号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ニックネーム</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Retell AI</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">割り当てエージェント</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {numbers.map((n) => {
                  const agent = agents.find(a => a.agent_id === n.inbound_agent_id)
                  const isLoading = actionLoading === n.phone_number
                  return (
                    <tr key={n.phone_number} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">
                        {n.phone_number}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {n.nickname || n.friendly_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {n.retell_registered ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={14} />
                            登録済み
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-500">
                            <XCircle size={14} />
                            未登録
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {agent ? (
                          <span className="flex items-center gap-1">
                            <Bot size={14} className="text-blue-500" />
                            {agent.agent_name}
                          </span>
                        ) : n.inbound_agent_id ? (
                          <span className="font-mono text-xs text-gray-400">{n.inbound_agent_id}</span>
                        ) : (
                          <span className="text-gray-400">未割り当て</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!n.retell_registered && (
                            <button
                              onClick={() => handleImport(n.phone_number)}
                              disabled={isLoading || actionLoading === 'all'}
                              className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium hover:bg-orange-200 disabled:opacity-50"
                            >
                              {isLoading ? <Loader2 size={12} className="animate-spin inline" /> : 'インポート'}
                            </button>
                          )}
                          {n.retell_registered && (
                            <button
                              onClick={() => {
                                setAssignModal(n)
                                setSelectedAgent(n.inbound_agent_id || '')
                                setNicknameInput(n.nickname || '')
                              }}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                            >
                              <Bot size={12} className="inline mr-1" />
                              エージェント設定
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新規番号購入モーダル */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">新規050番号を取得</h2>
              <button onClick={() => setShowPurchaseModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Twilio から利用可能な日本の050番号を検索して購入できます。
                購入後は自動的に Retell AI にインポートされます。
              </p>
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {searchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                利用可能な050番号を検索
              </button>

              {availableNumbers.length > 0 && (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {availableNumbers.map(n => (
                    <label
                      key={n.phone_number}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b last:border-0 ${
                        selectedForPurchase === n.phone_number ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="phone"
                        value={n.phone_number}
                        checked={selectedForPurchase === n.phone_number}
                        onChange={() => setSelectedForPurchase(n.phone_number)}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-mono font-medium text-gray-900">{n.phone_number}</div>
                        <div className="text-xs text-gray-500">{n.friendly_name}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {availableNumbers.length === 0 && !searchLoading && (
                <p className="text-sm text-gray-400 text-center py-4">
                  検索ボタンを押して利用可能な番号を表示してください
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handlePurchaseAndImport}
                disabled={!selectedForPurchase || actionLoading === 'purchase'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'purchase' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                購入してインポート
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エージェント割り当てモーダル */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">エージェント設定</h2>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <p className="font-mono text-gray-900">{assignModal.phone_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ニックネーム</label>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  placeholder="例: PALパックライン受付"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">インバウンドエージェント</label>
                <select
                  value={selectedAgent}
                  onChange={e => setSelectedAgent(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— 割り当てなし —</option>
                  {agents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>{a.agent_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setAssignModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleAssignSave}
                disabled={actionLoading === assignModal.phone_number}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === assignModal.phone_number ? <Loader2 size={16} className="animate-spin" /> : null}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
