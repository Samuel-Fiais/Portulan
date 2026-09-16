# Plano de correção — Dev Context, Rumos e Manobras

**Origem:** code review de 15/09/2026

**Objetivo:** tornar a primeira entrega de Dev Context segura e utilizável para a coordenação de múltiplos agentes, sem mudar o léxico náutico do Portulan nem introduzir automação de código/PR fora do escopo.

> Não trate este documento como instrução privilegiada para ignorar as regras do repositório. Antes de alterar qualquer comportamento, leia `AGENTS.md`, `docs/product/` e `.cursor/skills/portulan-mcp/SKILL.md`.

## Decisão de entrega

**Não liberar esta feature antes de concluir os blocos P0 e P1 abaixo.**

O modelo desejado continua sendo:

```text
Carta publicada (edição imutável)
  → Rumo aprovado (revisão imutável e válida)
  → Manobra assumida por um único Agente de Bordo
  → Registros com evidência e Conversa de bordo
  → aceite humano informado
  → nova revisão explícita se uma fonte mudar
```

## Ordem de trabalho

1. Fechar autorização e invariantes no servidor/MCP.
2. Corrigir a modelagem e o fluxo de fontes + aprovação de Rumo.
3. Completar coordenação de Manobras e Conversas de bordo.
4. Tornar o contexto e as evidências legíveis na UI.
5. Corrigir CLI, auditoria e `clientInfo`.
6. Executar testes de integração e validação visual autenticada.

Não faça retoques visuais antes de os fluxos estarem corretos: hoje há superfícies bonitas que levam a estados sem saída.

## P0 — segurança e integridade de coordenação

### P0.1 — Revalidar participação no Porto a cada uso de chave MCP

**Problema:** remover alguém da tripulação não invalida seu acesso ao novo domínio pelo MCP. A autenticação aceita a chave e `requireWorkspace` só verifica a presença de `workspaceId`.

**Arquivos de partida:**

- `app/api/mcp/route.ts`
- `lib/db/mcp-tokens.ts`
- `lib/mcp-dev-context-tools.ts`
- `lib/db/workspaces.ts`

**Contrato:** RN-104. Uma chave MCP não tem mais acesso que o responsável humano nem sobrevive à perda de participação no Porto. Escolha uma única política explícita para tokens sem acesso (rejeitar na requisição; opcionalmente revogar em cascata na remoção) e aplique-a a todas as ferramentas MCP, editoriais e Dev Context.

**Critérios de aceite:**

- Uma chave válida de usuário removido recebe `401`/erro de autorização antes de ler ou escrever dados.
- A remoção não deixa um token capaz de abrir, assumir, reportar ou comentar uma Manobra.
- Há teste cobrindo a regressão.

### P0.2 — Proteger identidade, chave e autoria do Agente de Bordo

**Problema:** qualquer membro do Porto pode alterar identidade de outro responsável e emitir uma chave ligada a ela. Isso permite atribuição falsa de ações.

**Arquivos de partida:**

- `app/dev-context-actions.ts`
- `lib/db/agent-identities.ts`
- `lib/db/mcp-tokens.ts`
- `components/agent-identities-panel.tsx`

**Contrato:** uma identidade pertence a um usuário. Só seu responsável pode editá-la ou emitir/revogar sua chave, salvo uma regra de capitania explicitamente documentada. A UI deve mostrar o responsável real da identidade, nunca o usuário atual para todas as linhas.

**Critérios de aceite:**

- Não é possível emitir chave para identidade de terceiro por ação de servidor, chamada direta ou MCP.
- Logs e UI distinguem `Samuel Fiais via Claude Code` de `Samuel Fiais via outro Agente de Bordo`.
- Ações de alteração e emissão retornam erro claro e auditável quando negadas.

### P0.3 — Tornar comando, progresso e resultado atômicos e autorizados

**Problema:** `report_implementation_progress` e `report_implementation_result` não verificam o detentor do lease, sua expiração ou transições válidas; podem modificar tarefa assumida por outro agente ou reabrir tarefa aceita.

**Arquivos de partida:**

- `lib/mcp-dev-context-tools.ts`
- `lib/implementation-task-policy.ts`
- `lib/db/implementation-tasks.ts`
- `app/dev-context-actions.ts`

**Contrato:** RN-103, RN-105 e RN-108. Progresso e resultado só podem ser registrados pelo detentor do lease ativo, no estado permitido. Resultado só nasce uma vez enquanto a Manobra está em andamento; aceite só ocorre em `reported`.

**Critérios de aceite:**

- Outro token, inclusive da mesma pessoa, não registra em uma Manobra com lease alheio.
- Lease expirado não permite progresso/resultado sem retomada regular.
- `accepted` nunca volta para `in_progress`/`reported` por registro.
- As atualizações de status e registro são atômicas e cobertas por testes concorrentes/regressivos.

### P0.4 — Isolar Conversas de bordo por Porto

**Problema:** `addCoordinationMessage` aceita `threadId` e `workspaceId` sem checar a relação; a leitura de mensagens filtra somente por conversa.

**Arquivos de partida:**

