import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// Refreshes the Supabase session cookie on every request and redirects
// signed-out users to /login. Role checks (admin vs driver) are deliberately
// NOT done here — they already happen in requireAdmin()/requireUser() inside
// each layout, and are enforced again at the database level via RLS. Doing
// the same "select role from profiles" query a second time here just added
// a full extra network round-trip to Supabase on every single navigation,
// which is what was making every click feel slow.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/login";

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  // also skip API routes — they do their own auth (requireAdmin or
  // CRON_SECRET) and don't need the session-refresh redirect logic
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
