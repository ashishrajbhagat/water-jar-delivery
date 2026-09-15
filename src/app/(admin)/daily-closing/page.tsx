import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logJarStock } from "@/lib/actions/expenses";
import { SubmitButton } from "@/components/SubmitButton";
import { formatRupees } from "@/lib/ledger";

export default async function DailyClosingPage({
  searchParams,
}: {
  searchParams: { date?: string; error?: string };
}) {
  await requireAdmin();
  const supabase = createClient();
  const date = searchParams.date || new Date().toISOString().slice(0, 10);

  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("full_delivered, empty_received, amount_due, amount_paid")
    .eq("delivery_date", date);

  const del = deliveries ?? [];
  const deliveredToday = del.reduce((s, d) => s + d.full_delivered, 0);
  const emptyReceivedToday = del.reduce((s, d) => s + d.empty_received, 0);
  const totalSales = del.reduce((s, d) => s + d.amount_due, 0);
  const totalCollected = del.reduce((s, d) => s + d.amount_paid, 0);
  const outstanding = totalSales - totalCollected;

  // --- Full jar stock reconciliation ---
  // Opening = everything purchased before today, minus everything delivered
  // before today (an all-time running balance, computed as of the start of
  // the selected day rather than stored as a mutable "current stock" field).
  const { data: purchasesBefore } = await supabase
    .from("jar_stock_entries")
    .select("purchased_qty")
    .lt("entry_date", date);
  const { data: deliveredBefore } = await supabase
    .from("deliveries")
    .select("full_delivered")
    .lt("delivery_date", date);
  const { data: stockToday } = await supabase
    .from("jar_stock_entries")
    .select("purchased_qty, empty_sent_qty")
    .eq("entry_date", date);

  const totalPurchasedBefore = (purchasesBefore ?? []).reduce((s, r) => s + r.purchased_qty, 0);
  const totalDeliveredBefore = (deliveredBefore ?? []).reduce((s, r) => s + r.full_delivered, 0);
  const openingFull = totalPurchasedBefore - totalDeliveredBefore;
  const purchasedToday = (stockToday ?? []).reduce((s, r) => s + r.purchased_qty, 0);
  const remainingFull = openingFull + purchasedToday - deliveredToday;

  // --- Empty jar (business-side) reconciliation ---
  // Opening = everything received from customers before today, minus
  // everything sent back for refilling before today.
  const { data: receivedBefore } = await supabase
    .from("deliveries")
    .select("empty_received")
    .lt("delivery_date", date);
  const { data: sentBefore } = await supabase
    .from("jar_stock_entries")
    .select("empty_sent_qty")
    .lt("entry_date", date);

  const totalReceivedBefore = (receivedBefore ?? []).reduce((s, r) => s + r.empty_received, 0);
  const totalSentBefore = (sentBefore ?? []).reduce((s, r) => s + r.empty_sent_qty, 0);
  const openingEmpty = totalReceivedBefore - totalSentBefore;
  const sentToday = (stockToday ?? []).reduce((s, r) => s + r.empty_sent_qty, 0);
  const remainingEmpty = openingEmpty + emptyReceivedToday - sentToday;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Daily Closing — {date}</h1>
      <form className="flex gap-2">
        <input type="date" name="date" defaultValue={date} className="border border-teal-200 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" className="text-sm bg-teal-600 text-white rounded-lg px-3 py-2">Go</button>
      </form>

      {searchParams.error && (
        <p className="text-clay text-sm bg-red-50 rounded-lg p-3">{searchParams.error}</p>
      )}

      <details className="card">
        <summary className="font-semibold cursor-pointer">+ Log Today's Jar Stock</summary>
        <form action={logJarStock} className="space-y-3 mt-4">
          <input type="hidden" name="entry_date" value={date} />
          <div>
            <label className="block text-sm font-medium mb-1">Filled jars purchased today</label>
            <input name="purchased_qty" type="number" min={0} defaultValue={0} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Empty jars sent for refilling today</label>
            <input name="empty_sent_qty" type="number" min={0} defaultValue={0} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <input name="note" className="input" placeholder="e.g. supplier name" />
          </div>
          <SubmitButton pendingText="Saving...">Save Entry</SubmitButton>
        </form>
      </details>

      <div className="card">
        <p className="font-semibold mb-2">Jar Reconciliation</p>
        <div className="flex justify-between text-sm py-1"><span>Opening full jars</span><strong>{openingFull}</strong></div>
        <div className="flex justify-between text-sm py-1"><span>+ Purchased/filled today</span><strong>{purchasedToday}</strong></div>
        <div className="flex justify-between text-sm py-1"><span>− Delivered today</span><strong>{deliveredToday}</strong></div>
        <div className="flex justify-between text-sm py-2 border-t border-teal-100 mt-1">
          <span className="font-medium">= Remaining full jars</span>
          <strong className={remainingFull < 0 ? "text-clay" : ""}>{remainingFull}</strong>
        </div>
        {remainingFull < 0 && (
          <p className="text-xs text-clay bg-red-50 rounded-lg p-2 mt-1">
            ⚠ Negative stock — more jars were delivered than purchased+opening stock can
            account for. Check for an unlogged purchase or a data-entry mistake.
          </p>
        )}
      </div>

      <div className="card">
        <p className="font-semibold mb-2">Empty Jar Reconciliation (business-side)</p>
        <div className="flex justify-between text-sm py-1"><span>Opening empty jars</span><strong>{openingEmpty}</strong></div>
        <div className="flex justify-between text-sm py-1"><span>+ Received from customers today</span><strong>{emptyReceivedToday}</strong></div>
        <div className="flex justify-between text-sm py-1"><span>− Sent for filling today</span><strong>{sentToday}</strong></div>
        <div className="flex justify-between text-sm py-2 border-t border-teal-100 mt-1">
          <span className="font-medium">= Remaining empty jars</span>
          <strong>{remainingEmpty}</strong>
        </div>
      </div>

      <div className="card">
        <p className="font-semibold mb-2">Money Reconciliation</p>
        <div className="flex justify-between text-sm py-1"><span>Total sales</span><strong>{formatRupees(totalSales)}</strong></div>
        <div className="flex justify-between text-sm py-1"><span>Cash + UPI received</span><strong>{formatRupees(totalCollected)}</strong></div>
        <div className="flex justify-between text-sm py-1 border-t border-teal-100 pt-2 mt-1">
          <span>Customer outstanding (today)</span>
          <strong className={outstanding !== 0 ? "text-clay" : ""}>{formatRupees(outstanding)}</strong>
        </div>
        {outstanding !== 0 && (
          <p className="text-xs text-clay bg-red-50 rounded-lg p-2 mt-2">
            ⚠ Mismatch: ₹{Math.abs(outstanding)} {outstanding > 0 ? "not yet collected" : "over-collected"} for {date}.
          </p>
        )}
      </div>
    </div>
  );
}
