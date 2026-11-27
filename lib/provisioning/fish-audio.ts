// Fish Audio(https://fish.audio)のエージェント・電話番号プロビジョニング用ヘルパー。
// Retell AI(lib/provisioning/retell.ts)と同じ役割を、Fish Audio向けに提供する。
// 利用には環境変数 FISH_AUDIO_API_KEY が必要。

const FISH_API_BASE = 'https://api.fish.audio/v1/agent'

function getApiKey(): string {
  const key = process.env.FISH_AUDIO_API_KEY
  if (!key) throw new Error('FISH_AUDIO_API_KEY が設定されていません')
  return key
}

async function fishFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${FISH_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Fish Audio API error ${res.status}: ${body}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : {}
}

/** Fish Audioエージェントを作成(ドラフト状態。公開はpublishFishAgentで別途行う) */
export async function createFishAgent(
  agentName: string,
  systemPrompt: string,
  voiceId: string
): Promise<{ agent_id: string }> {
  const res = await fishFetch('/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: agentName,
      config: {
        prompt: { system_prompt: systemPrompt },
        voice: { voice_id: voiceId },
      },
    }),
  })
  return { agent_id: res.id || res.agent_id }
}

/** ドラフトのエージェント設定を公開(session実行にはこれが必須) */
export async function publishFishAgent(agentId: string): Promise<void> {
  await fishFetch(`/agents/${agentId}/publish`, { method: 'POST' })
}

/** エージェントのWebhook(通話終了・分析完了イベント送信先)を設定。最大5件、置き換え形式。 */
export async function setFishAgentWebhook(
  agentId: string,
  webhookUrl: string,
  secret?: string
): Promise<void> {
  await fishFetch(`/agents/${agentId}/config`, {
    method: 'PATCH',
    body: JSON.stringify({
      webhooks: {
        post_call: [{ url: webhookUrl, ...(secret ? { secret } : {}) }],
      },
    }),
  })
}

// TwilioのSIPシグナリング用IPアドレス範囲(全リージョン)。
// Twilioからの着信だけをFish Audio側で受け付けるための許可リストに使う。
// 参照: https://www.twilio.com/docs/sip-trunking/ip-addresses
export const TWILIO_SIGNALING_IP_RANGES = [
  '54.172.60.0/30', '54.244.51.0/30', // 北米(バージニア/オレゴン)
  '54.171.127.192/30', '35.156.191.128/30', // 欧州(アイルランド/フランクフルト)
  '54.65.63.192/30', '54.169.127.128/30', '54.252.254.64/30', // アジア太平洋(東京/シンガポール/シドニー)
  '177.71.206.192/30', // 南米(サンパウロ)
]

/**
 * 既存のTwilio電話番号をSIPトランク経由でFish Audioにインポートし、エージェントに紐付ける。
 * 日本の050番号での動作確認済み(2026-11-26、050-1793-9835で実施)。
 * Twilio側は別途、新しいSIP Trunkを作成し、Origination URLに
 * sip:1pv316az391.sip.livekit.cloud;transport=tcp を設定したうえで、この番号をそのTrunkに移す必要がある。
 */
export async function importPhoneNumberToFishAudio(params: {
  phoneNumber: string
  /** 未指定ならFISH_AUDIO_SIP_USERNAME(Twilio側に作成済みの専用認証情報)を使う */
  inboundAuthUsername?: string
  /** 未指定ならFISH_AUDIO_SIP_PASSWORD(Twilio側に作成済みの専用認証情報)を使う */
  inboundAuthPassword?: string
  agentId?: string
}): Promise<{ phone_number_id: string }> {
  const authUsername = params.inboundAuthUsername || process.env.FISH_AUDIO_SIP_USERNAME
  const authPassword = params.inboundAuthPassword || process.env.FISH_AUDIO_SIP_PASSWORD
  const res = await fishFetch('/phone-numbers', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'sip',
      phone_number: params.phoneNumber,
      inbound_auth_username: authUsername,
      inbound_auth_password: authPassword,
      inbound_allowed_addresses: TWILIO_SIGNALING_IP_RANGES,
      ...(params.agentId ? { agent_id: params.agentId } : {}),
    }),
  })
  return { phone_number_id: res.phone_number_id }
}

/** 電話番号に紐付けるエージェントを変更 */
export async function bindFishPhoneNumber(phoneNumberId: string, agentId: string): Promise<void> {
  await fishFetch(`/phone-numbers/${phoneNumberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ agent_id: agentId }),
  })
}

/** エージェントの現在の設定(台本=system_prompt含む)を取得 */
export async function getFishAgentConfig(agentId: string): Promise<any> {
  return fishFetch(`/agents/${agentId}/config`, { method: 'GET' })
}

/** エージェントの台本(system_prompt)だけを更新して公開する */
export async function updateFishAgentPrompt(agentId: string, systemPrompt: string): Promise<void> {
  await fishFetch(`/agents/${agentId}/config`, {
    method: 'PATCH',
    body: JSON.stringify({ prompt: { system_prompt: systemPrompt } }),
  })
  await publishFishAgent(agentId)
}
