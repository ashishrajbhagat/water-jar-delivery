"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseFormOrRedirect, routeSchema } from "@/lib/validation";
import { z } from "zod";

export async function createRoute(formData: FormData) {
  await requireAdmin();
  const data = parseFormOrRedirect(routeSchema, formData, "/routes");
  const supabase = createClient();

  await supabase.from("routes").insert({ name: data.name, areas: data.areas });
  revalidatePath("/routes");
  redirect("/routes");
}

/** Reorders which position a customer sits at within their route's delivery list. */
export async function updateCustomerRouteOrder(formData: FormData) {
  await requireAdmin();
  const supabase = createClient();

  const schema = z.object({
    customer_id: z.string().uuid(),
    route_order: z.coerce.number().int(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/routes");

  await supabase.from("customers").update({ route_order: parsed.data.route_order }).eq("id", parsed.data.customer_id);
  revalidatePath("/routes");
}
