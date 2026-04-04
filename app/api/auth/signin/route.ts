import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(c => cookiesToSet.push(c))
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json(
      { error: 'メールアドレスまたはパスワードが正しくありません' },
      { status: 401 }
    )
  }

  const role = data.user.user_metadata?.role ?? 'user'
  const redirectPath = role === 'superadmin' ? '/admin/tenants' : '/dashboard'

  const res = NextResponse.json({ success: true, role, redirectPath })

  // サーバーサイドでクッキーを設定（middlewareが確実に読めるようにする）
  cookiesToSet.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2])
  })

  return res
}
