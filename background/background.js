// Storage Manager
class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'browser_recorder_data';
  }

  async initialize() {
    const data = await this.getData();
    if (!data.recordings) {
      await this.setData({
        recordings: [],
        settings: {
          hotkey: 'Ctrl+Shift+R',
          playbackSpeed: 'real-time',
          autoExport: false
        }
      });
    }
  }

  async getData() {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || {};
  }

  async setData(data) {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
  }

  async getRecordings() {
    const data = await this.getData();
    return data.recordings || [];
  }

  async saveRecording(recording) {
    const data = await this.getData();
    data.recordings.push(recording);
    await this.setData(data);
    return recording;
  }

  async deleteRecording(id) {
    const data = await this.getData();
    data.recordings = data.recordings.filter(r => r.id !== id);
    await this.setData(data);
  }

  async updateRecording(id, updates) {
    const data = await this.getData();
    const index = data.recordings.findIndex(r => r.id === id);
    if (index !== -1) {
      data.recordings[index] = { ...data.recordings[index], ...updates };
      await this.setData(data);
      return data.recordings[index];
    }
    return null;
  }

  async getSettings() {
    const data = await this.getData();
    return data.settings || {};
  }

  async updateSettings(settings) {
    const data = await this.getData();
    data.settings = { ...data.settings, ...settings };
    await this.setData(data);
    return data.settings;
  }

  async getStorageUsage() {
    const data = await this.getData();
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    return {
      bytes,
      formatted: this.formatBytes(bytes),
      recordingCount: data.recordings?.length || 0
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async exportRecordings(recordingIds = null) {
    const recordings = await this.getRecordings();
    const toExport = recordingIds 
      ? recordings.filter(r => recordingIds.includes(r.id))
      : recordings;
    
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      recordings: toExport
    };
  }

  async importRecordings(importData) {
    if (!importData.recordings || !Array.isArray(importData.recordings)) {
      throw new Error('Invalid import data format');
    }

    const data = await this.getData();
    const existingIds = new Set(data.recordings.map(r => r.id));
    
    const newRecordings = importData.recordings.filter(r => !existingIds.has(r.id));
    data.recordings.push(...newRecordings);
    
    await this.setData(data);
    return {
      imported: newRecordings.length,
      skipped: importData.recordings.length - newRecordings.length
    };
  }
}

// Initialize storage manager
const storage = new StorageManager();

// Recording state
let recordingState = {
  isRecording: false,
  tabId: null,
  startTime: null,
  currentRecording: null
};

// Install handler
chrome.runtime.onInstalled.addListener(async () => {
  await storage.initialize();
  console.log('Browser Interaction Recorder installed');
});

// Command listener
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-recording') {
    toggleRecording();
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startRecording':
      if (sender.tab && sender.tab.id) {
        startRecording(sender.tab.id);
        sendResponse({ success: true });
      } else {
        // Get active tab if sender.tab is not available
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            startRecording(tabs[0].id);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        return true; // Keep message channel open for async response
      }
      break;
    
    case 'stopRecording':
      stopRecording().then(recording => {
        sendResponse({ success: true, recording });
      });
      return true;
    
    case 'pauseRecording':
      pauseRecording();
      sendResponse({ success: true });
      break;
    
    case 'resumeRecording':
      resumeRecording();
      sendResponse({ success: true });
      break;
    
    case 'addEvent':
      if (recordingState.isRecording && sender.tab && sender.tab.id === recordingState.tabId) {
        addEventToRecording(request.event);
      }
      sendResponse({ success: true });
      break;
    
    case 'getRecordingState':
      sendResponse(recordingState);
      break;
    
    case 'getRecordings':
      storage.getRecordings().then(recordings => {
        sendResponse(recordings);
      });
      return true;
    
    case 'deleteRecording':
      storage.deleteRecording(request.id).then(() => {
        sendResponse({ success: true });
      });
      return true;
    
    case 'updateRecording':
      storage.updateRecording(request.id, request.updates).then(recording => {
        sendResponse({ success: true, recording });
      });
      return true;
    
    case 'exportRecordings':
      storage.exportRecordings(request.ids).then(data => {
        sendResponse({ success: true, data });
      });
      return true;
    
    case 'importRecordings':
      storage.importRecordings(request.data).then(result => {
        sendResponse({ success: true, result });
      });
      return true;
    
    case 'getSettings':
      storage.getSettings().then(settings => {
        sendResponse(settings);
      });
      return true;
    
    case 'updateSettings':
      storage.updateSettings(request.settings).then(settings => {
        sendResponse({ success: true, settings });
      });
      return true;
    
    case 'playRecording':
      if (sender.tab && sender.tab.id) {
        playRecording(request.recording, sender.tab.id);
        sendResponse({ success: true });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            playRecording(request.recording, tabs[0].id);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        return true;
      }
      break;
    
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Toggle recording
async function toggleRecording() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (recordingState.isRecording) {
    await stopRecording();
  } else {
    await startRecording(tab.id);
  }
}

