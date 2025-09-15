import React from "react";
import TrackEditor from "./TrackEditor";
import Badge from "./Badge";
import { centsToEUR, buildAddress } from "./utils";

/**
 * Single order row. Presentational only — status is read-only.
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
          <button className="btn" onClick={onEdit}>Edit</button>
        ) : null}
      </td>

      {/* Read-only status booleans */}
      <td><Badge ok={!!row.accepted}    trueText="Yes" falseText="No" /></td>
      <td><Badge ok={!!row.in_transit}  trueText="Yes" falseText="No" /></td>
      <td><Badge ok={!!row.delivered}   trueText="Yes" falseText="No" /></td>

      {/* Your older flags */}
      <td><Badge ok={!!row.fulfilled}   trueText="Yes" falseText="No" /></td>
      <td><Badge ok={!!row.email_sent}  trueText="Yes" falseText="No" /></td>
    </tr>
  );
}
