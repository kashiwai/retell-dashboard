# マルチテナント機能設計書

## 概要
現在のadmin画面を基に、お客様（テナント）ごとに独立したダッシュボードを提供する機能の実装設計です。

## 実装方式の選択肢

### 1. URLパスベース方式（推奨）
```
https://your-domain.com/[tenant-id]/dashboard
例：
- https://your-domain.com/company-a/dashboard
- https://your-domain.com/company-b/dashboard
```

**メリット：**
- 実装が簡単
- URL見て判別しやすい
- Next.js の Dynamic Routes との相性が良い

**デメリット：**
- URLにテナントIDが露出

### 2. サブドメイン方式
```
https://[tenant-id].your-domain.com
例：
- https://company-a.your-domain.com
- https://company-b.your-domain.com
```

**メリット：**
- 完全に独立した印象を与える
- ブランディングしやすい

**デメリット：**
- DNS設定が必要
- SSL証明書の管理が複雑

### 3. ログインベース方式
```
https://your-domain.com/dashboard
（ログイン後、ユーザーの所属組織に基づいて表示を切り替え）
```

**メリット：**
- URL構造がシンプル
- セキュリティが高い

**デメリット：**
- 複数組織への切り替えが面倒

## 推奨実装計画

### Phase 1: 基本的なマルチテナント機能

#### 1.1 データベース設計
```sql
-- テナント（お客様）テーブル
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL, -- URLに使用
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'basic',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ユーザーテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ユーザー・テナント関連テーブル
CREATE TABLE user_tenants (
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  role VARCHAR(50) DEFAULT 'member', -- admin, member, viewer
  PRIMARY KEY (user_id, tenant_id)
);

-- 通話履歴（既存のデータに tenant_id を追加）
ALTER TABLE calls ADD COLUMN tenant_id UUID REFERENCES tenants(id);
```

#### 1.2 フォルダ構造
```
app/
├── (auth)/
│   ├── login/
│   └── signup/
├── [tenant]/              # 動的ルート
│   ├── dashboard/
│   │   └── page.tsx
│   ├── calls/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── layout.tsx         # テナント共通レイアウト
├── admin/                  # スーパーアドミン用
│   ├── tenants/
│   └── users/
└── api/
    ├── auth/
    ├── tenants/
    │   └── [tenantId]/
    │       ├── calls/
    │       └── settings/
    └── webhook/
```

#### 1.3 認証・認可ミドルウェア
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // テナントIDを取得
  const tenantMatch = pathname.match(/^\/([^\/]+)\//);
  const tenantSlug = tenantMatch ? tenantMatch[1] : null;
  
  // 認証チェック
  const session = getSession(request);
  if (!session) {
    return NextResponse.redirect('/login');
  }
  
  // テナントへのアクセス権限チェック
  if (tenantSlug && !hasAccessToTenant(session.userId, tenantSlug)) {
    return NextResponse.redirect('/unauthorized');
  }
  
  // ヘッダーにテナント情報を追加
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantSlug || '');
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

### Phase 2: テナント別カスタマイズ

#### 2.1 カスタマイズ可能な項目
- ロゴ・ブランディング
- カラーテーマ
- 通知設定（LINE、メール、Slack等）
- ダッシュボードのウィジェット表示/非表示
- カスタムフィールド

#### 2.2 設定管理
```typescript
// types/tenant.ts
interface TenantSettings {
  branding: {
    logo?: string;
    primaryColor?: string;
    companyName: string;
  };
  notifications: {
    line?: {
      enabled: boolean;
      channelAccessToken?: string;
      userId?: string;
    };
    email?: {
      enabled: boolean;
      addresses: string[];
    };
  };
  features: {
    aiSummary: boolean;
    voiceRecording: boolean;
    analytics: boolean;
  };
}
```

### Phase 3: Retell AI統合

#### 3.1 テナント別API設定
```typescript
// 各テナントごとのRetell設定
interface TenantRetellConfig {
  apiKey: string;
  agentId?: string;
  webhookUrl: string; // テナント専用のwebhook URL
}
```

#### 3.2 Webhook振り分け
```typescript
// app/api/webhook/retell/route.ts
export async function POST(request: NextRequest) {
  const data = await request.json();
  
  // Retellのwebhook URLに含まれるテナント識別子から振り分け
  const tenantId = extractTenantFromWebhook(request.url);
  
  // テナント別の処理
  await processWebhookForTenant(tenantId, data);
}
```

## 実装順序

1. **基本的な認証機能の実装**
   - ログイン/サインアップ画面
   - JWT or セッション管理
   - Supabase Auth または NextAuth.js

2. **テナント管理機能**
   - テナント作成・編集
   - ユーザー招待機能
   - 権限管理

3. **既存機能のマルチテナント対応**
   - 通話履歴のフィルタリング
   - 通知設定の分離
   - APIエンドポイントの改修

4. **カスタマイズ機能**
   - テーマ設定
   - ブランディング
   - 機能のオン/オフ

## セキュリティ考慮事項

- テナント間のデータ分離を徹底
- Row Level Security (RLS) の活用
- APIレートリミット（テナント別）
- 監査ログ

## 必要な環境変数の追加

```env
# Supabase (データベース・認証用)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 認証
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# マルチテナント設定
ENABLE_MULTI_TENANT=true
DEFAULT_TENANT_SLUG=default
```

## 移行計画

1. 現在のシングルテナント版を残しながら並行開発
2. 既存データを default テナントに移行
3. 段階的に新機能を追加
4. 十分なテスト後に完全移行

## 概算工数

- Phase 1（基本機能）: 2-3週間
- Phase 2（カスタマイズ）: 1-2週間  
- Phase 3（Retell統合）: 1週間
- テスト・デバッグ: 1週間

合計: 5-7週間

## 次のステップ

1. どの実装方式を採用するか決定
2. データベース（Supabase等）のセットアップ
3. 認証機能の実装から開始

この設計で進めてよろしいでしょうか？