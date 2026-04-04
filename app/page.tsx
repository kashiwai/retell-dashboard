'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // superadmin → 管理画面、それ以外 → テナントダッシュボード
      const role = user.user_metadata?.role;
      if (role === 'superadmin') {
        router.push('/admin/tenants');
      } else {
        router.push('/dashboard');
      }
    };
    redirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">読み込み中...</p>
      </div>
    </div>
  );
}
