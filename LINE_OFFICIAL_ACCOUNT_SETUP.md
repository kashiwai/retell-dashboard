# LINE公式アカウント & Messaging API 設定ガイド

## 📋 現在の仕様について

LINEの仕様変更により、Messaging APIチャネルを利用するには、まずLINE公式アカウントを作成し、そのアカウントでMessaging APIを有効にする必要があります。

提供された情報：
- Channel ID: `2009276449`
- Channel Secret: `806e26f795ca18457c4c8803d536ee11`

これらは既存のLINE公式アカウントの認証情報と思われます。

## 🚀 設定手順

### ステップ1: LINE公式アカウントの確認

#### A. 既存アカウントがある場合

1. **LINE Official Account Manager にログイン**
   - URL: https://manager.line.biz/
   - LINEビジネスIDでログイン

2. **アカウントリストを確認**
   - 既存のLINE公式アカウントが表示されます
   - TSUNAGARU.AI用のアカウントを選択

3. **設定メニューへ**
   - 右上の「設定」をクリック

#### B. 新規作成が必要な場合

1. **LINE公式アカウント作成**
   - URL: https://www.linebiz.com/jp/entry/
   - 「LINE公式アカウントをはじめる」をクリック

2. **アカウント情報入力**
   - アカウント名: TSUNAGARU.AI
   - 業種: その他
   - メールアドレス登録

### ステップ2: Messaging API を有効にする

1. **LINE Official Account Manager で設定**
   - 設定 → Messaging API
   - 「Messaging APIを利用する」をクリック

2. **プロバイダー選択または作成**
   - 既存プロバイダーを選択、または
   - 「新規プロバイダー作成」でTSUNAGARU.AIプロバイダーを作成

3. **同意して有効化**
   - 利用規約に同意
   - 「OK」をクリック

### ステップ3: LINE Developers でチャンネル設定

1. **LINE Developersコンソールへ移動**
   - Messaging API有効化後、自動的にリンクが表示
   - または https://developers.line.biz/console/ へ直接アクセス

2. **チャンネル確認**
   ```
   Channel ID: 2009276449
   Channel Secret: 806e26f795ca18457c4c8803d536ee11
   ```
   これらの値が表示されているか確認

3. **チャンネルアクセストークン発行**
   - Messaging API タブ
   - チャンネルアクセストークン（長期）
   - 「発行」ボタンをクリック
   - トークンをコピー

### ステップ4: Webhook設定

1. **Webhook URL設定**
   - LINE Developersコンソール → Messaging API
   - Webhook設定：
     ```
     URL: https://your-app.vercel.app/api/line/webhook
     ```
   - 「Webhookの利用」をON

2. **LINE Official Account Manager で応答設定**
   - 設定 → 応答設定
   - 応答モード: 「Bot」
   - あいさつメッセージ: ON
   - 応答メッセージ: OFF
   - Webhook: ON

### ステップ5: 環境変数設定

`.env.local` に追加：

```bash
# LINE Messaging API (既存の値を使用)
LINE_CHANNEL_ID=2009276449
LINE_CHANNEL_SECRET=806e26f795ca18457c4c8803d536ee11
LINE_CHANNEL_ACCESS_TOKEN=発行したトークンをここに貼り付け

# App URL (Vercelデプロイ後)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 🔍 トラブルシューティング

### Channel ID/Secretが異なる場合

もし表示されるChannel ID/Secretが提供された値と異なる場合：

1. **既存チャンネルを探す**
   - LINE Developersコンソール
   - すべてのプロバイダーを確認
   - Channel ID `2009276449` を探す

2. **見つからない場合**
   - 新規作成されたチャンネルの値を使用
   - 環境変数を新しい値に更新

### Messaging APIが有効にできない

1. **LINE公式アカウントの種類確認**
   - 認証済みアカウントか確認
   - フリープランでも利用可能

2. **管理者権限確認**
   - アカウントの管理者権限が必要

## 📱 機能テスト

### 1. 友だち追加
- LINE Official Account Manager → ホーム
- QRコードを表示
- スマートフォンでスキャン

### 2. テストメッセージ送信
LINEアプリから：
- 「ヘルプ」と送信
- ボットから返信が来れば成功

### 3. Webhook動作確認
- Retellで通話テスト
- LINE通知が届くか確認

## 🔐 セキュリティ設定

1. **IPアドレス制限**（オプション）
   - LINE Developersコンソール
   - セキュリティ設定
   - サーバーのIPアドレスを登録

2. **署名検証**
   - 実装済み（`/api/line/webhook/route.ts`）
   - Channel Secretで自動検証

## 📞 サポート連絡先

設定でお困りの場合：

1. **LINE Developers Community**
   - https://www.line-community.me/

2. **公式ドキュメント**
   - Messaging API: https://developers.line.biz/ja/docs/messaging-api/
   - LINE公式アカウント: https://www.linebiz.com/jp/manual/

## ✅ チェックリスト

- [ ] LINE公式アカウント作成/確認
- [ ] Messaging API有効化
- [ ] Channel ID/Secret確認（`2009276449` / `806e26f795ca18457c4c8803d536ee11`）
- [ ] アクセストークン発行
- [ ] Webhook URL設定
- [ ] 環境変数設定
- [ ] 応答モード設定（Bot）
- [ ] テストメッセージ送信
- [ ] Retell連携テスト