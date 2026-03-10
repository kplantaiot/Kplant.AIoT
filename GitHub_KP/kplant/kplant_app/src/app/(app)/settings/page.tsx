import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="max-w-sm mx-auto px-4 pt-6">
      <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
        Ajustes
      </h1>
      <SettingsClient email={user!.email ?? ""} ownerName={profile?.owner_name ?? ""} />
    </div>
  );
}
