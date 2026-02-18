/**
 * LinkedFollow Popup v2.1
 * Shows login status + live activity feed of recent tracking events.
 */

const APP_URL = "https://linkedin-followup-tracker.vercel.app";

const dot        = document.getElementById("status-dot");
const titleEl    = document.getElementById("status-title");
const subEl      = document.getElementById("status-sub");
const captureBtn = document.getElementById("capture-btn");
const captureMsg = document.getElementById("capture-msg");
const feedEl     = document.getElementById("feed");
const feedEmpty  = document.getElementById("feed-empty");
const clearBtn   = document.getElementById("clear-btn");

// ── Helpers ────────────────────────────────────────────────────────────────

function setStatus(color, titleText, subText) {
  dot.className = "dot " + color;
  titleEl.textContent = titleText;
  subEl.textContent = subText;
}

function showMsg(text, type) {
  captureMsg.textContent = text;
  captureMsg.className = type ? "capture-msg " + type : "capture-msg";
}

function resetBtn() {
  captureBtn.disabled = false;
  captureBtn.textContent = "💾 Save This Profile Now";
}

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 5)  return "just now";
  if (secs < 60) return secs + "s ago";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  return hrs + "h ago";
}

// ── Render activity feed ────────────────────────────────────────────────────

function renderFeed(log) {
  // Remove all existing items (keep the empty placeholder)
  feedEl.querySelectorAll(".feed-item").forEach(el => el.remove());

  if (!log || log.length === 0) {
    feedEmpty.style.display = "block";
    return;
  }

  feedEmpty.style.display = "none";

  log.forEach(entry => {
    const item = document.createElement("div");
    item.className = "feed-item " + (entry.ok ? "ok" : "fail");

    const statusText = entry.ok
      ? getLabelText(entry.label, entry.status)
      : entry.label;

    item.innerHTML = `
      <div class="feed-icon">${entry.icon || "•"}</div>
      <div class="feed-body">
        <div class="feed-name" title="${entry.name || ""}">${entry.name || "Unknown"}</div>
        <div class="feed-status ${entry.ok ? "ok-text" : "fail-text"}">${statusText}</div>
      </div>
      <div class="feed-time">${timeAgo(entry.time)}</div>
    `;

    feedEl.appendChild(item);
  });
}

function getLabelText(label, status) {
  const map = {
    Pending:   "Connection request sent",
    Connected: "Connection accepted ✓",
    Messaged:  "Message sent",
    Replied:   "Reply received",
    Follow:    "Followed",
  };
  return map[status] || label || status;
}

// ── Load & auto-refresh feed ────────────────────────────────────────────────

function loadFeed() {
  chrome.runtime.sendMessage({ type: "GET_ACTIVITY_LOG" }, (res) => {
    if (chrome.runtime.lastError) return;
    renderFeed(res?.log || []);
  });
}

// Refresh time labels every 15 seconds while popup is open
setInterval(loadFeed, 15000);

// ── Clear button ────────────────────────────────────────────────────────────

clearBtn.addEventListener("click", () => {
  chrome.storage.session.set({ activityLog: [] }, () => {
    renderFeed([]);
  });
});

// ── Check login status ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Load feed immediately
  loadFeed();

  try {
    const res = await fetch(`${APP_URL}/api/contacts?limit=1`, {
      credentials: "include",
    });

    if (res.ok) {
      setStatus("green", "Ready", "Auto-tracking LinkedIn activity");
      captureBtn.disabled = false;
    } else if (res.status === 401) {
      setStatus("red", "Not logged in", "Open the dashboard and sign in first");
      captureBtn.disabled = true;
    } else {
      setStatus("grey", "Cannot connect", "Check your internet connection");
    }
  } catch {
    setStatus("grey", "Offline", "Cannot reach the dashboard");
  }
});

// ── Save current profile manually ───────────────────────────────────────────

captureBtn.addEventListener("click", () => {
  captureBtn.disabled = true;
  captureBtn.textContent = "Saving…";
  showMsg("", "");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url?.includes("linkedin.com/in/")) {
      showMsg("Open a LinkedIn profile page first.", "error");
      resetBtn();
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_NOW" }, (res) => {
      resetBtn();
      if (chrome.runtime.lastError) {
        showMsg("Reload the LinkedIn page and try again.", "error");
        return;
      }
      if (res?.success) {
        showMsg("✓ Contact saved!", "success");
        setTimeout(loadFeed, 500); // refresh feed after save
      }
      else if (res?.error === "not_logged_in") showMsg("Sign into the dashboard first.", "error");
      else showMsg("✗ " + (res?.error || "Failed"), "error");
    });
  });
});
