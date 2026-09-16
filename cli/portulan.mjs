#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";

const MANAGED_BEGIN = "<!-- BEGIN:portulan-dev-context -->";
const MANAGED_END = "<!-- END:portulan-dev-context -->";

function upsertManagedBlock(existing, inner) {
  const block = `${MANAGED_BEGIN}\n${inner.trim()}\n${MANAGED_END}`;
  if (!existing.trim()) return `${block}\n`;
  const begin = existing.indexOf(MANAGED_BEGIN);
  const end = existing.indexOf(MANAGED_END);
  if (begin >= 0 && end > begin) {
    return `${existing.slice(0, begin)}${block}${existing.slice(end + MANAGED_END.length)}`;
  }
  return `${existing.replace(/\s*$/, "")}\n\n${block}\n`;
}

function looksLikeSecret(value) {
  return /ptl_[A-Za-z0-9_-]{16,}/.test(value) || /Bearer\s+ptl_/i.test(value);
}

function assertNoSecret(content, label) {
  if (looksLikeSecret(content)) {
    throw new Error(`${label} contém um token. O CLI recusa gravar segredo no repositório.`);
  }
}

function instructionBlock() {
  return `## Portulan — contexto de desenvolvimento

Auto-configuração completa: skill \`portulan-mcp\` (seção **Auto-configuração**) ou Guia do Agente em Instrumentos.

1. Chave MCP em Instrumentos → \`.cursor/mcp.json\` com \`Authorization: Bearer ptl_…\`.
2. \`PORTULAN_TOKEN\` no ambiente; \`portulan init\` / \`portulan doctor\` neste checkout.
3. Leia \`.portulan/AGENT.md\` e \`.portulan/config.json\`.
4. Chame \`get_agent_bootstrap\` com \`repository_id\` do config **antes** de assumir trabalho.
5. Não assuma Manobra sem Rumo aprovado e válido (\`current\`).
6. Registre Maré contrária e reporte o resultado; aceite humano é separado.
7. Nunca grave token, segredo ou path absoluto neste repositório (RN-106).`;
}

function usage() {
  console.log(`portulan <comando>

  init     Prepara o checkout (.portulan/config.json, AGENT.md, blocos gerenciados)
  doctor   Diagnostica token, API, Embarcação e blocos
`);
}

