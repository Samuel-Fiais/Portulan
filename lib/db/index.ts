export {
  canMutateDocument,
  canReadDocument,
  createDocument,
  deleteDocument,
  getDocument,
  getDocumentRelease,
  getDocumentStats,
  listDocumentReleases,
  listDocuments,
  publishDocument,
  updateDocument,
  type DocumentAccessContext,
} from "@/lib/db/documents";

export { isDatabaseConfigured } from "@/lib/db/client";
