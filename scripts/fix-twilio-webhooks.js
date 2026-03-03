#!/usr/bin/env node

const twilio = require('twilio');

// 環境変数から認証情報を取得
require('dotenv').config({ path: '.env.local' });

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const RETELL_API_KEY = process.env.RETELL_API_KEY;

async function main() {
  console.log('===========================================');
  console.log('  Twilio Webhook URL 修正ツール');
  console.log('===========================================\n');

  try {
    // Twilioクライアント初期化
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Retell AIの正しいWebhook URL
    const correctWebhookUrl = `https://api.retellai.com/twilio-voice-webhook/${RETELL_API_KEY}`;

    console.log('📞 Twilioの050番号を取得中...\n');
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();
    
    const jp050Numbers = phoneNumbers.filter(num => 
      num.phoneNumber.startsWith('+8150') || num.phoneNumber.includes('050')
    );

    console.log(`見つかった050番号: ${jp050Numbers.length}件\n`);

    for (const number of jp050Numbers) {
      console.log(`番号: ${number.phoneNumber}`);
      console.log(`  現在のWebhook: ${number.voiceUrl || 'なし'}`);
      
      if (!number.voiceUrl || !number.voiceUrl.includes('retellai.com')) {
        console.log('  ⚠️ Webhook URLを更新します...');
        
        await twilioClient.incomingPhoneNumbers(number.sid).update({
          voiceUrl: correctWebhookUrl,
          voiceMethod: 'POST',
          voiceFallbackUrl: correctWebhookUrl,
          voiceFallbackMethod: 'POST',
          statusCallback: correctWebhookUrl,
          statusCallbackMethod: 'POST',
        });
        
        console.log('  ✅ 更新完了！');
      } else {
        console.log('  ✅ 既に正しく設定されています');
      }
      console.log('');
    }

    console.log('========================================');
    console.log('✅ 全ての番号のWebhook URLが更新されました');
    console.log(`Webhook URL: ${correctWebhookUrl}`);
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
  }
}

// 実行
main();