import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentからの呼び出し時は無視
          }
        },
      },
      global: {
        // sb_access_tokenクッキーがあればそれをBearerトークンとして使う
        fetch: async (url, options = {}) => {
          const accessToken = cookieStore.get('sb_access_token')?.value
          if (accessToken) {
            const headers = new Headers(options.headers)
            headers.set('Authorization', `Bearer ${accessToken}`)
            return fetch(url, { ...options, headers })
          }
          return fetch(url, options)
        },
      },
    }
  )
}
