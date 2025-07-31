export const EventUtils = {
  createEvent(type, options = {}) {
    const eventInit = {
      bubbles: true,
      cancelable: true,
      ...options
    };
    
    switch (type) {
      case 'click':
      case 'mousedown':
      case 'mouseup':
      case 'mousemove':
      case 'mouseenter':
      case 'mouseleave':
        return new MouseEvent(type, {
          ...eventInit,
          view: window,
          clientX: options.clientX || 0,
          clientY: options.clientY || 0,
          screenX: options.screenX || 0,
          screenY: options.screenY || 0,
          button: options.button || 0,
          buttons: options.buttons || 1
        });
      
      case 'keydown':
      case 'keyup':
      case 'keypress':
        return new KeyboardEvent(type, {
          ...eventInit,
          key: options.key || '',
          code: options.code || '',
          keyCode: options.keyCode || 0,
          which: options.which || 0,
          ctrlKey: options.ctrlKey || false,
          shiftKey: options.shiftKey || false,
          altKey: options.altKey || false,
          metaKey: options.metaKey || false
        });
      
      case 'input':
      case 'change':
        return new Event(type, eventInit);
      
      case 'focus':
      case 'blur':
        return new FocusEvent(type, eventInit);
      
      case 'submit':
        return new Event(type, {
          ...eventInit,
          cancelable: true
        });
      
      default:
        return new CustomEvent(type, {
          ...eventInit,
          detail: options.detail || {}
        });
    }
  },
  
  dispatchEvent(element, event) {
    return element.dispatchEvent(event);
  },
  
  simulateKeySequence(element, keys, options = {}) {
    const delay = options.delay || 50;
    
    return new Promise((resolve) => {
      let index = 0;
      
      const pressKey = () => {
        if (index < keys.length) {
          const key = keys[index];
          
          const keydownEvent = this.createEvent('keydown', { key });
          const keypressEvent = this.createEvent('keypress', { key });
          const keyupEvent = this.createEvent('keyup', { key });
          
          this.dispatchEvent(element, keydownEvent);
          this.dispatchEvent(element, keypressEvent);
          this.dispatchEvent(element, keyupEvent);
          
          index++;
          setTimeout(pressKey, delay);
        } else {
          resolve();
        }
      };
      
      pressKey();
    });
  },
  
  simulateHover(element) {
    const mouseenterEvent = this.createEvent('mouseenter');
    const mouseoverEvent = this.createEvent('mouseover');
    
    this.dispatchEvent(element, mouseenterEvent);
    this.dispatchEvent(element, mouseoverEvent);
  },
  
  simulateUnhover(element) {
    const mouseleaveEvent = this.createEvent('mouseleave');
    const mouseoutEvent = this.createEvent('mouseout');
    
    this.dispatchEvent(element, mouseleaveEvent);
    this.dispatchEvent(element, mouseoutEvent);
  },
  
  simulateDrag(startElement, endElement, options = {}) {
    const startPos = startElement.getBoundingClientRect();
    const endPos = endElement.getBoundingClientRect();
    
    const startX = startPos.left + startPos.width / 2;
    const startY = startPos.top + startPos.height / 2;
    const endX = endPos.left + endPos.width / 2;
    const endY = endPos.top + endPos.height / 2;
    
    const mousedownEvent = this.createEvent('mousedown', {
      clientX: startX,
      clientY: startY
    });
    
    const dragstartEvent = this.createEvent('dragstart', {
      clientX: startX,
      clientY: startY
    });
    
    const dragEvent = this.createEvent('drag', {
      clientX: endX,
      clientY: endY
    });
    
    const dropEvent = this.createEvent('drop', {
      clientX: endX,
      clientY: endY
    });
    
    const mouseupEvent = this.createEvent('mouseup', {
      clientX: endX,
      clientY: endY
    });
    
    this.dispatchEvent(startElement, mousedownEvent);
    this.dispatchEvent(startElement, dragstartEvent);
    this.dispatchEvent(document, dragEvent);
    this.dispatchEvent(endElement, dropEvent);
    this.dispatchEvent(endElement, mouseupEvent);
  },
  
  getEventPath(event) {
    if (event.path) return event.path;
    if (event.composedPath) return event.composedPath();
    
    const path = [];
    let target = event.target;
    
    while (target) {
      path.push(target);
      target = target.parentElement;
    }
    
    if (path.length > 0 && path[path.length - 1] !== window) {
      path.push(document);
      path.push(window);
    }
    
    return path;
  },
  
  preventEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  },
  
  debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }
};