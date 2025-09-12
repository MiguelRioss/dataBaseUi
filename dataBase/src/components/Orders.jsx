// src/components/Orders.jsx
import React from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "../firebase";

function centsToEUR(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format((Number(cents) || 0) / 100);
}

export default function Orders() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // inline edit state
  const [editId, setEditId] = React.useState(null);
  const [draftUrl, setDraftUrl] = React.useState("");
  const [savingId, setSavingId] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const ordersRef = ref(db, "orders");
    const unsubscribe = onValue(ordersRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val).map(([id, v]) => ({
        id,
        date: v.written_at ? new Date(v.written_at) : null,
        name: v.name || v.metadata?.fullName || "—",
        email: v.email ?? "—",
        amount: v.amount_total ?? null,
        currency: v.currency ?? "eur",
        address: v.address || {},
        track_url: v.track_url ?? "",
        fulfilled: v.fulfilled ?? false,
        email_sent: v.email_sent ?? false,
      }));
      list.sort(
        (a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0)
      );
      setRows(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function startEdit(row) {
    setError("");
    setEditId(row.id);
    setDraftUrl(row.track_url || "");
  }

  function cancelEdit() {
    setEditId(null);
    setDraftUrl("");
    setError("");
  }

  async function saveTrackUrl() {
    if (!editId) return;
    setError("");
    setSavingId(editId);
    try {
      let normalized = draftUrl.trim();

      // If user typed something but forgot scheme, default to https://
      if (normalized && !/^https?:\/\//i.test(normalized)) {
        normalized = "https://" + normalized;
      }

      // Update RTDB (allow empty string to clear; change to null if you prefer removal)
      await update(ref(db, `orders/${editId}`), { track_url: normalized });

      setEditId(null);
      setDraftUrl("");
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
            color: "#fecaca",
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
          {rows.map((r) => {
            const addr = [
              r.address?.line1,
              r.address?.postal_code,
              r.address?.city,
              r.address?.country,
            ]
              .filter(Boolean)
              .join(", ");

            const isEditing = editId === r.id;
            const isSaving = savingId === r.id;

            return (
              <tr key={r.id}>
                <td data-mono>{r.id}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {r.date ? r.date.toLocaleString() : "—"}
                </td>
                <td>{r.name}</td>
                <td className="muted">{r.email}</td>
                <td>{addr || "—"}</td>
                <td>{centsToEUR(r.amount)}</td>

                <td className="wrap">
                  {isEditing ? (
                    <input
                      className="input"
                      value={draftUrl}
                      onChange={(e) => setDraftUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  ) : r.track_url ? (
                    <a href={r.track_url} target="_blank" rel="noreferrer">
                      {r.track_url}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn--primary"
                        onClick={saveTrackUrl}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                      <button className="btn" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="btn" onClick={() => startEdit(r)}>
                      Edit
                    </button>
                  )}
                </td>

                <td>
                  <span
                    className={`badge ${r.fulfilled ? "badge--ok" : "badge--no"}`}
                  >
                    {r.fulfilled ? "Fulfilled" : "Pending"}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${r.email_sent ? "badge--ok" : "badge--no"}`}
                  >
                    {r.email_sent ? "Sent" : "Not sent"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
