import { createClient } from '@supabase/supabase-js'

// Admin client — uses service role key, bypasses Row Level Security.
// Use ONLY in server-side code (route handlers). Never import in client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Anon client — respects Row Level Security. Safe for server components.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
