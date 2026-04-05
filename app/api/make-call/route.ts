import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json({ error: 'Retell API key not configured' }, { status: 500 });
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
        ? admin.from('tenants').select('id, status').eq('agent_id', agent_id).single()
        : admin.from('tenants').select('id, status').eq('phone_number', from_number).single();
      const { data: tenant } = await query;
      if (tenant?.status === 'suspended') {
        return NextResponse.json(
          { error: 'サービスが停止中です。月額利用上限を超えました。', code: 'TENANT_SUSPENDED' },
          { status: 403 }
        );
      }
    }

    const retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY });

    // Step 1: Retellにコールを登録してcall_idを取得
    const registeredCall = await retellClient.call.registerPhoneCall({
      agent_id: agent_id || process.env.RETELL_AGENT_ID || '',
      from_number,
      to_number,
      direction: 'outbound',
      metadata: metadata || {},
      retell_llm_dynamic_variables: {
        customer_name: metadata?.customer_name || 'お客様',
        company_name: metadata?.company_name || '弊社',
        current_time: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
      }
    });

    const callId = registeredCall.call_id;

    // Step 2: Twilio REST APIで実際に発信
    // 相手が出たらTwiMLでRetellのSIPに接続する
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://retell-dashboard-opal.vercel.app';
    const twimlUrl = `${appUrl}/api/twiml/retell-connect?call_id=${callId}`;

    const twilioCall = await twilioClient.calls.create({
      to: to_number,
      from: from_number,
      url: twimlUrl,
      method: 'GET',
      statusCallback: `${appUrl}/api/webhook/retell`,
      statusCallbackMethod: 'POST',
    });

    return NextResponse.json({
      success: true,
      call_id: callId,
      twilio_sid: twilioCall.sid,
      status: twilioCall.status,
      from: from_number,
      to: to_number,
    });

  } catch (error: any) {
    console.error('Make call error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
