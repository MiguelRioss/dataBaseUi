// services/orderMove.mjs
import { API_BASE } from "./apiBase";

/** Normalize + validate folder names accepted by the backend */
function normalizeFolder(folder) {
  const f = String(folder ?? "").trim().toLowerCase();
  if (f === "archived") return "archive";
  if (f === "ongoing")  return "orders";
  if (f === "orders" || f === "archive" || f === "deleted") return f;
  throw new Error(`Invalid folder "${folder}". Allowed: orders | archive | deleted`);
}

/**
 * Move orders in a single request (preferred).
 * Backend route: POST /api/orders/move
 * Body: { ids: string[], source?: "orders"|"archive"|"deleted", dest: "orders"|"archive"|"deleted" }
 *
 * @param {string[]} ids
 * @param {"orders"|"archive"|"deleted"|"ongoing"|"archived"} dest
 * @param {"orders"|"archive"|"deleted"|"ongoing"|"archived"} [source]
 * @param {{ headers?: Record<string,string>, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ moved:number, skipped?:string[], source?:string, dest:string }>}
 */
export async function moveOrdersTo(ids, dest, source, opts = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("moveOrdersTo: 'ids' must be a non-empty array");
  }

  const body = {
    ids,
    dest: normalizeFolder(dest),
    ...(source ? { source: normalizeFolder(source) } : {}),
  };

  const res = await fetch(`${API_BASE}/api/orders/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    let msg = `Failed to move orders (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }

  return res.json(); // expected: { moved, skipped, source, dest }
}

/**
 * Optional helper when you want to move very large selections without hitting body/limits.
 * Splits into chunks and aggregates the result.
 *
 * @param {string[]} ids
 * @param {"orders"|"archive"|"deleted"|"ongoing"|"archived"} dest
 * @param {"orders"|"archive"|"deleted"|"ongoing"|"archived"} [source]
 * @param {{ chunkSize?:number, headers?:Record<string,string>, signal?:AbortSignal }} [opts]
 * @returns {Promise<{ moved:number, skipped:string[] }>}
 */
export async function moveOrdersToChunked(ids, dest, source, opts = {}) {
  const chunkSize = Math.max(1, opts.chunkSize ?? 200);
  const chunks = [];
  for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));

  let moved = 0;
  const skipped = [];

  for (const part of chunks) {
    const result = await moveOrdersTo(part, dest, source, opts);
    moved += Number(result?.moved || 0);
    if (Array.isArray(result?.skipped)) skipped.push(...result.skipped);
  }

  return { moved, skipped };
}
