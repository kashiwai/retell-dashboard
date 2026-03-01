# 本番環境設定ガイド

## 🌐 本番URL
```
https://retell-dashboard-opal.vercel.app
```

## 📋 設定チェックリスト

### 1. Vercel環境変数設定

Vercelダッシュボードで以下の環境変数を設定してください：

```bash
# Retell AI
RETELL_API_KEY=your_retell_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# LINE Messaging API
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token

# App URL
NEXT_PUBLIC_APP_URL=https://retell-dashboard-opal.vercel.app
```

### 2. Retell Webhook設定

1. **Retellダッシュボードにログイン**
   - https://portal.retell.ai

2. **Webhook URL登録**
   - Settings → Webhooks
   - URL: `https://retell-dashboard-opal.vercel.app/api/webhook/retell`
   - Events:
     - ✅ Call Ended
     - ✅ Call Analyzed

### 3. LINE Developers設定

1. **LINE Developersコンソール**
   - https://developers.line.biz/console/

2. **Webhook URL設定**
   - Channel ID `2009276449` を選択
   - Messaging API → Webhook設定
   - URL: `https://retell-dashboard-opal.vercel.app/api/line/webhook`
   - Webhookの利用: **ON**

3. **LINE Official Account Manager**
   - https://manager.line.biz/
   - 応答設定:
     - 応答モード: **Bot**
     - 応答メッセージ: **OFF**
     - Webhook: **ON**

## 🔗 重要なURL一覧

### ユーザー向け
- **ダッシュボード**: https://retell-dashboard-opal.vercel.app
- **ログイン画面**: https://retell-dashboard-opal.vercel.app/login

### API/Webhook
- **Retell Webhook**: https://retell-dashboard-opal.vercel.app/api/webhook/retell
- **LINE Webhook**: https://retell-dashboard-opal.vercel.app/api/line/webhook
- **LINE Send API**: https://retell-dashboard-opal.vercel.app/api/line/send

## 📱 LINE Bot情報

- **Bot名**: Call_Sheep01
- **Basic ID**: @818rmott
- **友だち追加URL**: https://line.me/R/ti/p/@818rmott

## 🧪 動作テスト

### 1. ダッシュボードアクセス
```bash
curl https://retell-dashboard-opal.vercel.app
```

### 2. Webhook確認
```bash
# Retell webhook status
curl https://retell-dashboard-opal.vercel.app/api/webhook/retell

# LINE webhook status
curl https://retell-dashboard-opal.vercel.app/api/line/webhook
```

### 3. LINE Bot動作確認
1. @818rmott を友だち追加
2. 「ヘルプ」と送信
3. 返信が来ることを確認

### 4. 通話テスト
1. Retellで通話実行
2. 通話終了後、LINEに通知が届くことを確認
3. ダッシュボードで通話履歴を確認

## 🔐 ログイン情報

### デモアカウント
```
ユーザー名: admin
パスワード: admin123
```

```
ユーザー名: user
パスワード: user123
```

## 📊 モニタリング

### Vercel Functions ログ
- https://vercel.com/dashboard
- プロジェクト → Functions → Logs

### エラー確認
```bash
# 最近のエラー確認
vercel logs --error
```

## 🚨 トラブルシューティング

### LINEに通知が届かない場合

1. **環境変数確認**
   - Vercelダッシュボードで環境変数が正しく設定されているか確認
   - 再デプロイが必要な場合があります

2. **Webhook URL確認**
   - Retellダッシュボードで正しいURLが設定されているか確認
   - LINE DevelopersでWebhook URLが正しいか確認

3. **ログ確認**
   - Vercel Functions ログでエラーを確認
   - Retell Webhook履歴を確認

### ログインできない場合

1. **環境変数確認**
   - `NEXT_PUBLIC_APP_URL` が正しく設定されているか確認

2. **ブラウザ確認**
   - キャッシュをクリア
   - シークレットモードで試す

## 📝 メンテナンス

### 環境変数更新後
```bash
# Vercelで再デプロイ
vercel --prod
```

### コード更新後
```bash
git add .
git commit -m "Update production settings"
git push origin main
```

## 💡 Tips

- Vercelの環境変数は変更後に再デプロイが必要
- LINE Webhookの検証は定期的に実行を推奨
- Retellの通話ログは定期的に確認

## 📞 サポート

問題が発生した場合は、以下の情報と共にご連絡ください：
- エラーメッセージ
- 発生時刻
- 実行した操作