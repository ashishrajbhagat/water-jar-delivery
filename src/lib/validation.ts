import { z } from "zod";
import { redirect } from "next/navigation";

/**
 * Parses FormData against a zod schema. On failure, redirects back to
 * `errorRedirectPath` with a human-readable `?error=` message — same pattern
 * every page in this app already uses to show form errors, so no new UI
 * plumbing is needed. On success, returns the typed, validated data.
 */
export function parseFormOrRedirect<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
  errorRedirectPath: string
): z.infer<T> {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);

  if (!result.success) {
    const firstError = result.error.issues[0];
    const message = `${firstError.path.join(".")}: ${firstError.message}`;
    redirect(`${errorRedirectPath}?error=${encodeURIComponent(message)}`);
  }

  return result.data;
}

// shared building blocks -----------------------------------------------

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

const positiveNumber = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number` }).nonnegative(`${label} cannot be negative`);

// customers ---------------------------------------------------------------

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  mobile: optionalText,
  address: optionalText,
  route_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  selling_price: positiveNumber("Selling price").refine((v) => v > 0, "Selling price must be greater than 0"),
  regular_quantity: positiveNumber("Regular quantity"),
  delivery_frequency: z.enum(["daily", "alternate", "custom"]).default("daily"),
  opening_empty_balance: positiveNumber("Opening empty balance").default(0),
  payment_cycle: z.enum(["daily", "weekly", "monthly", "custom"]).default("daily"),
  payment_cycle_custom: optionalText,
  notes: optionalText,
});

export const customerUpdateSchema = customerSchema.extend({
  id: z.string().uuid(),
  active: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

// deliveries ----------------------------------------------------------------

export const deliverySchema = z.object({
  plan_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  rate: positiveNumber("Rate").refine((v) => v > 0, "Rate must be greater than 0"),
  expected_quantity: positiveNumber("Expected quantity"),
  today_quantity: positiveNumber("Today's quantity"),
  full_delivered: z.coerce.number().int("Full jars must be a whole number").nonnegative("Full jars cannot be negative"),
  empty_received: z.coerce.number().int("Empty jars must be a whole number").nonnegative("Empty jars cannot be negative"),
  amount_paid: positiveNumber("Amount paid").default(0),
  payment_method: z.enum(["cash", "upi", "none"]).default("none"),
  remark: optionalText,
});

// ledger adjustments ---------------------------------------------------------

export const adjustmentSchema = z.object({
  customer_id: z.string().uuid(),
  type: z.enum(["empty_jar", "payment"]),
  delta: z.coerce.number({ invalid_type_error: "Change must be a number" }),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters"),
});

// routes ----------------------------------------------------------------------

export const routeSchema = z.object({
  name: z.string().trim().min(1, "Route name is required"),
  areas: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((a) => a.trim()).filter(Boolean) : [])),
});

// expenses ----------------------------------------------------------------------

export const expenseSchema = z.object({
  expense_date: z.string().min(1, "Date is required"),
  category: z.enum([
    "driver_salary",
    "khalasi_salary",
    "fuel",
    "vehicle_maintenance",
    "jar_replacement",
    "electricity",
    "breakfast",
    "other",
  ]),
  amount: positiveNumber("Amount").refine((v) => v > 0, "Amount must be greater than 0"),
  note: optionalText,
});

// settings ----------------------------------------------------------------------

export const settingsSchema = z.object({
  purchase_price_per_jar: positiveNumber("Purchase price"),
  target_jars_per_day: positiveNumber("Target jars/day"),
  driver_salary_monthly: positiveNumber("Driver salary"),
  khalasi_salary_monthly: positiveNumber("Khalasi salary"),
  breakfast_daily: positiveNumber("Breakfast"),
  fuel_daily: positiveNumber("Fuel"),
});

// jar stock (purchases from supplier / empties sent for refilling) ---------------

export const jarStockSchema = z.object({
  entry_date: z.string().min(1, "Date is required"),
  purchased_qty: z.coerce.number().int("Must be a whole number").nonnegative("Cannot be negative").default(0),
  empty_sent_qty: z.coerce.number().int("Must be a whole number").nonnegative("Cannot be negative").default(0),
  note: optionalText,
});
