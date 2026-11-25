// 通話イベントの通知(LINE Messaging API / Google Chat Incoming Webhook)の共通処理。
// Retell・Fish Audioなど、どの電話AI会社から来たイベントでも、この関数に渡す前に
// 同じ形(下記 NormalizedCall)に変換してから使う。
import {
  getAgentNotificationConfig,
  resolveCategoryRoute,
  shouldNotify,
  type AgentNotificationConfig,
} from '@/config/notification-routing';

export interface NormalizedCall {
  call_id?: string;
  agent_id?: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number | null;
  end_timestamp?: number | null;
  transcript?: string;
  recording_url?: string | null;
  call_analysis?: {
    call_summary?: string;
    summary?: string;
    user_sentiment?: string;
    sentiment?: string;
    custom_analysis_data?: Record<string, unknown>;
  };
}

/**
 * agent_id ベースで通知を振り分ける中核ディスパッチャ。
 * - notification-routing.ts に設定があれば、エージェント別の LINE 宛先 / Google Chat へ送信
 * - 設定が無ければ従来どおり共通 LINE_CHANNEL_ACCESS_TOKEN で broadcast(後方互換)
 * - 通知条件(urgent-only)にも対応
 */
export async function dispatchNotifications(call: NormalizedCall, isAnalysis: boolean) {
  try {
    const config = getAgentNotificationConfig(call?.agent_id);
    const customAnalysis = call?.call_analysis?.custom_analysis_data || {};
    const urgency = (customAnalysis as Record<string, unknown>).urgency as string | undefined;

    if (config && !shouldNotify(config, urgency)) {
      console.log(`[notify] skipped by condition (urgent-only) for agent ${call.agent_id}`);
      return;
    }

    // --- LINE Messaging API ---
    const lineToken = config?.lineChannelAccessTokenEnv
      ? process.env[config.lineChannelAccessTokenEnv]
      : process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const lineTarget = config?.lineTargetEnv
      ? process.env[config.lineTargetEnv]
      : process.env.LINE_USER_ID;

    if (lineToken) {
      await sendLineMessagingNotification(call, isAnalysis, lineToken, lineTarget);
      console.log(`[notify] LINE sent (${lineTarget ? 'push' : 'broadcast'}) for call ${call.call_id}`);
    } else {
      console.log('[notify] no LINE token configured');
    }

    // --- Google Chat (Incoming Webhook) ---
    const chatUrl = resolveGoogleChatWebhook(config, customAnalysis.category as string | undefined);
    if (chatUrl) {
      await sendGoogleChatNotification(call, isAnalysis, config, chatUrl);
      console.log(`[notify] Google Chat sent for call ${call.call_id}`);
    }
  } catch (error) {
    console.error('[notify] dispatch failed:', error);
  }
}

/** カテゴリ上書き → エージェント既定 の順で Google Chat Webhook URL を解決 */
function resolveGoogleChatWebhook(
  config: AgentNotificationConfig | null,
  categoryKey: string | null | undefined
): string | undefined {
  if (!config) return undefined;
  const route = resolveCategoryRoute(config, categoryKey);
  if (route?.overrideGoogleChatWebhookEnv && process.env[route.overrideGoogleChatWebhookEnv]) {
    return process.env[route.overrideGoogleChatWebhookEnv];
  }
  return config.googleChatWebhookEnv ? process.env[config.googleChatWebhookEnv] : undefined;
}

// Send notification via LINE Messaging API
// token / userId はエージェント別設定から渡す(未指定なら送信先なし=broadcast)
async function sendLineMessagingNotification(
  call: NormalizedCall,
  isAnalysis: boolean,
  token: string,
  userId?: string
) {
  if (!token) return;

  const message = isAnalysis ? formatAnalyzedMessageRich(call) : formatCallEndedMessageRich(call);

  // Use broadcast if no specific user ID, otherwise use push
  const endpoint = userId
    ? 'https://api.line.me/v2/bot/message/push'
    : 'https://api.line.me/v2/bot/message/broadcast';

  const requestBody = userId
    ? { to: userId, messages: [message] }
    : { messages: [message] };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LINE Messaging API error:', error);
  } else {
    console.log(`LINE notification sent successfully via ${userId ? 'push' : 'broadcast'} API`);
  }
}

function formatCallEndedMessageRich(call: NormalizedCall): any {
  const duration = call.end_timestamp && call.start_timestamp
    ? Math.floor((call.end_timestamp - call.start_timestamp) / 1000)
    : 0;

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return {
    type: 'flex',
    altText: '新着通話が完了しました',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📞 新着通話', size: 'xl', weight: 'bold', color: '#FFFFFF' }
        ],
        backgroundColor: '#00B900',
        paddingAll: '15px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '通話が完了しました', size: 'lg', weight: 'bold', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '📱 発信者', size: 'sm', color: '#888888', flex: 0 },
              { type: 'text', text: call.from_number || '不明', size: 'sm', flex: 1, align: 'end' }
            ],
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '⏱️ 通話時間', size: 'sm', color: '#888888', flex: 0 },
              { type: 'text', text: `${minutes}分${seconds}秒`, size: 'sm', flex: 1, align: 'end' }
            ],
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '📅 日時', size: 'sm', color: '#888888', flex: 0 },
              {
                type: 'text',
                text: new Date(call.start_timestamp || Date.now()).toLocaleString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                size: 'sm',
                flex: 1,
                align: 'end'
              }
            ],
            margin: 'md'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '分析完了後、詳細情報をお送りします', size: 'xs', color: '#888888', align: 'center' }
        ],
        paddingAll: '10px'
      }
    }
  };
}

