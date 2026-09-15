import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Client-side Supabase client — used inside "use client" components (rare in this app,
// most reads/writes go through Server Components + Server Actions instead).
export function createClient() {
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
