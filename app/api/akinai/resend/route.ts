import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logEvidence, notifyStaff } from '@/lib/akinai/store';

export const dynamic = 'force-dynamic';

// CB2 失効時導線【v0.4】: 期限切れ・使用済みトークンからの「再送依頼」受付。
// 契約情報は一切返さない。担当者へ通知し、人が確認のうえ再送する。
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
  if (!link) return NextResponse.json({ error: 'invalid_token' }, { status: 404 });

  const status = new Date(link.expires_at).getTime() < Date.now() ? 'expired' : link.used_at ? 'used' : 'active';
  await logEvidence({
    call_id: `chat_${link.call_id}`,
    channel: 'chat',
    node_id: 'CB2',
    payload: { token_status: status, resend_requested_at: new Date().toISOString() },
  });
  await notifyStaff(
    '【AKINAI】マジックリンク再送依頼（CB2）',
    `<p>お客様からリンクの再送依頼がありました。ご確認のうえ再送してください。</p>
     <ul>
       <li>お名前: ${link.customer_name || '（不明）'}</li>
       <li>電話番号: ${link.customer_phone || '（不明）'}</li>
       <li>元の call_id: ${link.call_id}</li>
       <li>トークン状態: ${status}</li>
     </ul>`
  );
  return NextResponse.json({ ok: true });
}
