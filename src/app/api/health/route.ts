import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// GET /api/health — for uptime monitors (UptimeRobot, Better Uptime, etc.)
// Confirms the app is running AND can reach Supabase, not just that Next.js
// is up. Returns 200 only if a real query succeeds.
export async function GET() {
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { error } = await supabase.from("settings").select("key").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", time: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "unknown error" },
      { status: 503 }
    );
  }
}
