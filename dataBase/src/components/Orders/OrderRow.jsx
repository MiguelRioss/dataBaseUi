import React from "react";
import TrackEditor from "./TrackEditor";
import Badge from "./Badge";
import { centsToEUR, buildAddress } from "./utils";

/**
 * Single order row. Presentational only - receives callbacks from parent.
 */
export default function OrderRow({
  row,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveTrackUrl,
  saving,
}) {
  const addr = buildAddress(row.address);

  return (
    <tr key={row.id}>
      <td data-mono>{row.id}</td>

      <td style={{ whiteSpace: "nowrap" }}>
        {row.date ? row.date.toLocaleString() : "—"}
      </td>

      <td>{row.name}</td>
      <td className="muted">{row.email}</td>
      <td>{addr || "—"}</td>

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
          <a href={row.track_url} target="_blank" rel="noreferrer">
            {row.track_url}
          </a>
        ) : (
          <span className="muted">—</span>
        )}
      </td>

      <td>
        {!isEditing ? (
          <button className="btn" onClick={onEdit}>
            Edit
          </button>
        ) : null}
      </td>

      <td>
        <Badge ok={row.fulfilled} trueText="Fulfilled" falseText="Pending" />
      </td>

      <td>
        <Badge ok={row.email_sent} trueText="Sent" falseText="Not sent" />
      </td>
    </tr>
  );
}
