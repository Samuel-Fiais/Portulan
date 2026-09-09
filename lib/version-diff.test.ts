import assert from "node:assert/strict";
import test from "node:test";
import {
  compareVersions,
  draftDiffSource,
  formatVersionDiffSummaryStats,
  releaseDiffSource,
  releaseSideId,
  resolveRestoreableRelease,
  resolveVersionDiffSource,
  versionDiffContentSummary,
} from "./version-diff.ts";

const baseRelease = {
  id: "release-1",
  documentId: "doc-1",
  version: 1,
  title: "Título publicado",
  summary: "Resumo",
  templateId: "tpl-1",
  templateName: "Default",
  primaryColor: "#111",
  secondaryColor: "#222",
  logoUrl: null,
  author: "Autor",
  team: "Time",
  tags: ["alpha"],
  content: "## Intro\n\nLinha A\nLinha B",
  publishedAt: "2026-01-01T00:00:00.000Z",
  disabled: false,
  publishedByUserId: null,
  publishedByLogin: null,
  publishedByName: null,
  publishedByAvatarUrl: null,
};

const baseDocument = {
  id: "doc-1",
  slug: "doc-1",
  title: "Título rascunho",
  summary: "Resumo",
  templateId: "tpl-1",
  templateName: "Default",
  primaryColor: "#111",
  secondaryColor: "#222",
  logoUrl: null,
  status: "draft" as const,
  author: "Autor",
  team: "Time",
  tags: ["alpha", "beta"],
  content: "## Intro\n\nLinha A\nLinha C",
  version: 1,
  userId: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  publishedAt: null,
  disabled: false,
};

test("compareVersions detecta metadados e linhas alteradas", () => {
  const result = compareVersions(releaseDiffSource(baseRelease), draftDiffSource(baseDocument));

  assert.equal(result.hasChanges, true);
  assert.deepEqual(
    result.fieldChanges.map((change) => change.key),
    ["title", "tags"],
  );
  assert.deepEqual(
    result.contentLines.filter((line) => line.type !== "unchanged"),
    [
      { type: "removed", line: "Linha B" },
      { type: "added", line: "Linha C" },
    ],
  );
});

test("compareVersions retorna idêntico para snapshots iguais", () => {
  const result = compareVersions(releaseDiffSource(baseRelease), releaseDiffSource(baseRelease));
  assert.equal(result.hasChanges, false);
  assert.equal(result.fieldChanges.length, 0);
  assert.ok(result.contentLines.every((line) => line.type === "unchanged"));
});

test("resolveVersionDiffSource resolve rascunho e release", () => {
  assert.equal(resolveVersionDiffSource("draft", baseDocument, [baseRelease])?.label, "Rascunho atual");
  assert.equal(
    resolveVersionDiffSource(releaseSideId(baseRelease.id), baseDocument, [baseRelease])?.label,
    "v1",
  );
  assert.equal(resolveVersionDiffSource(releaseSideId("missing"), baseDocument, [baseRelease]), null);
});

test("versionDiffContentSummary conta linhas adicionadas e removidas", () => {
  const result = compareVersions(releaseDiffSource(baseRelease), draftDiffSource(baseDocument));
  assert.deepEqual(versionDiffContentSummary(result.contentLines), { added: 1, removed: 1 });
});

test("formatVersionDiffSummaryStats resume alterações", () => {
  assert.equal(formatVersionDiffSummaryStats(2, { added: 3, removed: 1 }, true), "+3 −1 linhas · 2 metadados");
  assert.equal(formatVersionDiffSummaryStats(0, { added: 0, removed: 0 }, false), "Sem alterações");
});

test("resolveRestoreableRelease prioriza release quando um lado é rascunho", () => {
  const releaseSide = releaseSideId(baseRelease.id);
  assert.equal(resolveRestoreableRelease("draft", releaseSide, [baseRelease])?.id, baseRelease.id);
  assert.equal(resolveRestoreableRelease(releaseSide, "draft", [baseRelease])?.id, baseRelease.id);
  assert.equal(resolveRestoreableRelease("draft", "draft", [baseRelease]), null);
});
