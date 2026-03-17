import { createAdminClient } from '@/lib/supabase/admin'
import {
  searchAvailable050Numbers, purchasePhoneNumber, createElasticSipTrunk,
  addOriginationUri, assignNumberToTrunk, releasePhoneNumber, deleteTrunk,
  getTrunkTerminationUri,
} from '@/lib/provisioning/twilio'
import {
  createRetellLlm, createRetellAgent, importPhoneNumberToRetell,
  deleteRetellAgent, deleteRetellLlm,
} from '@/lib/provisioning/retell'
import { buildTenantPrompt } from '@/lib/provisioning/pal-default-prompt'
import { NextRequest, NextResponse } from 'next/server'

const LIVEKIT_SIP_URI = process.env.LIVEKIT_SIP_URI || 'sip:5t4n6j0wnrl.sip.livekit.cloud;transport=tcp'

type Params = { params: Promise<{ tenantId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const body = await req.json().catch(() => ({}))
  // 既存番号を使う場合は body.existing_phone_number を指定
  const existingPhoneNumber: string | null = body.existing_phone_number ?? null

  const admin = createAdminClient()

  const { data: tenant, error: tenantError } = await admin
    .from('tenants').select('*').eq('id', tenantId).single()
  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 })
  }
  if (tenant.status === 'active') {
    return NextResponse.json({ error: '既にプロビジョニング済みです' }, { status: 400 })
  }

  await admin.from('tenants').update({ status: 'provisioning' }).eq('id', tenantId)

  let phoneNumberSid: string | null = null
  let trunkSid: string | null = null
  let llmId: string | null = null
  let agentId: string | null = null
  let purchasedPhoneNumber: string | null = null
  let isExistingNumber = false

  try {
    // Step 1: 電話番号の取得（既存 or 新規購入）
    if (existingPhoneNumber) {
      // 既存番号を使用（Twilioの番号SIDを検索）
      isExistingNumber = true
      purchasedPhoneNumber = existingPhoneNumber
      // 既存番号の場合はSIDをTwilioから取得（trunk設定のため）
      const twilio = (await import('twilio')).default
      const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
      const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: existingPhoneNumber })
      if (!numbers.length) throw new Error(`番号 ${existingPhoneNumber} がTwilioアカウントに見つかりません`)
      phoneNumberSid = numbers[0].sid
    } else {
      // 新規購入
      const available = await searchAvailable050Numbers(1)
      if (!available.length) throw new Error('利用可能な050番号が見つかりません')
      const purchased = await purchasePhoneNumber(available[0].phoneNumber)
      phoneNumberSid = purchased.sid
      purchasedPhoneNumber = purchased.phoneNumber
    }

    await admin.from('tenants').update({
      phone_number: purchasedPhoneNumber,
      twilio_phone_sid: phoneNumberSid,
    }).eq('id', tenantId)

    // Step 2: Elastic SIP Trunk作成
    const trunk = await createElasticSipTrunk(`${tenant.company_name} - AI電話受付`)
    trunkSid = trunk.sid
    await admin.from('tenants').update({ trunk_sid: trunk.sid }).eq('id', tenantId)

    // Step 3: Origination URI設定（Retell AI LiveKit）
    await addOriginationUri(trunk.sid, LIVEKIT_SIP_URI)

    // Step 4: 番号をSIP Trunkに紐付け
    await assignNumberToTrunk(trunk.sid, phoneNumberSid!)

    // Step 5: Retell LLM作成（PALデフォルトプロンプト）
    const prompt = buildTenantPrompt(tenant.company_name)
    const llm = await createRetellLlm(tenant.company_name, prompt)
    llmId = llm.llm_id
    await admin.from('tenants').update({ llm_id: llm.llm_id }).eq('id', tenantId)

    // Step 6: Retell エージェント作成
    const agent = await createRetellAgent(`${tenant.company_name} AI受付`, llm.llm_id)
    agentId = agent.agent_id
    await admin.from('tenants').update({ agent_id: agent.agent_id }).eq('id', tenantId)

    // Step 7: Retell AIに番号をインポート
    const terminationUri = getTrunkTerminationUri(trunk.sid)
    await importPhoneNumberToRetell(purchasedPhoneNumber!, agent.agent_id, terminationUri)

    // Step 8: アクティブ化
    await admin.from('tenants').update({
      status: 'active',
      billing_start_date: new Date().toISOString(),
    }).eq('id', tenantId)

    // Step 9: テナントユーザーをSupabase Authに招待
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import('@supabase/supabase-js')
      const authAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      const { data: inviteData } = await authAdmin.auth.admin.inviteUserByEmail(tenant.email, {
        data: { name: tenant.contact_person, role: 'tenant' },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      })
      if (inviteData?.user) {
        await admin.from('tenant_users').insert({
          user_id: inviteData.user.id,
          tenant_id: tenantId,
          role: 'owner',
        })
      }
    }

    return NextResponse.json({
      success: true,
      phone_number: purchasedPhoneNumber,
      agent_id: agent.agent_id,
      llm_id: llm.llm_id,
      is_existing_number: isExistingNumber,
    })

  } catch (err) {
    console.error('Provisioning failed, rolling back:', err)
    if (agentId) await deleteRetellAgent(agentId).catch(console.error)
    if (llmId) await deleteRetellLlm(llmId).catch(console.error)
    if (trunkSid) await deleteTrunk(trunkSid).catch(console.error)
    if (phoneNumberSid && !isExistingNumber) await releasePhoneNumber(phoneNumberSid).catch(console.error)

    await admin.from('tenants').update({ status: 'pending' }).eq('id', tenantId)

    const message = err instanceof Error ? err.message : '不明なエラー'
    return NextResponse.json({ error: `プロビジョニング失敗: ${message}` }, { status: 500 })
  }
}
