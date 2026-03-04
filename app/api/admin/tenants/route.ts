import { NextRequest, NextResponse } from 'next/server';
import { getPhoneTenantMapping } from '@/config/phone-tenant-mapping';
import fs from 'fs/promises';
import path from 'path';

// テナント一覧を取得
export async function GET(request: NextRequest) {
  try {
    // 環境変数から現在の設定を取得
    const mapping = getPhoneTenantMapping();
    
    if (!mapping || Object.keys(mapping).length === 0) {
      console.log('No tenant mapping found, returning empty array');
      return NextResponse.json([]);
    }
    
    // 電話番号をキーとしたマッピングをテナント配列に変換
    const tenants = Object.entries(mapping)
      .filter(([phone]) => phone !== 'default')
      .map(([phone, config]) => ({
        tenantId: config.tenantId || '',
        name: config.name || '',
        phoneNumber: phone || '',
        agentId: config.agentId || '',
        primaryColor: config.primaryColor || '#00B900',
        lineUserId: config.lineUserId || '',
        features: {
          line: config.features?.lineNotification ?? true,
          gpt: config.features?.gptAnalysis ?? true,
          recording: config.features?.voiceRecording ?? true
        }
      }))
      .filter(t => t.phoneNumber && t.tenantId); // 有効なテナントのみ
    
    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 新規テナント追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, name, phoneNumber, agentId, primaryColor, lineUserId, features } = body;
    
    // バリデーション
    if (!tenantId || !name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 現在のマッピングを取得
    const currentMapping = process.env.TENANT_PHONE_MAPPING ? 
      JSON.parse(process.env.TENANT_PHONE_MAPPING) : [];
    
    // 新しいテナントを追加
    const newTenant = {
      phone: phoneNumber,
      tenantId,
      name,
      agentId: agentId || '',
      color: primaryColor || '#00B900',
      lineUserId: lineUserId || '',
      features: {
        line: features?.line !== false,
        gpt: features?.gpt !== false,
        recording: features?.recording !== false
      }
    };
    
    // 重複チェック
    const exists = currentMapping.some((t: any) => 
      t.phone === phoneNumber || t.tenantId === tenantId
    );
    
    if (exists) {
      return NextResponse.json(
        { error: 'Tenant or phone number already exists' },
        { status: 409 }
      );
    }
    
    currentMapping.push(newTenant);
    
    // 環境変数ファイルを更新（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      await updateEnvFile(currentMapping);
    }
    
    return NextResponse.json({
      success: true,
      tenant: newTenant,
      message: '本番環境では、Vercelの環境変数を手動で更新してください'
    });
    
  } catch (error) {
    console.error('Error adding tenant:', error);
    return NextResponse.json(
      { error: 'Failed to add tenant' },
      { status: 500 }
    );
  }
}

// .env.localファイルを更新する関数（開発環境用）
async function updateEnvFile(mapping: any[]) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = await fs.readFile(envPath, 'utf-8');
    
    // TENANT_PHONE_MAPPINGの行を更新
    const mappingJson = JSON.stringify(mapping);
    const newLine = `TENANT_PHONE_MAPPING='${mappingJson}'`;
    
    // 既存の行を置換または追加
    if (envContent.includes('TENANT_PHONE_MAPPING=')) {
      envContent = envContent.replace(
        /TENANT_PHONE_MAPPING=.*$/m,
        newLine
      );
    } else {
      envContent += `\n${newLine}`;
    }
    
    await fs.writeFile(envPath, envContent);
    console.log('Updated .env.local with new tenant mapping');
  } catch (error) {
    console.error('Failed to update .env.local:', error);
  }
}