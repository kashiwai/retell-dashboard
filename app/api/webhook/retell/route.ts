import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Retell Webhook endpoint
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('Retell webhook received:', payload);

    // Check event type
    const eventType = payload.event;
    
    if (eventType === 'call_ended' || eventType === 'call.ended') {
      // Call ended event - send LINE notification
      await handleCallEnded(payload);
    } else if (eventType === 'call_analyzed' || eventType === 'call.analyzed') {
      // Call analysis completed - send updated notification
      await handleCallAnalyzed(payload);
    }

    return NextResponse.json({ success: true });
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
    // Get LINE token from environment or database
    const lineToken = process.env.LINE_NOTIFY_TOKEN;
    
    if (!lineToken) {
      console.log('LINE Notify token not configured');
      return;
    }

    const call = payload.call || payload;
    
    // Format message
    const message = formatCallEndedMessage(call);
    
    // Send to LINE
    await sendLineNotification(lineToken, message);
    
    console.log('LINE notification sent for call:', call.call_id);
  } catch (error) {
    console.error('Failed to send LINE notification:', error);
  }
}

async function handleCallAnalyzed(payload: any) {
  try {
    const lineToken = process.env.LINE_NOTIFY_TOKEN;
    
    if (!lineToken) {
      console.log('LINE Notify token not configured');
      return;
    }

    const call = payload.call || payload;
    
    // Format message with analysis
    const message = formatAnalyzedMessage(call);
    
    // Send to LINE
    await sendLineNotification(lineToken, message);
    
    console.log('Analysis notification sent for call:', call.call_id);
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

// GET endpoint to check webhook status
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhook/retell',
    events: ['call_ended', 'call_analyzed'],
    lineNotifyConfigured: !!process.env.LINE_NOTIFY_TOKEN
  });
}