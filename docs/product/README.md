# Modelo de produto — Portulan

Fonte de verdade de **negócio**. Pessoas e agentes leem daqui; código é consequência.

| Arquivo | Lê quando | Contém |
|---|---|---|
| [dominio.md](dominio.md) | Precisa saber o que existe | Entidades, estados, identificadores, limites |
| [regras.md](regras.md) | Vai decidir ou implementar comportamento | Invariantes numeradas (`RN-xx`) |
| [funcionalidades.md](funcionalidades.md) | Precisa saber o que o produto faz | Capacidades por superfície, estado atual vs. planejado |
| [fluxos.md](fluxos.md) | Precisa do caminho do usuário/agente | Jornadas ponta a ponta |

Priorização do que ainda não existe: `.cursor/skills/portulan-ice/backlog.md`.

## Manutenção (obrigatória)

Qualquer mudança de comportamento, permissão, publicação, MCP, componente Markdown ou copy de produto **atualiza estes arquivos na mesma sessão**, antes de declarar a tarefa concluída.

| Mudou… | Atualize… |
|---|---|
| Entidade, campo, status, limite | `dominio.md` |
| Invariante, permissão, “não pode” | `regras.md` |
| O que o usuário consegue fazer | `funcionalidades.md` |
| Ordem de um fluxo (criar, publicar, compartilhar) | `fluxos.md` |
| Item do backlog ICE entregue ou recusado | `funcionalidades.md` **e** `.cursor/skills/portulan-ice/backlog.md` |

Não coloque caminho de arquivo de código aqui. O mapa de código fica na skill ICE, só quando for implementar.

## Fluxo de uma feature nova

Uma feature não começa no código. Ordem fixa:

1. **Ler o modelo** — `dominio.md`, `regras.md`, `funcionalidades.md` da superfície. Se a capacidade já existe (`F-…` `existe`), é correção ou extensão, não feature nova.
2. **Encaixar no backlog** — se ainda não tem id ICE, pontuar (skill `portulan-ice`) e acrescentar em `funcionalidades.md` como `planejado`. Não implementar o que não está nomeado.
3. **Escrever o contrato** — antes do código: regra nova ou alterada (`RN-xx`), linha em `funcionalidades.md`, e o passo em `fluxos.md` se a jornada muda. Isso é o spec. Se não dá para escrever em uma regra, a feature ainda não está clara.
4. **Implementar só a superfície** — usar o mapa da skill ICE. Não reabrir o produto inteiro. Testes no mesmo recorte. UI: verificar no browser o fluxo, não só o layout.
5. **Fechar o modelo** — estado `existe` (ou `parcial`), backlog ICE atualizado, regras alinhadas ao comportamento real. Sem isso a tarefa não acabou.
6. **Commit** — só quando o usuário pedir. O diff deve incluir código **e** `docs/product/` (+ backlog se o item era planejado).

Não pule o passo 3. Código sem `RN`/`F` nova é o que força a próxima sessão a reler o repo.

## Como citar

Regras: `RN-12`. Funcionalidades: `F-publicar`. Não recrie a regra em prosa solta se ela já existe — referencie o id e, se mudou, edite a regra.
