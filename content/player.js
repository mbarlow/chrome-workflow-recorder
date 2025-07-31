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
      
      case 'mousemove':
        await this.playMouseMove(event);
        break;
      
      default:
        console.warn('Unknown event type:', event.type);
    }
  }
  
  async playClick(event) {
    const element = await this.findElement(event);
    await SelectorUtils.waitForVisible(element);
    
    // Show mouse cursor moving to the element
    if (event.coordinates) {
      this.showMouseCursor(event.coordinates.x, event.coordinates.y);
    }
    
    // Highlight and animate the element
    this.highlightElement(element);
    this.showClickAnimation(event.coordinates?.x || 0, event.coordinates?.y || 0);
    
    // Wait a moment for visual feedback
    await this.wait(300);
    
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
      console.log('Navigating to:', event.url);
      
      // Save current playback state before navigation
      const playbackData = {
        recording: {
          events: this.events,
          name: 'Continuing Playback'
        },
        currentIndex: this.currentIndex + 1
      };
      localStorage.setItem('browser-recorder-pending-playback', JSON.stringify(playbackData));
      
      // Show navigation indicator
      this.showNavigationIndicator(event.url);
      
      window.location.href = event.url;
      
      // The playback will continue when the new page loads and checks playback state
      return;
    } else {
      console.log('Already on target URL:', event.url);
    }
  }
  
  continuePlayback(recording, startIndex) {
    this.isPlaying = true;
    this.isPaused = false;
    this.currentIndex = startIndex || 0;
    this.events = recording.events || [];
    
    this.showPlaybackIndicator();
    
    this.playEvents().then(() => {
      console.log('Playback completed');
      this.stop();
    }).catch(error => {
      console.error('Playback failed:', error);
      this.showError(error.message);
      this.stop();
    });
  }
  
  showNavigationIndicator(url) {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(76, 175, 80, 0.95);
      color: white;
      padding: 20px 30px;
      border-radius: 8px;
      font-family: sans-serif;
      font-size: 16px;
      z-index: 999999;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    indicator.innerHTML = `
      <div style="margin-bottom: 10px;">🔄 Navigating...</div>
      <div style="font-size: 14px; opacity: 0.9;">${url}</div>
    `;
    
    document.body.appendChild(indicator);
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
  
  async playMouseMove(event) {
    this.showMouseCursor(event.coordinates.x, event.coordinates.y);
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
        padding: 15px 20px;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 14px;
        z-index: 999999;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            animation: pulse 1s infinite;
          "></div>
          <span>Playing Recording</span>
          <button id="stop-playback" style="
            background: white;
            color: #4CAF50;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            margin-left: auto;
          ">Stop</button>
        </div>
        <div style="
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          height: 6px;
          margin-bottom: 8px;
          overflow: hidden;
        ">
          <div id="playback-progress-bar" style="
            background: white;
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 10px;
          "></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.9;">
          <span id="current-step">Step 1</span>
          <span id="total-steps">of ${this.events.length}</span>
        </div>
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
    
    // Create mouse cursor
    this.createMouseCursor();
  }
  
  createMouseCursor() {
    const cursor = document.createElement('div');
    cursor.id = 'browser-recorder-mouse-cursor';
    cursor.innerHTML = `
      <div style="
        position: fixed;
        width: 20px;
        height: 20px;
        background: #FF4444;
        border: 2px solid white;
        border-radius: 50%;
        z-index: 999998;
        pointer-events: none;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: all 0.1s ease;
        display: none;
      "></div>
    `;
    
    document.body.appendChild(cursor);
  }
  
  showMouseCursor(x, y) {
    const cursor = document.querySelector('#browser-recorder-mouse-cursor div');
    if (cursor) {
      cursor.style.display = 'block';
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
    }
  }
  
  showClickAnimation(x, y) {
    const clickIndicator = document.createElement('div');
    clickIndicator.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 30px;
      height: 30px;
      border: 3px solid #FF4444;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 999997;
      pointer-events: none;
      animation: clickPulse 0.6s ease-out;
    `;
    
    // Add CSS for animation
    if (!document.getElementById('click-animation-styles')) {
      const styles = document.createElement('style');
      styles.id = 'click-animation-styles';
      styles.textContent = `
        @keyframes clickPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(clickIndicator);
    
    setTimeout(() => {
      clickIndicator.remove();
    }, 600);
  }
  
  hidePlaybackIndicator() {
    const indicator = document.getElementById('browser-recorder-playback-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    const cursor = document.getElementById('browser-recorder-mouse-cursor');
    if (cursor) {
      cursor.remove();
    }
  }
  
  updateProgress() {
    const progress = ((this.currentIndex + 1) / this.events.length) * 100;
    
    // Update the progress bar
    const progressBar = document.getElementById('playback-progress-bar');
    if (progressBar) {
      progressBar.style.width = progress + '%';
    }
    
    // Update step counter
    const currentStep = document.getElementById('current-step');
    if (currentStep) {
      currentStep.textContent = `Step ${this.currentIndex + 1}`;
    }
    
    // Send progress to background script and sidebar
    chrome.runtime.sendMessage({
      action: 'playbackProgress',
      progress: progress,
      currentStep: this.currentIndex + 1,
      totalSteps: this.events.length
    }).catch(() => {
      // Ignore errors if background script can't receive the message
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