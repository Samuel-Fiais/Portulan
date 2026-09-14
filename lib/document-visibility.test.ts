import assert from "node:assert/strict";
import test from "node:test";
import { allowsAnonymousPublishedRead } from "./documents.ts";

test("carta em camarote não é legível sem login", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: false, visibility: "private", userId: "user-1" }),
    false,
  );
});

test("carta aberta só ao porto não vale para visitante anônimo", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: false, visibility: "workspace", userId: "user-1" }),
    false,
  );
});

test("mar aberto permite leitura anônima", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: false, visibility: "public", userId: "user-1" }),
    true,
  );
});

test("carta desativada nunca é legível anonimamente", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: true, visibility: "public", userId: "user-1" }),
    false,
  );
});

test("carta legada sem cartógrafo permanece legível no link", () => {
  assert.equal(
    allowsAnonymousPublishedRead({ disabled: false, visibility: "private", userId: null }),
    true,
  );
});
