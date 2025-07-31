// Content scripts will be loaded in order through manifest.json

let recorder = null;
let player = null;
let sidebarInjected = false;

function initialize() {
  recorder = new Recorder();
  player = new Player();
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
  });
  
  injectSidebar();
  
  // Check if we're already recording when the page loads
  checkRecordingState();
}

function checkRecordingState() {
  chrome.runtime.sendMessage({ action: 'getRecordingState' }, (state) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting recording state:', chrome.runtime.lastError);
      return;
    }
    
    if (state && state.isRecording) {
      // We're in an active recording session, restore the state
      updateRecordingState(state);
      
      // Record navigation event if this is a new page
      if (recorder && window.location.href !== state.currentRecording?.url) {
        recorder.recordNavigationEvent();
      }
    }
  });
}

function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'recordingStateChanged':
        updateRecordingState(request.state);
        break;
      
      case 'startPlayback':
        startPlayback(request.recording);
        break;
      
      case 'stopPlayback':
        if (player) player.stop();
        break;
      
      case 'pausePlayback':
        if (player) player.pause();
        break;
      
      case 'resumePlayback':
        if (player) player.resume();
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

function updateRecordingState(state) {
  if (state.isRecording) {
    if (!recorder) recorder = new Recorder();
    
    // Only start recording if not already recording
    if (!recorder.isRecording) {
      recorder.start();
    }
    
    updateSidebarState('recording');
    
    // Update recording info in sidebar
    if (state.currentRecording) {
      const statusText = document.querySelector('.br-status-text');
      if (statusText) {
        statusText.textContent = `Recording: ${state.currentRecording.name}`;
      }
    }
  } else {
    if (recorder) recorder.stop();
    updateSidebarState('idle');
  }
  
  if (state.isPaused && recorder) {
    recorder.pause();
  } else if (!state.isPaused && recorder && recorder.isRecording) {
    recorder.resume();
  }
}

function startPlayback(recording) {
  if (!player) player = new Player();
  
  player.play(recording).then(() => {
    console.log('Playback completed');
  }).catch(error => {
    console.error('Playback failed:', error);
  });
}

