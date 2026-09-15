import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";

async function signIn(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-teal-700">Jal Seva</h1>
        <p className="text-teal-600 mt-1">Water Jar Delivery</p>
      </div>

      <form action={signIn} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Mobile / Email</label>
          <input name="email" type="text" required className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Password</label>
          <input name="password" type="password" required className="input" placeholder="••••••••" />
        </div>

        {searchParams.error && (
          <p className="text-clay text-sm bg-red-50 rounded-lg p-3">{searchParams.error}</p>
        )}

        <SubmitButton pendingText="Logging in...">Log In</SubmitButton>
      </form>

      <p className="text-center text-sm text-teal-600/70 mt-8">
        Accounts are created by the Admin from Settings → Users.
      </p>
    </main>
  );
}
