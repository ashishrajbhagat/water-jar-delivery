import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatRupees } from "@/lib/ledger";
import Link from "next/link";

export default async function PaymentsPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: balances } = await supabase
    .from("customer_payment_balance")
    .select("customer_id, outstanding, customer:customers(name, mobile, route:routes(name))")
    .order("outstanding", { ascending: false });

  const pending = (balances ?? []).filter((b) => Number(b.outstanding) > 0);
  const totalPending = pending.reduce((s, b) => s + Number(b.outstanding), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Payments</h1>
      <div className="card text-center">
        <p className="text-xs text-teal-500">Total Pending Across All Customers</p>
        <p className="text-2xl font-bold text-clay">{formatRupees(totalPending)}</p>
      </div>

      <div className="space-y-2">
        {pending.map((b: any) => (
          <Link key={b.customer_id} href={`/customers/${b.customer_id}`} className="card flex justify-between">
            <div>
              <p className="font-medium">{b.customer.name}</p>
              <p className="text-xs text-teal-500">{b.customer.mobile} {b.customer.route?.name ? `• ${b.customer.route.name}` : ""}</p>
            </div>
            <p className="font-semibold text-clay">{formatRupees(b.outstanding)}</p>
          </Link>
        ))}
        {pending.length === 0 && <p className="text-teal-500 text-center py-10">No pending payments. 🎉</p>}
      </div>
    </div>
  );
}
