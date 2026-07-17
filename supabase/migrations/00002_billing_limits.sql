-- ================================
-- 月額上限・オンボーディング管理
-- ================================

-- monthly_limit: 契約上限金額（円）。NULL = 上限なし
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ DEFAULT NULL;

-- 上限超過で停止済みのテナントを検索しやすくするインデックス
CREATE INDEX IF NOT EXISTS tenants_status_idx ON tenants (status);
