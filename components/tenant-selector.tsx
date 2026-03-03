'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';

interface Tenant {
  tenantId: string;
  name: string;
  phoneNumber: string;
  primaryColor: string;
}

export default function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
    // ローカルストレージから選択済みテナントを取得
    const saved = localStorage.getItem('selected_tenant');
    if (saved) {
      setSelectedTenant(saved);
    }
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants');
      const data = await response.json();
      setTenants(data);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    setSelectedTenant(tenantId);
    localStorage.setItem('selected_tenant', tenantId);
    setIsOpen(false);
    
    // ページをリロードして新しいテナントでデータを取得
    window.location.reload();
  };

  const currentTenant = tenants.find(t => t.tenantId === selectedTenant);
  const displayName = selectedTenant === 'all' ? '全てのテナント' : currentTenant?.name || 'テナント選択';

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Building2 className="h-5 w-5 text-gray-600" />
        <span className="font-medium">{displayName}</span>
        <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* クリック外で閉じる */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* ドロップダウンメニュー */}
          <div className="absolute top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {/* 全テナント表示オプション */}
            <button
              onClick={() => handleSelectTenant('all')}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>全てのテナント</span>
              </div>
              {selectedTenant === 'all' && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </button>

            {/* 区切り線 */}
            <div className="border-t border-gray-200" />

            {/* テナント一覧 */}
            {tenants.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                テナントがありません
              </div>
            ) : (
              tenants.map((tenant) => (
                <button
                  key={tenant.tenantId}
                  onClick={() => handleSelectTenant(tenant.tenantId)}
                  className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tenant.primaryColor }}
                    />
                    <div className="text-left">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-gray-500">{tenant.phoneNumber}</div>
                    </div>
                  </div>
                  {selectedTenant === tenant.tenantId && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </button>
              ))
            )}

            {/* 区切り線 */}
            <div className="border-t border-gray-200" />

            {/* 管理画面へのリンク */}
            <a
              href="/admin/tenants"
              className="block w-full px-4 py-3 hover:bg-gray-50 text-sm text-blue-600 transition-colors"
            >
              テナント管理 →
            </a>
          </div>
        </>
      )}
    </div>
  );
}