export function stripBase64Payload(input: string) {
  const trimmed = input.trim();
  const dataUrlMatch = trimmed.match(/^data:[^;]+;base64,([\s\S]+)$/);
  return (dataUrlMatch?.[1] ?? trimmed).replace(/\s/g, "");
}

export function decodeBase64Content(contentBase64: string) {
  const payload = stripBase64Payload(contentBase64);
  if (!payload) {
    return { ok: false as const, error: "Conteúdo base64 ausente." };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(payload, "base64");
  } catch {
    return { ok: false as const, error: "Conteúdo base64 inválido." };
  }

  if (buffer.length === 0) {
    return { ok: false as const, error: "Arquivo vazio." };
  }

  return { ok: true as const, buffer };
}
