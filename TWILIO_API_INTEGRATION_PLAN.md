# Twilio API 完全統合プラン

## ✅ 実現可能な機能

### 1. 📞 電話番号の自動取得・管理
**Twilio Phone Numbers API**を使用して以下が可能：

```typescript
// 電話番号の検索と購入
const twilioClient = require('twilio')(accountSid, authToken);

// 利用可能な番号を検索
const availableNumbers = await twilioClient.availablePhoneNumbers('JP')
  .local  // または .tollFree, .mobile
  .list({
    voiceEnabled: true,
    smsEnabled: true,
    mmsEnabled: false,
    contains: '03',  // 03で始まる番号
    limit: 10
  });

// 番号を購入
const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
  phoneNumber: availableNumbers[0].phoneNumber,
  voiceUrl: 'https://your-app.com/webhook/voice',
  smsUrl: 'https://your-app.com/webhook/sms',
  friendlyName: '株式会社A - 受付番号'
});
```

### 2. 🔌 SIPトランクの自動設定
**Twilio SIP Trunking API**で完全自動化：

```typescript
// SIPトランクの作成
const trunk = await twilioClient.trunking.v1.trunks.create({
  friendlyName: 'Company A SIP Trunk',
  secure: true,
  cnamLookupEnabled: false,
  domainName: 'company-a.pstn.twilio.com'
});

// Origination URI（着信設定）
await twilioClient.trunking.v1
  .trunks(trunk.sid)
  .originationUrls.create({
    sipUrl: 'sip:company-a@your-pbx.com:5060',
    weight: 100,
    priority: 10,
    enabled: true,
    friendlyName: 'Company A PBX'
  });

// Termination URI（発信設定）
await twilioClient.trunking.v1
  .trunks(trunk.sid)
  .credentialLists(credentialListSid)
  .create();

// 電話番号をトランクに紐付け
await twilioClient.trunking.v1
  .trunks(trunk.sid)
  .phoneNumbers.create({
    phoneNumberSid: purchasedNumber.sid
  });
```

### 3. 🎛️ Elastic SIPトランク設定
**高度な設定も自動化可能**：

```typescript
// IP Access Control Lists (ACL)
const acl = await twilioClient.sip.ipAccessControlLists.create({
  friendlyName: 'Company A ACL'
});

// 許可するIPアドレスを追加
await twilioClient.sip
  .ipAccessControlLists(acl.sid)
  .ipAddresses.create({
    ipAddress: '203.0.113.0/24',  // お客様のIPレンジ
    friendlyName: 'Company A Office'
  });

// 認証情報の設定
const credentialList = await twilioClient.sip.credentialLists.create({
  friendlyName: 'Company A Credentials'
});

await twilioClient.sip
  .credentialLists(credentialList.sid)
  .credentials.create({
    username: 'company-a-user',
    password: 'secure-password-123'
  });
```

## 🏗️ 実装アーキテクチャ

### システム構成図
```
┌─────────────────────────────────┐
│   管理ダッシュボード（Next.js）    │
├─────────────────────────────────┤
│  Twilio統合API（/api/twilio/*）  │
└───────────┬─────────────────────┘
            │
    ┌───────▼────────┐
    │  Twilio APIs   │
    ├────────────────┤
    │ • Phone Numbers│
    │ • SIP Trunking │
    │ • Elastic SIP  │
    │ • Voice        │
    │ • Messaging    │
    └────────────────┘
```

### 管理画面の機能

#### 1. 電話番号管理画面
```typescript
// app/admin/phone-numbers/page.tsx
export default function PhoneNumbersPage() {
  // 機能:
  // - 利用可能な番号を検索
  // - ワンクリックで購入
  // - 既存番号の管理
  // - 自動でRetell AIと連携
}
```

#### 2. SIPトランク管理画面
```typescript
// app/admin/sip-trunks/page.tsx
export default function SIPTrunksPage() {
  // 機能:
  // - トランクの作成・削除
  // - セキュリティ設定（IP制限）
  // - 認証情報管理
  // - 接続テスト
}
```

