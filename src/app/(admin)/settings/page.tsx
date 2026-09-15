import { getSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";
import { updateSettings } from "@/lib/actions/expenses";
import { SubmitButton } from "@/components/SubmitButton";

const FIELDS: [string, string, string][] = [
  ["purchase_price_per_jar", "Water Purchase Price (₹/jar)", "Supplier price per jar — used in profit calculation"],
  ["target_jars_per_day", "Target Jars/Day", "Business target, for reference on dashboard"],
  ["driver_salary_monthly", "Driver Salary (₹/month)", ""],
  ["khalasi_salary_monthly", "Khalasi Salary (₹/month)", ""],
  ["breakfast_daily", "Breakfast (₹/day)", ""],
  ["fuel_daily", "Fuel (₹/day)", ""],
];

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <p className="text-sm text-teal-500">
        These values drive the dashboard and profit calculations. Nothing here is hardcoded —
        update anytime as costs or prices change.
      </p>

      <form action={updateSettings} className="card space-y-4">
        {FIELDS.map(([key, label, hint]) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input name={key} type="number" step="0.01" defaultValue={settings[key] ?? 0} className="input" />
            {hint && <p className="text-xs text-teal-400 mt-1">{hint}</p>}
          </div>
        ))}
        <SubmitButton pendingText="Saving...">Save Settings</SubmitButton>
      </form>

      <div className="card">
        <p className="font-semibold text-sm mb-2">Selling Prices</p>
        <p className="text-sm text-teal-500">
          ₹15 / ₹20 / custom are set per customer on their profile — there's no single
          global selling price, since it varies by customer.
        </p>
      </div>

      <div className="card">
        <p className="font-semibold text-sm mb-2">Users (Admin / Driver accounts)</p>
        <p className="text-sm text-teal-500">
          Create driver and admin logins from the Supabase dashboard (Authentication → Users),
          then set their role in the <code>profiles</code> table. A dedicated in-app user
          management screen can be added once you have more than one driver.
        </p>
      </div>
    </div>
  );
}
