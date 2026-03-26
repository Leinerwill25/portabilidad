import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    if (typeof window === 'undefined') {
       // Silent fail during SSR/Prerender if vars are missing
       // This prevents Vercel build from crashing
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       return {} as any
    }
    throw new Error('Supabase environment variables are missing')
  }

  return createBrowserClient(url, key)
}
