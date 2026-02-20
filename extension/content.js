/**
 * LinkedFollow Content Script v2.7
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
  // LinkedIn 2025+: no h1, no ld+json, obfuscated class names.
  // Strategy: find name heading (h1 or h2), then extract role/location/company
  // by scanning visible text elements positioned below the name heading.
  function extractProfile() {
    const url = "https://www.linkedin.com" +
      window.location.pathname.replace(/\/?$/, "/");

    // ── Name: try h1, then h2, then document.title ──
    let name = document.querySelector("h1")?.textContent?.trim() || null;
    if (!name) {
      // LinkedIn 2025+ uses h2 for profile name
      const titleName = document.title.split("|")[0].trim().replace(/\s*\(.*\)$/, "");
      for (const h2 of document.querySelectorAll("h2")) {
        const t = h2.innerText?.trim();
        if (t && t.length > 1 && t.length < 60) {
          const rect = h2.getBoundingClientRect();
          // The profile name h2 is large (20px+) and in the main content area
          const fs = parseFloat(getComputedStyle(h2).fontSize);
          if (fs >= 18 && rect.left < 400 && rect.width > 50) {
            name = t;
            break;
          }
        }
      }
      if (!name) name = titleName || null;
    }

    let role = null, company = null;

    // ── Strategy 1: ld+json (still works on some profiles) ──
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

    // ── Strategy 2: Old class selectors (pre-2025 LinkedIn) ──
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

    // ── Strategy 3: Position-based extraction (2025+ obfuscated classes) ──
    // Find the name heading element, then scan visible elements below it
    if (!role) {
      const nameHeading = document.querySelector("h1") ||
        [...document.querySelectorAll("h2")].find(h => {
          const fs = parseFloat(getComputedStyle(h).fontSize);
          const rect = h.getBoundingClientRect();
          return fs >= 18 && rect.left < 400 && rect.width > 50 && rect.top > 100;
        });

      if (nameHeading) {
        const nameRect = nameHeading.getBoundingClientRect();
        const nearbyTexts = [];

        // Scan all small text elements positioned below the name
        for (const el of document.querySelectorAll("p, div, span")) {
          if (el.children.length > 2) continue;
          const t = el.innerText?.trim();
          if (!t || t.length < 3 || t.length > 150) continue;

          const rect = el.getBoundingClientRect();
          const fs = parseFloat(getComputedStyle(el).fontSize);

          // Must be below name, in the left portion, reasonable font size
          if (rect.top > nameRect.bottom - 5 && rect.top < nameRect.bottom + 80 &&
              rect.left < 500 && fs >= 12 && rect.height > 8 && rect.height < 50) {
            // Skip noise: pronouns, degree indicators, nav items
            if (t.match(/^(She\/Her|He\/Him|They\/Them|· \d|Follow|Connect|Message|More|Pending)/i)) continue;
            if (el.closest("nav") || el.closest("button")) continue;

            nearbyTexts.push({ text: t, top: rect.top, fontSize: fs, left: rect.left });
          }
        }

        nearbyTexts.sort((a, b) => a.top - b.top || a.left - b.left);

        // The first sizable text below the name is typically the role/headline
        for (const item of nearbyTexts) {
          if (item.text.length > 3 && item.fontSize >= 14 &&
              !item.text.match(/connection|follower|Contact info|^\d|^·/i)) {
            role = item.text;
            break;
          }
        }
      }
    }

    if (!company && role?.includes(" at ")) {
      company = role.split(" at ").pop().split("|")[0].trim();
    }

    // ── Strategy for company: look for text to the right of the name heading ──
    // LinkedIn 2025+ shows company with an icon to the right of the name line
    if (!company) {
      const nameHeading = document.querySelector("h1") ||
        [...document.querySelectorAll("h2")].find(h => {
          const fs = parseFloat(getComputedStyle(h).fontSize);
          return fs >= 18 && h.getBoundingClientRect().left < 400;
        });
      if (nameHeading) {
        const nameRect = nameHeading.getBoundingClientRect();
        for (const el of document.querySelectorAll("p, span, a")) {
          if (el.children.length > 1) continue;
          const t = el.innerText?.trim();
          if (!t || t.length < 2 || t.length > 80) continue;
          const rect = el.getBoundingClientRect();
          const fs = parseFloat(getComputedStyle(el).fontSize);
          // Company is typically at the same vertical level as the name but to the right
          if (Math.abs(rect.top - nameRect.top) < 20 && rect.left > nameRect.right + 30 &&
              fs >= 12 && fs <= 16 &&
              !t.match(/^(She\/Her|He\/Him|They\/Them|· \d|1st|2nd|3rd)/i) &&
              !el.closest("nav") && !el.closest("button")) {
            company = t;
            break;
          }
        }
      }
    }

    // ── Location ──
    let location = null;
    // Strategy 1: Old class selectors
    for (const el of document.querySelectorAll('[class*="text-body-small"]')) {
      const t = el.textContent.trim();
      if (t.length > 2 && t.length < 80 &&
          !t.match(/connection|follower|Contact info|·|Pro/i) &&
          !el.closest("nav")) {
        location = t; break;
      }
    }
    // Strategy 2: Position-based (below role, contains comma = likely a location)
    if (!location) {
      const nameHeading = document.querySelector("h1") ||
        [...document.querySelectorAll("h2")].find(h => {
          const fs = parseFloat(getComputedStyle(h).fontSize);
          return fs >= 18 && h.getBoundingClientRect().left < 400;
        });
      if (nameHeading) {
        const nameRect = nameHeading.getBoundingClientRect();
        for (const el of document.querySelectorAll("p, span")) {
          if (el.children.length > 1) continue;
          const t = el.innerText?.trim();
          if (!t || t.length < 5 || t.length > 80) continue;
          const rect = el.getBoundingClientRect();
          const fs = parseFloat(getComputedStyle(el).fontSize);
          // Location is usually 50-90px below name, 14px font, contains comma
          if (rect.top > nameRect.bottom + 30 && rect.top < nameRect.bottom + 100 &&
              rect.left < 400 && fs >= 12 && fs <= 16 &&
              t.includes(",") &&
              !t.match(/connection|follower|Contact|http|www\./i)) {
            location = t;
            break;
          }
        }
      }
    }

    // ── Profile image ──
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

    // ── Step 2: Walk up DOM to find the SMALLEST ancestor with a /in/ link ──
    // LinkedIn uses obfuscated class names, so instead of matching class names
    // we find the nearest parent that contains a profile link (excluding the
    // connect/follow button itself). This correctly scopes to the person card.
    let container = null;
    let el = buttonEl.parentElement;
    for (let i = 0; i < 20; i++) {
      if (!el || el === document.body) break;
      const profileLinks = el.querySelectorAll('a[href*="/in/"]');
      // Filter out the connect/follow button itself (it can be an <a> tag)
      const realLinks = [...profileLinks].filter(a => {
        const a_aria = (a.getAttribute("aria-label") || "").toLowerCase();
        return !a_aria.includes("invite") && !a_aria.includes("connect") &&
               !a_aria.includes("follow");
      });
      if (realLinks.length > 0) {
        // Check this container has only 1 unique profile (the correct person)
        const uniqueSlugs = new Set(realLinks.map(a => {
          const m = (a.getAttribute("href") || "").match(/\/in\/([^/?#]+)/);
          return m ? m[1] : null;
        }).filter(Boolean));
        if (uniqueSlugs.size === 1) {
          container = el;
          break;
        }
      }
      el = el.parentElement;
    }

    // ── Step 3: Extract /in/ URL and profile image from the card ─────────────
    let linkedinUrl = null;
    let name = nameFromAria;
    let profile_image = null;

    if (container) {
      const profileLink = container.querySelector(
        'a[href*="/in/"]:not([aria-label*="Invite"]):not([aria-label*="connect"]):not([aria-label*="Follow"])'
      );
      if (profileLink) {
        const href = profileLink.getAttribute("href") || "";
        const m = href.match(/\/in\/([^/?#]+)/);
        if (m) linkedinUrl = "https://www.linkedin.com/in/" + m[1] + "/";

        if (!name) {
          name = profileLink.textContent?.trim() || null;
          if (name) name = name.replace(/·.*$/, "").trim();
          if (name && name.length > 80) name = null;
        }
      }

      // Profile image — prefer profile-displayphoto or profile-framedphoto (≥50px)
      for (const img of container.querySelectorAll("img")) {
        if (!img.src || img.src.startsWith("data:")) continue;
        if (!(img.src.includes("licdn.com") || img.src.includes("linkedin.com"))) continue;
        const isProfile = img.src.includes("profile-displayphoto") ||
                          img.src.includes("profile-framedphoto");
        const size = Math.max(img.width || 0, img.naturalWidth || 0, img.height || 0, img.naturalHeight || 0);
        if (isProfile && size >= 50) { profile_image = img.src; break; }
      }
      // Fallback: any linkedin image ≥ 50px that isn't a background/banner
      if (!profile_image) {
        for (const img of container.querySelectorAll("img")) {
          if (!img.src || img.src.startsWith("data:")) continue;
          if (!(img.src.includes("licdn.com") || img.src.includes("linkedin.com"))) continue;
          if (img.src.includes("background") || img.src.includes("banner")) continue;
          const w = img.width || img.naturalWidth || 0;
          const h = img.height || img.naturalHeight || 0;
          if (w >= 50 && h >= 50) { profile_image = img.src; break; }
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
    // Case A: InMail / messaging — class "msg-form__send-btn" or "msg-form__send-button"
    if (cls.includes("msg-form__send-btn") || cls.includes("msg-form__send-button")) return "send";

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

  // ─── Helper: extract recipient from a compose bubble element ────────────────
  function extractRecipientFromBubble(bubble) {
    if (!bubble) return null;
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
          name: cleanMsgName(titleLink.textContent),
        };
      }
    }
    return null;
  }

  // ─── Get message recipient from compose overlay or send-btn context ─────────
  function getComposeRecipient(contextEl) {
    // Walk up to find an overlay bubble (mini chat window bottom-right)
    const bubble =
      contextEl?.closest?.(".msg-overlay-conversation-bubble") ||
      contextEl?.closest?.(".msg-overlay-list-bubble");

    const fromBubble = extractRecipientFromBubble(bubble);
    if (fromBubble) return fromBubble;

    // For .send-btn-container (free message after connecting) —
    // the thread context is the surrounding conversation container
    const sendBtnContainer = contextEl?.closest?.(".send-btn-container");
    if (sendBtnContainer) {
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
              name: cleanMsgName(link.textContent),
            };
          }
        }
      }
    }

    // Fallback: get from messaging thread (main DOM or shadow DOM)
    return getMessagingParticipant();
  }

  // ─── Clean name from messaging elements (strip status/mobile text) ────────
  function cleanMsgName(rawText) {
    if (!rawText) return null;
    // The link element contains child text like "Status is reachable", "Mobile • 4h ago"
    // The actual name is always the first NON-EMPTY line
    // (rawText often starts with \n, so split("\n")[0] is empty — must skip empties)
    const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    let name = lines[0] || "";
    // Strip trailing status text that LinkedIn sometimes appends on the same line
    name = name
      .replace(/\s*(Status is .+|Active now|Mobile\s*[•·].*|Last active .+|Reachable via .+)$/i, "")
      .replace(/\s*(She\/Her|He\/Him|They\/Them|Non-binary)\s*$/i, "")
      .trim();
    // If the first line itself was a status line, find the real name
    if (!name || name.match(/^(Status is|Active now|Mobile|Last active|Reachable)/i)) {
      name = lines.find(l =>
        l.length > 1 && l.length < 60 &&
        !l.match(/^(Status is|Active now|Mobile|Last active|Reachable|She\/Her|He\/Him|They\/Them)/i)
      ) || "";
    }
    if (!name || name.length > 80) return null;
    return name;
  }

  // ─── Get the open thread participant on /messaging/ page ──────────────────
  // Ordered from most specific (thread header) to least specific (any /in/ link)
  // Searches both main DOM and shadow DOM (LinkedIn messaging overlay)
  function getMessagingParticipant() {
    const threadSelectors = [
      ".msg-thread__link-to-profile",
      ".msg-conversation-topbar__participant-name a",
      ".msg-conversation-topbar a[href*='/in/']",
      ".msg-thread .msg-s-event-listitem__link",
      ".msg-s-message-list__event a[href*='/in/']",
    ];

    // Search in main DOM first
    for (const sel of threadSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const href = el.getAttribute("href") || "";
      const m = href.match(/\/in\/([^/?#]+)/);
      if (m) {
        return {
          linkedinUrl: "https://www.linkedin.com/in/" + m[1] + "/",
          name: cleanMsgName(el.textContent),
        };
      }
    }

    // Fallback: thread/conversation panel only (not sidebar)
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
          return {
            linkedinUrl: "https://www.linkedin.com/in/" + m[1] + "/",
            name: cleanMsgName(link.textContent),
          };
        }
      }
    }

    // Search shadow DOM (LinkedIn overlay messaging uses shadow root)
    const shadowRoot = document.querySelector(".theme--light")?.shadowRoot;
    if (shadowRoot) {
      for (const sel of threadSelectors) {
        const el = shadowRoot.querySelector(sel);
        if (!el) continue;
        const href = el.getAttribute("href") || "";
        const m = href.match(/\/in\/([^/?#]+)/);
        if (m) {
          return {
            linkedinUrl: "https://www.linkedin.com/in/" + m[1] + "/",
            name: cleanMsgName(el.textContent),
          };
        }
      }
    }

    return { linkedinUrl: null, name: null };
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
        const { name, linkedinUrl } = getMessagingParticipant();
        if (linkedinUrl) {
          console.log("[LF] ✓ Message SENT (thread) →", linkedinUrl);
          showPendingToast(`💬 Tracking message to ${name || "contact"}…`);
          setTimeout(() => saveContact({
            linkedin_url: linkedinUrl,
            name: name || "Unknown",
            status: "Messaged",
            last_messaged_at: now,
          }, `💬 Message to ${name || "contact"} tracked!`), 300);
        } else {
          console.warn("[LF] Send clicked but couldn't identify recipient");
        }
      }
      return;
    }

    // ── Connect / Follow ───────────────────────────────────────────────────
    if (kind === "connect" || kind === "follow") {
      let prof;
      // Always try extractFromCard first — works for search, network, feed,
      // AND the "similar profiles" section at the bottom of profile pages.
      // Only fall back to extractProfile() if we're on a profile page and
      // extractFromCard didn't find a card (meaning it's the main Connect btn).
      prof = extractFromCard(el);
      if (!prof && onProfile) {
        prof = extractProfile();
      }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── REPLY DETECTION ───────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Strategy 1: REAL-TIME — MutationObserver on the open thread (catches live replies)
  // Strategy 2: SIDEBAR SCANNER — periodically scans the messaging sidebar for
  //   conversations where the last message was NOT sent by "You:" — this means
  //   the other person replied. Cross-references against our API contacts with
  //   status "Messaged" to detect replies that happened while the user was away.
  // Strategy 3: ON-OPEN — when a thread is opened, immediately check if the
  //   latest message is from the other person (reply already arrived).

  let replyObserver    = null;
  let lastInboundCount = 0;
  let messagedContacts = [];           // contacts with status "Messaged" from API
  let lastReplyPollTime = 0;
  let detectedReplies  = new Set();    // linkedin_urls we already detected as replied

  // ── Load contacts with status "Messaged" from the dashboard API ───────────
  // Routes through background.js to avoid CORS blocking on linkedin.com
  async function loadMessagedContacts() {
    try {
      const res = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: "FETCH_CONTACTS", status: "Messaged" }, resolve);
      });
      if (!res?.success) return;
      messagedContacts = (res.data || []).map(c => ({
        linkedin_url: c.linkedin_url,
        name: c.name,
      }));
      console.log("[LF] Loaded", messagedContacts.length, "messaged contacts for reply detection");
    } catch (_) {}
  }

  // ── Count inbound messages in the currently open thread ───────────────────
  function countInboundMessages(container) {
    const headerLink = document.querySelector(".msg-thread__link-to-profile");
    const otherPersonUrl = headerLink?.getAttribute("href") || "";
    if (!otherPersonUrl) return 0;

    const items = container.querySelectorAll(":scope > li.msg-s-message-list__event");
    let count = 0;
    for (const li of items) {
      const senderLink = li.querySelector('a[href*="/in/"]');
      if (!senderLink) continue;
      const senderUrl = senderLink.getAttribute("href") || "";
      if (senderUrl === otherPersonUrl) count++;
    }
    return count;
  }

  // ── Strategy 1: Real-time MutationObserver on open thread ─────────────────
  function watchForReplies() {
    const container = document.querySelector(".msg-s-message-list-content");
    if (!container) { setTimeout(watchForReplies, 1200); return; }

    lastInboundCount = countInboundMessages(container);

    replyObserver?.disconnect();
    replyObserver = new MutationObserver(() => {
      const n = countInboundMessages(container);
      if (n > lastInboundCount) {
        lastInboundCount = n;
        const headerLink = document.querySelector(".msg-thread__link-to-profile");
        const href = headerLink?.getAttribute("href") || "";
        const m = href.match(/\/in\/([^/?#]+)/);
        const linkedinUrl = m ? "https://www.linkedin.com/in/" + m[1] + "/" : null;
        const name = cleanMsgName(headerLink?.textContent);
        if (linkedinUrl) {
          detectedReplies.add(linkedinUrl);
          saveContact({
            linkedin_url: linkedinUrl,
            name: name || "Unknown",
            status: "Replied",
            last_replied_at: new Date().toISOString(),
          }, `↩️ Reply from ${name || "contact"} tracked!`);
        }
      }
    });
    replyObserver.observe(container, { childList: true, subtree: true });
    console.log("[LF] Watching for replies (inbound:", lastInboundCount, ")");
  }

  // ── Strategy 3: On-open thread check — detect reply that already arrived ──
  function checkOpenThreadForReply() {
    const container = document.querySelector(".msg-s-message-list-content");
    if (!container) return;

    const headerLink = document.querySelector(".msg-thread__link-to-profile");
    const href = headerLink?.getAttribute("href") || "";
    const m = href.match(/\/in\/([^/?#]+)/);
    if (!m) return;
    const linkedinUrl = "https://www.linkedin.com/in/" + m[1] + "/";

    // Skip if already detected or not in our messaged list
    if (detectedReplies.has(linkedinUrl)) return;
    const isMessaged = messagedContacts.some(c => c.linkedin_url === linkedinUrl);
    if (!isMessaged) return;

    // Check if the latest message in the thread is from the other person
    const events = [...container.querySelectorAll(":scope > li.msg-s-message-list__event")];
    const lastEvent = events[events.length - 1];
    if (!lastEvent) return;

    const lastSenderLink = lastEvent.querySelector('a[href*="/in/"]');
    if (!lastSenderLink) return;
    const lastSenderUrl = lastSenderLink.getAttribute("href") || "";

    if (lastSenderUrl === href) {
      // Last message is from the other person — they replied!
      const name = cleanMsgName(headerLink?.textContent);
      detectedReplies.add(linkedinUrl);
      console.log("[LF] ✓ Reply detected (on-open):", name, linkedinUrl);
      saveContact({
        linkedin_url: linkedinUrl,
        name: name || "Unknown",
        status: "Replied",
        last_replied_at: new Date().toISOString(),
      }, `↩️ Reply from ${name || "contact"} tracked!`);
      // Remove from messaged list so we don't re-detect
      messagedContacts = messagedContacts.filter(c => c.linkedin_url !== linkedinUrl);
    }
  }

  // ── Strategy 2: Sidebar Scanner — scan ALL conversations in sidebar ───────
  // The sidebar shows a snippet for each conversation:
  //   "You: Hey" = you sent the last message (no reply yet)
  //   "Arockiya: How are you?" = they replied (first name prefix, not "You:")
  // Cross-reference against our "Messaged" contacts to detect replies.
  async function scanMessagingSidebar() {
    if (!isMessagingPage()) return;
    if (messagedContacts.length === 0) await loadMessagedContacts();
    if (messagedContacts.length === 0) return;

    const convos = document.querySelectorAll(".msg-conversation-listitem");
    if (convos.length === 0) return;

    for (const convo of convos) {
      const nameEl = convo.querySelector('[class*="participant-names"]');
      const snippetEl = convo.querySelector('[class*="message-snippet"], [class*="snippet"]');
      if (!nameEl || !snippetEl) continue;

      const fullName = nameEl.textContent.trim();
      const snippet  = snippetEl.textContent.trim();

      // Skip if YOU sent the last message or it's a sponsored message
      if (snippet.startsWith("You:")) continue;
      if (snippet.toLowerCase().includes("sponsored")) continue;

      // The snippet starts with the other person's first name + ":"
      // e.g., "Arockiya: How are you?" or "Dhoulath: Hello"
      const firstName = fullName.split(" ")[0];
      if (!snippet.startsWith(firstName + ":")) continue;

      // Match against our "Messaged" contacts by name
      // DB names may have dirty suffixes (e.g. "Dhoulath J Status is reachable Mobile • 10h ago")
      // so we need flexible matching.
      const matchedContact = messagedContacts.find(c => {
        if (!c.name) return false;
        // Clean the DB name by stripping known status suffixes
        const cleanDbName = c.name
          .replace(/\s*(Status is .+|Active now|Mobile\s*[•·].*|Last active .+|Reachable via .+)$/i, "")
          .replace(/\s*(She\/Her|He\/Him|They\/Them)\s*$/i, "")
          .trim();
        // Try exact match (clean or raw)
        if (c.name === fullName || cleanDbName === fullName) return true;
        // Try first-name match (most reliable for dirty names)
        const cFirst = cleanDbName.split(" ")[0];
        if (cFirst === firstName) {
          // First names match — verify with at least first char of second word
          const cParts = cleanDbName.split(" ");
          const fParts = fullName.split(" ");
          if (cParts.length >= 2 && fParts.length >= 2 &&
              cParts[1][0] === fParts[1][0]) return true;
          // If only one word in either, first-name alone is enough
          if (cParts.length === 1 || fParts.length === 1) return true;
        }
        return false;
      });

      if (!matchedContact) continue;
      if (detectedReplies.has(matchedContact.linkedin_url)) continue;

      // We have a match! This person replied.
      detectedReplies.add(matchedContact.linkedin_url);
      console.log("[LF] ✓ Reply detected (sidebar scan):", fullName, matchedContact.linkedin_url);
      saveContact({
        linkedin_url: matchedContact.linkedin_url,
        name: fullName || matchedContact.name,
        status: "Replied",
        last_replied_at: new Date().toISOString(),
      }, `↩️ Reply from ${fullName || "contact"} tracked!`);
      // Remove from messaged list so we don't re-detect
      messagedContacts = messagedContacts.filter(c => c.linkedin_url !== matchedContact.linkedin_url);
    }
  }

  // ── Periodic reply polling — runs on any LinkedIn page ────────────────────
  // Throttled to once per 2 minutes. On messaging pages, also scans sidebar.
  async function pollForReplies() {
    const now = Date.now();
    if (now - lastReplyPollTime < 120000) return; // max once per 2 min
    lastReplyPollTime = now;

    if (isMessagingPage()) {
      await scanMessagingSidebar();
    }
  }

  // ── Init reply detection ──────────────────────────────────────────────────
  if (isMessagingPage()) {
    setTimeout(watchForReplies, 1500);
    setTimeout(async () => {
      await loadMessagedContacts();
      checkOpenThreadForReply();
      scanMessagingSidebar();
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── CONNECTION ACCEPTANCE DETECTION ──────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  let pendingContacts    = [];
  let acceptanceObserver = null;

  // Routes through background.js to avoid CORS blocking on linkedin.com
  async function loadPendingContacts() {
    try {
      const res = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: "FETCH_CONTACTS", status: "Pending" }, resolve);
      });
      if (!res?.success) return;
      pendingContacts = (res.data || []).map(c => ({
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

  // Check if a profile page shows "connected" state by scanning ALL buttons/links
  // on the page (not relying on old container class names that LinkedIn removed).
  function isNowConnected() {
    const allBtns = document.querySelectorAll("button, a");
    let hasMessage = false, hasConnect = false, hasPending = false;
    for (const btn of allBtns) {
      const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
      const text = btn.textContent.replace(/\s+/g, " ").trim().toLowerCase();
      // Only check buttons near the top of the page (skip similar profiles at bottom)
      const rect = btn.getBoundingClientRect();
      if (rect.top > 600) continue; // skip anything far down the page
      if (aria.match(/\bmessage\b/) || text === "message") hasMessage = true;
      if (aria.match(/\bconnect\b/) || aria.includes("invite") || text === "connect") hasConnect = true;
      if (aria.includes("pending") || text === "pending") hasPending = true;
    }
    return hasMessage && !hasConnect && !hasPending;
  }

  function watchProfileForAcceptance(profileUrl) {
    acceptanceObserver?.disconnect();
    // Observe the entire main content area since LinkedIn uses obfuscated classes
    const actionArea = document.querySelector("main") || document.body;

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

  // ─── Periodic acceptance polling ──────────────────────────────────────────
  // Poll the API every 5 minutes to check if any pending contacts were accepted.
  // This catches acceptances that happen while the user is on any LinkedIn page
  // (not just the specific profile page or notifications).
  let lastPollTime = 0;
  async function pollForAcceptances() {
    if (pendingContacts.length === 0) return;
    const now = Date.now();
    if (now - lastPollTime < 300000) return; // max once per 5 min
    lastPollTime = now;

    try {
      const res = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: "FETCH_CONTACTS", status: "Pending" }, resolve);
      });
      if (!res?.success) return;
      const currentPending = (res.data || []).map(c => c.linkedin_url);
      // Any contact that was in our local pendingContacts but is no longer Pending
      // in the API has been accepted (or status changed externally)
      for (const pc of pendingContacts) {
        if (!currentPending.includes(pc.linkedin_url)) {
          console.log("[LF] ✓ Acceptance detected (poll):", pc.name);
          pendingContacts = pendingContacts.filter(c => c.linkedin_url !== pc.linkedin_url);
        }
      }
      // Refresh our local list
      pendingContacts = (res.data || []).map(c => ({
        linkedin_url: c.linkedin_url,
        name: c.name,
      }));
    } catch (_) {}
  }

  // Notification page watcher — scan /notifications/ page for acceptance text
  function scanNotificationsPage() {
    if (!window.location.pathname.startsWith("/notifications")) return;
    setTimeout(async () => {
      if (pendingContacts.length === 0) await loadPendingContacts();
      if (pendingContacts.length === 0) return;

      const allLinks = document.querySelectorAll('a[href*="/in/"]');
      for (const link of allLinks) {
        const container = link.closest("li") || link.closest("div") || link.parentElement;
        const text = container?.textContent?.toLowerCase() || "";
        if (!text.includes("accepted")) continue;
        const href = link.getAttribute("href") || "";
        const m = href.match(/\/in\/([^/?#]+)/);
        if (!m) continue;
        const profileUrl = "https://www.linkedin.com/in/" + m[1] + "/";
        const pending = pendingContacts.find(c => c.linkedin_url === profileUrl);
        if (!pending) continue;
        console.log("[LF] ✓ Acceptance via notifications page:", profileUrl);
        saveContact({
          linkedin_url: profileUrl,
          name: pending.name,
          status: "Connected",
        }, `🤝 ${pending.name} accepted your request!`);
        pendingContacts = pendingContacts.filter(c => c.linkedin_url !== profileUrl);
      }
    }, 2000);
  }

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

  // ─── Shadow DOM click handler for messaging overlay ────────────────────────
  // LinkedIn renders the messaging overlay (InMail compose, mini chat bubbles)
  // inside a shadow root at div.theme--light. Clicks inside the shadow DOM
  // don't propagate to document-level listeners, so we attach a separate one.
  let shadowClickAttached = false;
  function attachShadowClickListener() {
    if (shadowClickAttached) return;
    const shadowHost = document.querySelector(".theme--light");
    const sr = shadowHost?.shadowRoot;
    if (!sr) return;
    shadowClickAttached = true;

    sr.addEventListener("click", (e) => {
      const found = findActionButton(e.target);
      if (!found) return;

      const { el, kind } = found;
      const now = new Date().toISOString();

      if (kind === "send") {
        // Try to find recipient from the overlay bubble in shadow DOM
        const bubble = el.closest?.(".msg-overlay-conversation-bubble");
        let recipient = extractRecipientFromBubble(bubble);

        // Fallback: search shadow DOM thread selectors
        if (!recipient?.linkedin_url) {
          const participant = getMessagingParticipant();
          if (participant?.linkedinUrl) {
            recipient = { linkedin_url: participant.linkedinUrl, name: participant.name };
          }
        }

        if (recipient?.linkedin_url) {
          console.log("[LF] ✓ Message SENT (shadow overlay) →", recipient.linkedin_url);
          showPendingToast(`💬 Tracking message to ${recipient.name || "contact"}…`);
          setTimeout(() => saveContact({
            linkedin_url: recipient.linkedin_url,
            name: recipient.name || "Unknown",
            status: "Messaged",
            last_messaged_at: now,
          }, `💬 Message to ${recipient.name || "contact"} tracked!`), 300);
        } else {
          console.warn("[LF] Shadow send clicked but couldn't identify recipient");
        }
        return;
      }

      if (kind === "send-message") {
        console.log("[LF] Shadow message button clicked — waiting for actual Send…");
        return;
      }
    }, true);

    console.log("[LF] Shadow DOM click listener attached");
  }

  // Poll for shadow root since it may not exist immediately
  function waitForShadowRoot() {
    if (shadowClickAttached) return;
    const shadowHost = document.querySelector(".theme--light");
    if (shadowHost?.shadowRoot) {
      attachShadowClickListener();
    } else {
      setTimeout(waitForShadowRoot, 1500);
    }
  }
  setTimeout(waitForShadowRoot, 1000);

  // ─── SPA navigation watcher ────────────────────────────────────────────────
  let lastPath = location.pathname;
  let lastThreadId = null; // track thread changes within /messaging/
  setInterval(() => {
    const currentPath = location.pathname;
    const pathChanged = currentPath !== lastPath;

    if (pathChanged) {
      lastPath = currentPath;

      replyObserver?.disconnect();    replyObserver    = null; lastInboundCount = 0;
      acceptanceObserver?.disconnect(); acceptanceObserver = null;

      if (isMessagingPage()) {
        setTimeout(watchForReplies, 1500);
        setTimeout(() => { checkOpenThreadForReply(); scanMessagingSidebar(); }, 3000);
      }
      if (isProfilePage()) {
        setTimeout(checkProfileForAcceptance, 1500);
        setTimeout(enrichProfileIfTracked, 3500);
      }
      if (currentPath.startsWith("/mynetwork"))          setTimeout(scanMyNetworkPage,         1000);
      if (currentPath.startsWith("/notifications"))      scanNotificationsPage();
    }

    // Detect thread switches within messaging (URL changes from one thread to another)
    if (isMessagingPage()) {
      const threadMatch = currentPath.match(/\/messaging\/thread\/([^/]+)/);
      const currentThread = threadMatch ? threadMatch[1] : null;
      if (currentThread && currentThread !== lastThreadId) {
        lastThreadId = currentThread;
        if (!pathChanged) {
          // Thread changed within messaging page (SPA navigation)
          replyObserver?.disconnect(); replyObserver = null; lastInboundCount = 0;
          setTimeout(watchForReplies, 1500);
          setTimeout(checkOpenThreadForReply, 2500);
        }
      }
    }

    // Periodic polls on any page
    pollForAcceptances();
    pollForReplies();
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

  // ─── Profile Enrichment ────────────────────────────────────────────────────
  // When visiting a profile page, if the contact is already tracked but missing
  // role/company, re-extract profile data and push an update.
  async function enrichProfileIfTracked() {
    if (!isProfilePage()) return;
    const profileUrl = currentProfileUrl();
    if (!profileUrl) return;

    // Wait for page to fully load profile data
    await new Promise(r => setTimeout(r, 2000));

    const prof = extractProfile();
    if (!prof.role && !prof.company) return; // nothing to enrich with

    // Only send enrichment — don't set status (let API keep existing status)
    // saveContact won't downgrade status since the API handles status ordering
    console.log("[LF] Enriching profile:", prof.name, "role:", prof.role, "company:", prof.company);
    saveContact({
      linkedin_url: profileUrl,
      name: prof.name || "Unknown",
      status: "Pending",           // lowest rank — API will keep existing higher status
      role: prof.role,
      company: prof.company,
      location: prof.location,
      profile_image: prof.profile_image,
    });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  setTimeout(loadPendingContacts, 2000);
  // Reply detection init is handled above (watchForReplies + loadMessagedContacts + sidebar scan)
  if (isProfilePage()) {
    setTimeout(checkProfileForAcceptance, 2500);
    setTimeout(enrichProfileIfTracked, 4000);
  }
  if (location.pathname.startsWith("/mynetwork"))     setTimeout(scanMyNetworkPage,         2000);
  if (location.pathname.startsWith("/notifications")) setTimeout(scanNotificationsPage,     2000);

  console.log("[LF] v2.7 loaded on", location.pathname);
})();
