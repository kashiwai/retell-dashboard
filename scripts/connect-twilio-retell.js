#!/usr/bin/env node

const twilio = require('twilio');
const { Retell } = require('retell-sdk');
const readline = require('readline');

// 環境変数から認証情報を取得
require('dotenv').config({ path: '.env.local' });

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const RETELL_API_KEY = process.env.RETELL_API_KEY;

// CLIインターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  try {
    console.log('===========================================');
    console.log('  Twilio → Retell AI 電話番号連携ツール');
    console.log('===========================================\n');

    // Twilioクライアント初期化
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Retellクライアント初期化
    const retellClient = new Retell({
      apiKey: RETELL_API_KEY,
    });

    // Step 1: Twilioの050番号一覧を取得
    console.log('📞 Twilioアカウントの電話番号を取得中...\n');
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();
    
    const jp050Numbers = phoneNumbers.filter(num => 
      num.phoneNumber.startsWith('+8150') || num.phoneNumber.includes('050')
    );

    if (jp050Numbers.length === 0) {
      console.log('❌ 050番号が見つかりませんでした。');
      console.log('Twilioで050番号を購入してください。');
      rl.close();
      return;
    }

    console.log('利用可能な050番号:');
    jp050Numbers.forEach((num, index) => {
      console.log(`  ${index + 1}. ${num.phoneNumber} (${num.friendlyName || '名前なし'})`);
    });

    // Step 2: 使用する番号を選択
    const selection = await question('\n連携する番号を選択してください (番号を入力): ');
    const selectedIndex = parseInt(selection) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= jp050Numbers.length) {
      console.log('❌ 無効な選択です。');
      rl.close();
      return;
    }

    const selectedNumber = jp050Numbers[selectedIndex];
    console.log(`\n✅ 選択された番号: ${selectedNumber.phoneNumber}`);

    // Step 3: Retell AIのエージェント一覧を取得
    console.log('\n🤖 Retell AIのエージェントを取得中...\n');
    const agents = await retellClient.agent.list();

    if (!agents || agents.length === 0) {
      console.log('❌ Retell AIにエージェントが見つかりません。');
      console.log('Retell AIダッシュボードでエージェントを作成してください。');
      rl.close();
      return;
    }

    console.log('利用可能なエージェント:');
    agents.forEach((agent, index) => {
      console.log(`  ${index + 1}. ${agent.agent_name || 'Unnamed Agent'} (ID: ${agent.agent_id})`);
    });

    // Step 4: エージェントを選択
    const agentSelection = await question('\n連携するエージェントを選択してください (番号を入力): ');
    const selectedAgentIndex = parseInt(agentSelection) - 1;
    
    if (selectedAgentIndex < 0 || selectedAgentIndex >= agents.length) {
      console.log('❌ 無効な選択です。');
      rl.close();
      return;
    }

    const selectedAgent = agents[selectedAgentIndex];
    console.log(`\n✅ 選択されたエージェント: ${selectedAgent.agent_name}`);

    // Step 5: Retell AIで電話番号を作成/更新
    console.log('\n🔄 Retell AIに電話番号を登録中...');
    
    try {
      // Retell AIの電話番号一覧を取得
      const retellNumbers = await retellClient.phoneNumber.list();
      
      // 既存の番号があるか確認
      const existingNumber = retellNumbers.find(num => 
        num.phone_number === selectedNumber.phoneNumber
      );

      let phoneNumberId;
      
      if (existingNumber) {
        console.log('📌 既存の番号設定を更新します...');
        phoneNumberId = existingNumber.phone_number_id;
        
        // 既存の番号を更新
        await retellClient.phoneNumber.update(phoneNumberId, {
          agent_id: selectedAgent.agent_id,
        });
      } else {
        console.log('📌 新しい番号を登録します...');
        
        // 新しい電話番号を作成
        const newPhoneNumber = await retellClient.phoneNumber.create({
          phone_number: selectedNumber.phoneNumber,
          agent_id: selectedAgent.agent_id,
          area_code: '050',
          country: 'JP',
        });
        
        phoneNumberId = newPhoneNumber.phone_number_id;
      }

      console.log(`✅ Retell AIに電話番号を登録しました (ID: ${phoneNumberId})`);

    } catch (retellError) {
      console.error('❌ Retell AI登録エラー:', retellError.message);
      
      // Twilioの番号をインポートする別の方法を試す
      console.log('\n📌 Twilioインポート機能を使用して再試行します...');
      
      try {
        const importedNumber = await retellClient.phoneNumber.import({
          phone_number: selectedNumber.phoneNumber,
          agent_id: selectedAgent.agent_id,
          provider: 'twilio',
          twilio_phone_number_sid: selectedNumber.sid,
        });
        
        console.log(`✅ Twilioから番号をインポートしました (ID: ${importedNumber.phone_number_id})`);
      } catch (importError) {
        console.error('❌ インポートエラー:', importError.message);
        rl.close();
        return;
      }
    }

    // Step 6: TwilioのWebhook URLを更新
    console.log('\n🔧 TwilioのWebhook設定を更新中...');
    
    const webhookUrl = 'https://api.retellai.com/v1/twilio-webhook/' + RETELL_API_KEY;
    
    await twilioClient.incomingPhoneNumbers(selectedNumber.sid).update({
      voiceUrl: webhookUrl,
      voiceMethod: 'POST',
      statusCallback: webhookUrl + '/status',
      statusCallbackMethod: 'POST',
    });

    console.log('✅ Webhook URLを設定しました:', webhookUrl);

    // Step 7: 設定完了
    console.log('\n========================================');
    console.log('🎉 連携が完了しました！');
    console.log('========================================');
    console.log(`📞 電話番号: ${selectedNumber.phoneNumber}`);
    console.log(`🤖 エージェント: ${selectedAgent.agent_name}`);
    console.log(`🔗 Webhook: ${webhookUrl}`);
    console.log('\nこの番号に電話をかけると、Retell AIエージェントが応答します。');
    
    // Step 8: テナント設定を更新するか確認
    const updateTenant = await question('\nダッシュボードのテナント設定を更新しますか？ (y/n): ');
    
    if (updateTenant.toLowerCase() === 'y') {
      console.log('\n📝 .env.localに以下の設定を追加してください:');
      console.log(`
TENANT_PHONE_MAPPING='[
  {
    "phone": "${selectedNumber.phoneNumber}",
    "tenantId": "company-new",
    "name": "新規顧客",
    "agentId": "${selectedAgent.agent_id}",
    "color": "#00B900",
    "features": {
      "line": true,
      "gpt": true
    }
  }
]'
      `);
    }

    rl.close();

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    console.error('詳細:', error.message);
    rl.close();
  }
}

// 実行
main();