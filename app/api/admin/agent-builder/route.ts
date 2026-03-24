// /api/admin/agent-builder
// TSUNAGARI-AI エージェント自動構築API
// Step1: Claude claude-sonnet-4-6 でトークスクリプト生成
// Step2: Fish Audio / ElevenLabs 音声一覧取得
// Step3: Retell AI LLM(Claude) + エージェント自動作成 + 電話番号割り当て

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

function getRetellClient() {
  return new Retell({ apiKey: process.env.RETELL_API_KEY! });
}

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    switch (body.action) {
      case 'generate_script': return await generateScript(body);
      case 'list_voices':     return await listVoices();
      case 'create_agent':    return await createAgent(body);
      case 'list_llm_models': return await listLlmModels();
      default:
        return NextResponse.json({ error: '不明な action です' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('agent-builder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ───────────────────────────────────────────────
// STEP 1: Claude claude-sonnet-4-6 でトークスクリプトを生成
// ───────────────────────────────────────────────
async function generateScript(body: any) {
  const { company_name, industry, bullet_points, agent_persona } = body;

  if (!bullet_points?.length) {
    return NextResponse.json({ error: 'bullet_points が必要です' }, { status: 400 });
  }

  const anthropic = getAnthropicClient();

  const prompt = `あなたはRetell AIの日本語コールセンターAIエージェント設計の専門家です。
以下の情報をもとに、Retell AIに最適化されたシステムプロンプトを生成してください。

## 企業・サービス情報
- 会社名: ${company_name || '（未設定）'}
- 業種: ${industry || '（未設定）'}
- エージェント名/ペルソナ: ${agent_persona || '（未設定）'}

## このコールセンターでやりたいこと（箇条書き）
${bullet_points.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}

## 出力要件
以下のJSON形式のみで回答してください（説明文不要）：

\`\`\`json
{
  "agent_name": "エージェントの名前（例: 山田、白石など自然な日本人名）",
  "begin_message": "通話開始時の第一声（1文、40文字以内）",
  "general_prompt": "Retell AIシステムプロンプト全文（音声AIに最適化）",
  "key_info_to_collect": ["収集する情報1", "収集する情報2"],
  "escalation_triggers": ["人間転送すべきケース1", "ケース2"],
  "suggested_tools": ["end_call", "transfer_call"]
}
\`\`\`

## general_prompt の作成ガイドライン
- 音声AI向け：短い文、自然な会話口調
- 1回の発話は2文以内、50文字以内を推奨
- 情報収集 → 解決/転送 の明確なフロー
- 業種に合わせた専門用語・丁寧語を使用
- 冒頭に「# キャラクター設定」「# 主要タスク」「# 会話の流れ」「# 禁止事項」のセクションを含める`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Claudeからの応答が不正です' }, { status: 500 });
  }

  const jsonMatch = content.text.match(/```json\n([\s\S]+?)\n```/);
  if (!jsonMatch) {
    return NextResponse.json({ error: 'スクリプト生成失敗', raw: content.text }, { status: 500 });
  }

  try {
    const script = JSON.parse(jsonMatch[1]);
    return NextResponse.json({ success: true, script });
  } catch {
    return NextResponse.json({ error: 'JSONパース失敗', raw: content.text }, { status: 500 });
  }
}

// ───────────────────────────────────────────────
// STEP 2: 利用可能な音声一覧（ElevenLabs + Fish Audio）
// ───────────────────────────────────────────────
async function listVoices() {
  const retellClient = getRetellClient();
  try {
    const voices = await (retellClient as any).voice.list();
    const filtered = voices
      .filter((v: any) =>
        v.provider === 'fish_audio' || v.provider === 'elevenlabs'
      )
      .map((v: any) => ({
        voice_id: v.voice_id,
        voice_name: v.voice_name || v.name,
        provider: v.provider,
        gender: v.gender,
        accent: v.accent,
        preview_url: v.preview_audio_url || null,
      }));

    // 日本語対応を優先
    const sorted = [
      ...filtered.filter((v: any) =>
        v.accent?.toLowerCase().includes('japanese') ||
        v.voice_name?.includes('日本') ||
        v.voice_name?.match(/^(Tomoko|Sakura|Hana|Yuki|Kenji|Taro)/)
      ),
      ...filtered.filter((v: any) =>
        !v.accent?.toLowerCase().includes('japanese') &&
        !v.voice_name?.includes('日本') &&
        !v.voice_name?.match(/^(Tomoko|Sakura|Hana|Yuki|Kenji|Taro)/)
      ),
    ];
    return NextResponse.json({ voices: sorted.length ? sorted : FALLBACK_VOICES });
  } catch {
    return NextResponse.json({ voices: FALLBACK_VOICES });
  }
}

// Retell AIで確認済みの日本語対応推奨音声
const FALLBACK_VOICES = [
  { voice_id: '11labs-Tomoko',      voice_name: 'Tomoko（女性・丁寧）',         provider: 'elevenlabs', gender: 'female', preview_url: null },
  { voice_id: '11labs-Yuki',        voice_name: 'Yuki（女性・親しみやすい）',    provider: 'elevenlabs', gender: 'female', preview_url: null },
  { voice_id: '11labs-Sakura',      voice_name: 'Sakura（女性・柔らか）',        provider: 'elevenlabs', gender: 'female', preview_url: null },
  { voice_id: '11labs-Kenji',       voice_name: 'Kenji（男性・信頼感）',         provider: 'elevenlabs', gender: 'male',   preview_url: null },
  { voice_id: '11labs-Hana',        voice_name: 'Hana（女性・明るい）',          provider: 'elevenlabs', gender: 'female', preview_url: null },
  { voice_id: '11labs-Grace',       voice_name: 'Grace（多言語・落ち着き）',     provider: 'elevenlabs', gender: 'female', preview_url: null },
  { voice_id: 'fish_audio-japanese_female_01', voice_name: '日本語女性 01（Fish Audio）', provider: 'fish_audio', gender: 'female', preview_url: null },
  { voice_id: 'fish_audio-japanese_male_01',   voice_name: '日本語男性 01（Fish Audio）', provider: 'fish_audio', gender: 'male',   preview_url: null },
];

// ───────────────────────────────────────────────
// STEP 3: Retell AI に LLM(Claude) + エージェントを自動作成
// ───────────────────────────────────────────────
async function createAgent(body: any) {
  const { script, voice_id, phone_number, company_name, llm_model, calcom_config } = body;

  if (!script || !voice_id) {
    return NextResponse.json({ error: 'script と voice_id が必要です' }, { status: 400 });
  }

  const retellClient = getRetellClient();

  // Cal.com Function Call ツールを構築
  const calcomTools = calcom_config?.enabled
    ? buildCalcomTools(calcom_config)
    : [];

  // 1. Retell LLM を作成（選択モデル、デフォルトはClaude Sonnet 4.6）
  const llm = await (retellClient as any).llm.create({
    model: llm_model || 'claude-4.5-sonnet',
    general_prompt: script.general_prompt,
    begin_message: script.begin_message,
    general_tools: [...buildTools(script.suggested_tools || []), ...calcomTools],
    model_temperature: 0.3,
  });

  // 2. エージェントを作成
  const agentParams: any = {
    agent_name: `${script.agent_name || 'AIエージェント'} - ${company_name || 'TSUNAGARI-AI'}`,
    voice_id,
    voice_model: voice_id.startsWith('11labs-') ? 'eleven_turbo_v2_5' : undefined,
    language: 'ja-JP',
    response_engine: {
      type: 'retell-llm',
      llm_id: llm.llm_id,
    },
    // 日本語通話最適化
    enable_backchannel: true,
    backchannel_frequency: 0.7,
    backchannel_words: ['はい', 'ええ', 'そうですね', 'なるほど', 'かしこまりました'],
    voice_speed: 1.0,
    voice_temperature: 0.5,
    interruption_sensitivity: 0.8,
    enable_recording: true,
    // 通話後の自動分析（収集情報のマッピング）
    post_call_analysis_data: (script.key_info_to_collect || []).map((item: string, i: number) => ({
      name: `field_${i + 1}`,
      description: item,
      type: 'string',
    })),
    webhook_url: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/retell`
      : undefined,
  };

  const agent = await retellClient.agent.create(agentParams);

  // 3. 電話番号を割り当て（指定があれば）
  let phoneAssignment: any = null;
  if (phone_number) {
    try {
      await retellClient.phoneNumber.update(phone_number, {
        inbound_agent_id: agent.agent_id,
        nickname: `${script.agent_name} (${company_name || 'TSUNAGARI-AI'})`,
      });
      phoneAssignment = { phone_number, assigned: true };
    } catch (err: any) {
      phoneAssignment = { phone_number, assigned: false, error: err.message };
    }
  }

  return NextResponse.json({
    success: true,
    agent_id: agent.agent_id,
    agent_name: agent.agent_name,
    llm_id: llm.llm_id,
    voice_id: agent.voice_id,
    phone_assignment: phoneAssignment,
    message: 'エージェントの自動作成が完了しました',
  });
}

// ───────────────────────────────────────────────
// LLMモデル一覧（Claude + OpenAI）
// ───────────────────────────────────────────────
async function listLlmModels() {
  return NextResponse.json({
    models: [
      {
        id: 'claude-4.5-sonnet',
        label: 'Claude Sonnet 4.6（推奨）',
        provider: 'anthropic',
        description: '日本語の自然さ・共感力が最高。コールセンター最適',
        recommended: true,
      },
      {
        id: 'claude-4.5-haiku',
        label: 'Claude Haiku 4.5（高速・低コスト）',
        provider: 'anthropic',
        description: '速度重視・シンプルな受付業務向け',
        recommended: false,
      },
      {
        id: 'gpt-4.1',
        label: 'GPT-4.1',
        provider: 'openai',
        description: 'Function Call精度が高い。複雑なシステム連携向け',
        recommended: false,
      },
      {
        id: 'gpt-4.1-mini',
        label: 'GPT-4.1 mini（低コスト）',
        provider: 'openai',
        description: 'コスト削減・高頻度の単純問い合わせ向け',
        recommended: false,
      },
    ],
  });
}

// Cal.com 予約ツール（Retell Function Call形式）
function buildCalcomTools(config: { api_key: string; event_type_id: string; app_url: string }): any[] {
  const webhookBase = config.app_url || process.env.NEXT_PUBLIC_APP_URL || '';
  return [
    {
      type: 'custom',
      name: 'check_available_slots',
      description: 'カレンダーの空き時間を確認する。お客様が日程を聞いてきたときに使用。',
      speak_during_execution: true,
      speak_after_execution: true,
      execution_message_description: '少々お待ちください、空き時間を確認します。',
      url: `${webhookBase}/api/calcom/slots`,
      method: 'POST' as const,
      parameters: {
        type: 'object' as const,
        properties: {
          requested_date: {
            type: 'string',
            description: 'お客様が希望する日付（例: 2026-04-01）',
          },
        },
        required: ['requested_date'],
      },
      headers: [{ key: 'x-cal-api-key', value: config.api_key }],
    },
    {
      type: 'custom',
      name: 'book_appointment',
      description: '予約を確定する。お客様の名前・日時が揃ったときに使用。',
      speak_during_execution: true,
      speak_after_execution: true,
      execution_message_description: '予約を確定しています。少々お待ちください。',
      url: `${webhookBase}/api/calcom/book`,
      method: 'POST' as const,
      parameters: {
        type: 'object' as const,
        properties: {
          customer_name:  { type: 'string', description: 'お客様の名前' },
          customer_email: { type: 'string', description: 'お客様のメールアドレス' },
          start_time:     { type: 'string', description: '予約開始時刻（ISO 8601形式）' },
          notes:          { type: 'string', description: '備考・問い合わせ内容' },
        },
        required: ['customer_name', 'start_time'],
      },
      headers: [{ key: 'x-cal-api-key', value: config.api_key }],
    },
  ];
}

function buildTools(toolNames: string[]): any[] {
  const defs: Record<string, any> = {
    end_call: {
      type: 'end_call',
      name: 'end_call',
      description: '用件が解決した、またはお客様が電話を切りたいときに会話を終了する。',
    },
    transfer_call: {
      type: 'transfer_call',
      name: 'transfer_call',
      description: '人間オペレーターへ転送。複雑な問題・クレーム・緊急の場合。',
      transfer_destination: {
        type: 'phone_number',
        number: process.env.ESCALATION_PHONE_NUMBER || '',
        message: '担当者におつなぎします。少々お待ちください。',
      },
    },
  };
  return toolNames.filter(n => defs[n]).map(n => defs[n]);
}
