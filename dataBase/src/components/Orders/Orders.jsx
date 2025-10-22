import React from "react";
import OrderRow from "./OrderRow";
import SortableTh from "./commonFiles/toggleSort";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateTrackUrl,
  updatePaymentStatus,
  updateShippingEmailStatus,
} from "../services/orderServices.mjs";
import { patchAllOrderFlags } from "../services/cttPatch";
import NewOrderPopup from "./commonFiles/NewOrder/NewOrderPopUp";
import { mapDbToRows, buildCttUrl } from "./commonFiles/PopUp/utils/utils";
import {
  sendShippingEmail,
  sendInvoiceEmail,
} from "../services/emailServices.mjs";
import {
  SHIPMENT_STATUS_KEYS,
  SHIPMENT_STATUS_LABELS,
} from "./commonFiles/Status/shipmentStatus";

export default function Orders() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [scanLoading, setScanLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [savingId, setSavingId] = React.useState(null);
  const [sendingEmailId, setSendingEmailId] = React.useState(null);
  const [sendingInvoiceId, setSendingInvoiceId] = React.useState(null);
  const [updatingPaymentStatusId, setUpdatingPaymentStatusId] =
    React.useState(null);
  const [sort, setSort] = React.useState({ key: "date", dir: "desc" });
  const [searchTerm, setSearchTerm] = React.useState("");
  const manualOrderRef = React.useRef(null);

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

  async function handleUpdateStatus(orderId, patch) {
    try {
      const updatedStatus = await updateOrderStatus(orderId, patch);
      const nextStatusSteps = SHIPMENT_STATUS_KEYS.map((key) => ({
        key,
        label: SHIPMENT_STATUS_LABELS[key],
        ...updatedStatus[key],
      }));

      setRows((prev) =>
        prev.map((r) =>
          r.id !== orderId
            ? r
            : {
                ...r,
                status: updatedStatus,
                status_steps: nextStatusSteps,
              }
        )
      );
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function handleToggleDelivered(orderId, nextVal) {
    // When delivered, mark all steps true; otherwise false
    const patch = SHIPMENT_STATUS_KEYS.reduce((acc, key) => {
      acc[key] = nextVal;
      return acc;
    }, {});

    return handleUpdateStatus(orderId, patch);
  }

  const handleTogglePaymentStatus = React.useCallback(
    async (orderId, nextStatus) => {
      if (!orderId) return;
      try {
        setError("");
        setUpdatingPaymentStatusId(orderId);
        await updatePaymentStatus(orderId, nextStatus);
        setRows((prev) =>
          prev.map((row) =>
            row.id === orderId ? { ...row, payment_status: nextStatus } : row
          )
        );
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setUpdatingPaymentStatusId(null);
      }
    },
    [setRows, setError, updatePaymentStatus]
  );

  const handleSendEmail = React.useCallback(async (row) => {
    if (!row) return;
    const trackingCode = String(row.track_url ?? "").trim();
    const normalizedTracking = trackingCode.toUpperCase();
    const hasTracking =
      normalizedTracking.length > 0 && normalizedTracking.includes("RT");

    if (!hasTracking) {
      setError("Add the RT tracking code before sending the shipping email.");
      return;
    }

    if (!row.email) {
      setError("Customer email is missing for this order.");
      return;
    }

    if (sendingEmailId) return;

    try {
      setError("");
      setSendingEmailId(row.id);

      const order = await getOrderById(row.id);
      if (!order) throw new Error("Order details not found.");

      const orderDate =
        order?.written_at ??
        (typeof row?.date?.toISOString === "function"
          ? row.date.toISOString()
          : undefined);

      const invoiceId =
        order?.invoice_id ??
        order?.metadata?.invoice_id ??
        order?.metadata?.invoiceId;

      const locale =
        order?.metadata?.locale ??
        order?.metadata?.lang ??
        order?.metadata?.language;

      // ✅ 1️⃣ Send the actual email
      await sendShippingEmail({
        order,
        orderId: row.id,
        orderDate,
        invoiceId,
        trackingNumber: trackingCode,
        trackingUrl: buildCttUrl(trackingCode),
        locale,
        live: true,
      });

      // ✅ 2️⃣ Persist flag to DB
      await updateShippingEmailStatus(row.id, true);
      console.log(
        `[Orders.jsx] DB updated: sentShippingEmail=true for ${row.id}`
      );

      // ✅ 3️⃣ Update local UI immediately
      setRows((prev) =>
        prev.map((existing) =>
          existing.id === row.id
            ? { ...existing, sentShippingEmail: true }
            : existing
        )
      );
    } catch (err) {
      setError(err?.message || "Failed to send shipping email.");
    } finally {
      setSendingEmailId(null);
    }
  });

  const handleSendInvoice = React.useCallback(
    async (row) => {
      if (!row) return;
      if (sendingInvoiceId) return;

      try {
        setError("");
        setSendingInvoiceId(row.id);

        const order = await getOrderById(row.id);
        if (!order) throw new Error("Order details not found.");

        const invoiceId =
          order?.invoice_id ??
          order?.metadata?.invoice_id ??
          order?.metadata?.invoiceId;

        await sendInvoiceEmail({
          order,
          orderId: row.id,
          invoiceId,
          live: true,
        });
      } catch (err) {
        setError(err?.message || "Failed to send invoice email.");
      } finally {
        setSendingInvoiceId(null);
      }
    },
    [sendingInvoiceId, getOrderById, sendInvoiceEmail, setError]
  );

  const handleOpenOrderEdit = React.useCallback(
    (orderId) => {
      try {
        setError("");
        const result = manualOrderRef.current?.openEdit(orderId);
        if (result?.catch) {
          result.catch((err) => {
            setError(err?.message || String(err));
          });
        }
      } catch (err) {
        setError(err?.message || String(err));
      }
    },
    [manualOrderRef, setError]
  );

  // ------- SAVE TRACK URL -------
  async function handleSaveTrackUrl(id, trackUrl) {
    try {
      console.log(trackUrl);
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
      console.log("[Orders.jsx] 🔄 Triggering Pi patch job...");
      const results = await patchAllOrderFlags();
      console.log(
        "[Orders.jsx] ✅ Pi job done:",
        results.length,
        "orders patched"
      );
      console.log("[Orders.jsx] 🔁 Reloading updated orders from DB...");
      await load();
      console.log("[Orders.jsx] ✅ Orders reloaded");
    } catch (e) {
      console.error("[Orders.jsx] ❌ Patch failed:", e);
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
    payment_status: (r) => (r.payment_status ? 1 : 0),
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
      const defaultDir = [
        "date",
        "price",
        "completed",
        "payment_status",
      ].includes(key)
        ? "desc"
        : "asc";
      return { key, dir: defaultDir };
    });
  };

  const filteredRows = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const idMatch = String(row.id ?? "")
        .toLowerCase()
        .includes(query);
      const paymentMatch = String(row.payment_id ?? "")
        .toLowerCase()
        .includes(query);
      const nameMatch = String(row.name ?? "")
        .toLowerCase()
        .includes(query);
      const emailMatch = String(row.email ?? "")
        .toLowerCase()
        .includes(query);
      const paymentStatusLabel = row.payment_status ? "paid" : "unpaid";
      const paymentStatusMatch =
        paymentStatusLabel.includes(query) ||
        String(row.payment_status ?? "")
          .toLowerCase()
          .includes(query);
      return (
        idMatch || paymentMatch || nameMatch || emailMatch || paymentStatusMatch
      );
    });
  }, [rows, searchTerm]);

  const sortedRows = React.useMemo(() => {
    const targetRows = filteredRows;
    const getter = SORT_KEYS[sort.key];
    if (!getter) return targetRows;
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...targetRows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
  }, [filteredRows, sort]);

  const hasSearch = searchTerm.trim().length > 0;

  // ------- UI -------
  return (
    <div className="page py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="orders-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="orders-title text-xl font-semibold">Orders</h1>

          <div className="orders-actions flex flex-wrap gap-6 sm:gap-8 items-center">
            <button
              className="btn btn--xl btn--primary"
              onClick={logThenPatchOrders}
              disabled={scanLoading}
            >
              {scanLoading ? "Updating..." : "Log Orders & Patch Flags"}
            </button>
            <NewOrderPopup
              ref={manualOrderRef}
              onCreate={handleManualOrderCreate}
            />
          </div>
        </div>

        {error ? (
          <div className="new-order-hint new-order-hint--error mt-4">
            {error}
          </div>
        ) : null}

        <div className="mt-4 w-full">
          <label
            htmlFor="orders-search"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Search Orders
          </label>
          <input
            id="orders-search"
            type="text"
            className="new-order-input w-full"
            placeholder="Search by order id, payment id, name, or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* State feedback below the header */}
        {loading ? (
          <div className="page text-center mt-6">Loading orders...</div>
        ) : !rows.length ? (
          <div className="page text-center mt-6 text-gray-400">
            No orders yet.
          </div>
        ) : !filteredRows.length ? (
          <div className="page text-center mt-6 text-gray-400">
            No orders match your search.
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
                  <SortableTh
                    label="Payment Status"
                    colKey="payment_status"
                    sort={sort}
                    onToggle={toggleSort}
                  />
                  <th>Actions</th>
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
                {sortedRows.map((r) => {
                  console.log("[Orders.jsx] Row data before rendering:", r); // 🧾 DEBUG
                  return (
                    <OrderRow
                      key={r.id}
                      row={r}
                      isEditing={editingId === r.id}
                      onEdit={() => setEditingId(r.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveTrackUrl={handleSaveTrackUrl}
                      saving={savingId === r.id}
                      sendingEmail={sendingEmailId === r.id} // ✅ boolean, not sendingEmailId
                      sendingInvoice={sendingInvoiceId === r.id} // ✅ ADD THIS
                      onUpdateStatus={handleUpdateStatus}
                      onToggleDelivered={handleToggleDelivered}
                      onSendEmail={handleSendEmail}
                      onOpenOrderEdit={handleOpenOrderEdit}
                      onTogglePaymentStatus={handleTogglePaymentStatus}
                      togglingPaymentStatus={updatingPaymentStatusId === r.id}
                      onSendInvoice={handleSendInvoice}
                      paymentStatus={r.payment_status} // ✅ matches DB key
                      emailSentThankYouAdmin={r.emailThankYouAdmin} // ✅ matches DB key
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
