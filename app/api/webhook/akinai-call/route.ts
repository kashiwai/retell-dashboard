import { NextRequest, NextResponse } from 'next/server';
import {
  logEvidence,
  upsertSession,
  finalizeSession,
  sendPostConfirmMail,
  issueMagicLink,
  sendAkinaiSms,
} from '@/lib/akinai/store';
import { S3_OPTIONS, S4_OPTIONS, S5_OPTIONS } from '@/lib/akinai/scenario';

export const dynamic = 'force-dynamic';

// AKINAI ロ方式 電話Agent用 webhook。
// call_analyzed 時に: 証跡保存(append-only) → ハッシュ確定(S7) →
//   本人到達: R1/R2 後確メール ／ 不在・拒否: F1 マジックリンクSMS → C1チャットへ
/* eslint-disable @typescript-eslint/no-explicit-any */

function customerNumber(call: any): string {
  if (call?.direction === 'inbound') return call?.from_number || '';
  return call?.to_number || call?.from_number || '';
}

function toBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    if (['true', 'yes', 'はい', '1'].includes(v.toLowerCase())) return true;
    if (['false', 'no', 'いいえ', '0'].includes(v.toLowerCase())) return false;
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const event = body?.event;
  const call = body?.call ?? body?.data ?? {};
  const callId: string = call?.call_id || '';
  if (!callId) return NextResponse.json({ ok: true, skipped: 'no call_id' });

  // 通話終了・証跡確定は call_analyzed(分析完了)時のみ処理
  if (event !== 'call_analyzed') {
    return NextResponse.json({ ok: true, skipped: event });
  }

  const custom: Record<string, any> = call?.call_analysis?.custom_analysis ?? {};
  const dyn: Record<string, any> = call?.retell_llm_dynamic_variables ?? {};
  const phone = customerNumber(call);
  const startedAt = call?.start_timestamp ? new Date(call.start_timestamp).toISOString() : null;
  const endedAt = call?.end_timestamp ? new Date(call.end_timestamp).toISOString() : null;

  const identityVerified = toBool(custom.identity_verified);
  const branch = ['A', 'B', 'C'].includes(custom.branch_selected) ? custom.branch_selected : null;
  const lifeChange = toBool(custom.life_change_flag);
  const optionSkipped = toBool(custom.option_skipped);

  await upsertSession(callId, {
    channel: 'voice',
    customer_name: dyn.customer_name || custom.customer_name || null,
    customer_phone: phone || null,
    policy_expiry_date: dyn.policy_expiry_date || null,
    started_at: startedAt,
    ended_at: endedAt,
    consent_recording_at: startedAt, // S2で録音明示(通話冒頭)
    identity_verified: identityVerified,
    branch_selected: branch,
    life_change_flag: lifeChange,
    option_selected: custom.option_selected || null,
    option_skipped: optionSkipped,
    appointment_at: custom.appointment_at || null,
    // 本番要件はGCP asia-northeast1への直接保存。デモではRetellの録音URLを記録。
    recording_uri: call?.recording_url || null,
  });

  // ノード証跡(通話後分析からの復元)
  const nodes: Array<Parameters<typeof logEvidence>[0]> = [];
  if (identityVerified !== null) {
    nodes.push({ call_id: callId, channel: 'voice', node_id: 'S1', branch_selected: identityVerified ? 'yes' : 'no' });
  }
  if (branch) {
    nodes.push({
      call_id: callId, channel: 'voice', node_id: 'S3',
      presented_options: S3_OPTIONS.map((o) => o.key),
      branch_selected: branch,
      utterance_text: custom.s3_utterance || null,
    });
  }
  if (lifeChange !== null) {
    nodes.push({
      call_id: callId, channel: 'voice', node_id: 'S4',
      presented_options: S4_OPTIONS.map((o) => o.key),
      branch_selected: lifeChange ? 'changed' : 'no_change',
    });
  }
  if (custom.option_selected || optionSkipped) {
    nodes.push({
      call_id: callId, channel: 'voice', node_id: 'S5',
      presented_options: S5_OPTIONS.map((o) => o.key),
      branch_selected: optionSkipped ? 'skip' : null,
      utterance_text: custom.option_selected || null,
    });
  }
  if (custom.appointment_at) {
    nodes.push({ call_id: callId, channel: 'voice', node_id: 'S6', utterance_text: custom.appointment_at });
  }
  nodes.push({
    call_id: callId, channel: 'voice', node_id: 'S7',
    payload: { call_summary: call?.call_analysis?.call_summary ?? null, custom },
  });
  for (const n of nodes) await logEvidence(n);

  // F1判定: 本人不到達・拒否・意向未取得 → SMSフォロー(マジックリンク → C1チャット)
  const needsFollowup = toBool(custom.followup_sms_needed) === true || (!branch && identityVerified !== true);

  if (needsFollowup && phone) {
    try {
      const { url } = await issueMagicLink({
        call_id: callId,
        customer_name: dyn.customer_name || null,
        customer_phone: phone,
        policy_expiry_date: dyn.policy_expiry_date || null,
      });
      const sent = await sendAkinaiSms(phone, url, dyn.customer_name || null);
      await logEvidence({
        call_id: callId, channel: 'voice', node_id: 'F1',
        payload: { sms_sent: sent, sms_to: phone },
      });
      await upsertSession(callId, { sms_sent_at: sent ? new Date().toISOString() : null });
    } catch (e) {
      console.error('[akinai] F1 followup failed:', e);
    }
    await finalizeSession(callId);
    return NextResponse.json({ ok: true, route: 'F1' });
  }

  // 証跡確定(ハッシュ・TSA) → 後確(R1/R2)
  await finalizeSession(callId);
  let postConfirm: 'R1' | 'R2' | null = null;
  if (branch) {
    postConfirm = await sendPostConfirmMail(callId);
  }
  return NextResponse.json({ ok: true, route: postConfirm ?? 'none' });
}
