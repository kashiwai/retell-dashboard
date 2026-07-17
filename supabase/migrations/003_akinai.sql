-- AKINAI CallCenter ロ方式シナリオ v0.1
-- 証跡(append-only)・セッション集約・マジックリンク

-- 分岐ごとの証跡ログ（Append-Only・施行規則234条の2）
CREATE TABLE IF NOT EXISTS akinai_evidence (
  append_only_seq BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id TEXT NOT NULL,
  customer_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('voice', 'chat')),
  scenario_version TEXT NOT NULL DEFAULT 'v0.1',
  node_id TEXT NOT NULL,
  presented_options JSONB,
  branch_selected TEXT,
  utterance_text TEXT,
  payload JSONB,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_akinai_evidence_call ON akinai_evidence (call_id);

-- append-only 保証: UPDATE / DELETE を禁止
CREATE OR REPLACE FUNCTION akinai_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'akinai_evidence is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS akinai_evidence_immutable ON akinai_evidence;
CREATE TRIGGER akinai_evidence_immutable
  BEFORE UPDATE OR DELETE ON akinai_evidence
  FOR EACH ROW EXECUTE FUNCTION akinai_block_mutation();

-- セッション集約（通話/チャット単位のサマリ・ハッシュ・後確）
CREATE TABLE IF NOT EXISTS akinai_sessions (
  call_id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('voice', 'chat')),
  scenario_version TEXT NOT NULL DEFAULT 'v0.1',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  consent_recording_at TIMESTAMPTZ,
  policy_expiry_date TEXT,
  identity_verified BOOLEAN,
  branch_selected TEXT CHECK (branch_selected IN ('A', 'B', 'C')),
  life_change_flag BOOLEAN,
  option_selected TEXT,
  option_skipped BOOLEAN,
  appointment_at TEXT,
  recording_uri TEXT,
  content_hash TEXT,
  tsa_token TEXT,
  post_confirm_type TEXT CHECK (post_confirm_type IN ('R1', 'R2')),
  post_confirm_mail_sent_at TIMESTAMPTZ,
  sms_sent_at TIMESTAMPTZ,
  link_tapped_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- マジックリンク（F1 SMSフォロー → C1 チャットボット）
CREATE TABLE IF NOT EXISTS akinai_magic_links (
  token TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  policy_expiry_date TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  sms_sent_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

-- RLS 有効化（service_role のみアクセス。クライアント直アクセスは全遮断）
ALTER TABLE akinai_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE akinai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE akinai_magic_links ENABLE ROW LEVEL SECURITY;
