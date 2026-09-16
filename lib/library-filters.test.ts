import assert from "node:assert/strict";
import test from "node:test";
import {
  bibliotecaUrl,
  buildBibliotecaUrl,
  filterDocumentsByOwnership,
  filterDocumentsByStatus,
  isDocumentOwnedByUser,
  parseOwnershipFilter,
  parseStatusFilter,
} from "./library-filters.ts";
import type { DocumentSummary } from "./documents.ts";

const sample: DocumentSummary[] = [
  {
    id: "1",
    slug: "1",
    title: "Draft doc",
    summary: "",
    templateId: "t1",
    templateName: "Default",
    primaryColor: "#000",
    secondaryColor: "#fff",
    logoUrl: null,
    status: "draft",
    author: "",
    team: "",
    tags: [],
    version: 1,
    userId: "u1",
    createdAt: "",
    updatedAt: "",
    publishedAt: null,
    disabled: false,
    isPublic: false,
  },
  {
    id: "2",
    slug: "2",
    title: "Published doc",
    summary: "",
    templateId: "t1",
    templateName: "Default",
    primaryColor: "#000",
    secondaryColor: "#fff",
    logoUrl: null,
    status: "published",
    author: "",
    team: "",
    tags: [],
    version: 1,
    userId: "u1",
    createdAt: "",
    updatedAt: "",
    publishedAt: "",
    disabled: false,
    isPublic: false,
  },
  {
    id: "3",
    slug: "3",
    title: "Shared doc",
    summary: "",
    templateId: "t1",
    templateName: "Default",
    primaryColor: "#000",
    secondaryColor: "#fff",
    logoUrl: null,
    status: "draft",
    author: "",
    team: "",
    tags: [],
    version: 1,
    userId: "u2",
    createdAt: "",
    updatedAt: "",
    publishedAt: null,
    disabled: false,
    isPublic: false,
  },
];

test("parseStatusFilter accepts known statuses and falls back to all", () => {
  assert.equal(parseStatusFilter("draft"), "draft");
  assert.equal(parseStatusFilter("archived"), "archived");
  assert.equal(parseStatusFilter("unknown"), "all");
  assert.equal(parseStatusFilter(null), "all");
});

test("filterDocumentsByStatus keeps all or one status", () => {
  assert.equal(filterDocumentsByStatus(sample, "all").length, 3);
  assert.equal(filterDocumentsByStatus(sample, "draft").length, 2);
  assert.equal(filterDocumentsByStatus(sample, "review").length, 0);
});

test("bibliotecaUrl builds library links", () => {
  assert.equal(bibliotecaUrl(), "/library");
  assert.equal(bibliotecaUrl("review"), "/library?status=review");
});

test("parseOwnershipFilter accepts mine and shared and falls back to all", () => {
  assert.equal(parseOwnershipFilter("mine"), "mine");
  assert.equal(parseOwnershipFilter("shared"), "shared");
  assert.equal(parseOwnershipFilter("unknown"), "all");
  assert.equal(parseOwnershipFilter(null), "all");
});

test("isDocumentOwnedByUser matches owner userId", () => {
  assert.equal(isDocumentOwnedByUser(sample[0], "u1"), true);
  assert.equal(isDocumentOwnedByUser(sample[2], "u1"), false);
});

test("filterDocumentsByOwnership keeps all, mine or shared", () => {
  assert.equal(filterDocumentsByOwnership(sample, "u1", "all").length, 3);
  assert.equal(filterDocumentsByOwnership(sample, "u1", "mine").length, 2);
  assert.equal(filterDocumentsByOwnership(sample, "u1", "shared").length, 1);
  assert.equal(filterDocumentsByOwnership(sample, "u1", "shared")[0]?.id, "3");
});

test("buildBibliotecaUrl combines status and ownership params", () => {
  assert.equal(buildBibliotecaUrl(), "/library");
  assert.equal(buildBibliotecaUrl({ status: "draft" }), "/library?status=draft");
  assert.equal(buildBibliotecaUrl({ ownership: "mine" }), "/library?ownership=mine");
  assert.equal(
    buildBibliotecaUrl({ status: "review", ownership: "shared" }),
    "/library?status=review&ownership=shared",
  );
});
