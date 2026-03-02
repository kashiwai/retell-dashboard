# 電話番号ベースのマルチテナント設計

## 概要
- **Retell AIアカウント**: 御社で1つのアカウントを管理
- **お客様の識別**: 電話番号ベースで管理
- **エージェント管理**: お客様ごとに専用エージェントを割り当て

## システム構成

```
御社のRetell AIアカウント
├── エージェント1（お客様A用）
│   └── 電話番号: +81-50-1234-5678
├── エージェント2（お客様B用）
│   └── 電話番号: +81-50-1234-5679
└── エージェント3（お客様C用）
    └── 電話番号: +81-50-1234-5680
```

## 実装方式

### 1. 電話番号とテナントのマッピング

```typescript
// config/phone-tenant-mapping.ts
export const PHONE_TENANT_MAPPING: Record<string, TenantConfig> = {
  '+815012345678': {
    tenantId: 'company-a',
    name: '株式会社A',
    agentId: 'agent_xxxxx_a',
    primaryColor: '#FF6B6B',
    lineUserId: 'Uxxxxx_a',
    features: {
      lineNotification: true,
      gptAnalysis: true
    }
  },
  '+815012345679': {
    tenantId: 'company-b',
    name: '株式会社B',
    agentId: 'agent_xxxxx_b',
    primaryColor: '#4A90E2',
    lineUserId: 'Uxxxxx_b',
    features: {
      lineNotification: true,
      gptAnalysis: false
    }
  },
  '+815012345680': {
    tenantId: 'company-c',
    name: '株式会社C',
    agentId: 'agent_xxxxx_c',
    primaryColor: '#00B900',
    lineUserId: null,
    features: {
      lineNotification: false,
      gptAnalysis: true
    }
  }
};
```

### 2. 環境変数による設定（JSON形式）

`.env.local`:
```bash
# 御社のRetell APIキー（共通）
RETELL_API_KEY=key_424284122e45372cf604e251018c

# 電話番号とテナントのマッピング（JSON形式）
TENANT_PHONE_MAPPING='[
  {
    "phone": "+815012345678",
    "tenantId": "company-a",
    "name": "株式会社A",
    "agentId": "agent_xxxxx_a",
    "color": "#FF6B6B",
    "lineUserId": "Uxxxxx_a",
    "features": {
      "line": true,
      "gpt": true
    }
  },
  {
    "phone": "+815012345679",
    "tenantId": "company-b",
    "name": "株式会社B",
    "agentId": "agent_xxxxx_b",
    "color": "#4A90E2",
    "lineUserId": "Uxxxxx_b",
    "features": {
      "line": true,
      "gpt": false
    }
  }
]'

# デフォルト設定（電話番号が不明な場合）
DEFAULT_TENANT_NAME=AI受付システム
DEFAULT_TENANT_COLOR=#00B900
```

### 3. テナント識別ロジック

```typescript
// utils/tenant-resolver.ts
export function getTenantByPhoneNumber(phoneNumber: string): TenantConfig {
  // 環境変数からマッピングを取得
  const mapping = JSON.parse(process.env.TENANT_PHONE_MAPPING || '[]');
  
  // 電話番号を正規化（+81, 0, ハイフンなどの処理）
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  // マッピングから該当するテナントを検索
  const tenant = mapping.find(t => 
    normalizePhoneNumber(t.phone) === normalizedPhone
  );
  
  if (!tenant) {
    // デフォルトテナントを返す
    return {
      tenantId: 'default',
      name: process.env.DEFAULT_TENANT_NAME || 'AI受付',
      primaryColor: process.env.DEFAULT_TENANT_COLOR || '#00B900',
      features: {
        lineNotification: false,
        gptAnalysis: true
      }
    };
  }
  
  return tenant;
}

function normalizePhoneNumber(phone: string): string {
  // +81を0に変換、ハイフン除去など
  return phone
    .replace(/^\+81/, '0')
    .replace(/-/g, '')
    .replace(/\s/g, '');
}
```

