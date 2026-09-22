import type { CollabEventType } from "./collab-events.ts";
import { COLLAB_INTENTION_LABELS, type CollabIntention } from "./collab-presence.ts";

export type CollabActivityEventView = {
  id: string;
  seq: number;
  type: CollabEventType;
  createdAt: string;
  kind: "human" | "agent" | "system";
  displayName: string;
  viaAgent: string | null;
  intention: CollabIntention | null;
  summary: string;
  correlationId: string | null;
  payload: Record<string, unknown> | null;
};

const COMMAND_LABELS: Record<string, string> = {
  "workspace.member.role_changed": "Papel na tripulação alterado",
  "workspace.member.removed": "Tripulante removido do porto",
  "workspace.member.left": "Tripulante saiu do porto",
  "workspace.captaincy.transferred": "Capitania transferida",
  "workspace.invite.created": "Convite ao porto enviado",
  "workspace.invite.revoked": "Convite ao porto revogado",
  "document.share.created": "Compartilhamento convidado",
  "document.share.updated": "Papel de compartilhamento alterado",
  "document.share.revoked": "Compartilhamento revogado",
  "document.published": "Carta publicada",
  "document.visibility_changed": "Visibilidade da carta alterada",
  "task.claimed": "Comando assumido",
  "task.released": "Comando solto",
  "task.assigned": "Responsável alterado",
  "task.status_changed": "Estado da Manobra alterado",
  "task.result_reported": "Resultado registrado",
  "task.accepted": "Aceite humano registrado",
  "task.blocked": "Maré contrária aberta",
  "task.unblocked": "Maré contrária resolvida",
  "pack.approved": "Rumo aprovado",
  "pack.submitted": "Rumo enviado para revisão",
  "coordination.message": "Mensagem na Conversa de bordo",
  handoff: "Passagem de comando",
};

function commandSummary(payload: Record<string, unknown> | null): string {
  if (!payload) return "Comando aplicado";
  const command = typeof payload.command === "string" ? payload.command : null;
  if (command && COMMAND_LABELS[command]) return COMMAND_LABELS[command];
  if (typeof payload.label === "string") return payload.label;
  return command ?? "Comando aplicado";
}

export function collabEventActivitySummary(
  type: CollabEventType,
  payload: Record<string, unknown> | null,
): string {
  switch (type) {
    case "presence.joined":
      return "Entrou na sala";
    case "presence.updated":
      return "Atualizou a presença";
    case "presence.left":
      return "Saiu da sala";
    case "content.operation":
      return "Editou conteúdo";
    case "content.saved":
      return "Salvou alterações";
    case "command.applied":
      return commandSummary(payload);
    case "room.closed":
      return "Sala encerrada";
    default:
      return "Atividade";
  }
}

export function collabIntentionLabel(intention: CollabIntention | null | undefined): string | null {
  if (!intention) return null;
  return COLLAB_INTENTION_LABELS[intention] ?? intention;
}
