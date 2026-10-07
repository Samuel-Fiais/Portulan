import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageCrew,
  isExternalCollaborator,
  validateCaptaincyTransfer,
  validateCrewInvite,
  validateCrewRemoval,
  validateInviteRedemption,
  validateLeaveWorkspace,
  validateRoleChange,
  validateVisibilityChange,
  validateWorkspaceDeletion,
  validateWorkspaceName,
  shouldCreatePersonalWorkspaceOnBootstrap,
} from "./workspace-policy.ts";

test("tripulante não mexe na tripulação", () => {
  assert.equal(canManageCrew("member"), false);
  assert.equal(canManageCrew("admin"), true);
  assert.equal(canManageCrew("owner"), true);
});

test("nome do porto respeita os limites", () => {
  assert.equal(validateWorkspaceName("A").ok, false);
  assert.equal(validateWorkspaceName("Porto de Lisboa").ok, true);
  assert.equal(validateWorkspaceName("x".repeat(61)).ok, false);
});

test("RN-86: porto inicial só nasce quando a conta ainda não tem porto (idempotente)", () => {
  assert.equal(shouldCreatePersonalWorkspaceOnBootstrap(0), true);
  assert.equal(shouldCreatePersonalWorkspaceOnBootstrap(1), false);
  assert.equal(shouldCreatePersonalWorkspaceOnBootstrap(3), false);
});

test("imediato convida, tripulante não", () => {
  assert.equal(validateCrewInvite({ actorRole: "admin", role: "member" }).ok, true);
  assert.equal(validateCrewInvite({ actorRole: "member", role: "member" }).ok, false);
});

test("papel do capitão não muda por troca de papel", () => {
  const result = validateRoleChange({
    actorId: "a",
    actorRole: "owner",
    targetId: "b",
    targetRole: "owner",
    nextRole: "admin",
  });
  assert.equal(result.ok, false);
});

test("ninguém promove alguém a capitão sem transferir", () => {
  const result = validateRoleChange({
    actorId: "a",
    actorRole: "owner",
    targetId: "b",
    targetRole: "member",
    nextRole: "owner",
  });
  assert.equal(result.ok, false);
});

test("imediato não altera outro imediato", () => {
  const result = validateRoleChange({
    actorId: "a",
    actorRole: "admin",
    targetId: "b",
    targetRole: "admin",
    nextRole: "member",
  });
  assert.equal(result.ok, false);
});

test("capitão promove tripulante a imediato", () => {
  const result = validateRoleChange({
    actorId: "a",
    actorRole: "owner",
    targetId: "b",
    targetRole: "member",
    nextRole: "admin",
  });
  assert.equal(result.ok, true);
});

test("capitão não é removido da tripulação", () => {
  const result = validateCrewRemoval({
    actorId: "a",
    actorRole: "owner",
    targetId: "b",
    targetRole: "owner",
  });
  assert.equal(result.ok, false);
});

test("capitão precisa transferir antes de deixar o porto", () => {
  assert.equal(
    validateLeaveWorkspace({ role: "owner", isPersonal: false, membershipCount: 2 }).ok,
    false,
  );
  assert.equal(
    validateLeaveWorkspace({ role: "member", isPersonal: false, membershipCount: 2 }).ok,
    true,
  );
});

test("porto inicial não é deixado nem excluído", () => {
  assert.equal(
    validateLeaveWorkspace({ role: "member", isPersonal: true, membershipCount: 3 }).ok,
    false,
  );
  assert.equal(
    validateWorkspaceDeletion({ role: "owner", isPersonal: true, documentCount: 0 }).ok,
    false,
  );
});

test("porto com cartas não é excluído", () => {
  assert.equal(
    validateWorkspaceDeletion({ role: "owner", isPersonal: false, documentCount: 2 }).ok,
    false,
  );
  assert.equal(
    validateWorkspaceDeletion({ role: "owner", isPersonal: false, documentCount: 0 }).ok,
    true,
  );
});

test("transferência de capitania exige alguém da tripulação", () => {
  assert.equal(
    validateCaptaincyTransfer({ actorId: "a", actorRole: "owner", targetId: "b", targetRole: null }).ok,
    false,
  );
  assert.equal(
    validateCaptaincyTransfer({ actorId: "a", actorRole: "owner", targetId: "b", targetRole: "member" }).ok,
    true,
  );
});

test("convite revogado, expirado ou esgotado não vale", () => {
  const now = new Date("2026-09-14T12:00:00.000Z");
  assert.equal(validateInviteRedemption(null).ok, false);
  assert.equal(
    validateInviteRedemption({ revokedAt: now.toISOString(), expiresAt: null, maxUses: null, uses: 0 }).ok,
    false,
  );
  assert.equal(
    validateInviteRedemption(
      { revokedAt: null, expiresAt: "2026-09-13T12:00:00.000Z", maxUses: null, uses: 0 },
      { now },
    ).ok,
    false,
  );
  assert.equal(
    validateInviteRedemption({ revokedAt: null, expiresAt: null, maxUses: 2, uses: 2 }, { now }).ok,
    false,
  );
  assert.equal(
    validateInviteRedemption({ revokedAt: null, expiresAt: null, maxUses: 2, uses: 1 }, { now }).ok,
    true,
  );
});

test("quem já é tripulante não reusa o convite", () => {
  const result = validateInviteRedemption(
    { revokedAt: null, expiresAt: null, maxUses: null, uses: 0 },
    { alreadyMember: true },
  );
  assert.equal(result.ok, false);
});

test("carta sem porto não vai para visibilidade de porto", () => {
  assert.equal(
    validateVisibilityChange({ isOwner: true, visibility: "workspace", hasWorkspace: false }).ok,
    false,
  );
  assert.equal(
    validateVisibilityChange({ isOwner: true, visibility: "workspace", hasWorkspace: true }).ok,
    true,
  );
  assert.equal(
    validateVisibilityChange({ isOwner: false, visibility: "public", hasWorkspace: true }).ok,
    false,
  );
});

test("convidado fora da tripulação é externo", () => {
  assert.equal(isExternalCollaborator({ workspaceMemberIds: ["u1"], userId: "u1" }), false);
  assert.equal(isExternalCollaborator({ workspaceMemberIds: ["u1"], userId: "u2" }), true);
  assert.equal(isExternalCollaborator({ workspaceMemberIds: ["u1"], userId: null }), true);
});
