// components/VideoRow.jsx
import React from "react";
import { acceptVideoService,declineVideoService } from "../services/videoServices.mjs";
const DECLINE_REASONS = [
  "Poor audio/video quality",
  "Contains identifying or sensitive info",
  "Not relevant to prompt/guidelines",
  "Missing consent / rights to publish",
  "Length/format not suitable",
];

function DeclineModal({ open, onClose, onSubmit, busy }) {
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) { setReason(""); setNotes(""); }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <h3 className="modal-title">Decline video</h3>
          <button className="btn btn--ghost" onClick={onClose} disabled={busy}>Close</button>
        </div>

        <div className="modal-body">
          <div className="modal-row modal-row--top" style={{ marginBottom: 12 }}>
            <div className="kv-label"><strong>Reason</strong></div>
            <div className="kv-value">
              <div className="prod-card__meta">
                {DECLINE_REASONS.map((r) => (
                  <label key={r} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="radio"
                      name="decline-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-row modal-row--top">
            <div className="kv-label"><strong>Notes</strong></div>
            <div className="kv-value">
              <textarea
                rows={4}
                className="input"
                placeholder="Optional context to include in the notification…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-head" style={{ borderTop: "1px solid var(--line)" }}>
          <button className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn btn--primary"
            onClick={() => onSubmit({ reason, notes })}
            disabled={!reason || busy}
          >
            {busy ? "Declining…" : "Confirm decline"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoRow({ video }) {
  const [showPreview, setShowPreview] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // local status override so UI updates immediately after accept/decline
  const [localStatus, setLocalStatus] = React.useState(video.status || "pending");
  const status = localStatus || "pending";
  const isPending = !status || status === "pending";

  const [declineOpen, setDeclineOpen] = React.useState(false);
  const [declineBusy, setDeclineBusy] = React.useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(video.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const handleAccept = async () => {
    if (!window.confirm("Approve this video for upload to YouTube?")) return;
    try {
      const result = await acceptVideoService(video.id);
      if (result.success !== false) {
        setLocalStatus("approved");
        alert("Video accepted and user notified ✅");
      } else {
        alert("Failed to accept video: " + (result.message || ""));
      }
    } catch (err) {
      console.error(err);
      alert("Network error while accepting video");
    }
  };

  const submitDecline = async ({ reason, notes }) => {
    try {
      setDeclineBusy(true);
      await declineVideoService(video.id, { reason, notes });
      setLocalStatus("rejected");
      setDeclineOpen(false);
      alert("Video declined and user notified.");
    } catch (err) {
      console.error("Error on Submiting", err);
      alert(err.message || "Network error while declining video");
    } finally {
      setDeclineBusy(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getStatusBadgeClass = (s) => {
    const actual = s || "pending";
    switch (actual) {
      case "approved": return "badge badge--ok";
      case "rejected": return "badge badge--no";
      default: return "badge";
    }
  };
  const getStatusLabel = (s) => {
    const actual = s || "pending";
    switch (actual) {
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      default: return "Pending";
    }
  };

  return (
    <>
      <tr key={video.id}>
        <td data-mono>{video.id}</td>
        <td className="wrap" title={video.filename}>{video.filename}</td>
        <td className="wrap" title={video.originalName}>{video.originalName}</td>
        <td style={{ whiteSpace: "nowrap" }}>{formatDate(video.uploadedAt)}</td>

        {/* Preview */}
        <td>
          <button onClick={() => setShowPreview(!showPreview)} className="btn">
            {showPreview ? "Hide" : "Preview"}
          </button>
          {showPreview && video.url && (
            <div className="mt-2">
              <video
                src={video.url}
                controls
                className="w-32 h-20 object-cover rounded border"
                preload="metadata"
              />
            </div>
          )}
        </td>

        {/* URL */}
        <td>
          {video.url && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
              <button onClick={handleCopyUrl} className="btn btn--ghost" title="Copy URL to clipboard">
                {copied ? "Copied!" : "Copy URL"}
              </button>
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="btn" title="Open video in new tab">
                Open ↗
              </a>
            </div>
          )}
        </td>

        {/* Status */}
        <td>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
            <span className={getStatusBadgeClass(status)}>{getStatusLabel(status)}</span>
          </div>
        </td>

        {/* Actions */}
        <td>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
            {isPending && (
              <button onClick={handleAccept} className="btn badge--ok" title="Approve this video">
                Accept
              </button>
            )}
            {isPending && (
              <button onClick={() => setDeclineOpen(true)} className="btn badge--no" title="Reject this video">
                Decline
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Decline popup */}
      <DeclineModal
        open={declineOpen}
        onClose={() => !declineBusy && setDeclineOpen(false)}
        onSubmit={submitDecline}
        busy={declineBusy}
      />
    </>
  );
}
