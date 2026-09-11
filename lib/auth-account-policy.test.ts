import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canDisconnectMethod,
  decideGitHubSignIn,
  decidePasswordRegisterConflict,
  fallbackLoginSeed,
  isEmailIdentifier,
  nextLoginCandidate,
  normalizeHandle,
  validateDisplayName,
  validateHandle,
  validatePassword,
} from "./auth-account-policy.ts";

test("normalizeHandle e isEmailIdentifier", () => {
  assert.equal(normalizeHandle("  Ana.Silva "), "ana.silva");
  assert.equal(isEmailIdentifier("ana@empresa.com"), true);
  assert.equal(isEmailIdentifier("ana.silva"), false);
});

test("validateHandle aceita handle válido e rejeita inválido", () => {
  assert.equal(validateHandle("ana").ok, true);
  assert.equal(validateHandle("Ana_01").ok, true);
  assert.equal(validateHandle("ab").ok, false);
  assert.equal(validateHandle("-ana").ok, false);
  assert.equal(validateHandle("ana space").ok, false);
});

test("validatePassword exige pelo menos 8 caracteres", () => {
  assert.equal(validatePassword("1234567").ok, false);
  assert.equal(validatePassword("12345678").ok, true);
  assert.equal(validatePassword("a".repeat(129)).ok, false);
});

test("validateDisplayName", () => {
  assert.equal(validateDisplayName("A").ok, false);
  assert.equal(validateDisplayName("Ana").ok, true);
});

test("cadastro com senha não mescla em silêncio", () => {
  assert.equal(
    decidePasswordRegisterConflict({
      existingByLogin: { id: "1" },
      existingByEmail: null,
    }).ok,
    false,
  );
  assert.equal(
    decidePasswordRegisterConflict({
      existingByLogin: null,
      existingByEmail: { id: "1" },
    }).ok,
    false,
  );
  assert.equal(
    decidePasswordRegisterConflict({
      existingByLogin: null,
      existingByEmail: null,
    }).ok,
    true,
  );
});

test("login GitHub anexa a conta sem GitHub com o mesmo e-mail", () => {
  const result = decideGitHubSignIn({
    existingByGithub: null,
    existingByEmail: { id: "pwd-1", githubId: null },
    linkUserId: null,
  });
  assert.deepEqual(result, { ok: true, action: "attach", userId: "pwd-1" });
});

test("login GitHub recusa e-mail já ligado a outro GitHub", () => {
  const result = decideGitHubSignIn({
    existingByGithub: null,
    existingByEmail: { id: "other", githubId: "99" },
    linkUserId: null,
  });
  assert.equal(result.ok, false);
});

test("login GitHub usa a conta do github_id", () => {
  const result = decideGitHubSignIn({
    existingByGithub: { id: "gh-1" },
    existingByEmail: { id: "gh-1", githubId: "1" },
    linkUserId: null,
  });
  assert.deepEqual(result, { ok: true, action: "use", userId: "gh-1" });
});

test("conectar GitHub logado recusa se o GitHub é de outra conta", () => {
  const result = decideGitHubSignIn({
    existingByGithub: { id: "other" },
    existingByEmail: null,
    linkUserId: "me",
  });
  assert.equal(result.ok, false);
});

test("conectar GitHub logado anexa quando livre", () => {
  const result = decideGitHubSignIn({
    existingByGithub: null,
    existingByEmail: null,
    linkUserId: "me",
  });
  assert.deepEqual(result, { ok: true, action: "attach", userId: "me" });
});

test("não desliga o último método", () => {
  assert.equal(canDisconnectMethod({ hasGithub: true, hasPassword: false }, "github").ok, false);
  assert.equal(canDisconnectMethod({ hasGithub: false, hasPassword: true }, "password").ok, false);
  assert.equal(canDisconnectMethod({ hasGithub: true, hasPassword: true }, "github").ok, true);
  assert.equal(canDisconnectMethod({ hasGithub: true, hasPassword: true }, "password").ok, true);
});

test("nextLoginCandidate gera sufixo único", () => {
  assert.equal(fallbackLoginSeed("Octocat"), "octocat");
  assert.equal(nextLoginCandidate("octocat", 1), "octocat");
  assert.equal(nextLoginCandidate("octocat", 2), "octocat-2");
});
