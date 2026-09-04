import { auth } from "@/auth";
import { TemplatesPanel } from "@/components/templates-panel";
import { listTemplates } from "@/lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  return <TemplatesPanel templates={await listTemplates(userId)} />;
}
