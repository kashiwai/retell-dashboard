import { NextRequest, NextResponse } from 'next/server';
import { gcalConfigured, bookSlot } from '@/lib/gcal';

export const dynamic = 'force-dynamic';

// Retell Custom Function: 音声予約の「予約確定」。
// gcal_get_slots で得た start_iso と、通話で伺ったお客様情報を受け取り、
// Googleカレンダーに予定を作成する。成功可否をエージェントが読む文面で返す。

function guard(req: NextRequest): boolean {
  const secret = process.env.TOOL_SHARED_SECRET;
  if (!secret) return true;
  return req.headers.get('x-tool-secret') === secret;
}

function reply(message: string, extra: Record<string, any> = {}) {
  return NextResponse.json({ result: message, message, ...extra });
}

export async function POST(req: NextRequest) {
  if (!guard(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (!gcalConfigured()) {
    return reply('ただいま予約の確定ができないため、担当より折り返しご連絡いたします。', { booked: false });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return reply('予約情報の受け取りに失敗しました。担当より折り返しご連絡いたします。', { booked: false });
  }
  // Retell は関数の引数を args に入れて送る。call トップレベルにも来る場合を考慮。
  const a = body.args || body;
  const startISO = a.start_iso || a.startISO || a.start;
  if (!startISO) {
    return reply('ご希望のお時間を確認できませんでした。もう一度お時間をお選びいただけますか。', { booked: false });
  }

  try {
    const r = await bookSlot({
      startISO,
      name: a.name || a.customer_name,
      company: a.company || a.company_name,
      phone: a.phone || a.phone_number,
      email: a.email,
      note: a.note,
    });
    if (!r.ok) {
      console.error('gcal book failed:', r.error);
      return reply('申し訳ございません、予約の確定でエラーが発生しました。担当より折り返しご連絡いたします。', { booked: false });
    }
    return reply(`ありがとうございます。${r.label} でご予約を確定いたしました。確認のご連絡を差し上げます。`, { booked: true, label: r.label });
  } catch (e: any) {
    console.error('gcal book error:', e?.message || e);
    return reply('予約処理中に問題が発生しました。担当より折り返しご連絡いたします。', { booked: false });
  }
}
