import React from "react";
import ModalPortal from "./ModalPortal";
import Badge from "../Badge";

export default function ObjectPopup({
  title,
  buttonText,
  data = {},
  fields,
  sections, // 👈 new optional prop
}) {
  const [open, setOpen] = React.useState(false);

  const buildFieldList = (data, fields) =>
    Array.isArray(fields) && fields.length
      ? fields
      : Object.keys(data || {}).map((key) => ({ key, label: prettify(key) }));

  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        {buttonText}
      </button>

      <ModalPortal title={title} open={open} onClose={() => setOpen(false)}>
        {/* If sections exist, render each block */}
        {Array.isArray(sections) && sections.length > 0 ? (
          sections.map((sec, i) => {
            const list = buildFieldList(sec.data, sec.fields);
            return (
              <div key={i} className="mb-6">
                <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-1">
                  {sec.title}
                </h3>
                <div className="object-grid">
                  {list.map(({ key, label, render }) => {
                    const val = sec.data?.[key];
                    return (
                      <div className="modal-row modal-row--top" key={key}>
                        <span className="muted" style={{ fontSize: 13 }}>
                          {label ?? prettify(key)}
                        </span>
                        <div className="kv-value">
                          {render ? render(val, sec.data) : defaultRender(val)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          // Fallback to single-section mode
          <div className="object-grid">
            {buildFieldList(data, fields).map(({ key, label, render }) => {
              const val = data?.[key];
              return (
                <div className="modal-row modal-row--top" key={key}>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {label ?? prettify(key)}
                  </span>
                  <div className="kv-value">
                    {render ? render(val, data) : defaultRender(val)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModalPortal>
    </>
  );
}

function defaultRender(v) {
  if (typeof v === "boolean")
    return <Badge ok={v} trueText="Yes" falseText="No" />;
  if (v == null || v === "") return <span className="muted">—</span>;
  if (Array.isArray(v)) return <span>{v.join(", ") || "—"}</span>;
  if (typeof v === "object") {
    try {
      return <code style={{ fontSize: 12 }}>{JSON.stringify(v, null, 2)}</code>;
    } catch {
      return <span className="muted">[object]</span>;
    }
  }
  return <span>{String(v)}</span>;
}

function prettify(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
