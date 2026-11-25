import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchNotifications } from '@/lib/notify/dispatch';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Retell Webhook endpoint
export async function POST(request: NextRequest) {
  try {
    // Log request method and URL for debugging
    console.log('Webhook request:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // Parse the request body
    let payload: any = {};
    
    try {
      const text = await request.text();
      if (text) {
        payload = JSON.parse(text);
      } else {
        // Handle empty body for test webhook
        console.log('Empty webhook body - test request');
        return NextResponse.json({ 
          success: true,
          message: 'Webhook endpoint is active and ready to receive events',
          status: 'ok'
        });
      }
    } catch (parseError) {
      console.log('Failed to parse body, treating as test webhook');
      return NextResponse.json({ 
        success: true,
        message: 'Webhook endpoint is active',
        status: 'ok'
      });
    }
    
    console.log('Retell webhook payload:', payload);

    // Check event type - Retell uses different formats
    const eventType = payload.event || payload.type || payload.event_type;
    
    console.log('=== RETELL WEBHOOK EVENT ===');
    console.log('Event type:', eventType);
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    console.log('===========================');
    
    // Handle test webhook from Retell
    if (eventType === 'test' || eventType === 'webhook.test' || payload.test === true) {
      console.log('Test webhook received from Retell');
      return NextResponse.json({ 
        success: true,
        message: 'Webhook test successful',
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle various event formats from Retell
    if (eventType === 'call_ended' || eventType === 'call.ended' || eventType === 'end_of_call') {
      console.log('Processing call_ended event');
      await saveCallToDb(payload);
      await checkAndAutoSuspend(payload);
      await handleCallEnded(payload);
    } else if (eventType === 'call_analyzed' || eventType === 'call.analyzed' || eventType === 'analysis_completed' || eventType === 'post_call_analysis_completed') {
      console.log('Processing call_analyzed event with summary');
      await saveCallToDb(payload);
      await handleCallAnalyzed(payload);
    } else {
      console.log(`Unknown event type: ${eventType}`);
    }

    const response = NextResponse.json({ 
      success: true,
      received: true,
      event: eventType 
    });
    
    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-retell-signature, x-api-key');
    
    return response;
  } catch (error: any) {
    console.error('Webhook error:', error);
    const errorResponse = NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
    
    // Add CORS headers to error response too
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-retell-signature, x-api-key');
    
    return errorResponse;
  }
}

// Supabase DBに通話データを保存（テナント識別付き）
async function saveCallToDb(payload: unknown) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return

    const p = payload as Record<string, unknown>
    const call = (p.call ?? p) as Record<string, unknown>
    if (!call.call_id) return

    const admin = createAdminClient()
    const agentId = call.agent_id as string | undefined

    // agent_id からテナントを識別
    let tenantId: string | null = null
    if (agentId) {
      const { data: tenant } = await admin
        .from('tenants').select('id').eq('agent_id', agentId).single()
      tenantId = tenant?.id ?? null
    }

    const analysis = (call.call_analysis ?? {}) as Record<string, unknown>
    const startTs = call.start_timestamp as number | null
    const endTs = call.end_timestamp as number | null

    await admin.from('calls').upsert({
      tenant_id: tenantId,
      retell_call_id: call.call_id as string,
      agent_id: agentId ?? null,
      start_timestamp: startTs,
      end_timestamp: endTs,
      duration_ms: startTs && endTs ? (endTs - startTs) * 1000 : null,
      status: call.call_status as string ?? null,
      from_number: call.from_number as string ?? null,
      to_number: call.to_number as string ?? null,
      transcript: call.transcript as string ?? null,
      summary: analysis.call_summary as string ?? null,
      sentiment: analysis.user_sentiment as string ?? null,
      fault_code: (analysis.custom_analysis_data as Record<string, unknown>)?.fault_code as string ?? null,
      resolution_status: analysis.resolution_status as string ?? null,
      custom_analysis: analysis as Record<string, unknown>,
      recording_url: call.recording_url as string ?? null,
    }, { onConflict: 'retell_call_id' })
  } catch (err) {
    console.error('Failed to save call to DB:', err)
  }
}

// 月額上限チェック → 超過なら自動停止
async function checkAndAutoSuspend(payload: unknown) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return

    const p = payload as Record<string, unknown>
    const call = (p.call ?? p) as Record<string, unknown>
    const agentId = call.agent_id as string | undefined
    if (!agentId) return

    const admin = createAdminClient()
    const { data: tenant } = await admin
      .from('tenants')
      .select('id, status, monthly_limit, monthly_fee, minute_rate, twilio_phone_sid, trunk_sid')
      .eq('agent_id', agentId)
      .single()

    if (!tenant || tenant.status !== 'active' || !tenant.monthly_limit) return

    // 当月の累計費用を算出
    const now = new Date()
    const monthStr = now.toISOString().slice(0, 7)
    const startOfMonth = new Date(`${monthStr}-01T00:00:00Z`)
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)

    const { data: calls } = await admin
      .from('calls')
      .select('duration_ms')
      .eq('tenant_id', tenant.id)
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', endOfMonth.toISOString())

    const totalMs = (calls ?? []).reduce((sum: number, c: Record<string, number | null>) => sum + (c.duration_ms ?? 0), 0)
    const totalMinutes = Math.ceil(totalMs / 60000)
    const totalFee = tenant.monthly_fee + totalMinutes * tenant.minute_rate

    if (totalFee >= tenant.monthly_limit) {
      console.log(`[AutoSuspend] Tenant ${tenant.id}: ¥${totalFee} >= limit ¥${tenant.monthly_limit}. Suspending.`)

      // DB を停止状態に更新
      await admin.from('tenants').update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
      }).eq('id', tenant.id)

      // 着信ブロック：Twilio 番号を SIP Trunk から切り離す
      if (tenant.twilio_phone_sid && tenant.trunk_sid && process.env.NEXT_PUBLIC_APP_URL) {
        const { suspendPhoneNumber } = await import('@/lib/provisioning/twilio')
        const suspendedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twiml/suspended`
        await suspendPhoneNumber(tenant.twilio_phone_sid, tenant.trunk_sid, suspendedUrl)
        console.log(`[AutoSuspend] Twilio number ${tenant.twilio_phone_sid} unlinked from trunk.`)
      }
    }
  } catch (err) {
    console.error('[AutoSuspend] Error:', err)
  }
}

async function handleCallEnded(payload: any) {
  // 通知は call_analyzed(分析完了)時に、会社名・要約・対応区分が揃った状態で1回だけ送る。
  // ここでは通知しない(情報不足の二重通知を防ぐ)。DB保存は POST ハンドラ側で実施済み。
  const call = payload.call || payload;
  console.log('[notify] call_ended: 通知は分析完了(call_analyzed)時に送信します。call_id=', call?.call_id);
}

async function handleCallAnalyzed(payload: any) {
  console.log('=== HANDLING CALL ANALYZED ===');
  const call = payload.call || payload.data || payload;
  console.log('Call data extracted:', {
    call_id: call.call_id,
    has_call_analysis: !!call.call_analysis,
    has_custom_analysis: !!call.call_analysis?.custom_analysis_data,
    summary_preview: call.call_analysis?.summary?.substring(0, 100),
  });
  await dispatchNotifications(call, true);
}

// GET endpoint to check webhook status
export async function GET() {
  const response = NextResponse.json({
    status: 'active',
    endpoint: '/api/webhook/retell',
    events: ['call_ended', 'call_analyzed'],
    lineNotifyConfigured: !!process.env.LINE_NOTIFY_TOKEN,
    lineMessagingConfigured: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    lineBotInfo: process.env.LINE_CHANNEL_ACCESS_TOKEN ? {
      displayName: 'Call_Sheep01',
      basicId: '@818rmott'
    } : null,
    message: 'Webhook endpoint is ready to receive Retell events'
  });
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-retell-signature, x-api-key');
  
  return response;
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-retell-signature, x-api-key');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}