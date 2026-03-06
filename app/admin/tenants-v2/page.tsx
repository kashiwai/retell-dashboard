'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tenant, TenantStatus } from '@/config/tenant-management';
import Link from 'next/link';

// ステータスの表示用ラベルと色
const statusConfig = {
  [TenantStatus.PENDING]: { label: 'アカウント作成済', color: 'bg-gray-100 text-gray-800' },
  [TenantStatus.REVIEWING]: { label: '書類審査中', color: 'bg-yellow-100 text-yellow-800' },
  [TenantStatus.AWAITING_PHONE]: { label: '電話番号待ち', color: 'bg-blue-100 text-blue-800' },
  [TenantStatus.ACTIVE]: { label: 'アクティブ', color: 'bg-green-100 text-green-800' },
  [TenantStatus.SUSPENDED]: { label: '一時停止', color: 'bg-orange-100 text-orange-800' },
  [TenantStatus.TERMINATED]: { label: '解約済み', color: 'bg-red-100 text-red-800' }
};

// モックデータ（実際はAPIから取得）
const mockTenants: Tenant[] = [
  {
    id: 'tenant_001',
    companyName: '株式会社サンプルA',
    contactPerson: '山田太郎',
    email: 'yamada@sample-a.com',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-06'),
    status: TenantStatus.ACTIVE,
    statusHistory: [],
    phoneNumbers: [{
      number: '+815018080215',
      assignedAt: new Date('2024-03-05'),
      status: 'active'
    }],
    agentId: 'agent_ac38f3f9f6b0124f0c445cd752',
    documents: [],
    settings: { primaryColor: '#FF6B6B' },
    features: {
      lineNotification: true,
      gptAnalysis: true,
      voiceRecording: true,
      analytics: true,
      multiAgent: false
    },
    billing: {
      plan: 'pro',
      monthlyFee: 29800,
      minuteRate: 25,
      billingStartDate: new Date('2024-03-05')
    }
  },
  {
    id: 'tenant_002',
    companyName: 'PALDATA株式会社',
    contactPerson: '佐藤花子',
    email: 'sato@paldata.com',
    createdAt: new Date('2024-03-04'),
    updatedAt: new Date('2024-03-06'),
    status: TenantStatus.REVIEWING,
    statusHistory: [],
    documents: [
      {
        id: 'doc_001',
        name: '事業者登録証明書',
        type: 'business_license',
        uploadedAt: new Date('2024-03-05'),
        url: '#',
        status: 'pending'
      }
    ],
    settings: { primaryColor: '#00B900' },
    features: {
      lineNotification: false,
      gptAnalysis: false,
      voiceRecording: false,
      analytics: false,
      multiAgent: false
    },
    billing: {
      plan: 'basic',
      monthlyFee: 9800,
      minuteRate: 30
    }
  },
  {
    id: 'tenant_003',
    companyName: '新規テスト会社',
    contactPerson: '鈴木一郎',
    email: 'suzuki@test.com',
    createdAt: new Date('2024-03-06'),
    updatedAt: new Date('2024-03-06'),
    status: TenantStatus.PENDING,
    statusHistory: [],
    documents: [],
    settings: { primaryColor: '#00B900' },
    features: {
      lineNotification: false,
      gptAnalysis: false,
      voiceRecording: false,
      analytics: false,
      multiAgent: false
    },
    billing: {
      plan: 'trial',
      monthlyFee: 0,
      minuteRate: 35
    }
  }
];

