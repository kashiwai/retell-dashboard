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
    inbound_agent_id: agentId,
    termination_uri: terminationUri,
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