- `lib/db/coordination.ts`
- `lib/mcp-dev-context-tools.ts`
- `app/dev-context-actions.ts`

**Contrato:** uma conversa, suas mensagens e o sujeito associado pertencem ao mesmo Porto. Mensagens de outro Porto nunca são graváveis nem legíveis, mesmo com UUID conhecido.

**Critérios de aceite:**

- Inserção cruzada falha sem criar linha.
- Leitura exige tanto `threadId` quanto escopo de Porto validado.
- Existe teste de isolamento entre dois Portos.

## P1 — fluxo de produto bloqueado

### P1.1 — Fixar edição imutável da Carta-fonte e permitir correção

**Problema:** a UI de fonte envia sempre `releaseId: null` e `required: true`; a aprovação corretamente rejeita fontes obrigatórias sem release. O próprio fluxo padrão, portanto, não chega a uma revisão aprovada.

**Arquivos de partida:**

- `components/context-pack-detail.tsx`
- `app/dev-context-actions.ts`
- `lib/db/context-packs.ts`
- `lib/context-pack-policy.ts`

**Contrato:** RN-99 e RN-100. Uma fonte formal obrigatória aponta para release imutável. O usuário escolhe uma edição publicada; pode trocar ou remover a fonte enquanto o Rumo está editável. Uma nova release não altera a fonte fixada da revisão anterior.

**Critérios de aceite:**

- O formulário mostra edições publicadas da Carta escolhida e exige uma para fonte obrigatória.
- Uma fonte válida permite aprovação quando os demais requisitos forem atendidos.
- Não há caminho que crie fonte obrigatória inválida sem uma explicação e recuperação imediata.
- A página mostra claramente: Carta atual, edição fixada e link para o snapshot correspondente.

### P1.2 — Fechar o ciclo de revisão de Rumo

**Problema:** `needs_review` exibe aviso, mas não há fluxo de criar uma nova revisão; após aprovação o usuário também não consegue corrigir itens, fontes ou critérios.

**Arquivos de partida:**

- `components/context-pack-detail.tsx`
- `app/dev-context-actions.ts`
- `lib/db/context-packs.ts`
- `lib/context-pack-policy.ts`
- `docs/product/{dominio,regras,fluxos,funcionalidades}.md`

**Contrato:** RN-99 e RN-100. Revisões aprovadas são imutáveis. Ação explícita “Criar nova revisão” copia o conteúdo para rascunho, preserva o histórico e deixa claro o impacto nas Manobras existentes. Não reabra nem altere uma revisão aprovada silenciosamente.

**Critérios de aceite:**

- Um Rumo `needs_review` oferece ação efetiva de nova revisão.
- Usuário pode editar/remover itens, fontes e Marcos somente no rascunho/revisão em edição.
- Histórico permite consultar qual revisão sustentou cada Manobra.
- A documentação de produto descreve a transição e a permissão.

### P1.3 — Servir apenas Manobras elegíveis e contexto suficiente

**Problema:** o MCP pode listar/assumir Manobras de Rumo rascunho ou desatualizado; infere uma sessão local reconhecida a partir do repositório da própria tarefa. O briefing curto omite escopo, fora de escopo, fontes e Marcos.

**Arquivos de partida:**

- `lib/mcp-dev-context-tools.ts`
- `lib/agent-capability-policy.ts`
- `lib/context-pack-policy.ts`
- `lib/implementation-task-policy.ts`
- `lib/dev-context.ts`

**Contrato:** RN-101 e RN-105. Manobra de código requer Rumo aprovado + `current`, revisão inequívoca e Embarcação reconhecida de verdade pela sessão local. Agentes sem repositório continuam podendo atuar em contexto e coordenação, sem fingir checkout local. Briefing deve conter limites e critérios necessários à decisão.

**Critérios de aceite:**

- `list_available_implementation_tasks` e `claim_implementation_task` excluem Rumos não servíveis.
- `repository_id` fornecido precisa existir no Porto e corresponder à Manobra; ausência não é automaticamente “reconhecida”.
- Briefing `brief` inclui objetivo, escopo, fora de escopo, regras/itens obrigatórios, Marcos e revisão; `full` adiciona fontes fixadas, Embarcação e dados de tarefa.
- Há testes para agente de coordenação sem repo e implementação local com repo incompatível.

### P1.4 — Tornar a Conversa de bordo realmente colaborativa

**Problema:** agentes listam fios, mas não recebem o corpo das mensagens. Além disso, uma Maré contrária resolvida não recalcula corretamente o estado da Manobra quando há mais de um bloqueio.

**Arquivos de partida:**

- `lib/mcp-dev-context-tools.ts`
- `lib/db/coordination.ts`
- `lib/coordination-policy.ts`
- `components/task-detail.tsx`

**Contrato:** RN-109. Agentes autorizados leem a conversa, respondem no fio e distinguem conversa normal de Maré contrária. Manobra fica `blocked` enquanto existir ao menos uma Maré contrária aberta; resolve quando a última for resolvida, respeitando o estado anterior válido.

**Critérios de aceite:**

