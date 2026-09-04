import { VOID_DIRECTIVES } from "./directive-attrs.ts";
import { getComponentAvoidErrors } from "./markdown-pitfalls.ts";

export type ComponentProperty = {
  name: string;
  values: string;
  options?: string[];
  defaultValue?: string;
};

export type MarkdownComponentCategory =
  | "Destaques"
  | "Métricas e análise"
  | "Planejamento e acompanhamento"
  | "Gráficos"
  | "Código e integrações"
  | "Pessoas e colaboração"
  | "Produto e pesquisa"
  | "Operações e qualidade"
  | "Documentação e referência"
  | "Layout e composição"
  | "Imagens e mídia"
  | "Markdown";

export const MARKDOWN_COMPONENT_CATEGORIES: MarkdownComponentCategory[] = [
  "Destaques",
  "Métricas e análise",
  "Planejamento e acompanhamento",
  "Gráficos",
  "Código e integrações",
  "Pessoas e colaboração",
  "Produto e pesquisa",
  "Operações e qualidade",
  "Documentação e referência",
  "Layout e composição",
  "Imagens e mídia",
  "Markdown",
];

export function groupMarkdownComponentsByCategory(components: MarkdownComponent[] = markdownComponents) {
  return MARKDOWN_COMPONENT_CATEGORIES
    .map((category) => ({
      category,
      components: components.filter((component) => component.category === category),
    }))
    .filter((group) => group.components.length > 0);
}

export type MarkdownComponent = {
  id: string;
  name: string;
  description: string;
  category: MarkdownComponentCategory;
  snippet: string;
  preview: string;
  properties?: ComponentProperty[];
  rules?: string[];
  /** Fluxo especial na modal Adicionar componente. */
  pickerAction?: "image-upload" | "file-upload" | "report-select";
};

