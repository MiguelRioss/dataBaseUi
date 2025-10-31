import React from "react";
import OrderRow from "./OrderRow";
import SortableTh from "./commonFiles/toggleSort";
import {
  // Use ONE getter that accepts a folder, or replace with your own trio of getters.
  getOrdersByFolder, // <-- implement in ../services/orderServices.mjs
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
  buildNextStatusSteps,
  buildDeliveredPatch,
  filterRows,
  sortRows,
  toggleSort,
} from "./commonFiles/orderUtils.js";
import { moveOrdersTo } from "../services/orderMove.mjs";

/* ──────────────────────────────────────────────────────────────────────────────
   Table (unchanged)
────────────────────────────────────────────────────────────────────────────── */
function OrdersTable({
  rows,
  sort,
  onToggleSort,
  selectedIds,
  onToggleRow,
  allSelected,
  onToggleAll,
  rowProps,
  className = "",
}) {
  return (
    <div className={`overflow-x-auto mt-6 ${className}`}>
      <table className="card w-full text-sm align-middle">
        <thead>
          <tr>
            <th className="px-2 text-center">
              <input
                type="checkbox"
                checked={allSelected && rows.length > 0}
                onChange={onToggleAll}
              />
            </th>
            <SortableTh
              label="Order ID"
              colKey="id"
              sort={sort}
              onToggle={onToggleSort}
            />
            <SortableTh
              label="Payment ID"
              colKey="payment"
              sort={sort}
              onToggle={onToggleSort}
            />
            <SortableTh
              label="Date"
              colKey="date"
              sort={sort}
              onToggle={onToggleSort}
            />
            <SortableTh
              label="Customer"
              colKey="customer"
              sort={sort}
              onToggle={onToggleSort}
            />
            <SortableTh
              label="Email"
              colKey="email"
              sort={sort}
              onToggle={onToggleSort}
            />
            <th>Products</th>
            <th>Address</th>
            <SortableTh
              label="Price"
              colKey="price"
              sort={sort}
              onToggle={onToggleSort}
            />
            <th>Track URL</th>
            <SortableTh
              label="Payment Status"
              colKey="payment_status"
              sort={sort}
              onToggle={onToggleSort}
            />
            <th>Actions</th>
            <SortableTh
              label="Status"
              colKey="status"
              sort={sort}
              onToggle={onToggleSort}
            />
            <SortableTh
              label="Completed?"
              colKey="completed"
              sort={sort}
              onToggle={onToggleSort}
              className="text-center"
            />
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="align-middle">
              <td className="px-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => onToggleRow(r.id)}
                />
              </td>
              <OrderRow
                row={r}
                {...(typeof rowProps === "function" ? rowProps(r) : {})}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Main page with folder switching (ongoing / archived / deleted)
────────────────────────────────────────────────────────────────────────────── */
const FOLDERS = {
  ONGOING: "ongoing",
  ARCHIVED: "archive",
  DELETED: "deleted",
};

export default function Orders() {
  const [folder, setFolder] = React.useState(FOLDERS.ONGOING);

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
  const [selectedIds, setSelectedIds] = React.useState(new Set());

  // bulk action state
  const [bulkMoving, setBulkMoving] = React.useState(null); // "archive" | "deleted" | "ongoing" | null

  // ------- LOAD ORDERS FOR CURRENT FOLDER -------
  const load = React.useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const list = await getOrdersByFolder(folder); // implement to return array for the chosen folder
      setRows(list || []);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [folder]);

  React.useEffect(() => {
    load();
  }, [load]);

  // ------- UPDATE STATUS -------
  async function handleUpdateStatus(orderId, patch) {
    try {
      const updatedStatus = await updateOrderStatus(orderId, patch);
      const nextStatusSteps = buildNextStatusSteps(updatedStatus);
      setRows((prev) =>
        prev.map((r) =>
          r.id !== orderId
            ? r
            : { ...r, status: updatedStatus, status_steps: nextStatusSteps }
        )
      );
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  // ------- TOGGLE DELIVERED -------
  async function handleToggleDelivered(orderId, nextVal) {
    const patch = buildDeliveredPatch(nextVal);
    return handleUpdateStatus(orderId, patch);
  }

  // ------- TOGGLE PAYMENT -------
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
    []
  );

  // ------- SEND SHIPPING EMAIL -------
  const handleSendEmail = React.useCallback(
    async (row) => {
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

        await updateShippingEmailStatus(row.id, true);

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
    },
    [sendingEmailId]
  );

  // ------- SEND INVOICE -------
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
    [sendingInvoiceId]
  );

  // ------- OPEN MANUAL ORDER EDIT -------
  const handleOpenOrderEdit = React.useCallback((orderId) => {
    try {
      setError("");
      const result = manualOrderRef.current?.openEdit(orderId);
      if (result?.catch)
        result.catch((err) => setError(err?.message || String(err)));
    } catch (err) {
      setError(err?.message || String(err));
    }
  }, []);

  // ------- SAVE TRACK URL -------
  async function handleSaveTrackUrl(id, trackUrl) {
    try {
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

  // ------- MANUAL ORDER CREATE -------
  const handleManualOrderCreate = React.useCallback((rawOrder) => {
    if (!rawOrder || !rawOrder.id) return;
    const [mapped] = mapDbToRows({ [rawOrder.id]: rawOrder });
    if (!mapped) return;
    setRows((prev) => {
      const withoutDupes = prev.filter((row) => row.id !== mapped.id);
      return [mapped, ...withoutDupes];
    });
  }, []);

  // ------- FILTER + SORT -------
  const filteredRows = React.useMemo(
    () => filterRows(rows, searchTerm),
    [rows, searchTerm]
  );
  const sortedRows = React.useMemo(
    () => sortRows(filteredRows, sort),
    [filteredRows, sort]
  );
  const handleSortToggle = (key) => setSort((prev) => toggleSort(prev, key));

  const allSelected =
    selectedIds.size > 0 && selectedIds.size === sortedRows.length;

  function handleToggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    const allIds = sortedRows.map((r) => r.id);
    if (selectedIds.size === allIds.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  }

  // ------- BULK MOVE (contextual to current folder) -------
  async function handleBulkMove(dest /* "archive" | "deleted" | "ongoing" */) {
    const ids = [...selectedIds];
    if (!ids.length) return;

    const pretty =
      {
        [FOLDERS.ARCHIVED]: "Archive",
        [FOLDERS.DELETED]: "Deleted",
        [FOLDERS.ONGOING]: "Ongoing",
      }[dest] || dest;

    if (!window.confirm(`Move ${ids.length} order(s) to ${pretty}?`)) return;

    try {
      setBulkMoving(dest);
      // ⬇️ pass the current folder as source so the backend can move from the right node
      await moveOrdersTo(ids, dest, folder);

      // Optimistic UI: remove from current view
      setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBulkMoving(null);
    }
  }

  // ------- FOLDER SWITCH UI -------
  function FolderTabs() {
    const base = "btn padding-10";
    const on = "bg-white/10 text-white border border-white/20";
    const off =
      "bg-white/5 text-gray-200 hover:bg-white/10 border border-transparent";
    return (
      <div className="flex gap-2">
        <button
          className={`${base} ${folder === FOLDERS.ONGOING ? on : off}`}
          onClick={() => setFolder(FOLDERS.ONGOING)}
        >
          Ongoing
        </button>
        <button
          className={`${base} ${folder === FOLDERS.ARCHIVED ? on : off}`}
          onClick={() => setFolder(FOLDERS.ARCHIVED)}
        >
          Archived
        </button>
        <button
          className={`${base} ${folder === FOLDERS.DELETED ? on : off}`}
          onClick={() => setFolder(FOLDERS.DELETED)}
        >
          Deleted
        </button>
      </div>
    );
  }

  // Contextual bulk actions
  function BulkBar() {
    if (selectedIds.size === 0) return null;

    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300/40 bg-amber-50/40 p-3">
        <span className="text-sm">{selectedIds.size} selected</span>

        {folder !== FOLDERS.ARCHIVED && (
          <button
            className="btn btn--ghost"
            disabled={!!bulkMoving}
            onClick={() => handleBulkMove(FOLDERS.ARCHIVED)}
            title="Move selected to Archive"
          >
            {bulkMoving === FOLDERS.ARCHIVED ? "Archiving…" : "Move to Archive"}
          </button>
        )}

        {folder !== FOLDERS.DELETED && (
          <button
            className="btn btn--ghost"
            disabled={!!bulkMoving}
            onClick={() => handleBulkMove(FOLDERS.DELETED)}
            title="Move selected to Deleted"
          >
            {bulkMoving === FOLDERS.DELETED ? "Deleting…" : "Move to Deleted"}
          </button>
        )}

        {folder !== FOLDERS.ONGOING && (
          <button
            className="btn btn--ghost"
            disabled={!!bulkMoving}
            onClick={() => handleBulkMove(FOLDERS.ONGOING)}
            title="Restore to Ongoing"
          >
            {bulkMoving === FOLDERS.ONGOING
              ? "Restoring…"
              : "Restore to Ongoing"}
          </button>
        )}

        <button
          className="btn"
          onClick={() => setSelectedIds(new Set())}
          disabled={!!bulkMoving}
        >
          Clear Selection
        </button>
      </div>
    );
  }

  return (
    <div className="page py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="orders-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="orders-title text-xl font-semibold">Orders</h1>
            <FolderTabs />
          </div>

          <div className="orders-actions flex flex-wrap gap-6 sm:gap-8 items-center">
            <button
              className="btn btn--xl btn--primary"
              onClick={logThenPatchOrders}
              disabled={scanLoading}
            >
              {scanLoading ? "Updating..." : "Log Orders & Patch Flags"}
            </button>
            {folder === FOLDERS.ONGOING && (
              <NewOrderPopup
                ref={manualOrderRef}
                onCreate={handleManualOrderCreate}
              />
            )}
          </div>
        </div>

        <BulkBar />

        {error && (
          <div className="new-order-hint new-order-hint--error mt-4">
            {error}
          </div>
        )}

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

        {loading ? (
          <div className="page text-center mt-6">Loading orders...</div>
        ) : !rows.length ? (
          <div className="page text-center mt-6 text-gray-400">
            No orders in this folder.
          </div>
        ) : !filteredRows.length ? (
          <div className="page text-center mt-6 text-gray-400">
            No orders match your search.
          </div>
        ) : (
          <OrdersTable
            rows={sortedRows}
            sort={sort}
            onToggleSort={handleSortToggle}
            selectedIds={selectedIds}
            onToggleRow={handleToggleRow}
            allSelected={allSelected}
            onToggleAll={handleToggleAll}
            rowProps={(r) => ({
              isEditing: editingId === r.id,
              onEdit: () => setEditingId(r.id),
              onCancelEdit: () => setEditingId(null),
              onSaveTrackUrl: handleSaveTrackUrl,
              saving: savingId === r.id,
              sendingEmail: sendingEmailId === r.id,
              sendingInvoice: sendingInvoiceId === r.id,
              onUpdateStatus: handleUpdateStatus,
              onToggleDelivered: handleToggleDelivered,
              onSendEmail: handleSendEmail,
              onOpenOrderEdit: handleOpenOrderEdit,
              onTogglePaymentStatus: handleTogglePaymentStatus,
              togglingPaymentStatus: updatingPaymentStatusId === r.id,
              onSendInvoice: handleSendInvoice,
              paymentStatus: r.payment_status,
              emailSentThankYouAdmin: r.emailThankYouAdmin,
            })}
          />
        )}
      </div>
    </div>
  );
}
