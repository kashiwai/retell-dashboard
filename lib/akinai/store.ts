// AKINAI ロ方式: 証跡保存・マジックリンク・後確メール・SMSフォロー(サーバー専用)
// 証跡は Supabase(東京リージョン=国内保管) の append-only テーブルに保存する。
import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { SCENARIO_VERSION, postConfirmType } from '@/lib/akinai/scenario';

const BASE_URL = process.env.AKINAI_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me';
const MAIL_TO = (process.env.AKINAI_MAIL_TO || 'ko.kashiwai@gmail.com').split(',').map((s) => s.trim());
const MAIL_FROM = 'AKINAI CallCenter <noreply@autosales-ai.com>'; // Resend認証済みドメイン

export interface EvidenceInput {
  call_id: string;
  customer_id?: string | null;
  channel: 'voice' | 'chat';
  node_id: string;
  presented_options?: unknown;
  branch_selected?: string | null;
  utterance_text?: string | null;
  payload?: Record<string, unknown> | null;
}

export async function logEvidence(input: EvidenceInput): Promise<number | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('akinai_evidence')
    .insert({ ...input, scenario_version: SCENARIO_VERSION })
    .select('append_only_seq')
    .single();
  if (error) {
    console.error('[akinai] evidence insert failed:', error.message);
    return null;
  }
  return data?.append_only_seq ?? null;
}

export async function upsertSession(call_id: string, fields: Record<string, unknown>) {
  const sb = createAdminClient();
  const base = { scenario_version: SCENARIO_VERSION, updated_at: new Date().toISOString(), ...fields };
  // channel は NOT NULL のため upsert(INSERT経由)は使えない。update→無ければinsert。
  const { data, error } = await sb.from('akinai_sessions').update(base).eq('call_id', call_id).select('call_id');
  if (error) {
    console.error('[akinai] session update failed:', error.message);
    return;
  }
  if (!data || data.length === 0) {
    const { error: insErr } = await sb
      .from('akinai_sessions')
      .insert({ call_id, channel: (fields.channel as string) ?? 'voice', ...base });
    if (insErr) console.error('[akinai] session insert failed:', insErr.message);
  }
}

export async function getSession(call_id: string) {
  const sb = createAdminClient();
  const { data } = await sb.from('akinai_sessions').select('*').eq('call_id', call_id).maybeSingle();
  return data;
}

// S7: 証跡確定。全証跡のハッシュを確定し、TSAトークン(デモ用)を付与
export async function finalizeSession(call_id: string): Promise<{ content_hash: string; tsa_token: string } | null> {
  const sb = createAdminClient();
  const { data: rows, error } = await sb
    .from('akinai_evidence')
    .select('*')
    .eq('call_id', call_id)
    .order('append_only_seq', { ascending: true });
  if (error || !rows) {
    console.error('[akinai] finalize: evidence fetch failed:', error?.message);
    return null;
  }
  const content_hash = 'sha256:' + createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  // 本番は認定TSA(RFC3161)を利用する。デモではハッシュ+時刻の擬似トークン。
  const tsa_token = 'TSA-DEMO-' + createHash('sha256').update(content_hash + new Date().toISOString()).digest('hex').slice(0, 32);
  await upsertSession(call_id, { content_hash, tsa_token, ended_at: new Date().toISOString() });
  return { content_hash, tsa_token };
}

// F1: マジックリンク発行(暗号論的乱数・7日有効・1回で無効化)
export async function issueMagicLink(params: {
  call_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  policy_expiry_date?: string | null;
}): Promise<{ token: string; url: string }> {
  const token = randomBytes(24).toString('base64url');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const sb = createAdminClient();
  const { error } = await sb.from('akinai_magic_links').insert({ token, expires_at, ...params });
  if (error) throw new Error('magic link insert failed: ' + error.message);
  return { token, url: `${BASE_URL}/akinai/chat?token=${token}` };
}

// サプレッションリスト照合(特定電子メール法: 受信拒否者への再送信禁止)
export async function isSuppressed(phone: string): Promise<boolean> {
  const sb = createAdminClient();
  const { data } = await sb.from('akinai_suppression').select('phone').eq('phone', phone).maybeSingle();
  return !!data;
}

export async function addSuppression(phone: string, source: string) {
  const sb = createAdminClient();
  await sb.from('akinai_suppression').upsert({ phone, source, requested_at: new Date().toISOString() });
}

export type SmsSendResult = { ok: boolean; status?: string; reason?: string };

// SMS送信(v0.4: 特定電子メール法対応)
// - 送信者の表示: 本文冒頭に事業者名を明記
// - オプトアウト導線: 配信停止URLを必ず記載(opt_out_shown)
// - 送信前にサプレッションリストを必ず照合(照合なしの送信は禁止)
export async function sendAkinaiSms(
  to: string,
  url: string,
  customerName?: string | null,
  mode: 'F1-a' | 'F1-b' | 'F1-c' = 'F1-a',
  optOutToken?: string
): Promise<SmsSendResult> {
  if (await isSuppressed(to)) {
    console.log('[akinai] SMS blocked by suppression list:', to);
    return { ok: false, reason: 'suppressed' };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const ms = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !authToken || !ms) {
    console.error('[akinai] Twilio not configured');
    return { ok: false, reason: 'not_configured' };
  }

  const optOutUrl = optOutToken ? `${BASE_URL}/akinai/optout?t=${optOutToken}` : `${BASE_URL}/akinai/optout`;
  const namePart = customerName ? customerName + '様 ' : '';
  const lead =
    mode === 'F1-b'
      ? `${namePart}自動車保険の満期更新について、後ほど担当よりお電話いたします。お電話の前にご確認いただける場合は以下のリンクをご利用ください(7日間有効)。`
      : `${namePart}自動車保険の満期更新のご案内です。以下のリンクからお手続きの意向をお聞かせください(7日間有効)。`;
  // 送信者の表示 + オプトアウト導線(特定電子メール法)
  const body = `【AKINAI／Data Agent AI株式会社】\n${lead}\n${url}\n\n配信停止をご希望の方: ${optOutUrl}`;

  const params = new URLSearchParams();
  params.set('MessagingServiceSid', ms);
  params.set('To', to);
  params.set('Body', body);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const j = await res.json();
  if (!res.ok || j.error_code) {
    console.error('[akinai] SMS failed:', j.message || res.status);
    return { ok: false, reason: j.message || `HTTP ${res.status}` };
  }
  return { ok: true, status: j.status };
}

