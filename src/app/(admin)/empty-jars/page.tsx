import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export default async function EmptyJarsPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: balances } = await supabase
    .from("customer_empty_balance")
    .select("customer_id, empty_balance, customer:customers(name, mobile, route:routes(name))")
    .order("empty_balance", { ascending: false });

  const withCustomers = (balances ?? []).filter((b) => Number(b.empty_balance) > 0);
  const totalEmpty = withCustomers.reduce((s, b) => s + Number(b.empty_balance), 0);
  const highBalance = withCustomers.filter((b) => Number(b.empty_balance) >= 10);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Empty Jars</h1>
      <div className="card text-center">
        <p className="text-xs text-teal-500">Total Empty Jars With Customers</p>
        <p className="text-2xl font-bold">{totalEmpty}</p>
      </div>

      {highBalance.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-sm font-semibold text-amber-600 mb-1">⚠ Unusually High Balance (10+)</p>
          {highBalance.map((b: any) => (
            <p key={b.customer_id} className="text-sm">{b.customer.name}: {b.empty_balance} jars</p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {withCustomers.map((b: any) => (
          <Link key={b.customer_id} href={`/customers/${b.customer_id}`} className="card flex justify-between">
            <div>
              <p className="font-medium">{b.customer.name}</p>
              <p className="text-xs text-teal-500">{b.customer.mobile} {b.customer.route?.name ? `• ${b.customer.route.name}` : ""}</p>
            </div>
            <p className="font-semibold">{b.empty_balance} jars</p>
          </Link>
        ))}
        {withCustomers.length === 0 && <p className="text-teal-500 text-center py-10">No empty jars pending with customers.</p>}
      </div>
    </div>
  );
}
