"use client";

import "./integrations-panel.css";

import { useEffect, useState, useTransition } from "react";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { createMcpTokenAction, revokeMcpTokenAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MCP_TOOL_COUNT, MCP_TOOL_GROUPS } from "@/lib/mcp-tool-catalog";
import { formatMcpTokenExpiry, formatRelativeDate } from "@/lib/utils";
import {
  DEFAULT_MCP_TOKEN_EXPIRATION,
  type McpTokenExpirationPreset,
} from "@/lib/validation";

export type McpTokenSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

const MCP_TOKEN_EXPIRATION_LABELS: Record<McpTokenExpirationPreset, string> = {
  "30d": "30 dias",
  "60d": "60 dias",
  "1y": "1 ano",
  never: "Sem expiração",
};

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
}: {
  mcpTokens: McpTokenSummary[];
  skillMarkdown: string;
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
            <span className="eyebrow">Integrações</span>
            <h1 className="fp-h1">Integrações</h1>
            <p className="workspace-lead">
              Conecte um cliente MCP com a identidade do seu usuário Portulan.
              Uma biblioteca que agentes também conseguem manter.
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

          <li className="integration-step">
            <McpTokenPanel initialTokens={mcpTokens} />
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

function McpTokenPanel({
  initialTokens,
}: {
  initialTokens: McpTokenSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tokenToRevoke, setTokenToRevoke] = useState<McpTokenSummary | null>(
    null,
  );
  const [tokenName, setTokenName] = useState("");
  const [expiration, setExpiration] = useState<McpTokenExpirationPreset>(
    DEFAULT_MCP_TOKEN_EXPIRATION,
  );

  useEffect(() => {
    if (!dialogOpen) {
      setTokenName("");
      setExpiration(DEFAULT_MCP_TOKEN_EXPIRATION);
    }
  }, [dialogOpen]);

  function createToken() {
    const name = tokenName.trim();
    if (!name) {
      toast.error("Informe um nome para o token.");
      return;
    }

    startTransition(async () => {
      const result = await createMcpTokenAction({ name, expiration });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDialogOpen(false);
      setRevealedToken(result.token);
      try {
        await navigator.clipboard.writeText(result.token);
        toast.success("Token gerado e copiado", {
          description: "Ele não será exibido novamente.",
        });
      } catch {
        toast.success("Token MCP gerado", {
          description: "Copie agora — ele não será exibido novamente.",
        });
      }
    });
  }

  function confirmRevoke() {
    if (!tokenToRevoke) return;
    const tokenId = tokenToRevoke.id;
    setRevokingId(tokenId);
    startTransition(async () => {
      const result = await revokeMcpTokenAction(tokenId);
      setRevokingId(null);
      setTokenToRevoke(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Token revogado");
    });
  }

  async function copyToken() {
    if (!revealedToken) return;
    await copyText("Token", revealedToken);
  }

  return (
    <>
      <span className="section-number" aria-hidden="true">
        02
      </span>
      <div className="integration-step-body mcp-token-panel">
        <div className="integration-block">
          <div className="integration-block__meta">
            <span className="eyebrow">Autenticação MCP</span>
            <h2>Token pessoal</h2>
            <p>
              Gere um token por agente ou integração. Substitua{" "}
              <code className="integration-inline-code">ptl_SEU_TOKEN</code> no
              header. Revogue tokens comprometidos a qualquer momento.
            </p>
          </div>
          <div className="integration-block__actions">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" disabled={pending && !revokingId}>
                  <KeyRound />
                  Gerar token MCP
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo token MCP</DialogTitle>
                  <DialogDescription>
                    Dê um nome para identificar este token (agente, IDE ou
                    automação).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mcp-token-name">Nome</Label>
                    <Input
                      id="mcp-token-name"
                      value={tokenName}
                      onChange={(event) => setTokenName(event.target.value)}
                      placeholder="Ex.: Claude, Cursor, automação…"
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && tokenName.trim())
                          createToken();
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcp-token-expiration">Validade</Label>
                    <Select
                      value={expiration}
                      onValueChange={(value) =>
                        setExpiration(value as McpTokenExpirationPreset)
                      }
                    >
                      <SelectTrigger id="mcp-token-expiration" className="w-full">
                        <SelectValue placeholder="Escolha a validade" />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(MCP_TOKEN_EXPIRATION_LABELS) as [
                            McpTokenExpirationPreset,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {expiration === "never" ? (
                    <div className="border border-[color-mix(in_srgb,var(--s-warn)_45%,var(--border))] bg-[var(--s-warn-bg)] px-3 py-2 text-sm text-[var(--text-2)]">
                      <strong className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[var(--s-warn)]">
                        Atenção
                      </strong>
                      Tokens sem expiração permanecem válidos até serem
                      revogados manualmente. Prefira uma validade limitada
                      sempre que possível.
                    </div>
                  ) : null}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={createToken}
                    disabled={pending || tokenName.trim().length < 1}
                  >
                    Gerar token MCP
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {revealedToken ? (
          <div
            className="mcp-token-reveal"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="mcp-token-reveal-label">
              Token gerado — copie agora; ele não será exibido novamente.
            </p>
            <div className="integration-copy-row">
              <code>{revealedToken}</code>
              <Button type="button" onClick={copyToken}>
                <Copy />
                Copiar token
              </Button>
            </div>
          </div>
        ) : null}

        {initialTokens.length > 0 ? (
          <div className="mcp-token-table-wrap">
            <table className="mcp-token-table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Prefixo</th>
                  <th scope="col">Criado</th>
                  <th scope="col">Último uso</th>
                  <th scope="col">Validade</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialTokens.map((token) => (
                  <tr key={token.id}>
                    <td>{token.name?.trim() || "Agente MCP"}</td>
                    <td>
                      <code>{token.tokenPrefix}…</code>
                    </td>
                    <td>{formatRelativeDate(token.createdAt)}</td>
                    <td>
                      {token.lastUsedAt
                        ? formatRelativeDate(token.lastUsedAt)
                        : "Nunca"}
                    </td>
                    <td>{formatMcpTokenExpiry(token.expiresAt)}</td>
                    <td className="mcp-token-table-actions">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setTokenToRevoke(token)}
                        disabled={revokingId === token.id}
                      >
                        Revogar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mcp-token-empty">
            <p>Nenhum token ativo. Gere um token para conectar seu agente.</p>
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <KeyRound />
              Gerar token MCP
            </Button>
          </div>
        )}
      </div>

      <AlertDialog
        open={tokenToRevoke != null}
        onOpenChange={(open) => {
          if (!open) setTokenToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar token?</AlertDialogTitle>
            <AlertDialogDescription>
              O token{" "}
              <strong>
                {tokenToRevoke?.name?.trim() || "Agente MCP"} (
                {tokenToRevoke?.tokenPrefix}…)
              </strong>{" "}
              deixa de funcionar imediatamente. Agentes que o usam perdem
              acesso até você gerar um novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingId != null}>
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={revokingId != null}
              onClick={confirmRevoke}
            >
              Revogar token
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
              Markdown com instruções MCP, templates e diretivas. Copie para o
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
