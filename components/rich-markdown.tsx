import { type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import { portulanRemarkPlugins } from "@/lib/markdown-renderer";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { InlineMarkdown } from "@/components/inline-markdown";
import { MarkdownCode } from "@/components/markdown-code";
import { isPlaceholderToken } from "@/lib/inline-markdown";
import { LivingChart } from "@/components/living-chart";
import { LivingChecklist } from "@/components/living-checklist";
import { LivingTestcase } from "@/components/living-testcase";
import { LivingCodeBlock, LivingTable } from "@/components/living-code-block";
import { LivingFaq, LivingGlossary, LivingProperties, LivingRelated, LivingResources } from "@/components/living-collapsible-blocks";
import { LivingFileTree } from "@/components/living-filetree";
import { LivingFigure, LivingGallery } from "@/components/living-media";
import { LivingApi, LivingDiff, LivingEnv, LivingKv, LivingLogs, LivingTerminal, LivingTests } from "@/components/living-tech-blocks";
import { parseChartDirective } from "@/lib/chart-directive";
import { parseMarkdownBlocks, type MarkdownDirective } from "@/lib/markdown-blocks";
import { ReportLinkCard } from "@/components/report-link-card";

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

function parseBlocks(source: string) {
  return parseMarkdownBlocks(source);
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

function Markdown({ children, interactive = false }: { children: string; interactive?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={portulanRemarkPlugins}
      components={{
        h2: ({ children }) => <h2 className="report-section-title">{children}</h2>,
        h3: ({ children }) => <h3 className="report-subtitle">{children}</h3>,
        blockquote: ({ children }) => <blockquote className="fp-callout">{children}</blockquote>,
        ul: ({ children }) => <ul className="fp-doc-list">{children}</ul>,
        ol: ({ children }) => <ol className="fp-doc-list">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        table: ({ children }) => <LivingTable interactive={interactive}>{children}</LivingTable>,
        pre: ({ children }) => <LivingCodeBlock interactive={interactive}>{children}</LivingCodeBlock>,
        code: ({ children, className, node }) => <MarkdownCode className={className} node={node}>{children}</MarkdownCode>,
        a: ({ children, href }) => <a href={href}>{children}</a>,
        img: ({ src, alt }) => (
          <LivingFigure
            src={typeof src === "string" ? src : undefined}
            alt={alt}
            caption={alt}
            size="medium"
            align="center"
            interactive={interactive}
          />
        ),
      }}
    >
      {prepareBlockMarkdown(children)}
    </ReactMarkdown>
  );
}

function AlertDirective({ directive, interactive }: { directive: MarkdownDirective; interactive: boolean }) {
  const variant = ["info", "success", "warning", "error", "accent"].includes(directive.attributes.variant)
    ? directive.attributes.variant
    : "accent";
  const Icon = variant === "success" ? CheckCircle2 : variant === "warning" ? TriangleAlert : variant === "error" ? AlertCircle : Info;
  return (
    <aside className={`fp-alert ${variant} ${directive.attributes.style || "tint"}`}>
      <span className="alert-icon"><Icon /></span>
      <strong className="alert-title">{directive.attributes.title || "Nota"}</strong>
      <div className="alert-body"><Markdown interactive={interactive}>{directive.body}</Markdown></div>
    </aside>
  );
}

type LivingDocumentOptions = {
  interactive: boolean;
  documentKey: string;
  sectionIndex: number;
  blockIndex: number;
};

function DirectiveRenderer({ directive, living }: { directive: MarkdownDirective; living: LivingDocumentOptions }) {
  const data = rows(directive.body);
  const md = (source: string) => <Markdown interactive={living.interactive}>{source}</Markdown>;

  if (directive.name === "image") {
    return (
      <LivingFigure
        src={directive.attributes.src}
        alt={directive.attributes.alt}
        size={directive.attributes.size}
        align={directive.attributes.align}
        interactive={living.interactive}
      />
    );
  }
  if (directive.name === "figure") {
    const caption = directive.body.trim();
    return (
      <LivingFigure
        src={directive.attributes.src}
        alt={directive.attributes.alt}
        caption={caption && caption !== "Escreva aqui." ? caption : directive.attributes.caption}
        size={directive.attributes.size}
        align={directive.attributes.align}
        interactive={living.interactive}
      />
    );
  }
  if (directive.name === "report") {
    const { slug, title, summary } = directive.attributes;
    if (!slug || !title) return null;
    return <ReportLinkCard slug={slug} title={title} summary={summary} />;
  }
  if (directive.name === "gallery") {
    const columns = directive.attributes.columns === "3" ? 3 : 2;
    return (
      <LivingGallery
        columns={columns}
        interactive={living.interactive}
        items={data.map(([src, caption = ""]) => ({ src: src.trim(), caption }))}
      />
    );
  }
  if (directive.name === "alert") return <AlertDirective directive={directive} interactive={living.interactive} />;
  if (directive.name === "callout") {
    return <aside className="fp-callout"><strong className="fp-callout-title">{directive.attributes.title || "Destaque"}</strong>{md(directive.body)}</aside>;
  }
  if (directive.name === "banner") {
    return <aside className="fp-banner"><div><strong>{directive.attributes.title || "Destaque"}</strong>{md(directive.body)}</div></aside>;
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
  if (directive.name === "testcase") {
    const { id, title = "", priority = "medium", status = "pending" } = directive.attributes;
    if (!id) return null;
    return (
      <LivingTestcase
        testcaseId={id}
        title={title}
        priority={priority}
        initialStatus={status}
        body={directive.body}
        interactive={living.interactive}
      />
    );
  }
  if (directive.name === "kv") {
    return <LivingKv rows={data.map(([key, value]) => [key, value ?? ""])} interactive={living.interactive} />;
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
  if (directive.name === "decision") return <aside className={`fp-decision ${directive.attributes.status || "pending"} ${directive.attributes.style || "note"}`}><span>{directive.attributes.status === "approved" ? "Decisão aprovada" : directive.attributes.status === "rejected" ? "Decisão rejeitada" : "Decisão pendente"}</span><strong>{directive.attributes.title || "Decisão"}</strong>{md(directive.body)}</aside>;
  if (directive.name === "comparison") return <div className="fp-comparison">{data.map(([label, current, target], index) => <div key={`${label}-${index}`}><span>{label}</span><strong>{current}</strong><small>Meta: {target}</small></div>)}</div>;
  if (directive.name === "milestones") return <div className="fp-milestones">{data.map(([date, title, state = directive.attributes.state || "planned"], index) => <div className={`fp-milestone ${state}`} key={`${date}-${index}`}><time>{date}</time><span /><strong><InlineMarkdown>{title}</InlineMarkdown></strong></div>)}</div>;
  if (directive.name === "actions") return <div className="fp-actions">{data.map(([action, owner, due, state = directive.attributes.state || "open"], index) => <div className={`fp-action ${state}`} key={`${action}-${index}`}><strong><InlineMarkdown>{action}</InlineMarkdown></strong><span>{owner}</span><time>{due}</time><em>{state === "done" ? "Concluída" : state === "blocked" ? "Bloqueada" : "Aberta"}</em></div>)}</div>;
  if (directive.name === "risks") return <div className="fp-risks">{data.map(([risk, impact, mitigation, level = directive.attributes.level || "medium"], index) => <div className={`fp-risk ${level}`} key={`${risk}-${index}`}><span>{impact}</span><strong><InlineMarkdown>{risk}</InlineMarkdown></strong><small><InlineMarkdown>{mitigation}</InlineMarkdown></small></div>)}</div>;
  if (directive.name === "scorecard") return <div className="fp-scorecard">{data.map(([objective, status, evidence], index) => { const tone = /atenção|risco|bloque/i.test(status) ? "warn" : /fora|erro|falha/i.test(status) ? "err" : "ok"; return <article className={tone} key={`${objective}-${index}`}><header><span>{status}</span><strong><InlineMarkdown>{objective}</InlineMarkdown></strong></header><p><InlineMarkdown>{evidence}</InlineMarkdown></p></article>; })}</div>;
  if (directive.name === "evidence") return <div className="fp-evidence">{data.map(([evidence, source, date], index) => <article key={`${evidence}-${index}`}><span className="fp-evidence-mark">{String(index + 1).padStart(2, "0")}</span><div><strong><InlineMarkdown>{evidence}</InlineMarkdown></strong><small>{source}</small></div><time>{date}</time></article>)}</div>;
  if (directive.name === "api") {
    return (
      <LivingApi
        method={directive.attributes.method || "GET"}
        path={directive.attributes.path || "/endpoint"}
        auth={directive.attributes.auth}
        interactive={living.interactive}
      >
        {md(`\`\`\`json\n${directive.body}\n\`\`\``)}
      </LivingApi>
    );
  }
  if (directive.name === "terminal") {
    return <LivingTerminal title={directive.attributes.title || "Terminal"} body={directive.body} interactive={living.interactive} />;
  }
  if (directive.name === "filetree") {
    return <LivingFileTree title={directive.attributes.title || "Estrutura de arquivos"} body={directive.body} interactive={living.interactive} />;
  }
  if (directive.name === "diff") {
    return <LivingDiff title={directive.attributes.title || "Alterações"} body={directive.body} interactive={living.interactive} />;
  }
  if (directive.name === "people") {
    const layout = directive.attributes.layout === "cards" ? "cards" : "directory";
    return <div className={`fp-people people-${layout}`}>{data.map(([name, role, scope], index) => <div key={`${name}-${index}`}><b>{name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</b><div className="fp-person-identity"><strong>{name}</strong><span>{role}</span></div><small>{scope}</small></div>)}</div>;
  }
  if (directive.name === "faq") {
    return (
      <LivingFaq
        items={data.map(([question, answer]) => [question, answer ?? ""])}
        expanded={directive.attributes.mode !== "collapsed"}
        interactive={living.interactive}
      />
    );
  }
  if (directive.name === "glossary") {
    return <LivingGlossary items={data.map(([term, definition]) => [term, definition ?? ""])} interactive={living.interactive} />;
  }
  if (directive.name === "changelog") return <div className="fp-changelog">{data.map(([version, date, description], index) => <article key={`${version}-${index}`}><span className="fp-change-dot" /><div><strong>{version}</strong><time>{date}</time><p><InlineMarkdown>{description}</InlineMarkdown></p></div></article>)}</div>;
  if (directive.name === "agenda") return <div className="fp-agenda">{data.map(([topic, owner, duration], index) => <article key={`${topic}-${index}`}><time>{duration}</time><span>{String(index + 1).padStart(2, "0")}</span><div><strong><InlineMarkdown>{topic}</InlineMarkdown></strong><small>{owner}</small></div></article>)}</div>;
  if (directive.name === "experiment") return <div className="fp-experiments">{data.map(([hypothesis, metric, status], index) => <div key={`${hypothesis}-${index}`}><span>{status || "Em teste"}</span><strong><InlineMarkdown>{hypothesis}</InlineMarkdown></strong><small>Métrica: {metric}</small></div>)}</div>;
  if (directive.name === "slo") return <div className="fp-slo">{data.map(([service, target, current, status = directive.attributes.status || "ok"], index) => <div className={status} key={`${service}-${index}`}><strong>{service}</strong><span>Meta {target}</span><b>{current}</b></div>)}</div>;
  if (directive.name === "resources") {
    return <LivingResources items={data.map(([resource, type, description]) => [resource, type ?? "", description ?? ""])} />;
  }
  if (directive.name === "properties") {
    return <LivingProperties rows={data.map(([name, value, type]) => [name, value ?? "", type ?? ""])} interactive={living.interactive} />;
  }
  if (directive.name === "daci") return <div className="fp-daci">{data.map(([role, people], index) => <div key={`${role}-${index}`}><span>{role}</span><strong><InlineMarkdown>{people}</InlineMarkdown></strong></div>)}</div>;
  if (directive.name === "related") {
    return <LivingRelated items={data.map(([item, relation, status]) => [item, relation ?? "", status ?? ""])} />;
  }
  if (directive.name === "env") {
    return <LivingEnv rows={data.map(([key, value, scope]) => [key, value ?? "", scope ?? ""])} interactive={living.interactive} />;
  }
  if (directive.name === "logs") {
    return (
      <LivingLogs
        interactive={living.interactive}
        rows={data.map((parts) => {
          const [time, second = "", third] = parts;
          return {
            time,
            level: third ? second : directive.attributes.level || "INFO",
            message: third ?? second,
          };
        })}
      />
    );
  }
  if (directive.name === "tests") {
    return (
      <LivingTests
        interactive={living.interactive}
        rows={data.map((parts) => {
          const [name, second = "", third] = parts;
          return {
            name,
            status: third ? second : directive.attributes.status || "PASS",
            note: third ?? second,
          };
        })}
      />
    );
  }
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
  return <div className="fp-callout"><strong className="fp-callout-title">{directive.name}</strong>{md(directive.body)}</div>;
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
            ? <Markdown interactive={interactive}>{block.body}</Markdown>
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
