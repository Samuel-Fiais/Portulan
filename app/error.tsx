"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center"><AlertTriangle className="size-10 text-destructive" /><div><h1 className="font-mono text-2xl font-bold">Não foi possível abrir o workspace</h1><p className="mt-2 text-muted-foreground">Verifique o acesso ao arquivo SQLite e tente novamente.</p></div><Button onClick={reset}><RotateCcw />Tentar novamente</Button></main>;
}
