import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// 停止中テナントへの着信に流すTwiMLレスポンス
export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ja-JP" voice="woman">
    ただいまこのサービスはご利用いただけません。
    大変ご不便をおかけして申し訳ございません。
    担当者よりご連絡いたしますので、しばらくお待ちください。
  </Say>
  <Pause length="1"/>
  <Hangup/>
</Response>`

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}
