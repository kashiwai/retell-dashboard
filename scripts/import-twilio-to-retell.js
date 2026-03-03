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
  console.log('  Twilio番号をRetell AIにインポート');
  console.log('===========================================\n');

  try {
    // クライアント初期化
    const retellClient = new Retell({ apiKey: RETELL_API_KEY });
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Step 1: Twilioの050番号を取得
    console.log('📞 Twilioの050番号を取得中...\n');
    const twilioNumbers = await twilioClient.incomingPhoneNumbers.list();
    const jp050Numbers = twilioNumbers.filter(num => 
      num.phoneNumber.startsWith('+8150') || num.phoneNumber.includes('050')
    );

    // Step 2: Retell AIの既存番号を取得
    console.log('📋 Retell AIの既存番号を確認中...\n');
    const retellNumbers = await retellClient.phoneNumber.list();
    const retellPhoneNumbers = retellNumbers.map(n => n.phone_number);

    // Step 3: エージェント一覧を取得
    const agents = await retellClient.agent.list();
    console.log(`利用可能なエージェント: ${agents.length}件\n`);

    // Step 4: 各Twilio番号をチェックしてインポート
    for (const twilioNum of jp050Numbers) {
      console.log(`\n番号: ${twilioNum.phoneNumber}`);
      
      if (retellPhoneNumbers.includes(twilioNum.phoneNumber)) {
        console.log('  ✅ 既にRetell AIに登録済み');
        
        // 既存の番号のエージェント設定を確認
        const existingNum = retellNumbers.find(n => n.phone_number === twilioNum.phoneNumber);
        if (!existingNum.inbound_agent_id && !existingNum.agent_id) {
          console.log('  ⚠️ エージェントが設定されていません');
          
          // 最初のエージェントを割り当て
          if (agents.length > 0) {
            const selectedAgent = agents[0];
            console.log(`  📌 エージェント "${selectedAgent.agent_name}" を割り当てます...`);
            
            try {
              await retellClient.phoneNumber.update(existingNum.phone_number, {
                inbound_agent_id: selectedAgent.agent_id,
              });
              console.log('  ✅ エージェントを割り当てました');
            } catch (updateErr) {
              console.log('  ❌ エージェント割り当てエラー:', updateErr.message);
            }
          }
        }
        continue;
      }

      console.log('  📌 Retell AIにインポートします...');
      
      // 適切なエージェントを選択（PALDATAまたは最初のエージェント）
      let selectedAgent = agents.find(a => a.agent_name?.includes('PALDATA')) || agents[0];
      
      if (!selectedAgent) {
        console.log('  ❌ エージェントが見つかりません');
        continue;
      }

      console.log(`  使用エージェント: ${selectedAgent.agent_name}`);

      try {
        // Retell AIにインポート（Twilioからの番号インポート）
        const importedNumber = await retellClient.phoneNumber.import({
          phone_number: twilioNum.phoneNumber,
          phone_number_sid: twilioNum.sid,  // Twilio SIDを追加
          inbound_agent_id: selectedAgent.agent_id,
          provider: 'twilio',
        });
        
        console.log('  ✅ インポート成功！');
        console.log(`  番号ID: ${importedNumber.phone_number_id || importedNumber.phone_number}`);
      } catch (importErr) {
        console.log('  ⚠️ インポートエラー:', importErr.message);
        
        // インポートが失敗した場合、直接作成を試みる
        console.log('  📌 直接作成を試みます...');
        try {
          const createdNumber = await retellClient.phoneNumber.create({
            phone_number: twilioNum.phoneNumber,
            phone_number_type: 'byoc_twilio',
            inbound_agent_id: selectedAgent.agent_id,
          });
          
          console.log('  ✅ 作成成功！');
          console.log(`  番号ID: ${createdNumber.phone_number_id || createdNumber.phone_number}`);
        } catch (createErr) {
          console.log('  ❌ 作成エラー:', createErr.message);
        }
      }
    }

    // Step 5: 最終確認
    console.log('\n─────────────────────────────────────');
    console.log('📊 最終状態:\n');
    
    const updatedRetellNumbers = await retellClient.phoneNumber.list();
    updatedRetellNumbers.forEach(num => {
      if (num.phone_number.startsWith('+8150')) {
        console.log(`番号: ${num.phone_number}`);
        console.log(`  - エージェント: ${num.inbound_agent_id || num.agent_id || 'なし'}`);
      }
    });
    
    console.log('\n✅ インポート処理が完了しました！');
    console.log('📞 これらの番号に電話をかけると、Retell AIが応答します。');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

// 実行
main();