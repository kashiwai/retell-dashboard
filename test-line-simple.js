// Simple LINE notification test
const https = require('https');

// LINE Messaging APIの設定
const LINE_CHANNEL_ACCESS_TOKEN = 'KCRF1FAH57a1jIffKeRKHb2Y1QZj5rgDtBtq5pRg7r0bWwtW6edlk0Kc9GdgHBF/sHHBdRkPipR/sE7JsbWcGwrR2kW7/CGXR/GVr9psa1tlsImliSVHGCVu9W7qMzUHZF56dI2zcurr/QEZ4fg/JgdB04t89/1O/w1cDnyilFU=';

// まず、broadcastで全フォロワーに送信してみる
function testBroadcast() {
  console.log('\n========== Testing Broadcast API ==========');
  
  const message = {
    messages: [
      {
        type: 'text',
        text: `【テスト通知】
📅 ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
✅ Broadcast APIのテストです
────────────────
もしこのメッセージが届いた場合は、
返信で「届いた」と送信してください。`
      }
    ]
  };

  const options = {
    hostname: 'api.line.me',
    path: '/v2/bot/message/broadcast',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Length': Buffer.byteLength(JSON.stringify(message))
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', data || 'Success (No response body)');
      
      if (res.statusCode === 200) {
        console.log('✅ Broadcast sent successfully!');
      } else {
        console.log('❌ Broadcast failed');
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.write(JSON.stringify(message));
  req.end();
}

// Botの情報を取得
function getBotInfo() {
  console.log('\n========== Getting Bot Info ==========');
  
  const options = {
    hostname: 'api.line.me',
    path: '/v2/bot/info',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      const botInfo = JSON.parse(data);
      console.log('Bot Info:', botInfo);
      console.log('\nBot Details:');
      console.log('- User ID:', botInfo.userId);
      console.log('- Basic ID:', botInfo.basicId);
      console.log('- Display Name:', botInfo.displayName);
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.end();
}

// フォロワー数を取得
function getFollowers() {
  console.log('\n========== Getting Follower Count ==========');
  
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const options = {
    hostname: 'api.line.me',
    path: `/v2/bot/insight/followers?date=${today}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 200) {
        try {
          const followers = JSON.parse(data);
          console.log('Follower info:', followers);
        } catch (e) {
          console.log('Could not parse response');
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.end();
}

// テスト実行
async function runTests() {
  // Bot情報を取得
  getBotInfo();
  
  // 2秒待つ
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // フォロワー数を確認
  getFollowers();
  
  // 2秒待つ
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Broadcastを送信
  testBroadcast();
}

runTests();