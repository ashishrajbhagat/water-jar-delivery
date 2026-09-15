import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/routes", label: "Routes" },
  { href: "/payments", label: "Payments" },
  { href: "/daily-closing", label: "Daily Closing" },
  { href: "/empty-jars", label: "Empty Jars" },
  { href: "/billing", label: "Billing" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen flex flex-col">
      {/* header + nav share ONE sticky wrapper so there's no hardcoded pixel
          offset between them (that was causing overlap/dead-taps on mobile
          when the header's real height didn't match the assumed offset) */}
      <div className="sticky top-0 z-10">
        <header className="bg-teal-700 text-white px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-teal-100">Admin</p>
            <p className="text-lg font-semibold leading-tight">{profile.name}</p>
          </div>
          <form action={signOut}>
            <button className="text-sm bg-teal-800 rounded-lg px-3 py-2">Logout</button>
          </form>
        </header>

        <nav className="bg-white border-b border-teal-100 overflow-x-auto">
          <div className="flex gap-1 px-2 py-1.5 min-w-max">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex-shrink-0 text-sm font-medium text-teal-700 px-3 py-2.5 rounded-lg active:bg-teal-100 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <main className="flex-1 w-full max-w-3xl mx-auto p-4 pb-10">{children}</main>
    </div>
  );
}
