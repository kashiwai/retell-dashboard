import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAgentNotificationConfig,
  resolveCategoryRoute,
  shouldNotify,
  type AgentNotificationConfig,
} from '@/config/notification-routing';

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
      fault_code: (analysis.custom_analysis as Record<string, unknown>)?.fault_code as string ?? null,
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
    has_custom_analysis: !!call.call_analysis?.custom_analysis,
    summary_preview: call.call_analysis?.summary?.substring(0, 100),
  });
  await dispatchNotifications(call, true);
}

/**
 * agent_id ベースで通知を振り分ける中核ディスパッチャ。
 * - notification-routing.ts に設定があれば、エージェント別の LINE 宛先 / Google Chat へ送信
 * - 設定が無ければ従来どおり共通 LINE_CHANNEL_ACCESS_TOKEN で broadcast(後方互換)
 * - 通知条件(urgent-only)にも対応
 */
async function dispatchNotifications(call: any, isAnalysis: boolean) {
  try {
    const config = getAgentNotificationConfig(call?.agent_id);
    const customAnalysis = call?.call_analysis?.custom_analysis || {};
    const urgency = customAnalysis.urgency;

    if (config && !shouldNotify(config, urgency)) {
      console.log(`[notify] skipped by condition (urgent-only) for agent ${call.agent_id}`);
      return;
    }

    // --- LINE Messaging API ---
    const lineToken = config?.lineChannelAccessTokenEnv
      ? process.env[config.lineChannelAccessTokenEnv]
      : process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const lineTarget = config?.lineTargetEnv
      ? process.env[config.lineTargetEnv]
      : process.env.LINE_USER_ID;

    if (lineToken) {
      await sendLineMessagingNotification(call, isAnalysis, lineToken, lineTarget);
      console.log(`[notify] LINE sent (${lineTarget ? 'push' : 'broadcast'}) for call ${call.call_id}`);
    } else {
      console.log('[notify] no LINE token configured');
    }

    // --- Google Chat (Incoming Webhook) ---
    const chatUrl = resolveGoogleChatWebhook(config, customAnalysis.category);
    if (chatUrl) {
      await sendGoogleChatNotification(call, isAnalysis, config, chatUrl);
      console.log(`[notify] Google Chat sent for call ${call.call_id}`);
    }
  } catch (error) {
    console.error('[notify] dispatch failed:', error);
  }
}

/** カテゴリ上書き → エージェント既定 の順で Google Chat Webhook URL を解決 */
function resolveGoogleChatWebhook(
  config: AgentNotificationConfig | null,
  categoryKey: string | null | undefined
): string | undefined {
  if (!config) return undefined;
  const route = resolveCategoryRoute(config, categoryKey);
  if (route?.overrideGoogleChatWebhookEnv && process.env[route.overrideGoogleChatWebhookEnv]) {
    return process.env[route.overrideGoogleChatWebhookEnv];
  }
  return config.googleChatWebhookEnv ? process.env[config.googleChatWebhookEnv] : undefined;
}

async function sendLineNotification(token: string, message: string) {
  const response = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      message: message,
    }),
  });

  if (!response.ok) {
    throw new Error(`LINE Notify API error: ${response.status}`);
  }

  return response.json();
}

function formatCallEndedMessage(call: any): string {
  const duration = call.end_timestamp && call.start_timestamp 
    ? Math.floor((call.end_timestamp - call.start_timestamp) / 1000)
    : 0;
  
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  return `
🔔 新着通話が完了しました

📞 通話ID: ${call.call_id || '不明'}
📱 発信者: ${call.from_number || '不明'}
⏱️ 通話時間: ${minutes}分${seconds}秒
📅 日時: ${new Date(call.start_timestamp || Date.now()).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
🤖 エージェント: ${call.agent_id || 'AI受付'}

詳細はダッシュボードでご確認ください
  `.trim();
}

function formatAnalyzedMessage(call: any): string {
  const analysis = call.call_analysis || {};
  const customAnalysis = analysis.custom_analysis || {};
  
  const urgencyEmoji = {
    '高': '🔴',
    '中': '🟡',
    '低': '🟢'
  };

  const sentimentMap = {
    'positive': '😊 ポジティブ',
    'neutral': '😐 中立',
    'negative': '😔 ネガティブ'
  };
  
  return `
📊 通話分析が完了しました

📞 通話ID: ${call.call_id || '不明'}

📝 要約:
${analysis.summary || '要約なし'}

${customAnalysis.customer_name ? `👤 お客様: ${customAnalysis.customer_name}` : ''}
${customAnalysis.phone_number ? `📱 電話番号: ${customAnalysis.phone_number}` : ''}
${customAnalysis.requirement ? `📋 要件: ${customAnalysis.requirement}` : ''}
${customAnalysis.urgency ? `⚡ 緊急度: ${urgencyEmoji[customAnalysis.urgency as keyof typeof urgencyEmoji] || '🟢'} ${customAnalysis.urgency}` : ''}

😊 感情分析: ${sentimentMap[analysis.sentiment as keyof typeof sentimentMap] || '😐 不明'}

🔗 詳細を確認:
${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/calls/${call.call_id}
  `.trim();
}

