import React from "react";
import ObjectPopup from "./commonFiles/ObjectPopup"; // uses your ModalPortal + Badge defaults
import ShipmentStatusView from "./commonFiles/ShipmentStatusView";

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
export default function StatusPopup({ status = {} }) {
  const data = {
    accepted: status.accepted,
    in_transit: status.in_transit,
    delivered: status.delivered,
    acceptedInCtt: status.acceptedInCtt,
    wating_to_Be_Delivered: status.wating_to_Be_Delivered,
  };
  return (
    <ObjectPopup
      title="Shipment status"
      buttonText="View"
      fields={[
        {
          key: "status",
          label: "Data",
          render: () => <ShipmentStatusView status={data} />,
        },
      ]}
    />
  );
}
