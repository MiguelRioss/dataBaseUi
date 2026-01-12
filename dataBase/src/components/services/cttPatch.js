// Raspberry Pi API (Tailscale or local)
export const API_BASE_PI = "https://raspberrypi.tailc8840b.ts.net" 
/**
 * Ask the Raspberry Pi API to process all orders.
 * PATCH /api/orders  → the Pi fetches from DB and patches via Puppeteer
 */
export async function patchAllOrderFlags(options = {}) {
  const { trackingPrefixes } = options;
  console.log(`[PATCH ALL] Calling ${API_BASE_PI}/api/orders`);
  const body =
    Array.isArray(trackingPrefixes) && trackingPrefixes.length > 0
      ? { trackingPrefixes }
      : {};

  const res = await fetch(`${API_BASE_PI}/api/orders`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server error ${res.status}: ${text}`);
  }

  const data = await res.json();
  console.log(`[PATCH ALL] Received ${data.length} results from Pi API`);
  return data;
}
