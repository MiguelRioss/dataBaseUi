// components/VideoRow.jsx
import React from "react";
import { acceptVideoService } from "../services/videoServices";


export default function VideoRow({ video, onDelete, deleting }) {
  const [showPreview, setShowPreview] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Debug log to see what status you have
  React.useEffect(() => {
    console.log(`Video ${video.id} status:`, video.status);
  }, [video]);

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

    if (result.success) {
      alert("Video accepted and user notified ✅");
      // You can trigger a UI refresh or set state here
    } else {
      alert("Failed to accept video: " + result.message);
    }
  } catch (err) {
    console.error(err);
    alert("Network error while accepting video");
  }
};


  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete video "${
          video.originalName || video.filename
        }"? This action cannot be undone.`
      )
    ) {
      onDelete(video.id);
    }
  };


  const handleDecline = () => {
    alert("Decline feature - Under construction 🚧");
  };


  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Status badge classes matching OrderRow style
  const getStatusBadgeClass = (status) => {
    const actualStatus = status || "pending"; // Handle null/undefined
    switch (actualStatus) {
      case "approved":
        return "badge badge--ok";
      case "rejected":
        return "badge badge--no";
      default:
        return "badge";
    }
  };

  const getStatusLabel = (status) => {
    const actualStatus = status || "pending"; // Handle null/undefined
    switch (actualStatus) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      default:
        return "Pending";
    }
  };

  // Check if video is pending (including null/undefined)
  const isPending = !video.status || video.status === "pending";

  return (
    <tr key={video.id}>
      {/* Video ID */}
      <td data-mono>{video.id}</td>

      {/* Filename */}
      <td className="wrap" title={video.filename}>
        {video.filename}
      </td>

      {/* Original Name */}
      <td className="wrap" title={video.originalName}>
        {video.originalName}
      </td>

      {/* Upload Date */}
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "stretch",
            }}
          >
            <button
              onClick={handleCopyUrl}
              className="btn btn--ghost"
              title="Copy URL to clipboard"
            >
              {copied ? "Copied!" : "Copy URL"}
            </button>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              title="Open video in new tab"
            >
              Open ↗
            </a>
          </div>
        )}
      </td>

      {/* Status */}
      <td>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <span className={getStatusBadgeClass(video.status)}>
            {getStatusLabel(video.status)}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          {/* Accept Button - only show for pending videos (including null/undefined) */}
          {isPending && (
            <button
              onClick={handleAccept}
              className="btn badge--ok"
              title="Approve this video"
            >
              Accept
            </button>
          )}

          {/* Decline Button - only show for pending videos (including null/undefined) */}
          {isPending && (
            <button
              onClick={handleDecline}
              className="btn badge--no"
              title="Reject this video"
            >
              Decline
            </button>
          )}

          {/* Delete Button - show for all statuses */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`btn ${deleting ? "" : "btn--ghost"}`}
            title="Delete video and metadata"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}
