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

export async function createOrderServices(order) {
  const response = await createOrder(order);
  return response?.order ?? response;
}

