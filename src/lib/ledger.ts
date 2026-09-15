// Pure helper functions mirroring the SQL views in supabase/schema.sql.
// Used where we need the math in TypeScript (e.g. showing a live preview on
// the delivery form before the row is actually inserted).

export type Delivery = {
  full_delivered: number;
  empty_received: number;
  amount_due: number;
  amount_paid: number;
};

export type Adjustment = {
  type: "empty_jar" | "payment";
  delta: number;
};

/** previous balance + full delivered - empty received, plus any admin adjustments */
export function calcEmptyBalance(
  openingBalance: number,
  deliveries: Pick<Delivery, "full_delivered" | "empty_received">[],
  adjustments: Adjustment[]
): number {
  const fromDeliveries = deliveries.reduce(
    (sum, d) => sum + d.full_delivered - d.empty_received,
    0
  );
  const fromAdjustments = adjustments
    .filter((a) => a.type === "empty_jar")
    .reduce((sum, a) => sum + a.delta, 0);
  return openingBalance + fromDeliveries + fromAdjustments;
}

/** sum(amount_due - amount_paid) across deliveries, plus any admin adjustments */
export function calcOutstanding(
  deliveries: Pick<Delivery, "amount_due" | "amount_paid">[],
  adjustments: Adjustment[]
): number {
  const fromDeliveries = deliveries.reduce(
    (sum, d) => sum + (d.amount_due - d.amount_paid),
    0
  );
  const fromAdjustments = adjustments
    .filter((a) => a.type === "payment")
    .reduce((sum, a) => sum + a.delta, 0);
  return fromDeliveries + fromAdjustments;
}

export function paymentStatus(amountDue: number, amountPaid: number): "paid" | "partial" | "pending" {
  if (amountPaid >= amountDue) return "paid";
  if (amountPaid > 0) return "partial";
  return "pending";
}

export function formatRupees(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
