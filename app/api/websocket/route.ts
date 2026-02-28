import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Retell } from 'retell-sdk';

// Note: WebSocket support in Next.js App Router requires custom server
// This is a placeholder for WebSocket implementation
// For production, use a separate WebSocket server or Next.js custom server

export const dynamic = 'force-dynamic';

let io: SocketIOServer | null = null;

// Initialize Socket.IO server (requires custom server setup)
export function initWebSocket(server: HTTPServer) {
  if (!io) {
    io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join room for real-time updates
      socket.on('join-dashboard', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined dashboard`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Set up Retell webhook listener for real-time events
    setupRetellWebhooks();
  }

  return io;
}

// Function to emit real-time updates
export function emitCallUpdate(callData: any) {
  if (io) {
    io.emit('call-update', callData);
  }
}

// Setup Retell webhooks for real-time events
async function setupRetellWebhooks() {
  // This would be configured in Retell dashboard
  // to point to your webhook endpoint
  console.log('Retell webhooks configured for real-time updates');
}

// WebSocket endpoint (requires custom server)
export async function GET(request: NextRequest) {
  return new Response('WebSocket endpoint requires custom server setup', {
    status: 501,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

// Webhook endpoint for Retell events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    // Handle different Retell webhook events
    switch (event) {
      case 'call.started':
        emitCallUpdate({ type: 'started', ...data });
        await sendNotifications('call_started', data);
        break;
      
      case 'call.ended':
        emitCallUpdate({ type: 'ended', ...data });
        await sendNotifications('call_ended', data);
        break;
      
      case 'call.analyzed':
        emitCallUpdate({ type: 'analyzed', ...data });
        if (data.sentiment_score < -0.5) {
          await sendNotifications('negative_sentiment', data);
        }
        break;
      
      case 'call.transferred':
        emitCallUpdate({ type: 'transferred', ...data });
        await sendNotifications('call_transferred', data);
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}

// Send notifications to configured channels
async function sendNotifications(eventType: string, data: any) {
  // Get notification settings from database or env
  const notifications = {
    slack: process.env.SLACK_WEBHOOK_URL,
    line: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  };

  // Send to Slack
  if (notifications.slack) {
    await sendSlackNotification(eventType, data, notifications.slack);
  }

  // Send to LINE
  if (notifications.line) {
    await sendLineNotification(eventType, data, notifications.line);
  }
}

async function sendSlackNotification(eventType: string, data: any, webhookUrl: string) {
  const messages: Record<string, string> = {
    call_started: `📞 新しい着信: ${data.from_number}`,
    call_ended: `✅ 通話終了: ${data.from_number} (${data.duration}秒)`,
    negative_sentiment: `⚠️ ネガティブな通話を検出: ${data.from_number}`,
    call_transferred: `↪️ 通話転送: ${data.from_number} → ${data.transferred_to}`,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: messages[eventType] || `イベント: ${eventType}`,
        attachments: [{
          color: eventType === 'negative_sentiment' ? 'danger' : 'good',
          fields: [
            { title: '発信者', value: data.from_number, short: true },
            { title: '時刻', value: new Date().toLocaleString('ja-JP'), short: true },
            { title: '要約', value: data.summary || 'N/A', short: false },
          ]
        }]
      })
    });
  } catch (error) {
    console.error('Slack notification error:', error);
  }
}

async function sendLineNotification(eventType: string, data: any, accessToken: string) {
  const messages: Record<string, string> = {
    call_started: `📞 新しい着信\n発信者: ${data.from_number}`,
    call_ended: `✅ 通話終了\n発信者: ${data.from_number}\n時間: ${data.duration}秒`,
    negative_sentiment: `⚠️ 要注意\nネガティブな通話を検出しました\n発信者: ${data.from_number}`,
    call_transferred: `↪️ 転送\n${data.from_number} → ${data.transferred_to}`,
  };

  try {
    // Send to LINE Notify or LINE Bot
    await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messages: [{
          type: 'text',
          text: messages[eventType] || `Retell通知: ${eventType}`
        }]
      })
    });
  } catch (error) {
    console.error('LINE notification error:', error);
  }
}