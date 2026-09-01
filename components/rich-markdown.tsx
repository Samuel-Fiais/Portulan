import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, Check, CheckCircle2, Info, TriangleAlert } from "lucide-react";

type Directive = {
  name: string;
  attributes: Record<string, string>;
  body: string;
};

type Block =
  | { kind: "markdown"; body: string }
  | { kind: "directive"; directive: Directive };

const directivePattern = /^:::(\w+)(?:\{([^}]*)\})?\s*$/;

function splitSections(source: string) {
  const sections: Array<{ title?: string; body: string }> = [];
  let title: string | undefined;
  let body: string[] = [];

  const flush = () => {
    if (title || body.some((line) => line.trim())) sections.push({ title, body: body.join("\n").trim() });
    body = [];
  };

  for (const line of source.split("\n")) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      flush();
      title = match[1];
    } else {
      body.push(line);
    }
  }
  flush();
  return sections;
}

function parseAttributes(source = "") {
  return Object.fromEntries(
    Array.from(source.matchAll(/([\w-]+)="([^"]*)"/g), (match) => [match[1], match[2]]),
  );
}

function parseBlocks(source: string): Block[] {
  const lines = source.split("\n");
  const blocks: Block[] = [];
  let markdown: string[] = [];

  const flushMarkdown = () => {
    if (markdown.some((line) => line.trim())) {
      blocks.push({ kind: "markdown", body: markdown.join("\n") });
    }
    markdown = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(directivePattern);
    if (!match || lines[index] === ":::") {
      markdown.push(lines[index]);
      continue;
    }

    flushMarkdown();
    const body: string[] = [];
    index += 1;
    while (index < lines.length && lines[index].trim() !== ":::") {
      body.push(lines[index]);
      index += 1;
    }
    blocks.push({
      kind: "directive",
      directive: {
        name: match[1].toLowerCase(),
        attributes: parseAttributes(match[2]),
        body: body.join("\n").trim(),
      },
    });
  }
  flushMarkdown();
  return blocks;
}

function rows(body: string) {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-–—−]\s*$/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").split("|").map((part) => part.trim()));
}

function isPlaceholderToken(value?: string) {
  if (!value?.trim()) return true;
  return /^[-–—−•·.…]+$/u.test(value.trim());
}

function prepareInlineMarkdown(source: string) {
  if (isPlaceholderToken(source)) return "";
  return source
    .split("\n")
    .map((line) => {
      if (/^(\s*)-(?= )/.test(line)) return line.replace(/^(\s*)-(?= )/, "$1\\-");
      return line;
    })
    .join("\n");
}

function prepareBlockMarkdown(source: string) {
  return source
    .split("\n")
    .filter((line) => !/^[-–—−]\s*$/.test(line.trim()))
    .join("\n");
}

function SectionLabel({ title }: { title: string }) {
  const match = title.match(/^(\d+)(\s[\s\S]*)$/);
  if (!match) return <div className="tmpl-label">{title}</div>;
  return (
    <div className="tmpl-label">
      <span className="tmpl-label-index">{match[1]}</span>
      <span className="tmpl-label-text">{match[2]}</span>
    </div>
  );
}

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => <h2 className="report-section-title">{children}</h2>,
        h3: ({ children }) => <h3 className="report-subtitle">{children}</h3>,
        blockquote: ({ children }) => <blockquote className="fp-callout">{children}</blockquote>,
        ul: ({ children }) => <ul className="fp-doc-list">{children}</ul>,
        ol: ({ children }) => <ol className="fp-doc-list">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        table: ({ children }) => <div className="fp-table-wrap"><table className="fp-table">{children}</table></div>,
        pre: ({ children }) => <pre className="report-code">{children}</pre>,
        code: ({ children, className }) => className
          ? <code className={className}>{children}</code>
          : <code className="report-inline-code">{children}</code>,
        a: ({ children, href }) => <a href={href}>{children}</a>,
      }}
    >
      {prepareBlockMarkdown(children)}
    </ReactMarkdown>
  );
}

function InlineMarkdown({ children }: { children: string }) {
  if (!children.trim() || isPlaceholderToken(children)) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={["p", "strong", "em", "a", "code", "del"]}
      unwrapDisallowed
      components={{
        p: ({ children }) => <>{children}</>,
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        a: ({ children, href }) => <a href={href}>{children}</a>,
        code: ({ children }) => <code className="report-inline-code">{children}</code>,
      }}
    >
      {prepareInlineMarkdown(children)}
    </ReactMarkdown>
  );
}

function AlertDirective({ directive }: { directive: Directive }) {
  const variant = ["info", "success", "warning", "error", "accent"].includes(directive.attributes.variant)
    ? directive.attributes.variant
    : "accent";
  const Icon = variant === "success" ? CheckCircle2 : variant === "warning" ? TriangleAlert : variant === "error" ? AlertCircle : Info;
  return (
    <aside className={`fp-alert ${variant}`}>
      <span className="alert-icon"><Icon /></span>
      <strong className="alert-title">{directive.attributes.title || "Nota"}</strong>
      <div className="alert-body"><Markdown>{directive.body}</Markdown></div>
    </aside>
  );
}

