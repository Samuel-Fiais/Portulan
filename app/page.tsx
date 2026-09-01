import { Dashboard } from "@/components/dashboard";
import { getDocumentStats, listDocuments } from "@/lib/db";
import { getPortulanSkillMarkdown } from "@/lib/skill";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const documents = listDocuments().map(({ content, ...document }) => {
    void content;
    return document;
  });
  return (
    <Dashboard
      documents={documents}
      stats={getDocumentStats()}
      skillMarkdown={getPortulanSkillMarkdown()}
    />
  );
}