// Start recording
function startRecording(tabId) {
  recordingState = {
    isRecording: true,
    tabId: tabId,
    startTime: Date.now(),
    currentRecording: {
      id: generateId(),
      name: `Recording ${new Date().toLocaleString()}`,
      created: Date.now(),
      duration: 0,
      url: '',
      events: [],
      metadata: {}
    }
  };
  
  chrome.tabs.sendMessage(tabId, { 
    action: 'recordingStateChanged', 
    state: recordingState 
  });
  
  updateIcon(true);
}

// Stop recording
async function stopRecording() {
  if (!recordingState.isRecording) return null;
  
  recordingState.isRecording = false;
  recordingState.currentRecording.duration = Date.now() - recordingState.startTime;
  
  const recording = recordingState.currentRecording;
  await storage.saveRecording(recording);
  
  chrome.tabs.sendMessage(recordingState.tabId, { 
    action: 'recordingStateChanged', 
    state: { isRecording: false } 
  });
  
  updateIcon(false);
  recordingState = {
    isRecording: false,
    tabId: null,
    startTime: null,
    currentRecording: null
  };
  
  return recording;
}

// Pause recording
function pauseRecording() {
  if (recordingState.isRecording) {
    recordingState.isPaused = true;
    chrome.tabs.sendMessage(recordingState.tabId, { 
      action: 'recordingStateChanged', 
      state: recordingState 
    });
  }
}

// Resume recording
function resumeRecording() {
  if (recordingState.isRecording && recordingState.isPaused) {
    recordingState.isPaused = false;
    chrome.tabs.sendMessage(recordingState.tabId, { 
      action: 'recordingStateChanged', 
      state: recordingState 
    });
  }
}

// Add event to recording
function addEventToRecording(event) {
  if (recordingState.currentRecording && !recordingState.isPaused) {
    recordingState.currentRecording.events.push(event);
    
    if (!recordingState.currentRecording.url && event.url) {
      recordingState.currentRecording.url = event.url;
    }
    
    if (!recordingState.currentRecording.metadata.userAgent && event.userAgent) {
      recordingState.currentRecording.metadata.userAgent = event.userAgent;
    }
    
    if (!recordingState.currentRecording.metadata.viewport && event.viewport) {
      recordingState.currentRecording.metadata.viewport = event.viewport;
    }
  }
}

// Play recording
function playRecording(recording, tabId) {
  chrome.tabs.sendMessage(tabId, {
    action: 'startPlayback',
    recording: recording
  });
}

// Update icon
function updateIcon(isRecording) {
  const iconPath = isRecording ? {
    16: 'assets/icons/icon-recording-16.png',
    48: 'assets/icons/icon-recording-48.png',
    128: 'assets/icons/icon-recording-128.png'
  } : {
    16: 'assets/icons/icon-16.png',
    48: 'assets/icons/icon-48.png',
    128: 'assets/icons/icon-128.png'
  };
  
  chrome.action.setIcon({ path: iconPath });
}

// Generate unique ID
function generateId() {
  return 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}