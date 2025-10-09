// /services/ordersService.mjs
import { createOrder,fetchOrders,patchOrder } from "./api/ordersAPI.mjs";
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

export async function updateOrderStatus(orderId, flatPatch) {
  const wrap = (v) => ({ status: !!v });
  const changes = {
    status: {
      accepted: wrap(flatPatch.accepted),
      in_transit: wrap(flatPatch.in_transit),
      delivered: wrap(flatPatch.delivered),
      acceptedInCtt: wrap(flatPatch.acceptedInCtt),
      waiting_to_be_delivered: wrap(flatPatch.waiting_to_be_delivered),
    },
  };
  return patchOrder(orderId, changes);
}

export async function updateTrackUrl(orderId, trackUrl) {
  return patchOrder(orderId, { track_url: trackUrl });
}

export async function createOrderServices(order) {
  const response = await createOrder(order);
  return response?.order ?? response;
}
