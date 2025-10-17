import TrackEditor from "./commonFiles/TrackEditor";
import AddressPopup from "./commonFiles/PopUp/AdressPopUp";
import StatusPopUp from "./commonFiles/Status/StatusPopUp";
import { centsToEUR, buildCttUrl } from "./commonFiles/PopUp/utils/utils";
import ProductsPopup from "./commonFiles/PopUp/ProductsPopup";
import StatusBadge from "./commonFiles/StatusBadge";

// NOTE: we won't import Badge here so we can make the cell clickable using the same classes.
// If you prefer to keep <Badge />, see the comment near the bottom.

export default function OrderRow({
  row,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveTrackUrl,
  saving,
  sendingEmail,

  // NEW - pass from parent:
  onUpdateStatus, // (orderId, flatPatch) => Promise<void>
  onToggleDelivered, // (orderId, nextVal:boolean) => Promise<void>
  onOpenOrderEdit,
  onSendEmail,
  onTogglePaymentStatus,
  togglingPaymentStatus,
  onSendInvoice,
  sendingInvoice,
}) {
  const deliveredOk = !!row?.status?.delivered?.status;
  const trackingCode = String(row?.track_url ?? "").trim();
  const normalizedTrackingCode = trackingCode.toUpperCase();
  const hasTrackingCode =
    normalizedTrackingCode.length > 0 && normalizedTrackingCode.includes("RT");
  // Detect email already sent from both possible locations (root or metadata)
  const emailAlreadySent = row.sentShippingEmail || row.email_sent;
  const emailButtonDisabled = sendingEmail || !hasTrackingCode;
  const emailButtonLabel = sendingEmail ? "Sending..." : "Send Shipping Email";

  const emailButtonTitle =
    !hasTrackingCode && !sendingEmail
      ? "Add an RT tracking code to enable shipping emails."
      : emailAlreadySent
        ? "Shipping email already sent; click to send again."
        : undefined;
  const canTogglePayment = typeof onTogglePaymentStatus === "function";
  const paymentStatus = !!row?.payment_status;
  const paymentButtonLabel = togglingPaymentStatus
    ? "Updating..."
    : paymentStatus
      ? "Paid"
      : "Unpaid";
  const paymentButtonTitle = togglingPaymentStatus
    ? "Updating payment status..."
    : "Toggle payment status";
  const paymentButtonClass = `badge ${paymentStatus ? "badge--ok" : "badge--no"}`;
  const sendingInvoiceActive = !!sendingInvoice;
  const invoiceButtonDisabled = sendingInvoiceActive;
  const invoiceButtonLabel = sendingInvoiceActive
    ? "Sending..."
    : "Send Invoice (Admin Email)";
  const invoiceButtonTitle = sendingInvoiceActive
    ? "Sending invoice email..."
    : "Send invoice details to the admin email.";

  return (
    <tr key={row.id}>
      <td data-mono>{row.id}</td>
      <td>
        {row.payment_id ? row.payment_id : <span className="muted">-</span>}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        {row.date ? row.date.toLocaleString() : "-"}
      </td>
      <td>{row.name}</td>
      <td className="muted">{row.email}</td>

      <td>
        <ProductsPopup
          shippingCost={row.shippingCost}
          items={row.items}
          currency={row.currency || "eur"}
          buttonText="View products"
          title="Order products"
        />
      </td>

      <td>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <AddressPopup
            shipping={row.shipping_address}
            billing={row.billing_address}
          />
        </div>
      </td>

      <td>{centsToEUR(row.amount)}</td>

      {/* Track URL (editable) */}
      <td className="wrap">
        {isEditing ? (
          <TrackEditor
            initial={row.track_url}
            onCancel={onCancelEdit}
            onSave={(val) => onSaveTrackUrl(row.id, val)}
            saving={saving}
          />
        ) : row.track_url ? (
          <a href={buildCttUrl(row.track_url)} target="_blank" rel="noreferrer">
            {row.track_url}
          </a>
        ) : (
          <span className="muted">—</span>
        )}
      </td>

      <td>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          {canTogglePayment ? (
            <button
              type="button"
              onClick={() =>
                !togglingPaymentStatus &&
                onTogglePaymentStatus?.(row.id, !paymentStatus)
              }
              className={paymentButtonClass}
              style={{
                cursor: togglingPaymentStatus ? "wait" : "pointer",
              }}
              disabled={togglingPaymentStatus}
              title={paymentButtonTitle}
            >
              {paymentButtonLabel}
            </button>
          ) : (
            <span className={paymentButtonClass}>{paymentButtonLabel}</span>
          )}
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => onSendInvoice?.(row)}
            disabled={invoiceButtonDisabled}
            title={invoiceButtonTitle}
          >
            {invoiceButtonLabel}
          </button>
        </div>
      </td>

      <td>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          {!isEditing ? (
            <button className="btn" onClick={() => onEdit?.(row.id)}>
              Edit Tracking
            </button>
          ) : null}
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => onOpenOrderEdit?.(row.id)}
          >
            Edit Order
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => onSendEmail?.(row)}
            disabled={emailButtonDisabled}
            title={emailButtonTitle}
          >
            {emailButtonLabel}
          </button>
        </div>
      </td>

      {/* STATUS POPUP - now receives a save handler */}
      <td>
        <StatusPopUp
          status={row.status}
          onSave={(flatPatch) => onUpdateStatus?.(row.id, flatPatch)}
        />
      </td>
      <td>
        <StatusBadge status={row.status}></StatusBadge>
      </td>
      <td>
        <button
          type="button"
          onClick={() => onToggleDelivered?.(row.id, !deliveredOk)}
          className={`badge ${deliveredOk ? "badge--ok" : "badge--no"}`}
          style={{ cursor: "pointer" }}
          title="Toggle Delivered"
        >
          {deliveredOk ? "Yes" : "No"}
        </button>
      </td>
    </tr>
  );
}
