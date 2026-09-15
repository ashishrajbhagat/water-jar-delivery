import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Server-side Supabase client — used in Server Components, Server Actions, Route Handlers.
// Reads/writes the auth cookie so RLS policies see the logged-in user.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // called from a Server Component with no write access — safe to ignore,
          // middleware refreshes the session on the next request
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // see note above
        }
      },
    },
  });
}
