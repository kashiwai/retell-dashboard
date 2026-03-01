# Vercel環境変数設定ガイド

## 📍 Vercel環境変数の設定場所

### 1. Vercelダッシュボードにアクセス
- URL: https://vercel.com/dashboard
- GitHubアカウントでログイン

### 2. プロジェクトを選択
- `retell-dashboard` プロジェクトを選択

### 3. 環境変数設定画面へ
- **Settings** タブをクリック
- 左メニューから **Environment Variables** を選択

### 4. 環境変数を追加

以下の変数を一つずつ追加してください：

#### Retell AI
- **Key**: `RETELL_API_KEY`
- **Value**: あなたのRetell APIキー
- **Environment**: Production, Preview, Development すべてにチェック

#### OpenAI
- **Key**: `OPENAI_API_KEY`
- **Value**: あなたのOpenAI APIキー
- **Environment**: Production, Preview, Development すべてにチェック

#### Twilio
- **Key**: `TWILIO_ACCOUNT_SID`
- **Value**: あなたのTwilio Account SID
- **Environment**: Production, Preview, Development すべてにチェック

- **Key**: `TWILIO_AUTH_TOKEN`
- **Value**: あなたのTwilio Auth Token
- **Environment**: Production, Preview, Development すべてにチェック

- **Key**: `TWILIO_PHONE_NUMBER`
- **Value**: あなたのTwilio電話番号
- **Environment**: Production, Preview, Development すべてにチェック

#### LINE Messaging API
- **Key**: `LINE_CHANNEL_ID`
- **Value**: `2009276449`
- **Environment**: Production, Preview, Development すべてにチェック

- **Key**: `LINE_CHANNEL_SECRET`
- **Value**: あなたのLINE Channel Secret
- **Environment**: Production, Preview, Development すべてにチェック

- **Key**: `LINE_CHANNEL_ACCESS_TOKEN`
- **Value**: あなたのLINE Channel Access Token（長い文字列）
- **Environment**: Production, Preview, Development すべてにチェック

#### App URL
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://retell-dashboard-opal.vercel.app`
- **Environment**: Production, Preview, Development すべてにチェック

## 🔄 再デプロイ方法

環境変数を設定した後、必ず再デプロイが必要です：

### 方法1: Vercelダッシュボードから
1. **Deployments** タブを開く
2. 最新のデプロイメントの「...」メニューをクリック
3. **Redeploy** を選択
4. **Redeploy** ボタンをクリック

### 方法2: GitHubにプッシュ
```bash
git add .
git commit -m "Trigger redeploy"
git push origin main
```

## ✅ 設定確認

### 1. 環境変数が正しく設定されているか確認
- Vercelダッシュボード → Settings → Environment Variables
- すべての変数が表示されていることを確認

### 2. デプロイログを確認
- Vercelダッシュボード → Deployments
- 最新のデプロイメントをクリック
- **Building** タブでエラーがないか確認

### 3. Functions ログを確認
- Vercelダッシュボード → Functions
- エラーがないか確認

## 🔍 トラブルシューティング

### 環境変数が反映されない場合
1. 再デプロイを実行
2. ブラウザのキャッシュをクリア
3. Functions ログでエラーを確認

### エラーが出る場合
1. 環境変数の値に余分な空白がないか確認
2. クォーテーションマークが含まれていないか確認
3. 改行が含まれていないか確認

## 📝 重要な注意事項

- **NEXT_PUBLIC_** で始まる変数はクライアント側でも使用可能
- それ以外の変数はサーバー側のみで使用可能
- 環境変数を変更した場合は必ず再デプロイが必要
- Production環境の変数は本番環境でのみ使用される

## 🎯 設定完了後のテスト

1. **Webhook確認**
   ```bash
   curl https://retell-dashboard-opal.vercel.app/api/webhook/retell
   ```

2. **LINE Webhook確認**
   ```bash
   curl https://retell-dashboard-opal.vercel.app/api/line/webhook
   ```

3. **ダッシュボードアクセス**
   - https://retell-dashboard-opal.vercel.app
   - ログインできることを確認

設定が完了したら、Vercelが自動的に再デプロイを開始します。
デプロイが完了するまで約2-3分かかります。