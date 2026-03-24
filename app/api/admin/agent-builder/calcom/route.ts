// /api/admin/agent-builder/calcom
// Cal.com 連携設定・予約スロット取得 API
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case 'check_slots':   return await checkSlots(body);
    case 'book':          return await bookAppointment(body);
    case 'verify_key':    return await verifyApiKey(body);
    default:
      return NextResponse.json({ error: '不明なアクション' }, { status: 400 });
  }
}

// Cal.com API キー検証
async function verifyApiKey({ api_key }: { api_key: string }) {
  const res = await fetch('https://api.cal.com/v2/me', {
    headers: { Authorization: `Bearer ${api_key}`, 'cal-api-version': '2024-08-13' },
  });
  if (!res.ok) return NextResponse.json({ valid: false }, { status: 400 });
  const data = await res.json();
  return NextResponse.json({ valid: true, user: data.data });
}

// 空き時間スロット取得（Function Call から呼ばれる想定）
async function checkSlots({ api_key, event_type_id, start, end }: any) {
  const params = new URLSearchParams({ eventTypeId: event_type_id, startTime: start, endTime: end });
  const res = await fetch(`https://api.cal.com/v2/slots/available?${params}`, {
    headers: { Authorization: `Bearer ${api_key}`, 'cal-api-version': '2024-08-13' },
  });
  const data = await res.json();
  return NextResponse.json(data);
}

// 予約作成
async function bookAppointment({ api_key, event_type_id, start, name, email, notes }: any) {
  const res = await fetch('https://api.cal.com/v2/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${api_key}`,
      'cal-api-version': '2024-08-13',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventTypeId: parseInt(event_type_id),
      start,
      attendee: { name, email, timeZone: 'Asia/Tokyo', language: 'ja' },
      bookingFieldsResponses: { notes: notes || '' },
    }),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
  return NextResponse.json({ success: true, booking: data.data });
}
