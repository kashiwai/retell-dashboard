#!/usr/bin/env node
// 出張マッサージ受付デモ用 Retell LLM + Agent を作成するスクリプト
// 実行: node scripts/setup-health-demo.mjs

import 'dotenv/config'

const RETELL_API_KEY = process.env.RETELL_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://retell-dashboard-opal.vercel.app'

if (!RETELL_API_KEY) {
  console.error('RETELL_API_KEY が設定されていません')
  process.exit(1)
}

async function retell(method, path, body) {
  const res = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Retell API error: ${JSON.stringify(data)}`)
  return data
}

// ────────────────────────────────────────────
// Retell LLM 作成
// ────────────────────────────────────────────
const llmPrompt = `あなたは「TSUNAGARU HEALTH」という出張マッサージサービスの受付AIアシスタント「ひな」です。

## あなたの役割
お客様からの電話を受けて、以下の対応を行います：
1. 今すぐ対応可能なセラピストをご案内
2. セラピストの詳細プロフィールをご説明
3. コース・料金・オプションの説明
4. ご予約の受付

## 対応の流れ
1. 明るく丁寧に挨拶する
2. 「今すぐ来てほしい」か「時間指定」かを確認
3. check_availabilityで空き状況を確認してご案内
4. セラピストについて聞かれたらget_therapist_infoで詳細を説明
5. お客様がご希望のセラピスト・コース・オプションを決めたら
6. お名前・ご連絡先・ご住所を確認
7. confirm_bookingで予約を確定

## 料金体系
- 60分コース: ¥8,000
- 90分コース: ¥12,000
- 120分コース: ¥15,000
- 150分コース: ¥18,000
オプション：アロマ+¥1,000 / ヘッドスパ+¥1,500 / ホットストーン+¥2,000 / ストレッチ+¥1,000

## 接客スタイル
- 明るく親しみやすい丁寧語
- お客様の好みをさりげなく引き出す
- セラピストの魅力を自然に伝える
- 押しつけがましくなく、でも積極的にご案内

## 注意事項
- 完全プライベート出張、ホテル・自宅OK
- 対応エリア：都内全域
- 支払いは現金のみ
- キャンセルは1時間前まで無料`

const llmFunctions = [
  {
    name: 'check_availability',
    description: '現在対応可能なセラピスト一覧と料金を取得します。お客様から空き確認や誰がいるか聞かれたら呼び出してください。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    url: `${APP_URL}/api/health-demo/therapists`,
    speak_during_execution: true,
    execution_message_description: 'セラピストの空き状況を確認しています...',
  },
  {
    name: 'get_therapist_info',
    description: '特定のセラピストの詳細プロフィールを取得します。セラピストについて詳しく聞かれたら呼び出してください。',
    parameters: {
      type: 'object',
      properties: {
        therapist_id: {
          type: 'string',
          description: 'セラピストID（sakura/miku/aoi/yui）または名前',
        },
      },
      required: ['therapist_id'],
    },
    url: `${APP_URL}/api/health-demo/therapists`,
    speak_during_execution: true,
    execution_message_description: 'セラピストの情報を確認しています...',
  },
  {
    name: 'confirm_booking',
    description: '予約を確定します。お客様の情報とご希望が全て揃ったら呼び出してください。',
    parameters: {
      type: 'object',
      properties: {
        therapist_id: { type: 'string', description: 'セラピストID' },
        course_id: {
          type: 'string',
          enum: ['60min', '90min', '120min', '150min'],
          description: 'コースID',
        },
        option_ids: {
          type: 'array',
          items: { type: 'string', enum: ['aroma', 'headspa', 'hotstone', 'stretch'] },
          description: '選択したオプションのID一覧',
        },
        customer_name: { type: 'string', description: 'お客様のお名前' },
        customer_phone: { type: 'string', description: 'お客様のご連絡先電話番号' },
        address: { type: 'string', description: '施術場所（住所またはホテル名・部屋番号）' },
        scheduled_time: { type: 'string', description: '施術希望時間（「今すぐ」または「18:00」など）' },
        notes: { type: 'string', description: 'その他備考（体の悩み・ご要望など）' },
      },
      required: ['therapist_id', 'course_id', 'customer_name', 'customer_phone', 'address', 'scheduled_time'],
    },
    url: `${APP_URL}/api/health-demo/booking`,
    speak_during_execution: true,
    execution_message_description: 'ご予約を確定しています...',
  },
]

async function main() {
  console.log('🔧 TSUNAGARU HEALTH デモエージェントをセットアップ中...\n')

  // LLM作成
  console.log('① Retell LLM を作成中...')
  const llm = await retell('POST', '/create-retell-llm', {
    general_prompt: llmPrompt,
    general_tools: llmFunctions.map(f => ({
      type: 'end_call',  // functionsとしてではなくtoolsとして定義
      ...f,
    })),
    // 実際はfunctionsとして定義
  })

  // LLM作成 - 正しい形式
  const llmData = await retell('POST', '/create-retell-llm', {
    general_prompt: llmPrompt,
  })
  console.log(`   ✅ LLM作成: ${llmData.llm_id}`)

  // Agent作成
  console.log('② Retell Agent を作成中...')
  const agentData = await retell('POST', '/create-agent', {
    llm_websocket_url: `wss://api.retellai.com/retell-llm-new/websocket/${llmData.llm_id}`,
    agent_name: 'TSUNAGARU HEALTH 受付 (ひな)',
    voice_id: 'custom_voice_843d31856173f3bb556a1bfac2',
    language: 'ja-JP',
    response_engine: {
      type: 'retell-llm',
      llm_id: llmData.llm_id,
    },
    webhook_url: `${APP_URL}/api/webhook/retell`,
    interruption_sensitivity: 0.8,
  })
  console.log(`   ✅ Agent作成: ${agentData.agent_id}`)

  // LLMにfunctionsを追加
  console.log('③ LLMにFunction toolsを追加中...')
  await retell('PATCH', `/update-retell-llm/${llmData.llm_id}`, {
    general_tools: llmFunctions.map(f => ({
      type: 'custom',
      name: f.name,
      description: f.description,
      url: f.url,
      parameters: f.parameters,
      speak_during_execution: f.speak_during_execution,
      execution_message_description: f.execution_message_description,
    })),
  })
  console.log('   ✅ Functionsを設定しました')

  console.log('\n✅ セットアップ完了！')
  console.log(`\n📋 設定情報:`)
  console.log(`   LLM ID: ${llmData.llm_id}`)
  console.log(`   Agent ID: ${agentData.agent_id}`)
  console.log(`\nRetellダッシュボードで電話番号にこのAgentを割り当ててください。`)
  console.log(`Agent ID: ${agentData.agent_id}`)
}

main().catch(console.error)
