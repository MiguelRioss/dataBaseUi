// src/components/Orders/Orders.jsx
import React from "react";
import OrderRow from "./OrderRow";
import { mapDbToRows } from "./utils";

// Prefer env; fall back to your Vercel host
const API_BASE =
  (import.meta.env?.VITE_API_BASE_URL || "https://api-new-six.vercel.app")
    .replace(/\/$/, "");

async function fetchOrders(params = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  const res = await fetch(`${API_BASE}/api/orders${qs}`);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j?.error) msg += `: ${j.error}`; } catch {}
    throw new Error(msg);
  }
  return res.json(); // { items, count }
}

export default function Orders() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [bulkLoading, setBulkLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { items } = await fetchOrders({ limit: 100 });
      // mapDbToRows expects RTDB-like objects; items are array-ish already.
      // If your API already returns the desired shape, you can skip mapping.
      const list = mapDbToRows(
        Object.fromEntries(items.map(o => [o.id, o]))
      ).sort((a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0));
      setRows(list);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const refreshAll = async () => {
    // If you have a server endpoint to refresh tracking in bulk, call it here.
    // await fetch(`${API_BASE}/api/track-bulk?limit=3`, { method: "POST" });
    setBulkLoading(true);
    try { await load(); } finally { setBulkLoading(false); }
  };

  if (loading) return <div className="page">Loading orders…</div>;
  if (!rows.length) return <div className="page">No orders yet.</div>;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h1>Orders</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={refreshAll}
            disabled={bulkLoading}
            style={{ background: "#111", color: "#fff" }}
          >
            {bulkLoading ? "Refreshing…" : "Refresh"}
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
            <th>Address</th>
            <th>Total</th>
            <th>Track URL</th>
            <th style={{ width: 240 }}>Actions</th>
            <th>Accepted</th>
            <th>In transit</th>
            <th>Delivered</th>
            <th>Last status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <OrderRow
              key={r.id}
              row={r}
              // If your row component had per-row refresh props, wire them here.
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
