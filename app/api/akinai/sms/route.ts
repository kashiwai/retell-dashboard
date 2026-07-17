import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { issueMagicLink, sendAkinaiSms, logEvidence, upsertSession } from '@/lib/akinai/store';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// F1 SMS送信【v0.4: 一級チャネル・3モード】(運用者用API)
//   F1-a: 架電→不在→SMS(webhookから自動。本APIでは手動再送用)
//   F1-b: 架電のn時間前の予告SMS
//   F1-c: SMSのみで完結(架電しない)。24時間受付・通話コストゼロ
// 認可: ダッシュボードログイン(ts_session) または x-akinai-key ヘッダー
export async function POST(request: NextRequest) {
  const hasSession = !!request.cookies.get('ts_session')?.value;
  const keyOk =
    !!process.env.AKINAI_ADMIN_KEY && request.headers.get('x-akinai-key') === process.env.AKINAI_ADMIN_KEY;
  if (!hasSession && !keyOk) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    customer_name?: string;
    customer_phone?: string;
    policy_expiry_date?: string;
    mode?: 'F1-a' | 'F1-b' | 'F1-c';
    call_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const mode = body.mode || 'F1-c';
  const phone = (body.customer_phone || '').replace(/[\s-]/g, '');
  if (!phone) return NextResponse.json({ error: 'customer_phone required' }, { status: 400 });
  if (!['F1-a', 'F1-b', 'F1-c'].includes(mode)) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  }

  // F1-cは通話が存在しないため疑似call_idを採番して顧客×リンクを紐付ける
  const callId = body.call_id || `${mode.toLowerCase().replace('-', '')}_${randomUUID()}`;

  const { token, url } = await issueMagicLink({
    call_id: callId,
    customer_name: body.customer_name || null,
    customer_phone: phone,
    policy_expiry_date: body.policy_expiry_date || null,
  });
  const sb = createAdminClient();
  await sb.from('akinai_magic_links').update({ sms_mode: mode }).eq('token', token);

  const result = await sendAkinaiSms(phone, url, body.customer_name || null, mode, token);
  const now = new Date().toISOString();

  if (result.ok) {
    await sb.from('akinai_magic_links').update({ sms_sent_at: now }).eq('token', token);
  }
  await logEvidence({
    call_id: callId,
    channel: 'chat',
    node_id: 'F1',
    payload: {
      sms_mode: mode,
      sms_to: phone,
      sms_sent: result.ok,
      delivery_status: result.status ?? result.reason ?? null,
      opt_out_shown: true,
      suppression_checked: true,
    },
  });
  // F1-b/cは通話セッションが無いため、SMS時点でセッションを起票(チャネルchat)
  if (!body.call_id) {
    await upsertSession(`chat_${callId}`, {
      channel: 'chat',
      entry_point: 'CB',
      customer_name: body.customer_name || null,
      customer_phone: phone,
      policy_expiry_date: body.policy_expiry_date || null,
      sms_mode: mode,
      sms_sent_at: result.ok ? now : null,
      sms_delivery_status: result.status ?? result.reason ?? null,
      opt_out_shown: true,
      suppression_checked: true,
    });
  }

  if (!result.ok && result.reason === 'suppressed') {
    return NextResponse.json({ ok: false, reason: 'suppressed', message: '受信拒否済みの番号のため送信しません(特定電子メール法)' }, { status: 409 });
  }
  return NextResponse.json({ ok: result.ok, mode, call_id: callId, chat_url: url, delivery: result.status ?? result.reason });
}
