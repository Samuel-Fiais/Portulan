"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { revokeMcpTokenAction } from "@/app/actions";
import {
  createMcpKeyAction,
  deactivateAgentIdentityAction,
  deleteAgentIdentityAction,
  getAgentGuidePreview,
  reactivateAgentIdentityAction,
} from "@/app/dev-context-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
import { actorDisplayName } from "@/lib/audit-policy";
import { formatMcpTokenExpiry, formatRelativeDate } from "@/lib/utils";
import type { AgentIdentityRecord } from "@/lib/db/agent-identities";
import type { McpTokenRecord } from "@/lib/db/mcp-tokens";
import type { AuditEventRecord } from "@/lib/db/audit-events";
import { AgentToolPicker } from "@/components/agent-tool-picker";
import { listAllMcpToolNames, MCP_TOOL_COUNT } from "@/lib/mcp-tool-catalog";
import {
  DEFAULT_MCP_TOKEN_EXPIRATION,
  MCP_TOKEN_EXPIRATION_LABELS,
  type McpTokenExpirationPreset,
} from "@/lib/validation";

export function McpKeysPanel({
  identities,
  tokens,
  events,
  ownerName,
  ownerNames,
  currentUserId,
}: {
  identities: AgentIdentityRecord[];
  tokens: McpTokenRecord[];
  events: AuditEventRecord[];
  ownerName: string;
  ownerNames: Record<string, string>;
  currentUserId: string;
}) {
  const legacyTokens = tokens.filter((token) => !token.agentIdentityId);

  return (
    <>
      <span className="section-number" aria-hidden="true">
        02
      </span>
      <div className="integration-step-body mcp-token-panel">
        <div className="integration-block">
          <div className="integration-block__meta">
            <span className="eyebrow">Autenticação MCP</span>
            <h2>Chaves MCP</h2>
            <p>
              Cada agente ou integração recebe um nome, uma validade e o conjunto de ferramentas
              permitidas. Substitua{" "}
              <code className="integration-inline-code">ptl_SEU_TOKEN</code> no header. Revogue chaves
              comprometidas a qualquer momento.
            </p>
          </div>
          <div className="integration-block__actions">
            <CreateMcpKeyDialog />
          </div>
        </div>

        {legacyTokens.length > 0 ? (
          <LegacyTokensSection tokens={legacyTokens} />
        ) : null}

        {identities.length === 0 ? (
          <div className="mcp-token-empty">
            <p>Nenhuma chave MCP neste porto. Crie um agente para conectar seu cliente MCP.</p>
            <CreateMcpKeyDialog triggerLabel="Nova chave MCP" triggerVariant="default" />
          </div>
        ) : (
          <ul className="agent-identity-list">
            {identities.map((identity) => {
              const keys = tokens.filter((token) => token.agentIdentityId === identity.id);
              const lastEvents = events.filter((event) => event.agentIdentityId === identity.id).slice(0, 5);
              const observedClient = keys.find((key) => key.lastClientInfo)?.lastClientInfo ?? null;
              const identityOwner = ownerNames[identity.ownerUserId] ?? ownerName;
              const canManage = identity.ownerUserId === currentUserId;
              const isInactive = identity.status === "inactive";
              const keysLabel =
                keys.length === 0 ? "Sem chaves" : keys.length === 1 ? "1 chave" : `${keys.length} chaves`;
              return (
                <li key={identity.id}>
                  <details className={`agent-identity${isInactive ? " agent-identity--inactive" : ""}`}>
                    <summary className="agent-identity__summary">
                      <span className="agent-identity__chevron" aria-hidden="true" />
                      <span className="agent-identity__summary-main">
                        <span className="agent-identity__title-row">
                          <h3 className="agent-identity__name">{identity.name}</h3>
                          {isInactive ? <span className="agent-identity__status">Desativado</span> : null}
                        </span>
                        <p className="agent-identity__summary-meta">
                          {identityOwner} · {identity.allowedMcpTools.length}/{MCP_TOOL_COUNT} ferramentas ·{" "}
                          {keysLabel}
                        </p>
                      </span>
                    </summary>
                    <div className="agent-identity__body">
                      <dl className="agent-identity__stats">
                        <div className="agent-identity__stat">
                          <dt>Responsável</dt>
                          <dd>{identityOwner}</dd>
                        </div>
                        <div className="agent-identity__stat">
                          <dt>Ferramentas</dt>
                          <dd>
                            {identity.allowedMcpTools.length}/{MCP_TOOL_COUNT}
                          </dd>
                        </div>
                        <div className="agent-identity__stat">
                          <dt>Chaves</dt>
                          <dd>{keysLabel}</dd>
                        </div>
                        <div className="agent-identity__stat agent-identity__stat--wide">
                          <dt>Cliente observado</dt>
                          <dd>
                            {observedClient ? (
                              <code className="agent-identity__client">{observedClient.slice(0, 160)}</code>
                            ) : (
                              "Ainda não observado"
                            )}
                          </dd>
                        </div>
                      </dl>

                      {keys.length > 0 ? (
                        <section className="agent-identity__section">
                          <h4 className="agent-identity__section-title">Chaves</h4>
                          <ul className="agent-key-list">
                            {keys.map((key) => (
                              <li key={key.id}>
                                <code>{key.tokenPrefix}…</code>
                                <span>
                                  {formatMcpTokenExpiry(key.expiresAt)}
                                  {key.lastUsedAt ? ` · ${formatRelativeDate(key.lastUsedAt)}` : " · nunca usada"}
                                </span>
                                {canManage ? (
                                  <RevokeKeyButton tokenId={key.id} tokenPrefix={key.tokenPrefix} />
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      {lastEvents.length > 0 ? (
                        <section className="agent-identity__section">
                          <h4 className="agent-identity__section-title">Diário de bordo</h4>
                          <ul className="agent-log">
                            {lastEvents.map((event) => (
                              <li key={event.id}>
                                {actorDisplayName({
                                  userName: ownerNames[event.userId] ?? identityOwner,
                                  agentName: identity.name,
                                })}{" "}
                                · {event.action}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      <footer className="agent-identity__footer">
                        <div className="agent-identity__actions-group">
                          {canManage && !isInactive ? <IssueKeyDialog identityId={identity.id} /> : null}
                          <CopyGuideButton identityId={identity.id} />
                        </div>
                        {canManage ? (
                          <div className="agent-identity__actions-group agent-identity__actions-group--secondary">
                            <AgentIdentityLifecycleActions identityId={identity.id} status={identity.status} />
                          </div>
                        ) : null}
                      </footer>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function CreateMcpKeyDialog({
  triggerLabel = "Nova chave MCP",
  triggerVariant = "outline" as const,
}: {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiration, setExpiration] = useState<McpTokenExpirationPreset>(DEFAULT_MCP_TOKEN_EXPIRATION);
  const [allowedTools, setAllowedTools] = useState<Set<string>>(() => new Set(listAllMcpToolNames()));
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setExpiration(DEFAULT_MCP_TOKEN_EXPIRATION);
      setAllowedTools(new Set(listAllMcpToolNames()));
      setRevealedToken(null);
    }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Chave MCP copiada");
    } catch {
      toast.message("Copie a chave manualmente", {
        description: "Use o bloco de código acima.",
      });
    }
  }

  function createKey() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Informe um nome para o agente.");
      return;
    }

    start(async () => {
      const result = await createMcpKeyAction({
        name: trimmed,
        expiration,
        allowedMcpTools: [...allowedTools],
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRevealedToken(result.token);
      router.refresh();
      try {
        await navigator.clipboard.writeText(result.token);
        toast.success("Chave gerada e copiada", {
          description: "Ela não será exibida novamente.",
        });
      } catch {
        toast.success("Chave MCP gerada", {
          description: "Copie agora — ela não será exibida novamente.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant={triggerVariant} disabled={pending}>
          <KeyRound />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="agent-create-dialog">
        <DialogHeader>
          <DialogTitle>Nova chave MCP</DialogTitle>
          <DialogDescription>
            Nome para identificar o agente (Cursor, Claude Code, automação…). Todas as ferramentas vêm
            habilitadas — desmarque o que quiser restringir.
          </DialogDescription>
        </DialogHeader>
        {revealedToken ? (
          <div className="mcp-token-reveal" role="status" aria-live="polite">
            <p className="mcp-token-reveal-label">
              Chave gerada — copie agora; ela não será exibida novamente.
            </p>
            <div className="integration-copy-row">
              <code>{revealedToken}</code>
              <Button type="button" onClick={() => void copyToken(revealedToken)}>
                Copiar chave
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="mcp-key-name">Nome do agente</Label>
              <Input
                id="mcp-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Claude, Cursor, automação…"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mcp-key-expiration">Validade</Label>
              <Select
                value={expiration}
                onValueChange={(value) => setExpiration(value as McpTokenExpirationPreset)}
              >
                <SelectTrigger id="mcp-key-expiration" className="w-full">
                  <SelectValue placeholder="Escolha a validade" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(MCP_TOKEN_EXPIRATION_LABELS) as [McpTokenExpirationPreset, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            {expiration === "never" ? (
              <div className="border border-[color-mix(in_srgb,var(--s-warn)_45%,var(--border))] bg-[var(--s-warn-bg)] px-3 py-2 text-sm text-[var(--text-2)]">
                <strong className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[var(--s-warn)]">
                  Atenção
                </strong>
                Chaves sem expiração permanecem válidas até revogação manual.
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label>Ferramentas MCP</Label>
              <AgentToolPicker selected={allowedTools} onChange={setAllowedTools} />
            </div>
          </div>
        )}
        <DialogFooter>
          {revealedToken ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={pending || name.trim().length < 1 || allowedTools.size === 0}
                onClick={createKey}
              >
                Gerar chave
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueKeyDialog({ identityId }: { identityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [expiration, setExpiration] = useState<McpTokenExpirationPreset>(DEFAULT_MCP_TOKEN_EXPIRATION);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) {
      setToken(null);
      setExpiration(DEFAULT_MCP_TOKEN_EXPIRATION);
    }
  }, [open]);

  async function copyToken() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Chave MCP copiada");
    } catch {
      toast.message("Copie a chave manualmente", {
        description: "Use o bloco de código acima.",
      });
    }
  }

  function generateKey() {
    start(async () => {
      const result = await createMcpKeyAction({
        name: "Chave MCP",
        expiration,
        agentIdentityId: identityId,
      });
      if (!result.ok) toast.error(result.error);
      else {
        setToken(result.token);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          Gerar nova chave
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova chave MCP</DialogTitle>
          <DialogDescription>Exibida uma vez. Nunca grave no repositório.</DialogDescription>
        </DialogHeader>
        {token ? (
          <div className="integration-copy-row">
            <code>{token}</code>
            <Button type="button" onClick={() => void copyToken()}>
              Copiar chave
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-key-expiration">Validade</Label>
              <Select
                value={expiration}
                onValueChange={(value) => setExpiration(value as McpTokenExpirationPreset)}
              >
                <SelectTrigger id="agent-key-expiration" className="w-full">
                  <SelectValue placeholder="Escolha a validade" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(MCP_TOKEN_EXPIRATION_LABELS) as [McpTokenExpirationPreset, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            {expiration === "never" ? (
              <div className="border border-[color-mix(in_srgb,var(--s-warn)_45%,var(--border))] bg-[var(--s-warn-bg)] px-3 py-2 text-sm text-[var(--text-2)]">
                <strong className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[var(--s-warn)]">
                  Atenção
                </strong>
                Chaves sem expiração permanecem válidas até revogação manual.
              </div>
            ) : null}
            <Button type="button" disabled={pending} onClick={generateKey}>
              Gerar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RevokeKeyButton({ tokenId, tokenPrefix }: { tokenId: string; tokenPrefix: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive" disabled={pending}>
          Revogar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revogar chave?</AlertDialogTitle>
          <AlertDialogDescription>
            A chave <strong>{tokenPrefix}…</strong> deixa de funcionar imediatamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const result = await revokeMcpTokenAction(tokenId);
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Chave revogada");
                  router.refresh();
                }
              })
            }
          >
            Revogar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LegacyTokensSection({ tokens }: { tokens: McpTokenRecord[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="mcp-token-legacy">
      <p className="mcp-token-legacy__intro">
        <strong>Chaves legadas</strong> — geradas antes da unificação, sem agente nomeado. Revogue e crie uma
        chave MCP nova para escolher ferramentas e validade.
      </p>
      <ul className="agent-key-list">
        {tokens.map((token) => (
          <li key={token.id}>
            <code>{token.tokenPrefix}…</code>
            <span>
              {token.name?.trim() || "Agente MCP"} · {formatMcpTokenExpiry(token.expiresAt)}
              {token.lastUsedAt ? ` · ${formatRelativeDate(token.lastUsedAt)}` : " · nunca usada"}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="destructive" disabled={pending}>
                  Revogar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revogar chave legada?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A chave <strong>{token.tokenPrefix}…</strong> deixa de funcionar imediatamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      start(async () => {
                        const result = await revokeMcpTokenAction(token.id);
                        if (!result.ok) toast.error(result.error);
                        else {
                          toast.success("Chave revogada");
                          router.refresh();
                        }
                      })
                    }
                  >
                    Revogar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgentIdentityLifecycleActions({
  identityId,
  status,
}: {
  identityId: string;
  status: AgentIdentityRecord["status"];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isInactive = status === "inactive";

  function run(action: () => Promise<{ ok: boolean; error?: string; revokedKeys?: number }>, success: string) {
    start(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.revokedKeys && result.revokedKeys > 0
          ? `${success} ${result.revokedKeys} chave(s) revogada(s).`
          : success,
      );
      router.refresh();
    });
  }

  return (
    <>
      {isInactive ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => reactivateAgentIdentityAction(identityId), "Agente reativado")}
        >
          Reativar
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" size="sm" variant="outline" disabled={pending}>
              Desativar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar agente?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas as chaves deste agente serão revogadas. O histórico no Diário de bordo permanece. Você
                pode reativar depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => run(() => deactivateAgentIdentityAction(identityId), "Agente desativado")}
              >
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" variant="destructive" disabled={pending}>
            Excluir
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              O agente será removido do porto e todas as chaves ligadas a ele serão revogadas. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => run(() => deleteAgentIdentityAction(identityId), "Agente excluído")}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CopyGuideButton({ identityId }: { identityId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await getAgentGuidePreview(identityId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          try {
            await navigator.clipboard.writeText(result.guide);
            toast.success("Guia do Agente copiado");
          } catch {
            toast.message("Copie o Guia do Agente manualmente");
          }
        })
      }
    >
      {pending ? "Copiando…" : "Copiar Guia do Agente"}
    </Button>
  );
}
