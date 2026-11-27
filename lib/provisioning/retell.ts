import Retell from 'retell-sdk'

function getClient() {
  return new Retell({ apiKey: process.env.RETELL_API_KEY! })
}

/** Retell LLM を作成 */
export async function createRetellLlm(
  tenantName: string,
  prompt: string
): Promise<{ llm_id: string }> {
  const retell = getClient()
  const llm = await retell.llm.create({
    model: 'gpt-4.1',
    general_prompt: prompt,
    general_tools: [],
  })
  return { llm_id: llm.llm_id }
}

/** Retell エージェントを作成 */
export async function createRetellAgent(
  agentName: string,
  llmId: string
): Promise<{ agent_id: string }> {
  const retell = getClient()
  const agent = await retell.agent.create({
    agent_name: agentName,
    response_engine: { type: 'retell-llm', llm_id: llmId },
    voice_id: 'ja-JP-NanamiNeural',
    language: 'ja-JP',
    interruption_sensitivity: 0.8,
    end_call_after_silence_ms: 15000,
    enable_backchannel: true,
  })
  return { agent_id: agent.agent_id }
}

/** 電話番号をRetell AIにインポート */
export async function importPhoneNumberToRetell(
  phoneNumber: string,
  agentId: string,
  terminationUri: string
): Promise<void> {
  const retell = getClient()
  await retell.phoneNumber.import({
    phone_number: phoneNumber,
    inbound_agents: [{ agent_id: agentId, weight: 1 }],
    termination_uri: terminationUri,
  })
}

/** 電話番号に着信webhook(call_inbound)を設定。着信ごとにdynamic_variables等を動的に注入するために使う */
export async function setInboundWebhook(
  phoneNumber: string,
  webhookUrl: string
): Promise<void> {
  const retell = getClient()
  await retell.phoneNumber.update(phoneNumber, {
    inbound_webhook_url: webhookUrl,
  })
}

/** プロンプトを更新 */
export async function updateAgentPrompt(
  llmId: string,
  prompt: string
): Promise<void> {
  const retell = getClient()
  await retell.llm.update(llmId, { general_prompt: prompt })
}

/** エージェントを削除（ロールバック用） */
export async function deleteRetellAgent(agentId: string): Promise<void> {
  const retell = getClient()
  await retell.agent.delete(agentId)
}

/** LLMを削除（ロールバック用） */
export async function deleteRetellLlm(llmId: string): Promise<void> {
  const retell = getClient()
  await retell.llm.delete(llmId)
}

/** LLM情報を取得 */
export async function getRetellLlm(llmId: string) {
  const retell = getClient()
  return await retell.llm.retrieve(llmId)
}

const TRANSFER_TOOL_NAME = 'transfer_call'

export interface TransferSetting {
  enabled: boolean
  phoneNumber?: string
  /** 転送する条件(人間が読む説明文。AIがこの条件を見て転送するかどうかを判断する) */
  condition?: string
}

/** 現在設定されている電話転送(transfer_callツール)の内容を取得 */
export async function getAgentTransferSetting(llmId: string): Promise<TransferSetting> {
  const retell = getClient()
  const llm = await retell.llm.retrieve(llmId)
  const tool = ((llm as any).general_tools ?? []).find((t: any) => t.name === TRANSFER_TOOL_NAME)
  if (!tool) return { enabled: false }
  return {
    enabled: true,
    phoneNumber: tool.transfer_destination?.number,
    condition: tool.description,
  }
}

/** 電話転送(transfer_callツール)の有効/無効・転送先・条件を設定。他のツール(end_call等)は変更しない */
export async function updateAgentTransferSetting(llmId: string, setting: TransferSetting): Promise<void> {
  const retell = getClient()
  const llm = await retell.llm.retrieve(llmId)
  const existingTools: any[] = ((llm as any).general_tools ?? []).filter((t: any) => t.name !== TRANSFER_TOOL_NAME)

  const tools = [...existingTools]
  if (setting.enabled) {
    if (!setting.phoneNumber) throw new Error('転送を有効にする場合は転送先の電話番号が必要です')
    tools.push({
      type: 'transfer_call',
      name: TRANSFER_TOOL_NAME,
      description: setting.condition || 'お客様の用件が、人による対応が必要だと判断した場合に呼ぶ。',
      transfer_destination: { type: 'predefined', number: setting.phoneNumber },
      transfer_option: {
        type: 'warm_transfer',
        private_handoff_option: {
          type: 'prompt',
          prompt: 'この通話でお客様から伺った内容を、電話口の相手に簡潔に伝えてください。そのうえで「つないでいい?」と確認してください。',
        },
        enable_bridge_audio_cue: true,
        on_hold_music: 'relaxing_sound',
      },
      speak_after_execution: true,
    })
  }

  await retell.llm.update(llmId, { general_tools: tools })
}