// Send notification via LINE Messaging API
// token / userId はエージェント別設定から渡す(未指定なら送信先なし=broadcast)
async function sendLineMessagingNotification(
  call: any,
  isAnalysis: boolean,
  token: string,
  userId?: string
) {
  if (!token) return;

  const message = isAnalysis ? formatAnalyzedMessageRich(call) : formatCallEndedMessageRich(call);
  
  // Use broadcast if no specific user ID, otherwise use push
  const endpoint = userId 
    ? 'https://api.line.me/v2/bot/message/push'
    : 'https://api.line.me/v2/bot/message/broadcast';
    
  const requestBody = userId
    ? {
        to: userId,
        messages: [message]
      }
    : {
        messages: [message]
      };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('LINE Messaging API error:', error);
    if (error.includes("You can't send messages to yourself")) {
      console.error('Error: Bot cannot send messages to itself. Using broadcast instead.');
    }
  } else {
    console.log(`LINE notification sent successfully via ${userId ? 'push' : 'broadcast'} API`);
  }
}

function formatCallEndedMessageRich(call: any): any {
  const duration = call.end_timestamp && call.start_timestamp 
    ? Math.floor((call.end_timestamp - call.start_timestamp) / 1000)
    : 0;
  
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  return {
    type: 'flex',
    altText: '新着通話が完了しました',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📞 新着通話',
            size: 'xl',
            weight: 'bold',
            color: '#FFFFFF'
          }
        ],
        backgroundColor: '#00B900',
        paddingAll: '15px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '通話が完了しました',
            size: 'lg',
            weight: 'bold',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '📱 発信者',
                size: 'sm',
                color: '#888888',
                flex: 0
              },
              {
                type: 'text',
                text: call.from_number || '不明',
                size: 'sm',
                flex: 1,
                align: 'end'
              }
            ],
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '⏱️ 通話時間',
                size: 'sm',
                color: '#888888',
                flex: 0
              },
              {
                type: 'text',
                text: `${minutes}分${seconds}秒`,
                size: 'sm',
                flex: 1,
                align: 'end'
              }
            ],
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '📅 日時',
                size: 'sm',
                color: '#888888',
                flex: 0
              },
              {
                type: 'text',
                text: new Date(call.start_timestamp || Date.now()).toLocaleString('ja-JP', { 
                  timeZone: 'Asia/Tokyo',
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                size: 'sm',
                flex: 1,
                align: 'end'
              }
            ],
            margin: 'md'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '分析完了後、詳細情報をお送りします',
            size: 'xs',
            color: '#888888',
            align: 'center'
          }
        ],
        paddingAll: '10px'
      }
    }
  };
}

function formatAnalyzedMessageRich(call: any): any {
  const analysis = call.call_analysis || {};
  const custom = analysis.custom_analysis || {};

  // 必須項目(必ず表示・値が無ければプレースホルダ)
  const company = custom.company || '（確認できず）';
  const phone = custom.phone_number || call.from_number || '（不明）';
  const summary = analysis.call_summary || analysis.summary || custom.requirement || '（要約なし）';
  const disposition = custom.disposition || '（未分類）';

  // ラベル行ヘルパー
  const kv = (label: string, value: string) => ({
    type: 'box' as const,
    layout: 'horizontal' as const,
    contents: [
      { type: 'text' as const, text: label, size: 'sm' as const, color: '#888888', flex: 2 },
      { type: 'text' as const, text: value, size: 'sm' as const, flex: 3, align: 'end' as const, wrap: true },
    ],
    margin: 'md' as const,
  });

  // 必須ブロック(会社名・電話番号・対応区分)
  const rows: any[] = [
    kv('🏢 会社名', company),
    kv('📱 電話番号', phone),
    kv('🔁 対応区分', disposition),
  ];
  // 補足(あれば)
  if (custom.customer_name) rows.push(kv('👤 お客様', custom.customer_name));
  if (custom.category) rows.push(kv('🗂 カテゴリ', custom.category));
  if (custom.urgency) rows.push(kv('⚡ 緊急度', custom.urgency));
  if (custom.fault_code) rows.push(kv('🛠 故障コード', custom.fault_code));

  return {
    type: 'flex',
    altText: `通話通知｜${company}／${phone}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: '📊 通話内容のお知らせ', size: 'xl', weight: 'bold', color: '#FFFFFF' }],
        backgroundColor: '#0084FF',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📝 内容サマリー', size: 'sm', color: '#888888' },
          { type: 'text', text: summary, size: 'sm', wrap: true, margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          ...rows,
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          ...(call.call_id ? [{
            type: 'button' as const,
            action: { type: 'uri' as const, label: '🎧 録音を再生', uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me'}/api/recording/${call.call_id}` },
            style: 'primary' as const,
            color: '#00B900',
          }] : []),
          {
            type: 'button',
            action: { type: 'uri', label: 'ダッシュボードで確認', uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me'}/dashboard/calls` },
            style: 'secondary',
          },
        ],
        spacing: 'sm',
        paddingAll: '10px',
      },
    },
  };
}

