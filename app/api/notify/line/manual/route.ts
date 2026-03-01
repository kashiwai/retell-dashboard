import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      call_id,
      summary,
      customer_name,
      phone_number,
      requirement,
      urgency,
      sentiment,
      satisfaction_score,
      tags,
      action_items,
      start_timestamp,
      end_timestamp,
      duration,
      from_number,
      to_number
    } = data;

    const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!lineAccessToken) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not found in environment variables');
      return NextResponse.json(
        { error: 'LINE configuration not found' },
        { status: 500 }
      );
    }

    // Format the message for LINE
    let message = `📞 通話詳細レポート\n`;
    message += `────────────────\n`;
    message += `📅 ${new Date(start_timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`;
    message += `⏱️ 通話時間: ${Math.floor(duration / 60)}分${Math.floor(duration % 60)}秒\n`;
    message += `📞 発信元: ${from_number || '不明'}\n`;
    message += `📞 受信先: ${to_number || '不明'}\n\n`;
    
    message += `👤 お客様情報\n`;
    message += `────────────────\n`;
    message += `氏名: ${customer_name || '不明'}\n`;
    if (phone_number) {
      message += `電話番号: ${phone_number}\n`;
    }
    message += `\n`;
    
    message += `📝 要件\n`;
    message += `────────────────\n`;
    message += `${requirement || summary || '要約なし'}\n\n`;
    
    if (urgency) {
      message += `⚠️ 緊急度: ${urgency}\n`;
    }
    
    message += `💭 感情分析\n`;
    message += `────────────────\n`;
    const sentimentEmoji = sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😔' : '😐';
    const sentimentText = sentiment === 'positive' ? 'ポジティブ' : sentiment === 'negative' ? 'ネガティブ' : '中立';
    message += `${sentimentEmoji} 感情: ${sentimentText}\n`;
    if (satisfaction_score !== undefined) {
      message += `⭐ 満足度: ${satisfaction_score}%\n`;
    }
    message += `\n`;
    
    if (tags && tags.length > 0) {
      message += `🏷️ タグ: ${tags.map((tag: string) => `#${tag}`).join(' ')}\n\n`;
    }
    
    if (action_items && action_items.length > 0) {
      message += `✅ アクション項目\n`;
      message += `────────────────\n`;
      action_items.forEach((item: string, index: number) => {
        message += `${index + 1}. ${item}\n`;
      });
      message += `\n`;
    }
    
    message += `────────────────\n`;
    message += `🔗 通話ID: ${call_id}\n`;
    message += `📅 送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`;

    // Check if we should use broadcast or push API
    // If LINE_USER_ID is set, use push API for specific user
    // Otherwise, use broadcast to send to all followers
    const userId = process.env.LINE_USER_ID;
    
    // Send to LINE - use broadcast if no specific user ID
    const endpoint = userId 
      ? 'https://api.line.me/v2/bot/message/push'
      : 'https://api.line.me/v2/bot/message/broadcast';
    
    const requestBody = userId
      ? {
          to: userId,
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        }
      : {
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        };
    
    const lineResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineAccessToken}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error('LINE API error:', errorText);
      
      let errorMessage = 'LINE送信に失敗しました';
      let solution = '';
      
      if (errorText.includes("You can't send messages to yourself")) {
        errorMessage = 'ボット自身にメッセージを送信することはできません';
        solution = 'LINE_USER_IDに友だち追加したユーザーのIDを設定してください';
      } else if (errorText.includes('Not found')) {
        errorMessage = '送信先ユーザーが見つかりません';
        solution = 'LINE Botを友だち追加し、正しいユーザーIDを設定してください';
      } else if (errorText.includes('Invalid reply token')) {
        errorMessage = 'トークンが無効です';
        solution = 'LINE_CHANNEL_ACCESS_TOKENを確認してください';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorText,
          solution: solution
        },
        { status: lineResponse.status }
      );
    }

    console.log('Manual LINE notification sent successfully for call:', call_id);
    return NextResponse.json({ 
      success: true,
      message: 'LINE notification sent successfully'
    });
    
  } catch (error: any) {
    console.error('Manual LINE notification error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}