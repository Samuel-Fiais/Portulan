import type { MarkdownComponent } from "./markdown-components.ts";

export type AvoidErrorsExample = {
  label: string;
  bad?: string;
  good?: string;
};

export type AvoidErrorsSection = {
  title: string;
  summary: string;
  syntaxRules: string[];
  commonAgentFailures: string[];
  catalogRule: string;
  examples: AvoidErrorsExample[];
};

const GLOBAL_SYNTAX_RULES = [
  "Abertura: linha com `:::nome` seguida imediatamente de `{attr=\"valor\"}` quando houver atributos — **sem espaço** antes de `{`.",
  "Atributos sempre com aspas duplas e sinal de igual: `nome=\"valor\"`. Vários atributos se separam por espaço dentro das chaves.",
  "Fechamento: linha contendo **somente** `:::`. Nada de `:::alert` ou texto extra na linha de fechamento.",
  "Deixe **linha em branco** antes e depois de cada bloco `:::…` para o parser não colar parágrafos ao bloco.",
  "Blocos com corpo em colunas usam linhas `- coluna | coluna` — **não** tabelas GFM (`| A | B |` com linha `---`).",
  "Somente `:::columns` pode conter outras diretivas `:::` aninhadas; em alert, checklist, stats etc. o primeiro `:::` isolado encerra o bloco.",
  "Chaves `}` dentro de valores (ex.: `path=\"/wallets/{walletId}\"`) ficam **dentro** das aspas do atributo — nunca feche `}` do opener antes das aspas.",
  "Não invente nomes de bloco: consulte `list_markdown_components` ou este guia antes de escrever uma diretiva desconhecida.",
] as const;

const COMMON_AGENT_FAILURES = [
  "Esquecer linhas em branco ao redor do bloco e o Markdown seguinte virar corpo do componente.",
  "Aninhar `:::alert`, `:::checklist` ou outros blocos dentro de blocos que não são `:::columns`.",
  "Escrever HTML (`<div>`, `<br>`) em vez de Markdown e diretivas suportadas.",
  "Usar tabela GFM onde o componente espera linhas `- rótulo | valor`.",
  "Colocar conteúdo ou comentários **depois** do `}` na linha de abertura — a linha deve terminar logo após `}`.",
  "Misturar linguagem errada em fences (ex.: JSON dentro de ` ```ts `) ou omitir fence em blocos de código soltos.",
  "Usar `:::checklist` para critérios informativos — prefira bullets `- item` sem checkbox.",
  "Duplicar `id` em `:::testcase` no mesmo documento.",
] as const;

const GLOBAL_EXAMPLES: AvoidErrorsExample[] = [
  {
    label: "Espaço antes de `{` e conteúdo após `}` na abertura",
    bad: ':::alert {variant="info" title="Nota"}\nTexto',
    good: ':::alert{variant="info" title="Nota"}\nTexto\n:::',
  },
  {
    label: "Path de API com `{walletId}`",
    bad: ':::api{method="GET" path="/wallets/{walletId}"}',
    good: ':::api{method="GET" path="/api/v1/wallets/{walletId}/grades"}\n{\n  "items": []\n}\n:::',
  },
  {
    label: "Tabela GFM vs linhas pipe do componente",
    bad: ":::stats\n| Indicador | Valor |\n| --- | --- |\n| Latência | 42 |\n:::",
    good: ":::stats\n- Latência | 42 ms | ↓ 8% | up\n:::",
  },
  {
    label: "Aninhamento proibido (use columns)",
    bad: ":::alert{variant=\"warning\" title=\"Aviso\"}\n:::checklist\n- [ ] Item\n:::\n:::",
    good: ":::columns{count=\"2\"}\n:::alert{variant=\"warning\" title=\"Aviso\"}\nContexto.\n:::\n\n---\n\n:::checklist\n- [ ] Item\n:::\n:::",
  },
];

export function buildGlobalAvoidErrorsSection(): AvoidErrorsSection {
  return {
    title: "Como evitar erros",
    summary:
      "Erros de sintaxe quebram a renderização ou truncam o corpo do bloco. Siga estas regras antes de inventar formatos; use `explain_markdown_component` para um componente específico.",
    syntaxRules: [...GLOBAL_SYNTAX_RULES],
    commonAgentFailures: [...COMMON_AGENT_FAILURES],
    catalogRule:
      "Nomes válidos de diretiva vêm do catálogo (`list_markdown_components`). Componentes Markdown puros (##, listas, tabelas GFM) não usam `:::`.",
    examples: GLOBAL_EXAMPLES,
  };
}

