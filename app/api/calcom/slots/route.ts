// /api/calcom/slots
// Retell AI Function Call から呼ばれる Cal.com 空きスロット取得
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-cal-api-key') || process.env.CALCOM_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Cal.com API Key未設定' }, { status: 401 });

    const body = await req.json();
    const { requested_date } = body;

    // 指定日の00:00〜23:59（Asia/Tokyo）をUTCに変換
    const start = new Date(`${requested_date}T00:00:00+09:00`).toISOString();
    const end   = new Date(`${requested_date}T23:59:59+09:00`).toISOString();

    const eventTypeId = process.env.CALCOM_EVENT_TYPE_ID || '1';
    const params = new URLSearchParams({ eventTypeId, startTime: start, endTime: end });

    const res = await fetch(`https://api.cal.com/v2/slots/available?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'cal-api-version': '2024-08-13' },
    });

    if (!res.ok) {
      return NextResponse.json({ message: '空き時間の取得に失敗しました' }, { status: 200 });
    }

    const data = await res.json();
    const slots: string[] = Object.values(data.data?.slots || {}).flat() as string[];

    if (!slots.length) {
      return NextResponse.json({
        message: `${requested_date} は空き時間がございません。別の日程はいかがでしょうか？`,
        available: false,
      });
    }

    // 日本時間でスロットを読みやすく整形
    const formatted = slots.slice(0, 5).map((s: any) => {
      const d = new Date(s.time || s);
      return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
    });

    return NextResponse.json({
      message: `${requested_date} は ${formatted.join('、')} が空いています。ご希望の時間をお聞かせください。`,
      available: true,
      slots: formatted,
      raw_slots: slots.slice(0, 5),
    });
  } catch (err: any) {
    console.error('calcom slots error:', err);
    return NextResponse.json({ message: '空き時間の確認中にエラーが発生しました' }, { status: 200 });
  }
}
