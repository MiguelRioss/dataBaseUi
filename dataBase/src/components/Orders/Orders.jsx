import React from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "../../firebase";
import OrderRow from "./OrderRow";
import { mapDbToRows } from "./utils";

/**
 * Main Orders component: subscribes to /orders, manages edit/save state
 */
export default function Orders() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // inline edit state
  const [editId, setEditId] = React.useState(null);
  const [savingId, setSavingId] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const ordersRef = ref(db, "orders");
    const unsubscribe = onValue(ordersRef, (snap) => {
      const val = snap.val() || {};
      const list = mapDbToRows(val);
      list.sort((a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0));
      setRows(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* Edit actions */
  function startEdit(rowId) {
    setError("");
    setEditId(rowId);
  }

  function cancelEdit() {
    setEditId(null);
    setError("");
  }

  async function saveTrackUrl(id, normalizedUrl) {
    setError("");
    setSavingId(id);
    try {
      await update(ref(db, `orders/${id}`), { track_url: normalizedUrl });
      setEditId(null);
    } catch (e) {
      setError(e?.message || "Failed to save track URL.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <div className="page">Loading orders…</div>;
  if (!rows.length) return <div className="page">No orders yet.</div>;

  return (
    <div className="page">
      <h1>Orders</h1>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, .08)",
            border: "1px solid rgba(239, 68, 68, .35)",
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
            <th style={{ width: 190 }}>Actions</th>
            <th>Fulfilled</th>
            <th>Email Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <OrderRow
              key={r.id}
              row={r}
              isEditing={editId === r.id}
              onEdit={() => startEdit(r.id)}
              onCancelEdit={cancelEdit}
              onSaveTrackUrl={saveTrackUrl}
              saving={savingId === r.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
