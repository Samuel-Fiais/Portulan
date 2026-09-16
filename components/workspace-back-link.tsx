import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function WorkspaceBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="workspace-back-link">
      <ArrowLeft className="workspace-back-link__arrow" aria-hidden="true" />
      <span className="workspace-back-link__label">{label}</span>
    </Link>
  );
}
