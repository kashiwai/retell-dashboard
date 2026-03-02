// テナント設定管理
interface TenantConfig {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor?: string;
  features: {
    aiSummary: boolean;
    lineNotification: boolean;
    gptAnalysis: boolean;
    voiceRecording: boolean;
    analytics: boolean;
  };
  branding: {
    favicon?: string;
    headerTitle?: string;
    footerText?: string;
  };
  retell: {
    apiKey: string;
    agentId?: string;
  };
  line?: {
    accessToken: string;
    userId?: string;
    channelSecret?: string;
  };
  openai?: {
    apiKey: string;
  };
}

// 環境変数からテナント設定を取得
export const getTenantConfig = (): TenantConfig => {
  return {
    id: process.env.TENANT_ID || 'default',
    name: process.env.TENANT_NAME || 'AI受付システム',
    logo: process.env.TENANT_LOGO_URL || '/logo.png',
    primaryColor: process.env.TENANT_PRIMARY_COLOR || '#00B900',
    secondaryColor: process.env.TENANT_SECONDARY_COLOR || '#f0f0f0',
    features: {
      aiSummary: process.env.ENABLE_AI_SUMMARY !== 'false',
      lineNotification: process.env.ENABLE_LINE !== 'false',
      gptAnalysis: process.env.ENABLE_GPT !== 'false',
      voiceRecording: process.env.ENABLE_VOICE_RECORDING !== 'false',
      analytics: process.env.ENABLE_ANALYTICS !== 'false'
    },
    branding: {
      favicon: process.env.TENANT_FAVICON_URL,
      headerTitle: process.env.TENANT_HEADER_TITLE || `${process.env.TENANT_NAME || 'AI受付'} ダッシュボード`,
      footerText: process.env.TENANT_FOOTER_TEXT || `© ${new Date().getFullYear()} ${process.env.TENANT_NAME || 'AI受付システム'}`
    },
    retell: {
      apiKey: process.env.RETELL_API_KEY || '',
      agentId: process.env.RETELL_AGENT_ID
    },
    line: process.env.LINE_CHANNEL_ACCESS_TOKEN ? {
      accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      userId: process.env.LINE_USER_ID,
      channelSecret: process.env.LINE_CHANNEL_SECRET
    } : undefined,
    openai: process.env.OPENAI_API_KEY ? {
      apiKey: process.env.OPENAI_API_KEY
    } : undefined
  };
};

// テナント設定を検証
export const validateTenantConfig = (config: TenantConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.retell.apiKey) {
    errors.push('Retell API Key is required');
  }

  if (config.features.lineNotification && !config.line?.accessToken) {
    errors.push('LINE Channel Access Token is required when LINE notification is enabled');
  }

  if (config.features.gptAnalysis && !config.openai?.apiKey) {
    errors.push('OpenAI API Key is required when GPT analysis is enabled');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// テナント情報をクライアント用に安全に取得（APIキーを除外）
export const getPublicTenantConfig = () => {
  const config = getTenantConfig();
  return {
    id: config.id,
    name: config.name,
    logo: config.logo,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    features: config.features,
    branding: config.branding
  };
};