function injectSidebar() {
  if (sidebarInjected) return;
  
  const sidebar = document.createElement('div');
  sidebar.className = 'browser-recorder-sidebar';
  sidebar.innerHTML = `
    <div class="br-sidebar-container">
      <div class="br-sidebar-header">
        <h3>Browser Recorder</h3>
        <button class="br-collapse-btn" title="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
        </button>
      </div>
      
      <div class="br-sidebar-content">
        <div class="br-controls">
          <button class="br-btn br-record-btn" id="br-record">
            <span class="br-record-icon"></span>
            Record
          </button>
          <button class="br-btn br-pause-btn" id="br-pause" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
            </svg>
            Pause
          </button>
          <button class="br-btn br-stop-btn" id="br-stop" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
            </svg>
            Stop
          </button>
        </div>
        
        <div class="br-status" id="br-status">
          <div class="br-status-text">Ready to record</div>
          <div class="br-status-time" id="br-time" style="display: none;">00:00</div>
        </div>
        
        <div class="br-section">
          <h4>History</h4>
          <div class="br-history" id="br-history">
            <div class="br-empty">No recordings yet</div>
          </div>
        </div>
        
        <div class="br-section br-settings">
          <h4>Settings</h4>
          <div class="br-setting">
            <label>Hotkey:</label>
            <span id="br-hotkey">Ctrl+Shift+R</span>
          </div>
          <div class="br-setting">
            <label>Playback:</label>
            <select id="br-playback-speed">
              <option value="real-time">Real-time</option>
              <option value="fast">Fast (2x)</option>
              <option value="instant">Instant</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(sidebar);
  sidebarInjected = true;
  
  setupSidebarEvents();
  loadRecordings();
  loadSettings();
}

function setupSidebarEvents() {
  const recordBtn = document.getElementById('br-record');
  const pauseBtn = document.getElementById('br-pause');
  const stopBtn = document.getElementById('br-stop');
  const collapseBtn = document.querySelector('.br-collapse-btn');
  const sidebar = document.querySelector('.browser-recorder-sidebar');
  
  recordBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error starting recording:', chrome.runtime.lastError);
      }
    });
  });
  
  pauseBtn.addEventListener('click', () => {
    const isPaused = pauseBtn.textContent.trim() === 'Pause';
    chrome.runtime.sendMessage({ 
      action: isPaused ? 'pauseRecording' : 'resumeRecording' 
    });
    pauseBtn.innerHTML = isPaused ? 
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/></svg> Resume' :
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/></svg> Pause';
  });
  
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopRecording' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error stopping recording:', chrome.runtime.lastError);
      }
    });
  });
  
  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
  
  document.getElementById('br-playback-speed').addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { playbackSpeed: e.target.value }
    });
  });
}

function updateSidebarState(state) {
  const recordBtn = document.getElementById('br-record');
  const pauseBtn = document.getElementById('br-pause');
  const stopBtn = document.getElementById('br-stop');
  const statusText = document.querySelector('.br-status-text');
  const timeDisplay = document.getElementById('br-time');
  
  // Check if sidebar elements exist (they might not be loaded yet)
  if (!recordBtn || !pauseBtn || !stopBtn || !statusText) {
    // Retry after a short delay
    setTimeout(() => updateSidebarState(state), 100);
    return;
  }
  
  switch (state) {
    case 'recording':
      recordBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      statusText.textContent = 'Recording...';
      statusText.classList.add('recording');
      if (timeDisplay) {
        timeDisplay.style.display = 'block';
        startTimer();
      }
      break;
    
    case 'idle':
      recordBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      statusText.textContent = 'Ready to record';
      statusText.classList.remove('recording');
      if (timeDisplay) {
        timeDisplay.style.display = 'none';
      }
      stopTimer();
      break;
  }
}

let timerInterval = null;
let startTime = null;

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / 60000);
    document.getElementById('br-time').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function loadRecordings() {
  chrome.runtime.sendMessage({ action: 'getRecordings' }, (recordings) => {
    displayRecordings(recordings || []);
  });
}

function displayRecordings(recordings) {
  const historyDiv = document.getElementById('br-history');
  
  if (recordings.length === 0) {
    historyDiv.innerHTML = '<div class="br-empty">No recordings yet</div>';
    return;
  }
  
  historyDiv.innerHTML = recordings.slice(-5).reverse().map(recording => `
    <div class="br-recording" data-id="${recording.id}">
      <div class="br-recording-info">
        <div class="br-recording-name">${recording.name}</div>
        <div class="br-recording-meta">${formatDuration(recording.duration)}</div>
      </div>
      <div class="br-recording-actions">
        <button class="br-icon-btn br-play" title="Play">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
          </svg>
        </button>
        <button class="br-icon-btn br-export" title="Export">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
          </svg>
        </button>
        <button class="br-icon-btn br-delete" title="Delete">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
  
  historyDiv.querySelectorAll('.br-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.br-recording').dataset.id;
      const recording = recordings.find(r => r.id === id);
      if (recording) {
        startPlayback(recording);
      }
    });
  });
  
  historyDiv.querySelectorAll('.br-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.br-recording').dataset.id;
      exportRecording(id);
    });
  });
  
  historyDiv.querySelectorAll('.br-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.br-recording').dataset.id;
      if (confirm('Delete this recording?')) {
        chrome.runtime.sendMessage({ action: 'deleteRecording', id }, () => {
          loadRecordings();
        });
      }
    });
  });
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

function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    if (settings) {
      document.getElementById('br-hotkey').textContent = settings.hotkey || 'Ctrl+Shift+R';
      document.getElementById('br-playback-speed').value = settings.playbackSpeed || 'real-time';
    }
  });
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}