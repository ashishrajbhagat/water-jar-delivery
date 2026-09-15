import { createClient } from "@/lib/supabase/server";

export type SettingsMap = Record<string, number>;

/** Loads all editable business settings (purchase price, salaries, etc.) as a key->value map. */
export async function getSettings(): Promise<SettingsMap> {
  const supabase = createClient();
  const { data } = await supabase.from("settings").select("key, value");
  const map: SettingsMap = {};
  for (const row of data ?? []) map[row.key] = Number(row.value);
  return map;
}
