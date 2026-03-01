import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// LINE Channel configuration
const CHANNEL_ID = process.env.LINE_CHANNEL_ID || '2009276449';
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '806e26f795ca18457c4c8803d536ee11';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Verify LINE webhook signature
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// LINE Messaging API Webhook endpoint
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-line-signature');
    const body = await request.text();
    
    // Verify signature
    if (!signature || !verifySignature(body, signature)) {
      console.error('Invalid LINE signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const events = JSON.parse(body).events || [];
    
    for (const event of events) {
      console.log('LINE event received:', event);
      
      // Handle different event types
      switch (event.type) {
        case 'message':
          await handleMessage(event);
          break;
        case 'follow':
          await handleFollow(event);
          break;
        case 'unfollow':
          await handleUnfollow(event);
          break;
        case 'postback':
          await handlePostback(event);
          break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LINE webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Handle text messages from users
async function handleMessage(event: any) {
  if (!CHANNEL_ACCESS_TOKEN) {
    console.error('LINE channel access token not configured');
    return;
  }

  const { replyToken, message, source } = event;
  
  if (message.type !== 'text') return;
  
  const userMessage = message.text.toLowerCase();
  let replyMessage = '';
  
  // コマンド解析
  if (userMessage.includes('最新') || userMessage.includes('通話')) {
    replyMessage = await getLatestCalls();
  } else if (userMessage.includes('緊急')) {
    replyMessage = await getUrgentCalls();
  } else if (userMessage.includes('今日')) {
    replyMessage = await getTodayCalls();
  } else if (userMessage.includes('統計') || userMessage.includes('レポート')) {
    replyMessage = await getStatistics();
  } else if (userMessage.includes('ヘルプ') || userMessage === 'help') {
    replyMessage = getHelpMessage();
  } else {
    replyMessage = getDefaultReply();
  }
  
  // Reply to user
  await sendReply(replyToken, replyMessage);
}

// Send reply message
async function sendReply(replyToken: string, text: string) {
  if (!CHANNEL_ACCESS_TOKEN) return;
  
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: 'text',
          text
        }
      ]
    })
  });
  
  if (!response.ok) {
    console.error('Failed to send LINE reply:', await response.text());
  }
}

// Handle follow event (user adds bot as friend)
async function handleFollow(event: any) {
  const userId = event.source.userId;
  const welcomeMessage = `
🎉 TSUNAGARU.AIへようこそ！

通話の要約や分析結果を
リアルタイムでお知らせします。

📱 使い方：
・「最新の通話」- 最新の通話情報
・「緊急」- 緊急度の高い通話
・「今日の通話」- 本日の全通話
・「統計」- 通話統計レポート
・「ヘルプ」- コマンド一覧

ご質問はお気軽にどうぞ！
  `.trim();
  
  await pushMessage(userId, welcomeMessage);
}

// Handle unfollow event
async function handleUnfollow(event: any) {
  const userId = event.source.userId;
  console.log('User unfollowed:', userId);
  // Optionally remove user from database
}

// Handle postback events (button clicks)
async function handlePostback(event: any) {
  const { replyToken, postback, source } = event;
  const data = postback.data;
  
  // Parse postback data
  const params = new URLSearchParams(data);
  const action = params.get('action');
  const callId = params.get('call_id');
  
  let replyMessage = '';
  
  switch (action) {
    case 'view_details':
      replyMessage = await getCallDetails(callId);
      break;
    case 'view_transcript':
      replyMessage = await getCallTranscript(callId);
      break;
    default:
      replyMessage = '処理中にエラーが発生しました。';
  }
  
  await sendReply(replyToken, replyMessage);
}

// Push message to specific user
async function pushMessage(userId: string, text: string) {
  if (!CHANNEL_ACCESS_TOKEN) return;
  
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: userId,
      messages: [
        {
          type: 'text',
          text
        }
      ]
    })
  });
  
  if (!response.ok) {
    console.error('Failed to send LINE push message:', await response.text());
  }
}

