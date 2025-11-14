import {
  createOrder,
  fetchOrders,
  fetchOrder,
  patchOrder,
} from "./api/ordersAPI.mjs";
import { mapDbToRows } from "../Orders/commonFiles/PopUp/utils/utils";
import {
  SHIPMENT_STATUS_KEYS,
  normalizeShipmentStatus,
} from "../Orders/commonFiles/Status/shipmentStatus.js";

function getCurrentDateTimeParts() {
  const iso = new Date().toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 19),
  };
}

function buildNextStatusStep(prev = {}, nextStatus) {
  const previous =
    prev && typeof prev === "object"
      ? {
          status: !!prev.status,
          date: prev.date ?? null,
          time: prev.time ?? null,
        }
      : { status: false, date: null, time: null };

  if (!nextStatus) {
    return { status: false, date: null, time: null };
  }

  if (previous.status && previous.date && previous.time) {
    return { ...previous, status: true };
  }

  const { date, time } = getCurrentDateTimeParts();
  return {
    ...previous,
    status: true,
    date: previous.date ?? date,
    time: previous.time ?? time,
  };
}

export async function getAllOrders(limit = 100) {
  const payload = await fetchOrders({ limit });

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : payload?.items && typeof payload.items === "object"
        ? Object.values(payload.items)
        : [];

  const byId = Object.fromEntries(
    list
      .filter((order) => order && order.id)
      .map((order) => [
        order.id,
        { ...order, id: order.id ?? order.uid ?? order.orderId },
      ])
  );

  return mapDbToRows(Object.values(byId)).sort(
    (a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0)
  );
}

export async function getOrderById(orderId) {
  if (!orderId) throw new Error("Order id is required");
  const payload = await fetchOrder(orderId);
  if (!payload) return null;
  const order = payload?.order ?? payload;
  if (!order) return null;
  const id =
    order.id ??
    order.uid ??
    order.orderId ??
    order.order_id ??
    orderId;
  return { ...order, id };
}

export async function updateOrder(orderId, changes = {}) {
  if (!orderId) throw new Error("Order id is required");
  const cleanChanges =
    changes && typeof changes === "object" ? { ...changes } : {};
  if (Object.keys(cleanChanges).length === 0) return null;
  return patchOrder(orderId, cleanChanges);
}


export async function updateShippingEmailStatus(orderId, value = true) {
  if (!orderId) throw new Error("Missing orderId for updateShippingEmailStatus.");

  console.log("[orderServices] Updating sentShippingEmail:", { orderId, value });

  // Reuse patchOrder to persist only the flag
  return patchOrder(orderId, { sentShippingEmail: value });
}
export async function updateInvoiceEmailStatus(orderId, value = true) {
  if (!orderId) throw new Error("Missing orderId for updateInvoiceEmailStatus.");

  console.log("[orderServices] Updating email_Sent_ThankYou_Admin:", { orderId, value });

  // Reuse patchOrder to persist only the flag
  return patchOrder(orderId, { email_Sent_ThankYou_Admin: value });
}

export async function updateOrderStatus(orderId, flatPatch = {}) {
  if (!orderId) throw new Error("Missing orderId for updateOrderStatus.");

  const existing = await getOrderById(orderId);
  if (!existing) throw new Error(`Order not found: ${orderId}`);

  const currentStatus = normalizeShipmentStatus(existing.status);
  const mergedStatus = { ...currentStatus };
  let didChange = false;

  for (const key of SHIPMENT_STATUS_KEYS) {
    if (flatPatch[key] === undefined) continue;
    didChange = true;
    const nextStatus = !!flatPatch[key];
    const prev = mergedStatus[key] || {};
    mergedStatus[key] = buildNextStatusStep(prev, nextStatus);
  }

  if (!didChange) {
    return currentStatus;
  }

  await patchOrder(orderId, { status: mergedStatus });
  return normalizeShipmentStatus(mergedStatus);
}

export async function updateTrackUrl(orderId, trackUrl) {
  console.log("Updating track URL:", { orderId, trackUrl });
  return patchOrder(orderId, { track_url: trackUrl });
}

