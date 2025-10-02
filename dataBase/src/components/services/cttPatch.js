// /src/services/cttPatch.js
import { API_BASE } from "./apiBase";

/**
 * Patch a single order: PATCH /api/orders/:id with { status }.
 * Skips if no RT or already delivered.
 */
export async function patchOrderFlags({ orderId, trackUrl, status }) {
  if (!trackUrl) {
    console.log(`[SKIP] Order ${orderId} has no track_url`);
    return null;
  }
  if (status?.delivered?.status === true) {
    console.log(`[SKIP] Order ${orderId} already delivered`);
    return null;
  }

  try {
    // 1. Fetch CTT tracking info
    const URL_FETCH_CTT = API_BASE + `/api/ctt?rt=${trackUrl}`;
    console.log(`[FETCH CTT] Order ${orderId} → ${URL_FETCH_CTT}`);

    const response = await fetch(URL_FETCH_CTT);
    if (!response.ok) {
      console.error(`[ERROR] CTT fetch failed for ${orderId}: ${response.status} ${response.statusText}`);
      return null;
    }
    const jsonObject = await response.json();

    // 2. Extract summary
    const summary = jsonObject.summary;
    if (!summary) {
      console.error(`[ERROR] No summary in CTT response for order ${orderId}`);
      return null;
    }

    // 3. Build patch body
    const changes = { changes: { status: summary } };

    // 4. Call PATCH API
    const URL_PATCH = API_BASE + `/api/orders/${orderId}`;
    const patchResponse = await fetch(URL_PATCH, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    if (!patchResponse.ok) {
      console.error(`[ERROR] Failed to patch order ${orderId}: ${patchResponse.status} ${patchResponse.statusText}`);
      return null;
    }

    const result = await patchResponse.json();
    console.log(`[PATCHED] Order ${orderId}`, result);
    return result;
  } catch (err) {
    console.error(`[EXCEPTION] patchOrderFlags(${orderId}):`, err);
    return null;
  }
}

/**
 * Patch many orders with streaming progress + controlled concurrency.
 *
 * @param {Array<Object>} orders - Array of orders like { id, track_url, status }
 * @param {number} [batchSize=10] - Max number of concurrent requests
 * @returns {Promise<Array>} Results in the same order as input
 */
export async function patchAllOrderFlags(orders, batchSize = 10) {
  const results = new Array(orders.length);

  // index pointer
  let index = 0;

  async function worker(workerId) {
    while (index < orders.length) {
      const current = index++;
      const order = orders[current];
      const res = await patchOrderFlags({
        orderId: order.id,
        trackUrl: order.track_url,
        status: order.status,
      });
      results[current] = res;
      console.log(`[WORKER ${workerId}] Done order ${order.id} (${current + 1}/${orders.length})`);
    }
  }

  // spin up N workers
  const workers = [];
  for (let i = 0; i < batchSize; i++) {
    workers.push(worker(i + 1));
  }

  await Promise.all(workers);
  return results;
}
