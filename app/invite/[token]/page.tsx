import "@/components/workspace-panel.css";

import Link from "next/link";
import { auth } from "@/auth";
import { InviteAcceptButton } from "@/components/invite-accept-button";
import { findWorkspaceInviteByToken, getWorkspaceMembership } from "@/lib/db";
import { validateInviteRedemption } from "@/lib/workspace-policy";
import { workspaceInitials, workspaceRoleMeta } from "@/lib/workspaces";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Convite" };

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const session = await auth();
  const found = await findWorkspaceInviteByToken(token);

  if (!found) {
    return (
      <main className="invite-screen">
        <section className="invite-card">
          <h1>Convite não encontrado</h1>
          <p>Este link não existe mais. Peça um novo convite a quem comanda o porto.</p>
          <Link href="/">Voltar para a ponte</Link>
        </section>
      </main>
    );
  }

  const membership = session?.user?.id
    ? await getWorkspaceMembership(found.workspace.id, session.user.id)
    : null;
  const state = validateInviteRedemption(found.invite, { alreadyMember: Boolean(membership) });

  return (
    <main className="invite-screen">
      <section className="invite-card">
        <span className="invite-card__mark" aria-hidden="true">
          {workspaceInitials(found.workspace.name)}
        </span>
        <h1>{found.workspace.name}</h1>
        <p>
          Você foi convidado a embarcar como{" "}
          <strong>{workspaceRoleMeta[found.invite.role].label.toLowerCase()}</strong>.{" "}
          {workspaceRoleMeta[found.invite.role].blurb}.
        </p>
        {state.ok ? (
          <InviteAcceptButton token={token} />
        ) : (
          <>
            <p>{state.error}</p>
            <Link href="/">Ir para a ponte</Link>
          </>
        )}
      </section>
    </main>
  );
}
