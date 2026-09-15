import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import Link from "next/link";

export default async function TodayPage() {
  await requireUser();
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: plan } = await supabase
    .from("daily_delivery_plan")
    .select(
      `id, expected_quantity, adjusted_quantity, status,
       customer:customers ( id, name, address, mobile, selling_price, route_order, notes )`
    )
    .eq("delivery_date", today)
    .order("customer(route_order)", { ascending: true });

  const rows = (plan ?? []) as unknown as {
    id: string;
    expected_quantity: number;
    adjusted_quantity: number | null;
    status: string;
    customer: {
      id: string; name: string; address: string; mobile: string;
      selling_price: number; route_order: number; notes: string | null;
    };
  }[];

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  // pull outstanding + empty balance for each customer shown
  const customerIds = rows.map((r) => r.customer.id);
  const { data: balances } = await supabase
    .from("customer_payment_balance")
    .select("customer_id, outstanding")
    .in("customer_id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: emptyBalances } = await supabase
    .from("customer_empty_balance")
    .select("customer_id, empty_balance")
    .in("customer_id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]);

  const outstandingMap = new Map((balances ?? []).map((b) => [b.customer_id, b.outstanding]));
  const emptyMap = new Map((emptyBalances ?? []).map((b) => [b.customer_id, b.empty_balance]));

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Aaj ki Delivery</h1>
        <span className="text-sm text-teal-600">{pending.length} baaki</span>
      </div>

      {rows.length === 0 && (
        <p className="text-teal-600 text-center py-10">Aaj ke liye koi delivery plan nahi hai.</p>
      )}

      <div className="space-y-3">
        {pending.map((r) => (
          <Link key={r.id} href={`/delivery/${r.id}`} className="card block">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-lg">{r.customer.name}</p>
                <p className="text-sm text-teal-600">{r.customer.address}</p>
              </div>
              <span className="bg-amber-100 text-amber-600 text-xs font-semibold rounded-full px-3 py-1">
                {r.adjusted_quantity ?? r.expected_quantity} jars
              </span>
            </div>
            <div className="flex gap-4 mt-3 text-sm text-teal-700">
              <span>₹{r.customer.selling_price}/jar</span>
              {(outstandingMap.get(r.customer.id) ?? 0) > 0 && (
                <span className="text-clay font-medium">
                  Pending ₹{outstandingMap.get(r.customer.id)}
                </span>
              )}
              <span>Empty: {emptyMap.get(r.customer.id) ?? 0}</span>
            </div>
            {r.customer.notes && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg p-2">
                {r.customer.notes}
              </p>
            )}
          </Link>
        ))}
      </div>

      {done.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-teal-600 mb-2">Complete ({done.length})</p>
          <div className="space-y-2">
            {done.map((r) => (
              <div key={r.id} className="card flex justify-between items-center opacity-60">
                <p className="font-medium">{r.customer.name}</p>
                <span className="text-xs uppercase font-semibold text-teal-500">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
