#!/usr/bin/env node

const { Retell } = require('retell-sdk');
const twilio = require('twilio');

// 環境変数から認証情報を取得
require('dotenv').config({ path: '.env.local' });

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

async function main() {
  console.log('===========================================');
  console.log('  Retell AI & Twilio 電話番号状態確認');
  console.log('===========================================\n');

  try {
    // Retellクライアント初期化
    const retellClient = new Retell({
      apiKey: RETELL_API_KEY,
    });

    // Twilioクライアント初期化
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Step 1: Retell AIの電話番号一覧を取得
    console.log('📞 Retell AIの登録済み電話番号:\n');
    const retellNumbers = await retellClient.phoneNumber.list();
    
    if (!retellNumbers || retellNumbers.length === 0) {
      console.log('❌ Retell AIに電話番号が登録されていません\n');
    } else {
      retellNumbers.forEach(num => {
        console.log(`番号: ${num.phone_number}`);
        console.log(`  - ID: ${num.phone_number_id}`);
        console.log(`  - エージェントID: ${num.agent_id || 'なし'}`);
        console.log(`  - インバウンドエージェント: ${num.inbound_agent_id || 'なし'}`);
        console.log(`  - ステータス: ${num.status || 'unknown'}`);
        console.log(`  - 作成日: ${num.created_at}`);
        console.log('');
      });
    }

    // Step 2: Twilioの電話番号を確認
    console.log('─────────────────────────────────────');
    console.log('📱 Twilioの050番号:\n');
    const twilioNumbers = await twilioClient.incomingPhoneNumbers.list();
    const jp050Numbers = twilioNumbers.filter(num => 
      num.phoneNumber.startsWith('+8150') || num.phoneNumber.includes('050')
    );

    jp050Numbers.forEach(num => {
      console.log(`番号: ${num.phoneNumber}`);
      console.log(`  - 名前: ${num.friendlyName || 'なし'}`);
      console.log(`  - Voice URL: ${num.voiceUrl || 'なし'}`);
      console.log(`  - Voice Method: ${num.voiceMethod || 'なし'}`);
      console.log(`  - Status Callback: ${num.statusCallback || 'なし'}`);
      console.log('');
    });

    // Step 3: 問題の診断
    console.log('─────────────────────────────────────');
    console.log('🔍 診断結果:\n');
    
    // Retell AIに電話番号が登録されているかチェック
    const twilioPhoneNumbers = jp050Numbers.map(n => n.phoneNumber);
    const retellPhoneNumbers = retellNumbers.map(n => n.phone_number);
    
    twilioPhoneNumbers.forEach(twilioNum => {
      const isInRetell = retellPhoneNumbers.includes(twilioNum);
      const twilioData = jp050Numbers.find(n => n.phoneNumber === twilioNum);
      
      console.log(`番号: ${twilioNum}`);
      if (!isInRetell) {
        console.log(`  ❌ Retell AIに登録されていません`);
        console.log(`  → 解決方法: Retell AIダッシュボードで"Import Twilio Number"を実行`);
      } else {
        console.log(`  ✅ Retell AIに登録済み`);
        
        // Webhook URLをチェック
        const expectedUrl = `https://api.retellai.com/twilio-voice-webhook/${RETELL_API_KEY}`;
        if (!twilioData.voiceUrl || !twilioData.voiceUrl.includes('retellai.com')) {
          console.log(`  ⚠️ Webhook URLが正しく設定されていません`);
          console.log(`  現在: ${twilioData.voiceUrl}`);
          console.log(`  期待値: ${expectedUrl}`);
        } else {
          console.log(`  ✅ Webhook URL設定済み`);
        }
        
        // エージェントの割り当てをチェック
        const retellNum = retellNumbers.find(n => n.phone_number === twilioNum);
        if (!retellNum.agent_id && !retellNum.inbound_agent_id) {
          console.log(`  ⚠️ エージェントが割り当てられていません`);
          console.log(`  → 解決方法: Retell AIダッシュボードでエージェントを割り当て`);
        }
      }
      console.log('');
    });

    // Step 4: 推奨される修正アクション
    console.log('─────────────────────────────────────');
    console.log('🔧 推奨アクション:\n');
    
    const needsImport = twilioPhoneNumbers.filter(n => !retellPhoneNumbers.includes(n));
    if (needsImport.length > 0) {
      console.log('1. 以下の番号をRetell AIにインポートする必要があります:');
      needsImport.forEach(num => console.log(`   - ${num}`));
      console.log('\n   コマンド: node scripts/import-twilio-to-retell.js');
    }
    
    const needsWebhook = jp050Numbers.filter(n => 
      !n.voiceUrl || !n.voiceUrl.includes('retellai.com')
    );
    if (needsWebhook.length > 0) {
      console.log('\n2. 以下の番号のWebhook URLを更新する必要があります:');
      needsWebhook.forEach(num => console.log(`   - ${num.phoneNumber}`));
      console.log('\n   コマンド: node scripts/fix-twilio-webhooks.js');
    }

    const needsAgent = retellNumbers.filter(n => !n.agent_id && !n.inbound_agent_id);
    if (needsAgent.length > 0) {
      console.log('\n3. 以下の番号にエージェントを割り当てる必要があります:');
      needsAgent.forEach(num => console.log(`   - ${num.phone_number}`));
      console.log('\n   → Retell AIダッシュボードで設定してください');
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

// 実行
main();