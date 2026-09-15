"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseFormOrRedirect, expenseSchema, settingsSchema, jarStockSchema } from "@/lib/validation";

export async function addExpense(formData: FormData) {
  const profile = await requireAdmin();
  const data = parseFormOrRedirect(expenseSchema, formData, "/expenses");
  const supabase = createClient();

  await supabase.from("expenses").insert({ ...data, created_by: profile.id });
  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function updateSettings(formData: FormData) {
  await requireAdmin();
  const data = parseFormOrRedirect(settingsSchema, formData, "/settings");
  const supabase = createClient();

  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(data)) {
    await supabase.from("settings").upsert({ key, value, updated_at: now });
  }

  revalidatePath("/settings");
  redirect("/settings");
}

/**
 * Logs today's jar stock movement: how many filled jars were purchased from
 * the supplier, and how many empty jars were sent back for refilling. This
 * is what makes the Daily Closing screen's full opening→remaining
 * reconciliation possible (deliveries alone only show movement to/from
 * customers, not the business's own stock).
 */
export async function logJarStock(formData: FormData) {
  const profile = await requireAdmin();
  const data = parseFormOrRedirect(jarStockSchema, formData, "/daily-closing");
  const supabase = createClient();

  const { error } = await supabase.from("jar_stock_entries").insert({ ...data, created_by: profile.id });

  if (error) redirect(`/daily-closing?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/daily-closing");
  redirect(`/daily-closing?date=${data.entry_date}`);
}