function formatAnalyzedMessageRich(call: NormalizedCall): any {
  const analysis = call.call_analysis || {};
  const custom = (analysis.custom_analysis_data || {}) as Record<string, string | undefined>;

  const company = custom.company || '（確認できず）';
  const phone = custom.phone_number || call.from_number || '（不明）';
  const summary = analysis.call_summary || analysis.summary || custom.requirement || '（要約なし）';
  const disposition = custom.disposition || '（未分類）';

  const kv = (label: string, value: string) => ({
    type: 'box' as const,
    layout: 'horizontal' as const,
    contents: [
      { type: 'text' as const, text: label, size: 'sm' as const, color: '#888888', flex: 2 },
      { type: 'text' as const, text: value, size: 'sm' as const, flex: 3, align: 'end' as const, wrap: true }
    ],
    margin: 'md' as const
  });

  const rows: any[] = [
    kv('🏢 会社名', company),
    kv('📱 電話番号', phone),
    kv('🔁 対応区分', disposition)
  ];
  if (custom.customer_name) rows.push(kv('👤 お客様', custom.customer_name));
  if (custom.category) rows.push(kv('🗂 カテゴリ', custom.category));
  if (custom.urgency) rows.push(kv('⚡ 緊急度', custom.urgency));
  if (custom.fault_code) rows.push(kv('🛠 故障コード', custom.fault_code));
  if (custom.customer_verbatim) rows.push(kv('🗣 お客様の言葉', custom.customer_verbatim));

  return {
    type: 'flex',
    altText: `通話通知｜${company}／${phone}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: '📊 通話内容のお知らせ', size: 'xl', weight: 'bold', color: '#FFFFFF' }],
        backgroundColor: '#0084FF',
        paddingAll: '15px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📝 内容サマリー', size: 'sm', color: '#888888' },
          { type: 'text', text: summary, size: 'sm', wrap: true, margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          ...rows
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          ...(call.call_id ? [{
            type: 'button' as const,
            action: { type: 'uri' as const, label: '🎧 録音を再生', uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me'}/api/recording/${call.call_id}` },
            style: 'primary' as const,
            color: '#00B900'
          }] : []),
          {
            type: 'button',
            action: { type: 'uri', label: 'ダッシュボードで確認', uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me'}/dashboard/calls` },
            style: 'secondary'
          }
        ],
        spacing: 'sm',
        paddingAll: '10px'
      }
    }
  };
}

// Send notification via Google Chat Incoming Webhook
async function sendGoogleChatNotification(
  call: NormalizedCall,
  isAnalysis: boolean,
  config: AgentNotificationConfig | null,
  webhookUrl: string
) {
  const message = formatGoogleChatCard(call, isAnalysis, config);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(message)
  });
  if (!response.ok) {
    const err = await response.text();
    console.error('Google Chat webhook error:', response.status, err);
  }
}

function formatGoogleChatCard(
  call: NormalizedCall,
  isAnalysis: boolean,
  config: AgentNotificationConfig | null
): any {
  const analysis = call.call_analysis || {};
  const custom = (analysis.custom_analysis_data || {}) as Record<string, string | undefined>;

  const duration =
    call.end_timestamp && call.start_timestamp
      ? Math.floor((call.end_timestamp - call.start_timestamp) / 1000)
      : 0;
  const durationText = `${Math.floor(duration / 60)}分${duration % 60}秒`;

  const categoryRoute =
    config && custom.category
      ? config.categories.find((c) => c.key === custom.category)
      : undefined;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me'}/dashboard/calls`;

  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: unknown) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      rows.push({ label, value: `${value}` });
    }
  };
  const summaryText = analysis.summary || analysis.call_summary || custom.requirement || '（要約なし）';
  push('🏢 会社名', custom.company || '（確認できず）');
  push('📱 電話番号', custom.phone_number || call.from_number || '（不明）');
  push('🔁 対応区分', custom.disposition || '（未分類）');
  push('👤 お客様', custom.customer_name);
  push('🗂 カテゴリ', categoryRoute?.label ?? custom.category);
  push('対象サービス', custom.service);
  push('⚡ 緊急度', custom.urgency);
  push('🛠 故障コード', custom.fault_code);
  push('🗣 お客様の言葉', custom.customer_verbatim);
  push('通話時間', durationText);
  if (categoryRoute?.callbackNote) push('担当', categoryRoute.callbackNote);

  const decoratedWidgets = rows.map((r) => ({
    decoratedText: { topLabel: r.label, text: r.value, wrapText: true }
  }));

  const title = isAnalysis
    ? `📊 通話分析完了${config ? `｜${config.name}` : ''}`
    : `📞 新着通話${config ? `｜${config.name}` : ''}`;

  const sections: any[] = [];
  sections.push({
    header: '📝 内容サマリー',
    widgets: [{ textParagraph: { text: summaryText } }]
  });
  sections.push({ widgets: decoratedWidgets.length ? decoratedWidgets : [{ textParagraph: { text: '詳細情報はダッシュボードでご確認ください。' } }] });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me';
  const buttons: any[] = [];
  if (call.call_id) {
    buttons.push({ text: '🎧 録音を再生', onClick: { openLink: { url: `${appUrl}/api/recording/${call.call_id}` } } });
  }
  buttons.push({ text: 'ダッシュボードで確認', onClick: { openLink: { url: dashboardUrl } } });
  sections.push({ widgets: [{ buttonList: { buttons } }] });

  return {
    text: `${title}｜${custom.customer_name || call.from_number || '不明'}`,
    cardsV2: [
      {
        cardId: `call-${call.call_id || 'unknown'}`,
        card: {
          header: {
            title,
            subtitle: `通話ID: ${call.call_id || '不明'}`
          },
          sections
        }
      }
    ]
  };
}
