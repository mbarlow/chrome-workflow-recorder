class Player {
  constructor() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.events = [];
    this.playbackSpeed = 'real-time';
    this.speedMultipliers = {
      'real-time': 1,
      'fast': 0.5,
      'instant': 0.1
    };
  }
  
  async play(recording, options = {}) {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.currentIndex = 0;
    this.events = recording.events || [];
    this.playbackSpeed = options.speed || 'real-time';
    
    this.showPlaybackIndicator();
    
    try {
      await this.playEvents();
    } catch (error) {
      console.error('Playback error:', error);
      this.showError(error.message);
    } finally {
      this.stop();
    }
  }
  
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.hidePlaybackIndicator();
  }
  
  pause() {
    this.isPaused = true;
  }
  
  resume() {
    if (this.isPlaying && this.isPaused) {
      this.isPaused = false;
      this.playEvents();
    }
  }
  
  async playEvents() {
    while (this.currentIndex < this.events.length && this.isPlaying) {
      if (this.isPaused) {
        await this.waitForResume();
        continue;
      }
      
      const event = this.events[this.currentIndex];
      const nextEvent = this.events[this.currentIndex + 1];
      
      try {
        await this.playEvent(event);
        this.updateProgress();
        
        if (nextEvent) {
          const delay = this.calculateDelay(event, nextEvent);
          await this.wait(delay);
        }
        
        this.currentIndex++;
      } catch (error) {
        console.error('Error playing event:', event, error);
        const shouldContinue = await this.handlePlaybackError(error, event);
        if (!shouldContinue) break;
        this.currentIndex++;
      }
    }
  }
  
  async playEvent(event) {
    switch (event.type) {
      case 'click':
        await this.playClick(event);
        break;
      
      case 'input':
        await this.playInput(event);
        break;
      
      case 'change':
        await this.playChange(event);
        break;
      
      case 'scroll':
        await this.playScroll(event);
        break;
      
      case 'navigate':
        await this.playNavigate(event);
        break;
      
      case 'keydown':
        await this.playKeydown(event);
        break;
      
      case 'submit':
        await this.playSubmit(event);
        break;
      
      default:
        console.warn('Unknown event type:', event.type);
    }
  }
  
  async playClick(event) {
    const element = await this.findElement(event);
    await SelectorUtils.waitForVisible(element);
    
    this.highlightElement(element);
    
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: event.coordinates?.x || 0,
      clientY: event.coordinates?.y || 0
    });
    
    element.dispatchEvent(clickEvent);
  }
  
  async playInput(event) {
    const element = await this.findElement(event);
    await SelectorUtils.waitForVisible(element);
    
    this.highlightElement(element);
    
    element.focus();
    element.value = '';
    
    for (const char of event.value) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await this.wait(20);
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
  }
  
  async playChange(event) {
    const element = await this.findElement(event);
    await SelectorUtils.waitForVisible(element);
    
    this.highlightElement(element);
    
    if (element.tagName.toLowerCase() === 'select') {
      element.value = event.value;
    } else if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = event.value;
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  async playScroll(event) {
    window.scrollTo({
      left: event.scrollPosition.x,
      top: event.scrollPosition.y,
      behavior: this.playbackSpeed === 'instant' ? 'instant' : 'smooth'
    });
    
    await this.wait(200);
  }
  
  async playNavigate(event) {
    if (window.location.href !== event.url) {
      window.location.href = event.url;
      await this.wait(2000);
    }
  }
  
  async playKeydown(event) {
    const keyEvent = new KeyboardEvent('keydown', {
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      bubbles: true,
      cancelable: true
    });
    
    document.activeElement.dispatchEvent(keyEvent);
  }
  
  async playSubmit(event) {
    const element = await this.findElement(event);
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
  
  async findElement(event) {
    const selectors = {
      primary: event.selector,
      fallbacks: event.fallbackSelectors || []
    };
    
    return await SelectorUtils.findElement(selectors, 5000);
  }
  
  calculateDelay(currentEvent, nextEvent) {
    const timeDiff = nextEvent.timestamp - currentEvent.timestamp;
    const multiplier = this.speedMultipliers[this.playbackSpeed];
    const delay = timeDiff * multiplier;
    
    return Math.max(delay, this.playbackSpeed === 'instant' ? 10 : 200);
  }
  
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async waitForResume() {
    while (this.isPaused && this.isPlaying) {
      await this.wait(100);
    }
  }
  
  highlightElement(element) {
    const originalOutline = element.style.outline;
    element.style.outline = '3px solid #4CAF50';
    
    setTimeout(() => {
      element.style.outline = originalOutline;
    }, 300);
  }
  
  showPlaybackIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'browser-recorder-playback-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-family: sans-serif;
        font-size: 14px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          animation: pulse 1s infinite;
        "></div>
        Playing Recording
        <button id="stop-playback" style="
          background: white;
          color: #4CAF50;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Stop</button>
      </div>
      <style>
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      </style>
    `;
    
    document.body.appendChild(indicator);
    
    document.getElementById('stop-playback').addEventListener('click', () => {
      this.stop();
    });
  }
  
  hidePlaybackIndicator() {
    const indicator = document.getElementById('browser-recorder-playback-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  updateProgress() {
    const progress = ((this.currentIndex + 1) / this.events.length) * 100;
    chrome.runtime.sendMessage({
      action: 'playbackProgress',
      progress: progress
    });
  }
  
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f44336;
      color: white;
      padding: 20px;
      border-radius: 5px;
      font-family: sans-serif;
      font-size: 14px;
      z-index: 999999;
      max-width: 400px;
    `;
    errorDiv.textContent = `Playback Error: ${message}`;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
  
  async handlePlaybackError(error, event) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 999999;
        max-width: 400px;
        font-family: sans-serif;
      `;
      
      modal.innerHTML = `
        <h3 style="margin-top: 0;">Playback Error</h3>
        <p>Failed to play event: ${event.type}</p>
        <p style="color: #666; font-size: 14px;">${error.message}</p>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button id="skip-event" style="
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 3px;
            cursor: pointer;
          ">Skip Event</button>
          <button id="stop-playback-error" style="
            padding: 8px 16px;
            border: none;
            background: #f44336;
            color: white;
            border-radius: 3px;
            cursor: pointer;
          ">Stop Playback</button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      document.getElementById('skip-event').addEventListener('click', () => {
        modal.remove();
        resolve(true);
      });
      
      document.getElementById('stop-playback-error').addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });
    });
  }
}