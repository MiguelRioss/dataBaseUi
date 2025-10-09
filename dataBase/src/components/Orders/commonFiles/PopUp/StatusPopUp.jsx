import React from "react";
import ObjectPopup from "./ObjectPopup";
import ShipmentStatusView from "../ShipmentStatusView";
import ClickableBadge from "../ClicableBadge";

/**
 * StatusPopup
 *
 * Props:
 *  - status: {
 *      accepted?: any,
 *      in_transit?: any,
 *      delivered?: any,
 *      acceptedInCtt?: any,
 *      waiting_to_be_delivered?: any,
 *    }
 *  - onSave?: (patch: {
 *      accepted?: boolean,
 *      in_transit?: boolean,
 *      delivered?: boolean,
 *      acceptedInCtt?: boolean,
 *      waiting_to_be_delivered?: boolean,
 *    }) => (void|Promise<void>)
 *  - title?: string
 *  - buttonText?: string
 */
export default function StatusPopup({
  status = {},
  onSave,
  title = "Shipment status",
  buttonText = "View",
}) {
  // normalize to booleans
  const toBool = (v) => !!(typeof v === "object" ? v?.status ?? v : v);

  const initial = {
    accepted: toBool(status.accepted),
    in_transit: toBool(status.in_transit),
    delivered: toBool(status.delivered),
    acceptedInCtt: toBool(status.acceptedInCtt),
    waiting_to_be_delivered: toBool(
      status.waiting_to_be_delivered ?? status.wating_to_Be_Delivered
    ),
  };

  const [edit, setEdit] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // keep form in sync if parent status changes
  React.useEffect(() => {
    setEdit({
      accepted: toBool(status.accepted),
      in_transit: toBool(status.in_transit),
      delivered: toBool(status.delivered),
      acceptedInCtt: toBool(status.acceptedInCtt),
      waiting_to_be_delivered: toBool(
        status.waiting_to_be_delivered ?? status.wating_to_Be_Delivered
      ),
    });
  }, [
    status.accepted,
    status.in_transit,
    status.delivered,
    status.acceptedInCtt,
    status.waiting_to_be_delivered,
    status.wating_to_Be_Delivered,
  ]);

  const handleSave = async () => {
    if (!onSave) return; // no-op if not provided
    setError("");
    setSaving(true);
    try {
      // You can adjust what you pass here; this is a clean patch object
      const patch = { ...edit };
      await onSave(patch);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const dataForView = {
    accepted: status.accepted,
    in_transit: status.in_transit,
    delivered: status.delivered,
    acceptedInCtt: status.acceptedInCtt,
    waiting_to_be_delivered:
      status.waiting_to_be_delivered ?? status.wating_to_Be_Delivered,
  };

  return (
    <ObjectPopup
      title={title}
      buttonText={buttonText}
      fields={[
        {
          key: "status",
          label: "Current",
          render: () => <ShipmentStatusView status={dataForView} />,
        },
        {
          key: "edit",
          label: "Edit",
          render: () => (
            <div className="grid gap-3">
              {/* Chips row */}
              <div className="flex flex-wrap gap-3">
                <ClickableBadge
                  ok={edit.accepted}
                  onToggle={() =>
                    setEdit((prev) => ({ ...prev, accepted: !prev.accepted }))
                  }
                  trueText="Accepted"
                  falseText="Accepted"
                />
                <ClickableBadge
                  ok={edit.in_transit}
                  onToggle={() =>
                    setEdit((prev) => ({
                      ...prev,
                      in_transit: !prev.in_transit,
                    }))
                  }
                  trueText="In transit"
                  falseText="In transit"
                />
                <ClickableBadge
                  ok={edit.acceptedInCtt}
                  onToggle={() =>
                    setEdit((prev) => ({
                      ...prev,
                      acceptedInCtt: !prev.acceptedInCtt,
                    }))
                  }
                  trueText="Accepted in CTT"
                  falseText="Accepted in CTT"
                />
                <ClickableBadge
                  ok={edit.waiting_to_be_delivered}
                  onToggle={() =>
                    setEdit((prev) => ({
                      ...prev,
                      waiting_to_be_delivered: !prev.waiting_to_be_delivered,
                    }))
                  }
                  trueText="Waiting"
                  falseText="Waiting"
                />
                <ClickableBadge
                  ok={edit.delivered}
                  onToggle={() =>
                    setEdit((prev) => ({ ...prev, delivered: !prev.delivered }))
                  }
                  trueText="Delivered"
                  falseText="Delivered"
                />
              </div>

              {/* Error */}
              {error ? (
                <div className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-red-200">
                  {error}
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex justify-end">
                <button
                  className="btn inline-flex items-center rounded-md border border-emerald-400/60 bg-emerald-500 text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-60"
                  onClick={handleSave}
                  disabled={saving || !onSave}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}