#### 3. 自動プロビジョニング
```typescript
// app/api/provision/customer/route.ts
export async function POST(request: Request) {
  const { companyName, phoneType, sipConfig } = await request.json();
  
  // 1. Twilioで電話番号を購入
  const phoneNumber = await purchasePhoneNumber(phoneType);
  
  // 2. SIPトランクを設定（必要な場合）
  if (sipConfig) {
    await configureSIPTrunk(phoneNumber, sipConfig);
  }
  
  // 3. Retell AIエージェントを作成
  const agent = await createRetellAgent(companyName, phoneNumber);
  
  // 4. Webhookを設定
  await configureWebhooks(phoneNumber, agent);
  
  // 5. データベースに保存
  await saveTenantConfig({
    companyName,
    phoneNumber,
    agentId: agent.id,
    twilioConfig: { ... }
  });
  
  return NextResponse.json({ success: true, phoneNumber });
}
```

## 📋 実装に必要なもの

### 1. Twilioアカウント情報
```env
# .env.local
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=xxxxxxxxxxxxxxxxx
```

### 2. 必要なパッケージ
```bash
npm install twilio
```

### 3. APIエンドポイント

#### 電話番号管理API
- `GET /api/twilio/numbers/available` - 利用可能な番号を検索
- `POST /api/twilio/numbers/purchase` - 番号を購入
- `GET /api/twilio/numbers` - 購入済み番号一覧
- `DELETE /api/twilio/numbers/:sid` - 番号を解放

#### SIPトランクAPI
- `POST /api/twilio/trunks` - トランク作成
- `GET /api/twilio/trunks` - トランク一覧
- `PUT /api/twilio/trunks/:sid` - トランク更新
- `DELETE /api/twilio/trunks/:sid` - トランク削除

## 💰 コスト管理機能

### 利用料金の自動計算
```typescript
// Twilio Usage Records API
const usage = await twilioClient.usage.records.list({
  category: 'calls-inbound-local',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});

// 請求額計算
const billing = {
  phoneNumbers: phoneNumbers.length * 100, // 月額100円/番号
  inboundMinutes: usage.minutes * 2.5,    // 2.5円/分
  outboundMinutes: outbound.minutes * 5,  // 5円/分
  smsCount: sms.count * 8                 // 8円/SMS
};
```

## 🚀 実装スケジュール

### Phase 1: 基本機能（2-3日）
- [ ] Twilio SDK統合
- [ ] 電話番号購入API
- [ ] 基本的な管理画面

### Phase 2: SIPトランク（2日）
- [ ] SIPトランク作成API
- [ ] セキュリティ設定
- [ ] 接続テスト機能

### Phase 3: 自動化（1日）
- [ ] ワンクリックプロビジョニング
- [ ] Retell AI連携
- [ ] 請求管理

### Phase 4: 高度な機能（2日）
- [ ] 番号ポーティング
- [ ] 災害時転送設定
- [ ] 詳細な利用統計

## 🎯 メリット

1. **完全自動化**
   - 手動作業なしで電話番号取得
   - SIP設定も自動

2. **スケーラビリティ**
   - 100社でも1000社でも対応可能
   - APIベースで拡張性高い

3. **コスト最適化**
   - 使用量に応じた課金
   - リアルタイムでコスト把握

4. **セキュリティ**
   - IP制限
   - 認証管理
   - 暗号化通信

## ⚠️ 注意事項

1. **日本の電話番号**
   - 本人確認が必要（KYC）
   - 取得に1-2営業日かかる場合あり

2. **料金**
   - 電話番号: 月額$1-3
   - 通話: 分単位課金
   - SIPトランク: 月額料金あり

3. **技術要件**
   - SSL証明書必須
   - 固定IPアドレス推奨

## 📝 サンプルコード

完全な実装例を用意できます：

1. **電話番号管理システム**
2. **SIPトランク自動設定**
3. **請求管理ダッシュボード**
4. **マルチテナント対応**

実装を開始しますか？