class Recorder {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.eventHandlers = new Map();
    this.lastEventTime = 0;
    this.minEventInterval = 50;
  }
  
  start() {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.isPaused = false;
    this.attachEventListeners();
    this.sendEvent({
      type: 'navigate',
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }
  
  stop() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    this.detachEventListeners();
  }
  
  pause() {
    this.isPaused = true;
  }
  
  resume() {
    this.isPaused = false;
  }
  
  attachEventListeners() {
    const handlers = {
      click: this.handleClick.bind(this),
      input: this.handleInput.bind(this),
      change: this.handleChange.bind(this),
      submit: this.handleSubmit.bind(this),
      scroll: this.throttle(this.handleScroll.bind(this), 200),
      keydown: this.handleKeydown.bind(this)
    };
    
    for (const [event, handler] of Object.entries(handlers)) {
      document.addEventListener(event, handler, true);
      this.eventHandlers.set(event, handler);
    }
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== this.lastUrl) {
        this.lastUrl = window.location.href;
        this.sendEvent({
          type: 'navigate',
          url: window.location.href,
          timestamp: Date.now()
        });
      }
    });
    
    observer.observe(document, { subtree: true, childList: true });
    this.mutationObserver = observer;
  }
  
  detachEventListeners() {
    for (const [event, handler] of this.eventHandlers) {
      document.removeEventListener(event, handler, true);
    }
    this.eventHandlers.clear();
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }
  
  handleClick(event) {
    if (!this.shouldRecordEvent(event)) return;
    
    const target = event.target;
    const selectors = SelectorUtils.getSelector(target);
    
    this.sendEvent({
      type: 'click',
      timestamp: Date.now(),
      selector: selectors.primary,
      fallbackSelectors: selectors.fallbacks,
      coordinates: {
        x: event.clientX,
        y: event.clientY
      },
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      },
      url: window.location.href,
      targetText: this.getElementText(target),
      targetTag: target.tagName.toLowerCase()
    });
  }
  
  handleInput(event) {
    if (!this.shouldRecordEvent(event)) return;
    
    const target = event.target;
    const tagName = target.tagName.toLowerCase();
    
    if (tagName === 'input' || tagName === 'textarea') {
      const selectors = SelectorUtils.getSelector(target);
      
      clearTimeout(this.inputTimeout);
      this.inputTimeout = setTimeout(() => {
        this.sendEvent({
          type: 'input',
          timestamp: Date.now(),
          selector: selectors.primary,
          fallbackSelectors: selectors.fallbacks,
          value: target.value,
          inputType: target.type || 'text',
          url: window.location.href
        });
      }, 300);
    }
  }
  
  handleChange(event) {
    if (!this.shouldRecordEvent(event)) return;
    
    const target = event.target;
    const tagName = target.tagName.toLowerCase();
    
    if (tagName === 'select' || (tagName === 'input' && (target.type === 'checkbox' || target.type === 'radio'))) {
      const selectors = SelectorUtils.getSelector(target);
      
      this.sendEvent({
        type: 'change',
        timestamp: Date.now(),
        selector: selectors.primary,
        fallbackSelectors: selectors.fallbacks,
        value: tagName === 'select' ? target.value : target.checked,
        inputType: target.type || tagName,
        url: window.location.href
      });
    }
  }
  
  handleSubmit(event) {
    if (!this.shouldRecordEvent(event)) return;
    
    const target = event.target;
    const selectors = SelectorUtils.getSelector(target);
    
    this.sendEvent({
      type: 'submit',
      timestamp: Date.now(),
      selector: selectors.primary,
      fallbackSelectors: selectors.fallbacks,
      url: window.location.href
    });
  }
  
  handleScroll(event) {
    if (!this.shouldRecordEvent(event)) return;
    
    this.sendEvent({
      type: 'scroll',
      timestamp: Date.now(),
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      url: window.location.href
    });
  }
  
  handleKeydown(event) {
    if (!this.shouldRecordEvent(event)) return;
    
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (['a', 'c', 'v', 'x', 'z', 'y'].includes(key)) {
        this.sendEvent({
          type: 'keydown',
          timestamp: Date.now(),
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          url: window.location.href
        });
      }
    }
  }
  
  shouldRecordEvent(event) {
    if (!this.isRecording || this.isPaused) return false;
    
    const now = Date.now();
    if (now - this.lastEventTime < this.minEventInterval) return false;
    
    const target = event.target;
    if (target.closest('.browser-recorder-sidebar')) return false;
    
    this.lastEventTime = now;
    return true;
  }
  
  sendEvent(eventData) {
    chrome.runtime.sendMessage({
      action: 'addEvent',
      event: eventData
    });
  }
  
  getElementText(element) {
    const text = element.textContent || element.innerText || '';
    return text.trim().substring(0, 100);
  }
  
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay);
      }
    };
  }
}