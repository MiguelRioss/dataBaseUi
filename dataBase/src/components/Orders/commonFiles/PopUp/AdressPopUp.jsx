import ObjectPopup from "./ObjectPopup";
import { buildAddress } from "./utils/utils";

function normalizeAddress(src = {}) {
  return {
    line1: src.line1 ,
    city: src.city,
    postal_code: src.postal_code ,
    country: src.country ,
    full_name: src.full_name ,
    phone: src.phone ,
  };
}

export default function AddressPopup({
  shipping = {},
  billing = {},
  buttonText = "View addresses",
}) {
  const s = normalizeAddress(shipping);
  const b = normalizeAddress(billing);

  const shippingData = {
    full_name: s.full_name,
    phone: s.phone,
    line1: s.line1,
    city: s.city,
    postal_code: s.postal_code,
    country: s.country,
    full: buildAddress(s),
  };

  const billingData = {
    line1: b.line1,
    city: b.city,
    postal_code: b.postal_code,
    country: b.country,
    full: buildAddress(b),
  };

  return (
    <ObjectPopup
      title="Customer Addresses"
      buttonText={buttonText}
      sections={[
        {
          title: "Shipping Address",
          data: shippingData,
          fields: [
            { key: "full_name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "line1", label: "Address" },
            { key: "city", label: "City" },
            { key: "postal_code", label: "Postal code" },
            { key: "country", label: "Country" },
            { key: "full", label: "Full (formatted)" },
          ],
        },
        {
          title: "Billing Address",
          data: billingData,
          fields: [
            { key: "line1", label: "Address" },
            { key: "city", label: "City" },
            { key: "postal_code", label: "Postal code" },
            { key: "country", label: "Country" },
            { key: "full", label: "Full (formatted)" },
          ],
        },
      ]}
    />
  );
}
