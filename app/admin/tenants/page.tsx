'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, Settings, Users, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Tenant {
  tenantId: string;
  name: string;
  phoneNumber: string;
  agentId: string;
  primaryColor: string;
  lineUserId?: string;
  features: {
    line: boolean;
    gpt: boolean;
    recording: boolean;
  };
}

export default function TenantsManagementPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isAddingTenant, setIsAddingTenant] = useState(false);
  const [editingTenant, setEditingTenant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // 新規テナント用のフォーム
  const [newTenant, setNewTenant] = useState<Partial<Tenant>>({
    tenantId: '',
    name: '',
    phoneNumber: '',
    agentId: '',
    primaryColor: '#00B900',
    features: {
      line: true,
      gpt: true,
      recording: true
    }
  });

  // 認証チェック
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      setAuthChecked(true);
      fetchTenants();
    };
    
    checkAuth();
  }, [router]);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants');
      
      // エラーレスポンスの処理
      if (!response.ok) {
        console.error('Failed to fetch tenants, status:', response.status);
        // 認証エラーの場合はログインページにリダイレクト
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/login';
          return;
        }
        setTenants([]);
        return;
      }
      
      const data = await response.json();
      
      // dataが配列でない場合の処理
      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        setTenants([]);
        return;
      }
      
      setTenants(data);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  // テナント追加
  const handleAddTenant = async () => {
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenant)
      });
      
      if (response.ok) {
        await fetchTenants();
        setIsAddingTenant(false);
        setNewTenant({
          tenantId: '',
          name: '',
          phoneNumber: '',
          agentId: '',
          primaryColor: '#00B900',
          features: { line: true, gpt: true, recording: true }
        });
      }
    } catch (error) {
      console.error('Failed to add tenant:', error);
    }
  };

  // テナント更新
  const handleUpdateTenant = async (tenant: Tenant) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenant)
      });
      
      if (response.ok) {
        await fetchTenants();
        setEditingTenant(null);
      }
    } catch (error) {
      console.error('Failed to update tenant:', error);
    }
  };

  // テナント削除
  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('このテナントを削除してもよろしいですか？')) return;
    
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchTenants();
      }
    } catch (error) {
      console.error('Failed to delete tenant:', error);
    }
  };

  // 認証チェック中
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">認証を確認中...</p>
        </div>
      </div>
    );
  }
  
  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">テナント情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            テナント管理（複数コンテナ）
          </h1>
          <p className="text-gray-600 mt-2">
            お客様ごとのコンテナ（テナント）を管理します
          </p>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">総テナント数</div>
            <div className="text-2xl font-bold text-gray-900">{tenants.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">アクティブ</div>
            <div className="text-2xl font-bold text-green-600">{tenants.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">電話番号数</div>
            <div className="text-2xl font-bold text-blue-600">{tenants.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">LINE連携</div>
            <div className="text-2xl font-bold text-purple-600">
              {tenants.filter(t => t.features?.line).length}
            </div>
          </div>
        </div>

        {/* 新規追加ボタン */}
        <div className="mb-6">
          <button
            onClick={() => setIsAddingTenant(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            新規テナント追加
          </button>
        </div>

        {/* 新規追加フォーム */}
        {isAddingTenant && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">新規テナント作成</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  テナントID *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTenant.tenantId || ''}
                  onChange={(e) => setNewTenant({...newTenant, tenantId: e.target.value})}
                  placeholder="company-a"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会社名 *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTenant.name || ''}
                  onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                  placeholder="株式会社A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号 *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTenant.phoneNumber || ''}
                  onChange={(e) => setNewTenant({...newTenant, phoneNumber: e.target.value})}
                  placeholder="+815012345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  エージェントID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTenant.agentId || ''}
                  onChange={(e) => setNewTenant({...newTenant, agentId: e.target.value})}
                  placeholder="agent_xxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  テーマカラー
                </label>
                <input
                  type="color"
                  className="w-full h-10 px-1 py-1 border rounded-lg"
                  value={newTenant.primaryColor || '#00B900'}
                  onChange={(e) => setNewTenant({...newTenant, primaryColor: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LINE ユーザーID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTenant.lineUserId || ''}
                  onChange={(e) => setNewTenant({...newTenant, lineUserId: e.target.value})}
                  placeholder="Uxxxxx"
                />
              </div>
            </div>
            
            {/* 機能設定 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                機能設定
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTenant.features?.line}
                    onChange={(e) => setNewTenant({
                      ...newTenant,
                      features: {...newTenant.features!, line: e.target.checked}
                    })}
                  />
                  <span>LINE通知</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTenant.features?.gpt}
                    onChange={(e) => setNewTenant({
                      ...newTenant,
                      features: {...newTenant.features!, gpt: e.target.checked}
                    })}
                  />
                  <span>GPT要約</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTenant.features?.recording}
                    onChange={(e) => setNewTenant({
                      ...newTenant,
                      features: {...newTenant.features!, recording: e.target.checked}
                    })}
                  />
                  <span>音声録音</span>
                </label>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddTenant}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                保存
              </button>
              <button
                onClick={() => setIsAddingTenant(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-400"
              >
                <X className="h-4 w-4" />
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* テナント一覧 */}
        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  会社名
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  電話番号
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  エージェント
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  機能
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    テナントがありません
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.tenantId} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{backgroundColor: tenant.primaryColor}}
                        />
                        <span className="font-medium">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{tenant.phoneNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {tenant.agentId?.substring(0, 15)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {tenant.features?.line && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            LINE
                          </span>
                        )}
                        {tenant.features?.gpt && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            GPT
                          </span>
                        )}
                        {tenant.features?.recording && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                            録音
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
                        アクティブ
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTenant(tenant.tenantId)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(tenant.tenantId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 設定手順 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            テナント設定手順
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>新規テナント追加ボタンをクリック</li>
            <li>会社情報と電話番号を入力</li>
            <li>Retell AIでエージェントを作成し、エージェントIDを入力</li>
            <li>必要な機能（LINE、GPT、録音）を選択</li>
            <li>保存してテナントを作成</li>
          </ol>
        </div>
      </div>
    </div>
  );
}