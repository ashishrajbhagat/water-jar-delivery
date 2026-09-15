import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { createRoute, updateCustomerRouteOrder } from "@/lib/actions/routes";
import { SubmitButton } from "@/components/SubmitButton";

export default async function RoutesPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: routes } = await supabase.from("routes").select("*").order("name");
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, route_id, route_order")
    .order("route_order");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Routes</h1>

      <details className="card">
        <summary className="font-semibold cursor-pointer">+ Add Route</summary>
        <form action={createRoute} className="space-y-3 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Route name</label>
            <input name="name" required className="input" placeholder="Route 1" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Areas (comma separated)</label>
            <input name="areas" className="input" placeholder="Area A, Area B, Area C" />
          </div>
          <SubmitButton pendingText="Saving...">Save Route</SubmitButton>
        </form>
      </details>

      {(routes ?? []).map((r) => {
        const routeCustomers = (customers ?? []).filter((c) => c.route_id === r.id);
        return (
          <div key={r.id} className="card">
            <p className="font-semibold">{r.name}</p>
            <p className="text-sm text-teal-500 mb-3">{(r.areas ?? []).join(", ")}</p>
            <div className="space-y-2">
              {routeCustomers.map((c) => (
                <form key={c.id} action={updateCustomerRouteOrder} className="flex items-center justify-between gap-2 text-sm">
                  <input type="hidden" name="customer_id" value={c.id} />
                  <span>{c.name}</span>
                  <div className="flex items-center gap-1">
                    <input
                      name="route_order"
                      type="number"
                      defaultValue={c.route_order}
                      className="w-16 border border-teal-200 rounded-lg px-2 py-1"
                    />
                    <button type="submit" className="text-teal-600 text-xs font-semibold px-2">Set</button>
                  </div>
                </form>
              ))}
              {routeCustomers.length === 0 && (
                <p className="text-xs text-teal-400">No customers assigned. Assign from a customer's edit page.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
