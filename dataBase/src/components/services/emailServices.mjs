import { API_BASE } from "./apiBase";

function buildErrorMessage(res, fallback = `HTTP ${res.status}`) {
  return res
    .json()
    .catch(() => ({}))
    .then((payload) => {
      if (!payload || typeof payload !== "object") return fallback;
      const parts = [fallback];
      if (payload.error) parts.push(String(payload.error));
      if (payload.detail) parts.push(String(payload.detail));
      if (payload.description && !parts.includes(payload.description)) {
        parts.push(String(payload.description));
      }
      return parts.join(": ");
    });
}

export async function sendShippingEmail(payload) {
  const res = await fetch(`${API_BASE}/api/email/shipping`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload ?? {}),
  });

  if (!res.ok) {
    const message = await buildErrorMessage(res);
    throw new Error(message);
  }

  return res.json().catch(() => ({}));
}
