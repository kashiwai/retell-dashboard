import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// 予約確認ページ用API: トークン(sms_mode='confirm')から予約内容を返す。
// 閲覧専用(何度でも見られる)。7日で失効。契約情報は予約内容以外返さない。
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
  const { data: link } = await sb
    .from('akinai_magic_links')
    .select('*')
    .eq('token', token)
    .eq('sms_mode', 'confirm')
    .maybeSingle();
  if (!link) return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  if (new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  const { data: session } = await sb
    .from('akinai_sessions')
    .select('customer_name, appointment_at, appointment_changed_to, updated_at')
    .eq('call_id', link.call_id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    customer_name: session.customer_name,
    appointment_at: session.appointment_changed_to || session.appointment_at,
    changed: !!session.appointment_changed_to,
  });
}
