"use client";

import "./integrations-panel.css";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { MCP_TOOL_COUNT, MCP_TOOL_GROUPS } from "@/lib/mcp-tool-catalog";
import { McpKeysPanel } from "@/components/agent-identities-panel";
import type { AgentIdentityRecord } from "@/lib/db/agent-identities";
import type { AuditEventRecord } from "@/lib/db/audit-events";
import type { McpTokenRecord } from "@/lib/db/mcp-tokens";

async function copyText(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  } catch {
    toast.message(`Copie ${label.toLowerCase()} manualmente`, {
      description: "Use o bloco de código acima.",
    });
  }
}

function buildCursorMcpConfig(endpoint: string) {
  return JSON.stringify(
    {
      mcpServers: {
        portulan: {
          url: endpoint,
          headers: {
            Authorization: "Bearer ptl_SEU_TOKEN",
          },
        },
      },
    },
    null,
    2,
  );
}

export function IntegrationsPanel({
  mcpTokens,
  skillMarkdown,
  identities,
  auditEvents,
  ownerName,
  ownerNames,
  currentUserId,
}: {
  mcpTokens: McpTokenRecord[];
  skillMarkdown: string;
  identities: AgentIdentityRecord[];
  auditEvents: AuditEventRecord[];
  ownerName: string;
  ownerNames: Record<string, string>;
  currentUserId: string;
}) {
  const [mcpEndpoint, setMcpEndpoint] = useState(() =>
    typeof window !== "undefined"
      ? `${window.location.origin}/api/mcp`
      : "",
  );

  useEffect(() => {
    setMcpEndpoint(`${window.location.origin}/api/mcp`);
  }, []);
  const authHeader = "Authorization: Bearer ptl_SEU_TOKEN";

  return (
    <main className="page-wrap workspace-page workspace-page--integrations">
      <section className="doc-section">
        <header className="page-heading split-row">
          <div className="split-row__main workspace-heading">
            <span className="eyebrow">Instrumentos</span>
            <h1 className="fp-h1">Instrumentos</h1>
            <p className="workspace-lead">
              Conecte um cliente MCP com a identidade do seu usuário Portulan.
              Uma cartoteca que agentes também conseguem manter.
            </p>
          </div>
        </header>

        <div className="workspace-page-body">
        <ol className="integration-rumos">
          <li className="integration-step">
            <span className="section-number" aria-hidden="true">
              01
            </span>
            <div className="integration-step-body">
              <h2>Endpoint e autenticação</h2>
              <p>
                Aponte o cliente MCP para o endpoint abaixo. Em toda requisição,
                envie o header{" "}
                <code className="integration-inline-code">
                  Authorization: Bearer &lt;token&gt;
                </code>
                .
              </p>
              <div className="integration-copy-block">
                <span className="integration-copy-label">Endpoint</span>
                <div className="integration-copy-row">
                  <code>{mcpEndpoint}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyText("Endpoint", mcpEndpoint)}
                  >
                    <Copy />
                    Copiar
                  </Button>
                </div>
              </div>
              <div className="integration-copy-block">
                <span className="integration-copy-label">Header HTTP</span>
                <div className="integration-copy-row">
                  <code>{authHeader}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyText("Header", authHeader)}
                  >
                    <Copy />
                    Copiar
                  </Button>
                </div>
              </div>
              <div className="integration-copy-block">
                <span className="integration-copy-label">
                  Config Cursor (mcp.json)
                </span>
                <div className="integration-copy-row">
                  <code className="integration-copy-snippet">
                    {buildCursorMcpConfig(mcpEndpoint)}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void copyText(
                        "Config Cursor",
                        buildCursorMcpConfig(mcpEndpoint),
                      )
                    }
                  >
                    <Copy />
                    Copiar
                  </Button>
                </div>
              </div>
            </div>
          </li>

          <li className="integration-step" id="chaves-mcp">
            <McpKeysPanel
              identities={identities}
              tokens={mcpTokens}
              events={auditEvents}
              ownerName={ownerName}
              ownerNames={ownerNames}
              currentUserId={currentUserId}
            />
          </li>

          <li className="integration-step">
            <IntegrationSkillCopy skillMarkdown={skillMarkdown} />
          </li>
        </ol>

        <details className="integration-tools-disclosure">
          <summary>
            Ferramentas MCP ({MCP_TOOL_COUNT})
          </summary>
          <p className="integration-tools-intro">
            Superfície completa exposta pelo endpoint — agrupada por domínio.
          </p>
          <div className="integration-tool-groups">
            {MCP_TOOL_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`mcp-tools-${group.id}`}>
                <h3 id={`mcp-tools-${group.id}`} className="integration-tool-group-title">
                  {group.label}
                </h3>
                <ul className="integration-tool-list">
                  {group.tools.map((tool) => (
                    <li key={tool}>
                      <code>{tool}</code>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </details>
        </div>
      </section>
    </main>
  );
}

function IntegrationSkillCopy({ skillMarkdown }: { skillMarkdown: string }) {
  const hasSkill = skillMarkdown.trim().length > 0;

  async function copySkill() {
    if (!hasSkill) return;
    await copyText("Skill", skillMarkdown);
  }

  return (
    <>
      <span className="section-number" aria-hidden="true">
        03
      </span>
      <div className="integration-step-body">
        <div className="integration-block">
          <div className="integration-block__meta">
            <span className="eyebrow">Skill para agentes</span>
            <h2>portulan-mcp</h2>
            <p>
              Markdown com instruções MCP, gabaritos e diretivas. Copie para o
              diretório de skills do seu agente ou anexe ao prompt do sistema.
            </p>
            {!hasSkill ? (
              <p className="integration-skill-missing" role="status">
                Arquivo <code>portulan-mcp/SKILL.md</code> não encontrado neste
                ambiente.
              </p>
            ) : null}
          </div>
          <div className="integration-block__actions">
            <Button
              type="button"
              variant="outline"
              onClick={copySkill}
              disabled={!hasSkill}
            >
              <Copy />
              Copiar skill
            </Button>
          </div>
        </div>
        <div className="integration-skill-mark" aria-hidden="true">
          <BrandMark mark className="integration-brand-mark" />
        </div>
      </div>
    </>
  );
}
