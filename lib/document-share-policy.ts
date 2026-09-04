import type { DocumentShareRecord, DocumentShareRole } from "@/lib/documents";

export function normalizeShareEmail(email: string) {
  return email.trim().toLowerCase();
}

type ShareInviteInput = {
  email: string;
  role: DocumentShareRole;
  ownerId: string | null;
  ownerEmail?: string | null;
  inviteeUserId?: string | null;
  existingShares: Pick<DocumentShareRecord, "email" | "role" | "userId">[];
};

export function validateShareInvite(input: ShareInviteInput): { ok: true } | { ok: false; error: string } {
  const email = normalizeShareEmail(input.email);

  if (!input.ownerId) {
    return { ok: false, error: "Este documento não pode ser compartilhado." };
  }

  if (input.ownerEmail && normalizeShareEmail(input.ownerEmail) === email) {
    return { ok: false, error: "O responsável do documento já tem acesso." };
  }

  if (input.inviteeUserId && input.inviteeUserId === input.ownerId) {
    return { ok: false, error: "O responsável do documento já tem acesso." };
  }

  const existing = input.existingShares.find((share) => normalizeShareEmail(share.email) === email);
  if (existing) {
    return { ok: false, error: "Esta pessoa já tem acesso. Altere o papel na lista abaixo." };
  }

  void input.role;
  return { ok: true };
}

export function validateShareRoleUpdate(
  currentRole: DocumentShareRole,
  nextRole: DocumentShareRole,
): { ok: true } | { ok: false; error: string } {
  if (currentRole === nextRole) {
    return { ok: false, error: "Esta pessoa já tem esse papel." };
  }
  return { ok: true };
}
