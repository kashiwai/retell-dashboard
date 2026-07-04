let resend: any = null;

function getResend() {
  if (!resend) {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event = body.event;

    console.log('🔔 Webhook received:', event);

    if (event !== 'call_analyzed') {
      console.log('⏭️ Non-analyzed event, skipping');
      return new Response('OK', { status: 200 });
    }

    console.log('✅ call_analyzed event detected');

    const data = body.data || {};
    const analysis = data.post_call_analysis || {};

    console.log('📊 Call data:', JSON.stringify(data).slice(0, 200));

  // post_call_analysis_data から情報を抽出
  const customerName = analysis.customer_name || '不明';
  const phone = analysis.phone || '不明';
  const address = analysis.address || '不明';
  const troubleType = analysis.trouble_type || '不明';
  const detail = analysis.detail || '不明';
  const schedule = analysis.schedule || '不明';
  const callSummary = analysis.call_summary || '';
  const sentiment = analysis.user_sentiment || '不明';
  const disposition = analysis.disposition || '不明';
  const callDuration = data.call_duration_ms ? Math.round(data.call_duration_ms / 1000) : 0;
  const recordingUrl = data.recording_url || '';

  // メール本文生成
  const emailHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
    .header { background: #0066cc; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { background: white; padding: 20px; border-radius: 0 0 5px 5px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #0066cc; }
    .value { margin-top: 5px; padding: 10px; background: #f5f5f5; border-left: 3px solid #0066cc; }
    .summary { background: #e8f4f8; padding: 12px; border-radius: 3px; margin: 15px 0; }
    .sentiment { padding: 8px 12px; border-radius: 3px; display: inline-block; font-weight: bold; }
    .sentiment-good { background: #d4edda; color: #155724; }
    .sentiment-neutral { background: #fff3cd; color: #856404; }
    .sentiment-bad { background: #f8d7da; color: #721c24; }
    .footer { font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>ハートフルコーポレーション - インバウンド通話記録</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">📞 通話ID</div>
        <div class="value">${data.call_id || '不明'}</div>
      </div>

      <div class="field">
        <div class="label">👤 顧客情報</div>
        <div class="value">
          <strong>名前:</strong> ${customerName}<br>
          <strong>電話:</strong> ${phone}<br>
          <strong>住所:</strong> ${address}
        </div>
      </div>

      <div class="field">
        <div class="label">⚙️ トラブル内容</div>
        <div class="value">
          <strong>種別:</strong> ${troubleType}<br>
          <strong>詳細:</strong> ${detail}
        </div>
      </div>

      <div class="field">
        <div class="label">📅 希望工事日時</div>
        <div class="value">${schedule}</div>
      </div>

      <div class="field">
        <div class="label">📝 通話内容</div>
        <div class="summary">${callSummary}</div>
      </div>

      <div class="field">
        <div class="label">😊 顧客満足度</div>
        <div class="value">
          ${getSentimentBadge(sentiment)}
        </div>
      </div>

      <div class="field">
        <div class="label">📌 対応区分</div>
        <div class="value">${disposition}</div>
      </div>

      <div class="field">
        <div class="label">⏱️ 通話時間</div>
        <div class="value">${callDuration}秒</div>
      </div>

      ${recordingUrl ? `
      <div class="field">
        <div class="label">🎧 録音</div>
        <div class="value">
          <a href="${recordingUrl}" target="_blank" style="color: #0066cc; text-decoration: none;">
            → 通話録音を再生
          </a>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <strong>次のステップ:</strong> 営業担当者から顧客にお電話してください。
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const emailText = `
ハートフルコーポレーション - インバウンド通話記録

【通話ID】
${data.call_id || '不明'}

【顧客情報】
名前: ${customerName}
電話: ${phone}
住所: ${address}

【トラブル内容】
種別: ${troubleType}
詳細: ${detail}

【希望工事日時】
${schedule}

【通話内容】
${callSummary}

【顧客満足度】
${sentiment}

【対応区分】
${disposition}

【通話時間】
${callDuration}秒

${recordingUrl ? `【録音】\n${recordingUrl}` : ''}

次のステップ: 営業担当者から顧客にお電話してください。
  `;

  try {
    // Resend API キー確認
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY が設定されていません');
      return new Response('RESEND_API_KEY not configured', { status: 500 });
    }

    console.log('🔑 RESEND_API_KEY is configured');

    // メール送信（複数宛先）
    const recipients = ['yuna@metisbel.com', 'kousuke@metisbel.com'];
    const emailClient = getResend();

    console.log(`📧 Sending emails to: ${recipients.join(', ')}`);

    for (const email of recipients) {
      try {
        const result = await emailClient.emails.send({
          from: 'Heartful Support <noreply@metisbel.com>',
          to: email,
          subject: `【新規案件】${customerName}様 - ${troubleType} (${address})`,
          html: emailHtml,
          text: emailText,
        });
        console.log(`✅ メール送信成功 (${email}):`, result);
      } catch (emailError) {
        console.error(`❌ メール送信失敗 (${email}):`, emailError);
      }
    }

    console.log(`✅ webhook 処理完了`);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('❌ webhook 処理エラー:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  } finally {
    console.log('📞 Webhook request completed');
  }
}

function getSentimentBadge(sentiment: string): string {
  if (sentiment.includes('満足') || sentiment.includes('good') || sentiment.includes('positive')) {
    return `<span class="sentiment sentiment-good">😊 満足</span>`;
  } else if (sentiment.includes('不満') || sentiment.includes('negative') || sentiment.includes('dissatisfied')) {
    return `<span class="sentiment sentiment-bad">😞 不満</span>`;
  } else {
    return `<span class="sentiment sentiment-neutral">😐 中立</span>`;
  }
}
