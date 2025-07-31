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

export default StorageManager;