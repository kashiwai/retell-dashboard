-- ================================
-- テナントテーブル
-- ================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- 料金プラン
  plan TEXT NOT NULL DEFAULT 'trial',
  monthly_fee INTEGER NOT NULL DEFAULT 0,
  minute_rate INTEGER NOT NULL DEFAULT 35,
  -- Twilio/Retell払い出し結果
  phone_number TEXT,
  twilio_phone_sid TEXT,
  trunk_sid TEXT,
  agent_id TEXT,
  llm_id TEXT,
  -- LINE設定
  line_access_token TEXT,
  line_user_id TEXT,
  line_channel_secret TEXT,
  -- 機能フラグ
  features JSONB DEFAULT '{"lineNotification":false,"gptAnalysis":true,"voiceRecording":true,"analytics":true}',
  primary_color TEXT DEFAULT '#00B900',
  notes TEXT,
  billing_start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 通話ログテーブル
-- ================================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  retell_call_id TEXT UNIQUE NOT NULL,
  agent_id TEXT,
  start_timestamp BIGINT,
  end_timestamp BIGINT,
  duration_ms INTEGER,
  status TEXT,
  from_number TEXT,
  to_number TEXT,
  transcript TEXT,
  summary TEXT,
  sentiment TEXT,
  fault_code TEXT,
  resolution_status TEXT,
  custom_analysis JSONB,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- テナント-ユーザー紐付けテーブル
-- ================================
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- ================================
-- RLS有効化
-- ================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- テナント読み取り: 自テナントのみ or superadmin
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = tenants.id
    AND tenant_users.user_id = auth.uid()
  )
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'superadmin'
);

-- 通話読み取り: 自テナントのみ or superadmin
CREATE POLICY "calls_select" ON calls FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = calls.tenant_id
    AND tenant_users.user_id = auth.uid()
  )
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'superadmin'
);

-- tenant_users読み取り: 自分のレコードのみ or superadmin
CREATE POLICY "tenant_users_select" ON tenant_users FOR SELECT USING (
  user_id = auth.uid()
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'superadmin'
);

-- ================================
-- updated_at 自動更新トリガー
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
