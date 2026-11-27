import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const TEMPLATE_AGENT_ID = process.env.PERSONAL_SECRETARY_TEMPLATE_AGENT_ID;

// Retell call_inbound webhook: 着信のto_numberから依頼主を引き、名前・留守理由・折り返し予定を動的変数として返す。
// 未登録の番号は理論上発生しない(番号はDB行作成後にのみRetellへimportされるため)が、
// 万一発生しても空レスポンスを返し、番号側のデフォルトinbound_agentsにフォールバックさせる。
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (payload.event !== 'call_inbound') {
      return NextResponse.json({});
    }

    const inbound = payload.call_inbound || {};
    const toNumber: string | undefined = inbound.to_number;
    const fromNumber: string | undefined = inbound.from_number;

    if (!toNumber || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[personal-secretary-inbound] missing to_number or Supabase config');
      return NextResponse.json({});
    }

    const admin = createAdminClient();
    const { data: owner, error } = await admin
      .from('personal_secretary_owners')
      .select('id, owner_name, absence_reason, callback_plan')
      .eq('dedicated_phone_number', toNumber)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !owner) {
      console.warn('[personal-secretary-inbound] no active owner for', toNumber, error?.message);
      return NextResponse.json({});
    }

    return NextResponse.json({
      call_inbound: {
        override_agent_id: TEMPLATE_AGENT_ID,
        dynamic_variables: {
          owner_name: owner.owner_name,
          absence_reason: owner.absence_reason,
          callback_plan: owner.callback_plan,
          caller_phone_hint: fromNumber || '',
        },
        metadata: { owner_id: owner.id },
      },
    });
  } catch (error) {
    console.error('[personal-secretary-inbound] error:', error);
    return NextResponse.json({});
  }
}
