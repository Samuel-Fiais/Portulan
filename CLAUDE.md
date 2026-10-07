@AGENTS.md

<!-- BEGIN:portulan-agent-setup -->
## Portulan — contexto de desenvolvimento

Setup: skill `portulan-mcp` (seção **Setup com chave do responsável**) ou Guia do Agente.

1. O **humano** gera `ptl_…` no modal da conta e cola o **Guia do Agente** no chat (só isso).
2. O **agente** configura MCP e `export PORTULAN_TOKEN`, e testa o endpoint.
3. Chame `get_system_guide` e `list_workspaces` antes de editar cartas.
4. Nunca grave token, segredo ou path absoluto neste repositório (RN-106).
<!-- END:portulan-agent-setup -->
