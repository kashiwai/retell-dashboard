// LINE Messaging API の薄いラッパー。push/reply共通で使う。

export async function pushLineMessage(token: string, message: unknown, userId?: string): Promise<void> {
  if (!token) return;

  const endpoint = userId
    ? 'https://api.line.me/v2/bot/message/push'
    : 'https://api.line.me/v2/bot/message/broadcast';
  const requestBody = userId ? { to: userId, messages: [message] } : { messages: [message] };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[line] push error:', response.status, error);
  }
}

export async function replyLineMessage(token: string, replyToken: string, message: unknown): Promise<void> {
  if (!token) return;

  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages: [message] }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[line] reply error:', response.status, error);
  }
}
