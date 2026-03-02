// 電話番号ベースのテナント管理設定
// 1つのRetell AIアカウントで複数のお客様を管理

export interface PhoneTenantConfig {
  tenantId: string;
  name: string;
  agentId?: string;
  primaryColor: string;
  secondaryColor?: string;
  logo?: string;
  lineUserId?: string;
  features: {
    lineNotification: boolean;
    gptAnalysis: boolean;
    voiceRecording: boolean;
  };
}

// 環境変数から電話番号マッピングを取得
export function getPhoneTenantMapping(): Record<string, PhoneTenantConfig> {
  try {
    const mappingJson = process.env.TENANT_PHONE_MAPPING;
    if (!mappingJson) {
      return getDefaultMapping();
    }
    
    const mappingArray = JSON.parse(mappingJson);
    const mapping: Record<string, PhoneTenantConfig> = {};
    
    mappingArray.forEach((item: any) => {
      const normalizedPhone = normalizePhoneNumber(item.phone);
      mapping[normalizedPhone] = {
        tenantId: item.tenantId,
        name: item.name,
        agentId: item.agentId,
        primaryColor: item.color || '#00B900',
        secondaryColor: item.secondaryColor,
        logo: item.logo,
        lineUserId: item.lineUserId,
        features: {
          lineNotification: item.features?.line !== false,
          gptAnalysis: item.features?.gpt !== false,
          voiceRecording: item.features?.recording !== false
        }
      };
    });
    
    return mapping;
  } catch (error) {
    console.error('Failed to parse TENANT_PHONE_MAPPING:', error);
    return getDefaultMapping();
  }
}

// デフォルトのマッピング（環境変数が設定されていない場合）
function getDefaultMapping(): Record<string, PhoneTenantConfig> {
  return {
    // デフォルト設定（電話番号が不明な場合に使用）
    'default': {
      tenantId: 'default',
      name: process.env.DEFAULT_TENANT_NAME || 'AI受付システム',
      primaryColor: process.env.DEFAULT_TENANT_COLOR || '#00B900',
      features: {
        lineNotification: true,
        gptAnalysis: true,
        voiceRecording: true
      }
    }
  };
}

// 電話番号を正規化（+81を0に変換、ハイフン除去など）
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return 'default';
  
  return phone
    .replace(/^\+81/, '0')      // +81を0に変換
    .replace(/^81/, '0')         // 81を0に変換
    .replace(/-/g, '')           // ハイフン除去
    .replace(/\s/g, '')          // スペース除去
    .replace(/[()]/g, '');       // 括弧除去
}

// 電話番号からテナント設定を取得
export function getTenantByPhoneNumber(phoneNumber: string | null | undefined): PhoneTenantConfig {
  const mapping = getPhoneTenantMapping();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  // 電話番号に対応するテナントを検索
  const tenant = mapping[normalizedPhone];
  
  if (!tenant) {
    // デフォルトテナントを返す
    return mapping['default'] || {
      tenantId: 'default',
      name: 'AI受付システム',
      primaryColor: '#00B900',
      features: {
        lineNotification: true,
        gptAnalysis: true,
        voiceRecording: true
      }
    };
  }
  
  return tenant;
}

// エージェントIDから電話番号を逆引き
export function getPhoneNumberByAgentId(agentId: string): string | null {
  const mapping = getPhoneTenantMapping();
  
  for (const [phone, config] of Object.entries(mapping)) {
    if (config.agentId === agentId) {
      return phone;
    }
  }
  
  return null;
}

// 全てのテナント設定を取得
export function getAllTenants(): PhoneTenantConfig[] {
  const mapping = getPhoneTenantMapping();
  return Object.values(mapping);
}

// テナントIDから設定を取得
export function getTenantById(tenantId: string): PhoneTenantConfig | null {
  const mapping = getPhoneTenantMapping();
  
  for (const config of Object.values(mapping)) {
    if (config.tenantId === tenantId) {
      return config;
    }
  }
  
  return null;
}