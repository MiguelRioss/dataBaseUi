// src/components/Orders/Orders.jsx
import React from "react";
import OrderRow from "./OrderRow";
import { mapDbToRows } from "./utils";
import { buildOrdersObjectWithFlags } from "./services/cttBulk";
import { patchAllOrderFlags } from "./services/cttPatch";

const API_BASE = (
  import.meta.env?.VITE_API_BASE_URL || "https://api-new-six.vercel.app"
).replace(/\/$/, "");

// fetch orders for the table
async function fetchOrders(params = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.limit) q.set("limit", String(params.limit));
  const url = `${API_BASE}/api/orders${q.toString() ? `?${q}` : ""}`;

  const res = await fetch(url);
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
  const [scanLoading, setScanLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { items } = await fetchOrders({ limit: 100 });
      const list = mapDbToRows(Object.fromEntries((items || []).map(o => [o.id, o])))
        .sort((a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0));
      setRows(list);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Build object -> LOG it -> PATCH flags -> LOG summary
  const logThenPatchOrders = React.useCallback(async () => {
    setScanLoading(true);
    try {
      // 1) build the object with flags per order (from your CTT API)
      const obj = await buildOrdersObjectWithFlags({
        apiBase: API_BASE,
        limit: 100,
        // statusPath: "/api/ctt/status", // uncomment if your route is /api/ctt/status
      });

      // 2) LOG objects BEFORE patching
      console.log("[PRE-PATCH] ORDERS OBJECT", obj);
      console.table(
        Object.entries(obj).map(([orderId, v]) => ({
          orderId,
          code: v.code,
          label: v.label,
          flags: JSON.stringify(v.flags), // { accepted:true, delivered:true, ... }
          track_url: v.track_url,
        }))
      );

      // 3) PATCH orders with the truthy allowed flags
      const summary = await patchAllOrderFlags({
        apiBase: API_BASE,
        ordersObj: obj,
        delayMs: 150,   // be gentle with the API
        // dryRun: true, // toggle to preview without writing
      });

      // 4) LOG patch summary and refresh table
      console.log("[PATCH SUMMARY]", summary);
      await load();
    } catch (e) {
      console.error("[LOG→PATCH] error:", e);
      setError(e.message || String(e));
    } finally {
      setScanLoading(false);
    }
  }, [load]);

  if (loading) return <div className="page">Loading orders…</div>;
  if (!rows.length) return <div className="page">No orders yet.</div>;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h1>Orders</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={logThenPatchOrders}
            disabled={scanLoading}
            style={{ background: "#0a4", color: "#fff" }}
          >
            {scanLoading ? "Updating…" : "Log objects → Patch flags"}
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
            <OrderRow key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
