/**
 * LinkedFollow Popup
 *
 * API Secret and Dashboard URL are hardcoded — same for all users.
 * Only the User ID is per-user (UUID from Supabase auth).
 *
 * Auto-detect: when popup opens, we scan open tabs for the dashboard
 * and grab the user ID automatically — zero manual input needed.
 */

const APP_URL    = "https://linkedin-followup-tracker.vercel.app";
const API_SECRET = "db1d1b2a1878a78f0dd7f26d0f400866914813d7af98ebff8d5439c0f890ae2e";
const UUID_RE    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

document.addEventListener("DOMContentLoaded", async () => {
  const loginView    = document.getElementById("login-view");
  const loggedView   = document.getElementById("logged-in-view");
  const loginBtn     = document.getElementById("login-btn");
  const logoutBtn    = document.getElementById("logout-btn");
  const captureBtn   = document.getElementById("capture-btn");
  const captureMsgEl = document.getElementById("capture-msg");
  const msgEl        = document.getElementById("msg");
  const uidDisplay   = document.getElementById("uid-display");
  const dashLink     = document.getElementById("dashboard-link");
  const userIdField  = document.getElementById("user-id");
  const pasteBtn     = document.getElementById("paste-uid");
  const autoDetectEl = document.getElementById("auto-detect-status");

  if (dashLink) dashLink.href = APP_URL + "/dashboard";

  // ── 1. Check if already connected ─────────────────────────────────────────
  const savedUserId = await getSavedUserId();
  if (savedUserId) {
    showLoggedIn(savedUserId);
    return; // done — no need to auto-detect
  }

  // ── 2. Auto-detect User ID from open dashboard tabs ───────────────────────
  showLoginView();
  tryAutoDetect();

  // ── Paste button — auto-connects if pasted text is a valid UUID ────────────
  pasteBtn.addEventListener("click", async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return;

      userIdField.value = text;
      pasteBtn.classList.add("ok");
      pasteBtn.textContent = "✓";
      setTimeout(() => {
        pasteBtn.classList.remove("ok");
        pasteBtn.textContent = "📋";
      }, 1500);

      if (UUID_RE.test(text)) {
        await connectUser(text);
      }
    } catch {
      userIdField.focus();
      userIdField.select();
    }
  });

  // ── Connect button ──────────────────────────────────────────────────────────
  loginBtn.addEventListener("click", async () => {
    const userId = userIdField.value.trim();
    if (!userId) {
      showMsg("Paste your User ID from Dashboard → Settings.", "error");
      return;
    }
    if (!UUID_RE.test(userId)) {
      showMsg("That doesn't look right — copy the User ID exactly from Settings.", "error");
      return;
    }
    await connectUser(userId);
  });

  // ── Save profile now ────────────────────────────────────────────────────────
  captureBtn.addEventListener("click", () => {
    captureBtn.disabled = true;
    captureBtn.textContent = "Saving…";
    showCaptureMsg("", "");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.url?.includes("linkedin.com/in/")) {
        showCaptureMsg("Open a LinkedIn profile page first.", "error");
        resetCapture();
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_NOW" }, (res) => {
        resetCapture();
        if (chrome.runtime.lastError) {
          showCaptureMsg("Error: " + chrome.runtime.lastError.message, "error");
          return;
        }
        if (res?.success) showCaptureMsg("✓ Contact saved!", "success");
        else showCaptureMsg("✗ " + (res?.error || "Failed"), "error");
      });
    });
  });

  // ── Sign out ────────────────────────────────────────────────────────────────
  logoutBtn.addEventListener("click", async () => {
    await clear(["lf_api_url", "lf_api_secret", "lf_user_id"]);
    chrome.runtime.sendMessage({ type: "CLEAR_AUTH" });
    userIdField.value = "";
    showLoginView();
    tryAutoDetect();
  });

  // ── Auto-detect: scan open tabs for dashboard, read user ID from DOM ────────
  async function tryAutoDetect() {
    if (autoDetectEl) {
      autoDetectEl.textContent = "Looking for your account…";
      autoDetectEl.style.display = "block";
    }

    try {
      // Find any open tab on our dashboard
      const tabs = await new Promise((resolve) => {
        chrome.tabs.query(
          { url: APP_URL + "/*" },
          (t) => resolve(t || [])
        );
      });

      for (const tab of tabs) {
        // Inject a tiny script to read the data-lf-user-id from the page
        let result;
        try {
          result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              // Try data attribute on the root div
              const el = document.querySelector("[data-lf-user-id]");
              if (el) return el.getAttribute("data-lf-user-id");
              // Try meta tag
              const meta = document.querySelector('meta[name="lf-user-id"]');
              if (meta) return meta.getAttribute("content");
              return null;
            },
          });
        } catch {
          continue; // tab may be loading or restricted
        }

        const userId = result?.[0]?.result;
        if (userId && UUID_RE.test(userId)) {
          // Found it! Auto-connect silently
          userIdField.value = userId;
          if (autoDetectEl) {
            autoDetectEl.textContent = "✓ Auto-detected from dashboard!";
            autoDetectEl.style.color = "#059669";
          }
          await connectUser(userId, /* silent= */ true);
          return;
        }
      }

      // Not found — show hint
      if (autoDetectEl) {
        autoDetectEl.textContent = "Open the dashboard in Chrome, or paste your User ID below.";
        autoDetectEl.style.color = "#6b7280";
      }
    } catch (e) {
      if (autoDetectEl) {
        autoDetectEl.textContent = "Paste your User ID from Dashboard → Settings.";
        autoDetectEl.style.color = "#6b7280";
      }
    }
  }

  // ── Core connect ────────────────────────────────────────────────────────────
  async function connectUser(userId, silent = false) {
    await store({ lf_api_url: APP_URL, lf_api_secret: API_SECRET, lf_user_id: userId });
    chrome.runtime.sendMessage({ type: "SET_AUTH", token: API_SECRET, userId });
    showLoggedIn(userId);
  }

  // ── View helpers ────────────────────────────────────────────────────────────
  function showLoggedIn(userId) {
    loginView.style.display  = "none";
    loggedView.style.display = "block";
    uidDisplay.textContent   = "Connected ✓";
    dashLink.href = APP_URL + "/dashboard";
  }

  function showLoginView() {
    loginView.style.display  = "block";
    loggedView.style.display = "none";
    clearMsg();
  }

  function showMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className   = "msg " + type;
  }

  function clearMsg() {
    msgEl.textContent = "";
    msgEl.className   = "msg";
  }

  function showCaptureMsg(text, type) {
    captureMsgEl.textContent = text;
    captureMsgEl.className   = type ? "msg " + type : "msg";
  }

  function resetCapture() {
    captureBtn.disabled    = false;
    captureBtn.textContent = "💾 Save This Profile Now";
  }
});

// ── Storage helpers ───────────────────────────────────────────────────────────
function getSavedUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["lf_user_id"], (r) => resolve(r.lf_user_id || null));
  });
}

function store(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

function clear(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}
