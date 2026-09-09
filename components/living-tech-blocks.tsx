"use client";

import { useMemo, useState, type ReactNode } from "react";
import { InlineMarkdown } from "@/components/inline-markdown";
import { LivingCopyButton } from "@/components/living-copy-button";

export function LivingApi({
  method,
  path,
  auth,
  interactive = false,
  children,
}: {
  method: string;
  path: string;
  auth?: string;
  interactive?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="fp-api">
      <header>
        <span className={`fp-api-method ${method.toLowerCase()}`}>{method}</span>
        {interactive ? (
          <LivingCopyButton className="fp-api-route fp-api-route-copy" text={`${method} ${path}`} label="Copiar rota">
            <code>{path}</code>
          </LivingCopyButton>
        ) : (
          <code className="fp-api-route">{path}</code>
        )}
        {auth ? <small>{auth}</small> : null}
      </header>
      {children}
    </section>
  );
}

export function LivingTerminal({
  title,
  body,
  interactive = false,
}: {
  title: string;
  body: string;
  interactive?: boolean;
}) {
  return (
    <section className="fp-terminal">
      <header>
        <span>{title}</span>
        {interactive && body.trim() ? <LivingCopyButton compact text={body} label="Copiar" /> : null}
      </header>
      <pre>{body}</pre>
    </section>
  );
}

export function LivingDiff({
  title,
  body,
  interactive = false,
}: {
  title: string;
  body: string;
  interactive?: boolean;
}) {
  return (
    <section className="fp-diff">
      <header>
        <span>{title}</span>
        {interactive && body.trim() ? <LivingCopyButton compact text={body} label="Copiar diff" /> : null}
      </header>
      <pre>
        {body.split("\n").map((line, index) => (
          <span className={line.startsWith("+") ? "added" : line.startsWith("-") ? "removed" : undefined} key={index}>
            {line}
            {"\n"}
          </span>
        ))}
      </pre>
    </section>
  );
}

export function LivingKv({
  rows,
}: {
  rows: Array<[string, string]>;
  interactive?: boolean;
}) {
  return (
    <dl className="fp-kv">
      {rows.map(([key, value], index) => (
        <div className="fp-kv-row" key={`${key}-${index}`}>
          <dt className="fp-kv-key"><InlineMarkdown>{key}</InlineMarkdown></dt>
          <dd className="fp-kv-val"><InlineMarkdown>{value}</InlineMarkdown></dd>
        </div>
      ))}
    </dl>
  );
}

export function LivingEnv({
  rows,
  interactive = false,
}: {
  rows: Array<[string, string, string]>;
  interactive?: boolean;
}) {
  const dotenv = rows.map(([key, value]) => `${key}=${value}`).join("\n");

  return (
    <div className="fp-env-wrap">
      {interactive ? (
        <div className="fp-living-toolbar fp-living-toolbar-inline">
          <LivingCopyButton compact text={dotenv} label="Copiar .env" />
        </div>
      ) : null}
      <dl className="fp-env">
        {rows.map(([key, value, scope], index) => (
          <div key={`${key}-${index}`}>
            <dt>{key}</dt>
            <dd>{value}</dd>
            <small>{scope}</small>
            {interactive ? <LivingCopyButton text={`${key}=${value}`} compact label={`Copiar ${key}`} /> : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

type LogRow = { time: string; level: string; message: string };

export function LivingLogs({
  rows,
  interactive = false,
}: {
  rows: LogRow[];
  interactive?: boolean;
}) {
  const levels = useMemo(
    () => Array.from(new Set(rows.map((row) => row.level.toUpperCase()))),
    [rows],
  );
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? rows : rows.filter((row) => row.level.toUpperCase() === filter);
  const copyText = visible.map((row) => `${row.time} ${row.level} ${row.message}`).join("\n");

  return (
    <div className="fp-logs">
      {interactive ? (
        <div className="fp-living-toolbar">
          {levels.length > 1 ? (
            <div className="fp-living-filters" role="group" aria-label="Filtrar logs">
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todos</button>
              {levels.map((level) => (
                <button type="button" key={level} aria-pressed={filter === level} onClick={() => setFilter(level)}>
                  {level}
                </button>
              ))}
            </div>
          ) : null}
          <LivingCopyButton compact text={copyText} label="Copiar logs" />
        </div>
      ) : null}
      {visible.map((row, index) => (
        <div className={row.level.toLowerCase()} key={`${row.time}-${index}`}>
          <time>{row.time}</time>
          <b>{row.level}</b>
          <span>{row.message}</span>
        </div>
      ))}
    </div>
  );
}

type TestRow = { name: string; status: string; note: string };

export function LivingTests({
  rows,
  interactive = false,
}: {
  rows: TestRow[];
  interactive?: boolean;
}) {
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.status.toUpperCase()))),
    [rows],
  );
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? rows : rows.filter((row) => row.status.toUpperCase() === filter);

  return (
    <div className="fp-tests">
      {interactive && statuses.length > 1 ? (
        <div className="fp-living-toolbar fp-living-toolbar-inline">
          <div className="fp-living-filters" role="group" aria-label="Filtrar testes">
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todos</button>
            {statuses.map((status) => (
              <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>
                {status}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {visible.map((row, index) => (
        <div className={row.status.toLowerCase()} key={`${row.name}-${index}`}>
          <span>{row.status}</span>
          <strong>{row.name}</strong>
          <small>{row.note}</small>
        </div>
      ))}
    </div>
  );
}
