// Fails fast with a clear message instead of letting a missing env var
// surface later as a cryptic "fetch failed" or "Invalid URL" deep inside
// Supabase's client. Imported by both Supabase client factories.
//
// IMPORTANT: each NEXT_PUBLIC_* var below is referenced as a literal
// `process.env.NEXT_PUBLIC_X` expression (not built from a variable name)
// because Next.js only inlines env vars into the browser bundle when it can
// statically find that exact literal at build time — a dynamic/computed
// lookup would work on the server but silently be `undefined` in the browser.

function requireVar(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local (or set it in your hosting provider's ` +
        `environment settings) and fill it in from Supabase → Settings → API.`
    );
  }
  return value;
}

export const env = {
  get SUPABASE_URL() {
    return requireVar("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get SUPABASE_ANON_KEY() {
    return requireVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  // server-only — never referenced from client.ts, so this never needs to
  // reach the browser bundle
  get SUPABASE_SERVICE_ROLE_KEY() {
    return requireVar("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
};
