import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <BrandMark />
      <FileQuestion className="size-10 text-muted-foreground" />
      <div><h1 className="font-mono text-2xl font-bold">Documento não encontrado</h1><p className="mt-2 text-muted-foreground">Ele pode ter sido removido ou o endereço está incorreto.</p></div>
      <Button asChild><Link href="/"><ArrowLeft />Voltar à biblioteca</Link></Button>
    </main>
  );
}