export default function TenantsV2Page() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filter, setFilter] = useState<TenantStatus | 'all'>('all');

  useEffect(() => {
    // 実際はAPIから取得
    setTenants(mockTenants);
  }, []);

  const filteredTenants = filter === 'all' 
    ? tenants 
    : tenants.filter(t => t.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold">テナント管理 v2</h1>
                <p className="text-sm text-gray-600 mt-1">
                  段階的なアカウント発行システム（電話番号は後から割り当て可能）
                </p>
              </div>
              <Link
                href="/admin/tenants/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                新規テナント登録
              </Link>
            </div>

            {/* フィルター */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
              >
                すべて ({tenants.length})
              </button>
              {Object.values(TenantStatus).map(status => {
                const count = tenants.filter(t => t.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1 rounded text-sm ${
                      filter === status ? 'bg-gray-800 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {statusConfig[status].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* テナント一覧 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    会社名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    プラン
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    電話番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    書類
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tenant.companyName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tenant.contactPerson} / {tenant.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        statusConfig[tenant.status].color
                      }`}>
                        {statusConfig[tenant.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.billing.plan.toUpperCase()}
                      <div className="text-xs text-gray-500">
                        {tenant.billing.monthlyFee > 0 && `¥${tenant.billing.monthlyFee.toLocaleString()}/月`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.phoneNumbers?.length ? (
                        <div>
                          {tenant.phoneNumbers.map(p => (
                            <div key={p.number} className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${
                                p.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                              }`}></span>
                              {p.number}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">未割当</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.documents.length > 0 ? (
                        <span className="text-green-600">
                          {tenant.documents.length}件
                        </span>
                      ) : (
                        <span className="text-gray-400">未提出</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.createdAt.toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/tenants/${tenant.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          詳細
                        </Link>
                        
                        {/* ステータスに応じたアクション */}
                        {tenant.status === TenantStatus.PENDING && (
                          <button
                            onClick={() => router.push(`/admin/tenants/${tenant.id}/documents`)}
                            className="text-green-600 hover:text-green-900"
                          >
                            書類提出
                          </button>
                        )}
                        
                        {tenant.status === TenantStatus.REVIEWING && (
                          <span className="text-yellow-600">
                            審査中
                          </span>
                        )}
                        
                        {tenant.status === TenantStatus.AWAITING_PHONE && (
                          <button
                            onClick={() => router.push(`/admin/tenants/${tenant.id}/assign-phone`)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            電話番号割当
                          </button>
                        )}
                        
                        {tenant.status === TenantStatus.ACTIVE && (
                          <button
                            onClick={() => router.push(`/admin/tenants/${tenant.id}/settings`)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            設定
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">ステータス別統計</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold">{tenants.length}</div>
                <div className="text-sm text-gray-600">総テナント数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {tenants.filter(t => t.status === TenantStatus.ACTIVE).length}
                </div>
                <div className="text-sm text-gray-600">アクティブ</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {tenants.filter(t => [TenantStatus.PENDING, TenantStatus.REVIEWING].includes(t.status)).length}
                </div>
                <div className="text-sm text-gray-600">準備中</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {tenants.filter(t => t.status === TenantStatus.AWAITING_PHONE).length}
                </div>
                <div className="text-sm text-gray-600">電話番号待ち</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">プラン別統計</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">トライアル</span>
                <span className="font-semibold">
                  {tenants.filter(t => t.billing.plan === 'trial').length}件
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">ベーシック</span>
                <span className="font-semibold">
                  {tenants.filter(t => t.billing.plan === 'basic').length}件
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">プロ</span>
                <span className="font-semibold">
                  {tenants.filter(t => t.billing.plan === 'pro').length}件
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">エンタープライズ</span>
                <span className="font-semibold">
                  {tenants.filter(t => t.billing.plan === 'enterprise').length}件
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between items-center font-semibold">
                <span>月間売上見込み</span>
                <span className="text-lg text-green-600">
                  ¥{tenants.reduce((sum, t) => sum + t.billing.monthlyFee, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 操作ガイド */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">📋 テナント登録フロー</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>
              <strong>アカウント作成</strong> - 基本情報のみで登録可能（電話番号不要）
            </li>
            <li>
              <strong>書類提出</strong> - 事業者登録証明書、契約書等をアップロード
            </li>
            <li>
              <strong>審査</strong> - 提出された書類を確認（1-2営業日）
            </li>
            <li>
              <strong>電話番号割当</strong> - 審査完了後、Twilio電話番号を割り当て
            </li>
            <li>
              <strong>サービス開始</strong> - Retell AIエージェント作成、設定完了
            </li>
          </ol>
          <p className="mt-4 text-xs text-gray-600">
            ※ 電話番号の発行には通常3-5営業日かかりますが、アカウント作成と書類提出は先に進められます
          </p>
        </div>
      </div>
    </div>
  );
}