### 4. Webhookでのテナント識別

```typescript
// app/api/webhook/retell/route.ts
export async function POST(request: NextRequest) {
  const data = await request.json();
  
  // Retellから送られてくる電話番号を取得
  const toNumber = data.to_phone_number || data.to_number || '';
  
  // 電話番号からテナントを特定
  const tenant = getTenantByPhoneNumber(toNumber);
  
  // テナント別の処理
  if (tenant.features.lineNotification && tenant.lineUserId) {
    await sendLineNotification(tenant.lineUserId, data);
  }
  
  // データベースに保存する際はテナントIDも保存
  await saveCallData({
    ...data,
    tenant_id: tenant.tenantId,
    tenant_name: tenant.name
  });
}
```

### 5. ダッシュボードでのフィルタリング

```typescript
// app/api/calls/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant');
  const phoneNumber = searchParams.get('phone');
  
  // Retell APIから全通話を取得
  const retellClient = new Retell({ 
    apiKey: process.env.RETELL_API_KEY 
  });
  const allCalls = await retellClient.call.list({ limit: 100 });
  
  // 電話番号またはテナントIDでフィルタリング
  let filteredCalls = allCalls;
  
  if (phoneNumber) {
    const tenant = getTenantByPhoneNumber(phoneNumber);
    filteredCalls = allCalls.filter(call => {
      const callPhone = call.to_phone_number || call.to_number;
      return getTenantByPhoneNumber(callPhone).tenantId === tenant.tenantId;
    });
  } else if (tenantId) {
    filteredCalls = allCalls.filter(call => {
      const callPhone = call.to_phone_number || call.to_number;
      return getTenantByPhoneNumber(callPhone).tenantId === tenantId;
    });
  }
  
  return NextResponse.json(filteredCalls);
}
```

## エージェント管理

### Retell Dashboard での設定

1. **エージェント作成**
   - お客様ごとに専用エージェントを作成
   - エージェント名: `Company A - Reception AI`
   - 音声設定、応答設定をカスタマイズ

2. **電話番号割り当て**
   - Twilioで電話番号を取得
   - Retellでエージェントに電話番号を紐付け

3. **Webhook設定**
   - 全エージェント共通のWebhook URL
   - `https://your-dashboard.vercel.app/api/webhook/retell`

### エージェント設定例

```yaml
エージェント1 (お客様A):
  name: "株式会社A受付AI"
  phone: "+81-50-1234-5678"
  voice: "日本語女性"
  greeting: "お電話ありがとうございます。株式会社Aでございます。"
  
エージェント2 (お客様B):
  name: "株式会社B受付AI"
  phone: "+81-50-1234-5679"
  voice: "日本語男性"
  greeting: "株式会社Bです。ご用件をお聞かせください。"
```

## メリット

✅ **1つのRetell AIアカウントで管理**
- APIキーの管理が簡単
- 請求の一元化
- エージェントの一括管理

✅ **電話番号ベースの識別**
- シンプルな実装
- お客様側の設定不要
- 電話番号変更で簡単に切り替え

✅ **柔軟な拡張性**
- 新しいお客様追加が簡単（エージェント追加のみ）
- 設定変更が環境変数で完結

## デメリット

❌ **電話番号の制限**
- お客様ごとに電話番号が必要
- 電話番号のコスト

❌ **スケーラビリティ**
- お客様が増えるとエージェント管理が複雑に
- 環境変数のサイズ制限

## 実装手順

1. **現在の設定を更新**（30分）
   - tenant.config.tsを電話番号ベースに修正
   - 環境変数の構成を変更

2. **テナント識別ロジック実装**（1時間）
   - 電話番号正規化関数
   - マッピング検索機能

3. **APIエンドポイント修正**（1時間）
   - Webhook処理の更新
   - 通話履歴のフィルタリング

4. **管理画面の追加**（オプション、2時間）
   - テナント切り替えUI
   - 電話番号一覧表示

この設計でよろしいでしょうか？