#!/usr/bin/env node

const twilio = require('twilio');

// 環境変数から認証情報を取得
require('dotenv').config({ path: '.env.local' });

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

async function main() {
  console.log('===========================================');
  console.log('  Twilio SIPトランク設定確認・修正ツール');
  console.log('===========================================\n');

  try {
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Step 1: 既存のSIPトランクを確認
    console.log('🔍 既存のSIPトランクを検索中...\n');
    
    // Trunking APIを使用
    const trunks = await twilioClient.trunking.v1.trunks.list();
    
    let retellTrunk = null;
    
    console.log(`見つかったSIPトランク: ${trunks.length}件\n`);
    
    for (const trunk of trunks) {
      console.log(`トランク名: ${trunk.friendlyName}`);
      console.log(`  - SID: ${trunk.sid}`);
      console.log(`  - ドメイン名: ${trunk.domainName || 'なし'}`);
      console.log(`  - 作成日: ${trunk.dateCreated}`);
      console.log('');
      
      if (trunk.friendlyName && trunk.friendlyName.includes('Retell')) {
        retellTrunk = trunk;
        console.log('  ✅ Retell AI用のトランクを発見！\n');
      }
    }

    if (!retellTrunk) {
      console.log('❌ "Retell AI SIP Trunk"が見つかりません');
      console.log('\n新しくSIPトランクを作成する必要があります。');
      return;
    }

    // Step 2: トランクの詳細設定を取得
    console.log('─────────────────────────────────────');
    console.log('📋 Retell AI SIPトランクの詳細:\n');
    
    // Origination URLs（着信設定）を取得
    const originationUrls = await twilioClient.trunking.v1
      .trunks(retellTrunk.sid)
      .originationUrls
      .list();
    
    console.log('🔹 Origination URLs（着信先）:');
    if (originationUrls.length > 0) {
      originationUrls.forEach(url => {
        console.log(`  - ${url.sipUrl}`);
        console.log(`    優先度: ${url.priority}, 重み: ${url.weight}`);
      });
    } else {
      console.log('  なし（設定が必要）');
    }
    console.log('');

    // Termination Settings（発信設定）を取得
    console.log('🔹 Termination URI（発信元）:');
    const termination = `sip:${retellTrunk.domainName || retellTrunk.sid + '.pstn.twilio.com'}`;
    console.log(`  ${termination}`);
    console.log('');

    // 電話番号の紐付けを確認
    const trunkPhoneNumbers = await twilioClient.trunking.v1
      .trunks(retellTrunk.sid)
      .phoneNumbers
      .list();
    
    console.log('🔹 紐付けられた電話番号:');
    if (trunkPhoneNumbers.length > 0) {
      trunkPhoneNumbers.forEach(num => {
        console.log(`  - ${num.phoneNumber}`);
      });
    } else {
      console.log('  なし');
    }
    console.log('');

    // Step 3: 050番号をSIPトランクに紐付け
    console.log('─────────────────────────────────────');
    console.log('🔧 電話番号をSIPトランクに紐付け:\n');
    
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();
    const jp050Numbers = phoneNumbers.filter(num => 
      num.phoneNumber.startsWith('+8150') || num.phoneNumber.includes('050')
    );

    for (const number of jp050Numbers) {
      console.log(`番号: ${number.phoneNumber}`);
      
      // この番号が既にトランクに紐付けられているかチェック
      const isAlreadyLinked = trunkPhoneNumbers.some(
        tn => tn.phoneNumber === number.phoneNumber
      );
      
      if (isAlreadyLinked) {
        console.log('  ✅ 既にSIPトランクに紐付け済み');
      } else {
        console.log('  📌 SIPトランクに紐付けます...');
        
        try {
          // 番号をSIPトランクに紐付け
          await twilioClient.trunking.v1
            .trunks(retellTrunk.sid)
            .phoneNumbers
            .create({
              phoneNumberSid: number.sid
            });
          
          console.log('  ✅ 紐付け完了！');
        } catch (linkError) {
          console.log('  ⚠️ 紐付けエラー:', linkError.message);
        }
      }
      
      // 番号の設定を更新（SIPトランク用）
      console.log('  📝 番号の設定を更新中...');
      
      await twilioClient.incomingPhoneNumbers(number.sid).update({
        voiceUrl: '',  // SIPトランク使用時は空にする
        voiceMethod: 'POST',
        voiceReceiveMode: 'voice',  // 音声通話を受信
        // SIPトランクが自動的に処理します
      });
      
      console.log('  ✅ 設定更新完了');
      console.log('');
    }

    // Step 4: Retell AI用の設定情報を表示
    console.log('========================================');
    console.log('📋 Retell AIに設定する情報:');
    console.log('========================================\n');
    
    console.log('1. Termination URI（必須）:');
    console.log(`   ${termination}`);
    console.log('');
    
    console.log('2. 電話番号の状態:');
    jp050Numbers.forEach(num => {
      console.log(`   ${num.phoneNumber} - SIPトランク経由で利用可能`);
    });
    console.log('');

    console.log('3. Origination URL（Retell AIからの着信先）:');
    if (originationUrls.length === 0) {
      console.log('   ⚠️ 設定が必要です');
      console.log('   推奨: sip:retell@your-server.com');
    } else {
      console.log('   ✅ 設定済み');
    }
    console.log('');

    console.log('========================================');
    console.log('✅ SIPトランクの設定が完了しました！');
    console.log('========================================');
    console.log('\n次のステップ:');
    console.log('1. Retell AIダッシュボードで番号をインポート');
    console.log('2. Termination URIを入力');
    console.log('3. テスト通話で動作確認');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('詳細:', error.response.data);
    }
  }
}

// 実行
main();