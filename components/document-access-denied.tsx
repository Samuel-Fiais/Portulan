import Link from "next/link";
import { ArrowLeft, LockKeyhole, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

const messages = {
  unauthenticated: {
    title: "Esta carta é privada.",
    description:
      "Faça login para acessar cartas compartilhadas com você. Convites por e-mail são vinculados automaticamente ao entrar com o mesmo e-mail.",
    action: { href: "/login", label: "Entrar", icon: LogIn },
  },
  forbidden: {
    title: "Você não tem acesso a esta carta.",
    description:
      "Peça ao cartógrafo para compartilhar a carta com o e-mail da sua conta. Convites pendentes só funcionam após login com o mesmo e-mail.",
    action: { href: "/library", label: "Voltar à cartoteca", icon: ArrowLeft },
  },
} as const;

export function DocumentAccessDenied({
  reason,
  callbackUrl,
}: {
  reason: keyof typeof messages;
  callbackUrl?: string;
}) {
  const message = messages[reason];
  const ActionIcon = message.action.icon;
  const href =
    reason === "unauthenticated" && callbackUrl?.startsWith("/")
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : message.action.href;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <BrandMark />
      <LockKeyhole className="size-10 text-muted-foreground" />
      <div>
        <h1 className="font-mono text-2xl font-bold">{message.title}</h1>
        <p className="mt-2 max-w-lg text-muted-foreground">{message.description}</p>
      </div>
      <Button asChild>
        <Link href={href}>
          <ActionIcon />
          {message.action.label}
        </Link>
      </Button>
    </main>
  );
}
