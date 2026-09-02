"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Blocks, Check, ChevronRight, Copy, Download, ExternalLink, Eye, FileText, Globe, History, Link2, LoaderCircle, MoreHorizontal, PanelRight, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDocumentAction, deleteDocumentAction, publishDocumentAction, updateDocumentAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";
import { ReportPreview } from "@/components/report-preview";
import { RichMarkdown } from "@/components/rich-markdown";
import { StatusBadge, TemplateBadge } from "@/components/document-badges";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { documentStatuses, statusMeta, type DocumentRecord, type DocumentRelease, type TemplateRecord } from "@/lib/documents";
import { cn, formatRelativeDate } from "@/lib/utils";

type ComponentProperty = {
  name: string;
  values: string;
  options?: string[];
  defaultValue?: string;
};

type MarkdownComponent = {
  id: string;
  name: string;
  description: string;
  category: "Destaques" | "Métricas e análise" | "Planejamento e acompanhamento" | "Gráficos" | "Código e integrações" | "Pessoas e colaboração" | "Produto e pesquisa" | "Operações e qualidade" | "Documentação e referência" | "Layout e composição" | "Markdown";
  snippet: string;
  preview: string;
  properties?: ComponentProperty[];
  rules?: string[];
};

const markdownComponents: MarkdownComponent[] = [
  { id: "alert", name: "Alerta", description: "Nota, aviso, erro ou confirmação.", category: "Destaques", snippet: ':::alert{variant="info" style="tint" title="Nota"}\n{{conteúdo}}\n:::', preview: ':::alert{variant="warning" style="tint" title="Decisão necessária"}\nA revisão de segurança precisa ser aprovada antes do rollout.\n:::', properties: [{ name: "variant", values: "info · success · warning · error · accent", options: ["info", "success", "warning", "error", "accent"], defaultValue: "warning" }, { name: "style", values: "tint · line · solid", options: ["tint", "line", "solid"], defaultValue: "tint" }, { name: "title", values: "texto opcional" }], rules: ["Use para uma mensagem contextual e pontual."] },
  { id: "callout", name: "Destaque", description: "Informação importante em bloco editorial.", category: "Destaques", snippet: ':::callout{title="Destaque"}\n{{conteúdo}}\n:::', preview: ':::callout{title="Impacto esperado"}\nA mudança reduz o tempo de resposta nas consultas mais frequentes.\n:::', properties: [{ name: "title", values: "texto opcional" }] },
  { id: "banner", name: "Banner", description: "Mensagem principal de uma seção.", category: "Destaques", snippet: ':::banner{title="Mensagem principal"}\n{{conteúdo}}\n:::', preview: ':::banner{title="Marco de entrega"}\nA primeira etapa foi concluída dentro do prazo previsto.\n:::', properties: [{ name: "title", values: "texto opcional" }] },
  { id: "stats", name: "Indicadores", description: "Métricas, valores e variação.", category: "Métricas e análise", snippet: ":::stats{layout=\"grid\"}\n- Indicador | 42 | ↑ 12% | up\n:::", preview: ":::stats{layout=\"grid\"}\n- Tempo de resposta | 184 ms | ↓ 18% | up\n- Cobertura | 91% | ↑ 6 p.p. | up\n:::", properties: [{ name: "layout", values: "grid · strip", options: ["grid", "strip"], defaultValue: "grid" }], rules: ["Formato: rótulo | valor | variação | up ou down."] },
  { id: "cards", name: "Cards", description: "Blocos resumidos em grade.", category: "Destaques", snippet: ":::cards{layout=\"grid\"}\n- Contexto | Título do card | {{conteúdo}}\n:::", preview: ":::cards{layout=\"grid\"}\n- PRIORIDADE | Confiabilidade | Monitorar a estabilidade após a liberação.\n- PRÓXIMO PASSO | Validação | Confirmar o comportamento com o time.\n:::", properties: [{ name: "layout", values: "grid · list", options: ["grid", "list"], defaultValue: "grid" }], rules: ["Formato: eyebrow | título | descrição."] },
  { id: "steps", name: "Passos", description: "Etapas sequenciais de um processo.", category: "Planejamento e acompanhamento", snippet: ":::steps\n- Primeiro passo | {{conteúdo}}\n:::", preview: ":::steps\n- Preparar ambiente | Revisar as variáveis e permissões necessárias.\n- Validar resultado | Registrar a evidência antes de avançar.\n:::", rules: ["Formato: título | descrição."] },
  { id: "timeline", name: "Linha do tempo", description: "Eventos em ordem cronológica.", category: "Planejamento e acompanhamento", snippet: ":::timeline{state=\"current\"}\n- 09:00 | Evento | {{conteúdo}}\n:::", preview: ":::timeline{state=\"current\"}\n- 09:00 | Alerta identificado | O monitoramento sinalizou o desvio.\n- 10:15 | Correção em validação | O time avalia o resultado.\n:::", properties: [{ name: "state", values: "done · current", options: ["done", "current"], defaultValue: "current" }], rules: ["Formato: data | título | descrição | estado opcional."] },
  { id: "checklist", name: "Checklist", description: "Tarefas pendentes e concluídas.", category: "Planejamento e acompanhamento", snippet: ":::checklist\n- [ ] {{conteúdo}} | Responsável · prazo\n:::", preview: ":::checklist\n- [x] Revisar critérios | Marina · concluído\n- [ ] Validar em produção | Rafael · sexta-feira\n:::", rules: ["Use apenas para tarefas rastreáveis.", "Cada item deve iniciar com [ ] ou [x]."] },
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
  { id: "logs", name: "Logs", description: "Eventos técnicos com horário e nível.", category: "Código e integrações", snippet: ":::logs{level=\"INFO\"}\n- 10:42:18 | {{conteúdo}}\n:::", preview: ":::logs{level=\"WARN\"}\n- 10:42:18 | Publicação iniciada\n- 10:42:20 | Cache ainda não atualizado\n- 10:42:24 | Publicação concluída\n:::", properties: [{ name: "level", values: "INFO · WARN · ERROR", options: ["INFO", "WARN", "ERROR"], defaultValue: "WARN" }], rules: ["Formato: horário | nível opcional | mensagem."] },
  { id: "tests", name: "Casos de teste", description: "Resultado e evidência de validação técnica.", category: "Código e integrações", snippet: ":::tests{status=\"PASS\"}\n- Nome do teste | {{conteúdo}}\n:::", preview: ":::tests{status=\"FAIL\"}\n- Publica nova versão | Snapshot criado com sucesso\n- Mantém link anterior | Versão anterior inalterada\n:::", properties: [{ name: "status", values: "PASS · FAIL", options: ["PASS", "FAIL"], defaultValue: "FAIL" }], rules: ["Formato: teste | estado opcional | observação."] },
  { id: "people", name: "Pessoas e papéis", description: "Responsáveis, funções e escopo de atuação.", category: "Pessoas e colaboração", snippet: ":::people{layout=\"directory\"}\n- Nome | Papel | {{conteúdo}}\n:::", preview: ":::people{layout=\"directory\"}\n- Marina Alves | Product manager | Estratégia e priorização\n- Rafael Costa | Tech lead | Arquitetura e entrega\n:::", properties: [{ name: "layout", values: "directory · cards", options: ["directory", "cards"], defaultValue: "directory" }], rules: ["Formato: nome | papel | escopo."] },
  { id: "agenda", name: "Agenda", description: "Pauta de reunião com responsável e duração.", category: "Pessoas e colaboração", snippet: ":::agenda\n- Tópico | Responsável | 10 min\n:::", preview: ":::agenda\n- Contexto e decisões | Marina | 10 min\n- Riscos do ciclo | Rafael | 15 min\n- Próximos compromissos | Time | 10 min\n:::", rules: ["Formato: tópico | responsável | duração."] },
  { id: "faq", name: "Perguntas frequentes", description: "Dúvidas e respostas expansíveis.", category: "Pessoas e colaboração", snippet: ":::faq{mode=\"expanded\"}\n- Pergunta | {{conteúdo}}\n:::", preview: ":::faq{mode=\"expanded\"}\n- Quem aprova a liberação? | A liderança técnica após a validação final.\n- Onde registrar evidências? | No item de entrega correspondente.\n:::", properties: [{ name: "mode", values: "expanded · collapsed", options: ["expanded", "collapsed"], defaultValue: "expanded" }], rules: ["Formato: pergunta | resposta."] },
  { id: "experiment", name: "Experimento", description: "Hipótese, métrica de sucesso e estado.", category: "Produto e pesquisa", snippet: ":::experiment\n- Hipótese | Métrica | Em teste\n:::", preview: ":::experiment\n- Novo onboarding aumenta ativação | Taxa de ativação | Em teste\n- Lembrete reduz abandono | Conversão | Planejado\n:::", rules: ["Formato: hipótese | métrica | estado."] },
  { id: "evidence", name: "Evidências", description: "Fontes e referências que sustentam a conclusão.", category: "Produto e pesquisa", snippet: ":::evidence\n- Evidência | Fonte | Data\n:::", preview: ":::evidence\n- Teste de carga aprovado | Pipeline de qualidade | 12 set.\n- Feedback consolidado | Pesquisa com clientes | 14 set.\n:::", rules: ["Formato: evidência | fonte | data."] },
  { id: "properties", name: "Propriedades", description: "Campos estruturados para contexto, estado e responsáveis.", category: "Documentação e referência", snippet: ":::properties\n- Status | Em revisão | status\n- Responsável | {{conteúdo}} | person\n:::", preview: ":::properties\n- Status | Em revisão | status\n- Responsável | Plataforma | person\n- Revisão | 18 set. | date\n:::", rules: ["Formato: campo | valor | tipo opcional (status, person, date, url)."] },
  { id: "daci", name: "Decisão DACI", description: "Papéis claros para decidir e executar.", category: "Pessoas e colaboração", snippet: ":::daci\n- Driver | {{conteúdo}}\n- Approver | Liderança técnica\n- Contributors | Produto, engenharia\n- Informed | Time ampliado\n:::", preview: ":::daci\n- Driver | Marina Alves\n- Approver | Rafael Costa\n- Contributors | Produto, dados e plataforma\n- Informed | Lideranças das áreas\n:::", rules: ["Formato: papel DACI | pessoa ou grupo."] },
  { id: "related", name: "Itens relacionados", description: "Registros vinculados e seu estado atual.", category: "Documentação e referência", snippet: ":::related\n- Documento ou item | Relação | {{conteúdo}}\n:::", preview: ":::related\n- Plano de rollout | Depende de | Em revisão\n- Painel de métricas | Referência | Atualizado\n:::", rules: ["Formato: item | relação | estado. Use para navegação contextual."] },
  { id: "slo", name: "SLO", description: "Meta e resultado atual de um serviço.", category: "Operações e qualidade", snippet: ":::slo{status=\"ok\"}\n- Serviço | 99,9% | 99,95%\n:::", preview: ":::slo{status=\"warn\"}\n- API pública | 99,9% | 99,97%\n- Processamento | 99,5% | 99,2%\n:::", properties: [{ name: "status", values: "ok · warn · err", options: ["ok", "warn", "err"], defaultValue: "warn" }], rules: ["Formato: serviço | meta | atual | estado opcional."] },
  { id: "changelog", name: "Changelog", description: "Versões, datas e principais mudanças.", category: "Operações e qualidade", snippet: ":::changelog\n- v1.0.0 | 02 set. | {{conteúdo}}\n:::", preview: ":::changelog\n- v1.4.0 | 02 set. | Publicação com histórico de versões.\n- v1.3.0 | 28 ago. | Componentes para relatórios.\n:::", rules: ["Formato: versão | data | descrição."] },
  { id: "glossary", name: "Glossário", description: "Termos importantes e suas definições.", category: "Documentação e referência", snippet: ":::glossary\n- Termo | {{conteúdo}}\n:::", preview: ":::glossary\n- SLO | Meta de confiabilidade acordada para um serviço.\n- Rollout | Liberação gradual de uma mudança.\n:::", rules: ["Formato: termo | definição."] },
  { id: "resources", name: "Recursos", description: "Links, documentos e referências relacionadas.", category: "Documentação e referência", snippet: ":::resources\n- Recurso | Tipo | {{conteúdo}}\n:::", preview: ":::resources\n- Guia de operação | Documento | Instruções para resposta a incidentes.\n- Painel de métricas | Dashboard | Acompanhamento em tempo real.\n:::", rules: ["Formato: recurso | tipo | descrição."] },
  { id: "columns", name: "Colunas", description: "Divide uma seção e aceita Markdown e componentes em cada coluna.", category: "Layout e composição", snippet: ":::columns{count=\"2\"}\n### Coluna 1\n\n{{conteúdo}}\n\n---\n\n### Coluna 2\n\nConteúdo complementar.\n:::", preview: ":::columns{count=\"2\"}\n### Resultado\n\n:::stats\n- Cobertura | 91% | ↑ 6 p.p. | up\n:::\n\n---\n\n### Próxima ação\n\n:::checklist\n- [ ] Validar em produção | sexta-feira\n:::\n:::", properties: [{ name: "count", values: "2 · 3 · 4 colunas", options: ["2", "3", "4"], defaultValue: "2" }], rules: ["Separe cada coluna com uma linha contendo apenas ---.", "Cada coluna pode conter Markdown e outros componentes."] },
  { id: "section", name: "Seção", description: "Título editorial principal.", category: "Markdown", snippet: "## {{conteúdo}}", preview: "## Decisão e próximos passos" },
  { id: "subtitle", name: "Subtítulo", description: "Título secundário dentro de uma seção.", category: "Markdown", snippet: "### {{conteúdo}}", preview: "### Critérios de aceite" },
  { id: "list", name: "Lista", description: "Itens informativos sem checkbox.", category: "Markdown", snippet: "- {{conteúdo}}", preview: "- A alteração não impacta o fluxo atual.\n- O monitoramento será acompanhado por sete dias." },
  { id: "ordered-list", name: "Lista ordenada", description: "Itens em sequência.", category: "Markdown", snippet: "1. {{conteúdo}}", preview: "1. Preparar a alteração.\n2. Validar o resultado.\n3. Registrar a evidência." },
  { id: "quote", name: "Citação", description: "Trecho ou observação em destaque.", category: "Markdown", snippet: "> {{conteúdo}}", preview: "> A decisão deve ser registrada junto das evidências que a sustentam." },
  { id: "table", name: "Tabela", description: "Dados organizados em colunas.", category: "Markdown", snippet: "| Coluna A | Coluna B |\n| --- | --- |\n| {{conteúdo}} | Valor |", preview: "| Indicador | Resultado |\n| --- | --- |\n| Cobertura | 91% |\n| Latência | 184 ms |" },
  { id: "code", name: "Código", description: "Trecho técnico com linguagem e formatação preservadas.", category: "Markdown", snippet: "```ts\n{{conteúdo}}\n```", preview: "```ts\nconst relatório = await gerarRelatório();\n```" },
  { id: "link", name: "Link", description: "Referência externa ou interna.", category: "Markdown", snippet: "[{{conteúdo}}](https://)", preview: "[Abrir documentação técnica](https://example.com)" },
];

