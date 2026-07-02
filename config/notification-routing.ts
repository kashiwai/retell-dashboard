// 通知・転送ルーティング設定
// エージェント(チャンネル)別 × カテゴリ別に、
//   - 通話終了後の通知先(LINE / Google Chat)
//   - 通話中のリアルタイム転送先電話番号
// を振り分けるための設定。
//
// 秘密情報(Google Chat Webhook URL / LINEトークン・宛先)はコードに直書きせず、
// 環境変数に置いてキー名で参照する。実値は .env.local と Vercel 環境変数に設定する。
//
// 関連: app/api/webhook/retell/route.ts (通知送信), Conversation Flow の transfer_call ノード(転送)

/** カテゴリごとのルート設定 */
export interface CategoryRoute {
  /** 内部キー(post_call分析の category 値と突き合わせる) */
  key: string;
  /** 表示名(通知本文・UI用) */
  label: string;
  /** このカテゴリで人間へ取り次ぐ際のリアルタイム転送先電話番号(E.164推奨: +81...) 未設定なら折り返しのみ */
  transferNumber?: string;
  /** 折り返し担当の案内文(任意) */
  callbackNote?: string;
  /**
   * このカテゴリだけ通知先を上書きしたい場合に指定(任意)。
   * 未指定ならエージェント既定の通知先を使う。
   */
  overrideGoogleChatWebhookEnv?: string;
  overrideLineTargetEnv?: string;
}

/** エージェント(チャンネル)単位の通知設定 */
export interface AgentNotificationConfig {
  agentId: string;
  /** 表示名 */
  name: string;

  // --- LINE (Messaging API) ---
  /**
   * このエージェント専用の LINE チャネルアクセストークンを使う場合の env キー。
   * 未設定なら共通の LINE_CHANNEL_ACCESS_TOKEN を使う。
   */
  lineChannelAccessTokenEnv?: string;
  /**
   * 送信先(userId または groupId)の env キー。
   * 設定あり → push 送信 / 未設定 → broadcast 送信。
   */
  lineTargetEnv?: string;

  // --- Google Chat (Incoming Webhook) ---
  /** Google Chat Webhook URL の env キー(エージェント別に別 Space) */
  googleChatWebhookEnv?: string;

  // --- カテゴリ別ルート ---
  categories: CategoryRoute[];

  /**
   * 通知条件。'always' = 常に通知 / 'urgent-only' = 緊急度が高い時のみ通知。
   * 'urgent-only' でも転送はカテゴリ設定に従い通話中に実行される(通知とは独立)。
   */
  notifyCondition?: 'always' | 'urgent-only';
}

// ============================================================
// エージェント登録
// TODO(要入力): 各 env キーの実値を .env.local / Vercel に設定し、
//              transferNumber をカテゴリごとの実番号に置き換える。
// ============================================================

// マギー受付の共通設定(旧 retell-llm 版と conversation-flow 版で共有)
const MAGGIE_CONFIG: Omit<AgentNotificationConfig, 'agentId'> = {
  name: 'マギー株式会社受付',
  lineChannelAccessTokenEnv: 'LINE_CHANNEL_ACCESS_TOKEN_MAGGIE',
  lineTargetEnv: 'LINE_TARGET_MAGGIE',
  googleChatWebhookEnv: 'GOOGLE_CHAT_WEBHOOK_MAGGIE',
  notifyCondition: 'always',
  categories: [
    {
      key: 'service_inquiry',
      label: 'サービス問い合わせ',
      transferNumber: process.env.TRANSFER_MAGGIE_SERVICE, // TODO: 実番号
      callbackNote: '担当より当日〜翌営業日以内に折り返し',
    },
    {
      key: 'new_intro',
      label: '新規申込/導入相談',
      transferNumber: process.env.TRANSFER_MAGGIE_SALES, // TODO: 実番号
      callbackNote: '営業担当より折り返し',
    },
    {
      key: 'partner',
      label: 'パートナー/提携',
      transferNumber: process.env.TRANSFER_MAGGIE_PARTNER, // TODO: 実番号
    },
    {
      key: 'other',
      label: 'その他',
      transferNumber: process.env.TRANSFER_MAGGIE_OTHER, // TODO: 実番号(未設定なら折り返しのみ)
    },
  ],
};

// PALDATA(ストアメディアサポート窓口)の共通設定
const PALDATA_CONFIG: Omit<AgentNotificationConfig, 'agentId'> = {
  name: 'PALDATA',
  lineChannelAccessTokenEnv: 'LINE_CHANNEL_ACCESS_TOKEN_PALDATA',
  lineTargetEnv: 'LINE_TARGET_PALDATA',
  googleChatWebhookEnv: 'GOOGLE_CHAT_WEBHOOK_PALDATA',
  notifyCondition: 'always',
  categories: [
    {
      key: 'fault',
      label: '障害/故障',
      // 転送先(緊急時)はフロー内でフェイルオーバー実装(+818098524950→+818059323321)
      callbackNote: 'サポート担当より折り返し',
    },
    {
      key: 'other',
      label: 'その他',
    },
  ],
};

