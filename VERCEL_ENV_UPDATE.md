# Vercel環境変数アップデートガイド

## 🔴 重要な変更
TWILIO_PHONE_NUMBER環境変数は**使用されなくなりました**。
すべての電話番号設定は`TENANT_PHONE_MAPPING`で管理されます。

## 📝 Vercelで更新が必要な環境変数

### 1. TENANT_PHONE_MAPPING（必須）
複数の電話番号とテナント設定を含むJSON配列：

```json
[
  {
    "phone": "+815018080215",
    "tenantId": "company-a",
    "name": "既存顧客A",
    "agentId": "agent_ac38f3f9f6b0124f0c445cd752",
    "color": "#FF6B6B",
    "features": {
      "line": true,
      "gpt": true
    }
  },
  {
    "phone": "+815018075642",
    "tenantId": "company-b",
    "name": "新規顧客B（PALDATA）",
    "agentId": "agent_f7dad062d3b9482baa69adf35e",
    "color": "#00B900",
    "features": {
      "line": true,
      "gpt": true
    }
  }
]
```

## 🚀 Vercel設定手順

1. **Vercelダッシュボードにログイン**
   ```
   https://vercel.com/dashboard
   ```

2. **プロジェクト設定へ移動**
   - `retell-dashboard`プロジェクトを選択
   - Settings → Environment Variables

3. **新しい環境変数を追加**
   - Key: `TENANT_PHONE_MAPPING`
   - Value: 上記のJSON（1行で入力）
   ```
   [{"phone":"+815018080215","tenantId":"company-a","name":"既存顧客A","agentId":"agent_ac38f3f9f6b0124f0c445cd752","color":"#FF6B6B","features":{"line":true,"gpt":true}},{"phone":"+815018075642","tenantId":"company-b","name":"新規顧客B（PALDATA）","agentId":"agent_f7dad062d3b9482baa69adf35e","color":"#00B900","features":{"line":true,"gpt":true}}]
   ```

4. **既存の環境変数を確認**
   以下の環境変数が設定されていることを確認：
   - `RETELL_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `OPENAI_API_KEY`
   - `DATABASE_URL`
   - `AUTH_SECRET`

5. **再デプロイ**
   ```bash
   # ローカルから
   git add .
   git commit -m "feat: support multiple phone numbers via TENANT_PHONE_MAPPING"
   git push origin main
   ```

## ✅ 動作確認

デプロイ後、以下を確認：

1. **電話番号一覧**
   - https://retell-dashboard-opal.vercel.app/
   - 両方の電話番号が表示される

2. **テナントセレクター**
   - ヘッダーのドロップダウンで両方のテナントが選択可能

3. **管理画面**
   - https://retell-dashboard-opal.vercel.app/admin/tenants
   - 両方のテナント情報が表示される

## 🎯 メリット

- ✅ **複数電話番号対応**: 2つ以上の電話番号を管理可能
- ✅ **テナント別管理**: 各電話番号を異なる顧客に紐付け
- ✅ **柔軟な設定**: 各テナントごとに機能のON/OFF可能
- ✅ **スケーラブル**: 新しい電話番号の追加が簡単

## ⚠️ 注意事項

- `TWILIO_PHONE_NUMBER`環境変数は削除しても問題ありません
- すべての電話番号設定は`TENANT_PHONE_MAPPING`で管理されます
- JSONフォーマットが正しいことを確認してください（Vercelは検証しません）