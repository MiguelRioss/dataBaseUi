import TrackEditor from "./commonFiles/TrackEditor";
import AddressPopup from "./commonFiles/PopUp/AdressPopUp";
import StatusPopUp from "./commonFiles/Status/StatusPopUp";
import { centsToEUR, buildCttUrl } from "./commonFiles/PopUp/utils/utils";
import ProductsPopup from "./commonFiles/PopUp/ProductsPopup";
import StatusBadge from "./commonFiles/StatusBadge";

export default function OrderRow({
  row,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveTrackUrl,
  saving,
  sendingEmail, // ✅ now boolean from parent (sendingEmailId === row.id)
  onUpdateStatus,
  onToggleDelivered,
  onOpenOrderEdit,
  onSendEmail,
  onTogglePaymentStatus,
  togglingPaymentStatus,
  onSendInvoice,
  paymentStatus, // ✅ DB: payment_status
  emailSentThankYouAdmin, // ✅ DB: email_Sent_ThankYou_Admin
  sendingInvoice,
}) {
  const deliveredOk = !!row?.status?.delivered?.status;
  const trackingCode = String(row?.track_url ?? "").trim();
  const normalizedTrackingCode = trackingCode.toUpperCase();
  const hasTrackingCode =
    normalizedTrackingCode.length > 0 && normalizedTrackingCode.includes("RT");

  // --- Tracking Email ---
  const emailAlreadySent = row.sentShippingEmail || row.email_sent;
  const emailButtonDisabled = sendingEmail || !hasTrackingCode;
  let emailButtonLabel = "Send Tracking Email";
  if (sendingEmail) emailButtonLabel = "Sending...";
  else if (emailAlreadySent) emailButtonLabel = "Re-send Tracking Email";

  // --- Payment Status ---
  const canTogglePayment = typeof onTogglePaymentStatus === "function";
  const isPaid = !!paymentStatus;
  const paymentButtonLabel = togglingPaymentStatus
    ? "Updating..."
    : isPaid
    ? "Paid"
    : "Unpaid";
  const paymentButtonTitle = togglingPaymentStatus
    ? "Updating payment status..."
    : "Toggle payment status";
  const paymentButtonClass = `badge ${isPaid ? "badge--ok" : "badge--no"}`;

  // --- Invoice / Admin Email Button ---
  console.log("Email sent ? ", emailSentThankYouAdmin);
  const invoiceAlreadySent = !!emailSentThankYouAdmin;
  const invoiceButtonDisabled = !isPaid || sendingInvoice || sendingEmail;

  let invoiceButtonLabel;
  if (sendingInvoice) invoiceButtonLabel = "Sending...";
  else if (invoiceAlreadySent)
    invoiceButtonLabel = "Re-send Shipping + Admin Email";
  else invoiceButtonLabel = "Send Shipping + Admin Email";

  const invoiceButtonTitle = !isPaid
    ? "Payment must be marked as paid before sending shipping/admin emails."
    : invoiceAlreadySent
    ? "This email was already sent. Click to re-send."
    : "Send shipping confirmation to customer and admin.";

  return (
    <tr key={row.id}>
      <td data-mono>{row.id}</td>
      <td>{row.payment_id || <span className="muted">-</span>}</td>
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

      {/* Payment + Email buttons */}
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
                onTogglePaymentStatus?.(row.id, !isPaid)
              }
              className={paymentButtonClass}
              style={{ cursor: togglingPaymentStatus ? "wait" : "pointer" }}
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

      {/* Action Buttons */}
      <td>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          {!isEditing && (
            <button className="btn" onClick={() => onEdit?.(row.id)}>
              Edit Tracking
            </button>
          )}
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
          >
            {emailButtonLabel}
          </button>
        </div>
      </td>

      {/* STATUS POPUP */}
      <td>
        <StatusPopUp
          status={row.status}
          onSave={(flatPatch) => onUpdateStatus?.(row.id, flatPatch)}
        />
      </td>
      <td>
        <StatusBadge status={row.status} />
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
