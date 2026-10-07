"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createMcpTokenAction, listMcpTokensAction, revokeMcpTokenAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { McpTokenRecord } from "@/lib/db/mcp-tokens";
import {
  DEFAULT_MCP_TOKEN_EXPIRATION,
  MCP_TOKEN_EXPIRATION_LABELS,
  type McpTokenExpirationPreset,
} from "@/lib/validation";
import { formatMcpTokenExpiry } from "@/lib/utils";

export function McpTokensPanel() {
  const [tokens, setTokens] = useState<McpTokenRecord[] | null>(null);
  const [name, setName] = useState("Token MCP");
  const [expiration, setExpiration] = useState<McpTokenExpirationPreset>(DEFAULT_MCP_TOKEN_EXPIRATION);
  const [pending, setPending] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState("");

  useEffect(() => {
    setEndpoint(`${window.location.origin}/api/mcp`);
    void listMcpTokensAction().then((result) => {
      if (result.ok) setTokens(result.tokens);
    });
  }, []);

  async function createToken() {
    setPending(true);
    try {
      const result = await createMcpTokenAction({ name, expiration });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setFreshToken(result.token);
      setTokens((current) => [result.record, ...(current ?? [])]);
      toast.success("Chave MCP gerada. Copie agora — ela não aparece de novo.");
    } finally {
      setPending(false);
    }
  }

  async function revoke(tokenId: string) {
    const result = await revokeMcpTokenAction(tokenId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTokens((current) => (current ?? []).filter((token) => token.id !== tokenId));
    toast.success("Chave revogada.");
  }

  return (
    <section className="account-dialog-section">
      <div className="account-section-heading">
        <p className="eyebrow">Chaves MCP</p>
      </div>
      <p className="account-dialog-hint">
        A chave fica presa ao porto ativo e não cria identidade de agente. Endpoint: {endpoint || "/api/mcp"}
      </p>
      <div className="account-dialog-grid">
        <div className="login-field">
          <Label htmlFor="mcp-token-name">Nome</Label>
          <Input id="mcp-token-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
        </div>
        <div className="login-field">
          <Label htmlFor="mcp-token-expiration">Validade</Label>
          <Select value={expiration} onValueChange={(value) => setExpiration(value as McpTokenExpirationPreset)}>
            <SelectTrigger id="mcp-token-expiration">
              <SelectValue />
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
      </div>
      <Button type="button" className="account-dialog-submit" disabled={pending} onClick={() => void createToken()}>
        {pending ? "Gerando…" : "Gerar chave"}
      </Button>
      {freshToken ? (
        <p className="account-dialog-hint">
          <code>{freshToken}</code>
        </p>
      ) : null}
      {tokens && tokens.length > 0 ? (
        <ul className="account-method-list">
          {tokens.map((token) => (
            <li key={token.id} className="account-method-card">
              <div>
                <p className="account-method-title">{token.name}</p>
                <p className="account-method-status">
                  {token.tokenPrefix}… · {formatMcpTokenExpiry(token.expiresAt)}
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => void revoke(token.id)}>
                Revogar
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