function readToken() {
  const env = process.env.PORTULAN_TOKEN || process.env.PORTULAN_MCP_TOKEN;
  if (env?.trim()) return env.trim();
  if (process.platform === "darwin") {
    const result = spawnSync("security", ["find-generic-password", "-s", "portulan-mcp", "-w"], {
      encoding: "utf8",
    });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  return null;
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function detectGit() {
  const isRepo = git(["rev-parse", "--is-inside-work-tree"]) === "true";
  if (!isRepo) return { git: false, remote: null, name: path.basename(process.cwd()) };
  const remote = git(["remote", "get-url", "origin"]) || git(["config", "--get", "remote.origin.url"]);
  const name = path.basename(git(["rev-parse", "--show-toplevel"]) || process.cwd());
  return { git: true, remote: remote || null, name };
}

async function api(endpoint, token, pathname, method = "GET", body) {
  const url = new URL(pathname.replace(/^\//, ""), `${endpoint.replace(/\/$/, "")}/`);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function writeSafe(filePath, content) {
  assertNoSecret(content, filePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function agentMarkdown(config) {
  return `# Agente neste checkout

Embarcação \`${config.repositoryId}\` · porto \`${config.workspaceId}\` · endpoint \`${config.endpoint}/api/mcp\`

## Antes da primeira sessão

1. Gere chave MCP em **Instrumentos** (passo 02) se ainda não tiver.
2. Configure \`.cursor/mcp.json\` com \`Authorization: Bearer ptl_…\`.
3. Exporte \`PORTULAN_TOKEN\` para o terminal (\`portulan doctor\` usa isso).
4. Skill \`portulan-mcp\` — seção **Auto-configuração** — cobre o fluxo completo.

## Protocolo (cada sessão)

1. Leia \`.portulan/config.json\` (repository_id abaixo).
2. Chame \`get_agent_bootstrap\` com \`repository_id: "${config.repositoryId}"\`.
3. Não assuma Manobra sem Rumo aprovado e válido.
4. Se o MCP devolver \`pack_not_servable\`, trate como diagnóstico — não invente briefing.
5. Renove lease com atividade explícita; registre Maré contrária e resultado.

Remote: ${config.remoteUrl || "local"} · Expedições: ${(config.projectIds ?? []).join(", ") || "nenhuma"}

Token: \`PORTULAN_TOKEN\` / keychain macOS (\`service=portulan-mcp\`). Nunca grave credencial neste repositório.
`;
}

async function confirm(rl, filePath, yes) {
  if (yes || !existsSync(filePath)) return true;
  const answer = await rl.question(`Editar ${filePath}? [s/N] `);
  return /^s(im)?$/i.test(answer.trim());
}

async function cmdInit(args) {
  const yes = args.includes("--yes");
  const endpointFlag = args.find((item) => item.startsWith("--endpoint="))?.slice(11);
  const token = readToken();
  if (!token) {
    console.error("Defina PORTULAN_TOKEN ou PORTULAN_MCP_TOKEN (ou grave no keychain macOS service=portulan-mcp).");
    process.exitCode = 1;
    return;
  }
  const endpoint = (
    endpointFlag ||
    process.env.PORTULAN_ENDPOINT ||
    process.env.PORTULAN_PUBLIC_URL ||
    "https://portulan.vercel.app"
  ).replace(/\/$/, "");
  const detected = detectGit();
  const rl = createInterface({ input, output });
  try {
    const linked = await api(endpoint, token, "/api/cli/repositories", "POST", {
      name: detected.name,
      kind: detected.git ? (detected.remote ? "git" : "local") : "local",
      remoteUrl: detected.remote,
    });
    const projects = (await api(endpoint, token, "/api/cli/projects")).projects;
    let selected = projects;
    if (projects.length > 1 && !yes) {
      console.log("Expedições disponíveis:");
      projects.forEach((project, index) => console.log(`  ${index + 1}. ${project.name}`));
      const raw = await rl.question("Números separados por vírgula (Enter = todas): ");
      if (raw.trim()) {
        const picks = raw.split(",").map((item) => Number(item.trim()) - 1);
        selected = picks.map((index) => projects[index]).filter(Boolean);
      }
    }
    if (selected.length) {
      await api(endpoint, token, "/api/cli/repositories", "POST", {
        name: detected.name,
        kind: detected.git ? (detected.remote ? "git" : "local") : "local",
        remoteUrl: detected.remote,
        repositoryId: linked.repository.id,
        projectIds: selected.map((project) => project.id),
      });
    }
    const config = {
      workspaceId: linked.repository.workspaceId,
      repositoryId: linked.repository.id,
      projectIds: selected.map((project) => project.id),
      endpoint,
      remoteUrl: linked.repository.remoteUrl,
    };
    writeSafe(path.join(".portulan", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
    writeSafe(path.join(".portulan", "AGENT.md"), agentMarkdown(config));

    const instruction = instructionBlock();
    for (const file of ["AGENTS.md", "CLAUDE.md"]) {
      const current = existsSync(file) ? readFileSync(file, "utf8") : "";
      if (!(await confirm(rl, file, yes))) continue;
      writeSafe(file, upsertManagedBlock(current, instruction));
    }
    const cursorRule = path.join(".cursor", "rules", "portulan-dev-context.mdc");
    if (existsSync(".cursor") || yes) {
      if (await confirm(rl, cursorRule, yes || !existsSync(cursorRule))) {
        const current = existsSync(cursorRule) ? readFileSync(cursorRule, "utf8") : "";
        writeSafe(cursorRule, upsertManagedBlock(current, instruction));
      }
    }
    console.log(`Embarcação ${linked.repository.id} pronta.`);
  } finally {
    rl.close();
  }
}

function looksLikeAbs(config) {
  return typeof config.localPath === "string" && (config.localPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(config.localPath));
}

async function cmdDoctor() {
  const token = readToken();
  const issues = [];
  if (!token) issues.push("Token ausente (PORTULAN_TOKEN / PORTULAN_MCP_TOKEN / keychain).");
  const configPath = path.join(".portulan", "config.json");
  if (!existsSync(configPath)) issues.push("Falta .portulan/config.json — rode portulan init.");
  else {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    if (config.token || looksLikeAbs(config) || looksLikeSecret(JSON.stringify(config))) {
      issues.push("config.json não deve ter token nem path absoluto.");
    }
    if (token && config.endpoint && config.repositoryId) {
      try {
        const query = new URLSearchParams({ repositoryId: config.repositoryId });
        for (const id of config.projectIds ?? []) query.append("projectId", id);
        const result = await api(config.endpoint, token, `/api/cli/doctor?${query.toString()}`);
        if (!result.ok) issues.push(...result.issues);
      } catch (error) {
        issues.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  if (!existsSync(path.join(".portulan", "AGENT.md"))) issues.push("Falta .portulan/AGENT.md.");
  for (const file of ["AGENTS.md", "CLAUDE.md"]) {
    if (existsSync(file) && !readFileSync(file, "utf8").includes("BEGIN:portulan-dev-context")) {
      issues.push(`${file} sem bloco gerenciado.`);
    }
  }
  if (issues.length === 0) {
    console.log("portulan doctor: ok");
    return;
  }
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
}

const [command, ...rest] = process.argv.slice(2);
if (command === "init") await cmdInit(rest);
else if (command === "doctor") await cmdDoctor();
else usage();
