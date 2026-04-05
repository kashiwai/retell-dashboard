import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Twilio発信→相手が出たらRetell SIPに接続するTwiML
// Retellのインバウンドエンドポイント: 5t4n6j0wnrl.sip.livekit.cloud
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const callId = searchParams.get('call_id');

  if (!callId) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  const retellSipDomain = process.env.RETELL_SIP_DOMAIN || '5t4n6j0wnrl.sip.livekit.cloud';
  const sipUri = `sip:${callId}@${retellSipDomain}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>${sipUri}</Sip>
  </Dial>
</Response>`;

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}
