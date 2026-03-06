// 段階的テナント管理システム
// ステップ1: アカウント発行（電話番号なし）
// ステップ2: 必要書類の提出
// ステップ3: 電話番号の割り当て
// ステップ4: サービス開始

export enum TenantStatus {
  // アカウント作成済み（電話番号未割当）
  PENDING = 'pending',
  // 書類審査中
  REVIEWING = 'reviewing',
  // 電話番号割当待ち
  AWAITING_PHONE = 'awaiting_phone',
  // アクティブ（電話番号割当済み）
  ACTIVE = 'active',
  // 一時停止
  SUSPENDED = 'suspended',
  // 解約済み
  TERMINATED = 'terminated'
}

export interface TenantDocument {
  id: string;
  name: string;
  type: 'business_license' | 'contract' | 'id_verification' | 'other';
  uploadedAt: Date;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface Tenant {
  // 基本情報
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  
  // ステータス管理
  status: TenantStatus;
  statusHistory: {
    status: TenantStatus;
    changedAt: Date;
    reason?: string;
  }[];
  
  // 電話番号（後から割り当て）
  phoneNumbers?: {
    number: string;
    assignedAt: Date;
    status: 'active' | 'inactive';
  }[];
  
  // Retell AI設定（電話番号割当後）
  agentId?: string;
  
  // 必要書類
  documents: TenantDocument[];
  
  // カスタマイズ設定
  settings: {
    primaryColor: string;
    secondaryColor?: string;
    logo?: string;
    businessHours?: string;
    greetingMessage?: string;
  };
  
  // 機能フラグ
  features: {
    lineNotification: boolean;
    gptAnalysis: boolean;
    voiceRecording: boolean;
    analytics: boolean;
    multiAgent: boolean;
  };
  
  // 料金プラン
  billing: {
    plan: 'trial' | 'basic' | 'pro' | 'enterprise';
    monthlyFee: number;
    minuteRate: number;
    billingStartDate?: Date;
  };
  
  // LINE連携
  lineConfig?: {
    channelId?: string;
    channelSecret?: string;
    accessToken?: string;
    notifyToken?: string;
  };
  
  // メモ・備考
  notes?: string;
}

// テナントサービス
export class TenantService {
  // アカウント作成（電話番号なし）
  static async createAccount(data: {
    companyName: string;
    contactPerson: string;
    email: string;
    plan?: 'trial' | 'basic' | 'pro' | 'enterprise';
  }): Promise<Tenant> {
    const tenant: Tenant = {
      id: generateTenantId(),
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: TenantStatus.PENDING,
      statusHistory: [{
        status: TenantStatus.PENDING,
        changedAt: new Date(),
        reason: 'アカウント作成'
      }],
      documents: [],
      settings: {
        primaryColor: '#00B900'
      },
      features: {
        lineNotification: false,
        gptAnalysis: false,
        voiceRecording: false,
        analytics: false,
        multiAgent: false
      },
      billing: {
        plan: data.plan || 'trial',
        monthlyFee: getPlanMonthlyFee(data.plan || 'trial'),
        minuteRate: getPlanMinuteRate(data.plan || 'trial')
      }
    };
    
    // TODO: データベースに保存
    await saveTenant(tenant);
    
    // ウェルカムメール送信
    await sendWelcomeEmail(tenant);
    
    return tenant;
  }
  
  // 書類アップロード
  static async uploadDocument(
    tenantId: string, 
    document: Omit<TenantDocument, 'id' | 'uploadedAt' | 'status'>
  ): Promise<TenantDocument> {
    const doc: TenantDocument = {
      ...document,
      id: generateDocumentId(),
      uploadedAt: new Date(),
      status: 'pending'
    };
    
    // TODO: テナントに書類を追加
    await addDocumentToTenant(tenantId, doc);
    
    // 全必要書類が揃ったかチェック
    const tenant = await getTenantById(tenantId);
    if (await hasAllRequiredDocuments(tenant)) {
      await updateTenantStatus(tenantId, TenantStatus.REVIEWING);
    }
    
    return doc;
  }
  
