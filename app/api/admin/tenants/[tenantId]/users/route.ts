import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ tenantId: string }> }

// テナントのユーザー一覧取得
export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const admin = createAdminClient()

  const { data: tenantUsers, error } = await admin
    .from('tenant_users')
    .select('id, user_id, role, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // auth.users からメール・ステータスを取得
  const enriched = await Promise.all(
    (tenantUsers ?? []).map(async (tu) => {
      const { data: userData } = await admin.auth.admin.getUserById(tu.user_id)
      return {
        ...tu,
        email: userData.user?.email ?? '（不明）',
        confirmed: !!userData.user?.email_confirmed_at,
        last_sign_in: userData.user?.last_sign_in_at ?? null,
      }
    })
  )

  return NextResponse.json(enriched)
}

// テナントにユーザーを招待
export async function POST(req: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const { email, role = 'owner' } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'メールアドレスが必要です' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 招待メール送信
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${appUrl}/dashboard` }
  )

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // tenant_users に紐付け
  const { error: linkError } = await admin
    .from('tenant_users')
    .upsert(
      { user_id: inviteData.user.id, tenant_id: tenantId, role },
      { onConflict: 'user_id,tenant_id' }
    )

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, user_id: inviteData.user.id })
}

// テナントからユーザーを削除
export async function DELETE(req: NextRequest, { params }: Params) {
  const { tenantId } = await params
  const { user_id } = await req.json()

  if (!user_id) {
    return NextResponse.json({ error: 'user_id が必要です' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('tenant_users')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