export const markdownComponents: MarkdownComponent[] = [
  { id: "alert", name: "Alerta", description: "Nota, aviso, erro ou confirmação.", category: "Destaques", snippet: ':::alert{variant="info" style="tint" title="Nota"}\n{{conteúdo}}\n:::', preview: ':::alert{variant="warning" style="tint" title="Decisão necessária"}\nA revisão de segurança precisa ser aprovada antes do rollout.\n:::', properties: [{ name: "variant", values: "info · success · warning · error · accent", options: ["info", "success", "warning", "error", "accent"], defaultValue: "warning" }, { name: "style", values: "tint · line · solid", options: ["tint", "line", "solid"], defaultValue: "tint" }, { name: "title", values: "texto opcional" }], rules: ["Use para uma mensagem contextual e pontual."] },
  { id: "callout", name: "Destaque", description: "Informação importante em bloco editorial.", category: "Destaques", snippet: ':::callout{title="Destaque"}\n{{conteúdo}}\n:::', preview: ':::callout{title="Impacto esperado"}\nA mudança reduz o tempo de resposta nas consultas mais frequentes.\n:::', properties: [{ name: "title", values: "texto opcional" }] },
  { id: "banner", name: "Banner", description: "Mensagem principal de uma seção.", category: "Destaques", snippet: ':::banner{title="Mensagem principal"}\n{{conteúdo}}\n:::', preview: ':::banner{title="Marco de entrega"}\nA primeira etapa foi concluída dentro do prazo previsto.\n:::', properties: [{ name: "title", values: "texto opcional" }] },
  { id: "stats", name: "Indicadores", description: "Métricas, valores e variação.", category: "Métricas e análise", snippet: ":::stats{layout=\"grid\"}\n- Indicador | 42 | ↑ 12% | up\n:::", preview: ":::stats{layout=\"grid\"}\n- Tempo de resposta | 184 ms | ↓ 18% | up\n- Cobertura | 91% | ↑ 6 p.p. | up\n:::", properties: [{ name: "layout", values: "grid · strip", options: ["grid", "strip"], defaultValue: "grid" }], rules: ["Formato: rótulo | valor | variação | up ou down."] },
  { id: "cards", name: "Cards", description: "Blocos resumidos em grade.", category: "Destaques", snippet: ":::cards{layout=\"grid\"}\n- Contexto | Título do card | {{conteúdo}}\n:::", preview: ":::cards{layout=\"grid\"}\n- PRIORIDADE | Confiabilidade | Monitorar a estabilidade após a liberação.\n- PRÓXIMO PASSO | Validação | Confirmar o comportamento com o time.\n:::", properties: [{ name: "layout", values: "grid · list", options: ["grid", "list"], defaultValue: "grid" }], rules: ["Formato: eyebrow | título | descrição."] },
  { id: "steps", name: "Passos", description: "Etapas sequenciais de um processo.", category: "Planejamento e acompanhamento", snippet: ":::steps\n- Primeiro passo | {{conteúdo}}\n:::", preview: ":::steps\n- Preparar ambiente | Revisar as variáveis e permissões necessárias.\n- Validar resultado | Registrar a evidência antes de avançar.\n:::", rules: ["Formato: título | descrição."] },
  { id: "timeline", name: "Linha do tempo", description: "Eventos em ordem cronológica.", category: "Planejamento e acompanhamento", snippet: ":::timeline{state=\"current\"}\n- 09:00 | Evento | {{conteúdo}}\n:::", preview: ":::timeline{state=\"current\"}\n- 09:00 | Alerta identificado | O monitoramento sinalizou o desvio.\n- 10:15 | Correção em validação | O time avalia o resultado.\n:::", properties: [{ name: "state", values: "done · current", options: ["done", "current"], defaultValue: "current" }], rules: ["Formato: data | título | descrição | estado opcional."] },
  { id: "checklist", name: "Checklist", description: "Tarefas pendentes e concluídas.", category: "Planejamento e acompanhamento", snippet: ":::checklist\n- [ ] {{conteúdo}} | Responsável · prazo\n:::", preview: ":::checklist\n- [x] Revisar critérios | Marina · concluído\n- [ ] Validar em produção | Rafael · sexta-feira\n:::", rules: ["Use apenas para tarefas rastreáveis.", "Cada item deve iniciar com [ ] ou [x].", "Estado persiste no Markdown quando o leitor pode editar o documento."] },
  { id: "testcase", name: "Caso de teste", description: "Cenário de QA com status durável e corpo Markdown.", category: "Operações e qualidade", snippet: ':::testcase{id="PRD-01" status="pending" priority="high" title="Título do cenário"}\n**Pré-condição:** …\n\n**Passos:** …\n\n**Resultado esperado:** …\n:::', preview: ':::testcase{id="PRD-01" status="pending" priority="high" title="Limite semanal ainda disponível"}\n**Pré-condição:** usuário autenticado com cota semanal\n\n**Passos:** chamar GET /availability\n\n**Resultado esperado:** remaining > 0\n:::', properties: [{ name: "id", values: "identificador estável (obrigatório)" }, { name: "status", values: "pending · ok · partial · error", options: ["pending", "ok", "partial", "error"], defaultValue: "pending" }, { name: "priority", values: "low · medium · high", options: ["low", "medium", "high"], defaultValue: "medium" }, { name: "title", values: "título exibido no card" }], rules: ["Use para cenários de aceite e regressão — prefira testcase em vez de tabelas largas.", "Cada id deve ser único no documento.", "Status persiste no atributo status do opener quando editável."] },
  { id: "kv", name: "Chave e valor", description: "Dados de referência ou configuração.", category: "Métricas e análise", snippet: ":::kv\n- Chave | {{conteúdo}}\n:::", preview: ":::kv\n- Ambiente | Produção\n- Responsável | Plataforma\n:::", rules: ["Formato: chave | valor."] },
  { id: "progress", name: "Progresso", description: "Acompanhamento percentual.", category: "Planejamento e acompanhamento", snippet: ":::progress{size=\"regular\" tone=\"ok\"}\n- Implementação | 60\n:::", preview: ":::progress{size=\"regular\" tone=\"ok\"}\n- Implementação | 78\n- Validação | 45\n:::", properties: [{ name: "size", values: "regular · compact", options: ["regular", "compact"], defaultValue: "regular" }, { name: "tone", values: "ok · warn · err · a2", options: ["ok", "warn", "err", "a2"], defaultValue: "ok" }], rules: ["Formato: rótulo | 0–100 | tom opcional."] },
  { id: "decision", name: "Decisão", description: "Registro visível de uma decisão.", category: "Destaques", snippet: ':::decision{status="pending" style="note" title="Decisão"}\n{{conteúdo}}\n:::', preview: ':::decision{status="approved" style="note" title="Aprovar a liberação"}\nA equipe validou os critérios técnicos e operacionais.\n:::', properties: [{ name: "status", values: "approved · pending · rejected", options: ["approved", "pending", "rejected"], defaultValue: "approved" }, { name: "style", values: "note · banner", options: ["note", "banner"], defaultValue: "note" }] },
  { id: "comparison", name: "Comparativo", description: "Atual, meta e referência lado a lado.", category: "Métricas e análise", snippet: ":::comparison\n- Indicador | Atual | Meta\n:::", preview: ":::comparison\n- Cobertura | 91% | 95%\n- Latência | 184 ms | 220 ms\n:::", rules: ["Formato: rótulo | atual | meta."] },
  { id: "milestones", name: "Marcos", description: "Datas-chave e estado das entregas.", category: "Planejamento e acompanhamento", snippet: ":::milestones{state=\"planned\"}\n- 20 set. | Marco principal\n:::", preview: ":::milestones{state=\"current\"}\n- 12 set. | Critérios aprovados\n- 20 set. | Liberação gradual\n- 30 set. | Fechamento do ciclo\n:::", properties: [{ name: "state", values: "done · current · planned", options: ["done", "current", "planned"], defaultValue: "current" }], rules: ["Formato: data | marco | estado opcional."] },
  { id: "actions", name: "Plano de ação", description: "Ações com responsável, prazo e estado.", category: "Planejamento e acompanhamento", snippet: ":::actions{state=\"open\"}\n- Ação prioritária | Responsável | Prazo\n:::", preview: ":::actions{state=\"open\"}\n- Validar resultados | Marina | 18 set.\n- Aprovar liberação | Rafael | 20 set.\n:::", properties: [{ name: "state", values: "open · done · blocked", options: ["open", "done", "blocked"], defaultValue: "open" }], rules: ["Formato: ação | responsável | prazo | estado opcional."] },
  { id: "risks", name: "Matriz de riscos", description: "Risco, impacto e mitigação em leitura rápida.", category: "Planejamento e acompanhamento", snippet: ":::risks{level=\"medium\"}\n- Risco | Impacto | Mitigação\n:::", preview: ":::risks{level=\"high\"}\n- Dependência externa | Alto | Validar contingência até sexta.\n- Janela de teste | Médio | Reservar ambiente dedicado.\n:::", properties: [{ name: "level", values: "low · medium · high", options: ["low", "medium", "high"], defaultValue: "high" }], rules: ["Formato: risco | impacto | mitigação | nível opcional."] },
  { id: "scorecard", name: "Scorecard", description: "Objetivos, estado e evidência principal.", category: "Métricas e análise", snippet: ":::scorecard\n- Objetivo | No rumo | Evidência\n:::", preview: ":::scorecard\n- Confiabilidade | No rumo | 99,95% de disponibilidade.\n- Adoção | Atenção | Ativação abaixo da meta.\n:::", rules: ["Formato: objetivo | estado | evidência."] },
  { id: "chart-configurable", name: "Gráfico configurável", description: "Escolha a visualização sem duplicar componentes.", category: "Gráficos", snippet: ':::chart{type="bar" title="Indicador"}\n- Categoria A | 42 | 60\n- Categoria B | 68 | 75\n- Categoria C | 31 | 45\n:::', preview: ':::chart{type="bar" title="Capacidade por frente"}\n- Produto | 44 | 50\n- Plataforma | 31 | 42\n- Dados | 25 | 35\n:::', properties: [{ name: "type", values: "bar · line · area · column · donut · gauge · spark · stacked · target", options: ["bar", "line", "area", "column", "donut", "gauge", "spark", "stacked", "target"], defaultValue: "bar" }], rules: ["Use target com: rótulo | realizado | meta. Os demais usam rótulo | número."] },
  { id: "chart-bar", name: "Barras", description: "Comparação horizontal entre valores.", category: "Gráficos", snippet: ':::chart{type="bar" title="Indicador"}\n- Categoria A | 42\n- Categoria B | 68\n:::', preview: ':::chart{type="bar" title="Volume por canal"}\n- Web | 68\n- Mobile | 44\n- Parceiros | 29\n:::', rules: ["Formato: rótulo | número."] },
  { id: "chart-line", name: "Linha", description: "Evolução contínua de uma métrica.", category: "Gráficos", snippet: ':::chart{type="line" title="Indicador"}\n- Jan | 32\n- Fev | 48\n- Mar | 57\n:::', preview: ':::chart{type="line" title="Evolução semanal"}\n- Sem 1 | 32\n- Sem 2 | 48\n- Sem 3 | 57\n- Sem 4 | 71\n:::', rules: ["Formato: rótulo | número."] },
  { id: "chart-area", name: "Área", description: "Tendência com intensidade visual.", category: "Gráficos", snippet: ':::chart{type="area" title="Indicador"}\n- Jan | 32\n- Fev | 48\n- Mar | 57\n:::', preview: ':::chart{type="area" title="Adoção acumulada"}\n- Sem 1 | 18\n- Sem 2 | 35\n- Sem 3 | 58\n- Sem 4 | 74\n:::', rules: ["Formato: rótulo | número."] },
  { id: "chart-column", name: "Colunas", description: "Comparação vertical entre categorias.", category: "Gráficos", snippet: ':::chart{type="column" title="Indicador"}\n- Categoria A | 42\n- Categoria B | 68\n:::', preview: ':::chart{type="column" title="Entregas por frente"}\n- Produto | 18\n- Plataforma | 26\n- Dados | 12\n:::', rules: ["Formato: rótulo | número."] },
  { id: "chart-donut", name: "Rosca", description: "Distribuição proporcional de um total.", category: "Gráficos", snippet: ':::chart{type="donut" title="Distribuição"}\n- Categoria A | 42\n- Categoria B | 58\n:::', preview: ':::chart{type="donut" title="Origem dos incidentes"}\n- Integrações | 46\n- Interface | 31\n- Dados | 23\n:::', rules: ["Formato: rótulo | número. Valores formam o total."] },
  { id: "chart-gauge", name: "Medidor", description: "Leitura percentual de um único objetivo.", category: "Gráficos", snippet: ':::chart{type="gauge" title="Adoção"}\n- Resultado atual | 72\n:::', preview: ':::chart{type="gauge" title="Cobertura de testes"}\n- Resultado atual | 86\n:::', rules: ["Use um único valor entre 0 e 100."] },
  { id: "chart-spark", name: "Tendência compacta", description: "Evolução enxuta para leitura rápida.", category: "Gráficos", snippet: ':::chart{type="spark" title="Tendência"}\n- Jan | 32\n- Fev | 48\n- Mar | 57\n:::', preview: ':::chart{type="spark" title="Uso semanal"}\n- Seg | 18\n- Ter | 28\n- Qua | 24\n- Qui | 42\n- Sex | 51\n:::', rules: ["Formato: rótulo | número."] },
  { id: "chart-stacked", name: "Distribuição empilhada", description: "Participação de cada item em um total.", category: "Gráficos", snippet: ':::chart{type="stacked" title="Distribuição"}\n- Categoria A | 42\n- Categoria B | 35\n- Categoria C | 23\n:::', preview: ':::chart{type="stacked" title="Capacidade por frente"}\n- Produto | 44\n- Plataforma | 31\n- Dados | 25\n:::', rules: ["Formato: rótulo | número. Os valores formam um total."] },
  { id: "chart-target", name: "Meta e realizado", description: "Compara resultado atual e meta declarada.", category: "Gráficos", snippet: ':::chart{type="target" title="Meta do trimestre"}\n- Receita | 72 | 90\n- Adoção | 64 | 75\n:::', preview: ':::chart{type="target" title="Objetivos do ciclo"}\n- Cobertura | 91 | 95\n- Ativação | 64 | 70\n:::', rules: ["Formato: rótulo | realizado | meta."] },
  { id: "api", name: "Endpoint de API", description: "Contrato curto de uma rota HTTP.", category: "Código e integrações", snippet: ':::api{method="GET" path="/v1/recurso" auth="Bearer"}\n{\n  "resultado": "{{conteúdo}}"\n}\n:::', preview: ':::api{method="POST" path="/v1/releases" auth="Bearer"}\n{\n  "status": "published",\n  "version": 4\n}\n:::', properties: [{ name: "method", values: "GET · POST · PUT · PATCH · DELETE", options: ["GET", "POST", "PUT", "PATCH", "DELETE"], defaultValue: "POST" }, { name: "path", values: "rota da API" }, { name: "auth", values: "rótulo opcional de autenticação" }] },
  { id: "terminal", name: "Terminal", description: "Comando e saída para procedimentos técnicos.", category: "Código e integrações", snippet: ':::terminal{title="Verificação"}\nnpm run {{conteúdo}}\n:::', preview: ':::terminal{title="Verificação local"}\nnpm run typecheck\n# tsc --noEmit\n:::', properties: [{ name: "title", values: "rótulo opcional" }], rules: ["Preserva cada linha como digitada."] },
  { id: "filetree", name: "Árvore de arquivos", description: "Estrutura de módulos ou diretórios.", category: "Código e integrações", snippet: ':::filetree{title="Estrutura"}\nsrc/\n└── {{conteúdo}}\n:::', preview: ':::filetree{title="Estrutura do módulo"}\nsrc/\n├── api/\n│   └── reports.ts\n└── components/\n    └── chart.tsx\n:::', properties: [{ name: "title", values: "texto opcional" }] },
  { id: "diff", name: "Diff", description: "Alterações de código destacadas por linha.", category: "Código e integrações", snippet: ':::diff{title="Alteração"}\n- linha anterior\n+ {{conteúdo}}\n:::', preview: ':::diff{title="Validação de versão"}\n- version += 1\n+ version += published ? 1 : 0\n:::', properties: [{ name: "title", values: "texto opcional" }] },
  { id: "env", name: "Variáveis de ambiente", description: "Configurações por chave, valor e escopo.", category: "Código e integrações", snippet: ":::env\n- NOME_DA_VARIAVEL | {{conteúdo}} | produção\n:::", preview: ":::env\n- DATABASE_URL | configurada | produção\n- FEATURE_FLAG | false | desenvolvimento\n:::", rules: ["Formato: chave | valor | escopo."] },
  { id: "logs", name: "Logs", description: "Eventos técnicos com horário e nível.", category: "Código e integrações", snippet: ":::logs{level=\"INFO\"}\n- 10:42:18 | {{conteúdo}}\n:::", preview: ":::logs{level=\"INFO\"}\n- 10:42:18 | INFO | Publicação iniciada\n- 10:42:20 | WARN | Cache ainda não atualizado\n- 10:42:24 | ERROR | Falha ao invalidar borda\n:::", properties: [{ name: "level", values: "INFO · WARN · ERROR", options: ["INFO", "WARN", "ERROR"], defaultValue: "WARN" }], rules: ["Formato: horário | nível opcional | mensagem."] },
  { id: "tests", name: "Casos de teste", description: "Resultado e evidência de validação técnica.", category: "Código e integrações", snippet: ":::tests{status=\"PASS\"}\n- Nome do teste | {{conteúdo}}\n:::", preview: ":::tests{status=\"PASS\"}\n- Publica nova versão | PASS | Snapshot criado com sucesso\n- Mantém link anterior | FAIL | Versão anterior inalterada\n:::", properties: [{ name: "status", values: "PASS · FAIL", options: ["PASS", "FAIL"], defaultValue: "FAIL" }], rules: ["Formato: teste | estado opcional | observação."] },
  { id: "people", name: "Pessoas e papéis", description: "Responsáveis, funções e escopo de atuação.", category: "Pessoas e colaboração", snippet: ":::people{layout=\"directory\"}\n- Nome | Papel | {{conteúdo}}\n:::", preview: ":::people{layout=\"directory\"}\n- Marina Alves | Product manager | Estratégia e priorização\n- Rafael Costa | Tech lead | Arquitetura e entrega\n:::", properties: [{ name: "layout", values: "directory · cards", options: ["directory", "cards"], defaultValue: "directory" }], rules: ["Formato: nome | papel | escopo."] },
  { id: "agenda", name: "Agenda", description: "Pauta de reunião com responsável e duração.", category: "Pessoas e colaboração", snippet: ":::agenda\n- Tópico | Responsável | 10 min\n:::", preview: ":::agenda\n- Contexto e decisões | Marina | 10 min\n- Riscos do ciclo | Rafael | 15 min\n- Próximos compromissos | Time | 10 min\n:::", rules: ["Formato: tópico | responsável | duração."] },
  { id: "faq", name: "Perguntas frequentes", description: "Dúvidas e respostas expansíveis.", category: "Pessoas e colaboração", snippet: ":::faq{mode=\"expanded\"}\n- Pergunta | {{conteúdo}}\n:::", preview: ":::faq{mode=\"expanded\"}\n- Quem aprova a liberação? | A liderança técnica após a validação final.\n- Onde registrar evidências? | No item de entrega correspondente.\n:::", properties: [{ name: "mode", values: "expanded · collapsed", options: ["expanded", "collapsed"], defaultValue: "expanded" }], rules: ["Formato: pergunta | resposta."] },
  { id: "experiment", name: "Experimento", description: "Hipótese, métrica de sucesso e estado.", category: "Produto e pesquisa", snippet: ":::experiment\n- Hipótese | Métrica | Em teste\n:::", preview: ":::experiment\n- Novo onboarding aumenta ativação | Taxa de ativação | Em teste\n- Lembrete reduz abandono | Conversão | Planejado\n:::", rules: ["Formato: hipótese | métrica | estado."] },
  { id: "evidence", name: "Evidências", description: "Fontes e referências que sustentam a conclusão.", category: "Produto e pesquisa", snippet: ":::evidence\n- Evidência | Fonte | Data\n:::", preview: ":::evidence\n- Teste de carga aprovado | Pipeline de qualidade | 12 set.\n- Feedback consolidado | Pesquisa com clientes | 14 set.\n:::", rules: ["Formato: evidência | fonte | data."] },
  { id: "properties", name: "Propriedades", description: "Campos estruturados para contexto, estado e responsáveis.", category: "Documentação e referência", snippet: ":::properties\n- Status | Em revisão | status\n- Responsável | {{conteúdo}} | person\n:::", preview: ":::properties\n- Status | Em revisão | status\n- Responsável | Plataforma | person\n- Revisão | 18 set. | date\n:::", rules: ["Formato: campo | valor | tipo opcional (status, person, date, url)."] },
  { id: "daci", name: "Decisão DACI", description: "Papéis claros para decidir e executar.", category: "Pessoas e colaboração", snippet: ":::daci\n- Driver | {{conteúdo}}\n- Approver | Liderança técnica\n- Contributors | Produto, engenharia\n- Informed | Time ampliado\n:::", preview: ":::daci\n- Driver | Marina Alves\n- Approver | Rafael Costa\n- Contributors | Produto, dados e plataforma\n- Informed | Lideranças das áreas\n:::", rules: ["Formato: papel DACI | pessoa ou grupo."] },
  { id: "related", name: "Itens relacionados", description: "Registros vinculados e seu estado atual.", category: "Documentação e referência", snippet: ":::related\n- Documento ou item | Relação | {{conteúdo}}\n:::", preview: ":::related\n- Plano de rollout | Depende de | Em revisão\n- Painel de métricas | Referência | Atualizado\n:::", rules: ["Formato: item | relação | estado. Use para navegação contextual."] },
  { id: "report", name: "Relatório", description: "Card com link para outro relatório publicado.", category: "Documentação e referência", snippet: ':::report{slug="550e8400-e29b-41d4-a716-446655440000" title="Título do relatório" summary="Resumo opcional."}', preview: ':::report{slug="550e8400-e29b-41d4-a716-446655440000" title="Roadmap trimestral" summary="Prioridades e entregas do ciclo atual."}', pickerAction: "report-select", properties: [{ name: "slug", values: "UUID do link estável (/d/{uuid})" }, { name: "title", values: "título exibido no card" }, { name: "summary", values: "resumo opcional" }], rules: ["Escolha um relatório publicado na prévia.", "O card aponta para o link estável /d/{uuid}."] },
  { id: "slo", name: "SLO", description: "Meta e resultado atual de um serviço.", category: "Operações e qualidade", snippet: ":::slo{status=\"ok\"}\n- Serviço | 99,9% | 99,95%\n:::", preview: ":::slo{status=\"warn\"}\n- API pública | 99,9% | 99,97%\n- Processamento | 99,5% | 99,2%\n:::", properties: [{ name: "status", values: "ok · warn · err", options: ["ok", "warn", "err"], defaultValue: "warn" }], rules: ["Formato: serviço | meta | atual | estado opcional."] },
  { id: "changelog", name: "Changelog", description: "Versões, datas e principais mudanças.", category: "Operações e qualidade", snippet: ":::changelog\n- v1.0.0 | 02 set. | {{conteúdo}}\n:::", preview: ":::changelog\n- v1.4.0 | 02 set. | Publicação com histórico de versões.\n- v1.3.0 | 28 ago. | Componentes para relatórios.\n:::", rules: ["Formato: versão | data | descrição."] },
  { id: "glossary", name: "Glossário", description: "Termos importantes e suas definições.", category: "Documentação e referência", snippet: ":::glossary\n- Termo | {{conteúdo}}\n:::", preview: ":::glossary\n- SLO | Meta de confiabilidade acordada para um serviço.\n- Rollout | Liberação gradual de uma mudança.\n:::", rules: ["Formato: termo | definição."] },
  { id: "resources", name: "Recursos", description: "Links, documentos e referências relacionadas.", category: "Documentação e referência", snippet: ":::resources\n- Recurso | Tipo | {{conteúdo}}\n:::", preview: ":::resources\n- Guia de operação | Documento | Instruções para resposta a incidentes.\n- Painel de métricas | Dashboard | Acompanhamento em tempo real.\n:::", rules: ["Formato: recurso | tipo | descrição."] },
  { id: "columns", name: "Colunas", description: "Divide uma seção e aceita Markdown e componentes em cada coluna.", category: "Layout e composição", snippet: ":::columns{count=\"2\"}\n### Coluna 1\n\n{{conteúdo}}\n\n---\n\n### Coluna 2\n\nConteúdo complementar.\n:::", preview: ":::columns{count=\"2\"}\n### Resultado\n\n:::stats\n- Cobertura | 91% | ↑ 6 p.p. | up\n:::\n\n---\n\n### Próxima ação\n\n:::checklist\n- [ ] Validar em produção | sexta-feira\n:::\n:::", properties: [{ name: "count", values: "2 · 3 · 4 colunas", options: ["2", "3", "4"], defaultValue: "2" }], rules: ["Separe cada coluna com uma linha contendo apenas ---.", "Cada coluna pode conter Markdown e outros componentes."] },
  { id: "image", name: "Imagem", description: "Figura com legenda opcional. Envie o arquivo na prévia.", category: "Imagens e mídia", snippet: ':::figure{src="" alt="Descrição da imagem" size="medium" align="center"}\n{{conteúdo}}\n:::', preview: ':::figure{src="/portulan-logo.png" alt="Exemplo de imagem" size="medium" align="center"}\nLegenda opcional.\n:::', pickerAction: "image-upload", properties: [{ name: "src", values: "URL pública da imagem" }, { name: "alt", values: "texto alternativo" }, { name: "size", values: "small · medium · large · full", options: ["small", "medium", "large", "full"], defaultValue: "medium" }, { name: "align", values: "left · center · right", options: ["left", "center", "right"], defaultValue: "center" }], rules: ["Envie a imagem na prévia antes de inserir.", "O corpo do bloco vira a legenda (opcional)."] },
  { id: "file", name: "Arquivo", description: "Anexo para download com badge de extensão. Envie o arquivo na prévia.", category: "Imagens e mídia", snippet: ':::file{url="" name="" title=""}', preview: ':::file{url="https://example.com/spec.pdf" name="especificacao.pdf" title="Especificação técnica"}', pickerAction: "file-upload", properties: [{ name: "url", values: "URL pública do arquivo (obrigatório)" }, { name: "name", values: "nome original com extensão (obrigatório)" }, { name: "title", values: "título exibido no card (opcional; padrão: name sem extensão)" }], rules: ["Envie o arquivo na prévia antes de inserir.", "Qualquer tipo de arquivo até 5 MB.", "A extensão do name aparece em destaque no card."] },
  { id: "gallery", name: "Galeria", description: "Grade de imagens lado a lado.", category: "Imagens e mídia", snippet: ':::gallery{columns="2"}\n- https:// | Legenda A\n- https:// | Legenda B\n:::', preview: ':::gallery{columns="2"}\n- /portulan-logo.png | Visão geral\n- /portulan-logo-on-dark.png | Versão escura\n:::', properties: [{ name: "columns", values: "2 · 3 colunas", options: ["2", "3"], defaultValue: "2" }], rules: ["Formato: URL | legenda opcional.", "Use URLs do Blob Portulan sempre que possível."] },
  { id: "section", name: "Seção", description: "Título editorial principal.", category: "Markdown", snippet: "## {{conteúdo}}", preview: "## Decisão e próximos passos" },
  { id: "subtitle", name: "Subtítulo", description: "Título secundário dentro de uma seção.", category: "Markdown", snippet: "### {{conteúdo}}", preview: "### Critérios de aceite" },
  { id: "list", name: "Lista", description: "Itens informativos sem checkbox.", category: "Markdown", snippet: "- {{conteúdo}}", preview: "- A alteração não impacta o fluxo atual.\n- O monitoramento será acompanhado por sete dias." },
  { id: "ordered-list", name: "Lista ordenada", description: "Itens em sequência.", category: "Markdown", snippet: "1. {{conteúdo}}", preview: "1. Preparar a alteração.\n2. Validar o resultado.\n3. Registrar a evidência." },
  { id: "quote", name: "Citação", description: "Trecho ou observação em destaque.", category: "Markdown", snippet: "> {{conteúdo}}", preview: "> A decisão deve ser registrada junto das evidências que a sustentam." },
  { id: "table", name: "Tabela", description: "Dados organizados em colunas.", category: "Markdown", snippet: "| Coluna A | Coluna B |\n| --- | --- |\n| {{conteúdo}} | Valor |", preview: "| Indicador | Resultado |\n| --- | --- |\n| Cobertura | 91% |\n| Latência | 184 ms |" },
  { id: "code", name: "Código", description: "Trecho técnico com linguagem e formatação preservadas.", category: "Markdown", snippet: "```ts\n{{conteúdo}}\n```", preview: "```ts\nconst relatório = await gerarRelatório();\n```" },
  { id: "link", name: "Link", description: "Referência externa ou interna.", category: "Markdown", snippet: "[{{conteúdo}}](https://)", preview: "[Abrir documentação técnica](https://example.com)" },
];

