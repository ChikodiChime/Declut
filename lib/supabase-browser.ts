import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

// One client instance per browser session.
// Import this in Client Components instead of lib/supabase.ts.
export function getSupabaseBrowser() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
