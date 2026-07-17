import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logEvidence, upsertSession, getSession } from '@/lib/akinai/store';

export const dynamic = 'force-dynamic';

// C1 チャットボット: マジックリンクの検証とセッション開始。
// トークンは 7日有効・初回タップで used_at を記録(1回で無効化)。
// 同一セッションが未完了の間は再読込での再開のみ許可する。
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
  if (!link) return NextResponse.json({ error: 'invalid_link' }, { status: 404 });
  if (new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  const chatCallId = `chat_${link.call_id}`;
  const existing = await getSession(chatCallId);

  if (link.used_at) {
    // 使用済みリンク: 未完了セッションの再開のみ許可(完了済みなら無効)
    if (!existing || existing.ended_at) {
      return NextResponse.json({ error: 'used' }, { status: 410 });
    }
  } else {
    // 初回タップ: 使用済み化 + セッション作成 + C1証跡
    const now = new Date().toISOString();
    await sb.from('akinai_magic_links').update({ used_at: now }).eq('token', token);
    await upsertSession(chatCallId, {
      customer_id: link.customer_id,
      customer_name: link.customer_name,
      customer_phone: link.customer_phone,
      policy_expiry_date: link.policy_expiry_date,
      channel: 'chat',
      entry_point: 'CB',
      auth_method: 'magic_link',
      auth_result: 'success',
      authenticated_at: now,
      started_at: now,
      link_tapped_at: now,
    });
    await logEvidence({
      call_id: chatCallId,
      customer_id: link.customer_id,
      channel: 'chat',
      node_id: 'C1',
      payload: { link_tapped_at: now, source_call_id: link.call_id },
    });
  }

  return NextResponse.json({
    ok: true,
    session_id: chatCallId,
    customer_name: link.customer_name,
    policy_expiry_date: link.policy_expiry_date,
  });
}
