"use client";

import { LivingCopyButton } from "@/components/living-copy-button";
import { fileTreeHasFolders, parseFileTree, type FileTreeNode } from "@/lib/filetree";

function FileTreeList({ nodes, collapsible }: { nodes: FileTreeNode[]; collapsible: boolean }) {
  return (
    <ul className="fp-filetree-list">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        if (collapsible && node.kind === "dir" && hasChildren) {
          return (
            <li className="fp-filetree-dir" key={node.path}>
              <details open>
                <summary>
                  <span className="fp-filetree-name">{node.name}</span>
                </summary>
                <FileTreeList nodes={node.children} collapsible={collapsible} />
              </details>
            </li>
          );
        }
        return (
          <li className={node.kind === "dir" ? "fp-filetree-dir" : "fp-filetree-file"} key={node.path}>
            <span className="fp-filetree-name">{node.name}{node.kind === "dir" ? "/" : ""}</span>
            {hasChildren ? <FileTreeList nodes={node.children} collapsible={collapsible} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function LivingFileTree({
  title,
  body,
  interactive = false,
}: {
  title: string;
  body: string;
  interactive?: boolean;
}) {
  const nodes = parseFileTree(body);
  const collapsible = interactive && fileTreeHasFolders(nodes);

  return (
    <section className="fp-filetree">
      <header>
        <span>{title}</span>
        {interactive && body.trim() ? <LivingCopyButton compact text={body} label="Copiar árvore" /> : null}
      </header>
      {collapsible ? (
        <div className="fp-filetree-body">
          <FileTreeList nodes={nodes} collapsible />
        </div>
      ) : (
        <pre>{body}</pre>
      )}
    </section>
  );
}
