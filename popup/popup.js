let recordingState = null;
let timerInterval = null;
let startTime = null;

document.addEventListener('DOMContentLoaded', () => {
  loadRecordingState();
  loadRecentRecordings();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('toggle-recording').addEventListener('click', toggleRecording);
  document.getElementById('open-sidebar').addEventListener('click', openSidebar);
  document.getElementById('import-recording').addEventListener('click', importRecording);
  document.getElementById('settings-link').addEventListener('click', openSettings);
  document.getElementById('help-link').addEventListener('click', openHelp);
  
  document.getElementById('file-input').addEventListener('change', handleFileImport);
}

function loadRecordingState() {
  chrome.runtime.sendMessage({ action: 'getRecordingState' }, (state) => {
    if (chrome.runtime.lastError) {
      console.error('Runtime error:', chrome.runtime.lastError);
      return;
    }
    recordingState = state || { isRecording: false };
    updateUI();
  });
}

function loadRecentRecordings() {
  chrome.runtime.sendMessage({ action: 'getRecordings' }, (recordings) => {
    if (chrome.runtime.lastError) {
      console.error('Runtime error:', chrome.runtime.lastError);
      return;
    }
    displayRecordings(recordings || []);
  });
}

function updateUI() {
  const toggleBtn = document.getElementById('toggle-recording');
  const recordingText = document.getElementById('recording-text');
  const statusSection = document.getElementById('recording-status');
  
  if (recordingState && recordingState.isRecording) {
    toggleBtn.classList.add('recording');
    recordingText.textContent = 'Stop Recording';
    statusSection.style.display = 'block';
    
    if (!timerInterval) {
      startTime = recordingState.startTime;
      startTimer();
    }
  } else {
    toggleBtn.classList.remove('recording');
    recordingText.textContent = 'Start Recording';
    statusSection.style.display = 'none';
    stopTimer();
  }
}

function toggleRecording() {
  if (recordingState && recordingState.isRecording) {
    chrome.runtime.sendMessage({ action: 'stopRecording' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        return;
      }
      if (response && response.success) {
        recordingState.isRecording = false;
        updateUI();
        loadRecentRecordings();
      }
    });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          return;
        }
        if (response && response.success) {
          recordingState = { isRecording: true, startTime: Date.now() };
          updateUI();
        }
      });
    });
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / 60000);
    document.getElementById('recording-time').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function displayRecordings(recordings) {
  const container = document.getElementById('recent-recordings');
  
  if (recordings.length === 0) {
    container.innerHTML = '<div class="empty-state">No recordings yet</div>';
    return;
  }
  
  const recent = recordings.slice(-3).reverse();
  container.innerHTML = recent.map(recording => `
    <div class="recording-item" data-id="${recording.id}">
      <div class="recording-info">
        <div class="recording-name">${recording.name}</div>
        <div class="recording-meta">${formatDuration(recording.duration)} · ${recording.events?.length || 0} events</div>
      </div>
      <div class="recording-actions">
        <button class="icon-btn play-btn" title="Play">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
          </svg>
        </button>
        <button class="icon-btn export-btn" title="Export">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
  
  container.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.closest('.recording-item').dataset.id;
      playRecording(id, recordings);
    });
  });
  
  container.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.closest('.recording-item').dataset.id;
      exportRecording(id);
    });
  });
}

function playRecording(id, recordings) {
  const recording = recordings.find(r => r.id === id);
  if (recording) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startPlayback',
        recording: recording
      });
      window.close();
    });
  }
}

function exportRecording(id) {
  chrome.runtime.sendMessage({ action: 'exportRecordings', ids: [id] }, (response) => {
    if (response.success) {
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

function openSidebar() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'openSidebar' });
    window.close();
  });
}

function importRecording() {
  document.getElementById('file-input').click();
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      chrome.runtime.sendMessage({ action: 'importRecordings', data: data }, (response) => {
        if (response.success) {
          loadRecentRecordings();
          alert(`Imported ${response.result.imported} recordings`);
        }
      });
    } catch (error) {
      alert('Invalid recording file');
    }
  };
  reader.readAsText(file);
  
  e.target.value = '';
}

function openSettings() {
  // For now, just show an alert since we don't have an options page
  alert('Settings functionality coming soon!');
}

function openHelp() {
  chrome.tabs.create({ url: 'https://github.com/yourusername/browser-recorder#readme' });
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}