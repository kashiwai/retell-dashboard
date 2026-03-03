#!/usr/bin/env node

const twilio = require('twilio');

// 環境変数から認証情報を取得
require('dotenv').config({ path: '.env.local' });

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

async function main() {
  console.log('===========================================');
  console.log('  Twilio SIP設定情報取得ツール');
  console.log('===========================================\n');

  try {
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // TwilioのSIP Domainを取得または作成
    console.log('📡 SIPドメイン情報:\n');
    
    // SIPドメインのリストを取得
    const sipDomains = await twilioClient.sip.domains.list();
    
    let sipDomain;
    if (sipDomains.length === 0) {
      // SIPドメインがない場合は作成
      console.log('📌 新しいSIPドメインを作成します...');
      sipDomain = await twilioClient.sip.domains.create({
        domainName: `retell-${Date.now()}.sip.twilio.com`,
        friendlyName: 'Retell AI SIP Domain',
      });
      console.log('✅ SIPドメインを作成しました');
    } else {
      sipDomain = sipDomains[0];
      console.log('✅ 既存のSIPドメインを使用');
    }

    console.log(`\nSIPドメイン: ${sipDomain.domainName}`);
    console.log(`Friendly Name: ${sipDomain.friendlyName}`);
    console.log(`SID: ${sipDomain.sid}`);

    // Termination URI (SIPエンドポイント)
    const terminationUri = `sip:${sipDomain.domainName}`;

    // 認証情報の作成または取得
    console.log('\n🔐 SIP認証情報:\n');
    
    // Credential Listを取得または作成
    const credentialLists = await twilioClient.sip.credentialLists.list();
    
    let credentialList;
    if (credentialLists.length === 0) {
      console.log('📌 新しい認証リストを作成します...');
      credentialList = await twilioClient.sip.credentialLists.create({
        friendlyName: 'Retell AI Credentials'
      });
      console.log('✅ 認証リストを作成しました');
    } else {
      credentialList = credentialLists[0];
      console.log('✅ 既存の認証リストを使用');
    }

    // ユーザー認証情報を作成または取得
    const credentials = await twilioClient.sip
      .credentialLists(credentialList.sid)
      .credentials.list();

    let username, password;
    if (credentials.length === 0) {
      // 新しい認証情報を作成
      username = 'retell_user';
      password = `pwd_${Math.random().toString(36).substring(2, 15)}`;
      
      await twilioClient.sip
        .credentialLists(credentialList.sid)
        .credentials.create({
          username: username,
          password: password
        });
      
      console.log('✅ 新しい認証情報を作成しました');
    } else {
      username = credentials[0].username;
      password = '(保存されていません - 新しいパスワードが必要です)';
      console.log('⚠️ 既存の認証情報があります（パスワードは再生成が必要）');
    }

    // ドメインに認証リストを関連付け
    const authMappings = await twilioClient.sip
      .domains(sipDomain.sid)
      .auth.registrations.credentialListMappings.list();

    if (authMappings.length === 0) {
      await twilioClient.sip
        .domains(sipDomain.sid)
        .auth.registrations.credentialListMappings.create({
          credentialListSid: credentialList.sid
        });
      console.log('✅ 認証リストをドメインに関連付けました');
    }

    // 結果を表示
    console.log('\n========================================');
    console.log('📋 Retell AIに入力する情報:');
    console.log('========================================\n');
    
    console.log('1. Termination URI:');
    console.log(`   ${terminationUri}`);
    console.log('   (これはRetellからTwilioへの発信用URIです)\n');
    
    console.log('2. SIP Trunk User Name (Optional):');
    console.log(`   ${username}\n`);
    
    console.log('3. SIP Trunk Password (Optional):');
    if (password.includes('保存されていません')) {
      console.log('   新しいパスワードを生成してください');
      const newPassword = `pwd_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`   推奨: ${newPassword}`);
      console.log('   (このパスワードをTwilioとRetellの両方に設定してください)\n');
    } else {
      console.log(`   ${password}\n`);
    }
    
    console.log('4. Nickname (Optional):');
    console.log('   Twilio 050-1807-5642\n');

    console.log('========================================');
    console.log('📝 重要な注意事項:');
    console.log('========================================');
    console.log('1. Termination URIは、RetellからTwilioへの発信用です');
    console.log('2. 着信はWebhook経由で処理されます');
    console.log('3. SIP認証情報は省略可能ですが、セキュリティのため推奨');
    console.log('4. パスワードは安全な場所に保管してください\n');

    // 環境変数ファイルに追加する設定
    console.log('========================================');
    console.log('🔧 .env.localに追加する設定:');
    console.log('========================================');
    console.log(`
# Twilio SIP設定
TWILIO_SIP_DOMAIN=${sipDomain.domainName}
TWILIO_SIP_USERNAME=${username}
TWILIO_SIP_PASSWORD=${password.includes('保存') ? '(新しいパスワードを設定)' : password}
TWILIO_TERMINATION_URI=${terminationUri}
    `);

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('詳細:', error.response.data);
    }
  }
}

// 実行
main();