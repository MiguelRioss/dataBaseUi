import { resolveApiBase } from "./apiBase";

// services/videoServices.mjs
const url = resolveApiBase();
/**
 * Get all videos via API call
 */
export async function getAllVideosService() {
  try {
    const response = await fetch(`${url}/api/videosMetadata`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Let the API error response pass through
      const errorData = await response.json();
      throw errorData;
    }

    const videos = await response.json();
    return videos;
  } catch (error) {
    console.error('Video API error:', error);
    // Just re-throw the original error from API
    throw error;
  }
}
// services/videoServices.mjs
export async function declineVideoService(id, { reason, notes }) {
  const res = await fetch(`${url}/api/upload/decline/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, notes }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Decline failed (${res.status})`);
  }
  return res.json().catch(() => ({ success: true }));
}

/**
 * Accept a video by ID via API call
 * Marks it as accepted and triggers email + promo code logic on the server.
 */
export async function acceptVideoService(id) {
  try {
    const response = await fetch(`${url}/api/upload/accept/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw data; // Pass through API error details
    }

    return data; // { success, message, data }
  } catch (error) {
    console.error('Video accept API error:', error);
    throw error;
  }
}

