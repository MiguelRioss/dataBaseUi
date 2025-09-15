// src/components/OrderViewModal.jsx
export default function OrderViewModal({ open, onClose, order }) {
  if (!open || !order) return null;

  const addr = [
    order.address?.line1,
    order.address?.postal_code,
    order.address?.city,
    order.address?.country,
  ].filter(Boolean).join(", ");

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        display: "grid", placeItems: "center", zIndex: 50
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 680, maxWidth: "90vw", padding: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Order details</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "8px 16px" }}>
          <div className="muted">ID</div><div data-mono>{order.id}</div>
          <div className="muted">Date</div><div>{order.date ? order.date.toLocaleString() : "—"}</div>
          <div className="muted">Name</div><div>{order.name || order.metadata?.fullName || "—"}</div>
          <div className="muted">Email</div><div>{order.email || "—"}</div>
          <div className="muted">Address</div><div>{addr || "—"}</div>
          <div className="muted">Total</div><div>{order.amount != null ? (new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format((+order.amount||0)/100)) : "—"}</div>
          <div className="muted">Track URL</div>
          <div>
            {order.track_url ? <a href={order.track_url} target="_blank" rel="noreferrer">{order.track_url}</a> : "—"}
          </div>
          <div className="muted">Status</div><div>{order.status || "accepted"}</div>
          <div className="muted">Fulfilled</div><div>{order.fulfilled ? "Yes" : "No"}</div>
          <div className="muted">Email Sent</div><div>{order.email_sent ? "Yes" : "No"}</div>
        </div>
      </div>
    </div>
  );
}
