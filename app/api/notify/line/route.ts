import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, call } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'LINE Notify token is required' },
        { status: 400 }
      );
    }

    // Format message for LINE
    const message = formatLineMessage(call);

    // Send to LINE Notify
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
      const errorText = await response.text();
      console.error('LINE Notify error:', errorText);
      return NextResponse.json(
        { error: 'Failed to send LINE notification' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error('LINE Notify error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function formatLineMessage(call: any): string {
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

  const message = `
🔔 新着通話通知

📞 発信者: ${call.from || '不明'}
⏱️ 通話時間: ${call.duration || '0:00'}
📅 日時: ${new Date(call.start_timestamp || Date.now()).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

📝 要約:
${call.summary || call.call_analysis?.summary || '要約なし'}

${call.custom_analysis ? `
📊 詳細分析:
${Object.entries(call.custom_analysis).map(([key, value]) => `・${key}: ${value}`).join('\n')}
` : ''}

⚡ 緊急度: ${urgencyEmoji[call.urgency as keyof typeof urgencyEmoji] || '🟢'} ${call.urgency || '低'}
😊 感情: ${sentimentEmoji[call.sentiment as keyof typeof sentimentEmoji] || '😐'} ${
    call.sentiment === 'positive' ? 'ポジティブ' :
    call.sentiment === 'negative' ? 'ネガティブ' : '中立'
  }

${call.customer_name !== '不明' ? `👤 お客様: ${call.customer_name}` : ''}
${call.phone_number ? `📱 電話番号: ${call.phone_number}` : ''}

🔗 詳細はダッシュボードでご確認ください
  `;

  return message.trim();
}

export async function GET() {
  return NextResponse.json({
    message: 'LINE Notify endpoint. Use POST to send notifications.',
    setup: 'https://notify-bot.line.me/ja/'
  });
}