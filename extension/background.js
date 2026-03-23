// MeetMind Background Service Worker (Manifest V3)
// Uses offscreen document for MediaRecorder (required in MV3)

const BACKEND_URL = 'http://localhost:3000';

let recordingState = {
  isRecording: false,
  isProcessing: false,
  startTime: null,
  meetingTitle: 'Google Meet',
  tabId: null,
  meetingId: null,
};

// ── Message router ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStatus') {
    sendResponse({
      isRecording: recordingState.isRecording,
      isProcessing: recordingState.isProcessing,
      meetingTitle: recordingState.meetingTitle,
      startTime: recordingState.startTime,
      meetingId: recordingState.meetingId,
    });
    return true;
  }

  if (message.action === 'startRecording') {
    startRecording(message.tabId, message.meetingTitle)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'stopRecording') {
    stopRecording()
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'meetingMetadata') {
    if (recordingState.isRecording && message.title) {
      recordingState.meetingTitle = message.title;
    }
    return false;
  }

  // Relay messages from offscreen document to popup
  if (message.action === 'uploadComplete') {
    recordingState.isProcessing = false;
    chrome.runtime.sendMessage({ action: 'uploadComplete', meetingId: message.meetingId }).catch(() => {});
    return false;
  }

  if (message.action === 'uploadError') {
    recordingState.isProcessing = false;
    chrome.runtime.sendMessage({ action: 'uploadError', error: message.error }).catch(() => {});
    return false;
  }
});

// ── Recording start ───────────────────────────────────────────────────────────

async function startRecording(tabId, meetingTitle) {
  if (recordingState.isRecording) {
    return { success: false, error: 'Already recording' };
  }

  try {
    // 1. Register meeting with backend — get meetingId before audio starts
    const res = await fetch(`${BACKEND_URL}/api/meetings/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meetingTitle || 'Google Meet',
        date: new Date().toISOString(),
        participants: [],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Backend error: HTTP ${res.status}`);
    }

    const { meetingId } = await res.json();
    console.log('[Background] Meeting registered:', meetingId);

    // 2. Get stream ID from tab (must happen in service worker, not offscreen)
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(id);
        }
      });
    });

    // 3. Ensure offscreen document exists
    await ensureOffscreenDocument();

    // 4. Start recording in offscreen document
    const offRes = await chrome.runtime.sendMessage({
      action: 'startRecording',
      target: 'offscreen',
      streamId,
      meetingId,
      backendUrl: BACKEND_URL,
    });

    if (!offRes?.success) {
      throw new Error(offRes?.error || 'Failed to start recorder');
    }

    recordingState = {
      isRecording: true,
      isProcessing: false,
      startTime: Date.now(),
      meetingTitle: meetingTitle || 'Google Meet',
      tabId,
      meetingId,
    };

    // Watch for tab close or navigation away from Meet
    chrome.tabs.onRemoved.addListener(onTabClose);
    chrome.tabs.onUpdated.addListener(onTabUpdate);

    console.log('[Background] Recording started');
    return { success: true, meetingId };
  } catch (error) {
    console.error('[Background] Start failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ── Recording stop ────────────────────────────────────────────────────────────

async function stopRecording() {
  if (!recordingState.isRecording) {
    return { success: false, error: 'Not recording' };
  }

  chrome.tabs.onRemoved.removeListener(onTabClose);
  chrome.tabs.onUpdated.removeListener(onTabUpdate);

  recordingState.isRecording = false;
  recordingState.isProcessing = true;

  const duration = Math.floor((Date.now() - recordingState.startTime) / 1000);

  try {
    const offRes = await chrome.runtime.sendMessage({
      action: 'stopRecording',
      target: 'offscreen',
      duration,
      meetingTitle: recordingState.meetingTitle,
    });

    if (!offRes?.success) {
      recordingState.isProcessing = false;
      return { success: false, error: offRes?.error || 'Stop failed' };
    }

    return { success: true };
  } catch (error) {
    recordingState.isProcessing = false;
    return { success: false, error: error.message };
  }
}

// ── Offscreen document management ─────────────────────────────────────────────

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  });

  if (existing.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Recording Google Meet audio for AI transcription',
  });

  console.log('[Background] Offscreen document created');
}

// ── Tab event handlers ────────────────────────────────────────────────────────

function onTabClose(tabId) {
  if (tabId === recordingState.tabId && recordingState.isRecording) {
    console.log('[Background] Meet tab closed — stopping recording');
    stopRecording().catch(console.error);
  }
}

function onTabUpdate(tabId, changeInfo) {
  if (
    tabId === recordingState.tabId &&
    recordingState.isRecording &&
    changeInfo.url &&
    !changeInfo.url.includes('meet.google.com')
  ) {
    console.log('[Background] Navigated away from Meet — stopping recording');
    stopRecording().catch(console.error);
  }
}
