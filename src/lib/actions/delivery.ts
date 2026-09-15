"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseFormOrRedirect, deliverySchema } from "@/lib/validation";
import { z } from "zod";

/**
 * Records a delivery. This is an INSERT-only operation (RLS enforces driver
 * can only insert, never update/delete existing deliveries — see schema.sql).
 * Also marks the day's plan row as delivered, and — if the driver changed
 * today's quantity — logs it as a daily adjustment, WITHOUT touching the
 * customer's regular_quantity.
 */
export async function markDelivered(formData: FormData) {
  const profile = await requireUser();
  const planIdForErrors = (formData.get("plan_id") as string) || "";

  const data = parseFormOrRedirect(deliverySchema, formData, `/delivery/${planIdForErrors}`);
  const supabase = createClient();

  const { error: deliveryError } = await supabase.from("deliveries").insert({
    plan_id: data.plan_id,
    customer_id: data.customer_id,
    driver_id: profile.id,
    full_delivered: data.full_delivered,
    empty_received: data.empty_received,
    rate: data.rate,
    amount_paid: data.amount_paid,
    payment_method: data.payment_method,
    remark: data.remark,
  });

  if (deliveryError) {
    redirect(`/delivery/${data.plan_id}?error=${encodeURIComponent(deliveryError.message)}`);
  }

  // if driver changed today's quantity from the regular/expected quantity,
  // record it as a per-day adjustment on the plan row (not the customer record)
  const update: Record<string, unknown> = { status: "delivered" };
  if (data.today_quantity !== data.expected_quantity) {
    update.adjusted_quantity = data.today_quantity;
  }

  await supabase.from("daily_delivery_plan").update(update).eq("id", data.plan_id);

  revalidatePath("/today");
  redirect("/today");
}

/** Marks a plan row as skipped (customer not available / no delivery today). */
export async function skipDelivery(formData: FormData) {
  await requireUser();
  const supabase = createClient();

  const planId = z.string().uuid().safeParse(formData.get("plan_id"));
  if (!planId.success) redirect("/today");

  await supabase.from("daily_delivery_plan").update({ status: "skipped" }).eq("id", planId.data);
  revalidatePath("/today");
  redirect("/today");
}
