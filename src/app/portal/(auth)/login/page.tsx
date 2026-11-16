import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/portal/AuthForm";
import { getClient } from "@/lib/auth/session";
import { safeNext } from "@/lib/portal";

export const metadata: Metadata = { title: "Client portal" };

export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getClient()) redirect(next);
  return <AuthForm mode="login" next={next} />;
}
