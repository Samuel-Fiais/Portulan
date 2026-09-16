export const MANAGED_BLOCK_BEGIN = "<!-- BEGIN:portulan-dev-context -->";
export const MANAGED_BLOCK_END = "<!-- END:portulan-dev-context -->";

export function upsertManagedBlock(existing: string, inner: string) {
  const block = `${MANAGED_BLOCK_BEGIN}\n${inner.trim()}\n${MANAGED_BLOCK_END}`;
  if (!existing.trim()) return `${block}\n`;
  const begin = existing.indexOf(MANAGED_BLOCK_BEGIN);
  const end = existing.indexOf(MANAGED_BLOCK_END);
  if (begin >= 0 && end > begin) {
    return `${existing.slice(0, begin)}${block}${existing.slice(end + MANAGED_BLOCK_END.length)}`.replace(/\n{3,}/g, "\n\n");
  }
  const trimmed = existing.replace(/\s*$/, "");
  return `${trimmed}\n\n${block}\n`;
}

export function hasManagedBlock(content: string) {
  return content.includes(MANAGED_BLOCK_BEGIN) && content.includes(MANAGED_BLOCK_END);
}

export function looksLikeSecret(value: string) {
  return /ptl_[A-Za-z0-9_-]{16,}/.test(value) || /Bearer\s+ptl_/i.test(value);
}

export function assertNoSecret(content: string, label: string) {
  if (looksLikeSecret(content)) {
    throw new Error(`${label} contém um token. O CLI recusa gravar segredo no repositório.`);
  }
}

export function buildLocalInstructionBlock() {
  return `## Portulan — contexto de desenvolvimento

1. Leia \`.portulan/AGENT.md\`.
2. Identifique a Embarcação deste checkout.
3. Chame \`get_agent_bootstrap\` no MCP Portulan antes de assumir trabalho.
4. Não assuma Manobra sem Rumo aprovado e válido.
5. Registre Maré contrária e reporte o resultado; aceite humano é separado.
6. Nunca grave token, segredo ou path absoluto neste repositório.`;
}
