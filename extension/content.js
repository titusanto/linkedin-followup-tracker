/**
 * LinkedFollow Content Script
 * Runs on: https://www.linkedin.com/*
 */

(function () {
  "use strict";

  if (window.__linkedFollowLoaded) return; // prevent double-injection
  window.__linkedFollowLoaded = true;

  // ─── Page helpers ──────────────────────────────────────────────────────────
  function isProfilePage() {
    return /^\/in\/[^/]+/.test(window.location.pathname);
  }
  function isMessagingPage() {
    return window.location.pathname.startsWith("/messaging/");
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg, type = "success") {
    const old = document.getElementById("lf-toast");
    if (old) old.remove();
    const t = document.createElement("div");
    t.id = "lf-toast";
    t.textContent = msg;
    t.style.cssText = [
      "position:fixed;bottom:24px;right:24px;z-index:999999",
      `background:${type === "error" ? "#dc2626" : "#2563eb"}`,
      "color:#fff;padding:12px 18px;border-radius:8px",
      "font:500 14px/-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "box-shadow:0 4px 16px rgba(0,0,0,.2);opacity:1;transition:opacity .4s",
    ].join(";");
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 400); }, 3500);
  }

  // ─── Send to background ────────────────────────────────────────────────────
  function saveContact(payload, toastOnSuccess) {
    console.log("[LF] saveContact →", payload.status, payload.name, payload.linkedin_url);
    chrome.runtime.sendMessage({ type: "SAVE_CONTACT", payload }, (res) => {
      if (chrome.runtime.lastError) {
        console.error("[LF] runtime error:", chrome.runtime.lastError.message);
        showToast("✗ Extension error — reload LinkedIn", "error");
        return;
      }
      if (res?.success) {
        if (toastOnSuccess) showToast(toastOnSuccess);
      } else if (res?.error === "already_claimed") {
        // This LinkedIn profile belongs to another dashboard account
        showToast("⚠ This LinkedIn profile is already connected to another account", "error");
      } else {
        console.error("[LF] save failed:", res?.error);
        showToast("✗ " + (res?.error || "Save failed"), "error");
      }
    });
  }

  // ─── Extract profile data from a /in/ page ────────────────────────────────
  function extractProfile() {
    const url = "https://www.linkedin.com" +
      window.location.pathname.replace(/\/?$/, "/");

    // Name: h1 is most reliable
    let name = document.querySelector("h1")?.textContent?.trim() || null;
    if (!name) {
      name = document.title.split("|")[0].trim() || null;
    }

    // Role: try JSON-LD first (most reliable), then DOM
    let role = null, company = null;
    try {
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
        const j = JSON.parse(s.textContent || "{}");
        const p = j["@type"] === "Person" ? j
          : Array.isArray(j["@graph"]) ? j["@graph"].find(x => x["@type"] === "Person")
          : null;
        if (p?.jobTitle) {
          role = Array.isArray(p.jobTitle) ? p.jobTitle[0] : p.jobTitle;
          if (p.worksFor?.name) company = p.worksFor.name;
          else if (Array.isArray(p.worksFor)) company = p.worksFor[0]?.name || null;
          break;
        }
      }
    } catch (_) {}

    // DOM fallback for role
    if (!role) {
      const candidates = document.querySelectorAll(
        '.text-body-medium.break-words, [class*="pv-text-details"] [class*="text-body-medium"]'
      );
      for (const el of candidates) {
        const t = el.textContent.trim();
        if (t.length > 3 && t.length < 300 &&
            !t.match(/connection|follower|Connect|Message/i) &&
            !el.closest("nav")) {
          role = t; break;
        }
      }
    }

    // Company from "X at Y"
    if (!company && role?.includes(" at ")) {
      company = role.split(" at ").pop().split("|")[0].trim();
    }

    // Location
    let location = null;
    for (const el of document.querySelectorAll('[class*="text-body-small"]')) {
      const t = el.textContent.trim();
      if (t.length > 2 && t.length < 80 &&
          !t.match(/connection|follower|Contact info|·|Pro/i) &&
          !el.closest("nav")) {
        location = t; break;
      }
    }

    // Profile image
    let profile_image = null;
    for (const img of document.querySelectorAll("img")) {
      if (img.src && !img.src.startsWith("data:") &&
          (img.src.includes("licdn.com") || img.src.includes("linkedin.com")) &&
          (img.src.includes("profile") || img.src.includes("shrink") || img.alt === name)) {
        profile_image = img.src; break;
      }
    }

    return { name, linkedin_url: url, role, company, location, profile_image };
  }

  // ─── Strict button classifier ──────────────────────────────────────────────
  // Returns "connect" | "message" | "follow" | null
  // Uses aria-label ONLY for the primary check — much more reliable than textContent
  // which gets polluted by SVG icon text on LinkedIn.
  function classifyButton(el) {
    if (!el) return null;
    const tag = el.tagName?.toLowerCase();
    if (tag !== "button" && tag !== "a") return null;

    const aria = (el.getAttribute("aria-label") || "").toLowerCase();

    // LinkedIn's aria-labels:
    //   Connect: "Invite <name> to connect" / "Connect with <name>"
    //   Message: "Message <name>"
    //   Follow:  "Follow <name>"
    //   Send (modal): "Send now" / "Send invitation"
    if (aria.includes("invite") || aria.match(/\bconnect\b/)) return "connect";
    if (aria.match(/\bmessage\b/)) return "message";
    if (aria.match(/\bfollow\b/) && !aria.includes("unfollow")) return "follow";

    // Fallback: use visible text but strip all whitespace/newlines
    // and check if the ENTIRE clean text is exactly one of these words
    const clean = el.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    // Must be short — actual button labels are short ("Connect", "Message", "Follow")
    if (clean.length < 30) {
      if (clean === "connect") return "connect";
      if (clean === "message") return "message";
      if (clean === "follow" || clean === "follow ") return "follow";
    }

    return null;
  }

  // ─── Walk up DOM from click target ────────────────────────────────────────
  function findActionButton(target) {
    let el = target;
    for (let i = 0; i < 6; i++) {
      if (!el || el === document.body) break;
      const kind = classifyButton(el);
      if (kind) return { el, kind };
      el = el.parentElement;
    }
    return null;
  }

  // ─── Main click handler ────────────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    const pathAtClick = window.location.pathname;
    const onProfile   = /^\/in\/[^/]+/.test(pathAtClick);
    const onMessaging = pathAtClick.startsWith("/messaging/");

    const found = findActionButton(e.target);
    if (!found) return;

    const { kind } = found;
    const now = new Date().toISOString();

    // ── Connect / Follow ─ only meaningful on profile pages ───────────────────
    if (kind === "connect" || kind === "follow") {
      if (!onProfile) return;

      // Snapshot profile data synchronously RIGHT NOW before SPA navigation
      const prof = extractProfile();
      const status = kind === "connect" ? "Pending" : "Connected";
      const extra  = kind === "connect" ? { connection_sent_at: now } : {};
      Object.assign(prof, { status, ...extra });

      console.log("[LF] ✓", kind, "→", status, "name:", prof.name);
      setTimeout(() => saveContact(prof,
        kind === "connect" ? "⏳ Connection request saved!" : "✓ Follow tracked!"
      ), 600);
      return;
    }

    // ── Message button on profile page ────────────────────────────────────────
    if (kind === "message" && onProfile) {
      const prof = extractProfile();
      Object.assign(prof, { status: "Messaged", last_messaged_at: now });
      console.log("[LF] ✓ message click on profile →", prof.name);
      setTimeout(() => saveContact(prof, "💬 Message tracked!"), 600);
      return;
    }

    // ── Message send button inside messaging thread ───────────────────────────
    if (kind === "message" && onMessaging) {
      const { name, linkedinUrl } = getMessagingParticipant();
      if (!linkedinUrl) return;
      const payload = {
        linkedin_url: linkedinUrl,
        name: name || "Unknown",
        status: "Messaged",
        last_messaged_at: now,
      };
      console.log("[LF] ✓ message sent in thread →", linkedinUrl);
      setTimeout(() => saveContact(payload, "💬 Message tracked!"), 300);
    }
  }, true);

  // ─── Detect Connect confirmation modal "Send" ──────────────────────────────
  // When user clicks Connect and a modal appears asking for a note, they press
  // "Send now" / "Send invitation". We detect THAT too.
  document.addEventListener("click", (e) => {
    if (!isProfilePage()) return;
    const aria = (e.target?.getAttribute?.("aria-label") || "").toLowerCase();
    const text = (e.target?.textContent || "").trim().toLowerCase();
    // "Send now" or "Send invitation" inside the connect modal
    if ((aria.includes("send") && aria.includes("invitation")) ||
        text === "send now" || text === "send invitation") {
      const prof = extractProfile();
      Object.assign(prof, { status: "Pending", connection_sent_at: new Date().toISOString() });
      console.log("[LF] ✓ Connect modal confirmed →", prof.name);
      setTimeout(() => saveContact(prof, "⏳ Connection request sent!"), 600);
    }
  }, true);

  // ─── Messaging participant ─────────────────────────────────────────────────
  function getMessagingParticipant() {
    const nameEl =
      document.querySelector(".msg-thread__link-to-profile") ||
      document.querySelector(".msg-conversation-card__participant-name") ||
      document.querySelector('[data-control-name="view_member_profile"] .artdeco-entity-lockup__title');

    const anchor =
      document.querySelector(".msg-thread__link-to-profile") ||
      document.querySelector('a[href*="/in/"]');

    let linkedinUrl = null;
    const href = anchor?.getAttribute("href") || "";
    const m = href.match(/\/in\/([^/?#]+)/);
    if (m) linkedinUrl = "https://www.linkedin.com/in/" + m[1] + "/";

    return { name: nameEl?.textContent?.trim() || null, linkedinUrl };
  }

  // ─── Reply detection via MutationObserver ─────────────────────────────────
  let replyObserver = null;
  let lastInboundCount = 0;

  function watchForReplies() {
    const container = document.querySelector(".msg-s-message-list-content");
    if (!container) { setTimeout(watchForReplies, 1200); return; }

    const sel = '.msg-s-message-group--inbound, [class*="message-group--inbound"]';
    lastInboundCount = container.querySelectorAll(sel).length;

    replyObserver?.disconnect();
    replyObserver = new MutationObserver(() => {
      const n = container.querySelectorAll(sel).length;
      if (n > lastInboundCount) {
        lastInboundCount = n;
        const { name, linkedinUrl } = getMessagingParticipant();
        if (linkedinUrl) {
          saveContact({
            linkedin_url: linkedinUrl,
            name: name || "Unknown",
            status: "Replied",
            last_replied_at: new Date().toISOString(),
          }, "↩️ Reply tracked!");
        }
      }
    });
    replyObserver.observe(container, { childList: true, subtree: true });
    console.log("[LF] Watching for replies in thread");
  }

  if (isMessagingPage()) setTimeout(watchForReplies, 1500);

  // ─── SPA navigation watcher ────────────────────────────────────────────────
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    replyObserver?.disconnect();
    replyObserver = null;
    lastInboundCount = 0;
    if (isMessagingPage()) setTimeout(watchForReplies, 1500);
  }, 500);

  // ─── Manual capture from popup ────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _, respond) => {
    if (msg.type === "CAPTURE_NOW") {
      if (!isProfilePage()) {
        respond({ success: false, error: "Not on a LinkedIn profile page" });
        return true;
      }
      const prof = extractProfile();
      prof.status = "Connected";
      prof.connection_sent_at = new Date().toISOString();
      saveContact(prof, "✓ Contact saved!");
      respond({ success: true });
      return true;
    }
  });

  console.log("[LF] content script loaded on", location.pathname);
})();
