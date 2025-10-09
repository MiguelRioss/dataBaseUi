// /services/ordersService.mjs
import {fetchOrders,patchOrder, createOrder,} from "./api/ordersApi";
import { mapDbToRows } from "../Orders/commonFiles/PopUp/utils/utils";

// Fetch and map all orders
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
      .filter((order) => order && (order.id))
      .map((order) => [
        order.id,
        { ...order, id: order.id ?? order.uid ?? order.orderId },
      ])
  );

  return mapDbToRows(byId).sort(
    (a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0)
  );
}

// Update nested status flags
export async function updateOrderStatus(orderId, flatPatch) {
  const wrap = (v) => ({ status: !!v });
  const changes = {
    status: {
      accepted: wrap(flatPatch.accepted),
      in_transit: wrap(flatPatch.in_transit),
      delivered: wrap(flatPatch.delivered),
      acceptedInCtt: wrap(flatPatch.acceptedInCtt),
      wating_to_Be_Delivered: wrap(flatPatch.wating_to_Be_Delivered),
    },
  };
  return patchOrder(orderId, changes);
}

// Update tracking URL
export async function updateTrackUrl(orderId, trackUrl) {
  return patchOrder(orderId, { track_url: trackUrl });
}

// Create a new order and return the raw payload from the API
export async function createOrder(order) {
  const response = await createOrder(order);
  return response?.order ?? response;
}
