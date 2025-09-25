import TrackEditor from "./TrackEditor";
import Badge from "./Badge";
import AddressPopup from "./AdressPopUp";
import StatusPopUp from "./StatusPopUp";
<<<<<<< HEAD
import { centsToEUR, buildAddress } from "./commonFiles/utils";
=======
import { centsToEUR,buildCttUrl } from "./commonFiles/utils";
>>>>>>> parent of 0766d01 (Revert "//somethings i dont need deleted")

import ProductsPopup from "./ProductsPopup";

export default function OrderRow({
  row,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveTrackUrl,
  saving,
}) {
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
          <a href={row.track_url} target="_blank" rel="noreferrer">
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
    
      <td>
        <StatusPopUp
          status={row.status}
        />
      </td>
      {/* Keep your older flag if needed */}
      <td>
        <Badge ok={!!row.fulfilled} trueText="Yes" falseText="No" />
      </td>
    </tr>
  );
}
