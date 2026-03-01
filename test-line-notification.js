// Test LINE notification with the updated push message API

async function testLineNotification() {
  const lineAccessToken = 'KCRF1FAH57a1jIffKeRKHb2Y1QZj5rgDtBtq5pRg7r0bWwtW6edlk0Kc9GdgHBF/sHHBdRkPipR/sE7JsbWcGwrR2kW7/CGXR/GVr9psa1tlsImliSVHGCVu9W7qMzUHZF56dI2zcurr/QEZ4fg/JgdB04t89/1O/w1cDnyilFU=';
  const userId = 'Ueb1fac7a01d650bd3edb41208728105b'; // Test user ID (bot's own ID)
  
  const message = `📞 LINE通知テスト
────────────────
📅 ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
✅ これはテストメッセージです
────────────────
Push APIを使用した送信テスト`;

  console.log('Sending LINE notification...');
  console.log('User ID:', userId);
  
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', responseText);

    if (response.ok) {
      console.log('✅ LINE notification sent successfully!');
    } else {
      console.error('❌ Failed to send LINE notification');
      console.error('Error details:', responseText);
    }
  } catch (error) {
    console.error('Error sending LINE notification:', error);
  }
}

// Test getting bot info to verify token
async function getBotInfo() {
  const lineAccessToken = 'KCRF1FAH57a1jIffKeRKHb2Y1QZj5rgDtBtq5pRg7r0bWwtW6edlk0Kc9GdgHBF/sHHBdRkPipR/sE7JsbWcGwrR2kW7/CGXR/GVr9psa1tlsImliSVHGCVu9W7qMzUHZF56dI2zcurr/QEZ4fg/JgdB04t89/1O/w1cDnyilFU=';
  
  console.log('\nGetting bot info...');
  
  try {
    const response = await fetch('https://api.line.me/v2/bot/info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${lineAccessToken}`,
      }
    });

    const data = await response.json();
    console.log('Bot info:', data);
  } catch (error) {
    console.error('Error getting bot info:', error);
  }
}

// Run tests
async function runTests() {
  await getBotInfo();
  await testLineNotification();
}

runTests();