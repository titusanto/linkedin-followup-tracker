/**
 * LinkedFollow Content Script v2.1
 * Runs on: https://www.linkedin.com/*
 */

(function () {
  "use strict";

  if (window.__linkedFollowLoaded) return;
  window.__linkedFollowLoaded = true;

  const APP_URL = "https://linkedin-followup-tracker.vercel.app";

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

    const bg = type === "error"   ? "#dc2626"
             : type === "pending" ? "#6b7280"
             :                      "#16a34a";

    t.style.cssText = [
      "position:fixed;bottom:28px;right:28px;z-index:2147483647",
      `background:${bg}`,
      "color:#fff;padding:13px 20px;border-radius:10px",
      "font:600 13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "box-shadow:0 6px 24px rgba(0,0,0,.28);",
      "opacity:1;transition:opacity .35s;max-width:320px",
      "display:flex;align-items:center;gap:10px",
      "pointer-events:none",
    ].join(";");

    const icon = document.createElement("span");
    icon.style.cssText = "font-size:16px;flex-shrink:0";
    icon.textContent = type === "error"   ? "✗"
                     : type === "pending" ? "⏳"
                     : "✓";

    const text = document.createElement("span");
    text.textContent = msg;

    t.appendChild(icon);
    t.appendChild(text);
    document.body.appendChild(t);

    const duration = type === "error" ? 5000 : 3500;
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 400);
    }, duration);
  }

  function showPendingToast(msg) { showToast(msg, "pending"); }

  // ─── Send to background ────────────────────────────────────────────────────
  function saveContact(payload, toastOnSuccess) {
    console.log("[LF] saveContact →", payload.status, payload.name, payload.linkedin_url);
    chrome.runtime.sendMessage({ type: "SAVE_CONTACT", payload }, (res) => {
      if (chrome.runtime.lastError) {
        console.error("[LF] runtime error:", chrome.runtime.lastError.message);
        showToast("Extension error — reload LinkedIn", "error");
        return;
      }
      if (res?.success) {
        if (toastOnSuccess) showToast(toastOnSuccess);
      } else if (res?.error === "not_logged_in") {
        showToast("Not logged in — open the dashboard and sign in first", "error");
      } else if (res?.error === "already_claimed") {
        showToast("This LinkedIn profile is already tracked by another account", "error");
      } else {
        console.error("[LF] save failed:", res?.error);
        showToast(res?.error || "Save failed", "error");
      }
    });
  }

  // ─── Extract profile data from a /in/ page ────────────────────────────────
  function extractProfile() {
    const url = "https://www.linkedin.com" +
      window.location.pathname.replace(/\/?$/, "/");

    let name = document.querySelector("h1")?.textContent?.trim() || null;
    if (!name) name = document.title.split("|")[0].trim() || null;

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

    if (!company && role?.includes(" at ")) {
      company = role.split(" at ").pop().split("|")[0].trim();
    }

    let location = null;
    for (const el of document.querySelectorAll('[class*="text-body-small"]')) {
      const t = el.textContent.trim();
      if (t.length > 2 && t.length < 80 &&
          !t.match(/connection|follower|Contact info|·|Pro/i) &&
          !el.closest("nav")) {
        location = t; break;
      }
    }

    let profile_image = null;
    // 1) Best: hero profile photo (the large one at the top)
    const heroImg =
      document.querySelector('.pv-top-card-profile-picture__image--show') ||
      document.querySelector('.pv-top-card-profile-picture__image') ||
      document.querySelector('img.profile-photo-edit__preview') ||
      document.querySelector('.presence-entity__image');
    if (heroImg?.src && !heroImg.src.startsWith("data:")) {
      profile_image = heroImg.src;
    }
    // 2) Fallback: look for an img whose alt matches the person's name
    if (!profile_image && name) {
      for (const img of document.querySelectorAll("img")) {
        if (img.src && !img.src.startsWith("data:") && img.alt?.trim() === name &&
            (img.src.includes("licdn.com") || img.src.includes("linkedin.com"))) {
          profile_image = img.src; break;
        }
      }
    }
    // 3) Last resort: any licdn profile/shrink image (but skip tiny icons < 48px)
    if (!profile_image) {
      for (const img of document.querySelectorAll("img")) {
        if (img.src && !img.src.startsWith("data:") &&
            (img.src.includes("licdn.com") || img.src.includes("linkedin.com")) &&
            (img.src.includes("profile") || img.src.includes("shrink")) &&
            (img.naturalWidth >= 48 || img.width >= 48)) {
          profile_image = img.src; break;
        }
      }
    }

    return { name, linkedin_url: url, role, company, location, profile_image };
  }

  // ─── Extract from card (off-profile Connect/Follow clicks) ───────────────
  // Works on: search results, My Network, feed, "People you may know"
  // Strategy: walk up the DOM to find a card container, then find the /in/ link.
  // Fallback: parse name directly from the button's aria-label.
  function extractFromCard(buttonEl) {
    // ── Step 1: Get name from aria-label — always available ───────────────────
    // aria-label = "Invite Mohammed Fayiz K to connect" or "Follow Jane Doe"
    const ariaLabel = buttonEl.getAttribute("aria-label") || "";
    let nameFromAria = null;
    const inviteMatch = ariaLabel.match(/^Invite (.+?) to connect/i);
    const followMatch  = ariaLabel.match(/^Follow (.+)/i);
    if (inviteMatch) nameFromAria = inviteMatch[1].trim();
    else if (followMatch) nameFromAria = followMatch[1].trim();

    // ── Step 2: Walk up DOM to find a card/li container ───────────────────────
    let container = buttonEl;
    for (let i = 0; i < 15; i++) {
      if (!container || container === document.body) break;
      const cls = container.className || "";
      const tag = container.tagName;

      if (
        cls.includes("entity-result")           ||  // search results
        cls.includes("discover-entity")         ||  // "People you may know"
        cls.includes("reusable-search__result") ||
        cls.includes("mn-connection-card")      ||  // My Network list
        cls.includes("pymk-hovercard")          ||  // PYMK card
        cls.includes("feed-shared-actor")       ||  // feed
        cls.includes("artdeco-card")            ||  // generic card
        container.getAttribute("data-member-id")           ||
        container.getAttribute("data-chameleon-result-urn")||
        tag === "LI"
      ) break;

      container = container.parentElement;
    }

    // ── Step 3: Find the /in/ profile link inside the container ──────────────
    let linkedinUrl = null;
    let name = nameFromAria; // start with aria name
    let profile_image = null;

    if (container && container !== document.body) {
      const profileLink = container.querySelector('a[href*="/in/"]');
      if (profileLink) {
        const href = profileLink.getAttribute("href") || "";
        const m = href.match(/\/in\/([^/?#]+)/);
        if (m) linkedinUrl = "https://www.linkedin.com/in/" + m[1] + "/";

        // Only override name from aria if we didn't get one
        if (!name) {
          const nameEl =
            container.querySelector(".entity-result__title-text") ||
            container.querySelector(".mn-connection-card__name")  ||
            container.querySelector(".discover-person-card__name")||
            container.querySelector('[class*="actor-name"]')      ||
            container.querySelector("h3")                         ||
            container.querySelector("h2");
          name = nameEl?.textContent?.trim() || profileLink.textContent?.trim() || null;
          if (name) name = name.replace(/·.*$/, "").trim();
          if (name && name.length > 80) name = null;
        }
      }

      // Profile image — prefer one with matching alt text, skip ghost/placeholder images
      const cardImgs = container.querySelectorAll("img");
      // First pass: image whose alt matches the person's name
      if (name) {
        for (const img of cardImgs) {
          if (img.src && !img.src.startsWith("data:") && img.alt?.trim() === name &&
              (img.src.includes("licdn.com") || img.src.includes("linkedin.com")) &&
              !img.src.includes("ghost-person") && !img.src.includes("default-avatar")) {
            profile_image = img.src; break;
          }
        }
      }
      // Second pass: any licdn image that isn't a placeholder (skip tiny icons)
      if (!profile_image) {
        for (const img of cardImgs) {
          if (img.src && !img.src.startsWith("data:") &&
              (img.src.includes("licdn.com") || img.src.includes("linkedin.com")) &&
              !img.src.includes("ghost-person") && !img.src.includes("default-avatar") &&
              (img.naturalWidth >= 32 || img.width >= 32)) {
            profile_image = img.src; break;
          }
        }
      }
    }

    // ── Step 4: Return if we have at least a name ─────────────────────────────
    // linkedin_url can be null — the API will still save with just name
    if (!name && !linkedinUrl) return null;
    return { name: name || "Unknown", linkedin_url: linkedinUrl, profile_image };
  }

  // ─── Button classifier ─────────────────────────────────────────────────────
  // Returns: "connect" | "send-message" | "follow" | "send" | null
  function classifyButton(el) {
    if (!el) return null;
    const tag = el.tagName?.toLowerCase();
    if (tag !== "button" && tag !== "a") return null;

    const aria        = (el.getAttribute("aria-label")      || "").toLowerCase();
    const dataControl = (el.getAttribute("data-control-name")|| "").toLowerCase();
    const cls         = (el.className || "").toLowerCase();

    // ── 1. Send button (check FIRST — most specific) ──────────────────────────
    //
    // Case A: InMail / paid messaging — class "msg-form__send-btn"
    //   <button class="msg-form__send-btn artdeco-button...">
    if (cls.includes("msg-form__send-btn")) return "send";

    // Case B: Free message after connecting — class "message-send", aria "Send Message"
    //   <button class="message-send" aria-label="Send Message">
    if (cls.includes("message-send") || aria === "send message") return "send";

    // Case C: Generic compose send — must be INSIDE a compose container
    const inCompose =
      el.closest(".msg-form")                        ||
      el.closest(".msg-form__footer")                ||
      el.closest('[class*="msg-form"]')              ||
      el.closest(".msg-overlay-conversation-bubble") ||
      el.closest(".msg-overlay-list-bubble")         ||
      el.closest(".send-btn-container")              ||
      el.closest('[class*="compose"]');

    if (inCompose) {
      const isSend =
        aria === "send a message" ||
        aria === "send"           ||
        dataControl === "send"    ||
        (aria.startsWith("send") &&
          !aria.includes("invitation") &&
          !aria.includes("request"));
      if (isSend) return "send";
    }

    // ── 2. Connect ────────────────────────────────────────────────────────────
    // Covers: "Invite X to connect", "Connect with X", "Connect"
    if (aria.includes("invite") || aria.match(/\bconnect\b/)) return "connect";

    // ── 3. Message (opens compose — NOT tracked until actual Send) ────────────
    if (aria.match(/\bmessage\b/)) return "send-message";

    // ── 4. Follow ─────────────────────────────────────────────────────────────
    if (aria.match(/\bfollow\b/) && !aria.includes("unfollow")) return "follow";

    // ── 5. Fallback: short clean visible text ─────────────────────────────────
    const clean = el.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    if (clean.length < 30) {
      if (clean === "connect")  return "connect";
      if (clean === "message")  return "send-message";
      if (clean === "follow")   return "follow";
      if (inCompose && (clean === "send" || clean === "send message")) return "send";
    }

    return null;
  }

  // ─── Walk up DOM from click target ────────────────────────────────────────
  function findActionButton(target) {
    let el = target;
    for (let i = 0; i < 8; i++) {
      if (!el || el === document.body) break;
      const kind = classifyButton(el);
      if (kind) return { el, kind };
      el = el.parentElement;
    }
    return null;
  }

  // ─── Get message recipient from compose overlay or send-btn context ─────────
  function getComposeRecipient(contextEl) {
    // Walk up to find an overlay bubble (mini chat window bottom-right)
    const bubble =
      contextEl?.closest?.(".msg-overlay-conversation-bubble") ||
      contextEl?.closest?.(".msg-overlay-list-bubble");

    if (bubble) {
      const titleLink = bubble.querySelector(
        '.msg-overlay-conversation-bubble__convo-title a[href*="/in/"], ' +
        'a.msg-thread__link-to-profile, ' +
        'a[href*="/in/"]'
      );
      if (titleLink) {
        const href = titleLink.getAttribute("href") || "";
        const m = href.match(/\/in\/([^/?#]+)/);
        if (m) {
          return {
            linkedin_url: "https://www.linkedin.com/in/" + m[1] + "/",
            name: titleLink.textContent?.trim() || null,
          };
        }
      }
    }

    // For .send-btn-container (free message after connecting) —
    // the thread context is the surrounding conversation container
    const sendBtnContainer = contextEl?.closest?.(".send-btn-container");
    if (sendBtnContainer) {
      // Walk up to find the conversation wrapper, then look for /in/ link
      const convoWrapper =
        sendBtnContainer.closest('[class*="conversation"]') ||
        sendBtnContainer.closest('[class*="thread"]')       ||
        sendBtnContainer.closest('[class*="msg-"]')         ||
        sendBtnContainer.parentElement?.parentElement;
      if (convoWrapper) {
        const link = convoWrapper.querySelector('a[href*="/in/"]');
        if (link) {
          const href = link.getAttribute("href") || "";
          const m = href.match(/\/in\/([^/?#]+)/);
          if (m) {
            return {
              linkedin_url: "https://www.linkedin.com/in/" + m[1] + "/",
              name: link.textContent?.trim() || null,
            };
          }
        }
      }
    }

    // For msg-form__send-btn (InMail / paid) — we're on /messaging/ page
    return getMessagingParticipant();
  }

  // ─── Get the open thread participant on /messaging/ page ──────────────────
  // Returns: { linkedinUrl, name, profile_image, role }
  function getMessagingParticipant() {
    const threadSelectors = [
      ".msg-thread__link-to-profile",
      ".msg-conversation-topbar__participant-name a",
      ".msg-conversation-topbar a[href*='/in/']",
      ".msg-thread .msg-s-event-listitem__link",
      ".msg-s-message-list__event a[href*='/in/']",
    ];

    let linkedinUrl = null, name = null;

    for (const sel of threadSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const href = el.getAttribute("href") || "";
      const m = href.match(/\/in\/([^/?#]+)/);
      if (m) {
        linkedinUrl = "https://www.linkedin.com/in/" + m[1] + "/";
        name = el.textContent?.trim() || null;
        break;
      }
    }

    // Fallback: thread/conversation panel only (not sidebar)
    if (!linkedinUrl) {
      const threadPanel =
        document.querySelector(".msg-thread")              ||
        document.querySelector(".msg-s-message-list")      ||
        document.querySelector('[class*="msg-conversation-"]');
      if (threadPanel) {
        const link = threadPanel.querySelector('a[href*="/in/"]');
        if (link) {
          const href = link.getAttribute("href") || "";
          const m = href.match(/\/in\/([^/?#]+)/);
          if (m) {
            linkedinUrl = "https://www.linkedin.com/in/" + m[1] + "/";
            name = link.textContent?.trim() || null;
          }
        }
      }
    }

    // Extract profile image from conversation header
    let profile_image = null;
    const topbar =
      document.querySelector(".msg-conversation-topbar") ||
      document.querySelector(".msg-thread__topbar") ||
      document.querySelector('[class*="msg-overlay-conversation-bubble__header"]');
    if (topbar) {
      const img = topbar.querySelector('img[src*="licdn.com"], img[src*="linkedin.com"]');
      if (img?.src && !img.src.startsWith("data:")) profile_image = img.src;
    }
    // Fallback: thread presence entity image
    if (!profile_image) {
      const presenceImg = document.querySelector('.msg-thread .presence-entity__image, .msg-thread img[src*="licdn.com"]');
      if (presenceImg?.src && !presenceImg.src.startsWith("data:")) profile_image = presenceImg.src;
    }

    // Extract role/headline from conversation header subtitle
    let role = null;
    const subtitleEl =
      document.querySelector(".msg-conversation-topbar__participant-headline") ||
      document.querySelector('[class*="msg-conversation-topbar"] [class*="subtitle"]') ||
      document.querySelector('[class*="msg-conversation-topbar"] [class*="headline"]');
    if (subtitleEl) {
      const t = subtitleEl.textContent?.trim();
      if (t && t.length > 2 && t.length < 200) role = t;
    }

    return { linkedinUrl, name, profile_image, role };
  }

  // ─── Main click handler ────────────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    const pathAtClick = window.location.pathname;
    const onProfile   = /^\/in\/[^/]+/.test(pathAtClick);

    const found = findActionButton(e.target);
    if (!found) return;

    const { el, kind } = found;
    const now = new Date().toISOString();

    // ── Send (actual message sent) ─────────────────────────────────────────
    if (kind === "send") {
      const recipient = getComposeRecipient(el);

      if (recipient?.linkedin_url) {
        console.log("[LF] ✓ Message SENT (overlay) →", recipient.linkedin_url);
        showPendingToast(`💬 Tracking message to ${recipient.name || "contact"}…`);
        setTimeout(() => saveContact({
          linkedin_url: recipient.linkedin_url,
          name: recipient.name || "Unknown",
          status: "Messaged",
          last_messaged_at: now,
        }, `💬 Message to ${recipient.name || "contact"} tracked!`), 300);

      } else if (isMessagingPage()) {
        const participant = getMessagingParticipant();
        if (participant.linkedinUrl) {
          console.log("[LF] ✓ Message SENT (thread) →", participant.linkedinUrl);
          showPendingToast(`💬 Tracking message to ${participant.name || "contact"}…`);
          const payload = {
            linkedin_url: participant.linkedinUrl,
            name: participant.name || "Unknown",
            status: "Messaged",
            last_messaged_at: now,
          };
          if (participant.profile_image) payload.profile_image = participant.profile_image;
          if (participant.role) payload.role = participant.role;
          setTimeout(() => saveContact(payload, `💬 Message to ${participant.name || "contact"} tracked!`), 300);
        } else {
          console.warn("[LF] Send clicked but couldn't identify recipient");
        }
      }
      return;
    }

    // ── Connect / Follow ───────────────────────────────────────────────────
    if (kind === "connect" || kind === "follow") {
      let prof;
      if (onProfile) {
        prof = extractProfile();
      } else {
        // Off-profile: search results, My Network, feed etc.
        prof = extractFromCard(el);
        if (!prof) {
          // Last resort: parse name from aria-label "Invite Jane Doe to connect"
          const aria = el.getAttribute("aria-label") || "";
          const nameMatch = aria.match(/^Invite (.+?) to connect/i);
          if (nameMatch) {
            prof = { name: nameMatch[1].trim(), linkedin_url: null, profile_image: null };
          } else {
            console.warn("[LF] Could not identify person for", kind, "click");
            return;
          }
        }
      }

      const status = kind === "connect" ? "Pending" : "Connected";
      const extra  = kind === "connect" ? { connection_sent_at: now } : {};
      Object.assign(prof, { status, ...extra });

      console.log("[LF] ✓", kind, "→", status, prof.name, prof.linkedin_url);
      showPendingToast(kind === "connect"
        ? `⏳ Sending request to ${prof.name}…`
        : `➕ Tracking follow for ${prof.name}…`);

      setTimeout(() => saveContact(prof,
        kind === "connect"
          ? `⏳ Request sent to ${prof.name}!`
          : `✓ Followed ${prof.name}!`
      ), 600);
      return;
    }

    // ── Message button: just opens compose, DON'T track yet ───────────────
    if (kind === "send-message") {
      console.log("[LF] Message button clicked — waiting for actual Send…");
      return;
    }
  }, true);

  // ─── Connect confirmation modal ────────────────────────────────────────────
  // "Send now" / "Send invitation" inside the "Add a note?" modal
  // IMPORTANT: only fires on profile pages AND only for the modal buttons,
  // NOT for the message compose send button.
  document.addEventListener("click", (e) => {
    if (!isProfilePage()) return;

    // Only match the specific modal buttons — check parent context
    const btn = e.target?.closest?.("button, [role='button']");
    if (!btn) return;

    // The connect note modal has a specific container
    const inConnectModal =
      btn.closest('[class*="send-invite"]')    ||
      btn.closest('[class*="connect-button"]') ||
      btn.closest(".artdeco-modal")            ||
      btn.closest('[role="dialog"]');

    if (!inConnectModal) return;

    const text = btn.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    const aria = (btn.getAttribute("aria-label") || "").toLowerCase();

    const isSendInvitation =
      text === "send now"         ||
      text === "send invitation"  ||
      (aria.includes("send") && aria.includes("invitation"));

    if (!isSendInvitation) return;

    const prof = extractProfile();
    Object.assign(prof, { status: "Pending", connection_sent_at: new Date().toISOString() });
    console.log("[LF] ✓ Connect modal 'Send' →", prof.name);
    setTimeout(() => saveContact(prof, `⏳ Request sent to ${prof.name}!`), 600);
  }, true);

  // ─── Reply detection (MutationObserver on thread) ─────────────────────────
  let replyObserver    = null;
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
        const participant = getMessagingParticipant();
        if (participant.linkedinUrl) {
          const payload = {
            linkedin_url: participant.linkedinUrl,
            name: participant.name || "Unknown",
            status: "Replied",
            last_replied_at: new Date().toISOString(),
          };
          if (participant.profile_image) payload.profile_image = participant.profile_image;
          if (participant.role) payload.role = participant.role;
          saveContact(payload, `↩️ Reply from ${participant.name || "contact"} tracked!`);
        }
      }
    });
    replyObserver.observe(container, { childList: true, subtree: true });
    console.log("[LF] Watching for replies");
  }

  if (isMessagingPage()) setTimeout(watchForReplies, 1500);

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── CONNECTION ACCEPTANCE DETECTION ──────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  let pendingContacts    = [];
  let acceptanceObserver = null;

  async function loadPendingContacts() {
    try {
      const res = await fetch(`${APP_URL}/api/contacts?status=Pending`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      pendingContacts = (data.data || []).map(c => ({
        linkedin_url: c.linkedin_url,
        name: c.name,
      }));
      console.log("[LF] Loaded", pendingContacts.length, "pending contacts");
    } catch (_) {}
  }

  function currentProfileUrl() {
    const m = window.location.pathname.match(/^\/in\/([^/?#]+)/);
    if (!m) return null;
    return "https://www.linkedin.com/in/" + m[1] + "/";
  }

  function isNowConnected() {
    const buttons = document.querySelectorAll(
      '.pvs-profile-actions button, .pvs-profile-actions a, ' +
      '.pv-top-card-v2-ctas button, .pv-top-card-v2-ctas a'
    );
    let hasMessage = false, hasConnect = false, hasPending = false;
    for (const btn of buttons) {
      const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
      const text = btn.textContent.replace(/\s+/g, " ").trim().toLowerCase();
      if (aria.match(/\bmessage\b/) || text === "message") hasMessage = true;
      if (aria.match(/\bconnect\b/) || aria.includes("invite") || text === "connect") hasConnect = true;
      if (aria.includes("pending") || text === "pending") hasPending = true;
    }
    return hasMessage && !hasConnect && !hasPending;
  }

  function watchProfileForAcceptance(profileUrl) {
    acceptanceObserver?.disconnect();
    const actionArea =
      document.querySelector(".pvs-profile-actions") ||
      document.querySelector(".pv-top-card-v2-ctas") ||
      document.querySelector(".ph5.pb5");
    if (!actionArea) return;

    let fired = false;
    acceptanceObserver = new MutationObserver(() => {
      if (fired) return;
      if (isNowConnected()) {
        fired = true;
        acceptanceObserver.disconnect();
        const prof = extractProfile();
        Object.assign(prof, { linkedin_url: profileUrl, status: "Connected" });
        console.log("[LF] ✓ Acceptance detected (button change):", prof.name);
        saveContact(prof, `🤝 ${prof.name} accepted your request!`);
        pendingContacts = pendingContacts.filter(c => c.linkedin_url !== profileUrl);
      }
    });
    acceptanceObserver.observe(actionArea, { childList: true, subtree: true, attributes: true });
    console.log("[LF] Watching for acceptance:", profileUrl);
  }

  async function checkProfileForAcceptance() {
    if (!isProfilePage()) return;
    const profileUrl = currentProfileUrl();
    if (!profileUrl) return;
    if (pendingContacts.length === 0) await loadPendingContacts();
    const isPending = pendingContacts.some(c => c.linkedin_url === profileUrl);
    if (!isPending) return;

    if (isNowConnected()) {
      const prof = extractProfile();
      Object.assign(prof, { linkedin_url: profileUrl, status: "Connected" });
      console.log("[LF] ✓ Already connected (on load):", prof.name);
      saveContact(prof, `🤝 ${prof.name} accepted your request!`);
      pendingContacts = pendingContacts.filter(c => c.linkedin_url !== profileUrl);
      return;
    }
    watchProfileForAcceptance(profileUrl);
  }

  // Notification bell watcher
  let notifObserver = null;
  function watchNotificationsDropdown() {
    notifObserver?.disconnect();
    const dropdown =
      document.querySelector(".notifications-nav-item__dropdown") ||
      document.querySelector('[aria-label="Notifications"] + *') ||
      document.querySelector('.notification-badge__count')?.closest("li")?.querySelector("ul");
    if (!dropdown) return;

    notifObserver = new MutationObserver(() => {
      const items = dropdown.querySelectorAll('.nt-card__text, .notification-item, [class*="notification"]');
      for (const item of items) {
        const text = item.textContent || "";
        if (!text.toLowerCase().includes("accepted your invitation")) continue;
        const link = item.querySelector('a[href*="/in/"]') ||
          item.closest("li")?.querySelector('a[href*="/in/"]');
        if (!link) continue;
        const href = link.getAttribute("href") || "";
        const m = href.match(/\/in\/([^/?#]+)/);
        if (!m) continue;
        const profileUrl = "https://www.linkedin.com/in/" + m[1] + "/";
        const pending = pendingContacts.find(c => c.linkedin_url === profileUrl);
        if (!pending) continue;
        console.log("[LF] ✓ Acceptance via notification:", profileUrl);
        saveContact({
          linkedin_url: profileUrl,
          name: pending.name,
          status: "Connected",
        }, `🤝 ${pending.name} accepted your request!`);
        pendingContacts = pendingContacts.filter(c => c.linkedin_url !== profileUrl);
      }
    });
    notifObserver.observe(dropdown, { childList: true, subtree: true });
  }

  document.addEventListener("click", (e) => {
    const el = e.target?.closest?.('[data-control-name="nav.notifications"], [href*="/notifications/"], .notification-badge');
    if (el) setTimeout(watchNotificationsDropdown, 800);
  }, true);

  // My Network page scan
  async function scanMyNetworkPage() {
    if (!window.location.pathname.startsWith("/mynetwork")) return;
    if (pendingContacts.length === 0) await loadPendingContacts();
    if (pendingContacts.length === 0) return;
    await new Promise(r => setTimeout(r, 2000));

    const links = document.querySelectorAll('a[href*="/in/"]');
    const seen = new Set();
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const m = href.match(/\/in\/([^/?#]+)/);
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      const profileUrl = "https://www.linkedin.com/in/" + m[1] + "/";
      const pending = pendingContacts.find(c => c.linkedin_url === profileUrl);
      if (!pending) continue;
      const card = link.closest("li") || link.closest('[class*="card"]') || link.parentElement;
      const cardText = card?.textContent?.toLowerCase() || "";
      if (cardText.includes("connected") || cardText.includes("1st")) {
        saveContact({ linkedin_url: profileUrl, name: pending.name, status: "Connected" },
          `🤝 ${pending.name} accepted your request!`);
        pendingContacts = pendingContacts.filter(c => c.linkedin_url !== profileUrl);
      }
    }
  }

  // ─── SPA navigation watcher ────────────────────────────────────────────────
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;

    replyObserver?.disconnect();    replyObserver    = null; lastInboundCount = 0;
    acceptanceObserver?.disconnect(); acceptanceObserver = null;

    if (isMessagingPage())                              setTimeout(watchForReplies,          1500);
    if (isProfilePage())                               setTimeout(checkProfileForAcceptance, 1500);
    if (location.pathname.startsWith("/mynetwork"))    setTimeout(scanMyNetworkPage,         1000);
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

  // ─── Init ──────────────────────────────────────────────────────────────────
  setTimeout(loadPendingContacts, 2000);
  if (isMessagingPage())                           setTimeout(watchForReplies,          1500);
  if (isProfilePage())                             setTimeout(checkProfileForAcceptance, 2500);
  if (location.pathname.startsWith("/mynetwork"))  setTimeout(scanMyNetworkPage,         2000);

  console.log("[LF] v2.1 loaded on", location.pathname);
})();
