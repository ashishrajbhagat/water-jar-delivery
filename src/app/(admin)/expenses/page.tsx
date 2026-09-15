import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { addExpense } from "@/lib/actions/expenses";
import { formatRupees } from "@/lib/ledger";
import { SubmitButton } from "@/components/SubmitButton";

const CATEGORIES = [
  ["driver_salary", "Driver Salary"],
  ["khalasi_salary", "Khalasi Salary"],
  ["fuel", "Fuel"],
  ["vehicle_maintenance", "Vehicle Maintenance"],
  ["jar_replacement", "Jar Replacement"],
  ["electricity", "Electricity"],
  ["breakfast", "Breakfast"],
  ["other", "Other"],
];

export default async function ExpensesPage() {
  await requireAdmin();
  const supabase = createClient();

  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", monthStart)
    .order("expense_date", { ascending: false });

  const total = (expenses ?? []).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Expenses</h1>

      <details className="card">
        <summary className="font-semibold cursor-pointer">+ Add Expense</summary>
        <form action={addExpense} className="space-y-3 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select name="category" className="input" required>
              {CATEGORIES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <input name="amount" type="number" step="0.01" required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <input name="note" className="input" />
          </div>
          <SubmitButton pendingText="Saving...">Save Expense</SubmitButton>
        </form>
      </details>

      <div className="card text-center">
        <p className="text-xs text-teal-500">This Month Total</p>
        <p className="text-2xl font-bold">{formatRupees(total)}</p>
      </div>

      <div className="space-y-2">
        {(expenses ?? []).map((e) => (
          <div key={e.id} className="card flex justify-between text-sm">
            <div>
              <p className="font-medium">{CATEGORIES.find(([v]) => v === e.category)?.[1] ?? e.category}</p>
              <p className="text-teal-500">{e.expense_date} {e.note ? `• ${e.note}` : ""}</p>
            </div>
            <p className="font-semibold">{formatRupees(e.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
