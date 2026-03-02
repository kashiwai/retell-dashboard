# テナント別デプロイメントガイド

## 概要
このガイドでは、お客様ごとに独立したダッシュボードをVercelにデプロイする手順を説明します。

## デプロイ手順

### 1. 新規お客様用プロジェクトの作成

#### 1.1 Vercelでプロジェクト作成
1. [Vercel](https://vercel.com)にログイン
2. 「New Project」をクリック
3. GitHubリポジトリ `retell-dashboard` を選択
4. プロジェクト名を設定（例：`retell-dashboard-company-a`）

#### 1.2 環境変数の設定

Vercelの設定画面で以下の環境変数を追加：

```bash
# ========== テナント基本情報 ==========
TENANT_ID=company-a
TENANT_NAME=株式会社A
TENANT_PRIMARY_COLOR=#FF6B6B
# TENANT_LOGO_URL=https://example.com/logo.png
# TENANT_SECONDARY_COLOR=#f5f5f5

# ========== 機能設定 ==========
ENABLE_AI_SUMMARY=true
ENABLE_LINE=true
ENABLE_GPT=true
ENABLE_VOICE_RECORDING=true
ENABLE_ANALYTICS=true

# ========== Retell AI ==========
RETELL_API_KEY=お客様のRetell APIキー

# ========== OpenAI（GPT要約用） ==========
OPENAI_API_KEY=お客様のOpenAI APIキー

# ========== LINE（通知用） ==========
LINE_CHANNEL_ACCESS_TOKEN=お客様のLINEチャンネルトークン
# LINE_USER_ID=お客様のLINE送信先ID（任意）

# ========== アプリURL ==========
NEXT_PUBLIC_APP_URL=https://retell-dashboard-company-a.vercel.app
```

### 2. デプロイ実行

1. 環境変数を設定後、「Deploy」をクリック
2. デプロイが完了するまで待つ（約2-3分）
3. デプロイ完了後、URLにアクセスして動作確認

## お客様別カスタマイズ例

### 例1: 株式会社A（赤色テーマ、全機能有効）
```bash
TENANT_ID=company-a
TENANT_NAME=株式会社A
TENANT_PRIMARY_COLOR=#FF6B6B
ENABLE_AI_SUMMARY=true
ENABLE_LINE=true
ENABLE_GPT=true
```

### 例2: 株式会社B（青色テーマ、LINE無効）
```bash
TENANT_ID=company-b
TENANT_NAME=株式会社B
TENANT_PRIMARY_COLOR=#4A90E2
ENABLE_AI_SUMMARY=true
ENABLE_LINE=false  # LINE通知不要
ENABLE_GPT=true
```

### 例3: 株式会社C（緑色テーマ、最小機能）
```bash
TENANT_ID=company-c
TENANT_NAME=株式会社C
TENANT_PRIMARY_COLOR=#00B900
ENABLE_AI_SUMMARY=false  # AI要約不要
ENABLE_LINE=false       # LINE通知不要
ENABLE_GPT=false        # GPT分析不要
```

## Retell AI設定

### 1. お客様専用のRetell APIキー取得
1. [Retell Dashboard](https://dashboard.retellai.com)にログイン
2. API Keys セクションでお客様用のキーを作成
3. 環境変数 `RETELL_API_KEY` に設定

### 2. Webhook URL設定
Retell Dashboardで以下のWebhook URLを設定：
```
https://[お客様のドメイン].vercel.app/api/webhook/retell
```

例：
- 会社A: `https://retell-dashboard-company-a.vercel.app/api/webhook/retell`
- 会社B: `https://retell-dashboard-company-b.vercel.app/api/webhook/retell`

## LINE設定（オプション）

### 1. LINE公式アカウント作成
1. [LINE Developers](https://developers.line.biz)でお客様用アカウント作成
2. Messaging API チャンネルを作成

### 2. チャンネル設定
- チャンネルアクセストークンを発行
- Webhook URL: `https://[お客様のドメイン].vercel.app/api/line/webhook`
- Webhook利用: ON
- 応答メッセージ: OFF

### 3. 環境変数設定
```bash
LINE_CHANNEL_ACCESS_TOKEN=取得したトークン
LINE_CHANNEL_SECRET=チャンネルシークレット
```

### 4. 友だち追加とユーザーID取得
1. QRコードでLINE公式アカウントを友だち追加
2. トーク画面で「ID」と送信
3. 返信されたユーザーIDを `LINE_USER_ID` に設定

## トラブルシューティング

### エラー: "Retell API key not configured for this tenant"
→ `RETELL_API_KEY` が正しく設定されているか確認

### エラー: "LINE notification is not enabled for this tenant"
→ `ENABLE_LINE=true` かつ `LINE_CHANNEL_ACCESS_TOKEN` が設定されているか確認

### ブランディングが反映されない
→ `TENANT_NAME` や `TENANT_PRIMARY_COLOR` が正しく設定されているか確認

## メンテナンス

### 環境変数の更新
1. Vercel Dashboard → Settings → Environment Variables
2. 変更したい変数を編集
3. 「Save」をクリック
4. Deployments → Redeploy で再デプロイ

### 複数テナントの一括更新
共通のアップデートがある場合：
1. GitHubでメインリポジトリを更新
2. 各Vercelプロジェクトで「Redeploy」を実行

## サポート

問題が発生した場合は、以下の情報と共にご連絡ください：
- テナントID
- エラーメッセージ
- 発生日時
- 実行した操作