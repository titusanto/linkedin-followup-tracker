/**
 * LinkedFollow Background Service Worker
 *
 * No API secret. No User ID. No storage.
 * Auth is handled by the Supabase session cookie from the dashboard.
 * The browser sends it automatically via credentials:"include".
 */

const APP_URL = "https://linkedin-followup-tracker.vercel.app";
const MAX_LOG = 10; // keep last 10 activity events

// ── Activity log helpers ────────────────────────────────────────────────────

const STATUS_ICON = {
  Pending:   "⏳",
  Connected: "🤝",
  Messaged:  "💬",
  Replied:   "↩️",
  Follow:    "➕",
};

async function logActivity(entry) {
  try {
    const result = await chrome.storage.session.get("activityLog");
    const log = result.activityLog || [];
    log.unshift(entry); // newest first
    if (log.length > MAX_LOG) log.length = MAX_LOG;
    await chrome.storage.session.set({ activityLog: log });
  } catch (_) {}
}

// ── Message handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SAVE_CONTACT") {
    handleSaveContact(message.payload).then(sendResponse);
    return true; // keep channel open for async response
  }
  if (message.type === "GET_ACTIVITY_LOG") {
    chrome.storage.session.get("activityLog").then((result) => {
      sendResponse({ log: result.activityLog || [] });
    });
    return true;
  }
});

async function handleSaveContact(payload) {
  try {
    console.log("[LF] Saving →", payload.status, payload.name);

    const response = await fetch(`${APP_URL}/api/contact/save`, {
      method: "POST",
      credentials: "include", // sends the dashboard's Supabase session cookie
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.status === 401) {
      // Log failure too so user sees it in popup
      await logActivity({
        icon: "⚠️",
        label: "Not logged in",
        name: payload.name || "Unknown",
        status: payload.status,
        time: Date.now(),
        ok: false,
      });
      return { success: false, error: "not_logged_in" };
    }

    if (!response.ok) {
      console.error("[LF] API error:", data);
      await logActivity({
        icon: "✗",
        label: data.error || "Save failed",
        name: payload.name || "Unknown",
        status: payload.status,
        time: Date.now(),
        ok: false,
      });
      return { success: false, error: data.error || "Save failed" };
    }

    // ✅ Success — log it
    const icon = STATUS_ICON[payload.status] || "✓";
    await logActivity({
      icon,
      label: payload.status,
      name: payload.name || "Unknown",
      linkedin_url: payload.linkedin_url || null,
      status: payload.status,
      time: Date.now(),
      ok: true,
    });

    console.log("[LF] Saved ✓", data);
    return { success: true, data };
  } catch (err) {
    console.error("[LF] Network error:", err);
    await logActivity({
      icon: "✗",
      label: "Network error",
      name: payload.name || "Unknown",
      status: payload.status,
      time: Date.now(),
      ok: false,
    });
    return { success: false, error: "network_error" };
  }
}
