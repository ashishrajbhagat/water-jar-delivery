import { requireAdmin } from "@/lib/auth";

const REPORTS = [
  ["daily-sales", "Daily Sales"],
  ["monthly-sales", "Monthly Sales"],
  ["customer-sales", "Customer-wise Sales"],
  ["area-sales", "Area-wise Sales"],
  ["payment-outstanding", "Payment Outstanding"],
  ["empty-jars", "Empty Jars With Customers"],
  ["driver-collection", "Driver Collection"],
  ["profit-loss", "Profit / Loss"],
];

export default async function ReportsPage() {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>
      <p className="text-sm text-teal-500">Export any report as CSV for Excel.</p>
      <div className="space-y-2">
        {REPORTS.map(([slug, label]) => (
          <a
            key={slug}
            href={`/api/reports/${slug}`}
            className="card flex justify-between items-center block"
          >
            <span className="font-medium">{label}</span>
            <span className="text-teal-500 text-sm">Download CSV →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
