// src/components/AddressPopup.jsx
import ObjectPopup from "./commonFiles/ObjectPopup";
import { buildAddress } from "./commonFiles/utils";

function normalizeAddress(src = {}) {
  return {
    line1: src.line1 ?? src.addr_line1 ?? "",
    city: src.city ?? src.addr_city ?? "",
    postal_code: src.postal_code ?? src.addr_zip ?? "",
    country: src.country ?? src.addr_ctry ?? "",
    full_name: src.full_name ?? src.fullName ?? "",
    phone: src.phone ?? "",
  };
}

export default function AddressPopup({
  address = {},
  buttonText = "View address",
}) {
  const a = normalizeAddress(address);
  const data = {
    line1: a.line1,
    city: a.city,
    postal_code: a.postal_code,
    country: a.country,
    full: buildAddress(a),
    full_name: a.full_name,
    phone: a.phone,
  };

  return (
    <ObjectPopup
      title="Shipping address"
      buttonText={buttonText}
      data={data}
      fields={[
        { key: "full_name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "line1", label: "Address" },
        { key: "city", label: "City" },
        { key: "postal_code", label: "Postal code" },
        { key: "country", label: "Country" },
        { key: "full", label: "Full (formatted)" },
      ]}
    />
  );
}
