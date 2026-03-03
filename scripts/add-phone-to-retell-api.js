#!/usr/bin/env node

const { Retell } = require('retell-sdk');

// 環境変数から認証情報を取得
require('dotenv').config({ path: '.env.local' });

const RETELL_API_KEY = process.env.RETELL_API_KEY;

async function main() {
  console.log('===========================================');
  console.log('  Retell AI API経由で電話番号を追加');
  console.log('===========================================\n');

  try {
    const retellClient = new Retell({
      apiKey: RETELL_API_KEY,
    });

    // エージェント一覧を取得
    console.log('🤖 利用可能なエージェントを取得中...\n');
    const agents = await retellClient.agent.list();
    
    // PALDATAエージェントを探す
    let selectedAgent = agents.find(a => a.agent_name?.includes('PALDATA')) || agents[0];
    
    if (!selectedAgent) {
      console.log('❌ エージェントが見つかりません');
      return;
    }

    console.log(`選択されたエージェント: ${selectedAgent.agent_name}`);
    console.log(`エージェントID: ${selectedAgent.agent_id}\n`);

    // 電話番号を追加（複数の方法を試す）
    console.log('📞 電話番号 +815018075642 を追加中...\n');

    const phoneNumberData = {
      phone_number: '+815018075642',
      inbound_agent_id: selectedAgent.agent_id,
    };

    try {
      // 方法1: BYOCとして追加
      console.log('方法1: BYOC (Bring Your Own Carrier)として追加...');
      const phone1 = await retellClient.phoneNumber.create({
        ...phoneNumberData,
        phone_number_type: 'byoc_twilio',
      });
      
      console.log('✅ BYOC番号として追加成功！');
      console.log(`番号ID: ${phone1.phone_number_id || phone1.phone_number}`);
      return;
    } catch (err1) {
      console.log('❌ BYOC追加失敗:', err1.message);
    }

    try {
      // 方法2: カスタム番号として追加
      console.log('\n方法2: カスタム番号として追加...');
      const phone2 = await retellClient.phoneNumber.create({
        ...phoneNumberData,
        phone_number_type: 'custom',
      });
      
      console.log('✅ カスタム番号として追加成功！');
      console.log(`番号ID: ${phone2.phone_number_id || phone2.phone_number}`);
      return;
    } catch (err2) {
      console.log('❌ カスタム追加失敗:', err2.message);
    }

    try {
      // 方法3: タイプ指定なしで追加
      console.log('\n方法3: タイプ指定なしで追加...');
      const phone3 = await retellClient.phoneNumber.create(phoneNumberData);
      
      console.log('✅ 番号追加成功！');
      console.log(`番号ID: ${phone3.phone_number_id || phone3.phone_number}`);
      return;
    } catch (err3) {
      console.log('❌ 追加失敗:', err3.message);
    }

    // 最終確認：現在の番号リストを表示
    console.log('\n📋 現在登録されている番号一覧:\n');
    const allNumbers = await retellClient.phoneNumber.list();
    
    allNumbers.forEach(num => {
      if (num.phone_number.startsWith('+8150')) {
        console.log(`- ${num.phone_number}`);
        console.log(`  エージェント: ${num.inbound_agent_id || num.agent_id || 'なし'}`);
      }
    });

    console.log('\n========================================');
    console.log('⚠️ API経由での追加に失敗しました');
    console.log('========================================\n');
    console.log('代替案:');
    console.log('1. Retell AIダッシュボードで手動追加');
    console.log('2. Retell AIで新しい番号を購入');
    console.log('3. 050-1808-0215（動作中）を使用');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('詳細:', error.response.data);
    }
  }
}

// 実行
main();