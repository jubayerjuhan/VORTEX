// Offscreen document — handles MediaRecorder (cannot run in service worker)

let mediaRecorder = null;
let stream = null;
let meetingId = null;
let backendUrl = null;
let chunkIndex = 0;
let pendingChunks = [];
let isSending = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;

  if (message.action === 'startRecording') {
    startRecording(message.streamId, message.meetingId, message.backendUrl)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'stopRecording') {
    stopRecording(message.duration, message.meetingTitle)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function startRecording(streamId, mId, bUrl) {
  meetingId = mId;
  backendUrl = bUrl;
  chunkIndex = 0;
  pendingChunks = [];
  isSending = false;

  // Get stream from tab capture stream ID
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  // Pick best codec
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    .find((t) => MediaRecorder.isTypeSupported(t)) || '';

  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      const idx = chunkIndex++;
      pendingChunks.push({ data: event.data, index: idx });
      sendNextChunk();
    }
  };

  mediaRecorder.onerror = (event) => {
    console.error('[Offscreen] MediaRecorder error:', event.error);
  };

  // Collect + send a chunk every 30 seconds
  mediaRecorder.start(30000);
  console.log('[Offscreen] Recording started, meetingId:', meetingId);
  return { success: true };
}

async function sendNextChunk() {
  if (isSending || pendingChunks.length === 0) return;
  isSending = true;

  while (pendingChunks.length > 0) {
    const { data, index } = pendingChunks[0];
    let success = false;
    let attempts = 0;

    while (!success && attempts < 5) {
      try {
        const formData = new FormData();
        formData.append('chunk', data, `chunk-${index}.webm`);
        formData.append('meetingId', meetingId);
        formData.append('chunkIndex', String(index));

        const res = await fetch(`${backendUrl}/api/meetings/chunks`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log(`[Offscreen] Chunk ${index} sent (${data.size} bytes)`);
        success = true;
      } catch (err) {
        attempts++;
        console.warn(`[Offscreen] Chunk ${index} failed (attempt ${attempts}):`, err.message);
        if (attempts < 5) await sleep(1000 * attempts);
      }
    }

    if (success) {
      pendingChunks.shift();
    } else {
      console.error(`[Offscreen] Chunk ${index} permanently failed after 5 attempts`);
      pendingChunks.shift(); // Drop and continue
    }
  }

  isSending = false;
}

function stopRecording(duration, meetingTitle) {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve({ success: false, error: 'Recorder not active' });
      return;
    }

    mediaRecorder.onstop = async () => {
      // Stop all tracks
      stream?.getTracks().forEach((t) => t.stop());

      // Wait for all in-flight chunks to finish sending
      let waited = 0;
      while ((isSending || pendingChunks.length > 0) && waited < 30000) {
        await sleep(200);
        waited += 200;
      }

      // Finalize with backend
      try {
        const res = await fetch(`${backendUrl}/api/meetings/${meetingId}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration, title: meetingTitle }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        chrome.runtime.sendMessage({ action: 'uploadComplete', meetingId: data.meetingId }).catch(() => {});
        resolve({ success: true });
      } catch (error) {
        console.error('[Offscreen] Finalize failed:', error);
        chrome.runtime.sendMessage({ action: 'uploadError', error: error.message }).catch(() => {});
        resolve({ success: false, error: error.message });
      }
    };

    mediaRecorder.stop();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
