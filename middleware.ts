import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証が不要なパス
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 公開パスはスキップ
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 静的ファイルはスキップ
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // APIルートの認証チェック
  if (pathname.startsWith('/api')) {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    try {
      const token = authHeader.substring(7);
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // トークンの有効期限チェック
      if (decoded.expiry < Date.now()) {
        return NextResponse.json(
          { error: 'トークンの有効期限が切れています' },
          { status: 401 }
        );
      }
      
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 401 }
      );
    }
  }

  // ページルートの認証チェック（クライアントサイドでチェック）
  // サーバーサイドではCookieベースの認証が必要（ここでは簡略化）
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};