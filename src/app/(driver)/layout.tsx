import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-teal-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs text-teal-100">Namaste,</p>
          <p className="text-lg font-semibold">{profile.name}</p>
        </div>
        <form action={signOut}>
          <button className="text-sm bg-teal-800 rounded-lg px-3 py-2">Logout</button>
        </form>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-10">{children}</main>
    </div>
  );
}
