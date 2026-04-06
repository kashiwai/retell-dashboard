import { NextRequest, NextResponse } from 'next/server'

// GETで直接アクセスされた場合はログインページへ
export async function GET() {
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null)
  let email: string, password: string

  if (formData) {
    email = formData.get('email') as string
    password = formData.get('password') as string
  } else {
    const body = await request.json().catch(() => ({}))
    email = body.email
    password = body.password
  }

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=missing', request.url), 303)
  }

  // Supabase Auth REST API で直接認証
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
    return NextResponse.redirect(new URL('/login?error=invalid', request.url), 303)
  }

  const session = await res.json()
  const user = session?.user
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url), 303)
  }

  const role = user.user_metadata?.role ?? 'tenant'
  const redirectPath = role === 'superadmin' ? '/admin/tenants' : '/dashboard'

  // 303リダイレクト + Set-Cookie（POSTからGETへ変換、ブラウザが確実に処理する）
  const response = NextResponse.redirect(new URL(redirectPath, request.url), 303)

  response.cookies.set('ts_session', JSON.stringify({
    uid: user.id,
    email: user.email,
    role,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  }), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  })

  response.cookies.set('sb_access_token', session.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: session.expires_in || 3600,
    path: '/',
  })

  return response
}
