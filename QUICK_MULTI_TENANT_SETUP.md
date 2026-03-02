# 最速マルチテナント実装ガイド

## 概要
環境変数とVercelのプロジェクト複製を使った最速実装方法です。
**実装時間：1-2日**

## 実装方式

### Step 1: 環境変数でテナント識別（30分）

`.env.local`に以下を追加：
```env
# テナント設定
TENANT_ID=company-a
TENANT_NAME=株式会社A
TENANT_LOGO_URL=
TENANT_PRIMARY_COLOR=#00B900

# テナント別のRetell設定
RETELL_API_KEY=key_xxxxx  # お客様ごとのAPIキー

# テナント別のLINE設定
LINE_CHANNEL_ACCESS_TOKEN=xxxxx  # お客様ごとのLINEトークン
LINE_USER_ID=Uxxxxx  # お客様ごとのLINE送信先
```

### Step 2: テナント設定ファイル作成（1時間）

```typescript
// config/tenant.config.ts
export const getTenantConfig = () => ({
  id: process.env.TENANT_ID || 'default',
  name: process.env.TENANT_NAME || 'Default Company',
  logo: process.env.TENANT_LOGO_URL || '/logo.png',
  primaryColor: process.env.TENANT_PRIMARY_COLOR || '#00B900',
  features: {
    aiSummary: process.env.ENABLE_AI_SUMMARY !== 'false',
    lineNotification: process.env.ENABLE_LINE !== 'false',
    gptAnalysis: process.env.ENABLE_GPT !== 'false'
  }
});
```

### Step 3: UIのブランディング対応（2時間）

```typescript
// components/header.tsx
import { getTenantConfig } from '@/config/tenant.config';

export function Header() {
  const tenant = getTenantConfig();
  
  return (
    <header style={{ backgroundColor: tenant.primaryColor }}>
      <img src={tenant.logo} alt={tenant.name} />
      <h1>{tenant.name} - 通話管理システム</h1>
    </header>
  );
}
```

### Step 4: Vercelでお客様ごとにデプロイ

#### 4.1 プロジェクトを複製
```bash
# GitHub上でリポジトリをフォーク or 複製
# または同じリポジトリを別名でVercelにデプロイ
```

#### 4.2 各お客様用のVercelプロジェクト作成

**お客様A用：**
- URL: `https://company-a-retell.vercel.app`
- 環境変数：
  ```
  TENANT_ID=company-a
  TENANT_NAME=株式会社A
  RETELL_API_KEY=お客様AのAPIキー
  LINE_USER_ID=お客様AのLINE ID
  ```

**お客様B用：**
- URL: `https://company-b-retell.vercel.app`
- 環境変数：
  ```
  TENANT_ID=company-b
  TENANT_NAME=株式会社B
  RETELL_API_KEY=お客様BのAPIキー
  LINE_USER_ID=お客様BのLINE ID
  ```

## 実装ファイル一覧

### 1. テナント設定（新規作成）
```typescript
// config/tenant.config.ts
interface TenantConfig {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor?: string;
  features: {
    aiSummary: boolean;
    lineNotification: boolean;
    gptAnalysis: boolean;
  };
  retell: {
    apiKey: string;
    agentId?: string;
  };
  line?: {
    accessToken: string;
    userId: string;
  };
}

export const getTenantConfig = (): TenantConfig => {
  return {
    id: process.env.TENANT_ID || 'default',
    name: process.env.TENANT_NAME || 'Default Company',
    logo: process.env.TENANT_LOGO_URL || '/logo.png',
    primaryColor: process.env.TENANT_PRIMARY_COLOR || '#00B900',
    secondaryColor: process.env.TENANT_SECONDARY_COLOR,
    features: {
      aiSummary: process.env.ENABLE_AI_SUMMARY !== 'false',
      lineNotification: process.env.ENABLE_LINE !== 'false',
      gptAnalysis: process.env.ENABLE_GPT !== 'false'
    },
    retell: {
      apiKey: process.env.RETELL_API_KEY!,
      agentId: process.env.RETELL_AGENT_ID
    },
    line: process.env.LINE_CHANNEL_ACCESS_TOKEN ? {
      accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      userId: process.env.LINE_USER_ID || ''
    } : undefined
  };
};
```

### 2. 各APIファイルの修正

通話履歴にテナントIDを含める：
```typescript
// app/api/calls/route.ts の修正
import { getTenantConfig } from '@/config/tenant.config';

export async function GET(request: NextRequest) {
  const tenant = getTenantConfig();
  
  // Retell APIを使う際にテナント別のAPIキーを使用
  const retellClient = new Retell({ 
    apiKey: tenant.retell.apiKey 
  });
  
  // 通話データを取得...
}
```

### 3. UI更新（ブランディング）

```typescript
// app/layout.tsx の修正
import { getTenantConfig } from '@/config/tenant.config';

export default function RootLayout({ children }) {
  const tenant = getTenantConfig();
  
  return (
    <html>
      <head>
        <title>{tenant.name} - ダッシュボード</title>
        <style>{`
          :root {
            --primary-color: ${tenant.primaryColor};
            --secondary-color: ${tenant.secondaryColor || '#f0f0f0'};
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
```

## セットアップ手順

### お客様A用のセットアップ

1. **Vercelで新規プロジェクト作成**
   ```
   プロジェクト名: retell-dashboard-company-a
   ```

2. **環境変数設定**
   ```
   TENANT_ID=company-a
   TENANT_NAME=株式会社A
   TENANT_PRIMARY_COLOR=#FF6B6B
   
   RETELL_API_KEY=key_aaaaaa
   OPENAI_API_KEY=sk-xxxxx
   
   LINE_CHANNEL_ACCESS_TOKEN=xxxxx
   LINE_USER_ID=Uxxxxx
   
   NEXT_PUBLIC_APP_URL=https://retell-dashboard-company-a.vercel.app
   ```

3. **デプロイ**
   ```bash
   vercel --prod
   ```

### お客様B用のセットアップ

同様の手順で別プロジェクトとして作成

## メリット

✅ **最速実装**：1-2日で完了
✅ **完全分離**：お客様間でデータが混在しない
✅ **個別カスタマイズ**：お客様ごとに異なる機能を提供可能
✅ **独立メンテナンス**：お客様ごとに個別にアップデート可能
✅ **セキュリティ**：物理的に分離されているため安全

## デメリット

❌ 複数プロジェクトの管理が必要
❌ 共通アップデートが手間
❌ お客様が増えるとプロジェクト数が増える

## 将来的な移行

この方式で始めて、後から本格的なマルチテナントシステムに移行することも可能です。

## 実装予定時間

1. テナント設定ファイル作成：30分
2. 環境変数の整理：30分
3. UIのブランディング対応：1時間
4. Vercelプロジェクトセットアップ：30分/お客様

**合計：約2-3時間でお客様1社分が完成**

この方式でよろしければ、すぐに実装を開始できます。