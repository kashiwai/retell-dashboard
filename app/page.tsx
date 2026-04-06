import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Home() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('ts_session')

  if (!sessionCookie) {
    redirect('/login')
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    if (!session || session.exp < Date.now()) {
      redirect('/login')
    }
    if (session.role === 'superadmin') {
      redirect('/admin/tenants')
    } else {
      redirect('/dashboard')
    }
  } catch {
    redirect('/login')
  }
}
