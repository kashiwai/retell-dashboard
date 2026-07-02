import { NextRequest, NextResponse } from 'next/server';
import { gcalConfigured, getAvailableSlots } from '@/lib/gcal';

export const dynamic = 'force-dynamic';

// Retell Custom Function: 音声予約の「空き時間取得」。
// 直近の空きスロットを算出し、エージェントが読み上げやすい文面＋構造化リストを返す。
// 返した slots[].start_iso を、予約確定(gcal_book)時に渡してもらう。

function guard(req: NextRequest): boolean {
  const secret = process.env.TOOL_SHARED_SECRET;
  if (!secret) return true; // 未設定なら検証しない
  return req.headers.get('x-tool-secret') === secret;
}

function reply(message: string, extra: Record<string, any> = {}) {
  return NextResponse.json({ result: message, message, ...extra });
}

export async function POST(req: NextRequest) {
  if (!guard(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (!gcalConfigured()) {
    return reply('ただいま予約システムに接続できないため、担当より折り返しご連絡いたします。', { slots: [] });
  }

  try {
    const slots = await getAvailableSlots(4, 10);
    if (slots.length === 0) {
      return reply('恐れ入ります、直近で空いているお時間が見当たりませんでした。担当より改めて日程をご案内いたします。', { slots: [] });
    }
    // 読み上げ用の文面(番号付き)
    const spoken = slots.map((s, i) => `${i + 1}つ目、${s.label}`).join('。');
    const message = `直近ですと、${spoken}、が空いております。ご希望のお時間はございますか。`;
    return reply(message, {
      slots: slots.map((s, i) => ({ index: i + 1, start_iso: s.startISO, label: s.label })),
    });
  } catch (e: any) {
    console.error('gcal slots error:', e?.message || e);
    return reply('空き状況の確認中に問題が発生しました。担当より折り返しご連絡いたします。', { slots: [] });
  }
}
