import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatRupees } from "@/lib/ledger";

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs text-teal-500 font-medium">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-clay" : "text-ink"}`}>{value}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  await requireAdmin();
  const supabase = createClient();
  const settings = await getSettings();

  const date = searchParams.date || new Date().toISOString().slice(0, 10);

  const { data: dayDeliveries } = await supabase
    .from("deliveries")
    .select("full_delivered, empty_received, amount_due, amount_paid, payment_method, rate")
    .eq("delivery_date", date);

  const { data: dayPlan } = await supabase
    .from("daily_delivery_plan")
    .select("expected_quantity, adjusted_quantity, status")
    .eq("delivery_date", date);

  const { data: outstandingRows } = await supabase
    .from("customer_payment_balance")
    .select("outstanding");

  const del = dayDeliveries ?? [];
  const plan = dayPlan ?? [];

  const jarsPlanned = plan.reduce((s, p) => s + (p.adjusted_quantity ?? p.expected_quantity), 0);
  const jarsDelivered = del.reduce((s, d) => s + d.full_delivered, 0);
  const sales15 = del.filter((d) => Number(d.rate) === 15).reduce((s, d) => s + d.amount_due, 0);
  const sales20 = del.filter((d) => Number(d.rate) === 20).reduce((s, d) => s + d.amount_due, 0);
  const totalSales = del.reduce((s, d) => s + d.amount_due, 0);
  const purchaseCost = jarsDelivered * (settings.purchase_price_per_jar ?? 7);
  const cash = del.filter((d) => d.payment_method === "cash").reduce((s, d) => s + d.amount_paid, 0);
  const upi = del.filter((d) => d.payment_method === "upi").reduce((s, d) => s + d.amount_paid, 0);
  const emptyCollected = del.reduce((s, d) => s + d.empty_received, 0);
  const pendingTotal = (outstandingRows ?? []).reduce((s, r) => s + Number(r.outstanding), 0);

  // monthly summary
  const monthStart = date.slice(0, 7) + "-01";
  const { data: monthDeliveries } = await supabase
    .from("deliveries")
    .select("full_delivered, amount_due")
    .gte("delivery_date", monthStart)
    .lte("delivery_date", date);
  const { data: monthExpenses } = await supabase
    .from("expenses")
    .select("category, amount")
    .gte("expense_date", monthStart)
    .lte("expense_date", date);

  const monthJars = (monthDeliveries ?? []).reduce((s, d) => s + d.full_delivered, 0);
  const monthRevenue = (monthDeliveries ?? []).reduce((s, d) => s + d.amount_due, 0);
  const monthPurchaseCost = monthJars * (settings.purchase_price_per_jar ?? 7);
  const driverSalary = (monthExpenses ?? []).filter((e) => e.category === "driver_salary").reduce((s, e) => s + e.amount, 0);
  const khalasiSalary = (monthExpenses ?? []).filter((e) => e.category === "khalasi_salary").reduce((s, e) => s + e.amount, 0);
  const fuel = (monthExpenses ?? []).filter((e) => e.category === "fuel").reduce((s, e) => s + e.amount, 0);
  const otherExp = (monthExpenses ?? [])
    .filter((e) => !["driver_salary", "khalasi_salary", "fuel"].includes(e.category))
    .reduce((s, e) => s + e.amount, 0);
  const monthProfit = monthRevenue - monthPurchaseCost - driverSalary - khalasiSalary - fuel - otherExp;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <form className="flex gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="border border-teal-200 rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" className="text-sm bg-teal-600 text-white rounded-lg px-3 py-2">
            Go
          </button>
        </form>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-teal-600 mb-3 uppercase tracking-wide">
          Today — {date}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Jars Planned" value={String(jarsPlanned)} />
          <SummaryCard label="Jars Delivered" value={String(jarsDelivered)} />
          <SummaryCard label="Remaining" value={String(Math.max(jarsPlanned - jarsDelivered, 0))} />
          <SummaryCard label="₹15 Sales" value={formatRupees(sales15)} />
          <SummaryCard label="₹20 Sales" value={formatRupees(sales20)} />
          <SummaryCard label="Total Sales" value={formatRupees(totalSales)} />
          <SummaryCard label="Purchase Cost" value={formatRupees(purchaseCost)} />
          <SummaryCard label="Cash Collected" value={formatRupees(cash)} />
          <SummaryCard label="UPI Collected" value={formatRupees(upi)} />
          <SummaryCard label="Pending Payments" value={formatRupees(pendingTotal)} accent />
          <SummaryCard label="Empty Jars Collected" value={String(emptyCollected)} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-teal-600 mb-3 uppercase tracking-wide">
          This Month
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Jars Sold" value={String(monthJars)} />
          <SummaryCard label="Revenue" value={formatRupees(monthRevenue)} />
          <SummaryCard label="Purchase Cost" value={formatRupees(monthPurchaseCost)} />
          <SummaryCard label="Driver Salary" value={formatRupees(driverSalary)} />
          <SummaryCard label="Khalasi Salary" value={formatRupees(khalasiSalary)} />
          <SummaryCard label="Fuel" value={formatRupees(fuel)} />
          <SummaryCard label="Other Expenses" value={formatRupees(otherExp)} />
          <SummaryCard
            label="Estimated Profit"
            value={formatRupees(monthProfit)}
            accent={monthProfit < 0}
          />
        </div>
      </section>
    </div>
  );
}
