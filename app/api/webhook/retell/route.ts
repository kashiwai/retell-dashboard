import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

async function handleCallEnded(payload: any) {
  try {
    const call = payload.call || payload;
    
    // Try LINE Messaging API first
    const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (lineAccessToken) {
      await sendLineMessagingNotification(call, false);
      console.log('LINE Messaging API notification sent for call:', call.call_id);
    }
    
    // Also try LINE Notify if configured
    const lineNotifyToken = process.env.LINE_NOTIFY_TOKEN;
    if (lineNotifyToken) {
      const message = formatCallEndedMessage(call);
      await sendLineNotification(lineNotifyToken, message);
      console.log('LINE Notify notification sent for call:', call.call_id);
    }
    
    if (!lineAccessToken && !lineNotifyToken) {
      console.log('No LINE tokens configured');
    }
  } catch (error) {
    console.error('Failed to send LINE notification:', error);
  }
}

async function handleCallAnalyzed(payload: any) {
  try {
    console.log('=== HANDLING CALL ANALYZED ===');
    console.log('Payload structure:', JSON.stringify(payload, null, 2));
    
    // Extract call data - Retell may use different structures
    const call = payload.call || payload.data || payload;
    
    // Log what we found
    console.log('Call data extracted:', {
      call_id: call.call_id,
      has_call_analysis: !!call.call_analysis,
      has_summary: !!call.call_analysis?.summary,
      has_custom_analysis: !!call.call_analysis?.custom_analysis,
      summary_preview: call.call_analysis?.summary?.substring(0, 100)
    });
    
    // Try LINE Messaging API first
    const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (lineAccessToken) {
      await sendLineMessagingNotification(call, true);
      console.log('LINE Messaging API analysis sent for call:', call.call_id);
    }
    
    // Also try LINE Notify if configured
    const lineNotifyToken = process.env.LINE_NOTIFY_TOKEN;
    if (lineNotifyToken) {
      const message = formatAnalyzedMessage(call);
      await sendLineNotification(lineNotifyToken, message);
      console.log('LINE Notify analysis sent for call:', call.call_id);
    }
    
    if (!lineAccessToken && !lineNotifyToken) {
      console.log('No LINE tokens configured');
    }
  } catch (error) {
    console.error('Failed to send analysis notification:', error);
  }
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
async function sendLineMessagingNotification(call: any, isAnalysis: boolean) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  
  // Get user ID from environment variable (optional)
  const userId = process.env.LINE_USER_ID;
  
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
  const customAnalysis = analysis.custom_analysis || {};
  
  const urgencyColor = {
    '高': '#FF0000',
    '中': '#FFA500',
    '低': '#00AA00'
  };
  
  const urgencyEmoji = {
    '高': '🔴',
    '中': '🟡',
    '低': '🟢'
  };
  
  const sentimentEmoji = {
    'positive': '😊',
    'neutral': '😐',
    'negative': '😔'
  };
  
  return {
    type: 'flex',
    altText: '通話分析が完了しました',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📊 通話分析完了',
            size: 'xl',
            weight: 'bold',
            color: '#FFFFFF'
          }
        ],
        backgroundColor: '#0084FF',
        paddingAll: '15px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '要約',
            size: 'sm',
            color: '#888888',
            margin: 'md'
          },
          {
            type: 'text',
            text: analysis.summary || '要約なし',
            size: 'sm',
            wrap: true,
            margin: 'sm'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          ...(customAnalysis.customer_name ? [{
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              {
                type: 'text',
                text: '👤 お客様',
                size: 'sm',
                color: '#888888',
                flex: 0
              },
              {
                type: 'text',
                text: customAnalysis.customer_name,
                size: 'sm',
                flex: 1,
                align: 'end'
              }
            ],
            margin: 'md' as const
          }] : []),
          ...(customAnalysis.phone_number ? [{
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              {
                type: 'text',
                text: '📱 電話番号',
                size: 'sm',
                color: '#888888',
                flex: 0
              },
              {
                type: 'text',
                text: customAnalysis.phone_number,
                size: 'sm',
                flex: 1,
                align: 'end'
              }
            ],
            margin: 'md' as const
          }] : []),
          ...(customAnalysis.requirement ? [{
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              {
                type: 'text',
                text: '📋 要件',
                size: 'sm',
                color: '#888888',
                flex: 0
              },
              {
                type: 'text',
                text: customAnalysis.requirement,
                size: 'sm',
                flex: 1,
                align: 'end'
              }
            ],
            margin: 'md' as const
          }] : []),
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '⚡ 緊急度',
                size: 'sm',
                color: '#888888',
                flex: 0
              },
              {
                type: 'text',
                text: `${urgencyEmoji[customAnalysis.urgency as keyof typeof urgencyEmoji] || '🟢'} ${customAnalysis.urgency || '低'}`,
                size: 'sm',
                flex: 1,
                align: 'end',
                color: urgencyColor[customAnalysis.urgency as keyof typeof urgencyColor] || '#00AA00'
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
                text: '😊 感情',
                size: 'sm',
                color: '#888888',
                flex: 0
              },
              {
                type: 'text',
                text: `${sentimentEmoji[analysis.sentiment as keyof typeof sentimentEmoji] || '😐'} ${
                  analysis.sentiment === 'positive' ? 'ポジティブ' :
                  analysis.sentiment === 'negative' ? 'ネガティブ' : '中立'
                }`,
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
            type: 'button',
            action: {
              type: 'uri',
              label: '詳細を確認',
              uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/calls/${call.call_id}`
            },
            style: 'primary',
            color: '#0084FF'
          }
        ],
        spacing: 'sm',
        paddingAll: '10px'
      }
    }
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