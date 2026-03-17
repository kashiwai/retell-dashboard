import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const PRICING_PLANS = [
  { id: 'trial', name: 'トライアル', monthlyFee: 0, minuteRate: 35 },
  { id: 'basic', name: 'ベーシック', monthlyFee: 9800, minuteRate: 30 },
  { id: 'pro', name: 'プロ', monthlyFee: 29800, minuteRate: 25 },
  { id: 'enterprise', name: 'エンタープライズ', monthlyFee: 98000, minuteRate: 20 },
]

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { company_name, contact_person, email, plan = 'trial', notes } = body

  if (!company_name || !contact_person || !email) {
    return NextResponse.json({ error: '必須項目が不足しています（会社名・担当者・メール）' }, { status: 400 })
  }

  const planConfig = PRICING_PLANS.find(p => p.id === plan) ?? PRICING_PLANS[0]

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .insert({
      company_name,
      contact_person,
      email,
      plan,
      monthly_fee: planConfig.monthlyFee,
      minute_rate: planConfig.minuteRate,
      notes,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
