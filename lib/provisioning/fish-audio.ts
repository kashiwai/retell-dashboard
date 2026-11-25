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

/**
 * 既存のTwilio電話番号をSIPトランク経由でFish Audioにインポートし、エージェントに紐付ける。
 * 日本の050番号での動作は未確認(ドキュメントに+81の明記なし)。本番投入前に実機で要確認。
 */
export async function importPhoneNumberToFishAudio(params: {
  phoneNumber: string
  terminationUri: string
  terminationAuthUsername?: string
  terminationAuthPassword?: string
  agentId?: string
}): Promise<{ phone_number_id: string }> {
  const res = await fishFetch('/phone-numbers', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'sip',
      phone_number: params.phoneNumber,
      termination_uri: params.terminationUri,
      termination_auth_username: params.terminationAuthUsername,
      termination_auth_password: params.terminationAuthPassword,
      ...(params.agentId ? { agent_id: params.agentId } : {}),
    }),
  })
  return { phone_number_id: res.id || res.phone_number_id }
}

/** 電話番号に紐付けるエージェントを変更 */
export async function bindFishPhoneNumber(phoneNumberId: string, agentId: string): Promise<void> {
  await fishFetch(`/phone-numbers/${phoneNumberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ agent_id: agentId }),
  })
}
