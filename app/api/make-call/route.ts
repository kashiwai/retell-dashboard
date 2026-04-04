import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';
import { createAdminClient } from '@/lib/supabase/admin';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { to_number, from_number, agent_id, metadata } = body;

    if (!to_number || !from_number) {
      return NextResponse.json(
        { error: 'Missing required fields: to_number and from_number' },
        { status: 400 }
      );
    }

    // テナントのステータスチェック（停止中は発信不可）
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const query = agent_id
        ? admin.from('tenants').select('id, status, company_name').eq('agent_id', agent_id).single()
        : admin.from('tenants').select('id, status, company_name').eq('phone_number', from_number).single();

      const { data: tenant } = await query;

      if (tenant?.status === 'suspended') {
        return NextResponse.json(
          {
            error: 'このサービスは現在停止中です。月額利用上限を超えたため発信できません。',
            code: 'TENANT_SUSPENDED',
          },
          { status: 403 }
        );
      }
    }

    const retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY });

    const call = await retellClient.call.createPhoneCall({
      to_number,
      from_number,
      metadata: metadata || {},
      retell_llm_dynamic_variables: {
        customer_name: metadata?.customer_name || 'お客様',
        company_name: metadata?.company_name || '弊社',
        current_time: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
      }
    } as any);

    return NextResponse.json({
      success: true,
      call_id: call.call_id,
      status: call.call_status,
      from: from_number,
      to: to_number,
      agent_id: call.agent_id,
      start_timestamp: call.start_timestamp
    });

  } catch (error: any) {
    console.error('Make call error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
