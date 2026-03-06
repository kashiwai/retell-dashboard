'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenantService } from '@/config/tenant-management';

export default function NewTenantPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    plan: 'trial' as 'trial' | 'basic' | 'pro' | 'enterprise'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // アカウント作成（電話番号なしで）
      const tenant = await TenantService.createAccount(formData);
      
      alert(`アカウントを作成しました。\nテナントID: ${tenant.id}\n\n必要書類をアップロードしてください。`);
      
      // テナント詳細ページへリダイレクト
      router.push(`/admin/tenants/${tenant.id}`);
    } catch (error) {
      console.error('Failed to create tenant:', error);
      alert('アカウント作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">新規テナント登録</h1>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold text-blue-900 mb-2">登録フロー</h2>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>基本情報の入力（このフォーム）</li>
              <li>必要書類のアップロード</li>
              <li>審査完了後、電話番号を割り当て</li>
              <li>サービス開始</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="株式会社サンプル"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                担当者名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="山田太郎"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                プラン選択 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({...formData, plan: e.target.value as any})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="trial">トライアル（無料・14日間）</option>
                <option value="basic">ベーシック（月額9,800円 + 30円/分）</option>
                <option value="pro">プロ（月額29,800円 + 25円/分）</option>
                <option value="enterprise">エンタープライズ（月額98,000円 + 20円/分）</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">プラン詳細</h3>
              {formData.plan === 'trial' && (
                <div className="text-sm text-gray-600">
                  <p>• 14日間無料でお試し</p>
                  <p>• 通話時間: 最大100分まで</p>
                  <p>• 基本機能のみ利用可能</p>
                </div>
              )}
              {formData.plan === 'basic' && (
                <div className="text-sm text-gray-600">
                  <p>• 月額基本料金: 9,800円</p>
                  <p>• 通話料金: 30円/分</p>
                  <p>• LINE通知機能付き</p>
                </div>
              )}
              {formData.plan === 'pro' && (
                <div className="text-sm text-gray-600">
                  <p>• 月額基本料金: 29,800円</p>
                  <p>• 通話料金: 25円/分</p>
                  <p>• 全機能利用可能</p>
                  <p>• 優先サポート</p>
                </div>
              )}
              {formData.plan === 'enterprise' && (
                <div className="text-sm text-gray-600">
                  <p>• 月額基本料金: 98,000円</p>
                  <p>• 通話料金: 20円/分</p>
                  <p>• 全機能利用可能</p>
                  <p>• 専任サポート</p>
                  <p>• カスタマイズ対応</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? '作成中...' : 'アカウント作成'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}