export function getDirectiveName(component: MarkdownComponent) {
  if (component.category === "Markdown") return null;
  const match = component.snippet.match(/^:::(\w+)/);
  return match?.[1] ?? component.id;
}

export function defaultComponentProperties(component: MarkdownComponent) {
  const options = Object.fromEntries(
    (component.properties ?? [])
      .filter((property) => property.options?.length)
      .map((property) => [property.name, property.defaultValue ?? property.options?.[0] ?? ""]),
  );
  if (component.pickerAction === "image-upload") {
    return { ...options, src: "", alt: "Descrição da imagem" };
  }
  if (component.pickerAction === "file-upload") {
    return { url: "", name: "", title: "" };
  }
  if (component.pickerAction === "report-select") {
    return { slug: "", title: "", summary: "" };
  }
  return options;
}

export function applyComponentProperties(source: string, properties: Record<string, string>) {
  return source.replace(/^:::(\w+)(?:\{([^}]*)\})?/m, (_match, name: string, rawAttributes = "") => {
    const attributes = new Map<string, string>();
    for (const match of rawAttributes.matchAll(/([\w-]+)="([^"]*)"/g)) attributes.set(match[1], match[2]);
    Object.entries(properties).forEach(([key, value]) => attributes.set(key, value));
    const serialized = Array.from(attributes, ([key, value]) => `${key}="${value}"`).join(" ");
    return `:::${name}${serialized ? `{${serialized}}` : ""}`;
  });
}