// Send notification via Google Chat Incoming Webhook
async function sendGoogleChatNotification(
  call: any,
  isAnalysis: boolean,
  config: AgentNotificationConfig | null,
  webhookUrl: string
) {
  const message = formatGoogleChatCard(call, isAnalysis, config);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error('Google Chat webhook error:', response.status, err);
  }
}

function formatGoogleChatCard(
  call: any,
  isAnalysis: boolean,
  config: AgentNotificationConfig | null
): any {
  const analysis = call.call_analysis || {};
  const custom = analysis.custom_analysis || {};

  const duration =
    call.end_timestamp && call.start_timestamp
      ? Math.floor((call.end_timestamp - call.start_timestamp) / 1000)
      : 0;
  const durationText = `${Math.floor(duration / 60)}分${duration % 60}秒`;

  const categoryRoute =
    config && custom.category
      ? config.categories.find((c) => c.key === custom.category)
      : undefined;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://retell-dashboard-opal.vercel.app'}/dashboard/calls`;

  // ラベル付き項目(値があるものだけ表示)
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: unknown) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      rows.push({ label, value: `${value}` });
    }
  };
  const summaryText = analysis.summary || analysis.call_summary || custom.requirement || '（要約なし）';
  // 必須項目(必ず表示・値が無ければプレースホルダ)
  push('🏢 会社名', custom.company || '（確認できず）');
  push('📱 電話番号', custom.phone_number || call.from_number || '（不明）');
  push('🔁 対応区分', custom.disposition || '（未分類）');
  // 補足(あれば)
  push('👤 お客様', custom.customer_name);
  push('🗂 カテゴリ', categoryRoute?.label ?? custom.category);
  push('対象サービス', custom.service);
  push('⚡ 緊急度', custom.urgency);
  push('🛠 故障コード', custom.fault_code);
  push('通話時間', durationText);
  if (categoryRoute?.callbackNote) push('担当', categoryRoute.callbackNote);

  const decoratedWidgets = rows.map((r) => ({
    decoratedText: { topLabel: r.label, text: r.value, wrapText: true },
  }));

  const title = isAnalysis
    ? `📊 通話分析完了${config ? `｜${config.name}` : ''}`
    : `📞 新着通話${config ? `｜${config.name}` : ''}`;

  const sections: any[] = [];
  // 内容サマリーは必ず表示
  sections.push({
    header: '📝 内容サマリー',
    widgets: [{ textParagraph: { text: summaryText } }],
  });
  sections.push({ widgets: decoratedWidgets.length ? decoratedWidgets : [{ textParagraph: { text: '詳細情報はダッシュボードでご確認ください。' } }] });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me';
  const buttons: any[] = [];
  if (call.call_id) {
    buttons.push({ text: '🎧 録音を再生', onClick: { openLink: { url: `${appUrl}/api/recording/${call.call_id}` } } });
  }
  buttons.push({ text: 'ダッシュボードで確認', onClick: { openLink: { url: dashboardUrl } } });
  sections.push({ widgets: [{ buttonList: { buttons } }] });

  return {
    // フォールバック用のプレーンテキスト(通知プレビュー等)
    text: `${title}｜${custom.customer_name || call.from_number || '不明'}`,
    cardsV2: [
      {
        cardId: `retell-call-${call.call_id || 'unknown'}`,
        card: {
          header: {
            title,
            subtitle: `通話ID: ${call.call_id || '不明'}`,
          },
          sections,
        },
      },
    ],
  };
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