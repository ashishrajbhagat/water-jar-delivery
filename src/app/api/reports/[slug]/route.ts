import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "No data\n";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

function csvResponse(rows: Record<string, unknown>[], filename: string) {
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

// GET /api/reports/[slug] — generates and downloads a CSV report.
// All the heavy lifting (aggregation) is done here rather than duplicated in each
// admin page, so the same numbers on-screen and in the exported file always match.
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  await requireAdmin();
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const today = new Date().toISOString().slice(0, 10);

  switch (params.slug) {
    case "daily-sales": {
      const { data } = await supabase.from("daily_summary").select("*").order("delivery_date", { ascending: false });
      return csvResponse(data ?? [], "daily-sales");
    }

    case "monthly-sales": {
      const { data } = await supabase
        .from("deliveries")
        .select("delivery_date, full_delivered, amount_due, amount_paid")
        .gte("delivery_date", monthStart);
      const byMonth: Record<string, { jars: number; revenue: number; collected: number }> = {};
      for (const d of data ?? []) {
        const m = d.delivery_date.slice(0, 7);
        byMonth[m] ??= { jars: 0, revenue: 0, collected: 0 };
        byMonth[m].jars += d.full_delivered;
        byMonth[m].revenue += d.amount_due;
        byMonth[m].collected += d.amount_paid;
      }
      const rows = Object.entries(byMonth).map(([month, v]) => ({ month, ...v }));
      return csvResponse(rows, "monthly-sales");
    }

    case "customer-sales": {
      const { data } = await supabase
        .from("deliveries")
        .select("customer_id, full_delivered, amount_due, customer:customers(name)");
      const byCustomer: Record<string, { name: string; jars: number; revenue: number }> = {};
      for (const d of (data ?? []) as any[]) {
        byCustomer[d.customer_id] ??= { name: d.customer?.name ?? "", jars: 0, revenue: 0 };
        byCustomer[d.customer_id].jars += d.full_delivered;
        byCustomer[d.customer_id].revenue += d.amount_due;
      }
      return csvResponse(Object.values(byCustomer), "customer-wise-sales");
    }

    case "area-sales": {
      const { data } = await supabase
        .from("deliveries")
        .select("full_delivered, amount_due, customer:customers(route:routes(name))");
      const byRoute: Record<string, { jars: number; revenue: number }> = {};
      for (const d of (data ?? []) as any[]) {
        const route = d.customer?.route?.name ?? "Unassigned";
        byRoute[route] ??= { jars: 0, revenue: 0 };
        byRoute[route].jars += d.full_delivered;
        byRoute[route].revenue += d.amount_due;
      }
      const rows = Object.entries(byRoute).map(([route, v]) => ({ route, ...v }));
      return csvResponse(rows, "area-wise-sales");
    }

    case "payment-outstanding": {
      const { data } = await supabase
        .from("customer_payment_balance")
        .select("outstanding, customer:customers(name, mobile)")
        .gt("outstanding", 0)
        .order("outstanding", { ascending: false });
      const rows = ((data ?? []) as any[]).map((r) => ({
        customer: r.customer?.name, mobile: r.customer?.mobile, outstanding: r.outstanding,
      }));
      return csvResponse(rows, "payment-outstanding");
    }

    case "empty-jars": {
      const { data } = await supabase
        .from("customer_empty_balance")
        .select("empty_balance, customer:customers(name, mobile)")
        .gt("empty_balance", 0)
        .order("empty_balance", { ascending: false });
      const rows = ((data ?? []) as any[]).map((r) => ({
        customer: r.customer?.name, mobile: r.customer?.mobile, empty_jars: r.empty_balance,
      }));
      return csvResponse(rows, "empty-jars-with-customers");
    }

    case "driver-collection": {
      const { data } = await supabase
        .from("deliveries")
        .select("delivery_date, driver_id, amount_paid, payment_method, driver:profiles(name)")
        .gte("delivery_date", monthStart);
      const byDriver: Record<string, { name: string; cash: number; upi: number }> = {};
      for (const d of (data ?? []) as any[]) {
        byDriver[d.driver_id] ??= { name: d.driver?.name ?? "", cash: 0, upi: 0 };
        if (d.payment_method === "cash") byDriver[d.driver_id].cash += d.amount_paid;
        if (d.payment_method === "upi") byDriver[d.driver_id].upi += d.amount_paid;
      }
      return csvResponse(Object.values(byDriver), "driver-collection");
    }

    case "profit-loss": {
      const { data: settingsRows } = await supabase.from("settings").select("key, value");
      const settings: Record<string, number> = {};
      for (const s of settingsRows ?? []) settings[s.key] = Number(s.value);

      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("full_delivered, amount_due")
        .gte("delivery_date", monthStart);
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", monthStart);

      const jars = (deliveries ?? []).reduce((s, d) => s + d.full_delivered, 0);
      const revenue = (deliveries ?? []).reduce((s, d) => s + d.amount_due, 0);
      const purchaseCost = jars * (settings.purchase_price_per_jar ?? 7);
      const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0) + purchaseCost;

      return csvResponse(
        [{ period: monthStart.slice(0, 7), revenue, purchase_cost: purchaseCost, other_expenses: totalExpenses - purchaseCost, net_profit: revenue - totalExpenses }],
        "profit-loss"
      );
    }

    default:
      return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }
}
