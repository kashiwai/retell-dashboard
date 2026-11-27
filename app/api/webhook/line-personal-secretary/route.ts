import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { replyLineMessage } from '@/lib/notify/line';

export const dynamic = 'force-dynamic';

// 個人受電代行サービス専用のLINE Bot(@902ftedx)のwebhook。
// app/api/line/webhook/route.ts とは別チャンネル・別シークレットのため専用routeを切っている。
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET_PERSONAL_SECRETARY;
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN_PERSONAL_SECRETARY;

function verifySignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) return false;
  const hash = crypto.createHmac('SHA256', CHANNEL_SECRET).update(body).digest('base64');
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-line-signature');
    const body = await request.text();

    if (!signature || !verifySignature(body, signature)) {
      console.error('[line-personal-secretary] invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const events = JSON.parse(body).events || [];
    for (const event of events) {
      if (event.type === 'message' && event.message?.type === 'text') {
        await handleMessage(event);
      } else if (event.type === 'follow') {
        await handleFollow(event);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[line-personal-secretary] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 発信者がline_link_codeを送ってきたら該当依頼主のline_user_idを紐付ける
async function handleMessage(event: any) {
  if (!CHANNEL_ACCESS_TOKEN) return;
  const { replyToken, message, source } = event;
  const text = (message.text || '').trim();
  const userId = source?.userId;

  if (!text || !userId) return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();
  const { data: owner, error } = await admin
    .from('personal_secretary_owners')
    .select('id, owner_name')
    .eq('line_link_code', text)
    .maybeSingle();

  if (error || !owner) {
    await replyLineMessage(CHANNEL_ACCESS_TOKEN, replyToken, {
      type: 'text',
      text: 'コードが確認できませんでした。登録時に発行されたコードをそのまま送信してください。',
    });
    return;
  }

  await admin
    .from('personal_secretary_owners')
    .update({ line_user_id: userId, line_linked_at: new Date().toISOString() })
    .eq('id', owner.id);

  await replyLineMessage(CHANNEL_ACCESS_TOKEN, replyToken, {
    type: 'text',
    text: `連携が完了しました。${owner.owner_name}様宛にお電話があった際は、このLINEでお知らせします。`,
  });
}

async function handleFollow(event: any) {
  if (!CHANNEL_ACCESS_TOKEN) return;
  const { replyToken } = event;
  await replyLineMessage(CHANNEL_ACCESS_TOKEN, replyToken, {
    type: 'text',
    text: '友だち追加ありがとうございます。登録時に発行されたコードを送信すると連携が完了します。',
  });
}
