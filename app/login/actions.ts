'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signInAction(email: string, password: string): Promise<{ error?: string }> {
  // Supabase Auth REST APIに直接サインイン
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!res.ok) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' }
  }

  const session = await res.json()
  const user = session.user

  if (!user) {
    return { error: 'ログインに失敗しました' }
  }

  const role = user.user_metadata?.role ?? 'tenant'

  // シンプルなセッションクッキーをサーバーサイドで確実にセット
  const cookieStore = await cookies()
  cookieStore.set('ts_session', JSON.stringify({
    uid: user.id,
    email: user.email,
    role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24時間
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  })

  // Supabaseのアクセストークンも保存（API認証用）
  cookieStore.set('sb_access_token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: session.expires_in || 3600,
    path: '/',
  })

  const redirectPath = role === 'superadmin' ? '/admin/tenants' : '/dashboard'
  redirect(redirectPath)
}
