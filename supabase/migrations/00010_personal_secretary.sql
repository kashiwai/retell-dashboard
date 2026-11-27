-- ================================
-- 個人受電代行サービス(汎用テンプレート型秘書AI)
-- ================================
CREATE TABLE IF NOT EXISTS personal_secretary_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 依頼主ごとのカスタム応答内容
  owner_name      TEXT NOT NULL,
  absence_reason  TEXT NOT NULL,
  callback_plan   TEXT NOT NULL,

  -- 着信ルーティング(to_number でこの行を引く)
  dedicated_phone_number TEXT UNIQUE,
  twilio_phone_sid       TEXT,
  trunk_sid               TEXT,
  forwarding_source_number TEXT,

  -- LINE通知(共有Bot、依頼主ごとの送信先のみ違う)
  line_user_id     TEXT,
  line_link_code   TEXT UNIQUE,
  line_linked_at   TIMESTAMPTZ,

  contact_email TEXT NOT NULL,
  notes TEXT,

  status TEXT NOT NULL DEFAULT 'pending_provisioning',
  -- pending_provisioning -> active -> suspended -> provisioning_failed

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pso_dedicated_phone ON personal_secretary_owners(dedicated_phone_number);

ALTER TABLE personal_secretary_owners ENABLE ROW LEVEL SECURITY;
-- 公開ポリシーなし。全アクセスは service-role の admin client 経由。

DROP TRIGGER IF EXISTS personal_secretary_owners_updated_at ON personal_secretary_owners;
CREATE TRIGGER personal_secretary_owners_updated_at
  BEFORE UPDATE ON personal_secretary_owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================
-- 通話ログ(監査・LINE通知内容の元データ)
-- ================================
CREATE TABLE IF NOT EXISTS personal_secretary_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES personal_secretary_owners(id) ON DELETE CASCADE,
  retell_call_id TEXT UNIQUE NOT NULL,
  from_number TEXT,
  to_number TEXT,
  caller_name TEXT,
  caller_phone TEXT,
  message_reason TEXT,
  urgency TEXT,
  summary TEXT,
  line_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE personal_secretary_calls ENABLE ROW LEVEL SECURITY;
