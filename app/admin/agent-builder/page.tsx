'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Wand2, Building2, Mic, Phone, CheckCircle, ChevronRight,
  ChevronLeft, Plus, Trash2, Loader2, Bot, Volume2, RefreshCw,
  Sparkles, FileText, Settings
} from 'lucide-react'

// ───── 型定義 ─────
interface BulletPoint { id: number; text: string }
interface Script {
  agent_name: string
  begin_message: string
  general_prompt: string
  key_info_to_collect: string[]
  escalation_triggers: string[]
  suggested_tools: string[]
}
interface Voice {
  voice_id: string
  voice_name: string
  provider: string
  gender: string
  preview_url: string | null
}

const STEPS = [
  { id: 1, label: 'コールセンター情報', icon: Building2 },
  { id: 2, label: 'スクリプト生成',     icon: Sparkles  },
  { id: 3, label: '声を選択',           icon: Mic       },
  { id: 4, label: '確認・作成',         icon: CheckCircle },
]

const UNASSIGNED_NUMBERS = [
  { phone: '+815017939835', label: '050-1793-9835（在庫①）' },
  { phone: '+815017840113', label: '050-1784-0113（在庫②）' },
]

const INDUSTRIES = [
  '不動産', '歯科・医療', '飲食・フード', '美容・サロン', 'IT・SaaS',
  'EC・通販', '保険', '金融', '教育', '介護・福祉', 'その他',
]

