// Raspberry Pi API (Tailscale or local)
export const API_BASE_PI = "https://100.91.230.15:3000"
/**
 * Ask the Raspberry Pi API to process all orders.
 * PATCH /api/orders  → the Pi fetches from DB and patches via Puppeteer
 */
export async function patchAllOrderFlags() {
  console.log(`[PATCH ALL] Calling ${API_BASE_PI}/api/orders`);

  const res = await fetch(`${API_BASE_PI}/api/orders`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server error ${res.status}: ${text}`);
  }

  const data = await res.json();
  console.log(`[PATCH ALL] Received ${data.length} results from Pi API`);
  return data;
}