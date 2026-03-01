import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Disable body parsing to handle raw body
export const runtime = 'edge';

// Retell Webhook endpoint
export async function POST(request: NextRequest) {
  try {
    // Log all headers for debugging
    const headers: any = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Webhook headers:', headers);
    
    // Check for API key in header if Retell requires it
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    if (apiKey) {
      console.log('API key provided in webhook request');
    }
    
    // Get the raw body
    const rawBody = await request.text();
    
    // Handle empty body for test webhooks
    if (!rawBody) {
      console.log('Empty webhook body received - likely a test');
      return NextResponse.json({ 
        success: true,
        message: 'Webhook endpoint active',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }
    
    const payload = JSON.parse(rawBody);
    console.log('Retell webhook received:', payload);
    
    // Optional: Verify webhook signature if secret is configured
    const webhookSecret = process.env.RETELL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-retell-signature');
      if (!signature) {
        console.warn('No signature provided in webhook request');
        // For now, allow the request to proceed
      }
      // TODO: Implement signature verification if needed
    }

    // Check event type
    const eventType = payload.event || payload.type;
    
    // Handle test webhook from Retell
    if (eventType === 'test' || eventType === 'webhook.test' || payload.test === true) {
      console.log('Test webhook received from Retell');
      return NextResponse.json({ 
        success: true,
        message: 'Webhook test successful',
        timestamp: new Date().toISOString()
      });
    }
    
    if (eventType === 'call_ended' || eventType === 'call.ended') {
      // Call ended event - send LINE notification
      await handleCallEnded(payload);
    } else if (eventType === 'call_analyzed' || eventType === 'call.analyzed') {
      // Call analysis completed - send updated notification
      await handleCallAnalyzed(payload);
    }

    return NextResponse.json({ 
      success: true,
      received: true,
      event: eventType 
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
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
    const call = payload.call || payload;
    
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
  
  // Broadcast to all friends of the bot
  const message = isAnalysis ? formatAnalyzedMessageRich(call) : formatCallEndedMessageRich(call);
  
  const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      messages: [message]
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('LINE Messaging API error:', error);
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
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhook/retell',
    events: ['call_ended', 'call_analyzed'],
    lineNotifyConfigured: !!process.env.LINE_NOTIFY_TOKEN,
    lineMessagingConfigured: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    lineBotInfo: process.env.LINE_CHANNEL_ACCESS_TOKEN ? {
      displayName: 'Call_Sheep01',
      basicId: '@818rmott'
    } : null
  });
}