# Twilio番号をRetell AIで使用する簡単な方法

## ❌ 問題
- Retell AIの「Import Twilio Number」でInternal Server Error
- SIPトランクの設定が複雑

## ✅ 解決方法：Webhook転送を使う（最も簡単）

### 方法1: Twilio → Retell AI（Webhook経由）

既に設定済みですが、確認してください：

1. **Twilioダッシュボード**にログイン
   - https://console.twilio.com

2. **Phone Numbers → Manage → Active Numbers**
   - `+815018075642`を選択

3. **Voice & Fax設定**
   ```
   A CALL COMES IN: 
   Webhook: https://api.retellai.com/twilio-voice-webhook/key_424284122e45372cf604e251018c
   HTTP POST
   ```

4. **Save**をクリック

### 方法2: Retell AIで新しい番号を購入（推奨）

最も簡単で確実な方法：

1. **Retell AIダッシュボード**
   - Phone Numbers → Buy New Number

2. **日本の番号を選択**
   - 050番号または03番号

3. **エージェントを割り当て**
   - PALDATAエージェントを選択

4. **Purchase**

### 方法3: TwiMLを使用した転送

Twilioの番号をRetell AIの番号に転送：

1. **TwiML Binを作成**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <Response>
     <Dial>
       <Number>+815018080215</Number>
     </Dial>
   </Response>
   ```

2. **Twilioで設定**
   - +815018075642のWebhookにTwiML Binを設定

## 📞 現在の状態

| 番号 | 状態 | 対応 |
|------|------|------|
| +815018080215 | ✅ 動作中 | そのまま使用可能 |
| +815018075642 | ⚠️ 設定必要 | Webhook設定を確認 |

## 🔧 トラブルシューティング

### Webhook URLの確認コマンド
```bash
# Twilioの設定を確認
node scripts/check-retell-numbers.js

# Webhook URLを修正
node scripts/fix-twilio-webhooks.js
```

### テスト通話
1. `050-1808-0215`に電話 → 動作確認
2. `050-1807-5642`に電話 → 動作確認

## 💡 推奨事項

**最も簡単な解決策**：
- Retell AIで直接番号を購入する（月額$2程度）
- Twilioの複雑な設定を避けられる
- 即座に使用可能

**Twilioを使い続ける場合**：
- Webhook URLが正しく設定されていることを確認
- `https://api.retellai.com/twilio-voice-webhook/[YOUR_API_KEY]`

## 📝 環境変数の更新

`.env.local`に以下を確認：
```env
RETELL_API_KEY=your_retell_api_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
```

## サポート

問題が続く場合：
1. Retell AIのサポートに連絡
2. Twilioのログを確認
3. ダッシュボードから手動で番号を追加