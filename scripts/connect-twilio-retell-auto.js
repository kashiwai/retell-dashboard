#!/usr/bin/env node

const twilio = require('twilio');
const { Retell } = require('retell-sdk');

// 環境変数から認証情報を取得
require('dotenv').config({ path: '.env.local' });

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const RETELL_API_KEY = process.env.RETELL_API_KEY;

async function main() {
  try {
    console.log('===========================================');
    console.log('  Twilio → Retell AI 電話番号自動連携');
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
      return;
    }

    console.log('利用可能な050番号:');
    jp050Numbers.forEach((num, index) => {
      console.log(`  ${index + 1}. ${num.phoneNumber} (${num.friendlyName || '名前なし'})`);
    });

    // 自動的に最初の番号を選択（または引数で指定された番号）
    const phoneIndex = process.argv[2] ? parseInt(process.argv[2]) - 1 : 0;
    const selectedNumber = jp050Numbers[phoneIndex];
    
    if (!selectedNumber) {
      console.log('❌ 指定された番号が見つかりません。');
      return;
    }

    console.log(`\n✅ 選択された番号: ${selectedNumber.phoneNumber}`);

    // Step 2: Retell AIのエージェント一覧を取得
    console.log('\n🤖 Retell AIのエージェントを取得中...\n');
    const agents = await retellClient.agent.list();

    if (!agents || agents.length === 0) {
      // エージェントがない場合は新規作成
      console.log('📌 新しいエージェントを作成します...');
      
      const newAgent = await retellClient.agent.create({
        agent_name: `Agent for ${selectedNumber.phoneNumber}`,
        voice_id: '11labs-Adrian',
        language: 'ja',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'default',
        },
        general_prompt: '日本語で丁寧に応対してください。AI受付システムです。',
      });
      
      agents.push(newAgent);
      console.log(`✅ 新しいエージェントを作成しました: ${newAgent.agent_name}`);
    }

    console.log('利用可能なエージェント:');
    agents.forEach((agent, index) => {
      console.log(`  ${index + 1}. ${agent.agent_name || 'Unnamed Agent'} (ID: ${agent.agent_id})`);
    });

    // 自動的に最初のエージェントを選択（または引数で指定）
    const agentIndex = process.argv[3] ? parseInt(process.argv[3]) - 1 : 0;
    const selectedAgent = agents[agentIndex];
    
    if (!selectedAgent) {
      console.log('❌ エージェントが見つかりません。');
      return;
    }

    console.log(`\n✅ 選択されたエージェント: ${selectedAgent.agent_name}`);

    // Step 3: Retell AIで電話番号を登録
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
        
        console.log(`✅ 番号設定を更新しました`);
      } else {
        console.log('📌 Twilioから番号をインポートします...');
        
        // TwilioからRetell AIに番号をインポート
        try {
          const importedNumber = await retellClient.phoneNumber.import({
            phone_number: selectedNumber.phoneNumber,
            agent_id: selectedAgent.agent_id,
          });
          
          phoneNumberId = importedNumber.phone_number_id;
          console.log(`✅ 番号をインポートしました (ID: ${phoneNumberId})`);
        } catch (importErr) {
          // インポートがサポートされていない場合は作成を試みる
          console.log('📌 インポートに失敗。直接作成を試みます...');
          
          const newNumber = await retellClient.phoneNumber.create({
            phone_number: selectedNumber.phoneNumber,
            phone_number_type: 'byoc_twilio',
            agent_id: selectedAgent.agent_id,
            inbound_agent_id: selectedAgent.agent_id,
          });
          
          phoneNumberId = newNumber.phone_number_id;
          console.log(`✅ 番号を作成しました (ID: ${phoneNumberId})`);
        }
      }

    } catch (retellError) {
      console.error('⚠️ Retell API エラー:', retellError.message);
      console.log('Webhook設定のみ行います...');
    }

    // Step 4: TwilioのWebhook URLを更新
    console.log('\n🔧 TwilioのWebhook設定を更新中...');
    
    // Retell AIのWebhook URL形式
    const webhookUrl = `https://api.retellai.com/twilio-voice-webhook/${RETELL_API_KEY}`;
    
    await twilioClient.incomingPhoneNumbers(selectedNumber.sid).update({
      voiceUrl: webhookUrl,
      voiceMethod: 'POST',
      voiceFallbackUrl: webhookUrl,
      voiceFallbackMethod: 'POST',
      statusCallback: webhookUrl,
      statusCallbackMethod: 'POST',
    });

    console.log('✅ Webhook URLを設定しました');

    // Step 5: 設定完了
    console.log('\n========================================');
    console.log('🎉 連携が完了しました！');
    console.log('========================================');
    console.log(`📞 電話番号: ${selectedNumber.phoneNumber}`);
    console.log(`🤖 エージェント: ${selectedAgent.agent_name}`);
    console.log(`🔗 Webhook: ${webhookUrl}`);
    console.log('\n📝 環境変数の設定例:');
    console.log(`
TENANT_PHONE_MAPPING='[
  {
    "phone": "${selectedNumber.phoneNumber}",
    "tenantId": "company-${Date.now()}",
    "name": "新規顧客",
    "agentId": "${selectedAgent.agent_id}",
    "color": "#00B900",
    "features": {
      "line": true,
      "gpt": true
    }
  }
]'`);
    
    console.log('\n✅ この番号に電話をかけると、Retell AIエージェントが応答します。');
    console.log('📌 ダッシュボードで通話履歴を確認できます: https://retell-dashboard-opal.vercel.app');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

// 実行
main();