// 予約確認ページ用トークン発行(閲覧専用・7日有効・使い切りにしない)
export async function issueBookingToken(call_id: string): Promise<{ token: string; url: string }> {
  const token = randomBytes(24).toString('base64url');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const sb = createAdminClient();
  const { error } = await sb
    .from('akinai_magic_links')
    .insert({ token, call_id, expires_at, sms_mode: 'confirm' });
  if (error) throw new Error('booking token insert failed: ' + error.message);
  return { token, url: `${BASE_URL}/akinai/booking?t=${token}` };
}

// 予約確定の確認SMS(SMSは短文+URLのみ。詳細はWebの予約確認ページで表示)
// 取引に関する通知=広告宣伝ではないためオプトアウト導線は不要。
// ただし受信拒否済みの番号には安全側に倒して送らない。
export async function sendAppointmentConfirmSms(
  to: string,
  detailUrl: string,
  changed = false
): Promise<SmsSendResult> {
  if (await isSuppressed(to)) {
    console.log('[akinai] confirm SMS skipped (suppressed):', to);
    return { ok: false, reason: 'suppressed' };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const ms = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !authToken || !ms) return { ok: false, reason: 'not_configured' };

  const lead = changed ? 'ご予約の変更を承りました。' : 'ご来店のご予約を承りました。';
  const body = `【AKINAI】${lead}詳細はこちらでご確認ください(7日間有効)\n${detailUrl}`;

  const params = new URLSearchParams();
  params.set('MessagingServiceSid', ms);
  params.set('To', to);
  params.set('Body', body);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const j = await res.json();
  if (!res.ok || j.error_code) {
    console.error('[akinai] confirm SMS failed:', j.message || res.status);
    return { ok: false, reason: j.message || `HTTP ${res.status}` };
  }
  return { ok: true, status: j.status };
}

// 運用連絡メール(再送依頼・折り返しキュー登録などを担当者へ通知)
export async function notifyStaff(subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: MAIL_TO, subject, html: `<div style="font-family:sans-serif">${html}</div>` }),
  }).catch((e) => console.error('[akinai] staff notify failed:', e));
}

// 後確メール(R1: 確認メール / R2: 面談ご案内メール)
export async function sendPostConfirmMail(call_id: string): Promise<'R1' | 'R2' | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[akinai] RESEND_API_KEY not set');
    return null;
  }
  const session = await getSession(call_id);
  if (!session) return null;
  const type = postConfirmType(session.branch_selected);

  const branchLabel =
    session.branch_selected === 'A' ? '同一条件で更新' :
    session.branch_selected === 'B' ? '他社等の商品と比較して検討' :
    session.branch_selected === 'C' ? '補償内容を変更して更新' : '（未選択）';

  const common = `
    <p>${session.customer_name || 'お客'}様</p>
    <table style="border-collapse:collapse" border="1" cellpadding="6">
      <tr><td>ご意向（S3）</td><td><b>${branchLabel}</b></td></tr>
      <tr><td>生活の変化（S4）</td><td>${session.life_change_flag ? '変化あり（詳細は来店時に担当者が伺います）' : '特になし'}</td></tr>
      ${session.option_selected ? `<tr><td>追加オプション（S5）</td><td>${session.option_skipped ? 'スキップ' : session.option_selected}</td></tr>` : ''}
      <tr><td>ご来店希望日時（S6）</td><td>${session.appointment_at || '（未定）'}</td></tr>
      <tr><td>チャネル</td><td>${session.channel === 'voice' ? 'お電話' : 'チャット'}</td></tr>
      <tr><td>シナリオ版数</td><td>${session.scenario_version}</td></tr>
      <tr><td>証跡ハッシュ</td><td style="font-family:monospace;font-size:11px">${session.content_hash || '-'}</td></tr>
    </table>
    <p style="color:#666;font-size:12px">本メールは意向把握内容の確認（後確）です。内容に相違がある場合はご連絡ください。</p>`;

  const subject =
    type === 'R1'
      ? '【AKINAI】ご契約更新の意向確認（内容のご確認）'
      : '【AKINAI】ご来店面談のご案内';
  const lead =
    type === 'R1'
      ? '<p>お電話（チャット）でお伺いした内容は以下のとおりです。ご来店時にお手続きを進めます。</p>'
      : '<p>ご来店時に担当者が比較資料のご提示・推奨理由のご説明をいたします。以下の内容でお待ちしております。</p>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject: `${subject}（${type}・デモ）`,
      html: `<div style="font-family:sans-serif">${lead}${common}</div>`,
    }),
  });
  if (!res.ok) {
    console.error('[akinai] mail failed:', res.status, await res.text());
    return null;
  }
  await upsertSession(call_id, { post_confirm_type: type, post_confirm_mail_sent_at: new Date().toISOString() });
  await logEvidence({
    call_id,
    channel: session.channel,
    node_id: type,
    payload: { mail_to: MAIL_TO, subject },
  });
  return type;
}
