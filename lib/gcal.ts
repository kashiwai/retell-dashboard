// Google Calendar 直結ユーティリティ(サービスアカウント / 依存追加なし)
// 音声予約(ルート1)用。freeBusyで空き算出、events.insertで予約作成。
//
// 必要な環境変数:
//   GCAL_SA_CLIENT_EMAIL   サービスアカウントのメール(xxx@xxx.iam.gserviceaccount.com)
//   GCAL_SA_PRIVATE_KEY    サービスアカウント秘密鍵(PEM。改行は \n でエスケープ可)
//   GCAL_CALENDAR_ID       予約を入れるカレンダーID(通常は自分のGoogleメール or カレンダーID)
//   GCAL_TIMEZONE          例: Asia/Tokyo (未設定なら Asia/Tokyo)
//   GCAL_BUSINESS_HOURS    例: "10-18" (営業開始-終了。未設定なら 10-18)
//   GCAL_BUSINESS_DAYS     例: "1,2,3,4,5" (0=日〜6=土。未設定なら平日)
//   GCAL_SLOT_MINUTES      1枠の長さ(分)。未設定なら 30
//   GCAL_IMPERSONATE_SUBJECT (任意) ドメイン全体委任(DWD)で代理するユーザー。設定時のみ出席者招待が可能。

import crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_BASE = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar';

export function gcalConfig() {
  return {
    clientEmail: process.env.GCAL_SA_CLIENT_EMAIL || '',
    privateKey: (process.env.GCAL_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    calendarId: process.env.GCAL_CALENDAR_ID || 'primary',
    timeZone: process.env.GCAL_TIMEZONE || 'Asia/Tokyo',
    businessHours: process.env.GCAL_BUSINESS_HOURS || '10-18',
    businessDays: (process.env.GCAL_BUSINESS_DAYS || '1,2,3,4,5').split(',').map((s) => parseInt(s.trim(), 10)),
    slotMinutes: parseInt(process.env.GCAL_SLOT_MINUTES || '30', 10),
    subject: process.env.GCAL_IMPERSONATE_SUBJECT || '',
  };
}

export function gcalConfigured(): boolean {
  const c = gcalConfig();
  return !!(c.clientEmail && c.privateKey);
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

// サービスアカウントJWT → アクセストークン
async function getAccessToken(): Promise<string> {
  const c = gcalConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim: Record<string, any> = {
    iss: c.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  if (c.subject) claim.sub = c.subject; // DWD時のみ代理ユーザー

  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(c.privateKey);
  const jwt = `${unsigned}.${b64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) {
    throw new Error(`token error: ${j.error_description || j.error || res.status}`);
  }
  return j.access_token as string;
}

type Interval = { start: string; end: string };

async function freeBusy(timeMin: string, timeMax: string): Promise<Interval[]> {
  const c = gcalConfig();
  const token = await getAccessToken();
  const res = await fetch(`${CAL_BASE}/freeBusy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin, timeMax, timeZone: c.timeZone, items: [{ id: c.calendarId }] }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`freeBusy error: ${JSON.stringify(j).slice(0, 200)}`);
  return (j.calendars?.[c.calendarId]?.busy || []) as Interval[];
}

// JSTなど指定TZでの「その日の指定時刻」のUTC Dateを作る簡易関数
function overlaps(aStart: number, aEnd: number, busy: Interval[]): boolean {
  return busy.some((b) => {
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    return aStart < be && bs < aEnd;
  });
}

export type Slot = { startISO: string; label: string };

// 今から数日先までの空きスロットを算出(先頭 maxSlots 件)
export async function getAvailableSlots(maxSlots = 4, daysAhead = 7): Promise<Slot[]> {
  const c = gcalConfig();
  const [bhStart, bhEnd] = c.businessHours.split('-').map((s) => parseInt(s.trim(), 10));
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + daysAhead * 86400000).toISOString();
  const busy = await freeBusy(timeMin, timeMax);

  const slots: Slot[] = [];
  const fmt = new Intl.DateTimeFormat('ja-JP', {
    timeZone: c.timeZone, month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  // TZオフセット(分)を求めるヘルパ: 指定TZでの現地時刻とUTCの差
  const tzOffsetMinutes = (d: Date): number => {
    const s = new Intl.DateTimeFormat('en-US', { timeZone: c.timeZone, timeZoneName: 'shortOffset' }).format(d);
    const m = s.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (!m) return 540; // fallback JST
    return parseInt(m[1], 10) * 60 + (m[1].startsWith('-') ? -1 : 1) * (m[2] ? parseInt(m[2], 10) : 0);
  };

  for (let day = 0; day < daysAhead && slots.length < maxSlots; day++) {
    const base = new Date(now.getTime() + day * 86400000);
    // 現地日付の曜日
    const wdStr = new Intl.DateTimeFormat('en-US', { timeZone: c.timeZone, weekday: 'short' }).format(base);
    const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const wd = wdMap[wdStr];
    if (!c.businessDays.includes(wd)) continue;

    // 現地日付 (YYYY-MM-DD)
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: c.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(base);
    for (let h = bhStart; h + c.slotMinutes / 60 <= bhEnd && slots.length < maxSlots; h += c.slotMinutes / 60) {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      // 現地時刻をUTCに変換
      const localMs = Date.parse(`${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`);
      const offset = tzOffsetMinutes(base);
      const startMs = localMs - offset * 60000;
      const endMs = startMs + c.slotMinutes * 60000;
      if (startMs <= now.getTime()) continue; // 過去/直近すぎるものは除外
      if (overlaps(startMs, endMs, busy)) continue;
      const startISO = new Date(startMs).toISOString();
      slots.push({ startISO, label: fmt.format(new Date(startMs)) });
    }
  }
  return slots;
}

export type BookInput = {
  startISO: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  note?: string;
};

export async function bookSlot(input: BookInput): Promise<{ ok: boolean; label: string; htmlLink?: string; error?: string }> {
  const c = gcalConfig();
  const token = await getAccessToken();
  const start = new Date(input.startISO);
  const end = new Date(start.getTime() + c.slotMinutes * 60000);
  const label = new Intl.DateTimeFormat('ja-JP', {
    timeZone: c.timeZone, month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(start);

  const who = [input.name && `${input.name}様`, input.company].filter(Boolean).join(' / ') || 'お電話のお客様';
  const descLines = [
    input.company && `会社名: ${input.company}`,
    input.name && `お名前: ${input.name}`,
    input.phone && `電話: ${input.phone}`,
    input.email && `メール: ${input.email}`,
    input.note && `メモ: ${input.note}`,
    '経路: 電話AI(音声予約)',
  ].filter(Boolean);

  const event: Record<string, any> = {
    summary: `【電話予約】${who} 15分オンライン説明`,
    description: descLines.join('\n'),
    start: { dateTime: start.toISOString(), timeZone: c.timeZone },
    end: { dateTime: end.toISOString(), timeZone: c.timeZone },
  };
  // DWD(代理ユーザー)設定時のみ、出席者招待＋通知を行う
  const useAttendees = !!c.subject && !!input.email;
  if (useAttendees) event.attendees = [{ email: input.email }];

  const url = `${CAL_BASE}/calendars/${encodeURIComponent(c.calendarId)}/events?sendUpdates=${useAttendees ? 'all' : 'none'}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  const j = await res.json();
  if (!res.ok) return { ok: false, label, error: JSON.stringify(j).slice(0, 200) };
  return { ok: true, label, htmlLink: j.htmlLink };
}