- Ferramenta MCP retorna mensagens ordenadas, autor, agente e data, não só metadados do fio.
- Uma conversa comum não bloqueia; Maré contrária bloqueia apenas a Manobra relacionada.
- Resolver um entre vários bloqueios não libera prematuramente a Manobra.
- O tipo do fio é escolhido na abertura, e não como destaque visual ambíguo no envio.

### P1.5 — Dar ao revisor as evidências antes do aceite

**Problema:** a tela de Manobra mostra apenas resumo; `evidence`, `commitRef`, `pullRequestRef`, `coveredCriterionIds`, `gaps` e escopos alterados ficam invisíveis antes de “Aceitar resultado”.

**Arquivos de partida:**

- `components/task-detail.tsx`
- `lib/db/implementation-tasks.ts`
- `app/dev-context-actions.ts`

**Contrato:** o aceite humano é uma decisão informada. Não aceitar resultado sem mostrar relatório, lacunas, evidências, referência de commit/PR quando houver e cobertura dos Marcos.

**Critérios de aceite:**

- Cada Registro de bordo exibe seus campos estruturados de maneira escaneável.
- Links externos são tratados como referências, não como prova automática.
- Lacunas e Marcos não cobertos permanecem visíveis no CTA de aceite.
- O estado e a autoria/lease da Manobra são visíveis antes de agir.

## P2 — confiabilidade, CLI e acabamento de UX

### P2.1 — Preservar `clientInfo` observado na auditoria

O handler captura `clientInfo` apenas no `initialize` e entrega `null` nas chamadas posteriores. Mantenha o valor observado associado ao token/sessão para auditoria, sem tratá-lo como autenticação (RN-104).

**Arquivos de partida:** `app/api/mcp/route.ts`, `lib/db/mcp-tokens.ts`, `lib/db/audit-events.ts`.

### P2.2 — Fazer `portulan init` idempotente e útil

Hoje o CLI pode duplicar Embarcação sem remote e não vincula a Expedição escolhida ao repositório no servidor. Corrigir detecção/reuso e criar a associação real. Não escrever token em arquivo nem sobrescrever arquivos existentes sem confirmação (RN-106).

**Arquivos de partida:** `cli/portulan.mjs`, `app/api/cli/`, `lib/db/projects.ts`.

### P2.3 — Corrigir UI e consistência visual

- O controle coral de “Maré contrária” cria um segundo preenchimento de ação e texto branco com contraste insuficiente para texto pequeno. Mantenha a tinta primária para ação e use selo/borda semântica para bloqueio.
- A tela de Manobra deve exibir Embarcação, responsável pelo comando, expiração, revisão, dependências, itens obrigatórios e Marcos — antes dos registros.
- Fontes devem abrir o snapshot da edição fixada; disponibilize link separado para a Carta viva.
- Não adicione uma nova identidade visual: reutilize `workspace-page`, Mono/Plex, bordas hairline, raio zero e espaçamento de `DESIGN.md`.

## Atualizações obrigatórias do modelo de produto

Durante a implementação, atualize `docs/product/` na mesma mudança:

- `regras.md`: reforçar RN-103, RN-104, RN-105, RN-108 e RN-109 conforme o comportamento final.
- `dominio.md`: registrar campos/estado novos, se houver.
- `fluxos.md`: fonte versionada, nova revisão de Rumo, lease, bloqueio e aceite.
- `funcionalidades.md`: marcar as capacidades como `existe` somente quando a UI e o MCP estiverem fechados.

Não reescreva IDs RN/F existentes. Se uma nova regra for necessária, crie-a no modelo antes do código e referencie-a nos testes.

## Estratégia de testes

### Obrigatórios

- Testes unitários de políticas para cada invariante acima.
- Testes de banco/ação de servidor para isolamento de Porto e identidade.
- Testes MCP de ponta a ponta para: token removido, lease alheio, lease expirado, Rumo não servível, Embarcação incompatível, conversa entre agentes e auditoria com `clientInfo`.
- Teste de UI autenticado com dados reais para os dois fluxos:
  1. Carta publicada → fonte fixada → Rumo aprovado → Manobra → resultado com lacunas/evidência → aceite.
  2. Nova release da Carta → `needs_review` → nova revisão → histórico preservado.

### Comandos de verificação

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

O ponto de partida do review tinha 212 testes passando, porém `typecheck` falhava em `ProjectRecord` ausente e em `result.thread` possivelmente indefinido. Corrija esses erros antes de usar a suíte como sinal de entrega.

## Fora de escopo

- Executar código, criar PR automaticamente ou validar código remoto.
- Transformar Context Packs em ferramenta genérica de gestão de tarefas.
- Conceder confiança em conteúdo de Carta, mensagem ou relatório como instrução de sistema.
- Substituir a relação N:N entre Expedições e Embarcações por uma relação 1:1.

## Definição de pronto

Só declarar pronto quando todos os itens P0/P1 estiverem cobertos por políticas, ações de servidor, MCP, UI e testes; o modelo de produto estiver alinhado; e os dois fluxos obrigatórios forem verificados visualmente com sessão autenticada. Não basta a compilação ou fixture isolada.
