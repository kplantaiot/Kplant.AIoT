import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AppNav } from "./_components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen" style={{ background: "var(--color-sage-ivory)" }}>
      <AppNav admin={isAdmin(user.email)} />
      <main className="pb-24 md:pb-8 md:pt-2">
        {children}
      </main>
    </div>
  );
}
