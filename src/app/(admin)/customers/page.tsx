import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireAdmin();
  const supabase = createClient();
  const q = searchParams.q?.trim();

  let query = supabase
    .from("customers")
    .select("id, name, mobile, address, selling_price, regular_quantity, active, route:routes(name)")
    .order("name");

  if (q) {
    query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,address.ilike.%${q}%`);
  }

  const { data: customers } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Customers</h1>
        <Link href="/customers/new" className="bg-teal-600 text-white text-sm font-semibold rounded-lg px-4 py-2">
          + Add Customer
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, mobile, area…"
          className="input"
        />
        <button type="submit" className="bg-teal-600 text-white rounded-xl px-4">Search</button>
      </form>

      <div className="space-y-2">
        {(customers ?? []).map((c: any) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="card block">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{c.name}{!c.active && <span className="text-xs text-clay ml-2">(inactive)</span>}</p>
                <p className="text-sm text-teal-600">{c.address} {c.route?.name ? `• ${c.route.name}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{c.selling_price}</p>
                <p className="text-xs text-teal-500">{c.regular_quantity} jars/day</p>
              </div>
            </div>
          </Link>
        ))}
        {(customers ?? []).length === 0 && (
          <p className="text-teal-500 text-center py-10">No customers found.</p>
        )}
      </div>
    </div>
  );
}
