// src/components/Orders/Orders.jsx
import React from "react";
import OrderRow from "./OrderRow";
import { mapDbToRows } from "./commonFiles/utils";
import { buildOrdersObjectWithFlags } from "./services/cttBulk";
import { patchAllOrderFlags } from "./services/cttPatch";
import fetchOrders from "./services/fetchOrders";
import { API_BASE } from "./services/apiBase";

export default function Orders() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [scanLoading, setScanLoading] = React.useState(false);

  // NEW: editing/saving state
  const [editingId, setEditingId] = React.useState(null);
  const [savingId, setSavingId] = React.useState(null);

  const load = React.useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { items } = await fetchOrders({ limit: 100, apiBase: API_BASE });

      // Build object keyed by id so mapDbToRows keeps working
      const byId = Object.fromEntries(
        (items || []).map((o) => [o.id, o])
      );

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

// NEW: PATCH track_url (adjust endpoint if needed)
async function handleSaveTrackUrl(id, trackUrl) {
  try {
    setSavingId(id);
    const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes: { track_url: trackUrl } }), // <-- fixed
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j?.error) msg += `: ${j.error}`;
        if (j?.detail) msg += ` — ${j.detail}`;
      } catch {}
      throw new Error(msg);
    }

    // optimistic UI update
    setRows(prev => prev.map(r => (r.id === id ? { ...r, track_url: trackUrl } : r)));
    setEditingId(null);
  } catch (e) {
    setError(e.message || String(e));
  } finally {
    setSavingId(null);
  }
}


  // Existing: flag sweep via CTT
  const logThenPatchOrders = React.useCallback(async () => {
    setScanLoading(true);
    try {
      const obj = await buildOrdersObjectWithFlags({
        apiBase: API_BASE,
        limit: 100,
      });
      console.table(
        Object.entries(obj).map(([orderId, v]) => ({
          orderId,
          code: v.code,
          label: v.label,
          flags: JSON.stringify(v.flags),
          track_url: v.track_url,
        }))
      );
      const summary = await patchAllOrderFlags({
        apiBase: API_BASE,
        ordersObj: obj,
        delayMs: 150,
      });
      console.log("[PATCH SUMMARY]", summary);
      await load();
    } catch (e) {
      console.error("[LOG->PATCH] error:", e);
      setError(e.message || String(e));
    } finally {
      setScanLoading(false);
    }
  }, [load]);

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
            <th>id</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Email</th>
            <th>Products</th>
            <th>Adress</th>
            <th>Price</th>
            <th>Track URL</th>
            <th style={{ width: 240 }}>Actions</th>
            <th>Status</th> {/* NEW */}
            <th>Completed?</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <OrderRow
              key={r.id}
              row={r}
              isEditing={editingId === r.id}
              onEdit={() => setEditingId(r.id)} // enables editing for this row
              onCancelEdit={() => setEditingId(null)}
              onSaveTrackUrl={handleSaveTrackUrl}
              saving={savingId === r.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
