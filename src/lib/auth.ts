import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Profile = {
  id: string;
  role: "admin" | "driver";
  name: string;
  phone: string | null;
  active: boolean;
};

/** Gets the logged-in user's profile, or redirects to /login if not signed in. */
export async function requireUser(): Promise<Profile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.active) redirect("/login");

  return profile as Profile;
}

/** Same as requireUser, but redirects non-admins to the driver home. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "admin") redirect("/today");
  return profile;
}
