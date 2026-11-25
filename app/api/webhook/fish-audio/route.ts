import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchNotifications, type NormalizedCall } from '@/lib/notify/dispatch';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Fish Audio Webhook endpoint (call.ended / call.analyzed / phone_call.dial_finished)
// 参照: https://docs.fish.audio/agents/monitor/webhooks.md
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ success: true, message: 'Webhook endpoint is active' });
    }

    // 署名検証(FISH_AUDIO_WEBHOOK_SECRET設定時のみ)
    const secret = process.env.FISH_AUDIO_WEBHOOK_SECRET;
    if (secret) {
      const signatureHeader = request.headers.get('x-fish-webhook-signature');
      if (!isValidFishSignature(rawBody, signatureHeader, secret)) {
        console.error('[fish-audio webhook] signature verification failed');
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.event;
    console.log('[fish-audio webhook] event:', eventType);

    if (eventType === 'call.ended') {
      const call = normalizeFishCall(payload);
      await saveCallToDb(call);
      // 通知は call.analyzed(分析完了)時に送るため、ここでは送信しない(Retell側の運用と統一)。
    } else if (eventType === 'call.analyzed') {
      const call = normalizeFishCall(payload);
      await saveCallToDb(call);
      await dispatchNotifications(call, true);
    } else {
      console.log('[fish-audio webhook] unknown event type:', eventType);
    }

    return NextResponse.json({ success: true, received: true, event: eventType });
  } catch (error: any) {
    console.error('[fish-audio webhook] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function isValidFishSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;

  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (age > 300) return false; // 5分以上古い/未来のリクエストは拒否

  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Fish Audioのcall.ended/call.analyzedペイロードを、Retellと同じ内部形式(NormalizedCall)に変換する。
function normalizeFishCall(payload: any): NormalizedCall {
  const session = payload.session || {};
  const analysis = payload.analysis;

  // analysis.data は [{name, type, value, rationale}] の配列形式。
  // 既存の custom_analysis_data(フラットな { フィールド名: 値 })に変換する。
  const customAnalysisData: Record<string, unknown> = {};
  if (Array.isArray(analysis?.data)) {
    for (const field of analysis.data) {
      if (field?.name) customAnalysisData[field.name] = field.value;
    }
  }

  // items(メッセージ配列)から簡易transcriptを組み立てる
  let transcript: string | undefined;
  if (Array.isArray(payload.items)) {
    transcript = payload.items
      .filter((i: any) => i.type === 'message')
      .map((i: any) => `${i.role}: ${i.content}`)
      .join('\n');
  }

  return {
    call_id: session.id || session.session_id,
    agent_id: session.agent_id,
    from_number: session.caller_number,
    to_number: session.dialed_number,
    start_timestamp: session.started_at ? new Date(session.started_at).getTime() : null,
    end_timestamp: session.ended_at ? new Date(session.ended_at).getTime() : null,
    transcript,
    recording_url: null, // Fish AudioのWebhookペイロードに含まれないため、別途API取得が必要(未実装)
    call_analysis: {
      call_summary: analysis?.summary,
      user_sentiment: customAnalysisData.user_sentiment as string | undefined,
      custom_analysis_data: customAnalysisData,
    },
  };
}

async function saveCallToDb(call: NormalizedCall) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    if (!call.call_id) return;

    const admin = createAdminClient();
    let tenantId: string | null = null;
    if (call.agent_id) {
      const { data: tenant } = await admin.from('tenants').select('id').eq('agent_id', call.agent_id).single();
      tenantId = tenant?.id ?? null;
    }

    const analysis = call.call_analysis || {};
    const startTs = call.start_timestamp ?? null;
    const endTs = call.end_timestamp ?? null;

    await admin.from('calls').upsert(
      {
        tenant_id: tenantId,
        retell_call_id: call.call_id, // 列名はRetell前提だが、provider共通のcall_idとして使う
        agent_id: call.agent_id ?? null,
        start_timestamp: startTs,
        end_timestamp: endTs,
        duration_ms: startTs && endTs ? endTs - startTs : null,
        from_number: call.from_number ?? null,
        to_number: call.to_number ?? null,
        transcript: call.transcript ?? null,
        summary: analysis.call_summary ?? null,
        sentiment: analysis.user_sentiment ?? null,
        custom_analysis: analysis as Record<string, unknown>,
        recording_url: call.recording_url ?? null,
      },
      { onConflict: 'retell_call_id' }
    );
  } catch (err) {
    console.error('[fish-audio webhook] Failed to save call to DB:', err);
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhook/fish-audio',
    events: ['call.ended', 'call.analyzed', 'phone_call.dial_finished'],
    signatureVerificationEnabled: !!process.env.FISH_AUDIO_WEBHOOK_SECRET,
    message: 'Webhook endpoint is ready to receive Fish Audio events',
  });
}
