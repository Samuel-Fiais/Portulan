"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { InlineMarkdown } from "@/components/inline-markdown";
import {
  checklistItemFingerprint,
  readChecklistItemChecked,
  writeChecklistItemChecked,
} from "@/lib/living-document-storage";

type ChecklistItem = {
  title: string;
  sub?: string;
  hasCheckbox: boolean;
  initialChecked: boolean;
  fingerprint: string;
};

function ChecklistRow({
  item,
  interactive,
  documentKey,
  onToggle,
}: {
  item: ChecklistItem;
  interactive: boolean;
  documentKey: string;
  onToggle: (fingerprint: string, checked: boolean) => void;
}) {
  const [checked, setChecked] = useState(item.initialChecked);

  useEffect(() => {
    if (!interactive || !documentKey) {
      setChecked(item.initialChecked);
      return;
    }
    setChecked(readChecklistItemChecked(documentKey, item.fingerprint, item.initialChecked));
  }, [documentKey, interactive, item.fingerprint, item.initialChecked]);

  const toggle = useCallback(() => {
    if (!interactive || !item.hasCheckbox) return;
    const next = !checked;
    setChecked(next);
    onToggle(item.fingerprint, next);
  }, [checked, interactive, item.fingerprint, item.hasCheckbox, onToggle]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!interactive || !item.hasCheckbox) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggle();
      }
    },
    [interactive, item.hasCheckbox, toggle],
  );

  return (
    <div
      className={`fp-check-item ${item.hasCheckbox ? "" : "fp-check-item-plain"} ${checked ? "checked" : ""} ${interactive && item.hasCheckbox ? "fp-check-item-interactive" : ""}`}
      role={interactive && item.hasCheckbox ? "checkbox" : undefined}
      aria-checked={interactive && item.hasCheckbox ? checked : undefined}
      tabIndex={interactive && item.hasCheckbox ? 0 : undefined}
      onClick={interactive && item.hasCheckbox ? toggle : undefined}
      onKeyDown={handleKeyDown}
    >
      {item.hasCheckbox ? (
        <span className="check-box" aria-hidden="true">
          <span className="check-mark">
            <Check />
          </span>
        </span>
      ) : null}
      <div>
        <div className="check-text">
          <InlineMarkdown>{item.title}</InlineMarkdown>
        </div>
        {item.sub ? (
          <div className="check-sub">
            <InlineMarkdown>{item.sub}</InlineMarkdown>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LivingChecklist({
  items,
  interactive = false,
  documentKey = "",
  sectionIndex,
  blockIndex,
}: {
  items: Array<[string, string | undefined]>;
  interactive?: boolean;
  documentKey?: string;
  sectionIndex: number;
  blockIndex: number;
}) {
  const hasAnyCheckbox = items.some(([rawTitle]) => /^\[[ xX]\]/.test(rawTitle));

  const handleToggle = useCallback(
    (fingerprint: string, checked: boolean) => {
      if (!documentKey) return;
      writeChecklistItemChecked(documentKey, fingerprint, checked);
    },
    [documentKey],
  );

  if (!hasAnyCheckbox) {
    return (
      <ul className="fp-doc-list">
        {items.map(([title, sub], index) => (
          <li key={`${title}-${index}`}>
            {sub ? (
              <>
                <InlineMarkdown>{title}</InlineMarkdown>
                {" — "}
                <InlineMarkdown>{sub}</InlineMarkdown>
              </>
            ) : (
              <InlineMarkdown>{title}</InlineMarkdown>
            )}
          </li>
        ))}
      </ul>
    );
  }

  const parsedItems: ChecklistItem[] = items.map(([rawTitle, sub], index) => {
    const hasCheckbox = /^\[[ xX]\]/.test(rawTitle);
    const initialChecked = /^\[[xX]\]/.test(rawTitle);
    const title = hasCheckbox ? rawTitle.replace(/^\[[ xX]\]\s*/, "") : rawTitle;
    return {
      title,
      sub,
      hasCheckbox,
      initialChecked,
      fingerprint: checklistItemFingerprint(sectionIndex, blockIndex, title || String(index)),
    };
  });

  return (
    <div className="fp-checklist">
      {parsedItems.map((item) => (
        <ChecklistRow
          key={item.fingerprint}
          item={item}
          interactive={interactive}
          documentKey={documentKey}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
