// Local development proxy for the Neon serverless HTTP driver (@neondatabase/serverless).
//
// The Neon serverless "neon()" client talks SQL-over-HTTP: it POSTs
//   { query, params }            (single statement) or
//   { queries: [{ query, params }] }   (batched transaction)
// to a fetch endpoint, with headers Neon-Raw-Text-Output and Neon-Array-Mode set
// to "true", and expects a node-postgres-shaped result back
//   { command, rowCount, rows: [[rawText|null, ...]], fields: [{ name, dataTypeID }], rowAsArray: true }
//
// This proxy re-implements just enough of that endpoint to run the app against a
// plain local PostgreSQL server. It is only enabled in development, when the app
// sets neonConfig.fetchEndpoint via NEON_LOCAL_PROXY_URL. Never used in production.

import http from "node:http";
import pg from "pg";

const { Pool } = pg;

const CONNECTION_STRING =
  process.env.PG_CONNECTION_STRING ||
  "postgres://postgres:postgres@127.0.0.1:5432/portulan";
const PORT = Number(process.env.PORT || 4444);

// Return every column as its raw text representation. The Neon driver applies
// its own type parsers on top of these strings (Neon-Raw-Text-Output: true).
const rawTextTypes = { getTypeParser: () => (value) => value };

const pool = new Pool({ connectionString: CONNECTION_STRING, max: 10 });

pool.on("error", (err) => {
  console.error("[neon-local-proxy] idle client error:", err.message);
});

function shapeResult(result) {
  return {
    command: result.command,
    rowCount: result.rowCount,
    rows: result.rows,
    fields: (result.fields || []).map((f) => ({
      name: f.name,
      dataTypeID: f.dataTypeID,
      tableID: f.tableID,
      columnID: f.columnID,
      dataTypeSize: f.dataTypeSize,
      dataTypeModifier: f.dataTypeModifier,
      format: f.format,
    })),
    rowAsArray: true,
  };
}

async function runSingle(query, params) {
  const client = await pool.connect();
  try {
    const result = await client.query({
      text: query,
      values: params || [],
      rowMode: "array",
      types: rawTextTypes,
    });
    return shapeResult(result);
  } finally {
    client.release();
  }
}

async function runBatch(queries) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const results = [];
    for (const q of queries) {
      const result = await client.query({
        text: q.query,
        values: q.params || [],
        rowMode: "array",
        types: rawTextTypes,
      });
      results.push(shapeResult(result));
    }
    await client.query("COMMIT");
    return results;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw error;
  } finally {
    client.release();
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function errorBody(error) {
  return {
    message: error.message,
    code: error.code,
    detail: error.detail,
    hint: error.hint,
    severity: error.severity,
    position: error.position,
    where: error.where,
    schema: error.schema,
    table: error.table,
    column: error.column,
    constraint: error.constraint,
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { message: "Method not allowed" });
    return;
  }

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      sendJson(res, 400, { message: "Invalid JSON body" });
      return;
    }

    try {
      if (Array.isArray(payload.queries)) {
        const results = await runBatch(payload.queries);
        sendJson(res, 200, { results });
      } else {
        const result = await runSingle(payload.query, payload.params);
        sendJson(res, 200, result);
      }
    } catch (error) {
      console.error("[neon-local-proxy] query error:", error.message);
      sendJson(res, 400, errorBody(error));
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[neon-local-proxy] listening on http://127.0.0.1:${PORT}/sql -> ${CONNECTION_STRING.replace(/:[^:@/]*@/, ":****@")}`,
  );
});
