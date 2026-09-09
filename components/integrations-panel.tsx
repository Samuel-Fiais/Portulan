"use client";

import { useEffect, useState, useTransition } from "react";
import { Bot, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { createMcpTokenAction, revokeMcpTokenAction } from "@/app/actions";
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

export function IntegrationsPanel({
  mcpTokens,
  skillMarkdown,
}: {
  mcpTokens: McpTokenSummary[];
  skillMarkdown: string;
}) {
  const [mcpOrigin, setMcpOrigin] = useState("");

  useEffect(() => {
    setMcpOrigin(`${window.location.origin}/api/mcp`);
  }, []);

  const mcpEndpoint = mcpOrigin || "/api/mcp";

  return (
    <main className="page-wrap dashboard-main">
      <section className="doc-section">
        <div className="page-heading split-row">
          <div className="split-row__main">
            <h1 className="fp-h1">Agentes e integrações</h1>
            <p className="fp-lead">
              Conecte um cliente MCP com a identidade do seu usuário Portulan.
            </p>
          </div>
        </div>
        <div className="integration-panel">
          <div className="integration-icon">
            <Bot />
          </div>
          <div className="flex-1">
            <h3>Uma biblioteca que agentes também conseguem manter.</h3>
            <p>
              Conecte qualquer cliente MCP ao endpoint abaixo. Cada agente
              opera com a identidade do seu usuário Portulan — gere um token
              pessoal e envie{" "}
              <code>Authorization: Bearer &lt;token&gt;</code> em toda
              requisição.
            </p>
            <code>{mcpEndpoint}</code>
          </div>
          <div className="tool-list">
            <span>list_templates</span>
            <span>list_documents</span>
            <span>get_document</span>
            <span>create_document</span>
            <span>update_document</span>
            <span>update_document_release</span>
            <span>publish_document</span>
            <span>list_document_releases</span>
            <span>delete_document</span>
          </div>
        </div>
        <McpTokenPanel initialTokens={mcpTokens} />
        <IntegrationSkillCopy skillMarkdown={skillMarkdown} />
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
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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
    if (!name) return;

    startTransition(async () => {
      const result = await createMcpTokenAction({ name, expiration });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDialogOpen(false);
      setRevealedToken(result.token);
      toast.success("Token MCP gerado", {
        description: "Copie agora — ele não será exibido novamente.",
      });
    });
  }

  function revoke(tokenId: string) {
    startTransition(async () => {
      const result = await revokeMcpTokenAction(tokenId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Token revogado");
    });
  }

  async function copyToken() {
    if (!revealedToken) return;
    try {
      await navigator.clipboard.writeText(revealedToken);
      toast.success("Token copiado");
    } catch {
      toast.message("Copie manualmente", { description: revealedToken });
    }
  }

  return (
    <div className="integration-skill mcp-token-panel">
      <div className="mcp-token-panel-header split-row">
        <div className="integration-skill-meta split-row__main">
          <span className="eyebrow">Autenticação MCP</span>
          <h3>Tokens pessoais</h3>
          <p>
            Gere um token por agente ou integração. Use-o no header HTTP{" "}
            <code>Authorization: Bearer ptl_…</code>. Revogue tokens
            comprometidos a qualquer momento.
          </p>
        </div>
        <div className="integration-skill-actions split-row__actions">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
              >
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
                  Tokens sem expiração permanecem válidos até serem revogados
                  manualmente. Prefira uma validade limitada sempre que
                  possível.
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
                Gerar token
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
      {revealedToken ? (
        <div className="mcp-token-reveal">
          <code>{revealedToken}</code>
          <Button
            type="button"
            variant="outline"
            onClick={copyToken}
          >
            <Copy />
            Copiar token
          </Button>
        </div>
      ) : null}
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
            {initialTokens.length > 0 ? (
              initialTokens.map((token) => (
                <tr key={token.id}>
                  <td>{token.name?.trim() || "Agente MCP"}</td>
                  <td>
                    <code>
                      {token.tokenPrefix}…
                    </code>
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
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke(token.id)}
                      disabled={pending}
                    >
                      Revogar
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="mcp-token-table-empty">
                  Nenhum token ativo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IntegrationSkillCopy({ skillMarkdown }: { skillMarkdown: string }) {
  async function copySkill() {
    if (!skillMarkdown.trim()) {
      toast.error("Skill não encontrada", {
        description: "Arquivo portulan-skill.md ausente no projeto.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(skillMarkdown);
      toast.success("Skill copiada", {
        description:
          "Cole no diretório de skills do seu agente ou cliente MCP.",
      });
    } catch {
      toast.message("Copie manualmente", {
        description: "Use o arquivo portulan-skill.md do projeto.",
      });
    }
  }

  return (
    <div className="integration-skill split-row">
      <div className="integration-skill-meta split-row__main">
        <span className="eyebrow">Skill para agentes</span>
        <h3>portulan-mcp</h3>
        <p>
          Markdown completo com instruções MCP, templates e diretivas.
          Compatível com qualquer cliente MCP — copie para o diretório de
          skills do seu agente ou anexe ao prompt do sistema.
        </p>
      </div>
      <div className="integration-skill-actions split-row__actions">
        <Button
          type="button"
          variant="outline"
          onClick={copySkill}
          disabled={!skillMarkdown.trim()}
        >
          <Copy />
          Copiar skill
        </Button>
      </div>
    </div>
  );
}