export default function AgentBuilderPage() {
  const [step, setStep] = useState(1)

  // Step1: 企業情報
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [agentPersona, setAgentPersona] = useState('')
  const [bullets, setBullets] = useState<BulletPoint[]>([
    { id: 1, text: '' },
    { id: 2, text: '' },
  ])

  // Step2: スクリプト
  const [generating, setGenerating] = useState(false)
  const [script, setScript] = useState<Script | null>(null)
  const [editingPrompt, setEditingPrompt] = useState(false)

  // Step3: 音声
  const [voices, setVoices] = useState<Voice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'female' | 'male'>('all')

  // Step4: LLM選択・Cal.com・電話番号・作成
  const [selectedPhone, setSelectedPhone] = useState('')
  const [selectedLlm, setSelectedLlm] = useState('claude-4.5-sonnet')
  const [llmModels, setLlmModels] = useState<any[]>([])
  const [calcomEnabled, setCalcomEnabled] = useState(false)
  const [calcomApiKey, setCalcomApiKey] = useState('')
  const [calcomEventId, setCalcomEventId] = useState('')
  const [calcomVerifying, setCalcomVerifying] = useState(false)
  const [calcomVerified, setCalcomVerified] = useState(false)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<any>(null)

  // ───── Step1 bullets 操作 ─────
  function addBullet() {
    setBullets(prev => [...prev, { id: Date.now(), text: '' }])
  }
  function removeBullet(id: number) {
    if (bullets.length <= 1) return
    setBullets(prev => prev.filter(b => b.id !== id))
  }
  function updateBullet(id: number, text: string) {
    setBullets(prev => prev.map(b => b.id === id ? { ...b, text } : b))
  }

  // ───── Step2: スクリプト生成 ─────
  async function handleGenerateScript() {
    const validBullets = bullets.map(b => b.text).filter(Boolean)
    if (!validBullets.length) {
      alert('箇条書きを最低1つ入力してください')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/agent-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_script',
          company_name: companyName,
          industry,
          agent_persona: agentPersona,
          bullet_points: validBullets,
        }),
      })
      const data = await res.json()
      if (res.ok && data.script) {
        setScript(data.script)
      } else {
        alert(`❌ エラー: ${data.error || '生成に失敗しました'}`)
      }
    } finally {
      setGenerating(false)
    }
  }

  // ───── Step3: 音声一覧取得 ─────
  // LLMモデル一覧取得
  async function loadLlmModels() {
    if (llmModels.length) return
    const res = await fetch('/api/admin/agent-builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_llm_models' }),
    })
    if (res.ok) {
      const data = await res.json()
      setLlmModels(data.models || [])
    }
  }

  // Cal.com APIキー検証
  async function verifyCalcom() {
    if (!calcomApiKey) return
    setCalcomVerifying(true)
    try {
      const res = await fetch('/api/admin/agent-builder/calcom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_key', api_key: calcomApiKey }),
      })
      setCalcomVerified(res.ok)
      if (!res.ok) alert('Cal.com APIキーが無効です')
    } finally {
      setCalcomVerifying(false)
    }
  }

  async function loadVoices() {
    if (voices.length) return
    setVoicesLoading(true)
    try {
      const res = await fetch('/api/admin/agent-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_voices' }),
      })
      const data = await res.json()
      setVoices(data.voices || [])
    } finally {
      setVoicesLoading(false)
    }
  }

  // ───── Step4: エージェント作成 ─────
  async function handleCreate() {
    if (!script || !selectedVoice) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/agent-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_agent',
          script,
          voice_id: selectedVoice.voice_id,
          phone_number: selectedPhone || undefined,
          company_name: companyName,
          llm_model: selectedLlm,
          calcom_config: calcomEnabled && calcomApiKey ? {
            enabled: true,
            api_key: calcomApiKey,
            event_type_id: calcomEventId,
            app_url: window.location.origin,
          } : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        alert(`❌ エラー: ${data.error}`)
      }
    } finally {
      setCreating(false)
    }
  }

  function goNext() {
    if (step === 2 && !script) { alert('先にスクリプトを生成してください'); return }
    if (step === 3) loadVoices()
    if (step === 3 && !selectedVoice) { alert('音声を選択してください'); return }
    if (step === 3) { loadLlmModels() }
    setStep(s => Math.min(s + 1, 4))
  }

  const filteredVoices = voices.filter(v =>
    voiceFilter === 'all' || v.gender === voiceFilter
  )

  // ───── 完了画面 ─────
  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">エージェント作成完了！</h2>
          <p className="text-gray-500 mb-6">AIコールセンターの準備が整いました</p>

          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
            <InfoRow label="エージェント名" value={result.agent_name} />
            <InfoRow label="エージェントID" value={result.agent_id} mono />
            <InfoRow label="LLM（Claude）" value={result.llm_id} mono />
            <InfoRow label="音声" value={selectedVoice?.voice_name || result.voice_id} />
            {result.phone_assignment?.phone_number && (
              <InfoRow
                label="電話番号"
                value={result.phone_assignment.phone_number}
                badge={result.phone_assignment.assigned ? '割り当て済み' : '割り当て失敗'}
                badgeColor={result.phone_assignment.assigned ? 'green' : 'red'}
              />
            )}
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/phone-numbers"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 text-center"
            >
              電話番号管理へ
            </Link>
            <button
              onClick={() => { setResult(null); setStep(1); setScript(null); setSelectedVoice(null) }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              新しいエージェントを作成
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href="/admin/phone-numbers" className="text-gray-500 hover:text-gray-700 text-sm">← 電話番号管理</Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Wand2 size={20} className="text-blue-600" />
          AIエージェント自動作成
        </h1>
      </div>

      {/* ステップバー */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-0 max-w-2xl mx-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = step === s.id
            const done = step > s.id
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    active ? 'bg-blue-600 text-white' :
                    done ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  <span className="hidden sm:block whitespace-nowrap">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">

        {/* ─── STEP 1: コールセンター情報 ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
              <h2 className="text-lg font-bold text-gray-900">コールセンターの情報を入力</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会社名 / サービス名</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="例: 渋谷歯科クリニック"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— 選択してください —</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AIエージェントのペルソナ（任意）
                </label>
                <input
                  value={agentPersona}
                  onChange={e => setAgentPersona(e.target.value)}
                  placeholder="例: 明るくてテキパキした受付スタッフ"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  このコールセンターでやりたいこと（箇条書き）
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  AIが最適なトークスクリプトを自動生成します。具体的に書くほど精度が上がります。
                </p>
                <div className="space-y-2">
                  {bullets.map((b, idx) => (
                    <div key={b.id} className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-5 text-right flex-shrink-0">{idx + 1}.</span>
                      <input
                        value={b.text}
                        onChange={e => updateBullet(b.id, e.target.value)}
                        placeholder="例: 予約受付と日程変更を対応したい"
                        className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => removeBullet(b.id)}
                        disabled={bullets.length <= 1}
                        className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addBullet}
                  className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={14} />
                  項目を追加
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!bullets.some(b => b.text.trim())}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                次へ：スクリプト生成
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: スクリプト生成 ─── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">AIトークスクリプト生成</h2>
                <button
                  onClick={handleGenerateScript}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {generating
                    ? <><Loader2 size={16} className="animate-spin" />生成中...</>
                    : <><Sparkles size={16} />{script ? '再生成' : 'Claude で生成'}</>
                  }
                </button>
              </div>

              {!script && !generating && (
                <div className="text-center py-12 text-gray-400">
                  <Bot size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>「Claude で生成」ボタンを押してください</p>
                  <p className="text-xs mt-1">入力情報をもとに最適なスクリプトを自動生成します</p>
                </div>
              )}

              {generating && (
                <div className="text-center py-12 text-gray-400">
                  <Loader2 size={48} className="mx-auto mb-3 text-purple-400 animate-spin" />
                  <p className="text-purple-600 font-medium">Claude claude-sonnet-4-6 が生成中...</p>
                  <p className="text-xs mt-1">10〜20秒お待ちください</p>
                </div>
              )}

              {script && !generating && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">エージェント名</label>
                      <input
                        value={script.agent_name}
                        onChange={e => setScript(s => s ? { ...s, agent_name: e.target.value } : s)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">第一声</label>
                      <input
                        value={script.begin_message}
                        onChange={e => setScript(s => s ? { ...s, begin_message: e.target.value } : s)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-500">システムプロンプト</label>
                      <button
                        onClick={() => setEditingPrompt(p => !p)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {editingPrompt ? '確認' : '編集'}
                      </button>
                    </div>
                    {editingPrompt ? (
                      <textarea
                        value={script.general_prompt}
                        onChange={e => setScript(s => s ? { ...s, general_prompt: e.target.value } : s)}
                        rows={12}
                        className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto border">
                        {script.general_prompt}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">収集する情報</label>
                      <ul className="space-y-1">
                        {script.key_info_to_collect.map((k, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">✓</span>{k}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">人間転送トリガー</label>
                      <ul className="space-y-1">
                        {script.escalation_triggers.map((k, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-orange-500 mt-0.5">!</span>{k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                <ChevronLeft size={16} />戻る
              </button>
              <button
                onClick={goNext}
                disabled={!script}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                次へ：声を選択
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: 音声選択 ─── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">AIの声を選択</h2>
                <button onClick={() => { setVoices([]); loadVoices() }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <RefreshCw size={12} />更新
                </button>
              </div>

              {/* フィルター */}
              <div className="flex gap-2 mb-4">
                {(['all', 'female', 'male'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setVoiceFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      voiceFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {{ all: 'すべて', female: '女性', male: '男性' }[f]}
                  </button>
                ))}
              </div>

              {voicesLoading ? (
                <div className="text-center py-10">
                  <Loader2 size={32} className="animate-spin text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">音声を読み込み中...</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto pr-1">
                  {filteredVoices.map(v => (
                    <label
                      key={v.voice_id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedVoice?.voice_id === v.voice_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="voice"
                        value={v.voice_id}
                        checked={selectedVoice?.voice_id === v.voice_id}
                        onChange={() => setSelectedVoice(v)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        v.gender === 'female' ? 'bg-pink-100' : 'bg-blue-100'
                      }`}>
                        <Volume2 size={18} className={v.gender === 'female' ? 'text-pink-500' : 'text-blue-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{v.voice_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            v.provider === 'elevenlabs' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {v.provider === 'elevenlabs' ? 'ElevenLabs' : 'Fish Audio'}
                          </span>
                          <span className="text-xs text-gray-400">{v.gender === 'female' ? '女性' : '男性'}</span>
                        </div>
                      </div>
                      {selectedVoice?.voice_id === v.voice_id && (
                        <CheckCircle size={20} className="text-blue-500 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                <ChevronLeft size={16} />戻る
              </button>
              <button
                onClick={goNext}
                disabled={!selectedVoice}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                次へ：確認・作成
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: 確認・作成 ─── */}
        {step === 4 && script && selectedVoice && (
          <div className="space-y-6">
            {/* サマリー */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
              <h2 className="text-lg font-bold text-gray-900">設定を確認して作成</h2>
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <SummaryRow label="会社名"       value={companyName || '（未設定）'} />
                <SummaryRow label="エージェント名" value={script.agent_name} />
                <SummaryRow label="第一声"       value={script.begin_message} />
                <SummaryRow label="音声"         value={selectedVoice.voice_name} />
                <SummaryRow
                  label="プロバイダ"
                  value={selectedVoice.provider === 'elevenlabs' ? 'ElevenLabs' : 'Fish Audio'}
                />
              </div>
            </div>

            {/* LLM選択 */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Bot size={18} className="text-purple-500" />
                通話に使うAIモデル
              </h3>
              <div className="space-y-2">
                {(llmModels.length ? llmModels : [
                  { id: 'claude-4.5-sonnet', label: 'Claude Sonnet 4.6（推奨）', provider: 'anthropic', description: '日本語の自然さ・共感力が最高', recommended: true },
                  { id: 'gpt-4.1',           label: 'GPT-4.1',                   provider: 'openai',    description: 'Function Call精度が高い', recommended: false },
                  { id: 'gpt-4.1-mini',      label: 'GPT-4.1 mini（低コスト）',  provider: 'openai',    description: 'シンプルな問い合わせ向け', recommended: false },
                ]).map(m => (
                  <label key={m.id} className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedLlm === m.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="llm" value={m.id}
                      checked={selectedLlm === m.id} onChange={() => setSelectedLlm(m.id)} className="sr-only" />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      m.provider === 'anthropic' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {m.provider === 'anthropic' ? 'C' : 'G'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{m.label}</span>
                        {m.recommended && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">推奨</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                    </div>
                    {selectedLlm === m.id && <CheckCircle size={18} className="text-purple-500 flex-shrink-0" />}
                  </label>
                ))}
              </div>
            </div>

            {/* Cal.com 連携 */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Phone size={18} className="text-green-500" />
                  Cal.com カレンダー連携
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setCalcomEnabled(p => !p)}
                    className={`w-11 h-6 rounded-full transition-colors ${calcomEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${calcomEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-gray-600">{calcomEnabled ? '有効' : '無効'}</span>
                </label>
              </div>

              {calcomEnabled && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    通話中にAIが自動でカレンダーを確認し、その場で予約を確定できます。
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={calcomApiKey}
                      onChange={e => { setCalcomApiKey(e.target.value); setCalcomVerified(false) }}
                      placeholder="Cal.com API Key（cal_live_xxxxx）"
                      type="password"
                      className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={verifyCalcom}
                      disabled={!calcomApiKey || calcomVerifying}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                    >
                      {calcomVerifying ? <Loader2 size={14} className="animate-spin" /> :
                       calcomVerified  ? <CheckCircle size={14} /> : null}
                      {calcomVerified ? '確認済み' : '確認'}
                    </button>
                  </div>
                  <input
                    value={calcomEventId}
                    onChange={e => setCalcomEventId(e.target.value)}
                    placeholder="Event Type ID（Cal.comダッシュボードで確認）"
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-400">
                    Cal.com → Settings → API Keys でキーを取得。Event Type IDはイベント編集URLの数字です。
                  </p>
                </div>
              )}
            </div>

            {/* 電話番号割り当て */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Phone size={18} className="text-blue-500" />
                電話番号を割り当てる（任意）
              </h3>
              <select
                value={selectedPhone}
                onChange={e => setSelectedPhone(e.target.value)}
                className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— あとで割り当てる —</option>
                {UNASSIGNED_NUMBERS.map(n => (
                  <option key={n.phone} value={n.phone}>{n.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                在庫番号に割り当てます。あとで /admin/phone-numbers からも変更可能です。
              </p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                <ChevronLeft size={16} />戻る
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 text-base"
              >
                {creating
                  ? <><Loader2 size={18} className="animate-spin" />作成中...</>
                  : <><Wand2 size={18} />エージェントを自動作成</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, badge, badgeColor }: {
  label: string; value: string; mono?: boolean; badge?: string; badgeColor?: 'green' | 'red'
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            badgeColor === 'green' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>{badge}</span>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'font-bold text-blue-700' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}
