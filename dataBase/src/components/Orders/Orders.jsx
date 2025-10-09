import React from "react";
import OrderRow from "./OrderRow";
import SortableTh from "./commonFiles/toggleSort";
import {
  getAllOrders,
  updateOrderStatus,
  updateTrackUrl,
} from "../services/orderServices.mjs";
import { patchAllOrderFlags } from "../services/cttPatch";
import NewOrderPopup from "./commonFiles/PopUp/NewOrderPopUp";
import { mapDbToRows } from "./commonFiles/PopUp/utils/utils";

export default function Orders() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [scanLoading, setScanLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [savingId, setSavingId] = React.useState(null);
  const [sort, setSort] = React.useState({ key: "date", dir: "desc" });

  // ------- LOAD ORDERS -------
  const load = React.useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const list = await getAllOrders();
      setRows(list);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // ------- UPDATE STATUS -------
  const normalizeStatusPatch = (patch = {}) => {
    const normalized = { ...patch };
    if (
      Object.prototype.hasOwnProperty.call(
        normalized,
        "wating_to_Be_Delivered"
      ) &&
      !Object.prototype.hasOwnProperty.call(
        normalized,
        "waiting_to_be_delivered"
      )
    ) {
      normalized.waiting_to_be_delivered =
        normalized.wating_to_Be_Delivered;
    }
    delete normalized.wating_to_Be_Delivered;
    return normalized;
  };

  async function handleUpdateStatus(orderId, flatPatch) {
    const normalizedPatch = normalizeStatusPatch(flatPatch);
    try {
      await updateOrderStatus(orderId, normalizedPatch);
      setRows((prev) =>
        prev.map((r) =>
          r.id === orderId
            ? {
                ...r,
                status: ((currentStatus) => {
                  const nextStatus = { ...currentStatus };
                  delete nextStatus.wating_to_Be_Delivered;
                  Object.entries(normalizedPatch).forEach(([key, value]) => {
                    nextStatus[key] = {
                      ...(nextStatus[key] ?? {}),
                      status: !!value,
                    };
                  });
                  return nextStatus;
                })(r.status || {}),
              }
            : r
        )
      );
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleToggleDelivered(orderId, nextVal) {
    const flat = nextVal
      ? {
          accepted: true,
          in_transit: true,
          delivered: true,
          acceptedInCtt: true,
          waiting_to_be_delivered: true,
        }
      : { delivered: false };
    return handleUpdateStatus(orderId, flat);
  }

  const handleSendEmail = React.useCallback(
    (order) => {
      if (!order?.email) {
        setError("Customer email is missing for this order.");
        return;
      }
      setError("");
      const subject = encodeURIComponent(`Order ${order?.id ?? ""} update`);
      const href = `mailto:${order.email}?subject=${subject}`;
      if (typeof window !== "undefined") {
        window.open(href, "_blank", "noopener,noreferrer");
      }
    },
    [setError]
  );

  // ------- SAVE TRACK URL -------
  async function handleSaveTrackUrl(id, trackUrl) {
    try {
      console.log(trackUrl)
      setSavingId(id);
      await updateTrackUrl(id, trackUrl);
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, track_url: trackUrl } : r))
      );
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  // ------- BULK PATCH -------
  const logThenPatchOrders = React.useCallback(async () => {
    setScanLoading(true);
    try {
      await patchAllOrderFlags();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setScanLoading(false);
    }
  }, [load]);

  const handleManualOrderCreate = React.useCallback((rawOrder) => {
    if (!rawOrder || !rawOrder.id) return;
    const [mapped] = mapDbToRows({ [rawOrder.id]: rawOrder });
    if (!mapped) return;
    setRows((prev) => {
      const withoutDupes = prev.filter((row) => row.id !== mapped.id);
      return [mapped, ...withoutDupes];
    });
}, []);

  // ------- SORTING -------
  const SORT_KEYS = {
    id: (r) => r.id,
    date: (r) => (r.date instanceof Date ? r.date.getTime() : 0),
    customer: (r) => (r.name || "").toLowerCase(),
    email: (r) => (r.email || "").toLowerCase(),
    payment: (r) => String(r.payment_id || "").toLowerCase(),
    price: (r) => (Number.isFinite(r.amount) ? r.amount : 0),
    status: (r) => {
      const deliveredRank = r?.status?.delivered?.status ? 0 : 1;
      const label = (r?.status?.label || r?.status?.state || "").toLowerCase();
      return `${deliveredRank}::${label}`;
    },
    completed: (r) => (r?.status?.delivered?.status ? 1 : 0),
  };

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key)
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      const defaultDir = ["date", "price", "completed"].includes(key)
        ? "desc"
        : "asc";
      return { key, dir: defaultDir };
    });
  };

  const sortedRows = React.useMemo(() => {
    const getter = SORT_KEYS[sort.key];
    if (!getter) return rows;
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
  }, [rows, sort]);

  // ------- UI -------
  return (
    <div className="page py-4">
      <div className="max-w-6xl mx-auto px-6">
        <div className="orders-header">
          <h1 className="orders-title">Orders</h1>
          <div className="orders-actions">
            {/* Only show Log button if orders exist */}
            {rows.length > 0 && (
              <button
                className="btn btn--xl btn--primary w-full sm:w-auto"
                onClick={logThenPatchOrders}
                disabled={scanLoading}
              >
                {scanLoading ? "Updating..." : "Log Orders & Patch Flags"}
              </button>
            )}
            {/* Always show Create Manual Order button */}
            <NewOrderPopup onCreate={handleManualOrderCreate} />
          </div>
        </div>

        {/* State feedback below the header */}
        {loading ? (
          <div className="page text-center mt-6">Loading orders...</div>
        ) : !rows.length ? (
          <div className="page text-center mt-6 text-gray-400">
            No orders yet.
          </div>
        ) : (
          <div className="overflow-x-auto mt-6">
            <table className="card w-full text-sm">
              <thead>
                <tr>
                  <SortableTh
                    label="Order ID"
                    colKey="id"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Payment ID"
                    colKey="payment"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Date"
                    colKey="date"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Customer"
                    colKey="customer"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Email"
                    colKey="email"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <th>Products</th>
                  <th>Address</th>
                  <SortableTh
                    label="Price"
                    colKey="price"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <th>Track URL</th>
                  <th >Actions</th>
                  <SortableTh
                    label="Status"
                    colKey="status"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Last Status"
                    colKey="status"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Completed?"
                    colKey="completed"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <OrderRow
                    key={r.id}
                    row={r}
                    isEditing={editingId === r.id}
                    onEdit={() => setEditingId(r.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveTrackUrl={handleSaveTrackUrl}
                    saving={savingId === r.id}
                    onUpdateStatus={handleUpdateStatus}
                    onToggleDelivered={handleToggleDelivered}
                    onSendEmail={handleSendEmail}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
