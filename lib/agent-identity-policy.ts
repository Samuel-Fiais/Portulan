export type PolicyResult = { ok: true } | { ok: false; error: string };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

/** RN-110: só o responsável da identidade edita ou emite/revoga a chave. */
export function canManageAgentIdentity(input: { actorId: string; ownerUserId: string }) {
  return input.actorId === input.ownerUserId;
}

export function validateManageAgentIdentity(input: {
  actorId: string;
  ownerUserId: string;
  action: "edit" | "issue_key" | "revoke_key" | "deactivate" | "reactivate" | "delete";
}): PolicyResult {
  if (!canManageAgentIdentity(input)) {
    if (input.action === "issue_key") {
      return deny("Só o responsável deste Agente de Bordo emite a chave.");
    }
    if (input.action === "revoke_key") {
      return deny("Só o responsável deste Agente de Bordo revoga a chave.");
    }
    if (input.action === "deactivate") {
      return deny("Só o responsável deste Agente de Bordo desativa a identidade.");
    }
    if (input.action === "reactivate") {
      return deny("Só o responsável deste Agente de Bordo reativa a identidade.");
    }
    if (input.action === "delete") {
      return deny("Só o responsável deste Agente de Bordo exclui a identidade.");
    }
    return deny("Só o responsável deste Agente de Bordo altera a identidade.");
  }
  return { ok: true };
}

export function validateAgentIdentityLifecycle(input: {
  status: "active" | "inactive";
  action: "issue_key" | "deactivate" | "reactivate" | "delete";
}): PolicyResult {
  if (input.action === "issue_key" && input.status === "inactive") {
    return deny("Reative o Agente de Bordo antes de emitir nova chave.");
  }
  if (input.action === "deactivate" && input.status === "inactive") {
    return deny("Este Agente de Bordo já está desativado.");
  }
  if (input.action === "reactivate" && input.status === "active") {
    return deny("Este Agente de Bordo já está ativo.");
  }
  return { ok: true };
}
