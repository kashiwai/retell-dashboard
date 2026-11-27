-- ================================
-- テナントごとの電話AI接続先(Retell / Fish Audio)管理
-- ユーザーはtsunagaru(このダッシュボード)側だけで台本(プロンプト)を編集でき、
-- 裏側がどちらの会社かを意識しなくて済むようにするための列。
-- ================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS voice_provider TEXT NOT NULL DEFAULT 'retell',
  ADD COLUMN IF NOT EXISTS fish_agent_id TEXT;

COMMENT ON COLUMN tenants.voice_provider IS '電話AIの接続先。retell または fish_audio。';
COMMENT ON COLUMN tenants.fish_agent_id IS 'voice_providerがfish_audioの場合に使うFish Audio側のagent_id。';
