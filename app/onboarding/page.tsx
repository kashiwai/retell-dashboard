'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Voice { id: string; name: string; gender: string; preview_url: string | null }

type Mode = 'inbound' | 'both'

const TOTAL_STEPS = 6

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // フォームデータ
  const [mode, setMode] = useState<Mode>('inbound')
  const [companyName, setCompanyName] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [industry, setIndustry] = useState('')
  const [agentName, setAgentName] = useState('')

  // 受電設定
  const [inboundPurpose, setInboundPurpose] = useState('')
  const [inboundFaq, setInboundFaq] = useState('')
  const [inboundTransfer, setInboundTransfer] = useState('')

  // 発信設定
  const [outboundPurpose, setOutboundPurpose] = useState('')
  const [outboundTarget, setOutboundTarget] = useState('')
  const [outboundFlow, setOutboundFlow] = useState('')

  // 声・スクリプト
  const [selectedVoice, setSelectedVoice] = useState('ja-JP-NanamiNeural')
  const [generatedScript, setGeneratedScript] = useState('')
  const [editedScript, setEditedScript] = useState('')

  useEffect(() => {
    fetch('/api/voices')
      .then(r => r.json())
      .then((data: Voice[]) => {
        const jaVoices = data.filter(v => !v.id.startsWith('jp-'))
        setVoices(jaVoices.length ? jaVoices : data)
      })
      .catch(() => {})
  }, [])

  const buildPayload = () => ({
    mode,
    companyName,
    serviceName,
    industry,
    agentName,
    ...(mode === 'inbound' || mode === 'both' ? {
      inbound: { purpose: inboundPurpose, faq: inboundFaq, transferCondition: inboundTransfer }
    } : {}),
    ...(mode === 'both' ? {
      outbound: { purpose: outboundPurpose, targetAudience: outboundTarget, talkFlow: outboundFlow }
    } : {}),
    voiceId: selectedVoice,
  })

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), action: 'generate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedScript(data.script)
      setEditedScript(data.script)
      setStep(5)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildPayload(),
          action: 'save',
          generatedScript: editedScript,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const canNextStep = () => {
    if (step === 1) return true // mode選択は常にOK
    if (step === 2) return companyName.trim() && serviceName.trim() && agentName.trim()
    if (step === 3) return inboundPurpose.trim().length > 0
    if (step === 4) return !!selectedVoice
    return true
  }

  const stepLabel = [
    '運用スタイル',
    '基本情報',
    mode === 'inbound' ? '受電設定' : '受発信設定',
    '声の選択',
    'スクリプト確認',
    '開始',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl overflow-hidden">

        {/* プログレスバー */}
        <div className="bg-gray-50 border-b px-8 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">初期設定ウィザード</h1>
            <span className="text-sm text-gray-400">{step} / {TOTAL_STEPS}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < step ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{stepLabel[step - 1]}</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>
          )}

          {/* Step 1: 運用モード選択 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">どのように使いますか？</h2>
              <p className="text-gray-500 text-sm">AIエージェントの運用スタイルを選択してください。</p>
              <div className="grid grid-cols-1 gap-4 mt-4">
                <button
                  onClick={() => setMode('inbound')}
                  className={`p-5 border-2 rounded-xl text-left transition-all ${
                    mode === 'inbound' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📞</span>
                    <div>
                      <p className="font-semibold text-gray-900">受電専門</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        お客様からの問い合わせ・注文・予約などの着信に対応。24時間自動受付。
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setMode('both')}
                  className={`p-5 border-2 rounded-xl text-left transition-all ${
                    mode === 'both' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📲</span>
                    <div>
                      <p className="font-semibold text-gray-900">受電・発信の両方</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        着信対応に加え、顧客へのリマインド・確認・フォローアップ電話も自動化。
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: 基本情報 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">サービスの基本情報</h2>
              <p className="text-gray-500 text-sm">AIがお客様に自己紹介するために必要な情報です。</p>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会社名・組織名 <span className="text-red-500">*</span></label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                    placeholder="例：株式会社○○" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">サービス名・部署名 <span className="text-red-500">*</span></label>
                  <input value={serviceName} onChange={e => setServiceName(e.target.value)}
                    placeholder="例：カスタマーサポートセンター" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
                  <input value={industry} onChange={e => setIndustry(e.target.value)}
                    placeholder="例：不動産、医療、飲食、IT" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AIエージェントの名前 <span className="text-red-500">*</span></label>
                  <input value={agentName} onChange={e => setAgentName(e.target.value)}
                    placeholder="例：さくら、田中、カスタマーサポートAI" className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <p className="text-xs text-gray-400 mt-1">AIが電話口で名乗る名前です</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: 受電/発信設定 */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">電話対応の詳細設定</h2>

              {/* 受電設定 */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-800 border-b pb-2">📞 受電設定</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    どんな電話を受けますか？ <span className="text-red-500">*</span>
                  </label>
                  <textarea value={inboundPurpose} onChange={e => setInboundPurpose(e.target.value)}
                    rows={2} placeholder="例：PAL端末の故障受付、来店予約の受付、商品に関する問い合わせ対応"
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">よくある質問と対応方法</label>
                  <textarea value={inboundFaq} onChange={e => setInboundFaq(e.target.value)}
                    rows={3} placeholder="例：&#10;Q: 営業時間は？ → 平日9〜18時と案内&#10;Q: 修理依頼 → 症状を聞いてチケット番号を発行"
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当者に転送する条件</label>
                  <input value={inboundTransfer} onChange={e => setInboundTransfer(e.target.value)}
                    placeholder="例：クレーム、緊急対応、契約に関する相談"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* 発信設定（bothの場合のみ） */}
              {mode === 'both' && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-800 border-b pb-2">📤 発信設定</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">発信目的</label>
                    <input value={outboundPurpose} onChange={e => setOutboundPurpose(e.target.value)}
                      placeholder="例：アポイント確認、リマインド、フォローアップ"
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">発信対象</label>
                    <input value={outboundTarget} onChange={e => setOutboundTarget(e.target.value)}
                      placeholder="例：予約済み顧客、見込み客、既存顧客"
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">トークの流れ</label>
                    <textarea value={outboundFlow} onChange={e => setOutboundFlow(e.target.value)}
                      rows={2} placeholder="例：①自己紹介 → ②予約確認 → ③変更希望があればメモ → ④お礼で締め"
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: 声の選択 */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">AIの声を選んでください</h2>
              <p className="text-gray-500 text-sm">お客様が聞く声です。サービスのイメージに合う声を選択してください。</p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {voices.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">声データを読み込み中...</p>
                )}
                {voices.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`w-full p-3 border-2 rounded-xl text-left transition-all flex items-center justify-between ${
                      selectedVoice === v.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {v.gender === 'female' ? '女性' : v.gender === 'male' ? '男性' : ''}
                      </p>
                    </div>
                    {selectedVoice === v.id && (
                      <span className="text-blue-500 text-lg">✓</span>
                    )}
                  </button>
                ))}
                {/* デフォルト候補 */}
                {[
                  { id: 'ja-JP-NanamiNeural', name: '七海（女性・落ち着いた声）', gender: 'female' },
                  { id: 'ja-JP-KeitaNeural', name: '圭太（男性・信頼感のある声）', gender: 'male' },
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`w-full p-3 border-2 rounded-xl text-left transition-all flex items-center justify-between ${
                      selectedVoice === v.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{v.gender === 'female' ? '女性' : '男性'}</p>
                    </div>
                    {selectedVoice === v.id && <span className="text-blue-500 text-lg">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: AIスクリプト確認・編集 */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">AIが生成したトークスクリプト</h2>
              <p className="text-gray-500 text-sm">入力した情報をもとにAIがスクリプトを作成しました。内容を確認・編集できます。</p>
              <textarea
                value={editedScript}
                onChange={e => setEditedScript(e.target.value)}
                rows={14}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-y"
                placeholder="スクリプトを読み込んでいます..."
              />
              <p className="text-xs text-gray-400">このスクリプトはAIエージェントの行動指示になります。後から管理画面で変更できます。</p>
            </div>
          )}

          {/* Step 6: 開始確認 */}
          {step === 6 && (
            <div className="space-y-5 text-center">
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900">設定が完了しました！</h2>
              <p className="text-gray-500 text-sm">
                AIエージェント「{agentName}」が{companyName}の{serviceName}として
                お客様の電話に対応できるよう設定されました。
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">会社名</span><span className="font-medium">{companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">エージェント名</span><span className="font-medium">{agentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">運用モード</span>
                  <span className="font-medium">{mode === 'inbound' ? '受電専門' : '受発信両方'}</span>
                </div>
              </div>
              {error && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'AIエージェントを設定中...' : 'AIエージェントを開始する'}
              </button>
            </div>
          )}
        </div>

        {/* ナビゲーション */}
        {step < 6 && (
          <div className="px-8 pb-8 flex justify-between items-center">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm disabled:opacity-30"
            >
              ← 戻る
            </button>

            {step === 4 ? (
              <button
                onClick={handleGenerate}
                disabled={generating || !canNextStep()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="animate-spin">⏳</span> AIがスクリプトを生成中...
                  </>
                ) : 'AIでスクリプトを生成 →'}
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNextStep()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                次へ →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
