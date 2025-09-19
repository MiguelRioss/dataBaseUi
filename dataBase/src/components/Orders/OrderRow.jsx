import TrackEditor from "./TrackEditor";
import Badge from "./Badge";
import AddressPopup from "./AdressPopUp";
import StatusPopUp from "./StatusPopUp";
import { centsToEUR, buildAddress,buildCttUrl } from "./commonFiles/utils";

import ProductsPopup from "./ProductsPopup";

export default function OrderRow({
  row,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveTrackUrl,
  saving,
}) {
  console.log("Row in OrdersRow:" ,row)
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
          items={row.items}
          currency={row.currency || "eur"}
          buttonText="View products"
          title="Order products"
        />
      </td>
      <td>
        {/* Show compact address plus a popup button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <AddressPopup address={row.metadata} />
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
      {/* Actions (only for Track URL edit) */}
      <td>
        {!isEditing ? (
          <button className="btn" onClick={() => onEdit(row.id)}>
            Edit
          </button>
        ) : null}
      </td>
      {/* NEW: single status button */}
      <td>
        <StatusPopUp
          status={{
            accepted: row.accepted,
            in_transit: row.in_transit,
            delivered: row.delivered,
            // optionally include these if you have them:
            // accepted_at: row.accepted_at,
            // in_transit_at: row.in_transit_at,
            // delivered_at: row.delivered_at,
            // track_url: row.track_url,
          }}
        />
      </td>
      {/* Keep your older flag if needed */}
      <td>
        <Badge ok={!!row.delivered == true} trueText="Yes" falseText="No" />
      </td>
    </tr>
  );
}
