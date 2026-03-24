// /api/calcom/book
// Retell AI Function Call から呼ばれる Cal.com 予約確定
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-cal-api-key') || process.env.CALCOM_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Cal.com API Key未設定' }, { status: 401 });

    const body = await req.json();
    const { customer_name, customer_email, start_time, notes } = body;

    if (!customer_name || !start_time) {
      return NextResponse.json({
        message: 'お客様のお名前と希望日時をもう一度お聞かせいただけますか？',
      });
    }

    const eventTypeId = parseInt(process.env.CALCOM_EVENT_TYPE_ID || '1');

    const res = await fetch('https://api.cal.com/v2/bookings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventTypeId,
        start: start_time,
        attendee: {
          name: customer_name,
          email: customer_email || 'noemail@tsunagari-ai.jp',
          timeZone: 'Asia/Tokyo',
          language: 'ja',
        },
        bookingFieldsResponses: { notes: notes || '' },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('calcom book error:', err);
      return NextResponse.json({
        message: '予約の確定中にエラーが発生しました。担当者におつなぎします。',
        error: true,
      });
    }

    const data = await res.json();
    const booking = data.data;

    // 予約日時を日本語に整形
    const dt = new Date(booking.startTime).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    return NextResponse.json({
      message: `${customer_name} 様、${dt} のご予約を承りました。確認メールをお送りします。本日はお電話いただきありがとうございました。`,
      success: true,
      booking_uid: booking.uid,
      booking_time: dt,
    });
  } catch (err: any) {
    console.error('calcom book error:', err);
    return NextResponse.json({
      message: '予約処理中にエラーが発生しました。担当者におつなぎします。',
      error: true,
    });
  }
}
