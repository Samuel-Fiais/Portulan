"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Anchor, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { acceptWorkspaceInviteAction } from "@/app/workspace-actions";
import { Button } from "@/components/ui/button";

export function InviteAcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await acceptWorkspaceInviteAction(token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Você embarcou em ${result.workspace.name}`);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={accept} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <Anchor />}
      Embarcar no porto
    </Button>
  );
}
