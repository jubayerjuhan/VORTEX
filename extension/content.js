// MeetMind content script — runs on meet.google.com

let lastSentTitle = '';
let metadataInterval = null;

// ── Title extraction ──────────────────────────────────────────────────────────

function getMeetingTitle() {
  // Ordered by reliability — most specific first
  const strategies = [
    // Meeting code from URL (always available)
    () => {
      const match = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
      return match ? null : null; // Only use as last resort
    },
    // Various Meet UI selectors (Google updates these periodically)
    () => document.querySelector('[data-meeting-title]')?.textContent?.trim(),
    () => document.querySelector('.u6vdEc')?.textContent?.trim(),
    () => document.querySelector('[jsname="r4nke"]')?.textContent?.trim(),
    () => document.querySelector('.rG0ybd')?.textContent?.trim(),
    () => document.querySelector('.NzPR9b')?.textContent?.trim(),
    () => document.querySelector('[data-call-ended="false"] [jsname="jzA8Ge"]')?.textContent?.trim(),
    // Page title fallback
    () => {
      const t = document.title;
      return t && t !== 'Google Meet'
        ? t.replace(' – Google Meet', '').replace(' - Google Meet', '').trim()
        : null;
    },
    // Meeting code from URL as last resort
    () => {
      const match = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
      return match ? `Meeting ${match[1].toUpperCase()}` : null;
    },
  ];

  for (const strategy of strategies) {
    try {
      const result = strategy();
      if (result && result.length > 0 && result !== 'Google Meet') return result;
    } catch {}
  }

  return 'Google Meet';
}

// ── Participant extraction ────────────────────────────────────────────────────

function getParticipants() {
  const seen = new Set();
  const participants = [];

  const selectors = [
    '[data-participant-id] .zWGUib',
    '[data-participant-id] .KV1GEc',
    '.cS7aqe [data-self-name]',
    '[aria-label*="participant"] span',
  ];

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((el) => {
      const name = el.textContent?.trim();
      if (name && name.length > 0 && name.length < 60 && !seen.has(name)) {
        seen.add(name);
        participants.push(name);
      }
    });
    if (participants.length > 0) break;
  }

  return participants;
}

// ── Send metadata to background ───────────────────────────────────────────────

function sendMetadata() {
  const title = getMeetingTitle();
  const participants = getParticipants();

  if (title !== lastSentTitle) {
    lastSentTitle = title;
    console.log('[MeetMind] Detected title:', title);
  }

  chrome.runtime.sendMessage({
    action: 'meetingMetadata',
    title,
    participants,
    url: window.location.href,
  }).catch(() => {}); // SW may not be awake yet
}

// ── Initialization ────────────────────────────────────────────────────────────

function init() {
  console.log('[MeetMind] Content script active on:', window.location.href);

  // Wait for Meet UI to render, then send
  setTimeout(sendMetadata, 2000);
  setTimeout(sendMetadata, 5000); // Second attempt in case Meet is slow

  // Periodic updates
  metadataInterval = setInterval(sendMetadata, 10000);

  // Watch for title changes via DOM mutations
  const observer = new MutationObserver(() => {
    const title = getMeetingTitle();
    if (title !== lastSentTitle) sendMetadata();
  });

  observer.observe(document.head, { childList: true, subtree: true });
  observer.observe(document.body, { childList: true, subtree: false, attributes: false });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', () => {
  if (metadataInterval) clearInterval(metadataInterval);
});
