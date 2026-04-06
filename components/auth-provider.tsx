'use client';

// 認証はmiddleware (ts_sessionクッキー) で管理
// このProviderはレガシー互換のためのみ残す（リダイレクトロジックは削除済み）
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

export function useAuth() {
  return {
    user: null as User | null,
    token: null as string | null,
    isLoading: false,
    login: (_token: string, _user: User) => {},
    logout: () => { window.location.href = '/api/auth/logout'; },
  };
}
