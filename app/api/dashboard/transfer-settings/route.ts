import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgentTransferSetting, updateAgentTransferSetting } from '@/lib/provisioning/retell';
import { getFishAgentTransferSetting, updateFishAgentTransferSetting } from '@/lib/provisioning/fish-audio';

export const dynamic = 'force-dynamic';

// ログインユーザーのテナントを取得(/api/dashboard/scriptと同じロジック)
async function getCurrentTenant() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' as const, status: 401 };

  const { data: tenantUser, error } = await supabase
    .from('tenant_users')
    .select('role, tenant_id, tenants(*)')
    .eq('user_id', user.id)
    .single();

  if (error || !tenantUser) return { error: 'テナントが見つかりません' as const, status: 404 };
  return { tenant: tenantUser.tenants as any };
}

// GET: 現在の電話転送設定を取得
export async function GET() {
  const result = await getCurrentTenant();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const tenant = result.tenant;

  try {
    if (tenant.voice_provider === 'fish_audio') {
      if (!tenant.fish_agent_id) {
        return NextResponse.json({ error: 'Fish Audioのエージェントがまだ設定されていません' }, { status: 404 });
      }
      const setting = await getFishAgentTransferSetting(tenant.fish_agent_id);
      return NextResponse.json({ supported: true, provider: 'fish_audio', ...setting });
    }

    if (!tenant.llm_id) {
      return NextResponse.json({ error: 'Retellのエージェントがまだ設定されていません' }, { status: 404 });
    }
    const setting = await getAgentTransferSetting(tenant.llm_id);
    return NextResponse.json({ supported: true, provider: 'retell', ...setting });
  } catch (error: any) {
    console.error('[dashboard/transfer-settings] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 電話転送設定を更新
export async function PUT(request: NextRequest) {
  const result = await getCurrentTenant();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const tenant = result.tenant;

  const body = await request.json();
  const enabled: boolean = !!body.enabled;
  const phoneNumber: string | undefined = body.phoneNumber;
  const condition: string | undefined = body.condition;

  if (enabled && !phoneNumber?.trim()) {
    return NextResponse.json({ error: '転送を有効にする場合は転送先の電話番号を入力してください' }, { status: 400 });
  }

  try {
    if (tenant.voice_provider === 'fish_audio') {
      if (!tenant.fish_agent_id) {
        return NextResponse.json({ error: 'Fish Audioのエージェントがまだ設定されていません' }, { status: 404 });
      }
      await updateFishAgentTransferSetting(tenant.fish_agent_id, { enabled, phoneNumber, condition });
      return NextResponse.json({ success: true });
    }

    if (!tenant.llm_id) {
      return NextResponse.json({ error: 'Retellのエージェントがまだ設定されていません' }, { status: 404 });
    }
    await updateAgentTransferSetting(tenant.llm_id, { enabled, phoneNumber, condition });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[dashboard/transfer-settings] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
