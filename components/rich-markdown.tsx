import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { InlineMarkdown, isPlaceholderToken } from "@/components/inline-markdown";
import { LivingChart, parseChartDirective } from "@/components/living-chart";
import { LivingChecklist } from "@/components/living-checklist";
import { parseAttributes, parseDirectiveOpener } from "@/lib/directive-attrs";

type Directive = {
  name: string;
  attributes: Record<string, string>;
  body: string;
};

type Block =
  | { kind: "markdown"; body: string }
  | { kind: "directive"; directive: Directive };

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
    const opener = parseDirectiveOpener(lines[index]);
    if (!opener || lines[index] === ":::") {
      markdown.push(lines[index]);
      continue;
    }

    flushMarkdown();
    const body: string[] = [];
    const allowsNestedDirectives = opener.name.toLowerCase() === "columns";
    let depth = 1;
    index += 1;
    while (index < lines.length) {
      if (allowsNestedDirectives && parseDirectiveOpener(lines[index])) {
        depth += 1;
        body.push(lines[index]);
        index += 1;
        continue;
      }
      if (lines[index].trim() === ":::") {
        depth -= 1;
        if (depth === 0) break;
        body.push(lines[index]);
        index += 1;
        continue;
      }
      body.push(lines[index]);
      index += 1;
    }
    blocks.push({
      kind: "directive",
      directive: {
        name: opener.name.toLowerCase(),
        attributes: parseAttributes(opener.attributeSource),
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

type HastText = { type: "text"; value: string };
type HastElement = { type: "element"; tagName: string; children?: HastText[] };

function isFencedCode(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const element = node as HastElement;
  if (element.type !== "element" || element.tagName !== "code") return false;
  const text = element.children?.[0];
  return text?.type === "text" && text.value.endsWith("\n");
}

function MarkdownCode({ children, className, node }: { children?: ReactNode; className?: string; node?: unknown }) {
  if (className) return <code className={className}>{children}</code>;
  if (isFencedCode(node)) return <code>{children}</code>;
  return <code className="report-inline-code">{children}</code>;
}

function CodeBlock({ children }: { children: ReactNode }) {
  const child = Children.toArray(children)[0];
  const className = isValidElement<{ className?: string }>(child) ? child.props.className : undefined;
  const language = className?.replace("language-", "") || "código";

  return (
    <div className="fp-code-block">
      <div className="fp-code-header"><span>{language}</span></div>
      <pre className="report-code">{children}</pre>
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
        pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        code: ({ children, className, node }) => <MarkdownCode className={className} node={node}>{children}</MarkdownCode>,
        a: ({ children, href }) => <a href={href}>{children}</a>,
      }}
    >
      {prepareBlockMarkdown(children)}
    </ReactMarkdown>
  );
}

function AlertDirective({ directive }: { directive: Directive }) {
  const variant = ["info", "success", "warning", "error", "accent"].includes(directive.attributes.variant)
    ? directive.attributes.variant
    : "accent";
  const Icon = variant === "success" ? CheckCircle2 : variant === "warning" ? TriangleAlert : variant === "error" ? AlertCircle : Info;
  return (
    <aside className={`fp-alert ${variant} ${directive.attributes.style || "tint"}`}>
      <span className="alert-icon"><Icon /></span>
      <strong className="alert-title">{directive.attributes.title || "Nota"}</strong>
      <div className="alert-body"><Markdown>{directive.body}</Markdown></div>
    </aside>
  );
}

type LivingDocumentOptions = {
  interactive: boolean;
  documentKey: string;
  sectionIndex: number;
  blockIndex: number;
};

function DirectiveRenderer({ directive, living }: { directive: Directive; living: LivingDocumentOptions }) {
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
      <div className={`fp-stat-grid stats-${directive.attributes.layout || "grid"}`}>
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
      <div className={`fp-card-grid cards-${directive.attributes.layout || "grid"}`}>
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
    return <div className="fp-timeline">{data.map(([date, title, body, state = directive.attributes.state || ""], index) => <div className={`fp-tl-item ${state}`} key={`${date}-${index}`}><div className="tl-date">{date}</div><div className="tl-line"><span className="tl-dot" /></div><div className="tl-content"><div className="tl-title"><InlineMarkdown>{title}</InlineMarkdown></div><div className="tl-body"><InlineMarkdown>{body}</InlineMarkdown></div></div></div>)}</div>;
  }
  if (directive.name === "checklist") {
    return (
      <LivingChecklist
        items={data.map(([title, sub]) => [title, sub])}
        interactive={living.interactive}
        documentKey={living.documentKey}
        sectionIndex={living.sectionIndex}
        blockIndex={living.blockIndex}
      />
    );
  }
  if (directive.name === "kv") {
    return <dl className="fp-kv">{data.map(([key, value], index) => <div className="fp-kv-row" key={`${key}-${index}`}><dt className="fp-kv-key">{key}</dt><dd className="fp-kv-val"><InlineMarkdown>{value}</InlineMarkdown></dd></div>)}</dl>;
  }
  if (directive.name === "progress") {
    return <div className={`fp-progress-list progress-${directive.attributes.size || "regular"}`}>{data.map(([label, rawValue, tone = directive.attributes.tone || ""], index) => { const value = Math.max(0, Math.min(100, Number.parseInt(rawValue, 10) || 0)); return <div className="fp-progress" key={`${label}-${index}`}><div className="progress-header"><span className="progress-label">{label}</span><span className="progress-pct">{value}%</span></div><div className="progress-track"><div className={`progress-fill ${tone}`} style={{ width: `${value}%` }} /></div></div>; })}</div>;
  }
  if (directive.name === "chart") {
    const chart = parseChartDirective(directive.body, directive.attributes);
    return (
      <LivingChart
        title={chart.title}
        type={chart.type}
        points={chart.points}
        interactive={living.interactive}
      />
    );
  }
  if (directive.name === "decision") return <aside className={`fp-decision ${directive.attributes.status || "pending"} ${directive.attributes.style || "note"}`}><span>{directive.attributes.status === "approved" ? "Decisão aprovada" : directive.attributes.status === "rejected" ? "Decisão rejeitada" : "Decisão pendente"}</span><strong>{directive.attributes.title || "Decisão"}</strong><Markdown>{directive.body}</Markdown></aside>;
  if (directive.name === "comparison") return <div className="fp-comparison">{data.map(([label, current, target], index) => <div key={`${label}-${index}`}><span>{label}</span><strong>{current}</strong><small>Meta: {target}</small></div>)}</div>;
  if (directive.name === "milestones") return <div className="fp-milestones">{data.map(([date, title, state = directive.attributes.state || "planned"], index) => <div className={`fp-milestone ${state}`} key={`${date}-${index}`}><time>{date}</time><span /><strong><InlineMarkdown>{title}</InlineMarkdown></strong></div>)}</div>;
  if (directive.name === "actions") return <div className="fp-actions">{data.map(([action, owner, due, state = directive.attributes.state || "open"], index) => <div className={`fp-action ${state}`} key={`${action}-${index}`}><strong><InlineMarkdown>{action}</InlineMarkdown></strong><span>{owner}</span><time>{due}</time><em>{state === "done" ? "Concluída" : state === "blocked" ? "Bloqueada" : "Aberta"}</em></div>)}</div>;
  if (directive.name === "risks") return <div className="fp-risks">{data.map(([risk, impact, mitigation, level = directive.attributes.level || "medium"], index) => <div className={`fp-risk ${level}`} key={`${risk}-${index}`}><span>{impact}</span><strong><InlineMarkdown>{risk}</InlineMarkdown></strong><small><InlineMarkdown>{mitigation}</InlineMarkdown></small></div>)}</div>;
  if (directive.name === "scorecard") return <div className="fp-scorecard">{data.map(([objective, status, evidence], index) => { const tone = /atenção|risco|bloque/i.test(status) ? "warn" : /fora|erro|falha/i.test(status) ? "err" : "ok"; return <article className={tone} key={`${objective}-${index}`}><header><span>{status}</span><strong><InlineMarkdown>{objective}</InlineMarkdown></strong></header><p><InlineMarkdown>{evidence}</InlineMarkdown></p></article>; })}</div>;
  if (directive.name === "evidence") return <div className="fp-evidence">{data.map(([evidence, source, date], index) => <article key={`${evidence}-${index}`}><span className="fp-evidence-mark">{String(index + 1).padStart(2, "0")}</span><div><strong><InlineMarkdown>{evidence}</InlineMarkdown></strong><small>{source}</small></div><time>{date}</time></article>)}</div>;
  if (directive.name === "api") return <section className="fp-api"><header><span className={`fp-api-method ${(directive.attributes.method || "GET").toLowerCase()}`}>{directive.attributes.method || "GET"}</span><code>{directive.attributes.path || "/endpoint"}</code>{directive.attributes.auth ? <small>{directive.attributes.auth}</small> : null}</header><Markdown>{`\`\`\`json\n${directive.body}\n\`\`\``}</Markdown></section>;
  if (directive.name === "terminal") return <section className="fp-terminal"><header>{directive.attributes.title || "Terminal"}</header><pre>{directive.body}</pre></section>;
  if (directive.name === "filetree") return <section className="fp-filetree"><header>{directive.attributes.title || "Estrutura de arquivos"}</header><pre>{directive.body}</pre></section>;
  if (directive.name === "diff") return <section className="fp-diff"><header>{directive.attributes.title || "Alterações"}</header><pre>{directive.body.split("\n").map((line, index) => <span className={line.startsWith("+") ? "added" : line.startsWith("-") ? "removed" : undefined} key={index}>{line}{"\n"}</span>)}</pre></section>;
  if (directive.name === "people") {
    const layout = directive.attributes.layout === "cards" ? "cards" : "directory";
    return <div className={`fp-people people-${layout}`}>{data.map(([name, role, scope], index) => <div key={`${name}-${index}`}><b>{name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</b><div className="fp-person-identity"><strong>{name}</strong><span>{role}</span></div><small>{scope}</small></div>)}</div>;
  }
  if (directive.name === "faq") {
    const expanded = directive.attributes.mode !== "collapsed";
    return <div className="fp-faq">{data.map(([question, answer], index) => <details key={`${question}-${index}`} open={expanded}><summary>{question}</summary><p><InlineMarkdown>{answer}</InlineMarkdown></p></details>)}</div>;
  }
  if (directive.name === "glossary") return <dl className="fp-glossary">{data.map(([term, definition], index) => <div key={`${term}-${index}`}><dt>{term}</dt><dd><InlineMarkdown>{definition}</InlineMarkdown></dd></div>)}</dl>;
  if (directive.name === "changelog") return <div className="fp-changelog">{data.map(([version, date, description], index) => <article key={`${version}-${index}`}><span className="fp-change-dot" /><div><strong>{version}</strong><time>{date}</time><p><InlineMarkdown>{description}</InlineMarkdown></p></div></article>)}</div>;
  if (directive.name === "agenda") return <div className="fp-agenda">{data.map(([topic, owner, duration], index) => <article key={`${topic}-${index}`}><time>{duration}</time><span>{String(index + 1).padStart(2, "0")}</span><div><strong><InlineMarkdown>{topic}</InlineMarkdown></strong><small>{owner}</small></div></article>)}</div>;
  if (directive.name === "experiment") return <div className="fp-experiments">{data.map(([hypothesis, metric, status], index) => <div key={`${hypothesis}-${index}`}><span>{status || "Em teste"}</span><strong><InlineMarkdown>{hypothesis}</InlineMarkdown></strong><small>Métrica: {metric}</small></div>)}</div>;
  if (directive.name === "slo") return <div className="fp-slo">{data.map(([service, target, current, status = directive.attributes.status || "ok"], index) => <div className={status} key={`${service}-${index}`}><strong>{service}</strong><span>Meta {target}</span><b>{current}</b></div>)}</div>;
  if (directive.name === "resources") return <div className="fp-resources">{data.map(([resource, type, description], index) => <article key={`${resource}-${index}`}><span>{type}</span><strong><InlineMarkdown>{resource}</InlineMarkdown></strong><small><InlineMarkdown>{description}</InlineMarkdown></small></article>)}</div>;
  if (directive.name === "properties") return <dl className="fp-properties">{data.map(([name, value, type = ""], index) => <div key={`${name}-${index}`}><dt>{name}</dt><dd className={type}>{value}</dd></div>)}</dl>;
  if (directive.name === "daci") return <div className="fp-daci">{data.map(([role, people], index) => <div key={`${role}-${index}`}><span>{role}</span><strong><InlineMarkdown>{people}</InlineMarkdown></strong></div>)}</div>;
  if (directive.name === "related") return <div className="fp-related">{data.map(([item, relation, status], index) => <article key={`${item}-${index}`}><span className="fp-related-arrow">↗</span><div><strong><InlineMarkdown>{item}</InlineMarkdown></strong><small>{relation}</small></div><em>{status}</em></article>)}</div>;
  if (directive.name === "env") return <dl className="fp-env">{data.map(([key, value, scope], index) => <div key={`${key}-${index}`}><dt>{key}</dt><dd>{value}</dd><small>{scope}</small></div>)}</dl>;
  if (directive.name === "logs") return <div className="fp-logs">{data.map((parts, index) => { const [time, second = "", third] = parts; const level = third ? second : directive.attributes.level || "INFO"; const message = third ?? second; return <div className={level.toLowerCase()} key={`${time}-${index}`}><time>{time}</time><b>{level}</b><span>{message}</span></div>; })}</div>;
  if (directive.name === "tests") return <div className="fp-tests">{data.map((parts, index) => { const [name, second = "", third] = parts; const status = third ? second : directive.attributes.status || "PASS"; const note = third ?? second; return <div className={status.toLowerCase()} key={`${name}-${index}`}><span>{status}</span><strong>{name}</strong><small>{note}</small></div>; })}</div>;
  if (directive.name === "columns") {
    const columns = directive.body.split(/^---\s*$/m).map((column) => column.trim()).filter(Boolean);
    const count = Math.max(1, Math.min(4, Number.parseInt(directive.attributes.count || "", 10) || columns.length || 2));
    return (
      <div className="fp-columns" style={{ "--column-count": count } as CSSProperties}>
        {columns.map((column, index) => (
          <div key={index}>
            <RichMarkdown
              source={column}
              interactive={living.interactive}
              documentKey={living.documentKey}
              sectionIndexBase={living.sectionIndex}
              blockIndexBase={living.blockIndex * 10 + index + 1}
            />
          </div>
        ))}
      </div>
    );
  }
  return <div className="fp-callout"><strong className="fp-callout-title">{directive.name}</strong><Markdown>{directive.body}</Markdown></div>;
}

function RenderedSection({
  section,
  sectionIndex,
  interactive,
  documentKey,
  blockIndexBase = 0,
}: {
  section: { title?: string; body: string };
  sectionIndex: number;
  interactive: boolean;
  documentKey: string;
  blockIndexBase?: number;
}) {
  const blocks = parseBlocks(section.body);
  return (
    <section className="tmpl-section">
      {section.title ? <SectionLabel title={section.title} /> : null}
      {blocks.map((block, blockIndex) => (
        <div className={`tmpl-block tmpl-block-${block.kind}`} key={`${block.kind}-${blockIndex}`}>
          {block.kind === "markdown"
            ? <Markdown>{block.body}</Markdown>
            : (
              <DirectiveRenderer
                directive={block.directive}
                living={{
                  interactive,
                  documentKey,
                  sectionIndex,
                  blockIndex: blockIndexBase + blockIndex,
                }}
              />
            )}
        </div>
      ))}
    </section>
  );
}

export function RichMarkdown({
  source,
  tableRows = false,
  interactive = false,
  documentKey = "",
  sectionIndexBase = 0,
  blockIndexBase = 0,
}: {
  source: string;
  tableRows?: boolean;
  interactive?: boolean;
  documentKey?: string;
  sectionIndexBase?: number;
  blockIndexBase?: number;
}) {
  return splitSections(source).map((section, sectionIndex) => tableRows
    ? (
      <tr className="tmpl-section-row" key={`${section.title || "intro"}-${sectionIndex}`}>
        <td>
          <RenderedSection
            section={section}
            sectionIndex={sectionIndexBase + sectionIndex}
            interactive={interactive}
            documentKey={documentKey}
            blockIndexBase={blockIndexBase}
          />
        </td>
      </tr>
    )
    : (
      <RenderedSection
        key={`${section.title || "intro"}-${sectionIndex}`}
        section={section}
        sectionIndex={sectionIndexBase + sectionIndex}
        interactive={interactive}
        documentKey={documentKey}
        blockIndexBase={blockIndexBase}
      />
    ));
}
