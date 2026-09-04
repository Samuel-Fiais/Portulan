import Link from "next/link";
import { ArrowLeft, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import type { PublicAccessDenied } from "@/lib/documents";

const messages: Record<Exclude<PublicAccessDenied, "not_found">, { title: string; description: string }> = {
  document_disabled: {
    title: "Este documento foi desativado.",
    description: "O acesso público a este documento foi interrompido pelo responsável.",
  },
  release_disabled: {
    title: "Esta versão foi desativada.",
    description: "Esta versão fixa não está mais disponível para consulta pública.",
  },
  no_enabled_release: {
    title: "Nenhuma versão pública disponível.",
    description: "Este documento não possui versões publicadas ativas no momento.",
  },
};

export function PublicDocumentUnavailable({ reason }: { reason: Exclude<PublicAccessDenied, "not_found"> }) {
  const message = messages[reason];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <BrandMark />
      <ShieldOff className="size-10 text-muted-foreground" />
      <div>
        <h1 className="font-mono text-2xl font-bold">{message.title}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{message.description}</p>
      </div>
      <Button asChild>
        <Link href="/biblioteca">
          <ArrowLeft />
          Voltar à biblioteca
        </Link>
      </Button>
    </main>
  );
}
