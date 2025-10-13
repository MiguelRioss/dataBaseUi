// /services/ordersService.mjs
import {
  createOrder,
  fetchOrders,
  fetchOrder,
  patchOrder,
} from "./api/ordersAPI.mjs";
import { mapDbToRows } from "../Orders/commonFiles/PopUp/utils/utils";

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
  const wrap = (value) =>
    value === undefined ? undefined : { status: !!value };

  const statusChanges = {};
  const assign = (key, value) => {
    const wrapped = wrap(value);
    if (wrapped !== undefined) {
      statusChanges[key] = wrapped;
    }
  };

  assign("accepted", flatPatch.accepted);
  assign("in_transit", flatPatch.in_transit);
  assign("delivered", flatPatch.delivered);
  assign("acceptedInCtt", flatPatch.acceptedInCtt);

  const waitingValue =
    flatPatch.waiting_to_be_delivered ?? flatPatch.wating_to_Be_Delivered;
  if (waitingValue !== undefined) {
    statusChanges.waiting_to_be_delivered = { status: !!waitingValue };
    statusChanges.wating_to_Be_Delivered = { status: !!waitingValue };
  }

  if (Object.keys(statusChanges).length === 0) return;

  return patchOrder(orderId, { status: statusChanges });
}

export async function updateTrackUrl(orderId, trackUrl) {
  console.log("Updating track URL:", { orderId, trackUrl });
  return patchOrder(orderId, { track_url: trackUrl });
}

export async function createOrderServices(order) {
  const response = await createOrder(order);
  return response?.order ?? response;
}

