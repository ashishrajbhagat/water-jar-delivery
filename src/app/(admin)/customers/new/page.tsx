import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { createCustomer } from "@/lib/actions/customers";
import { SubmitButton } from "@/components/SubmitButton";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const supabase = createClient();
  const { data: routes } = await supabase.from("routes").select("id, name").order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Add Customer</h1>

      {searchParams.error && (
        <p className="text-clay text-sm bg-red-50 rounded-lg p-3">{searchParams.error}</p>
      )}

      <form action={createCustomer} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mobile</label>
          <input name="mobile" className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input name="address" className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Route</label>
          <select name="route_id" className="input">
            <option value="">— none —</option>
            {(routes ?? []).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Selling price (₹)</label>
            <input name="selling_price" type="number" step="0.01" required defaultValue={15} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Regular qty/day</label>
            <input name="regular_quantity" type="number" min={0} required defaultValue={1} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Delivery frequency</label>
            <select name="delivery_frequency" className="input" defaultValue="daily">
              <option value="daily">Daily</option>
              <option value="alternate">Alternate day</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment cycle</label>
            <select name="payment_cycle" className="input" defaultValue="daily">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Custom cycle detail <span className="text-teal-400 font-normal">(only if Custom selected above)</span>
          </label>
          <input name="payment_cycle_custom" className="input" placeholder="e.g. every 10 days, or 1st of every month" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Opening empty jar balance</label>
          <input name="opening_empty_balance" type="number" defaultValue={0} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <input name="notes" className="input" placeholder="Special instructions" />
        </div>
        <SubmitButton pendingText="Saving customer...">Save Customer</SubmitButton>
      </form>
    </div>
  );
}
