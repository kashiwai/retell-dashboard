-- AKINAI ロ方式 v0.2: 入口3系統(OB/IB/CB)・本人認証・エスカレーション証跡
ALTER TABLE akinai_sessions
  ADD COLUMN IF NOT EXISTS entry_point TEXT CHECK (entry_point IN ('OB', 'IB', 'CB')),
  ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('outbound', 'inbound')),
  ADD COLUMN IF NOT EXISTS auth_method TEXT,          -- outbound_callee | caller_id+knowledge | magic_link
  ADD COLUMN IF NOT EXISTS auth_result TEXT,          -- success | failed
  ADD COLUMN IF NOT EXISTS auth_attempts INT,
  ADD COLUMN IF NOT EXISTS authenticated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS caller_number_match BOOLEAN,
  ADD COLUMN IF NOT EXISTS inbound_intent TEXT,       -- renewal | appointment | accident | other
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,    -- accident | auth_failed | other | customer_request
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_result TEXT,
  ADD COLUMN IF NOT EXISTS appointment_changed_to TEXT; -- IB5 予約変更
