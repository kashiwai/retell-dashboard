import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { addSuppression, logEvidence } from '@/lib/akinai/store';

export const dynamic = 'force-dynamic';

// 配信停止(オプトアウト)受付【特定電子メール法: 受信拒否の通知先】
// SMS本文のリンク(トークン付き)から呼ばれる。トークンで電話番号を特定して
// サプレッションリストに登録する。以後この番号へのSMS送信は全モード禁止。
export async function POST(request: NextRequest) {
  let token = '';
  try {
    const body = await request.json();
    token = String(body?.token || '');
  } catch {
    /* noop */
  }
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const sb = createAdminClient();
  const { data: link } = await sb.from('akinai_magic_links').select('*').eq('token', token).maybeSingle();
  if (!link || !link.customer_phone) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  }

  const now = new Date().toISOString();
  await addSuppression(link.customer_phone, 'sms_opt_out_link');
  await sb.from('akinai_magic_links').update({ opt_out_requested_at: now }).eq('token', token);
  await logEvidence({
    call_id: `chat_${link.call_id}`,
    channel: 'chat',
    node_id: 'OPT-OUT',
    payload: { opt_out_requested_at: now, phone: link.customer_phone },
  });
  return NextResponse.json({ ok: true });
}
