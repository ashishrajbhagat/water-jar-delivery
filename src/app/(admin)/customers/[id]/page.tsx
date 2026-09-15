import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { updateCustomer, addLedgerAdjustment } from "@/lib/actions/customers";
import { formatRupees, paymentStatus } from "@/lib/ledger";
import { SubmitButton } from "@/components/SubmitButton";
import { notFound } from "next/navigation";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const supabase = createClient();

  const { data: customer } = await supabase.from("customers").select("*, route:routes(id, name)").eq("id", params.id).single();
  if (!customer) notFound();

  const { data: routes } = await supabase.from("routes").select("id, name").order("name");
  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("*")
    .eq("customer_id", params.id)
    .order("delivery_date", { ascending: false })
    .limit(30);
  const { data: adjustments } = await supabase
    .from("ledger_adjustments")
    .select("*")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const { data: emptyBal } = await supabase.from("customer_empty_balance").select("empty_balance").eq("customer_id", params.id).single();
  const { data: outstandingBal } = await supabase.from("customer_payment_balance").select("outstanding").eq("customer_id", params.id).single();

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="card flex-1 text-center">
          <p className="text-xs text-teal-500">Empty Balance</p>
          <p className="text-2xl font-bold">{emptyBal?.empty_balance ?? 0}</p>
        </div>
        <div className="card flex-1 text-center">
          <p className="text-xs text-teal-500">Outstanding</p>
          <p className={`text-2xl font-bold ${(outstandingBal?.outstanding ?? 0) > 0 ? "text-clay" : ""}`}>
            {formatRupees(outstandingBal?.outstanding ?? 0)}
          </p>
        </div>
      </div>

      {searchParams.error && (
        <p className="text-clay text-sm bg-red-50 rounded-lg p-3">{searchParams.error}</p>
      )}

      <details className="card">
        <summary className="font-semibold cursor-pointer">Edit Customer</summary>
        <form action={updateCustomer} className="space-y-3 mt-4">
          <input type="hidden" name="id" value={customer.id} />
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input name="name" defaultValue={customer.name} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mobile</label>
            <input name="mobile" defaultValue={customer.mobile} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input name="address" defaultValue={customer.address} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Route</label>
            <select name="route_id" defaultValue={customer.route_id ?? ""} className="input">
              <option value="">— none —</option>
              {(routes ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Selling price (₹)</label>
              <input name="selling_price" type="number" step="0.01" defaultValue={customer.selling_price} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Regular qty/day</label>
              <input name="regular_quantity" type="number" defaultValue={customer.regular_quantity} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment cycle</label>
            <select name="payment_cycle" defaultValue={customer.payment_cycle} className="input">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Custom cycle detail <span className="text-teal-400 font-normal">(only if Custom selected)</span>
            </label>
            <input name="payment_cycle_custom" defaultValue={customer.payment_cycle_custom ?? ""} className="input" placeholder="e.g. every 10 days" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input name="notes" defaultValue={customer.notes ?? ""} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={customer.active} />
            Active
          </label>
          <SubmitButton pendingText="Saving...">Save Changes</SubmitButton>
        </form>
      </details>

      <details className="card">
        <summary className="font-semibold cursor-pointer">Add Manual Adjustment (Admin only)</summary>
        <form action={addLedgerAdjustment} className="space-y-3 mt-4">
          <input type="hidden" name="customer_id" value={customer.id} />
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select name="type" className="input">
              <option value="empty_jar">Empty Jar Balance</option>
              <option value="payment">Payment Balance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Change (+/-)</label>
            <input name="delta" type="number" step="0.01" required className="input" placeholder="-1 (jar broken) or +100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason (required)</label>
            <input name="reason" required className="input" placeholder="e.g. 1 jar broken" />
          </div>
          <SubmitButton variant="secondary" pendingText="Adding...">Add Adjustment</SubmitButton>
        </form>
      </details>

      {(() => {
        // Build one chronological timeline per ledger (oldest first) so we can
        // show a running balance next to every row — this is the actual "make
        // it transparent" requirement, not just a list of numbers.
        type Row = { date: string; label: string; change: number; sub?: string };

        const paymentRows: Row[] = [
          ...(deliveries ?? []).map((d) => ({
            date: d.delivery_date,
            label: `${d.full_delivered} jars @ ₹${d.rate}`,
            change: d.amount_due - d.amount_paid,
            sub: `Due ${formatRupees(d.amount_due)} · Paid ${formatRupees(d.amount_paid)} · ${paymentStatus(d.amount_due, d.amount_paid)}`,
          })),
          ...(adjustments ?? []).filter((a) => a.type === "payment").map((a) => ({
            date: a.created_at.slice(0, 10),
            label: `Adjustment: ${a.reason}`,
            change: a.delta,
          })),
        ].sort((a, b) => a.date.localeCompare(b.date));

        const emptyRows: Row[] = [
          ...(deliveries ?? []).map((d) => ({
            date: d.delivery_date,
            label: `Delivered ${d.full_delivered} · Received ${d.empty_received}`,
            change: d.full_delivered - d.empty_received,
          })),
          ...(adjustments ?? []).filter((a) => a.type === "empty_jar").map((a) => ({
            date: a.created_at.slice(0, 10),
            label: `Adjustment: ${a.reason}`,
            change: a.delta,
          })),
        ].sort((a, b) => a.date.localeCompare(b.date));

        let runningPay = 0;
        const paymentWithBalance = paymentRows.map((r) => {
          runningPay += r.change;
          return { ...r, balance: runningPay };
        }).reverse();

        let runningEmpty = customer.opening_empty_balance ?? 0;
        const emptyWithBalance = emptyRows.map((r) => {
          runningEmpty += r.change;
          return { ...r, balance: runningEmpty };
        }).reverse();

        return (
          <>
            <section>
              <h2 className="font-semibold mb-2">Payment Ledger</h2>
              <p className="text-xs text-teal-400 mb-2">
                Showing last 30 entries — for the true all-time outstanding figure, use the
                Balance card above.
              </p>
              <div className="space-y-2">
                {paymentWithBalance.map((r, i) => (
                  <div key={i} className="card flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{r.date}</p>
                      <p className="text-teal-500">{r.label}</p>
                      {r.sub && <p className="text-xs text-teal-400">{r.sub}</p>}
                    </div>
                    <div className="text-right">
                      <p className={r.balance > 0 ? "text-clay font-semibold" : "text-teal-600"}>
                        Balance: {formatRupees(r.balance)}
                      </p>
                    </div>
                  </div>
                ))}
                {paymentWithBalance.length === 0 && <p className="text-teal-400 text-sm">No entries yet.</p>}
              </div>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Empty Jar Ledger</h2>
              <div className="space-y-2">
                {emptyWithBalance.map((r, i) => (
                  <div key={i} className="card flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{r.date}</p>
                      <p className="text-teal-500">{r.label}</p>
                    </div>
                    <p className="font-semibold">Balance: {r.balance}</p>
                  </div>
                ))}
                {emptyWithBalance.length === 0 && <p className="text-teal-400 text-sm">No entries yet.</p>}
              </div>
            </section>
          </>
        );
      })()}
    </div>
  );
}
