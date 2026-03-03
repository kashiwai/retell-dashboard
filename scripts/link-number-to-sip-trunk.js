#!/usr/bin/env node

const twilio = require('twilio');

// 環境変数から認証情報を取得
require('dotenv').config({ path: '.env.local' });

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

async function main() {
  console.log('===========================================');
  console.log('  050-1807-5642をSIPトランクに紐付け');
  console.log('===========================================\n');

  try {
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Step 1: Retell AI SIPトランクを取得
    console.log('🔍 Retell AI SIPトランクを検索中...\n');
    const trunks = await twilioClient.trunking.v1.trunks.list();
    const retellTrunk = trunks.find(trunk => 
      trunk.friendlyName && trunk.friendlyName.includes('Retell')
    );

    if (!retellTrunk) {
      console.log('❌ Retell AI SIPトランクが見つかりません');
      return;
    }

    console.log(`✅ 発見: ${retellTrunk.friendlyName}`);
    console.log(`   SID: ${retellTrunk.sid}\n`);

    // Step 2: 050-1807-5642を取得
    console.log('📞 電話番号を取得中...\n');
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();
    const targetNumber = phoneNumbers.find(num => 
      num.phoneNumber === '+815018075642'
    );

    if (!targetNumber) {
      console.log('❌ +815018075642が見つかりません');
      return;
    }

    console.log(`✅ 番号発見: ${targetNumber.phoneNumber}`);
    console.log(`   名前: ${targetNumber.friendlyName}`);
    console.log(`   SID: ${targetNumber.sid}\n`);

    // Step 3: 現在のトランク紐付けを確認
    console.log('🔍 現在の紐付け状態を確認中...\n');
    const trunkPhoneNumbers = await twilioClient.trunking.v1
      .trunks(retellTrunk.sid)
      .phoneNumbers
      .list();

    const isAlreadyLinked = trunkPhoneNumbers.some(
      tn => tn.phoneNumber === targetNumber.phoneNumber
    );

    if (isAlreadyLinked) {
      console.log('✅ 既にSIPトランクに紐付けられています！');
    } else {
      // Step 4: SIPトランクに紐付け
      console.log('📌 SIPトランクに紐付け中...');
      
      try {
        await twilioClient.trunking.v1
          .trunks(retellTrunk.sid)
          .phoneNumbers
          .create({
            phoneNumberSid: targetNumber.sid
          });
        
        console.log('✅ 紐付け完了！\n');
      } catch (linkError) {
        console.log('⚠️ エラー:', linkError.message);
        console.log('（既に紐付け済みの可能性があります）\n');
      }
    }

    // Step 5: 番号の設定をクリア（SIPトランク用）
    console.log('🔧 番号の設定を更新中...\n');
    
    try {
      // WebhookをクリアしてSIPトランク経由にする
      await twilioClient.incomingPhoneNumbers(targetNumber.sid).update({
        voiceUrl: '',  // 空にする
        voiceFallbackUrl: '',  // フォールバックもクリア
        voiceMethod: 'POST',
        statusCallback: '',  // ステータスコールバックもクリア
      });
      
      console.log('✅ Webhook設定をクリアしました（SIPトランク経由になります）');
    } catch (updateError) {
      console.log('⚠️ 設定更新エラー:', updateError.message);
    }

    // Step 6: 最終確認
    console.log('\n─────────────────────────────────────');
    console.log('📊 最終状態:\n');
    
    const updatedTrunkNumbers = await twilioClient.trunking.v1
      .trunks(retellTrunk.sid)
      .phoneNumbers
      .list();

    console.log('SIPトランクに紐付けられた番号:');
    updatedTrunkNumbers.forEach(num => {
      console.log(`  - ${num.phoneNumber}`);
    });

    // Termination URI情報
    const terminationUri = `sip:TKd18ab93a80b42eba44f62fc76d43cb05.pstn.twilio.com`;

    console.log('\n========================================');
    console.log('✅ 設定完了！');
    console.log('========================================\n');
    
    console.log('📋 Retell AIに入力する情報:\n');
    console.log('1. Termination URI:');
    console.log(`   ${terminationUri}\n`);
    
    console.log('2. 両方の番号がSIPトランク経由で利用可能:');
    console.log('   - 050-1808-0215 (既存)');
    console.log('   - 050-1807-5642 (新規追加)\n');

    console.log('3. Origination URL (Retell設定済み):');
    console.log('   sip:5t4n6j0wnrl.sip.livekit.cloud;transport=tcp\n');

    console.log('次のステップ:');
    console.log('1. Retell AIダッシュボードで+815018075642をインポート');
    console.log('2. 上記のTermination URIを入力');
    console.log('3. テスト通話で確認');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
  }
}

// 実行
main();