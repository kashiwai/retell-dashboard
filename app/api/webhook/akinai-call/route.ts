import { NextRequest, NextResponse } from 'next/server';
import {
  logEvidence,
  upsertSession,
  finalizeSession,
  sendPostConfirmMail,
  issueMagicLink,
  sendAkinaiSms,
  sendAppointmentConfirmSms,
  issueBookingToken,
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

function isJapaneseMobile(raw: string): boolean {
  const n = (raw || '').replace(/[\s-]/g, '');
  return /^\+81(70|80|90)/.test(n) || /^0(70|80|90)/.test(n);
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

  // v0.2: 入口判定(発信=OB / 着信=IB)・認証・用件・エスカレーション
  const direction: 'inbound' | 'outbound' = call?.direction === 'inbound' ? 'inbound' : 'outbound';
  const entryPoint = direction === 'inbound' ? 'IB' : 'OB';
  const authResult = ['success', 'failed'].includes(custom.auth_result) ? custom.auth_result : null;
  const inboundIntent = ['renewal', 'appointment', 'accident', 'other'].includes(custom.inbound_intent)
    ? custom.inbound_intent
    : null;
  const escalated = toBool(custom.escalated) === true;
  const escalationReason = ['accident', 'auth_failed', 'other', 'customer_request'].includes(custom.escalation_reason)
    ? custom.escalation_reason
    : null;

  await upsertSession(callId, {
    channel: 'voice',
    entry_point: entryPoint,
    direction,
    customer_name: dyn.customer_name || custom.customer_name || null,
    customer_phone: phone || null,
    policy_expiry_date: dyn.policy_expiry_date || null,
    started_at: startedAt,
    ended_at: endedAt,
    consent_recording_at: startedAt, // OB2/IB1で録音明示(通話冒頭)
    identity_verified: identityVerified,
    auth_method: direction === 'inbound' ? 'caller_id+knowledge' : 'outbound_callee',
    auth_result: authResult ?? (identityVerified === null ? null : identityVerified ? 'success' : 'failed'),
    auth_attempts: Number.isFinite(Number(custom.auth_attempts)) ? Number(custom.auth_attempts) : null,
    inbound_intent: inboundIntent,
    escalated,
    escalation_reason: escalationReason,
    escalated_at: escalated ? endedAt : null,
    transfer_result: custom.transfer_result || null,
    appointment_changed_to: custom.appointment_changed_to || null,
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
    nodes.push({
      call_id: callId,
      channel: 'voice',
      node_id: direction === 'inbound' ? 'IB3' : 'OB1',
      branch_selected: identityVerified ? 'yes' : 'no',
      payload: { auth_attempts: custom.auth_attempts ?? null },
    });
  }
  if (inboundIntent) {
    nodes.push({
      call_id: callId, channel: 'voice', node_id: 'IB4',
      presented_options: ['renewal', 'appointment', 'accident', 'other'],
      branch_selected: inboundIntent,
    });
  }
  if (escalated) {
    nodes.push({
      call_id: callId, channel: 'voice',
      node_id: escalationReason === 'accident' ? 'E-ACC' : 'H-ESC',
      payload: { escalation_reason: escalationReason, transfer_result: custom.transfer_result ?? null },
    });
  }
  if (custom.appointment_changed_to) {
    nodes.push({ call_id: callId, channel: 'voice', node_id: 'IB5', utterance_text: custom.appointment_changed_to });
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

  // F1判定: OB(発信)のみ。不在・拒否・意向未取得 → SMSフォロー(マジックリンク → CBチャット)
  // IBの認証失敗・事故・その他は通話内で H-ESC / E-ACC(人へ)に抜けるため SMS は送らない。
  const needsFollowup =
    direction === 'outbound' &&
    !escalated &&
    (toBool(custom.followup_sms_needed) === true || (!branch && identityVerified !== true));

  if (needsFollowup && phone) {
    try {
      const { token, url } = await issueMagicLink({
        call_id: callId,
        customer_name: dyn.customer_name || null,
        customer_phone: phone,
        policy_expiry_date: dyn.policy_expiry_date || null,
      });
      // F1-a: 架電→不在→SMS。特定電子メール法対応(サプレッション照合・オプトアウト導線)込み
      const result = await sendAkinaiSms(phone, url, dyn.customer_name || null, 'F1-a', token);
      await logEvidence({
        call_id: callId, channel: 'voice', node_id: 'F1',
        payload: {
          sms_mode: 'F1-a',
          sms_sent: result.ok,
          sms_to: phone,
          delivery_status: result.status ?? result.reason ?? null,
          opt_out_shown: true,
          suppression_checked: true,
        },
      });
      await upsertSession(callId, {
        sms_mode: 'F1-a',
        sms_sent_at: result.ok ? new Date().toISOString() : null,
        sms_delivery_status: result.status ?? result.reason ?? null,
        opt_out_shown: true,
        suppression_checked: true,
      });
    } catch (e) {
      console.error('[akinai] F1 followup failed:', e);
    }
    await finalizeSession(callId);
    return NextResponse.json({ ok: true, route: 'F1' });
  }

  // 予約確定の確認SMS: 来店予約(S6)または予約変更(IB5)が確定した通話後に携帯へ自動送信。
  // SMSは短文+URLのみ(文字数節約)。詳細はWebの予約確認ページ /akinai/booking で表示。
  const appointmentText = custom.appointment_at || custom.appointment_changed_to;
  if (appointmentText && !escalated && phone && isJapaneseMobile(phone)) {
    try {
      const { url: detailUrl } = await issueBookingToken(callId);
      const confirmResult = await sendAppointmentConfirmSms(phone, detailUrl, !!custom.appointment_changed_to);
      await logEvidence({
        call_id: callId, channel: 'voice', node_id: 'SMS-CONFIRM',
        payload: {
          sms_to: phone,
          sms_sent: confirmResult.ok,
          delivery_status: confirmResult.status ?? confirmResult.reason ?? null,
          appointment_text: appointmentText,
          detail_url: detailUrl,
          changed: !!custom.appointment_changed_to,
        },
      });
    } catch (e) {
      console.error('[akinai] confirm SMS failed:', e);
    }
  }

  // 証跡確定(ハッシュ・TSA) → 後確(R1/R2)。後確は入口によらず同一(A→R1/B・C→R2)。
  // エスカレーション済み(事故・人へ引き継ぎ)の場合は人が対応するため後確メールは送らない。
  await finalizeSession(callId);
  let postConfirm: 'R1' | 'R2' | null = null;
  if (branch && !escalated) {
    postConfirm = await sendPostConfirmMail(callId);
  }
  return NextResponse.json({ ok: true, route: postConfirm ?? (escalated ? 'escalated' : 'none') });
}
