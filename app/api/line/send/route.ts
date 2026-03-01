import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Send LINE message to specific user or broadcast
export async function POST(request: NextRequest) {
  try {
    const { userId, message, type = 'push' } = await request.json();

    if (!CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'LINE channel access token not configured' },
        { status: 500 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    let endpoint: string;
    let body: any;

    if (type === 'broadcast') {
      // Broadcast to all users
      endpoint = 'https://api.line.me/v2/bot/message/broadcast';
      body = {
        messages: formatMessages(message)
      };
    } else if (type === 'multicast' && Array.isArray(userId)) {
      // Send to multiple specific users
      endpoint = 'https://api.line.me/v2/bot/message/multicast';
      body = {
        to: userId,
        messages: formatMessages(message)
      };
    } else {
      // Push to specific user
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required for push messages' },
          { status: 400 }
        );
      }
      endpoint = 'https://api.line.me/v2/bot/message/push';
      body = {
        to: userId,
        messages: formatMessages(message)
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to send LINE message', details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('LINE send error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Format messages based on type
function formatMessages(message: any): any[] {
  if (typeof message === 'string') {
    return [{
      type: 'text',
      text: message
    }];
  }

  if (Array.isArray(message)) {
    return message;
  }

  // Flex message for rich content
  if (message.type === 'flex') {
    return [{
      type: 'flex',
      altText: message.altText || '新しいメッセージ',
      contents: message.contents
    }];
  }

  // Template message (buttons, confirm, carousel)
  if (message.type === 'template') {
    return [{
      type: 'template',
      altText: message.altText || '新しいメッセージ',
      template: message.template
    }];
  }

  return [message];
}

// Send call notification with rich formatting
export async function sendCallNotification(userId: string, call: any) {
  const flexMessage = {
    type: 'flex',
    altText: '新着通話通知',
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📞 新着通話',
            size: 'xl',
            weight: 'bold',
            color: '#1DB446'
          }
        ],
        backgroundColor: '#F0F0F0',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '発信者',
                color: '#555555',
                size: 'sm',
                flex: 1
              },
              {
                type: 'text',
                text: call.from || '不明',
                size: 'sm',
                flex: 2
              }
            ]
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '通話時間',
                color: '#555555',
                size: 'sm',
                flex: 1
              },
              {
                type: 'text',
                text: call.duration || '0:00',
                size: 'sm',
                flex: 2
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
                text: '緊急度',
                color: '#555555',
                size: 'sm',
                flex: 1
              },
              {
                type: 'text',
                text: call.urgency || '低',
                size: 'sm',
                flex: 2,
                color: call.urgency === '高' ? '#FF0000' : call.urgency === '中' ? '#FFA500' : '#00AA00'
              }
            ],
            margin: 'md'
          },
          {
            type: 'text',
            text: '要約',
            color: '#555555',
            size: 'sm',
            margin: 'lg'
          },
          {
            type: 'text',
            text: call.summary || '要約なし',
            size: 'sm',
            wrap: true,
            margin: 'sm'
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
              type: 'postback',
              label: '詳細を見る',
              data: `action=view_details&call_id=${call.call_id}`,
              displayText: `通話詳細: ${call.call_id}`
            },
            style: 'primary',
            color: '#1DB446'
          },
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ダッシュボードで確認',
              uri: `${process.env.NEXT_PUBLIC_APP_URL}/calls/${call.call_id}`
            },
            style: 'link'
          }
        ],
        spacing: 'sm'
      }
    }
  };

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: userId,
      messages: [flexMessage]
    })
  });

  return response.ok;
}

// GET endpoint to check configuration
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/line/send',
    token_configured: !!CHANNEL_ACCESS_TOKEN,
    features: [
      'text_message',
      'flex_message',
      'template_message',
      'broadcast',
      'multicast',
      'push'
    ]
  });
}