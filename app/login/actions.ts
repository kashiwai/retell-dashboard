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
  const isSecure = process.env.NODE_ENV === 'production'

  // シンプルなセッションクッキーをサーバーサイドで確実にセット
  const cookieStore = await cookies()
  cookieStore.set('ts_session', JSON.stringify({
    uid: user.id,
    email: user.email,
    role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24時間
  }), {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  })

  // @supabase/ssr が期待する形式でセッション全体を保存
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0]
  cookieStore.set(`sb-${projectRef}-auth-token`, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: 'bearer',
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    user: session.user,
  }), {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: session.expires_in || 3600,
    path: '/',
  })

  // 後方互換: sb_access_token も保存
  cookieStore.set('sb_access_token', session.access_token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: session.expires_in || 3600,
    path: '/',
  })

  const redirectPath = role === 'superadmin' ? '/admin/tenants' : '/dashboard'
  redirect(redirectPath)
}
