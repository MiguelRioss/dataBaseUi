import React from "react";
import OrderRow from "./OrderRow";
import { mapDbToRows } from "./commonFiles/utils";
import { patchAllOrderFlags } from "../services/cttPatch";
import fetchOrders from "../services/fetchOrders";
import { API_BASE } from "../services/apiBase";
import SortableTh from "./commonFiles/toggleSort";

export default function Orders() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [scanLoading, setScanLoading] = React.useState(false);

  // editing/saving state
  const [editingId, setEditingId] = React.useState(null);
  const [savingId, setSavingId] = React.useState(null);

  // Normalize flat booleans from the popup to your nested status shape
  function buildStatusPatchFromFlat(flat) {
    const wrap = (v) => ({ status: !!v });
    return {
      status: {
        accepted: wrap(flat.accepted),
        in_transit: wrap(flat.in_transit),
        delivered: wrap(flat.delivered),
        acceptedInCtt: wrap(flat.acceptedInCtt),
        wating_to_Be_Delivered: wrap(flat.wating_to_Be_Delivered),
      },
    };
  }

  async function handleUpdateStatus(orderId, flatPatch) {
    const changes = buildStatusPatchFromFlat(flatPatch);

    const res = await fetch(
      `${API_BASE}/api/orders/${encodeURIComponent(orderId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      }
    );
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j?.error) msg += `: ${j.error}`;
        if (j?.detail) msg += ` — ${j.detail}`;
      } catch {}
      throw new Error(msg);
    }

    // optimistic update
    setRows((prev) =>
      prev.map((r) =>
        r.id === orderId
          ? { ...r, status: { ...r.status, ...changes.status } }
          : r
      )
    );
  }

  async function handleToggleDelivered(orderId, nextVal) {
    // If we are marking as completed (nextVal = true),
    // set ALL shipment flags to true.
    let flat;
    if (nextVal) {
      flat = {
        accepted: true,
        in_transit: true,
        delivered: true,
        acceptedInCtt: true,
        wating_to_Be_Delivered: true,
      };
    } else {
      // If un-marking completed, you can decide:
      // Option A: set all to false
      // Option B: only set delivered to false, keep history
      flat = { delivered: false };
    }

    return handleUpdateStatus(orderId, flat);
  }

  // ----- LOAD -----
  const load = React.useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { items } = await fetchOrders({ limit: 100, apiBase: API_BASE });
      const byId = Object.fromEntries((items || []).map((o) => [o.id, o]));
      const list = mapDbToRows(byId).sort(
        (a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0)
      );
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

  // ----- SAVE track_url -----
  async function handleSaveTrackUrl(id, trackUrl) {
    try {
      setSavingId(id);
      const res = await fetch(
        `${API_BASE}/api/orders/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changes: { track_url: trackUrl } }),
        }
      );
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg += `: ${j.error}`;
          if (j?.detail) msg += ` — ${j.detail}`;
        } catch {}
        throw new Error(msg);
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, track_url: trackUrl } : r))
      );
      setEditingId(null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSavingId(null);
    }
  }

  // ----- BULK PATCH -----
  const logThenPatchOrders = React.useCallback(async () => {
    setScanLoading(true);
    try {
      const orders = (await fetchOrders()).items;
      console.table(
        orders.map((o) => ({ orderId: o.id, track_url: o.track_url }))
      );
      await patchAllOrderFlags(orders);
      await load();
    } catch (e) {
      console.error("[LOG->PATCH] error:", e);
      setError(e.message || String(e));
    } finally {
      setScanLoading(false);
    }
  }, [load]);

  // ----- SORTING (state + logic HERE) -----
  // ----- SORTING -----
  const [sort, setSort] = React.useState({ key: "date", dir: "desc" });

  const getCompleted = (r) => (r?.status?.delivered?.status ? 1 : 0);

  const SORT_KEYS = {
    id: (r) => r.id,
    date: (r) => (r.date instanceof Date ? r.date.getTime() : 0),
    customer: (r) => (r.name || "").toString().toLowerCase(), // was r.customer
    email: (r) => (r.email || "").toString().toLowerCase(),
    price: (r) => (Number.isFinite(r.amount) ? r.amount : 0), // cents
    status: (r) => {
      // choose what “status” means for sorting; here delivered first, then label
      const deliveredRank = r?.status?.delivered?.status ? 0 : 1; // 0 = better
      const label = (r?.status?.label || r?.status?.state || "").toLowerCase();
      // combine into a tuple-like string to keep rank primary, then label
      return `${deliveredRank}::${label}`;
    },
    completed: (r) => getCompleted(r), // uses nested delivered.status
  };

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      // sensible defaults
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
      if (va == null) return 1; // nulls last
      if (vb == null) return -1;

      // numbers vs strings — both comparable
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
  }, [rows, sort]);
  // ----- /SORTING -----

  if (loading) return <div className="page">Loading orders...</div>;
  if (!rows.length) return <div className="page">No orders yet.</div>;

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h1>Orders</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={logThenPatchOrders}
            disabled={scanLoading}
            style={{ background: "#0a4", color: "#fff" }}
          >
            {scanLoading ? "Updating..." : "Log objects -> Patch flags"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239,68,68,.08)",
            border: "1px solid rgba(239,68,68,.35)",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <table className="card">
        <thead>
          <tr>
            <SortableTh
              label="id"
              colKey="id"
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
            <th style={{ width: 240 }}>Actions</th>
            <SortableTh
              label="Status"
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
              // NEW
              onUpdateStatus={handleUpdateStatus}
              onToggleDelivered={handleToggleDelivered}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
