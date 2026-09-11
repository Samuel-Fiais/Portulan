import assert from "node:assert/strict";
import test from "node:test";
import { allowsAnonymousPublishedRead } from "./documents.ts";

test("documento privado com dono não é legível sem login", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: false, isPublic: false, userId: "user-1" }),
    false,
  );
});

test("acesso público ligado permite leitura anônima", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: false, isPublic: true, userId: "user-1" }),
    true,
  );
});

test("documento desativado nunca é legível anonimamente", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: true, isPublic: true, userId: "user-1" }),
    false,
  );
});

test("documento legado sem responsável permanece legível no link", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: false, isPublic: false, userId: null }),
    true,
  );
});
