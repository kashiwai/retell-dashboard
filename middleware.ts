import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/signin',
  '/api/auth/logout',
  '/api/webhook/retell',
  '/api/line/webhook',
  '/api/notify/line',
  '/api/twiml/',
  '/api/health-demo/',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公開パスはスキップ
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 静的ファイルはスキップ
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }

  // ts_sessionクッキーで認証チェック（シンプル・確実）
  const sessionCookie = request.cookies.get('ts_session')

  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let session: { uid: string; email: string; role: string; exp: number }
  try {
    session = JSON.parse(sessionCookie.value)
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 有効期限チェック
  if (session.exp < Date.now()) {
    const res = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('ts_session')
    res.cookies.delete('sb_access_token')
    return res
  }

  // /admin/* は superadmin のみ
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (session.role !== 'superadmin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
