# Retell AIで電話番号を設定する方法

## 問題：「Import Twilio Number」が表示されない

Retell AIのUIが変更された可能性があります。以下の方法を試してください：

## 方法1: Phone Numbers → Add Phone Number

1. **Retell AIダッシュボード**にログイン
   - https://app.retellai.com

2. **Phone Numbers**セクションへ移動

3. 以下のオプションを探す：
   - **"Add Phone Number"** または **"+ Add"**
   - **"Buy New Number"**
   - **"Import Number"**
   - **"Connect Phone Number"**
   - **"BYOC (Bring Your Own Carrier)"**

## 方法2: BYOC (Bring Your Own Carrier) オプション

多くの場合、Twilioの番号は「BYOC」として追加します：

1. **Phone Numbers** → **BYOC** または **Custom**
2. **Provider**: Twilio を選択
3. **Phone Number**: +815018075642
4. **Configuration**:
   ```
   Type: Twilio SIP Trunk
   Termination URI: sip:TKd18ab93a80b42eba44f62fc76d43cb05.pstn.twilio.com
   ```

## 方法3: APIを使用して直接追加

もしUIで見つからない場合は、APIで直接追加できます：

```javascript
// scripts/add-phone-to-retell-api.js
const { Retell } = require('retell-sdk');

const retellClient = new Retell({
  apiKey: 'key_424284122e45372cf604e251018c',
});

// 電話番号を追加
async function addPhoneNumber() {
  try {
    const phoneNumber = await retellClient.phoneNumber.create({
      phone_number: '+815018075642',
      phone_number_type: 'byoc_twilio',
      inbound_agent_id: 'agent_f7dad062d3b9482baa69adf35e', // PALDATAエージェント
    });
    
    console.log('番号を追加しました:', phoneNumber);
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

addPhoneNumber();
```

## 方法4: 既存の動作している番号を使用

**050-1808-0215は既に動作しています**ので、まずはこの番号でテストすることをお勧めします。

## 現在の状態

### ✅ 動作中の番号
- **+815018080215** (050-1808-0215)
  - Retell AIに登録済み
  - SIPトランク経由で動作
  - エージェント割り当て済み

### ⚠️ 設定が必要な番号
- **+815018075642** (050-1807-5642)
  - Twilio側：SIPトランクに紐付け済み ✅
  - Retell AI側：登録が必要 ❌

## Retell AIのUIで確認すべき場所

1. **左メニュー**:
   - Phone Numbers
   - Integrations
   - Settings → Phone Configuration

2. **Phone Numbersページ内**:
   - 右上の「+ New」ボタン
   - 「Actions」メニュー
   - 「Import」タブ

3. **もしかすると**:
   - Settings → Integrations → Twilio
   - Developers → API Configuration

## それでも見つからない場合

### オプション1: サポートに問い合わせ
Retell AIのサポートチャット（右下のアイコン）から：
「How can I import my Twilio phone number +815018075642?」

### オプション2: 新しい番号を購入
Retell AIで直接番号を購入する方が簡単かもしれません：
- Phone Numbers → Buy New Number
- 日本の番号を選択
- 月額$2程度

## テスト方法

1. **050-1808-0215**に電話をかける（これは動作するはず）
2. Retell AIダッシュボードで通話履歴を確認
3. 同じ設定を050-1807-5642に適用

---

**注意**: Retell AIのUIは頻繁に更新されるため、上記のオプション名が異なる場合があります。