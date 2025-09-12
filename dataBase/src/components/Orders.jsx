// src/components/Orders.jsx
import React from "react";
import { ref, onValue } from "firebase/database";
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

  React.useEffect(() => {
    const off = onValue(ref(db, "orders"), (snap) => {
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
      list.sort((a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0));
      setRows(list);
      setLoading(false);
    });
    return () => off();
  }, []);

  if (loading) {
    return <div className="page">Loading orders…</div>;
  }

  if (!rows.length) {
    return <div className="page">No orders yet.</div>;
  }

  return (
    <div className="page">
      <h1>Orders</h1>
      <table className="card">
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Email</th>
            <th>Address</th>
            <th>Total</th>
            <th>Track URL</th>
            <th>Fulfilled</th>
            <th>Email Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const addr = [r.address?.line1, r.address?.postal_code, r.address?.city, r.address?.country]
              .filter(Boolean)
              .join(", ");
            return (
              <tr key={r.id}>
                <td>{r.date ? r.date.toLocaleString() : "—"}</td>
                <td>{r.name}</td>
                <td className="muted">{r.email}</td>
                <td>{addr || "—"}</td>
                <td>{centsToEUR(r.amount)}</td>
                <td className="wrap">
                  {r.track_url ? (
                    <a href={r.track_url} target="_blank" rel="noreferrer">
                      {r.track_url}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{r.fulfilled ? "Yes" : "No"}</td>
                <td>{r.email_sent ? "Yes" : "No"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