export async function updatePaymentStatus(orderId, paymentStatus) {
  if (!orderId) throw new Error("Order id is required");
  const normalized = !!paymentStatus;
  await patchOrder(orderId, { payment_status: normalized });
  return normalized;
}

export async function createOrderServices(order) {
  const response = await createOrder(order);
  return response?.order ?? response;
}


/* ──────────────────────────────────────────────────────────────────────────────
   Folder-aware getters
   - Relies on fetchOrders({ folder, limit })
   - Normalizes payload -> list -> mapDbToRows -> date-desc sort
────────────────────────────────────────────────────────────────────────────── */

const FOLDERS = {
  ONGOING: "ongoing",
  ARCHIVE: "archive",
  DELETED: "deleted",
};

/**
 * Internal: normalize API payload to a flat array of order objects.
 */
function normalizePayloadToList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (payload?.items && typeof payload.items === "object") {
    return Object.values(payload.items);
  }
  return [];
}

/**
 * Internal: maps a raw list to UI rows and sorts by date desc.
 */
function mapAndSort(list) {
  const byId = Object.fromEntries(
    list
      .filter((order) => order && (order.id || order.uid || order.orderId || order.order_id))
      .map((order) => [
        order.id ?? order.uid ?? order.orderId ?? order.order_id,
        { ...order, id: order.id ?? order.uid ?? order.orderId ?? order.order_id },
      ])
  );

  const rows = mapDbToRows(Object.values(byId));
  return rows.sort((a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0));
}

/**
 * Get orders by folder.
 * @param {"ongoing" | "archive" | "deleted"} folder
 * @param {number} limit
 * @returns {Promise<Array>} mapped & sorted rows
 */
export async function getOrdersByFolder(folder, limit = 100) {
  // Guard unknown folders early (helps avoid silent empty UI states).
  const allowed = new Set(Object.values(FOLDERS));
  if (!allowed.has(folder)) {
    throw new Error(
      `Invalid folder "${folder}". Allowed: ${[...allowed].join(", ")}`
    );
  }

  // If your backend expects no "folder" param for ongoing,
  // you can special-case it here. Otherwise pass it through.
  const query = folder === FOLDERS.ONGOING ? { limit } : { folder, limit };

  const payload = await fetchOrders(query);
  const list = normalizePayloadToList(payload);
  return mapAndSort(list);
}

/**
 * Convenience wrappers (keep API readable in UI screens).
 */
export async function getArchivedOrders(limit = 100) {
  return getOrdersByFolder(FOLDERS.ARCHIVE, limit);
}

export async function getDeletedOrders(limit = 100) {
  return getOrdersByFolder(FOLDERS.DELETED, limit);
}


/* ──────────────────────────────────────────────────────────────────────────────
   Move orders between folders (client → API)
   - source/dest: "orders" | "archive" | "deleted" (accepts "archived" → "archive")
   - ids: array of order IDs
────────────────────────────────────────────────────────────────────────────── */

function normalizeFolderName(v) {
  const x = String(v ?? "").trim().toLowerCase();
  if (x === "archived") return "archive";
  if (x === "ongoing")  return "orders";
  if (x === "orders" || x === "archive" || x === "deleted") return x;
  throw new Error(`Invalid folder "${v}". Allowed: orders | archive | deleted`);
}

/**
 * Bulk move orders. Example: moveOrdersTo(["A","B"], "archive", "orders")
 * If source is omitted, the server can infer from current view, but passing it is safer.
 */
export async function moveOrdersTo(ids, dest, source) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("moveOrdersTo: 'ids' must be a non-empty array");
  }
  const body = {
    ids,
    dest:   normalizeFolderName(dest),
    source: source ? normalizeFolderName(source) : undefined,
  };

  const res = await fetch("/api/orders/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `Failed to move orders (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch (_) {}
    throw new Error(msg);
  }

  return res.json(); // -> { moved, skipped, source, dest }
}

/**
 * Convenience single-order wrapper.
 */
export async function moveOrderTo(id, dest, source) {
  if (!id) throw new Error("moveOrderTo: 'id' is required");
  return moveOrdersTo([id], dest, source);
}
