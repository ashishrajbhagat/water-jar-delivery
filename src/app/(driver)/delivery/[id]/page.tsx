import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { markDelivered, skipDelivery } from "@/lib/actions/delivery";
import { SubmitButton } from "@/components/SubmitButton";
import { notFound } from "next/navigation";

export default async function DeliveryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await requireUser();
  const supabase = createClient();

  const { data: plan } = await supabase
    .from("daily_delivery_plan")
    .select(
      `id, expected_quantity, adjusted_quantity, status,
       customer:customers ( id, name, address, mobile, selling_price, notes )`
    )
    .eq("id", params.id)
    .single();

  if (!plan) notFound();
  const customer = (
    plan as unknown as {
      customer: { id: string; name: string; address: string; mobile: string; selling_price: number; notes: string | null };
    }
  ).customer;

  const { data: emptyBal } = await supabase
    .from("customer_empty_balance")
    .select("empty_balance")
    .eq("customer_id", customer.id)
    .single();
  const { data: outstandingBal } = await supabase
    .from("customer_payment_balance")
    .select("outstanding")
    .eq("customer_id", customer.id)
    .single();

  const todayQty = plan.adjusted_quantity ?? plan.expected_quantity;

  return (
    <div className="space-y-5">
      <div className="card">
        <p className="text-xl font-bold">{customer.name}</p>
        <p className="text-teal-600">{customer.address}</p>
        <p className="text-teal-600 text-sm">{customer.mobile}</p>
        {customer.notes && (
          <p className="text-sm text-amber-600 mt-2 bg-amber-50 rounded-lg p-2">{customer.notes}</p>
        )}
        <div className="flex gap-6 mt-3 text-sm">
          <span>Rate: <strong>₹{customer.selling_price}</strong>/jar</span>
          <span>Empty with them: <strong>{emptyBal?.empty_balance ?? 0}</strong></span>
        </div>
        {(outstandingBal?.outstanding ?? 0) > 0 && (
          <p className="text-clay font-semibold mt-1">Pending: ₹{outstandingBal?.outstanding}</p>
        )}
      </div>

      {searchParams.error && (
        <p className="text-clay text-sm bg-red-50 rounded-lg p-3">{searchParams.error}</p>
      )}

      <form action={markDelivered} className="card space-y-4">
        <input type="hidden" name="plan_id" value={plan.id} />
        <input type="hidden" name="customer_id" value={customer.id} />
        <input type="hidden" name="rate" value={customer.selling_price} />
        <input type="hidden" name="expected_quantity" value={plan.expected_quantity} />

        <div>
          <label className="block text-sm font-medium mb-1">Aaj kitne jar dene hai</label>
          <input
            name="today_quantity"
            type="number"
            min={0}
            defaultValue={todayQty}
            className="input"
          />
          <p className="text-xs text-teal-500 mt-1">Regular quantity: {plan.expected_quantity}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Full jar diye (delivered)</label>
          <input name="full_delivered" type="number" min={0} defaultValue={todayQty} className="input" required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Empty jar liye (received)</label>
          <input name="empty_received" type="number" min={0} defaultValue={0} className="input" required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Payment collected (₹)</label>
          <input name="amount_paid" type="number" min={0} step="0.01" defaultValue={0} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Payment method</label>
          <select name="payment_method" className="input" defaultValue="none">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="none">No payment</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Remark (optional)</label>
          <input name="remark" type="text" className="input" placeholder="e.g. next week se 3 jar" />
        </div>

        <SubmitButton pendingText="Saving delivery...">MARK DELIVERED</SubmitButton>
      </form>

      <form action={skipDelivery}>
        <input type="hidden" name="plan_id" value={plan.id} />
        <SubmitButton variant="secondary" pendingText="Skipping...">
          Skip Today (customer not available)
        </SubmitButton>
      </form>
    </div>
  );
}
