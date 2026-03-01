# LINE通知設定ガイド

## 1. LINE Botを友だち追加

まず、以下のQRコードまたはIDでLINE Botを友だち追加してください：

- Basic ID: `@818rmott`
- Bot名: Call_Sheep01

## 2. ユーザーIDの取得

友だち追加後、以下のいずれかの方法でユーザーIDを取得します：

### 方法A: LINEアプリから取得
1. LINE Botとのトーク画面を開く
2. "ID" と送信する
3. BotがあなたのユーザーIDを返信します

### 方法B: Webhookログから確認
1. Bot を友だち追加したときのログを確認
2. コンソールに表示される `LINE User ID to use for notifications: U...` の値をコピー

## 3. 環境変数の設定

取得したユーザーIDを `.env.local` ファイルに追加します：

```bash
# LINE通知送信先ユーザーID
LINE_USER_ID=あなたのユーザーID
```

例：
```bash
LINE_USER_ID=U1234567890abcdef1234567890abcdef
```

## 4. Vercelへのデプロイ

Vercelの環境変数にも追加が必要です：

1. [Vercel Dashboard](https://vercel.com) にログイン
2. プロジェクトの Settings → Environment Variables
3. `LINE_USER_ID` を追加
4. 再デプロイ

## トラブルシューティング

### エラー: "You can't send messages to yourself"
- Bot自身のIDを使用しています。友だち追加したユーザーのIDを使用してください。

### エラー: "Not found"
- ユーザーIDが間違っているか、Botをブロックしている可能性があります。

### 通知が届かない
1. Bot を友だち追加しているか確認
2. ブロックしていないか確認
3. 環境変数が正しく設定されているか確認

## LINE Webhook URL設定

LINE Developersコンソールで以下のWebhook URLを設定してください：

```
https://your-domain.vercel.app/api/line/webhook
```

- Webhook利用: ON
- 応答メッセージ: OFF（自動応答を無効化）