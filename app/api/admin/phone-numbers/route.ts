// /api/admin/phone-numbers
// 電話番号の一覧取得・新規購入・Retell AIへのインポート
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

const RETELL_ORIGINATION_URI = 'sip:5t4n6j0wnrl.sip.livekit.cloud;transport=tcp';
const SIP_TRUNK_NAME = 'TSUNAGARI-AI SIP Trunk';

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

function getRetellClient() {
  return new Retell({ apiKey: process.env.RETELL_API_KEY! });
}

// GET: Twilioの番号一覧 + Retell AI登録状況
export async function GET() {
  try {
    const twilioClient = getTwilioClient();
    const retellClient = getRetellClient();

    // Twilio 保有番号を取得
    const [twilioNumbers, retellNumbers] = await Promise.all([
      twilioClient.incomingPhoneNumbers.list(),
      retellClient.phoneNumber.list(),
    ]);

    // Retell に登録済みの番号セット
    const retellRegistered = new Map(
      retellNumbers.map((n: any) => [n.phone_number, n])
    );

    // SIP Trunk を取得
    const trunks = await twilioClient.trunking.v1.trunks.list();
    const trunk = trunks.find(t => t.friendlyName === SIP_TRUNK_NAME);

    const numbers = twilioNumbers.map((n) => {
      const retellInfo = retellRegistered.get(n.phoneNumber);
      return {
        phone_number: n.phoneNumber,
        friendly_name: n.friendlyName || n.phoneNumber,
        sid: n.sid,
        status: 'active',
        retell_registered: !!retellInfo,
        retell_phone_id: retellInfo?.phone_number_id ?? null,
        inbound_agent_id: retellInfo?.inbound_agent_id ?? null,
        outbound_agent_id: retellInfo?.outbound_agent_id ?? null,
        nickname: retellInfo?.nickname ?? null,
        sip_trunk_sid: trunk?.sid ?? null,
        created_at: n.dateCreated?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ numbers, trunk_sid: trunk?.sid ?? null });
  } catch (error: any) {
    console.error('phone-numbers GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 新規050番号を Twilio で購入し Retell AI にインポート
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, phone_number, agent_id, nickname } = body;

    if (action === 'search') {
      // 利用可能な日本の050番号を検索
      const twilioClient = getTwilioClient();
      const available = await twilioClient
        .availablePhoneNumbers('JP')
        .local.list({ limit: 20 });

      const filtered = available.filter(n =>
        n.phoneNumber.startsWith('+8150')
      );

      return NextResponse.json({
        available: filtered.map(n => ({
          phone_number: n.phoneNumber,
          friendly_name: n.friendlyName,
          locality: n.locality,
          region: n.region,
        })),
      });
    }

    if (action === 'purchase') {
      // 新規050番号を購入
      if (!phone_number) {
        return NextResponse.json({ error: 'phone_number が必要です' }, { status: 400 });
      }

      const twilioClient = getTwilioClient();
      const purchased = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: phone_number,
        friendlyName: nickname || `TSUNAGARI-AI ${phone_number}`,
      });

      return NextResponse.json({
        success: true,
        phone_number: purchased.phoneNumber,
        sid: purchased.sid,
        message: '番号の購入が完了しました。次に import を実行してください。',
      });
    }

    if (action === 'import') {
      // 既存番号を Retell AI にインポート
      if (!phone_number) {
        return NextResponse.json({ error: 'phone_number が必要です' }, { status: 400 });
      }

      const twilioClient = getTwilioClient();
      const retellClient = getRetellClient();

      // SIP Trunk を取得または作成
      const trunks = await twilioClient.trunking.v1.trunks.list();
      let trunk = trunks.find(t => t.friendlyName === SIP_TRUNK_NAME);

      if (!trunk) {
        trunk = await twilioClient.trunking.v1.trunks.create({
          friendlyName: SIP_TRUNK_NAME,
          secure: false,
        });
        await twilioClient.trunking.v1.trunks(trunk.sid).originationUrls.create({
          friendlyName: 'Retell AI Inbound',
          sipUrl: RETELL_ORIGINATION_URI,
          weight: 1,
          priority: 1,
          enabled: true,
        });
      }

      const terminationUri = `${trunk.sid}.pstn.twilio.com`;

      // Twilio の番号 SID を取得して SIP Trunk に紐付け
      const twilioNums = await twilioClient.incomingPhoneNumbers.list();
      const twilioNum = twilioNums.find(n => n.phoneNumber === phone_number);
      if (!twilioNum) {
        return NextResponse.json({ error: '番号が Twilio アカウントに見つかりません' }, { status: 404 });
      }

      const attached = await twilioClient.trunking.v1.trunks(trunk.sid).phoneNumbers.list();
      if (!attached.find(n => n.phoneNumber === phone_number)) {
        await twilioClient.trunking.v1.trunks(trunk.sid).phoneNumbers.create({
          phoneNumberSid: twilioNum.sid,
        });
      }

      // Retell AI にインポート
      const retellNums = await retellClient.phoneNumber.list();
      const alreadyImported = (retellNums as any[]).find(n => n.phone_number === phone_number);

      let result;
      if (alreadyImported) {
        result = await retellClient.phoneNumber.update(phone_number, {
          inbound_agent_id: agent_id || undefined,
          nickname: nickname || undefined,
        });
      } else {
        result = await retellClient.phoneNumber.import({
          phone_number,
          termination_uri: terminationUri,
          inbound_agent_id: agent_id || undefined,
          nickname: nickname || `TSUNAGARI-AI ${phone_number}`,
        });
      }

      return NextResponse.json({
        success: true,
        phone_number: (result as any).phone_number,
        retell_phone_id: (result as any).phone_number_id,
        inbound_agent_id: (result as any).inbound_agent_id,
        message: 'Retell AI へのインポートが完了しました',
      });
    }

    return NextResponse.json({ error: '不明な action です' }, { status: 400 });
  } catch (error: any) {
    console.error('phone-numbers POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
