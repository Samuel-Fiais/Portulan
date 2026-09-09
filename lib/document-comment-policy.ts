export function validateDocumentCommentInput(input: {
  body: string;
  sectionAnchor?: string | null;
  validSectionAnchors: Iterable<string>;
}): { ok: true } | { ok: false; error: string } {
  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Escreva um comentário antes de enviar." };
  }
  if (body.length > 2_000) {
    return { ok: false, error: "O comentário pode ter no máximo 2.000 caracteres." };
  }

  const anchor = input.sectionAnchor?.trim();
  if (!anchor) return { ok: true };

  const validAnchors = new Set(input.validSectionAnchors);
  if (!validAnchors.has(anchor)) {
    return { ok: false, error: "Seção inválida. Escolha um título ## do documento." };
  }

  return { ok: true };
}