// sales agent call(アウトバウンド営業)の設定 — 専用 LINE / Google Chat
const SALES_CONFIG: Omit<AgentNotificationConfig, 'agentId'> = {
  name: 'sales agent call',
  lineChannelAccessTokenEnv: 'LINE_CHANNEL_ACCESS_TOKEN_SALES',
  lineTargetEnv: 'LINE_TARGET_SALES',
  googleChatWebhookEnv: 'GOOGLE_CHAT_WEBHOOK_SALES',
  notifyCondition: 'always',
  categories: [
    { key: 'other', label: '営業結果' },
  ],
};

// MIKATA 着信受付AI(インバウンド受付) — sales と同じ通知チャンネル(LINE/Google Chat)・同じ人間転送先を共用
const MIKATA_CONFIG: Omit<AgentNotificationConfig, 'agentId'> = {
  name: 'MIKATA 着信受付AI',
  lineChannelAccessTokenEnv: 'LINE_CHANNEL_ACCESS_TOKEN_SALES',
  lineTargetEnv: 'LINE_TARGET_SALES',
  googleChatWebhookEnv: 'GOOGLE_CHAT_WEBHOOK_SALES',
  notifyCondition: 'always',
  categories: [
    {
      key: 'other',
      label: 'MIKATA着信対応',
      // 人間へ取り次ぐ場合はフロー内でウォーム転送(+817085533638)
      callbackNote: '担当より当日〜翌営業日以内に折り返し',
    },
  ],
};

export const AGENT_NOTIFICATION_CONFIGS: Record<string, AgentNotificationConfig> = {
  // ---- sales agent call (conversation-flow 版・アウトバウンド営業) ----
  agent_86a3a9c7c4ada00cabb893ec58: {
    agentId: 'agent_86a3a9c7c4ada00cabb893ec58',
    ...SALES_CONFIG,
  },
  // ---- マギー株式会社受付 (旧 retell-llm 版) ----
  agent_3b2d89cc1da56ffc8892987b29: {
    agentId: 'agent_3b2d89cc1da56ffc8892987b29',
    ...MAGGIE_CONFIG,
  },
  // ---- マギー株式会社受付 (conversation-flow 版・音声分岐) ----
  agent_f2715168941b2b278885ee92f1: {
    agentId: 'agent_f2715168941b2b278885ee92f1',
    ...MAGGIE_CONFIG,
  },

  // ---- PALDATA (旧 retell-llm 版) ----
  agent_f7dad062d3b9482baa69adf35e: {
    agentId: 'agent_f7dad062d3b9482baa69adf35e',
    ...PALDATA_CONFIG,
  },
  // ---- PALDATA (conversation-flow 版・音声分岐) ----
  agent_b324ed2cf049a37d90dd532854: {
    agentId: 'agent_b324ed2cf049a37d90dd532854',
    ...PALDATA_CONFIG,
  },

  // ---- MIKATA 着信受付AI (conversation-flow 版・インバウンド受付) ----
  agent_bc62fad9ee1b47b6a7ed0a988a: {
    agentId: 'agent_bc62fad9ee1b47b6a7ed0a988a',
    ...MIKATA_CONFIG,
  },
};

/** agent_id からエージェント通知設定を取得(未登録なら null) */
export function getAgentNotificationConfig(
  agentId: string | null | undefined
): AgentNotificationConfig | null {
  if (!agentId) return null;
  return AGENT_NOTIFICATION_CONFIGS[agentId] ?? null;
}

/** カテゴリキーからカテゴリルートを取得(見つからなければ 'other' か先頭を返す) */
export function resolveCategoryRoute(
  config: AgentNotificationConfig,
  categoryKey: string | null | undefined
): CategoryRoute | undefined {
  if (categoryKey) {
    const hit = config.categories.find((c) => c.key === categoryKey);
    if (hit) return hit;
  }
  return config.categories.find((c) => c.key === 'other') ?? config.categories[0];
}

/**
 * 通知すべきか判定。
 * notifyCondition が 'urgent-only' の場合は緊急度が高い時のみ true。
 */
export function shouldNotify(
  config: AgentNotificationConfig,
  urgency: string | null | undefined
): boolean {
  if (config.notifyCondition !== 'urgent-only') return true;
  const u = (urgency ?? '').toString();
  return u.includes('高') || u.toLowerCase() === 'high' || u.includes('緊急');
}
