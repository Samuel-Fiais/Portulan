import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";
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
    const allowsNestedDirectives = match[1].toLowerCase() === "columns";
    let depth = 1;
    index += 1;
    while (index < lines.length) {
      if (allowsNestedDirectives && lines[index].match(directivePattern)) {
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
    <aside className={`fp-alert ${variant} ${directive.attributes.style || "tint"}`}>
      <span className="alert-icon"><Icon /></span>
      <strong className="alert-title">{directive.attributes.title || "Nota"}</strong>
      <div className="alert-body"><Markdown>{directive.body}</Markdown></div>
    </aside>
  );
}

function ChartDirective({ directive }: { directive: Directive }) {
  const points = rows(directive.body)
    .map(([label, rawValue]) => ({ label, value: Number.parseFloat((rawValue ?? "").replace(",", ".")) }))
    .filter((point) => point.label && Number.isFinite(point.value));
  const rawType = directive.attributes.type ?? "";
  const type = ["bar", "line", "area", "column", "donut", "gauge", "spark", "stacked", "target"].includes(rawType) ? rawType : "bar";
  const max = Math.max(...points.map((point) => point.value), 1);
  const total = Math.max(points.reduce((sum, point) => sum + point.value, 0), 1);
  const colors = ["var(--accent)", "var(--accent-2)", "var(--s-ok)", "var(--s-warn)"];

  if (type === "gauge") {
    const point = points[0];
    const value = Math.max(0, Math.min(100, point?.value ?? 0));
    return <figure className="fp-chart fp-chart-gauge"><figcaption>{directive.attributes.title || "Indicador"}</figcaption><div className="fp-gauge" style={{ "--gauge-value": `${value}%` } as CSSProperties}><div><strong>{value}%</strong><span>{point?.label || "Resultado atual"}</span></div></div></figure>;
  }

  if (type === "donut") {
    let offset = 0;
    const gradient = points.map((point, index) => {
      const start = offset;
      offset += (point.value / total) * 100;
      return `${colors[index % colors.length]} ${start}% ${offset}%`;
    }).join(", ");
    return <figure className="fp-chart"><figcaption>{directive.attributes.title || "Distribuição"}</figcaption><div className="fp-chart-donut-row"><div className="fp-chart-donut" style={{ background: `conic-gradient(${gradient || "var(--border) 0 100%"})` }}><span>{Math.round(total)}</span></div><ul className="fp-chart-legend">{points.map((point, index) => <li key={point.label}><i style={{ background: colors[index % colors.length] }} /><span>{point.label}</span><strong>{point.value}</strong></li>)}</ul></div></figure>;
  }

  if (type === "stacked") {
    return <figure className="fp-chart"><figcaption>{directive.attributes.title || "Distribuição"}</figcaption><div className="fp-chart-stacked" aria-label={directive.attributes.title || "Distribuição"}>{points.map((point, index) => <span key={point.label} style={{ width: `${Math.max((point.value / total) * 100, 2)}%`, background: colors[index % colors.length] }} title={`${point.label}: ${point.value}`} />)}</div><ul className="fp-chart-legend">{points.map((point, index) => <li key={point.label}><i style={{ background: colors[index % colors.length] }} /><span>{point.label}</span><strong>{point.value}</strong></li>)}</ul></figure>;
  }

  if (type === "target") {
    const targets = rows(directive.body)
      .map(([label, rawValue, rawTarget]) => ({ label, value: Number.parseFloat((rawValue ?? "").replace(",", ".")), target: Number.parseFloat((rawTarget ?? "").replace(",", ".")) }))
      .filter((point) => point.label && Number.isFinite(point.value) && Number.isFinite(point.target));
    const targetMaximum = Math.max(...targets.map((point) => Math.max(point.value, point.target)), 1);
    return <figure className="fp-chart"><figcaption>{directive.attributes.title || "Meta e realizado"}</figcaption><div className="fp-chart-targets">{targets.map((point) => <div key={point.label}><div><span>{point.label}</span><strong>{point.value}</strong><small>meta {point.target}</small></div><div className="fp-chart-target-track"><i style={{ width: `${Math.min((point.value / targetMaximum) * 100, 100)}%` }} /><b style={{ left: `${Math.min((point.target / targetMaximum) * 100, 100)}%` }} /></div></div>)}</div></figure>;
  }

  if (type === "line" || type === "area" || type === "column" || type === "spark") {
    const width = 720;
    const height = 180;
    const padding = 20;
    const horizontalPadding = 42;
    const steps = Math.max(points.length - 1, 1);
    const minimum = Math.min(...points.map((point) => point.value), 0);
    const maximum = Math.max(...points.map((point) => point.value), 0);
    const range = Math.max(maximum - minimum, 1);
    const pointY = (value: number) => height - padding - ((value - minimum) / range) * (height - padding * 2);
    const pointsWithCoordinates = points.map((point, index) => ({ ...point, x: horizontalPadding + (index / steps) * (width - horizontalPadding * 2), y: pointY(point.value) }));
    const coordinates = pointsWithCoordinates.map((point) => `${point.x},${point.y}`).join(" ");
    const baseline = pointY(0);
    const title = directive.attributes.title || (type === "column" ? "Comparativo" : "Evolução");

    if (type === "column") {
      const columnMaximum = Math.max(...points.map((point) => Math.abs(point.value)), 1);
      return <figure className="fp-chart"><figcaption>{title}</figcaption><div className="fp-chart-columns" style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(84px, 150px))` }}>{points.map((point) => <div key={point.label}><span><strong>{point.value}</strong><i className={point.value < 0 ? "negative" : undefined} style={{ height: `${Math.max((Math.abs(point.value) / columnMaximum) * 100, 3)}%` }} /></span><small>{point.label}</small></div>)}</div></figure>;
    }

    const areaCoordinates = `${coordinates} ${width - horizontalPadding},${baseline} ${horizontalPadding},${baseline}`;
    if (type === "spark") return <figure className="fp-chart fp-chart-spark"><figcaption>{title}</figcaption><div className="fp-chart-line"><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-label={title}><polyline points={coordinates} />{pointsWithCoordinates.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="4" />)}</svg><div>{points.map((point) => <span key={point.label}>{point.label}</span>)}</div></div></figure>;
    return <figure className="fp-chart"><figcaption>{title}</figcaption><div className={`fp-chart-line ${type === "area" ? "fp-chart-area" : ""}`}><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-label={title}><line x1={horizontalPadding} y1={baseline} x2={width - horizontalPadding} y2={baseline} />{type === "area" ? <polygon points={areaCoordinates} /> : null}<polyline points={coordinates} />{pointsWithCoordinates.map((point) => { const labelX = Math.max(20, Math.min(width - 20, point.x)); const labelY = point.y < 42 ? point.y + 26 : point.y - 14; return <g key={point.label}><circle cx={point.x} cy={point.y} r="4" /><text x={labelX} y={labelY}>{point.value}</text></g>; })}</svg><div>{points.map((point) => <span key={point.label}>{point.label}</span>)}</div></div></figure>;
  }

  return <figure className="fp-chart"><figcaption>{directive.attributes.title || "Comparativo"}</figcaption><div className="fp-chart-bars">{points.map((point, index) => <div key={point.label}><span>{point.label}</span><div><i style={{ width: `${(point.value / max) * 100}%`, background: colors[index % colors.length] }} /><strong>{point.value}</strong></div></div>)}</div></figure>;
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
    return <div className={`fp-progress-list progress-${directive.attributes.size || "regular"}`}>{data.map(([label, rawValue, tone = directive.attributes.tone || ""], index) => { const value = Math.max(0, Math.min(100, Number.parseInt(rawValue, 10) || 0)); return <div className="fp-progress" key={`${label}-${index}`}><div className="progress-header"><span className="progress-label">{label}</span><span className="progress-pct">{value}%</span></div><div className="progress-track"><div className={`progress-fill ${tone}`} style={{ width: `${value}%` }} /></div></div>; })}</div>;
  }
  if (directive.name === "chart") return <ChartDirective directive={directive} />;
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
    return <div className="fp-columns" style={{ "--column-count": count } as CSSProperties}>{columns.map((column, index) => <div key={index}><RichMarkdown source={column} /></div>)}</div>;
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
