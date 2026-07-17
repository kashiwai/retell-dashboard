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
  const { error } = await sb
    .from('akinai_sessions')
    .upsert({ call_id, scenario_version: SCENARIO_VERSION, updated_at: new Date().toISOString(), ...fields }, { onConflict: 'call_id' });
  if (error) console.error('[akinai] session upsert failed:', error.message);
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

export async function sendAkinaiSms(to: string, url: string, customerName?: string | null): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const ms = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !authToken || !ms) {
    console.error('[akinai] Twilio not configured');
    return false;
  }
  const body = `【AKINAI】${customerName ? customerName + '様 ' : ''}自動車保険の満期更新のご案内です。以下のリンクからお手続きの意向をお聞かせください(7日間有効)。\n${url}`;
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
    return false;
  }
  return true;
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
