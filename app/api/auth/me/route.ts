import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = user.user_metadata?.role === 'superadmin'

  let tenant = null
  if (!isSuperAdmin) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('tenant_users')
      .select('tenant_id, tenants(*)')
      .eq('user_id', user.id)
      .single()
    tenant = (data as { tenants: unknown })?.tenants ?? null
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email,
    role: isSuperAdmin ? 'superadmin' : 'tenant',
    tenant,
  })
}