function getDirectiveNameFromComponent(component: MarkdownComponent) {
  if (component.category === "Markdown") return null;
  const match = component.snippet.match(/^:::(\w+)/);
  return match?.[1] ?? component.id;
}

function inferBodyFormat(component: MarkdownComponent): "pipe-rows" | "free-markdown" | "mixed" {
  if (component.category === "Markdown") return "free-markdown";
  if (component.id === "columns") return "mixed";
  const directive = getDirectiveNameFromComponent(component);
  if (!directive) return "free-markdown";
  if (["alert", "callout", "banner", "decision", "terminal", "filetree", "diff", "api", "image", "figure", "report", "testcase"].includes(directive)) {
    return "free-markdown";
  }
  if (component.rules?.some((rule) => rule.toLowerCase().includes("formato:"))) return "pipe-rows";
  return "free-markdown";
}

function checklistPitfalls(): string[] {
  return [
    "Cada item deve começar com `- [ ]` ou `- [x]` — bullet simples `- item` não vira checkbox.",
    "Não use checklist para critérios, sintomas ou listas informativas; use bullets Markdown normais.",
    "Não aninhe outras diretivas `:::` dentro do checklist (exceto dentro de `:::columns`).",
  ];
}

function testcasePitfalls(): string[] {
  return [
    "Atributos principais: `id` (único no documento), `status` (`pending` | `ok` | `partial` | `error`), `priority` (`low` | `medium` | `high`), `title`.",
    "Corpo livre em Markdown (pré-condição, passos, resultado) — não use linhas `- col | col`.",
    "Status persiste no opener; não duplique o mesmo `id` no documento.",
  ];
}

function pipeRowsPitfalls(component: MarkdownComponent): string[] {
  const directive = getDirectiveNameFromComponent(component);
  return [
    `Use linhas iniciadas com \`-\`, colunas separadas por \`|\` — não tabelas GFM.`,
    `Não coloque \`|\` no início/fim da linha como cabeçalho de tabela Markdown.`,
    directive === "stats"
      ? "Se não houver variação/delta, omita colunas extras — não use `-` como placeholder."
      : "",
  ].filter(Boolean);
}

function freeMarkdownPitfalls(component: MarkdownComponent): string[] {
  const directive = getDirectiveNameFromComponent(component);
  const pitfalls: string[] = [
    "Corpo em Markdown livre; feche com linha isolada `:::`.",
    "Mantenha linha em branco antes e depois do bloco.",
  ];
  if (directive === "api") {
    pitfalls.push(
      'Paths com `{param}` vão inteiros dentro das aspas: `path="/recurso/{id}"`.',
      "JSON de exemplo no corpo, abaixo da linha de abertura — não na mesma linha do opener.",
    );
  }
  if (directive === "alert" || directive === "callout" || directive === "banner" || directive === "decision") {
    pitfalls.push("Não aninhe outras diretivas `:::` aqui; use `:::columns` se precisar combinar blocos.");
  }
  if (directive === "terminal" || directive === "diff" || directive === "filetree") {
    pitfalls.push("Preserve quebras de linha do corpo; não substitua por HTML.");
  }
  if (component.id === "report" || directive === "report") {
    pitfalls.push("Diretiva void: uma linha só, sem corpo nem `:::` de fechamento.");
  }
  if (component.id === "image" || directive === "figure") {
    pitfalls.push("Use `:::figure{...}` com `src` e `alt`; legenda opcional no corpo antes do fechamento.");
  }
  return pitfalls;
}

function columnsPitfalls(): string[] {
  return [
    "Único bloco que aceita outras diretivas `:::` no corpo.",
    "Separe colunas com linha contendo apenas `---`.",
    "Cada coluna pode ter Markdown e componentes; ainda feche columns com `:::`.",
  ];
}

export function getComponentAvoidErrors(component: MarkdownComponent): string[] {
  if (component.id === "checklist") return checklistPitfalls();
  if (component.id === "testcase") return testcasePitfalls();
  if (component.id === "columns") return columnsPitfalls();

  const bodyFormat = inferBodyFormat(component);
  if (bodyFormat === "pipe-rows") return pipeRowsPitfalls(component);
  if (bodyFormat === "free-markdown" || bodyFormat === "mixed") return freeMarkdownPitfalls(component);

  return [
    "Componente Markdown puro — sem diretiva `:::`.",
    "Para tabelas GFM use o componente Tabela; para métricas em linhas use stats/kv/comparison.",
  ];
}
