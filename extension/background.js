/**
 * LinkedFollow Background Service Worker
 *
 * APP_URL and API_SECRET are hardcoded — never need to be stored or entered by user.
 * Only lf_user_id is stored (per-user UUID from Supabase).
 */

const APP_URL    = "https://linkedin-followup-tracker.vercel.app";
const API_SECRET = "db1d1b2a1878a78f0dd7f26d0f400866914813d7af98ebff8d5439c0f890ae2e";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SAVE_CONTACT") {
    handleSaveContact(message.payload).then(sendResponse);
    return true; // keep channel open for async response
  }

  if (message.type === "SET_AUTH") {
    // Only store userId — URL and secret are hardcoded
    chrome.storage.local.set({ lf_user_id: message.userId });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "CLEAR_AUTH") {
    chrome.storage.local.remove(["lf_api_url", "lf_api_secret", "lf_user_id"]);
    sendResponse({ ok: true });
    return true;
  }
});

/**
 * Get stored user ID — URL and secret come from hardcoded constants above.
 */
function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["lf_user_id"], (result) => {
      resolve({
        apiUrl: APP_URL,
        apiSecret: API_SECRET,
        userId: result.lf_user_id || null,
      });
    });
  });
}

/**
 * Save a contact by calling the Next.js API.
 */
async function handleSaveContact(payload) {
  try {
    const auth = await getStoredAuth();

    if (!auth.userId) {
      console.warn("[LinkedFollow] No user ID stored — open the extension popup and connect.");
      return { success: false, error: "Not connected. Open the LinkedFollow extension and enter your User ID." };
    }

    const body = {
      ...payload,
      user_id: auth.userId,
    };

    console.log("[LinkedFollow] Saving contact →", auth.apiUrl, "| user:", auth.userId, "| status:", payload.status);

    const response = await fetch(`${auth.apiUrl}/api/contact/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Extension-Api-Secret": auth.apiSecret,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[LinkedFollow] API error:", data);
      return { success: false, error: data.error };
    }

    console.log("[LinkedFollow] Saved successfully:", data);
    return { success: true, data };
  } catch (err) {
    console.error("[LinkedFollow] Network error:", err);
    return { success: false, error: "Network error: " + err.message };
  }
}