export function DocumentEditor({
  initialDocument,
  initialReleases = [],
  templates,
  canEdit = true,
}: {
  initialDocument: DocumentRecord;
  initialReleases?: DocumentRelease[];
  templates: TemplateRecord[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [document, setDocument] = useState(initialDocument);
  const [savedDocument, setSavedDocument] = useState(initialDocument);
  const [releases, setReleases] = useState(initialReleases);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [componentPickerOpen, setComponentPickerOpen] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedMarkdownComponentId, setSelectedMarkdownComponentId] = useState(markdownComponents[0].id);
  const [componentPropertyValues, setComponentPropertyValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const markdownEditorRef = useRef<HTMLTextAreaElement>(null);
  const markdownSelectionRef = useRef({ start: 0, end: 0 });
  const dirty = useMemo(() => JSON.stringify(document) !== JSON.stringify(savedDocument), [document, savedDocument]);
  const deferredDocument = useDeferredValue(document);
  const visibleMarkdownComponents = useMemo(() => {
    const query = componentSearch.trim().toLocaleLowerCase("pt-BR");
    return query
      ? markdownComponents.filter((component) => `${component.name} ${component.description}`.toLocaleLowerCase("pt-BR").includes(query))
      : markdownComponents;
  }, [componentSearch]);
  const selectedMarkdownComponent = visibleMarkdownComponents.find((component) => component.id === selectedMarkdownComponentId)
    ?? visibleMarkdownComponents[0]
    ?? markdownComponents[0];
  const previewPaletteStyle = useMemo(() => ({
    "--report-accent": deferredDocument.primaryColor,
    "--report-accent-2": deferredDocument.secondaryColor,
  }) as CSSProperties, [deferredDocument.primaryColor, deferredDocument.secondaryColor]);
  const selectedMarkdownComponentPreview = useMemo(
    () => applyComponentProperties(selectedMarkdownComponent.preview, componentPropertyValues),
    [selectedMarkdownComponent, componentPropertyValues],
  );

  function patch<K extends keyof DocumentRecord>(key: K, value: DocumentRecord[K]) {
    setDocument((current) => ({ ...current, [key]: value }));
  }

  function openComponentPicker() {
    const editor = markdownEditorRef.current;
    markdownSelectionRef.current = {
      start: editor?.selectionStart ?? document.content.length,
      end: editor?.selectionEnd ?? document.content.length,
    };
    setComponentSearch("");
    setSelectedMarkdownComponentId(markdownComponents[0].id);
    setComponentPropertyValues(defaultComponentProperties(markdownComponents[0]));
    setComponentPickerOpen(true);
  }

  function insertMarkdownComponent(component: MarkdownComponent) {
    const { start, end } = markdownSelectionRef.current;
    const selectedText = document.content.slice(start, end);
    const placeholder = "{{conteúdo}}";
    const configuredSnippet = applyComponentProperties(component.snippet, componentPropertyValues);
    const placeholderIndex = configuredSnippet.indexOf(placeholder);
    const snippet = configuredSnippet.replace(placeholder, selectedText || "Escreva aqui.");
    const prefix = start > 0 && !document.content.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const suffix = end < document.content.length && !document.content.slice(end).startsWith("\n\n") ? "\n\n" : "";
    const content = `${document.content.slice(0, start)}${prefix}${snippet}${suffix}${document.content.slice(end)}`;
    const cursorStart = start + prefix.length + Math.max(placeholderIndex, 0);
    const cursorEnd = cursorStart + (selectedText || "Escreva aqui.").length;

    patch("content", content);
    setComponentPickerOpen(false);
    requestAnimationFrame(() => {
      markdownEditorRef.current?.focus();
      markdownEditorRef.current?.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function changeTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setDocument((current) => ({
      ...current,
      templateId: template.id,
      templateName: template.name,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
    }));
  }

  function savePayload() {
    return {
      title: document.title,
      summary: document.summary,
      templateId: document.templateId,
      status: document.status,
      author: document.author,
      team: document.team,
      tags: document.tags,
      content: document.content,
    };
  }

  function save() {
    startTransition(async () => {
      const result = await updateDocumentAction(document.id, savePayload());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDocument(result.document);
      setSavedDocument(result.document);
      toast.success("Rascunho salvo");
    });
  }

  async function exportPdf() {
    setExporting(true);
    try {
      let current = document;
      if (dirty) {
        const result = await updateDocumentAction(document.id, savePayload());
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        current = result.document;
        setDocument(result.document);
        setSavedDocument(result.document);
      }

      const response = await fetch(`/api/documents/${current.id}/pdf`);
      if (!response.ok) throw new Error("Não foi possível gerar o PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${current.slug}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado", { description: "O arquivo foi baixado com cabeçalho e rodapé em todas as páginas." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF");
    } finally {
      setExporting(false);
    }
  }

  function duplicate() {
    startTransition(async () => {
      const result = await createDocumentAction({
        title: `${document.title} — cópia`,
        summary: document.summary,
        templateId: document.templateId,
        status: "draft",
        author: document.author,
        team: document.team,
        tags: document.tags,
        content: document.content,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cópia criada");
      router.push(`/documents/${result.document.id}`);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteDocumentAction(document.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Documento excluído");
      router.push("/");
    });
  }

  function publish() {
    startTransition(async () => {
      const result = await publishDocumentAction(document.id, savePayload());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDocument(result.document);
      setSavedDocument(result.document);
      setReleases((current) => [result.release, ...current.filter((item) => item.id !== result.release.id)]);
      const url = `${window.location.origin}/p/${result.release.id}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Versão publicada");
      } catch {
        toast.success("Versão publicada");
      }
    });
  }

  async function copyShareUrl(releaseId: string, version: number) {
    const url = `${window.location.origin}/p/${releaseId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado", { description: `Versão ${version}` });
    } catch {
      toast.message("Link público", { description: url });
    }
  }

  function openDraftPreview() {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.message("Permita pop-ups para abrir a prévia em outra aba.");
      return;
    }
    startTransition(async () => {
      if (dirty) {
        const result = await updateDocumentAction(document.id, savePayload());
        if (!result.ok) {
          toast.error(result.error);
          previewWindow.close();
          return;
        }
        setDocument(result.document);
        setSavedDocument(result.document);
      }
      previewWindow.location.href = `/documents/${document.id}/preview`;
    });
  }

  return (
    <div className="editor-shell">
      <header className="editor-topbar no-print">
        <div className="editor-topbar-inner">
        <div className="editor-context flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/" aria-label="Voltar"><ArrowLeft /></Link></Button>
          <BrandMark className="hidden sm:flex" />
          <ChevronRight className="hidden size-3.5 text-border sm:block" />
          <div className="min-w-0"><strong className="block truncate text-sm">{document.title}</strong><small className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{dirty ? "Alterações não salvas" : `Salvo ${formatRelativeDate(document.updatedAt)}`}</small></div>
        </div>
        <div className="editor-actions flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => setPreviewVisible(!previewVisible)}><PanelRight />{previewVisible ? "Ocultar preview" : "Mostrar preview"}</Button>
          <Button variant="outline" size="sm" onClick={openDraftPreview}><Eye /><span className="hidden sm:inline">Abrir prévia</span></Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting || pending}>{exporting ? <LoaderCircle className="animate-spin" /> : <Download />}<span className="hidden sm:inline">{exporting ? "Gerando PDF" : "Exportar PDF"}</span></Button>
          {canEdit ? (
            <>
              <Button variant="outline" size="sm" onClick={publish} disabled={pending}><Globe /><span className="hidden sm:inline">Publicar</span></Button>
              <Button size="sm" onClick={save} disabled={!dirty || pending}>{pending ? <span className="saving-dot" /> : dirty ? <Save /> : <Check />}<span className="hidden sm:inline">{pending ? "Salvando" : dirty ? "Salvar" : "Salvo"}</span></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={duplicate}><Copy />Duplicar documento</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-destructive"><Trash2 />Excluir documento</DropdownMenuItem></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir este documento?</AlertDialogTitle><AlertDialogDescription>“{document.title}” será removido permanentemente. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove}>Excluir definitivamente</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
        </div>
      </header>

      <main className={cn("editor-workspace", !previewVisible && "preview-hidden")}>
        <section className="editor-pane no-print">
          <div className="editor-document-heading">
            <div className="flex flex-wrap items-center gap-2">
              <TemplateBadge name={document.templateName} primaryColor={document.primaryColor} secondaryColor={document.secondaryColor} />
              <StatusBadge status={document.status} />
            </div>
            <Textarea className="editor-title-input" value={document.title} onChange={(event) => patch("title", event.target.value)} aria-label="Título do documento" readOnly={!canEdit} />
            <Textarea className="editor-summary-input" value={document.summary} onChange={(event) => patch("summary", event.target.value)} placeholder="Resumo executivo do documento…" aria-label="Resumo do documento" readOnly={!canEdit} />
          </div>
          <Tabs defaultValue="content" className="editor-tabs">
            <TabsList variant="line" className="editor-tabs-list"><TabsTrigger value="content"><FileText />Conteúdo</TabsTrigger><TabsTrigger value="metadata">Metadados</TabsTrigger><TabsTrigger value="history"><History />Histórico</TabsTrigger></TabsList>
            <TabsContent value="content" className="editor-tab-content">
              <div className="markdown-hint"><span>Markdown</span>{canEdit ? <Button type="button" variant="ghost" size="xs" onClick={openComponentPicker}><Plus />Adicionar componente</Button> : null}</div>
              <Textarea ref={markdownEditorRef} className="markdown-editor" value={document.content} onChange={(event) => patch("content", event.target.value)} spellCheck={false} aria-label="Conteúdo em Markdown" readOnly={!canEdit} />
            </TabsContent>
            <TabsContent value="metadata" className="editor-tab-content metadata-form">
              <Field label="Template">
                <Select value={document.templateId} onValueChange={changeTemplate} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status"><Select value={document.status} onValueChange={(value: DocumentRecord["status"]) => patch("status", value)} disabled={!canEdit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{documentStatuses.map((status) => <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Responsável"><Input value={document.author} onChange={(event) => patch("author", event.target.value)} readOnly={!canEdit} /></Field>
              <Field label="Time"><Input value={document.team} onChange={(event) => patch("team", event.target.value)} readOnly={!canEdit} /></Field>
              <Field label="Tags"><Input value={document.tags.join(", ")} onChange={(event) => patch("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} placeholder="pagamentos, api, arquitetura" readOnly={!canEdit} /><p>Separe as tags por vírgula.</p></Field>
              <div className="metadata-summary"><span>ID</span><code>{document.id}</code><span>Slug</span><code>{document.slug}</code><span>Versão</span><code>{document.version}</code></div>
            </TabsContent>
            <TabsContent value="history" className="editor-tab-content version-history">
              <div className="version-history-heading">
                <div>
                  <span>Versões publicadas</span>
                  <p>Salvar atualiza apenas o rascunho. Cada publicação cria um snapshot imutável e um novo link.</p>
                </div>
                <strong>{releases.length} {releases.length === 1 ? "versão" : "versões"}</strong>
              </div>
              {releases.length ? (
                <ol className="version-history-list">
                  {releases.map((release) => (
                    <li key={release.id}>
                      <div>
                        <strong>v{release.version}</strong>
                        <span>Publicada em {formatRelativeDate(release.publishedAt)}</span>
                        <code>/p/{release.id}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="xs" onClick={() => copyShareUrl(release.id, release.version)}><Link2 />Copiar link</Button>
                        <Button type="button" variant="outline" size="xs" asChild><Link href={`/p/${release.id}`} target="_blank"><ExternalLink />Abrir</Link></Button>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="version-history-empty">Ainda não há versões publicadas. Use “Publicar” quando quiser registrar a primeira versão.</div>
              )}
            </TabsContent>
          </Tabs>
        </section>
        <section className="preview-pane">
          <div className="preview-label no-print"><span>Visualização</span><small>A impressão continua em A4</small></div>
          <div className="preview-scroll"><ReportPreview document={deferredDocument} /></div>
        </section>
      </main>
      <Dialog open={componentPickerOpen} onOpenChange={setComponentPickerOpen}>
        <DialogContent className="markdown-component-dialog max-w-5xl rounded-none p-0 shadow-none sm:max-w-5xl">
          <DialogHeader className="markdown-component-dialog-header">
            <div><DialogTitle>Adicionar componente</DialogTitle><DialogDescription>Escolha um bloco para inserir no ponto atual do Markdown.</DialogDescription></div>
            <Input value={componentSearch} onChange={(event) => setComponentSearch(event.target.value)} placeholder="Buscar componente…" aria-label="Buscar componente" autoFocus />
          </DialogHeader>
          <div className="markdown-component-browser">
            <div className="markdown-component-groups">
              {(["Destaques", "Métricas e análise", "Planejamento e acompanhamento", "Gráficos", "Código e integrações", "Pessoas e colaboração", "Produto e pesquisa", "Operações e qualidade", "Documentação e referência", "Layout e composição", "Markdown"] as const).map((category) => {
                const components = visibleMarkdownComponents.filter((component) => component.category === category);
                if (!components.length) return null;
              return <section className="markdown-component-section" key={category}><div className="markdown-component-category">{category}</div><div className="markdown-component-grid">{components.map((component) => <button type="button" className="markdown-component-option" data-active={component.id === selectedMarkdownComponent.id || undefined} key={component.id} onClick={() => { setSelectedMarkdownComponentId(component.id); setComponentPropertyValues(defaultComponentProperties(component)); }}><Blocks /><span><strong>{component.name}</strong><small>{component.description}</small></span></button>)}</div></section>;
              })}
              {!visibleMarkdownComponents.length ? <p className="markdown-component-empty">Nenhum componente encontrado.</p> : null}
            </div>
            <aside className="markdown-component-preview-panel">
              <div className="markdown-component-category">Prévia</div>
              <div className="markdown-component-preview"><article className="report-paper markdown-component-preview-paper" style={previewPaletteStyle}><div className="tmpl-body report-content"><RichMarkdown source={selectedMarkdownComponentPreview} /></div></article></div>
              <strong>{selectedMarkdownComponent.name}</strong>
              <p>{selectedMarkdownComponent.description}</p>
              {selectedMarkdownComponent.properties?.some((property) => property.options?.length) ? <div className="markdown-component-controls"><span>Testar propriedades</span>{selectedMarkdownComponent.properties.filter((property) => property.options?.length).map((property) => <label key={property.name}><code>{property.name}</code><select value={componentPropertyValues[property.name] ?? property.defaultValue ?? property.options?.[0] ?? ""} onChange={(event) => setComponentPropertyValues((current) => ({ ...current, [property.name]: event.target.value }))}>{property.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</div> : null}
              {selectedMarkdownComponent.properties?.length ? <div className="markdown-component-details"><span>Propriedades</span>{selectedMarkdownComponent.properties.map((property) => <div key={property.name}><code>{property.name}</code><small>{property.values}</small></div>)}</div> : null}
              {selectedMarkdownComponent.rules?.length ? <div className="markdown-component-details"><span>Regras</span><ul>{selectedMarkdownComponent.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div> : null}
            </aside>
          </div>
          <DialogFooter className="markdown-component-dialog-footer"><Button type="button" variant="outline" onClick={() => setComponentPickerOpen(false)}>Cancelar</Button><Button type="button" onClick={() => insertMarkdownComponent(selectedMarkdownComponent)}><Plus />Inserir componente</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function defaultComponentProperties(component: MarkdownComponent) {
  return Object.fromEntries(
    (component.properties ?? [])
      .filter((property) => property.options?.length)
      .map((property) => [property.name, property.defaultValue ?? property.options?.[0] ?? ""]),
  );
}

function applyComponentProperties(source: string, properties: Record<string, string>) {
  return source.replace(/^:::(\w+)(?:\{([^}]*)\})?/m, (_match, name: string, rawAttributes = "") => {
    const attributes = new Map<string, string>();
    for (const match of rawAttributes.matchAll(/([\w-]+)="([^"]*)"/g)) attributes.set(match[1], match[2]);
    Object.entries(properties).forEach(([key, value]) => attributes.set(key, value));
    const serialized = Array.from(attributes, ([key, value]) => `${key}="${value}"`).join(" ");
    return `:::${name}${serialized ? `{${serialized}}` : ""}`;
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
