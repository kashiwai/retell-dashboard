import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Retell from 'retell-sdk'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export interface OnboardingData {
  mode: 'inbound' | 'both'          // 受電専門 or 受発信両方
  companyName: string
  serviceName: string
  industry: string
  agentName: string
  // 受電設定
  inbound?: {
    purpose: string                   // 何の受付か
    faq: string                       // よくある質問・対応フロー
    transferCondition: string         // 転送する条件
  }
  // 発信設定
  outbound?: {
    purpose: string                   // 発信目的
    targetAudience: string            // 発信対象
    talkFlow: string                  // トークの流れ
  }
  voiceId: string
  generatedScript?: string           // AI生成済みスクリプト（プレビュー確認後）
}

// スクリプト生成のみ（プレビュー用）
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: tenantUser } = await admin
    .from('tenant_users').select('tenant_id').eq('user_id', user.id).single()
  if (!tenantUser) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: tenant } = await admin
    .from('tenants').select('id, llm_id, agent_id').eq('id', tenantUser.tenant_id).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const body: OnboardingData & { action: 'generate' | 'save' } = await request.json()

  if (body.action === 'generate') {
    // AIによるトークスクリプト生成
    const script = await generateScript(body)
    return NextResponse.json({ script })
  }

  if (body.action === 'save') {
    // 最終確定：Retell LLM・エージェントを更新し、オンボーディング完了フラグをセット
    const script = body.generatedScript ?? await generateScript(body)

    // Retell LLM プロンプト更新
    if (tenant.llm_id && process.env.RETELL_API_KEY) {
      const retell = new Retell({ apiKey: process.env.RETELL_API_KEY })
      await retell.llm.update(tenant.llm_id, { general_prompt: script })

      // エージェントの音声を更新
      if (tenant.agent_id) {
        await retell.agent.update(tenant.agent_id, { voice_id: body.voiceId })
      }
    }

    // テナントにオンボーディング完了を記録
    await admin.from('tenants').update({
      onboarding_completed: true,
      onboarding_data: body as unknown as Record<string, unknown>,
    }).eq('id', tenant.id)

    return NextResponse.json({ success: true, script })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

async function generateScript(data: OnboardingData): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackScript(data)
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const inboundSection = data.inbound ? `
【受電設定】
- 受付の目的：${data.inbound.purpose}
- よくある問い合わせ・対応フロー：${data.inbound.faq}
- 転送条件：${data.inbound.transferCondition}` : ''

  const outboundSection = data.outbound ? `
【発信設定】
- 発信目的：${data.outbound.purpose}
- 発信対象：${data.outbound.targetAudience}
- トークの流れ：${data.outbound.talkFlow}` : ''

  const modeLabel = data.mode === 'inbound' ? '受電専門' : '受発信両方'

  const prompt = `
以下の情報をもとに、Retell AI用の日本語音声AIエージェントのシステムプロンプトを生成してください。

【基本情報】
- 会社名：${data.companyName}
- サービス名：${data.serviceName}
- 業種：${data.industry}
- AIエージェント名（AIが名乗る名前）：${data.agentName}
- 運用モード：${modeLabel}
${inboundSection}
${outboundSection}

【要件】
- 日本語で丁寧かつ自然に話すプロンプトを作成
- エージェントの人格・話し方・役割を明確に定義
- 対応できること・できないことを明示
- 転送や折り返しが必要な場合の判断基準を含める
- プロンプトはRetell AIのgeneral_promptとして直接使えるフォーマット（指示文ではなくエージェント自身への設定として記述）

プロンプトのみを出力してください（説明文は不要）。
`.trim()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
  })

  return response.choices[0].message.content ?? buildFallbackScript(data)
}

function buildFallbackScript(data: OnboardingData): string {
  const inboundPurpose = data.inbound?.purpose ?? '各種お問い合わせ'
  return `あなたは${data.companyName}の${data.serviceName}を担当するAIアシスタント「${data.agentName}」です。

お客様からのお電話に対して、丁寧かつ迅速に対応することが役割です。

【基本的な対応方針】
- 最初に「お電話ありがとうございます。${data.companyName}、${data.agentName}でございます。」と挨拶してください
- ${inboundPurpose}に関するご案内を行います
- お客様の質問を丁寧に聞き、できる限り回答します
- 解決できない場合は「担当者より改めてご連絡いたします」と案内してください
- 通話終了時は「ありがとうございました。またお気軽にお電話ください。」と締めくくってください

【注意事項】
- 常に丁寧な敬語を使用してください
- 個人情報（氏名、電話番号、住所）は必要に応じて確認してください
- 緊急の場合は即時担当者に転送する旨を伝えてください`
}
