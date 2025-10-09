import TrackEditor from "./commonFiles/TrackEditor";
import AddressPopup from "./commonFiles/PopUp/AdressPopUp";
import StatusPopUp from "./commonFiles/PopUp/StatusPopUp";
import { centsToEUR, buildCttUrl } from "./commonFiles/PopUp/utils/utils";
import ProductsPopup from "./commonFiles/PopUp/ProductsPopup";
import Badge from "./commonFiles/Badge";
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

  // NEW — pass from parent:
  onUpdateStatus, // (orderId, flatPatch) => Promise<void>
  onToggleDelivered, // (orderId, nextVal:boolean) => Promise<void>
}) {
  const deliveredOk = !!row?.status?.delivered?.status;
  return (
    <tr key={row.id}>
      <td data-mono>{row.id}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        {row.date ? row.date.toLocaleString() : "—"}
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
        {!isEditing ? (
          <button className="btn" onClick={() => onEdit(row.id)}>
            Edit
          </button>
        ) : null}

         <button className="btn" onClick={{}} disabled={row.id != "RT"}>
            Send Email to Customer 
          </button>
      </td>

      {/* STATUS POPUP — now receives a save handler */}
      <td>
        <StatusPopUp
          status={row.status}
          onSave={(flatPatch) => onUpdateStatus?.(row.id, flatPatch)}
        />
      </td>
      {/* Status? — See the last true status */}
      <td>
        <StatusBadge status={row.status}></StatusBadge>
        {/* <button
          type="button"
          onClick={() => onToggleDelivered?.(row.id, !deliveredOk)}
          className={`badge ${deliveredOk ? "badge--ok" : "badge--no"}`}
          style={{ cursor: "pointer" }}
          title="Toggle Delivered"
        >
          {deliveredOk ? "Yes" : "No"}
        </button> */}
      </td>
      {/* COMPLETED? — clickable badge using your existing classes */}
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
