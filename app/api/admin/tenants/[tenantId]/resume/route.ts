import { createAdminClient } from '@/lib/supabase/admin'
import { resumePhoneNumber } from '@/lib/provisioning/twilio'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ tenantId: string }> }

// 停止中テナントのサービスを再開する
export async function POST(_: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, status, twilio_phone_sid, trunk_sid')
    .eq('id', tenantId)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tenant.status !== 'suspended') {
    return NextResponse.json({ error: 'このテナントは停止中ではありません' }, { status: 400 })
  }

  // Twilio 番号を SIP Trunk に再割り当て（着信再開）
  if (tenant.twilio_phone_sid && tenant.trunk_sid) {
    try {
      await resumePhoneNumber(tenant.twilio_phone_sid, tenant.trunk_sid)
      console.log(`[Resume] Tenant ${tenantId}: phone ${tenant.twilio_phone_sid} re-assigned to trunk.`)
    } catch (err) {
      console.error('[Resume] Twilio error:', err)
      return NextResponse.json({ error: 'Twilio番号の再割り当てに失敗しました' }, { status: 500 })
    }
  }

  // DB ステータスを active に戻す
  await admin.from('tenants').update({
    status: 'active',
    suspended_at: null,
  }).eq('id', tenantId)

  return NextResponse.json({ success: true })
}
