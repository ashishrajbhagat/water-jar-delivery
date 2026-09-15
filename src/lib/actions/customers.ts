"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseFormOrRedirect, customerSchema, customerUpdateSchema, adjustmentSchema } from "@/lib/validation";

export async function createCustomer(formData: FormData) {
  await requireAdmin();
  const data = parseFormOrRedirect(customerSchema, formData, "/customers/new");
  const supabase = createClient();

  const { error } = await supabase.from("customers").insert(data);

  if (error) redirect(`/customers/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  const data = parseFormOrRedirect(customerUpdateSchema, formData, `/customers/${id}`);
  const supabase = createClient();

  const { id: customerId, ...updates } = data;
  const { error } = await supabase.from("customers").update(updates).eq("id", customerId);

  if (error) redirect(`/customers/${customerId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  redirect("/customers");
}

/** Admin-only correction to a customer's empty-jar or payment balance. Reason is required. */
export async function addLedgerAdjustment(formData: FormData) {
  const profile = await requireAdmin();
  const customerIdForErrors = (formData.get("customer_id") as string) || "";
  const data = parseFormOrRedirect(adjustmentSchema, formData, `/customers/${customerIdForErrors}`);
  const supabase = createClient();

  const { error } = await supabase.from("ledger_adjustments").insert({
    customer_id: data.customer_id,
    type: data.type,
    delta: data.delta,
    reason: data.reason,
    created_by: profile.id,
  });

  if (error) redirect(`/customers/${data.customer_id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/customers/${data.customer_id}`);
  redirect(`/customers/${data.customer_id}`);
}
