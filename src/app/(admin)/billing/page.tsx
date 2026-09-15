import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatRupees } from "@/lib/ledger";

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; customer_id?: string };
}) {
  await requireAdmin();
  const supabase = createClient();
  const range = { from: searchParams.from || defaultRange().from, to: searchParams.to || defaultRange().to };

  const { data: customers } = await supabase.from("customers").select("id, name").order("name");

  let bills: any[] = [];
  if (searchParams.customer_id) {
    const { data: deliveries } = await supabase
      .from("deliveries")
      .select("*")
      .eq("customer_id", searchParams.customer_id)
      .gte("delivery_date", range.from)
      .lte("delivery_date", range.to)
      .order("delivery_date");
    const { data: customer } = await supabase.from("customers").select("name").eq("id", searchParams.customer_id).single();
    const { data: emptyBal } = await supabase.from("customer_empty_balance").select("empty_balance").eq("customer_id", searchParams.customer_id).single();

    const jars = (deliveries ?? []).reduce((s, d) => s + d.full_delivered, 0);
    const amount = (deliveries ?? []).reduce((s, d) => s + d.amount_due, 0);
    const paid = (deliveries ?? []).reduce((s, d) => s + d.amount_paid, 0);

    bills = [{
      customer: customer?.name,
      deliveries: deliveries ?? [],
      jars,
      amount,
      paid,
      outstanding: amount - paid,
      emptyBalance: emptyBal?.empty_balance ?? 0,
    }];
  }

  return (
    <div className="space-y-4 print:p-0">
      <h1 className="text-xl font-bold print:hidden">Billing</h1>

      <form className="card space-y-3 print:hidden">
        <div>
          <label className="block text-sm font-medium mb-1">Customer</label>
          <select name="customer_id" defaultValue={searchParams.customer_id} className="input" required>
            <option value="">Select customer</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <input type="date" name="from" defaultValue={range.from} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <input type="date" name="to" defaultValue={range.to} className="input" />
          </div>
        </div>
        <button type="submit" className="btn-primary">Generate Bill</button>
      </form>

      {bills.map((b, i) => (
        <div key={i} className="card">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-bold text-lg">{b.customer}</p>
              <p className="text-sm text-teal-500">{range.from} to {range.to}</p>
            </div>
            <p className="text-xs text-teal-400 print:hidden">Use browser Print (Ctrl/Cmd+P) to save or share as PDF</p>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-teal-500 border-b border-teal-100">
                <th className="py-1">Date</th>
                <th>Jars</th>
                <th>Amount</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {b.deliveries.map((d: any) => (
                <tr key={d.id} className="border-b border-teal-50">
                  <td className="py-1">{d.delivery_date}</td>
                  <td>{d.full_delivered}</td>
                  <td>{formatRupees(d.amount_due)}</td>
                  <td>{formatRupees(d.amount_paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-teal-500">Jars delivered:</span> <strong>{b.jars}</strong></div>
            <div><span className="text-teal-500">Total amount:</span> <strong>{formatRupees(b.amount)}</strong></div>
            <div><span className="text-teal-500">Amount paid:</span> <strong>{formatRupees(b.paid)}</strong></div>
            <div><span className="text-teal-500">Outstanding:</span> <strong className="text-clay">{formatRupees(b.outstanding)}</strong></div>
            <div className="col-span-2"><span className="text-teal-500">Empty jars with customer:</span> <strong>{b.emptyBalance}</strong></div>
          </div>
        </div>
      ))}
    </div>
  );
}
