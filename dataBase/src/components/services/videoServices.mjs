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

/**
 * Get single video by ID via API call
 */
export async function getVideoByIdService(id) {
  try {
    const response = await fetch(`${url}/videos/${id}`, {
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

    const video = await response.json();
    return video;
  } catch (error) {
    console.error('Video API error:', error);
    // Just re-throw the original error from API
    throw error;
  }
}

/**
 * Delete video by ID via API call
 */
export async function deleteVideoByIdService(id) {
  try {
    const response = await fetch(`${url}/videos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Let the API error response pass through
      const errorData = await response.json();
      throw errorData;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Video API error:', error);
    // Just re-throw the original error from API
    throw error;
  }
}
/**
 * Update video status via API call
 */
export async function updateVideoStatusService(id, status) {
  try {
    const response = await fetch(`${url}/videos/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      // Let the API error response pass through
      const errorData = await response.json();
      throw errorData;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Video status update API error:', error);
    // Just re-throw the original error from API
    throw error;
  }
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

