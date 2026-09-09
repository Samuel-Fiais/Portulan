import assert from "node:assert/strict";
import test from "node:test";
import {
  bibliotecaUrl,
  filterDocumentsByStatus,
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
  },
];

test("parseStatusFilter accepts known statuses and falls back to all", () => {
  assert.equal(parseStatusFilter("draft"), "draft");
  assert.equal(parseStatusFilter("archived"), "archived");
  assert.equal(parseStatusFilter("unknown"), "all");
  assert.equal(parseStatusFilter(null), "all");
});

test("filterDocumentsByStatus keeps all or one status", () => {
  assert.equal(filterDocumentsByStatus(sample, "all").length, 2);
  assert.equal(filterDocumentsByStatus(sample, "draft").length, 1);
  assert.equal(filterDocumentsByStatus(sample, "review").length, 0);
});

test("bibliotecaUrl builds library links", () => {
  assert.equal(bibliotecaUrl(), "/biblioteca");
  assert.equal(bibliotecaUrl("review"), "/biblioteca?status=review");
});
