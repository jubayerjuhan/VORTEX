const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');
const meetingTitleEl = document.getElementById('meetingTitle');
const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const messageBox = document.getElementById('messageBox');

let timerInterval = null;

function showMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
  messageBox.classList.remove('hidden');
}

function hideMessage() {
  messageBox.classList.add('hidden');
}

function setStatus(state, label, title = null) {
  statusDot.className = 'status-dot ' + state;
  statusLabel.textContent = label;

  if (title) {
    meetingTitleEl.textContent = title;
    meetingTitleEl.classList.remove('hidden');
  } else {
    meetingTitleEl.classList.add('hidden');
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startTimer(startTime) {
  timerEl.classList.remove('hidden');
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = formatTime(elapsed);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerEl.classList.add('hidden');
}

async function updateUI() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.includes('meet.google.com')) {
      setStatus('gray', 'Not in a Google Meet');
      startBtn.classList.add('hidden');
      stopBtn.classList.add('hidden');
      stopTimer();
      return;
    }

    // Check recording state from background
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

    if (response && response.isRecording) {
      setStatus('green', 'Recording in progress', response.meetingTitle);
      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
      startTimer(response.startTime);
    } else if (response && response.isProcessing) {
      setStatus('blue', 'Processing meeting...', response.meetingTitle);
      startBtn.classList.add('hidden');
      stopBtn.classList.add('hidden');
      stopTimer();
      showMessage('Uploading and processing your meeting...', 'info');
    } else {
      // On meet.google.com, ready to record
      const title = await getMeetingTitle(tab.id);
      setStatus('yellow', 'In Google Meet — ready to record', title);
      startBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
      stopTimer();
    }
  } catch (error) {
    console.error('[Popup] Error updating UI:', error);
    setStatus('gray', 'Error loading status');
  }
}

async function getMeetingTitle(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const titleEl = document.querySelector('[data-meeting-title]') ||
                        document.querySelector('.u6vdEc') ||
                        document.querySelector('[jsname="r4nke"]') ||
                        document.querySelector('.rG0ybd');
        return titleEl ? titleEl.textContent.trim() : document.title.replace(' - Google Meet', '').trim();
      }
    });
    return results[0]?.result || 'Google Meet';
  } catch {
    return 'Google Meet';
  }
}

startBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const title = await getMeetingTitle(tab.id);

    startBtn.disabled = true;
    showMessage('Starting recording...', 'info');

    const response = await chrome.runtime.sendMessage({
      action: 'startRecording',
      tabId: tab.id,
      meetingTitle: title,
    });

    if (response && response.success) {
      hideMessage();
      updateUI();
    } else {
      showMessage(response?.error || 'Failed to start recording', 'error');
      startBtn.disabled = false;
    }
  } catch (error) {
    console.error('[Popup] Start error:', error);
    showMessage('Error: ' + error.message, 'error');
    startBtn.disabled = false;
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    stopBtn.disabled = true;
    showMessage('Stopping recording and uploading...', 'info');

    const response = await chrome.runtime.sendMessage({ action: 'stopRecording' });

    if (response && response.success) {
      showMessage('✓ Meeting saved! Transcription in progress — check the dashboard.', 'success');
    } else {
      showMessage(response?.error || 'Failed to stop recording', 'error');
    }

    stopTimer();
    stopBtn.disabled = false;
    updateUI();
  } catch (error) {
    console.error('[Popup] Stop error:', error);
    showMessage('Error: ' + error.message, 'error');
    stopBtn.disabled = false;
  }
});

// Listen for status updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'statusUpdate') {
    updateUI();
  }
  if (message.action === 'uploadComplete') {
    showMessage('Meeting uploaded successfully! Check the dashboard.', 'success');
    updateUI();
  }
  if (message.action === 'uploadError') {
    showMessage('Upload failed: ' + (message.error || 'Unknown error'), 'error');
    updateUI();
  }
});

// Initialize
updateUI();