function DirectiveRenderer({ directive }: { directive: Directive }) {
  const data = rows(directive.body);

  if (directive.name === "alert") return <AlertDirective directive={directive} />;
  if (directive.name === "callout") {
    return <aside className="fp-callout"><strong className="fp-callout-title">{directive.attributes.title || "Destaque"}</strong><Markdown>{directive.body}</Markdown></aside>;
  }
  if (directive.name === "banner") {
    return <aside className="fp-banner"><div><strong>{directive.attributes.title || "Destaque"}</strong><Markdown>{directive.body}</Markdown></div></aside>;
  }
  if (directive.name === "stats") {
    return (
      <div className="fp-stat-grid">
        {data.flatMap(([label, value, delta, tone = "up"], index) => {
          if (isPlaceholderToken(label)) return [];
          const showDelta = !isPlaceholderToken(delta);
          return [
            <div className="fp-stat" key={`${label}-${index}`}>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
              {showDelta ? <div className={`stat-delta ${tone === "down" ? "delta-dn" : "delta-up"}`}>{delta}</div> : null}
            </div>,
          ];
        })}
      </div>
    );
  }
  if (directive.name === "cards") {
    return (
      <div className="fp-card-grid">
        {data.map(([eyebrow, title, body], index) => (
          <div className="fp-card" key={`${title}-${index}`}>
            <div className="fp-card-eyebrow">{eyebrow}</div>
            <div className="fp-card-title"><InlineMarkdown>{title}</InlineMarkdown></div>
            {!isPlaceholderToken(body) ? <div className="fp-card-body"><InlineMarkdown>{body}</InlineMarkdown></div> : null}
          </div>
        ))}
      </div>
    );
  }
  if (directive.name === "steps") {
    return <div className="fp-steps">{data.map(([title, body], index) => <div className="fp-step" key={`${title}-${index}`}><div className="step-num">{index + 1}</div><div className="step-content"><div className="step-title"><InlineMarkdown>{title}</InlineMarkdown></div><div className="step-body"><InlineMarkdown>{body}</InlineMarkdown></div></div></div>)}</div>;
  }
  if (directive.name === "timeline") {
    return <div className="fp-timeline">{data.map(([date, title, body, state = ""], index) => <div className={`fp-tl-item ${state}`} key={`${date}-${index}`}><div className="tl-date">{date}</div><div className="tl-line"><span className="tl-dot" /></div><div className="tl-content"><div className="tl-title"><InlineMarkdown>{title}</InlineMarkdown></div><div className="tl-body"><InlineMarkdown>{body}</InlineMarkdown></div></div></div>)}</div>;
  }
  if (directive.name === "checklist") {
    const hasAnyCheckbox = data.some(([rawTitle]) => /^\[[ xX]\]/.test(rawTitle));

    if (!hasAnyCheckbox) {
      const listMarkdown = data
        .map(([title, sub]) => (sub ? `- ${title} — ${sub}` : `- ${title}`))
        .join("\n");
      return <Markdown>{listMarkdown}</Markdown>;
    }

    return (
      <div className="fp-checklist">
        {data.map(([rawTitle, sub], index) => {
          const hasCheckbox = /^\[[ xX]\]/.test(rawTitle);
          const checked = /^\[[xX]\]/.test(rawTitle);
          const title = hasCheckbox ? rawTitle.replace(/^\[[ xX]\]\s*/, "") : rawTitle;
          return (
            <div
              className={`fp-check-item ${hasCheckbox ? "" : "fp-check-item-plain"} ${checked ? "checked" : ""}`}
              key={`${title}-${index}`}
            >
              {hasCheckbox ? (
                <span className="check-box">
                  <span className="check-mark"><Check /></span>
                </span>
              ) : null}
              <div>
                <div className="check-text"><InlineMarkdown>{title}</InlineMarkdown></div>
                {sub ? <div className="check-sub"><InlineMarkdown>{sub}</InlineMarkdown></div> : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  if (directive.name === "kv") {
    return <dl className="fp-kv">{data.map(([key, value], index) => <div className="fp-kv-row" key={`${key}-${index}`}><dt className="fp-kv-key">{key}</dt><dd className="fp-kv-val"><InlineMarkdown>{value}</InlineMarkdown></dd></div>)}</dl>;
  }
  if (directive.name === "progress") {
    return <div>{data.map(([label, rawValue, tone = ""], index) => { const value = Math.max(0, Math.min(100, Number.parseInt(rawValue, 10) || 0)); return <div className="fp-progress" key={`${label}-${index}`}><div className="progress-header"><span className="progress-label">{label}</span><span className="progress-pct">{value}%</span></div><div className="progress-track"><div className={`progress-fill ${tone}`} style={{ width: `${value}%` }} /></div></div>; })}</div>;
  }
  return <div className="fp-callout"><strong className="fp-callout-title">{directive.name}</strong><Markdown>{directive.body}</Markdown></div>;
}

function RenderedSection({ section }: { section: { title?: string; body: string } }) {
  const blocks = parseBlocks(section.body);
  return (
    <section className="tmpl-section">
      {section.title ? <SectionLabel title={section.title} /> : null}
      {blocks.map((block, blockIndex) => (
        <div className={`tmpl-block tmpl-block-${block.kind}`} key={`${block.kind}-${blockIndex}`}>
          {block.kind === "markdown"
            ? <Markdown>{block.body}</Markdown>
            : <DirectiveRenderer directive={block.directive} />}
        </div>
      ))}
    </section>
  );
}

export function RichMarkdown({ source, tableRows = false }: { source: string; tableRows?: boolean }) {
  return splitSections(source).map((section, sectionIndex) => tableRows
    ? <tr className="tmpl-section-row" key={`${section.title || "intro"}-${sectionIndex}`}><td><RenderedSection section={section} /></td></tr>
    : <RenderedSection key={`${section.title || "intro"}-${sectionIndex}`} section={section} />);
}
