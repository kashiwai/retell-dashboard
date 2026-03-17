'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function PromptEditPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [llmId, setLlmId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const tenantRes = await fetch(`/api/admin/tenants/${tenantId}`)
      const tenant = await tenantRes.json()
      if (!tenant.llm_id) { setLoading(false); return }
      setLlmId(tenant.llm_id)
      const llmRes = await fetch(`/api/llm/${tenant.llm_id}`)
      const llm = await llmRes.json()
      setPrompt(llm.general_prompt ?? '')
      setLoading(false)
    }
    load()
  }, [tenantId])

  const handleSave = async () => {
    if (!llmId) return
    setSaving(true)
    const res = await fetch(`/api/llm/${llmId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ general_prompt: prompt }),
    })
    setMsg(res.ok ? '保存しました' : '保存に失敗しました')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/admin/tenants/${tenantId}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← テナント詳細
        </Link>
        <h1 className="text-xl font-bold text-gray-900">AIプロンプト編集</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {!llmId ? (
          <div className="bg-yellow-50 text-yellow-800 rounded-xl p-6">
            このテナントはまだプロビジョニングされていません。
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                システムプロンプト（Retell AI LLM: {llmId}）
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={30}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="AIエージェントの振る舞いを定義するプロンプトを入力してください..."
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : 'Retell AIに保存'}
              </button>
              {msg && (
                <span className={`text-sm ${msg.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>
                  {msg}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              保存後、次の通話から新しいプロンプトが適用されます。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
