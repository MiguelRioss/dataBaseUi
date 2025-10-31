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
  sendingEmail,
  onUpdateStatus,
  onToggleDelivered,
  onOpenOrderEdit,
  onSendEmail,
  onTogglePaymentStatus,
  togglingPaymentStatus,
  onSendInvoice,
  paymentStatus,
  emailSentThankYouAdmin,
  sendingInvoice,
}) {
  const deliveredOk = !!row?.status?.delivered?.status;
  const trackingCode = String(row?.track_url ?? "").trim();
  const normalizedTrackingCode = trackingCode.toUpperCase();
  const hasTrackingCode =
    normalizedTrackingCode.length > 0 &&
    (normalizedTrackingCode.includes("RT") ||
      normalizedTrackingCode.includes("RU"));

  const emailAlreadySent = row.sentShippingEmail || row.email_sent;
  const emailButtonDisabled = sendingEmail || !hasTrackingCode;
  let emailButtonLabel = "Send Tracking Email";
  if (sendingEmail) emailButtonLabel = "Sending...";
  else if (emailAlreadySent) emailButtonLabel = "Re-send Tracking Email";

  const canTogglePayment = typeof onTogglePaymentStatus === "function";
  const isPaid = !!paymentStatus;
  const paymentButtonLabel = togglingPaymentStatus
    ? "Updating..."
    : isPaid
    ? "Paid"
    : "Unpaid";
  const paymentButtonClass = `badge order-row__payment ${
    isPaid ? "badge--ok" : "badge--no"
  }`;

  const invoiceAlreadySent = !!emailSentThankYouAdmin;
  const invoiceButtonDisabled = !isPaid || sendingInvoice || sendingEmail;
  const invoiceButtonLabel = sendingInvoice
    ? "Sending..."
    : invoiceAlreadySent
    ? "Re-send Thank You + Admin Email"
    : "Send Thank You + Admin Email";

  return (
    <>
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
        <AddressPopup
          shipping={row.shipping_address}
          billing={row.billing_address}
        />
      </td>
      <td>{centsToEUR(row.amount)}</td>

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
        <div className="flex flex-col gap-2 items-stretch">
          {canTogglePayment ? (
            <button
              type="button"
              onClick={() =>
                !togglingPaymentStatus &&
                onTogglePaymentStatus?.(row.id, !isPaid)
              }
              className={paymentButtonClass}
              disabled={togglingPaymentStatus}
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
          >
            {invoiceButtonLabel}
          </button>
        </div>
      </td>

      <td>
        <div className="flex flex-col gap-2 items-stretch">
          {!isEditing && (
            <button className="btn" onClick={() => onEdit?.(row.id)}>
              Edit Tracking
            </button>
          )}
          <button
            className="btn btn--ghost"
            onClick={() => onOpenOrderEdit?.(row.id)}
          >
            Edit Order
          </button>
          <button
            className="btn"
            onClick={() => onSendEmail?.(row)}
            disabled={emailButtonDisabled}
          >
            {emailButtonLabel}
          </button>
        </div>
      </td>

      <td>
        <StatusPopUp
          status={row.status}
          onSave={(patch) => onUpdateStatus?.(row.id, patch)}
        />
        <StatusBadge status={row.status} />
      </td>
      <td className="text-center">
        <button
          type="button"
          onClick={() => onToggleDelivered?.(row.id, !deliveredOk)}
          className={`badge ${deliveredOk ? "badge--ok" : "badge--no"}`}
          title="Toggle Delivered"
        >
          {deliveredOk ? "Yes" : "No"}
        </button>
      </td>
    </>
  );
}
