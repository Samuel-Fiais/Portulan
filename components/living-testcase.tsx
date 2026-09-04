"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { portulanRemarkPlugins } from "@/lib/markdown-renderer";
import { useLivingDocument } from "@/components/living-document-context";
import {
  parseTestcasePriority,
  parseTestcaseStatus,
  TESTCASE_STATUS_LABELS,
  TESTCASE_STATUSES,
  type TestcaseStatus,
} from "@/lib/living-document-mutations";

const PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
} as const;

function TestcaseBody({ source }: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={portulanRemarkPlugins}
      components={{
        p: ({ children }) => <p className="fp-testcase-paragraph">{children}</p>,
        ul: ({ children }) => <ul className="fp-doc-list">{children}</ul>,
        ol: ({ children }) => <ol className="fp-doc-list">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong>{children}</strong>,
        code: ({ children }) => <code className="report-inline-code">{children}</code>,
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

export function LivingTestcase({
  testcaseId,
  title,
  priority,
  initialStatus,
  body,
  interactive = false,
}: {
  testcaseId: string;
  title: string;
  priority: string;
  initialStatus: string;
  body: string;
  interactive?: boolean;
}) {
  const living = useLivingDocument();
  const parsedPriority = parseTestcasePriority(priority);
  const [status, setStatus] = useState<TestcaseStatus>(() => parseTestcaseStatus(initialStatus));

  useEffect(() => {
    setStatus(parseTestcaseStatus(initialStatus));
  }, [initialStatus]);

  const canControl = interactive && Boolean(living?.interactive) && Boolean(living?.persistable);

  const handleStatusChange = useCallback(
    (next: TestcaseStatus) => {
      if (!canControl) return;
      setStatus(next);
      living?.updateTestcaseStatus(testcaseId, next);
    },
    [canControl, living, testcaseId],
  );

  return (
    <article className={`fp-testcase status-${status}${canControl ? " fp-testcase-interactive" : ""}`}>
      <header className="fp-testcase-header">
        <div className="fp-testcase-meta">
          <span className="fp-testcase-id">{testcaseId}</span>
          <span className={`fp-testcase-priority priority-${parsedPriority}`}>
            {PRIORITY_LABELS[parsedPriority]}
          </span>
        </div>
        <h4 className="fp-testcase-title">{title || "Caso de teste"}</h4>
        {canControl ? (
          <div className="fp-testcase-status-control fp-living-filters" role="group" aria-label="Status do caso de teste">
            {TESTCASE_STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                data-status={value}
                onClick={() => handleStatusChange(value)}
              >
                {TESTCASE_STATUS_LABELS[value]}
              </button>
            ))}
          </div>
        ) : (
          <span className={`fp-testcase-status-badge status-${status}`} aria-label={`Status: ${TESTCASE_STATUS_LABELS[status]}`}>
            {TESTCASE_STATUS_LABELS[status]}
          </span>
        )}
      </header>
      <div className="fp-testcase-body">
        <TestcaseBody source={body} />
      </div>
    </article>
  );
}
