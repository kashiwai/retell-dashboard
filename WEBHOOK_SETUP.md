# Retell Webhook設定ガイド

## Webhookとは
RetellのWebhookは、通話イベント（通話終了、分析完了など）が発生した際に、自動的にあなたのアプリケーションに通知を送る仕組みです。これにより、LINEへの自動通知が可能になります。

## 設定手順

### 1. Webhook URLの確認

あなたのWebhook URLは以下になります：

```
https://あなたのドメイン.vercel.app/api/webhook/retell
```

例：
- 本番環境: `https://retell-dashboard.vercel.app/api/webhook/retell`
- ローカルテスト: `https://your-ngrok-url.ngrok.io/api/webhook/retell`

### 2. Retellダッシュボードでの設定

1. **Retellダッシュボードにログイン**
   - https://portal.retell.ai にアクセス
   - ログイン

2. **Webhook設定画面へ**
   - 左メニューから「Settings」または「設定」
   - 「Webhooks」セクションを選択

3. **Webhook URLを登録**
   - 「Add Webhook」または「Webhookを追加」をクリック
   - URL: `https://あなたのドメイン/api/webhook/retell`
   - Events（イベント）を選択：
     - ✅ Call Ended（通話終了）
     - ✅ Call Analyzed（分析完了）
   - 「Save」または「保存」をクリック

4. **シークレットキーの設定（オプション）**
   - セキュリティのため、Webhook Secretを設定することを推奨
   - 設定した場合は、環境変数に追加：
     ```
     RETELL_WEBHOOK_SECRET=your_secret_key
     ```

### 3. 環境変数の設定（Vercel）

1. **Vercelダッシュボードにログイン**
   - https://vercel.com

2. **プロジェクト設定**
   - プロジェクトを選択
   - 「Settings」→「Environment Variables」

3. **必要な環境変数を追加**
   ```
   LINE_NOTIFY_TOKEN=あなたのLINE_Notifyトークン
   NEXT_PUBLIC_APP_URL=https://あなたのアプリ.vercel.app
   RETELL_WEBHOOK_SECRET=webhook_secret_key（オプション）
   ```

4. **再デプロイ**
   - 環境変数を追加後、再デプロイが必要
   - 「Deployments」→「Redeploy」

### 4. ローカルテスト用（ngrok使用）

開発環境でWebhookをテストする場合：

1. **ngrokをインストール**
   ```bash
   # macOS
   brew install ngrok
   
   # または公式サイトからダウンロード
   # https://ngrok.com/download
   ```

2. **ローカルサーバーを起動**
   ```bash
   npm run dev
   ```

3. **ngrokでトンネルを作成**
   ```bash
   ngrok http 3000
   ```

4. **ngrok URLをコピー**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```
   この `https://abc123.ngrok.io/api/webhook/retell` をRetellに登録

## Webhook動作フロー

```
1. Retellで通話が終了
    ↓
2. Retellが Webhook URL にPOSTリクエスト送信
    ↓
3. /api/webhook/retell がリクエストを受信
    ↓
4. LINE Notify APIに通知を送信
    ↓
5. LINEに通知が届く
```

## 通知タイミング

### 通話終了時（即座）
- 基本情報（発信者、通話時間など）を通知

### 分析完了時（数秒後）
- 要約
- 感情分析
- カスタム分析結果
- 緊急度
- お客様情報

## トラブルシューティング

### Webhookが届かない場合

1. **URL確認**
   - URLが正しいか確認
   - HTTPSであることを確認

2. **環境変数確認**
   ```bash
   # Vercelの環境変数を確認
   vercel env ls
   ```

3. **ログ確認**
   - Vercelダッシュボード → Functions → Logs
   - エラーメッセージを確認

4. **Webhook履歴確認**
   - Retellダッシュボード → Webhooks → History
   - 送信履歴とレスポンスを確認

### LINEに通知が届かない場合

1. **LINE Notifyトークン確認**
   - 環境変数 `LINE_NOTIFY_TOKEN` が設定されているか
   - トークンが有効か

2. **テスト送信**
   ```bash
   curl -X POST https://あなたのアプリ/api/webhook/retell \
     -H "Content-Type: application/json" \
     -d '{
       "event": "call_ended",
       "call_id": "test-123",
       "from_number": "090-1234-5678",
       "start_timestamp": 1234567890000,
       "end_timestamp": 1234567900000
     }'
   ```

## セキュリティ注意事項

1. **Webhook Secret**を設定して署名検証を行う
2. **環境変数**は絶対にコードにハードコードしない
3. **HTTPS**を必ず使用する
4. **IPホワイトリスト**を設定可能な場合は設定する

## サポート

設定に関してご不明な点がございましたら、お問い合わせください。