  // 電話番号割り当て
  static async assignPhoneNumber(tenantId: string, phoneNumber: string): Promise<void> {
    const tenant = await getTenantById(tenantId);
    
    if (tenant.status !== TenantStatus.AWAITING_PHONE && tenant.status !== TenantStatus.ACTIVE) {
      throw new Error('電話番号を割り当てる前に書類審査を完了してください');
    }
    
    // 電話番号を追加
    if (!tenant.phoneNumbers) {
      tenant.phoneNumbers = [];
    }
    
    tenant.phoneNumbers.push({
      number: phoneNumber,
      assignedAt: new Date(),
      status: 'active'
    });
    
    // ステータスをアクティブに変更
    await updateTenantStatus(tenantId, TenantStatus.ACTIVE);
    
    // Retell AIエージェントの作成
    const agentId = await createRetellAgent(tenant);
    tenant.agentId = agentId;
    
    // Twilioの設定
    await configureTwilioPhoneNumber(phoneNumber, tenant);
    
    await saveTenant(tenant);
  }
  
  // ステータス更新
  static async updateStatus(
    tenantId: string, 
    newStatus: TenantStatus, 
    reason?: string
  ): Promise<void> {
    await updateTenantStatus(tenantId, newStatus, reason);
  }
  
  // 設定更新
  static async updateSettings(
    tenantId: string,
    settings: Partial<Tenant['settings']>
  ): Promise<void> {
    const tenant = await getTenantById(tenantId);
    tenant.settings = { ...tenant.settings, ...settings };
    tenant.updatedAt = new Date();
    await saveTenant(tenant);
  }
  
  // 機能の有効/無効切り替え
  static async updateFeatures(
    tenantId: string,
    features: Partial<Tenant['features']>
  ): Promise<void> {
    const tenant = await getTenantById(tenantId);
    tenant.features = { ...tenant.features, ...features };
    tenant.updatedAt = new Date();
    await saveTenant(tenant);
  }
}

// ヘルパー関数
function generateTenantId(): string {
  return 'tenant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateDocumentId(): string {
  return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getPlanMonthlyFee(plan: string): number {
  const fees: Record<string, number> = {
    trial: 0,
    basic: 9800,
    pro: 29800,
    enterprise: 98000
  };
  return fees[plan] || 0;
}

function getPlanMinuteRate(plan: string): number {
  const rates: Record<string, number> = {
    trial: 35,
    basic: 30,
    pro: 25,
    enterprise: 20
  };
  return rates[plan] || 35;
}

// TODO: 以下の関数は実際のデータベース操作に置き換える
async function saveTenant(tenant: Tenant): Promise<void> {
  // データベースに保存
  console.log('Saving tenant:', tenant);
}

async function getTenantById(tenantId: string): Promise<Tenant> {
  // データベースから取得
  throw new Error('Not implemented');
}

async function addDocumentToTenant(tenantId: string, doc: TenantDocument): Promise<void> {
  // テナントに書類を追加
  console.log('Adding document to tenant:', tenantId, doc);
}

async function hasAllRequiredDocuments(tenant: Tenant): Promise<boolean> {
  // 必要書類が揃っているかチェック
  const requiredTypes = ['business_license', 'contract'];
  const uploadedTypes = tenant.documents.map(d => d.type);
  return requiredTypes.every(type => uploadedTypes.includes(type as any));
}

async function updateTenantStatus(
  tenantId: string, 
  newStatus: TenantStatus, 
  reason?: string
): Promise<void> {
  const tenant = await getTenantById(tenantId);
  tenant.status = newStatus;
  tenant.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    reason
  });
  tenant.updatedAt = new Date();
  await saveTenant(tenant);
}

async function sendWelcomeEmail(tenant: Tenant): Promise<void> {
  // ウェルカムメール送信
  console.log('Sending welcome email to:', tenant.email);
}

async function createRetellAgent(tenant: Tenant): Promise<string> {
  // Retell AIエージェント作成
  console.log('Creating Retell agent for tenant:', tenant.id);
  return 'agent_' + Math.random().toString(36).substr(2, 9);
}

async function configureTwilioPhoneNumber(phoneNumber: string, tenant: Tenant): Promise<void> {
  // Twilio設定
  console.log('Configuring Twilio for:', phoneNumber, tenant.id);
}

export default TenantService;