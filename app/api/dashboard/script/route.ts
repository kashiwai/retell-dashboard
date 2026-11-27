import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRetellLlm, updateAgentPrompt } from '@/lib/provisioning/retell';
import { getFishAgentConfig, updateFishAgentPrompt } from '@/lib/provisioning/fish-audio';

export const dynamic = 'force-dynamic';

// ログインユーザーのテナントを取得(/api/me/tenantと同じロジック)
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

// GET: 現在の台本(system_prompt / general_prompt)を取得。裏側がRetell/Fish Audioどちらでも同じ形で返す。
export async function GET() {
  const result = await getCurrentTenant();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const tenant = result.tenant;

  try {
    if (tenant.voice_provider === 'fish_audio') {
      if (!tenant.fish_agent_id) {
        return NextResponse.json({ error: 'Fish Audioのエージェントがまだ設定されていません' }, { status: 404 });
      }
      const config = await getFishAgentConfig(tenant.fish_agent_id);
      return NextResponse.json({ provider: 'fish_audio', prompt: config?.prompt?.system_prompt ?? '', companyName: tenant.company_name ?? '' });
    } else {
      if (!tenant.llm_id) {
        return NextResponse.json({ error: 'Retellのエージェントがまだ設定されていません' }, { status: 404 });
      }
      const llm = await getRetellLlm(tenant.llm_id);
      return NextResponse.json({ provider: 'retell', prompt: (llm as any)?.general_prompt ?? '', companyName: tenant.company_name ?? '' });
    }
  } catch (error: any) {
    console.error('[dashboard/script] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 台本を更新。どちらの会社を使っていても同じ画面・同じ操作で保存できる。
export async function PUT(request: NextRequest) {
  const result = await getCurrentTenant();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const tenant = result.tenant;

  const body = await request.json();
  const prompt: string = body.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: '台本の内容が空です' }, { status: 400 });
  }

  try {
    if (tenant.voice_provider === 'fish_audio') {
      if (!tenant.fish_agent_id) {
        return NextResponse.json({ error: 'Fish Audioのエージェントがまだ設定されていません' }, { status: 404 });
      }
      await updateFishAgentPrompt(tenant.fish_agent_id, prompt);
    } else {
      if (!tenant.llm_id) {
        return NextResponse.json({ error: 'Retellのエージェントがまだ設定されていません' }, { status: 404 });
      }
      await updateAgentPrompt(tenant.llm_id, prompt);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[dashboard/script] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
