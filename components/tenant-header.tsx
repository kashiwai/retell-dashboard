'use client';

import { getPublicTenantConfig } from '@/config/tenant.config';
import { useState, useEffect } from 'react';

export function TenantHeader() {
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    // クライアントサイドでテナント設定を取得
    const config = getPublicTenantConfig();
    setTenant(config);
  }, []);

  if (!tenant) return null;

  return (
    <div className="border-b" style={{ backgroundColor: tenant.primaryColor }}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo && (
              <img 
                src={tenant.logo} 
                alt={tenant.name} 
                className="h-8 w-auto"
              />
            )}
            <h1 className="text-xl font-bold text-white">
              {tenant.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {tenant.features.lineNotification && (
              <span className="px-2 py-1 text-xs bg-white/20 text-white rounded">
                LINE連携
              </span>
            )}
            {tenant.features.gptAnalysis && (
              <span className="px-2 py-1 text-xs bg-white/20 text-white rounded">
                AI分析
              </span>
            )}
            {tenant.features.voiceRecording && (
              <span className="px-2 py-1 text-xs bg-white/20 text-white rounded">
                録音
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}