// src/components/Orders/Orders.jsx
import React from "react";
import OrderRow from "./OrderRow";
import { checkAllCttFlags } from "./services/cttBulk.js";

// replace your Refresh all (3) button OR add a new one
import { mapDbToRows } from "./utils";

const API_BASE = (
  import.meta.env?.VITE_API_BASE_URL || "https://api-new-six.vercel.app"
).replace(/\/$/, "");

// tiny fetch helper with JSON + errors
async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += `: ${j.error}`;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function fetchOrders(params = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  const url = `${API_BASE}/api/orders${qs}`;
  console.log("[fetchOrders] →", url);

  const res = await fetch(url);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += `: ${j.error}`;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  console.log("[fetchOrders] data:", data);
  return data; // { items, count }
}

export default function Orders() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [refreshingId, setRefreshingId] = React.useState(null); // ready for per-row

  const load = React.useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { items, count } = await fetchOrders({ limit: 100 });
      console.log("[Orders] items length:", items?.length, "count:", count);
      console.log("[Orders] raw items:", items);

      const list = mapDbToRows(
        Object.fromEntries((items || []).map((o) => [o.id, o]))
      ).sort((a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0));

      console.log("[Orders] mapped rows:", list);
      setRows(list);
    } catch (e) {
      console.error("[Orders] load error:", e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // ---- bulk refresh using your server route (/api/track-bulk) ----
  const refreshAll = async (limit = 3) => {
    setBulkLoading(true);
    setError("");
    try {
      const result = await api(`/api/track-bulk?limit=${limit}`, {
        method: "POST",
      });
      console.log("[track-bulk] result:", result);
      await load(); // RTDB will update anyway, but reload to be explicit
    } catch (e) {
      console.error("[track-bulk] error:", e);
      setError(e.message || String(e));
    } finally {
      setBulkLoading(false);
    }
  };

  // ---- optional: single-row refresh using (/api/update-tracking) ----
  const refreshOne = async (id) => {
    setRefreshingId(id);
    setError("");
    try {
      const result = await api(
        `/api/update-tracking?id=${encodeURIComponent(id)}`,
        {
          method: "POST",
        }
      );
      console.log("[update-tracking] result:", result);
      await load();
    } catch (e) {
      console.error("[update-tracking] error:", e);
      setError(e.message || String(e));
    } finally {
      setRefreshingId(null);
    }
  };

  if (loading) return <div className="page">Loading orders…</div>;
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
            onClick={() => checkAllCttFlags({ apiBase: API_BASE, limit: 100 })}
            style={{ background: "#0a4", color: "#fff" }}
          >
            Check CTT flags (log)
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
              // When you want per-row refresh, pass these to your row:
              // onRefresh={() => refreshOne(r.id)}
              // refreshing={refreshingId === r.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