// Get latest calls
async function getLatestCalls(): Promise<string> {
  try {
    // Fetch from your API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calls?limit=5`);
    const data = await response.json();
    const calls = data.calls || [];
    
    if (calls.length === 0) {
      return '📞 最新の通話はありません。';
    }
    
    let message = '📞 最新の通話（5件）\n\n';
    
    calls.forEach((call: any, index: number) => {
      const time = new Date(call.start_timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      message += `${index + 1}. ${call.from || '不明'}\n`;
      message += `   📅 ${time}\n`;
      message += `   ⏱ ${call.duration}\n`;
      if (call.summary) {
        message += `   📝 ${call.summary.substring(0, 50)}...\n`;
      }
      message += '\n';
    });
    
    return message;
  } catch (error) {
    console.error('Error fetching calls:', error);
    return '通話情報の取得に失敗しました。';
  }
}

// Get urgent calls
async function getUrgentCalls(): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calls?urgency=high`);
    const data = await response.json();
    const calls = data.calls || [];
    
    const urgentCalls = calls.filter((call: any) => 
      call.urgency === '高' || call.custom_analysis?.urgency === '高'
    );
    
    if (urgentCalls.length === 0) {
      return '🟢 現在、緊急の通話はありません。';
    }
    
    let message = '🔴 緊急度の高い通話\n\n';
    
    urgentCalls.forEach((call: any, index: number) => {
      const time = new Date(call.start_timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      message += `⚠️ ${call.from || '不明'}\n`;
      message += `   📅 ${time}\n`;
      message += `   📝 ${call.summary || '要約なし'}\n`;
      message += `   👤 ${call.customer_name || '不明'}\n`;
      message += '\n';
    });
    
    message += '⚡ 至急対応をお願いします。';
    
    return message;
  } catch (error) {
    console.error('Error fetching urgent calls:', error);
    return '緊急通話の取得に失敗しました。';
  }
}

// Get today's calls
async function getTodayCalls(): Promise<string> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calls?date=${today.toISOString()}`);
    const data = await response.json();
    const calls = data.calls || [];
    
    const todayCalls = calls.filter((call: any) => {
      const callDate = new Date(call.start_timestamp);
      return callDate >= today;
    });
    
    if (todayCalls.length === 0) {
      return '📅 本日の通話はまだありません。';
    }
    
    let message = `📅 本日の通話（${todayCalls.length}件）\n\n`;
    
    const stats = {
      total: todayCalls.length,
      urgent: todayCalls.filter((c: any) => c.urgency === '高').length,
      positive: todayCalls.filter((c: any) => c.sentiment === 'positive').length,
      negative: todayCalls.filter((c: any) => c.sentiment === 'negative').length
    };
    
    message += `📊 統計:\n`;
    message += `・総通話数: ${stats.total}件\n`;
    message += `・緊急: ${stats.urgent}件\n`;
    message += `・ポジティブ: ${stats.positive}件\n`;
    message += `・ネガティブ: ${stats.negative}件\n`;
    
    return message;
  } catch (error) {
    console.error('Error fetching today calls:', error);
    return '本日の通話情報の取得に失敗しました。';
  }
}

// Get statistics
async function getStatistics(): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calls/stats`);
    const stats = await response.json();
    
    const message = `
📊 通話統計レポート

【本日】
📞 総通話数: ${stats.today?.total || 0}件
⏱ 平均通話時間: ${stats.today?.avgDuration || '0:00'}
😊 満足度: ${stats.today?.satisfaction || 'N/A'}%

【今週】
📞 総通話数: ${stats.week?.total || 0}件
📈 前週比: ${stats.week?.growth || '0'}%
🔥 ピーク時間: ${stats.week?.peakHour || 'N/A'}

【傾向】
🔴 緊急案件: ${stats.urgent || 0}件
🟡 要フォロー: ${stats.followUp || 0}件
🟢 解決済み: ${stats.resolved || 0}件

詳細はダッシュボードでご確認ください。
    `.trim();
    
    return message;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return '統計情報の取得に失敗しました。';
  }
}

// Get call details
async function getCallDetails(callId: string | null): Promise<string> {
  if (!callId) return '通話IDが指定されていません。';
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calls/${callId}`);
    const call = await response.json();
    
    if (!call) {
      return '指定された通話が見つかりません。';
    }
    
    const message = `
📞 通話詳細

ID: ${call.call_id}
発信者: ${call.from || '不明'}
日時: ${new Date(call.start_timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
通話時間: ${call.duration}

📝 要約:
${call.summary || '要約なし'}

👤 お客様: ${call.customer_name || '不明'}
📋 要件: ${call.requirement || '不明'}
⚡ 緊急度: ${call.urgency || '低'}
😊 感情: ${call.sentiment === 'positive' ? 'ポジティブ' : call.sentiment === 'negative' ? 'ネガティブ' : '中立'}
    `.trim();
    
    return message;
  } catch (error) {
    console.error('Error fetching call details:', error);
    return '通話詳細の取得に失敗しました。';
  }
}

// Get call transcript
async function getCallTranscript(callId: string | null): Promise<string> {
  if (!callId) return '通話IDが指定されていません。';
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calls/${callId}`);
    const call = await response.json();
    
    if (!call || !call.transcript) {
      return '文字起こしデータがありません。';
    }
    
    const transcript = call.transcript.substring(0, 1000);
    
    return `
📝 文字起こし（抜粋）

${transcript}...

※全文はダッシュボードでご確認ください。
    `.trim();
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return '文字起こしの取得に失敗しました。';
  }
}

// Get help message
function getHelpMessage(): string {
  return `
📱 TSUNAGARU.AI コマンド一覧

【基本コマンド】
・最新の通話 - 最新5件の通話
・緊急 - 緊急度の高い通話
・今日の通話 - 本日の全通話
・統計 - 通話統計レポート

【詳細コマンド】
・通話 [ID] - 特定の通話詳細
・検索 [キーワード] - 通話を検索

【その他】
・ヘルプ - このメッセージ
・設定 - 通知設定

ご不明な点はお気軽にお尋ねください！
  `.trim();
}

// Get default reply
function getDefaultReply(): string {
  return `
申し訳ございません。
コマンドが認識できませんでした。

「ヘルプ」と送信すると
利用可能なコマンドを確認できます。

例：
・最新の通話
・緊急
・今日の通話
・統計
  `.trim();
}

// GET endpoint to verify webhook configuration
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/line/webhook',
    channel_id: CHANNEL_ID,
    channel_configured: !!CHANNEL_ACCESS_TOKEN,
    features: [
      'message_reply',
      'push_notification',
      'rich_menu',
      'flex_message'
    ]
  });
}