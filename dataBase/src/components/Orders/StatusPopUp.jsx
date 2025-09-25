import React from "react";
import ObjectPopup from "./commonFiles/ObjectPopup"; // uses your ModalPortal + Badge defaults

/**
 * StatusPopup
 * A small wrapper around ObjectPopup that displays shipping flags.
 * Accepts either booleans or truthy/falsy values and normalizes them.
 *
 * Props:
 *  - status: {
 *      accepted?: any,
 *      in_transit?: any,
 *      delivered?: any,
 *      // optional extras if you want to show them:
 *      accepted_at?: string|number|Date,
 *      in_transit_at?: string|number|Date,
 *      delivered_at?: string|number|Date,
 *      track_url?: string
 *    }
 *  - buttonText?: string
 *  - title?: string
 */
export default function StatusPopup({
  status = {},
  buttonText = "View status",
  title = "Shipment status",
}) {
  const data = {
    accepted: !!status.accepted,
    in_transit: !!status.in_transit,
    delivered: !!status.delivered,

    // Optional extras: include only if present
    ...(status.accepted_at   ? { accepted_at:   toDateLabel(status.accepted_at) } : {}),
    ...(status.in_transit_at ? { in_transit_at: toDateLabel(status.in_transit_at) } : {}),
    ...(status.delivered_at  ? { delivered_at:  toDateLabel(status.delivered_at) } : {}),
    ...(status.track_url     ? { track_url:     status.track_url } : {}),
  };

  // Default field order; only show extras if they exist in `data`
  const fields = [
    { key: "accepted",   label: "Accepted" },
    { key: "in_transit", label: "In transit" },
    { key: "delivered",  label: "Delivered" },

    // Optional timeline rows
    ...(data.accepted_at   ? [{ key: "accepted_at",   label: "Accepted at" }] : []),
    ...(data.in_transit_at ? [{ key: "in_transit_at", label: "In transit at" }] : []),
    ...(data.delivered_at  ? [{ key: "delivered_at",  label: "Delivered at" }] : []),

    // Optional tracking link with custom renderer
    ...(data.track_url
      ? [{
          key: "track_url",
          label: "Tracking",
          render: (val) =>
            val ? <a href={val} target="_blank" rel="noreferrer">{val}</a> : <span className="muted">—</span>,
        }]
      : []),
  ];

  return (
    <ObjectPopup
      title={title}
      buttonText={buttonText}
      data={data}
      fields={fields}
    />
  );
}

function toDateLabel(d) {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString();
  } catch {
    return String(d);
  }
}
