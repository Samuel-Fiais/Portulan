import Link from "next/link";
import { ArrowLeft, LockKeyhole, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

const messages = {
  unauthenticated: {
    title: "Este documento é privado.",
    description:
      "Faça login com GitHub para acessar documentos compartilhados com você. Se ainda não tem conta Portulan, entre uma vez — convites por e-mail são vinculados automaticamente ao seu GitHub.",
    action: { href: "/login", label: "Entrar com GitHub", icon: LogIn },
  },
  forbidden: {
    title: "Você não tem acesso a este documento.",
    description:
      "Peça ao responsável para compartilhar o documento com o e-mail vinculado à sua conta GitHub. Convites pendentes só funcionam após login com o mesmo e-mail.",
    action: { href: "/", label: "Voltar à biblioteca", icon: ArrowLeft },
  },
} as const;

export function DocumentAccessDenied({ reason }: { reason: keyof typeof messages }) {
  const message = messages[reason];
  const ActionIcon = message.action.icon;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <BrandMark />
      <LockKeyhole className="size-10 text-muted-foreground" />
      <div>
        <h1 className="font-mono text-2xl font-bold">{message.title}</h1>
        <p className="mt-2 max-w-lg text-muted-foreground">{message.description}</p>
      </div>
      <Button asChild>
        <Link href={message.action.href}>
          <ActionIcon />
          {message.action.label}
        </Link>
      </Button>
    </main>
  );
}
