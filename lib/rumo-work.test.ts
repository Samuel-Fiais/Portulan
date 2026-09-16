import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptedCount,
  blockingQuestions,
  cardsForColumn,
  compareWorkTasks,
  groupManobras,
  kanbanLanceCountForColumn,
  kanbanLanceLanes,
  kanbanLances,
  lancesInColumn,
  kanbanManobras,
  lanceIsComplete,
  lanceProgress,
  manobraTreeById,
  parseMentions,
  sortWorkTasks,
  taskColumnId,
  type WorkTask,
} from "./rumo-work.ts";

function task(partial: Partial<WorkTask> & { id: string }): WorkTask {
  return {
    parentTaskId: null,
    status: "available",
    boardNumber: 0,
    ...partial,
  };
}

test("groupManobras aninha um nível de Lance", () => {
  const parent = task({ id: "p" });
  const child = task({ id: "c", parentTaskId: "p" });
  const tree = groupManobras([parent, child]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.children[0]?.id, "c");
});

test("Kanban: Manobra sem Lance é o cartão; com Lances, os cartões são os filhos", () => {
  const leaf = task({ id: "leaf", status: "available" });
  assert.equal(cardsForColumn({ parent: leaf, children: [] }, "available").length, 1);
  const parent = task({ id: "p", status: "available" });
  const child = task({ id: "c", parentTaskId: "p", status: "blocked" });
  assert.equal(cardsForColumn({ parent, children: [child] }, "available").length, 0);
  assert.equal(cardsForColumn({ parent, children: [child] }, "blocked").length, 1);
  assert.equal(taskColumnId("in_progress"), "active");
});

test("Kanban separado: Manobras só raízes; Lances só filhos", () => {
  const parent = task({ id: "p", status: "available", boardNumber: 10 });
  const child = task({ id: "c", parentTaskId: "p", status: "blocked", boardNumber: 11 });
  const leaf = task({ id: "leaf", status: "reported", boardNumber: 20 });
  const trees = groupManobras([leaf, child, parent]);
  assert.deepEqual(kanbanManobras(trees).map((t) => t.id), ["p", "leaf"]);
  assert.deepEqual(kanbanLances(trees).map((t) => t.id), ["c"]);
});

test("sortWorkTasks ordena por boardNumber e mantém posição após embaralhar", () => {
  const tasks = [
    task({ id: "c", boardNumber: 30 }),
    task({ id: "a", boardNumber: 10 }),
    task({ id: "b", boardNumber: 20 }),
  ];
  assert.deepEqual(sortWorkTasks(tasks).map((item) => item.id), ["a", "b", "c"]);
  assert.equal(compareWorkTasks(tasks[0], tasks[1]), 20);
});

test("groupManobras ordena raízes e Lances por boardNumber", () => {
  const parentB = task({ id: "pb", boardNumber: 20 });
  const parentA = task({ id: "pa", boardNumber: 10 });
  const lanceB2 = task({ id: "lb2", parentTaskId: "pb", boardNumber: 22 });
  const lanceB1 = task({ id: "lb1", parentTaskId: "pb", boardNumber: 21 });
  const lanceA1 = task({ id: "la1", parentTaskId: "pa", boardNumber: 11 });
  const trees = groupManobras([lanceB2, parentB, lanceA1, parentA, lanceB1]);
  assert.deepEqual(
    trees.map((tree) => ({
      parentId: tree.parent.id,
      lanceIds: tree.children.map((child) => child.id),
    })),
    [
      { parentId: "pa", lanceIds: ["la1"] },
      { parentId: "pb", lanceIds: ["lb1", "lb2"] },
    ],
  );
});

test("perguntas bloqueadoras sobem; menção extrai IDs", () => {
  assert.equal(
    blockingQuestions([
      { id: "q", type: "question", blocking: true, body: "Falta o quê?" },
      { id: "d", type: "decision", blocking: false, body: "Seguimos" },
    ]).length,
    1,
  );
  const mentions = parseMentions("@Ada e @Nemo", [
    {
      kind: "human",
      member: {
        id: "m1",
        workspaceId: "w",
        userId: "u1",
        role: "member",
        createdAt: "",
        login: "ada",
        name: "Ada",
        email: null,
        avatarUrl: null,
      },
    },
    {
      kind: "agent",
      agent: {
        id: "a1",
        workspaceId: "w",
        ownerUserId: "u1",
        name: "Nemo",
        workMode: "context_and_coordination",
        allowedMcpTools: [],
        status: "active",
        deactivatedAt: null,
        createdAt: "",
        updatedAt: "",
      },
      ownerName: "Ada",
    },
  ]);
  assert.deepEqual(mentions.mentionedUserIds, ["u1"]);
  assert.deepEqual(mentions.mentionedAgentIdentityIds, ["a1"]);
});

test("acceptedCount conta só Manobras-raiz", () => {
  const parent = task({ id: "p", status: "accepted" });
  const child = task({ id: "c", parentTaskId: "p", status: "available" });
  assert.deepEqual(acceptedCount([parent, child]), { accepted: 1, total: 1 });
});

test("lanceProgress conta reported e accepted como concluídos", () => {
  const children = [
    task({ id: "a", status: "reported" }),
    task({ id: "b", status: "accepted" }),
    task({ id: "c", status: "in_progress" }),
  ];
  assert.equal(lanceIsComplete("reported"), true);
  assert.equal(lanceIsComplete("available"), false);
  assert.deepEqual(lanceProgress(children), { done: 2, total: 3 });
});

test("manobraTreeById encontra árvore pela Manobra-raiz", () => {
  const parent = task({ id: "p" });
  const child = task({ id: "c", parentTaskId: "p" });
  const trees = groupManobras([parent, child]);
  assert.equal(manobraTreeById(trees, "p")?.children[0]?.id, "c");
  assert.equal(manobraTreeById(trees, "missing"), undefined);
});

test("Kanban Lances: uma faixa por Manobra-pai; Lances cruzam as colunas", () => {
  const parentA = task({ id: "pa", boardNumber: 10 });
  const parentB = task({ id: "pb", boardNumber: 20 });
  const leaf = task({ id: "leaf", boardNumber: 30 });
  const lanceA1 = task({ id: "la1", parentTaskId: "pa", status: "available", boardNumber: 11 });
  const lanceA2 = task({ id: "la2", parentTaskId: "pa", status: "reported", boardNumber: 12 });
  const lanceB1 = task({ id: "lb1", parentTaskId: "pb", status: "available", boardNumber: 21 });
  const trees = groupManobras([parentA, parentB, leaf, lanceA1, lanceA2, lanceB1]);

  const lanes = kanbanLanceLanes(trees);
  assert.deepEqual(
    lanes.map((lane) => ({
      parentId: lane.parent.id,
      lanceIds: lane.lances.map((lance) => lance.id),
    })),
    [
      { parentId: "pa", lanceIds: ["la1", "la2"] },
      { parentId: "pb", lanceIds: ["lb1"] },
    ],
  );
  assert.deepEqual(
    lancesInColumn(lanes[0]?.lances ?? [], "available").map((lance) => lance.id),
    ["la1"],
  );
  assert.deepEqual(
    lancesInColumn(lanes[0]?.lances ?? [], "reported").map((lance) => lance.id),
    ["la2"],
  );
  assert.equal(kanbanLanceCountForColumn(trees, "available"), 2);
  assert.equal(kanbanLanceCountForColumn(trees, "reported"), 1);
  assert.equal(kanbanLanceCountForColumn(trees, "accepted"), 0);
});