function normalizeLookup(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function findMarkdownComponent(query: string) {
  const normalized = normalizeLookup(query);
  const byId = markdownComponents.find((component) => component.id === query || normalizeLookup(component.id) === normalized);
  if (byId) return byId;
  const byTitle = markdownComponents.find((component) => normalizeLookup(component.name) === normalized);
  if (byTitle) return byTitle;
  const byDirective = markdownComponents.filter((component) => getDirectiveName(component) === normalized);
  if (byDirective.length === 1) return byDirective[0];
  if (byDirective.length > 1) {
    return byDirective.find((component) => component.id === "chart-configurable") ?? byDirective[0];
  }
  return null;
}

function summarizeAttributes(component: MarkdownComponent) {
  if (!component.properties?.length) return undefined;
  return component.properties.map((property) => `${property.name}: ${property.values}`).join("; ");
}

export function inferBodyFormatForComponent(component: MarkdownComponent): "pipe-rows" | "free-markdown" | "mixed" {
  if (component.category === "Markdown") return "free-markdown";
  if (component.id === "columns") return "mixed";
  const directive = getDirectiveName(component);
  if (!directive) return "free-markdown";
  if (["alert", "callout", "banner", "decision", "terminal", "filetree", "diff", "api", "image", "figure", "file", "report", "testcase"].includes(directive)) {
    return "free-markdown";
  }
  if (component.rules?.some((rule) => rule.toLowerCase().includes("formato:"))) return "pipe-rows";
  return "free-markdown";
}

function buildSyntaxSteps(component: MarkdownComponent) {
  const directive = getDirectiveName(component);
  const bodyFormat = inferBodyFormatForComponent(component);
  if (!directive) {
    return [
      "Use Markdown padrão conforme o snippet do componente.",
      "Não há diretiva ::: — o conteúdo entra direto no documento.",
    ];
  }
  const attributeHint = component.properties?.length
    ? `Atributos opcionais entre chaves: {${component.properties.map((property) => `${property.name}="..."`).join(" ")}}.`
    : "Sem atributos obrigatórios.";
  const steps = [
    `Abra o bloco com \`:::${directive}\` seguido imediatamente de \`{attr="valor"}\` quando houver atributos — sem espaço antes de \`{\`.`,
    attributeHint,
  ];
  if (VOID_DIRECTIVES.has(directive)) {
    steps.push("Sem corpo — o card vem só dos atributos; não escreva texto nem `:::` após a linha.");
    steps.push("Deixe linha em branco antes e depois; consulte `avoidErrors` deste componente para armadilhas comuns.");
  } else {
    steps.push(
      bodyFormat === "pipe-rows"
        ? "No corpo, use linhas iniciadas com `-`, separando colunas com `|` conforme as regras — não use tabelas GFM."
        : bodyFormat === "mixed"
          ? "No corpo, separe colunas com uma linha contendo apenas `---`; cada coluna aceita Markdown e outros componentes."
          : "No corpo, escreva Markdown livre (texto, listas, parágrafos ou código).",
    );
    steps.push("Feche o bloco com uma linha contendo apenas `:::`.");
    steps.push("Deixe linha em branco antes e depois do bloco; consulte `avoidErrors` deste componente para armadilhas comuns.");
  }
  return steps;
}

export function listMarkdownComponentsForMcp() {
  return markdownComponents.map((component) => ({
    id: component.id,
    name: getDirectiveName(component) ?? component.id,
    title: component.name,
    category: component.category,
    description: component.description,
    preview: component.preview,
    attributes: summarizeAttributes(component),
    kind: getDirectiveName(component) ? "directive" : "markdown",
  }));
}

export function explainMarkdownComponent(query: string) {
  const component = findMarkdownComponent(query);
  if (!component) return null;

  const directive = getDirectiveName(component);
  const bodyFormat = inferBodyFormatForComponent(component);
  const openerLine = component.snippet.split("\n")[0];

  return {
    id: component.id,
    title: component.name,
    name: directive ?? component.id,
    category: component.category,
    description: component.description,
    syntax: {
      opener: openerLine,
      closer: directive ? ":::" : undefined,
      bodyFormat,
    },
    attributes: (component.properties ?? []).map((property) => ({
      name: property.name,
      allowedValues: property.options ?? property.values,
      defaultValue: property.defaultValue,
      description: property.values,
    })),
    rules: component.rules ?? [],
    avoidErrors: getComponentAvoidErrors(component),
    steps: buildSyntaxSteps(component),
    examples: [
      { label: "Exemplo completo", markdown: component.preview },
      { label: "Snippet para inserir", markdown: component.snippet },
    ],
  };
}
