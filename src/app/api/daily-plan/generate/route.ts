import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

// Generates tomorrow's delivery list from each active customer's
// regular_quantity. Uses the service-role key (bypasses RLS) since this runs
// unattended, not as a logged-in user — protected by CRON_SECRET.
//
// Supports BOTH methods because cron providers differ:
// - Vercel Cron sends a GET request (and automatically attaches
//   `Authorization: Bearer $CRON_SECRET` if that env var is set on the project)
// - Manual testing / other schedulers (GitHub Actions, cron-job.org, Supabase
//   Edge Functions) typically use POST
async function runGeneration(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const targetDate =
    new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, route_id, regular_quantity")
    .eq("active", true)
    .gt("regular_quantity", 0);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (customers ?? []).map((c) => ({
    customer_id: c.id,
    delivery_date: targetDate,
    expected_quantity: c.regular_quantity,
    route_id: c.route_id,
  }));

  // upsert so re-running for the same day doesn't create duplicates
  // (unique constraint on customer_id + delivery_date in schema.sql)
  const { error: insertError } = await supabase
    .from("daily_delivery_plan")
    .upsert(rows, { onConflict: "customer_id,delivery_date", ignoreDuplicates: true });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ generated: rows.length, date: targetDate });
}

export async function GET(request: Request) {
  return runGeneration(request);
}

export async function POST(request: Request) {
  return runGeneration(request);
}
