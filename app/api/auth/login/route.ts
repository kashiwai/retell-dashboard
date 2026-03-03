import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ユーザー情報（環境変数でカスタマイズ可能）
const getUsers = () => {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const userUsername = process.env.USER_USERNAME || 'user';
  const userPassword = process.env.USER_PASSWORD || 'user123';
  
  return [
    {
      id: 1,
      username: adminUsername,
      password: adminPassword, // 本番環境ではハッシュ化する
      role: 'admin',
      name: '管理者'
    },
    {
      id: 2,
      username: userUsername,
      password: userPassword,
      role: 'user',
      name: 'ユーザー'
    }
  ];
};

// シンプルなトークン生成（本番環境ではJWTを使用）
function generateToken(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24時間有効
  return Buffer.from(JSON.stringify({ userId, token, expiry })).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // ユーザー認証
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザー名またはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // トークン生成
    const token = generateToken(user.id);

    // ユーザー情報からパスワードを除外
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}