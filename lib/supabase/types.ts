export interface Tenant {
  id: string
  company_name: string
  contact_person: string
  email: string
  status: 'pending' | 'provisioning' | 'active' | 'suspended' | 'terminated'
  plan: 'trial' | 'basic' | 'pro' | 'enterprise'
  monthly_fee: number
  minute_rate: number
  phone_number: string | null
  twilio_phone_sid: string | null
  trunk_sid: string | null
  agent_id: string | null
  llm_id: string | null
  line_access_token: string | null
  line_user_id: string | null
  line_channel_secret: string | null
  features: {
    lineNotification: boolean
    gptAnalysis: boolean
    voiceRecording: boolean
    analytics: boolean
  }
  primary_color: string
  notes: string | null
  billing_start_date: string | null
  created_at: string
  updated_at: string
}

export interface Call {
  id: string
  tenant_id: string
  retell_call_id: string
  agent_id: string | null
  start_timestamp: number | null
  end_timestamp: number | null
  duration_ms: number | null
  status: string | null
  from_number: string | null
  to_number: string | null
  transcript: string | null
  summary: string | null
  sentiment: string | null
  fault_code: string | null
  resolution_status: string | null
  custom_analysis: Record<string, unknown> | null
  recording_url: string | null
  created_at: string
}

export interface TenantUser {
  id: string
  user_id: string
  tenant_id: string
  role: 'owner' | 'admin'
  created_at: string
}

export const PLAN_LABELS: Record<Tenant['plan'], string> = {
  trial: 'トライアル',
  basic: 'ベーシック',
  pro: 'プロ',
  enterprise: 'エンタープライズ',
}

export const STATUS_LABELS: Record<Tenant['status'], string> = {
  pending: '未発行',
  provisioning: '発行中...',
  active: 'アクティブ',
  suspended: '一時停止',
  terminated: '解約済み',
}

export const STATUS_COLORS: Record<Tenant['status'], string> = {
  pending: 'bg-gray-100 text-gray-700',
  provisioning: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  terminated: 'bg-red-100 text-red-700',
}
