import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ログインユーザーのテナント情報を返す
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenantUser, error } = await supabase
    .from('tenant_users')
    .select('role, tenant_id, tenants(*)')
    .eq('user_id', user.id)
    .single()

  if (error || !tenantUser) {
    return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 })
  }

  return NextResponse.json({
    role: tenantUser.role,
    tenant: tenantUser.tenants,
  })
}
