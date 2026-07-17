-- AKINAI ロ方式 v0.4: SMS 3モード化・特定電子メール法対応(オプトアウト/サプレッション)
ALTER TABLE akinai_sessions
  ADD COLUMN IF NOT EXISTS sms_mode TEXT CHECK (sms_mode IN ('F1-a', 'F1-b', 'F1-c')),
  ADD COLUMN IF NOT EXISTS sms_delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS opt_out_shown BOOLEAN,
  ADD COLUMN IF NOT EXISTS suppression_checked BOOLEAN;

ALTER TABLE akinai_magic_links
  ADD COLUMN IF NOT EXISTS sms_mode TEXT,
  ADD COLUMN IF NOT EXISTS opt_out_requested_at TIMESTAMPTZ;

-- 受信拒否(オプトアウト)サプレッションリスト。送信前照合が必須(照合なし送信は禁止)。
CREATE TABLE IF NOT EXISTS akinai_suppression (
  phone TEXT PRIMARY KEY,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);
ALTER TABLE akinai_suppression ENABLE ROW LEVEL SECURITY;
