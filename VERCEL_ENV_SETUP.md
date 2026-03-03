# Vercel環境変数設定ガイド

## エラー解決のための最小限の環境変数

Vercelダッシュボードで以下の環境変数を設定してください：

### 設定手順
1. https://vercel.com/dashboard
2. `retell-dashboard`プロジェクトを選択
3. Settings → Environment Variables
4. 以下の変数を追加：

```
TENANT_ID=default
TENANT_NAME=AI受付システム
TENANT_PRIMARY_COLOR=#00B900
ENABLE_AI_SUMMARY=true
ENABLE_LINE=false
ENABLE_GPT=false
ENABLE_VOICE_RECORDING=true
ENABLE_ANALYTICS=true
RETELL_API_KEY=dummy_key_for_testing
NEXT_PUBLIC_APP_URL=https://retell-dashboard-opal.vercel.app
```

### 確認URL
- テストページ: https://retell-dashboard-opal.vercel.app/test
- ログインページ: https://retell-dashboard-opal.vercel.app/login
