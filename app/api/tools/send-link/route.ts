import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

// Retell Custom Function 用エンドポイント。
// 通話中にエージェントがこの関数を呼ぶと、相手の番号に応じて予約リンクを届ける:
//   - 携帯(070/080/090) → SMSで短縮URLを自動送信
//   - 固定/050/その他   → SMS不可なので、口頭で短縮URL(001001.app)を案内するよう指示を返す
// 返した文言はエージェントがそのまま会話に反映できる。

const SHORT_URL = process.env.SHORT_BOOKING_URL || 'https://001001.app';
const SHORT_URL_SPOKEN = 'ゼロゼロイチ、ゼロゼロイチ、ドットアップ';

// 日本の携帯番号判定(E.164 +8170/80/90 または 国内 070/080/090)
function isJapaneseMobile(raw: string): boolean {
  const n = (raw || '').replace(/[\s-]/g, '');
  return /^\+81(70|80|90)/.test(n) || /^0(70|80|90)/.test(n);
}

// 通話相手(顧客側)の電話番号を取得。アウトバウンドは to_number、インバウンドは from_number。
function customerNumber(call: any): string {
  if (call?.direction === 'inbound') return call?.from_number || '';
  return call?.to_number || call?.from_number || '';
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; status?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const ms = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || !ms) return { ok: false, error: 'Twilio not configured' };

  const params = new URLSearchParams();
  params.set('MessagingServiceSid', ms);
  params.set('To', to);
  params.set('Body', body);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const j = await res.json();
  if (!res.ok || j.error_code) return { ok: false, error: j.message || `HTTP ${res.status}` };
  return { ok: true, status: j.status };
}

// Retell へ返す共通フォーマット。message はエージェントが読む結果テキスト。
function result(message: string) {
  return NextResponse.json({ result: message, message });
}

export async function POST(request: NextRequest) {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return result('リンク送信でエラーが発生しました。恐れ入りますが口頭で ' + SHORT_URL_SPOKEN + ' とお伝えください。');
  }

  // call_id を元に Retell から実際の通話情報を取得(番号のなりすまし防止＋正確な番号取得)
  const callId = payload?.call?.call_id || payload?.call_id;
  let call = payload?.call;
  try {
    if (callId && process.env.RETELL_API_KEY) {
      const client = new Retell({ apiKey: process.env.RETELL_API_KEY });
      call = await client.call.retrieve(callId);
    }
  } catch (e) {
    // 取得失敗時は payload の call をそのまま使う
  }

  const number = customerNumber(call);
  if (!number) {
    return result('お電話番号が確認できませんでした。恐れ入りますが口頭で ' + SHORT_URL_SPOKEN + '（' + SHORT_URL + '）とご案内ください。');
  }

  if (isJapaneseMobile(number)) {
    const smsBody = `【MIKATA】ご予約はこちらからお願いいたします。\n${SHORT_URL}`;
    const r = await sendSms(number, smsBody);
    if (r.ok) {
      return result('ただいまショートメッセージ（SMS）でご予約リンクをお送りしました。「MIKATA」という送信元から届きます。ご確認いただけますでしょうか。');
    }
    // SMS失敗時は口頭フォールバック
    return result('SMSの送信がうまくいかなかったため、口頭でご案内します。ブラウザで ' + SHORT_URL_SPOKEN + '（' + SHORT_URL + '）を開いてご予約ください。');
  }

  // 固定電話・050など: SMS不可 → 口頭で短縮URL
  return result('こちらのお電話番号にはSMSをお送りできないため、口頭でご案内します。ブラウザのアドレス欄に ' + SHORT_URL_SPOKEN + '（' + SHORT_URL + '）と入力すると、ご予約ページが開きます。');
}
