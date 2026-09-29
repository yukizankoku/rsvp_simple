import { redirect } from "next/navigation";
import { PublicShell } from "@/components/EventHeader";
import { LoginForm } from "@/components/LoginForm";
import { isAdmin } from "@/lib/auth";
import { eventInfo } from "@/lib/event";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <PublicShell>
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Admin</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{eventInfo().name}</h1>
      </header>
      <LoginForm />
    </PublicShell>
  );
}
