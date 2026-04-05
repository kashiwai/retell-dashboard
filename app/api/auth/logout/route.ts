import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://retell-dashboard-opal.vercel.app'

function clearSession(res: NextResponse) {
  res.cookies.set('ts_session', '', { maxAge: 0, path: '/' })
  res.cookies.set('sb_access_token', '', { maxAge: 0, path: '/' })
  return res
}

export async function POST() {
  return clearSession(NextResponse.json({ success: true }))
}

export async function GET() {
  return clearSession(NextResponse.redirect(new URL('/login', APP_URL)))
}
