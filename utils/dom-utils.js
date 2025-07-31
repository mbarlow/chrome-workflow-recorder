export const DOMUtils = {
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  },
  
  isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },
  
  scrollIntoViewIfNeeded(element, options = {}) {
    if (!this.isElementInViewport(element)) {
      element.scrollIntoView({
        behavior: options.smooth ? 'smooth' : 'auto',
        block: 'center',
        inline: 'center'
      });
    }
  },
  
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    return {
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft,
      width: rect.width,
      height: rect.height,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  },
  
  simulateClick(element, options = {}) {
    const position = this.getElementPosition(element);
    
    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: options.clientX || position.x,
      clientY: options.clientY || position.y
    });
    
    const mouseupEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: options.clientX || position.x,
      clientY: options.clientY || position.y
    });
    
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: options.clientX || position.x,
      clientY: options.clientY || position.y
    });
    
    element.dispatchEvent(mousedownEvent);
    element.dispatchEvent(mouseupEvent);
    element.dispatchEvent(clickEvent);
  },
  
  simulateTyping(element, text, options = {}) {
    const delay = options.delay || 50;
    
    element.focus();
    element.value = '';
    
    return new Promise((resolve) => {
      let index = 0;
      
      const typeChar = () => {
        if (index < text.length) {
          element.value += text[index];
          
          const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
          });
          element.dispatchEvent(inputEvent);
          
          index++;
          setTimeout(typeChar, delay);
        } else {
          const changeEvent = new Event('change', {
            bubbles: true,
            cancelable: true
          });
          element.dispatchEvent(changeEvent);
          element.blur();
          resolve();
        }
      };
      
      typeChar();
    });
  },
  
  getTextContent(element) {
    const text = element.textContent || element.innerText || '';
    return text.trim().replace(/\s+/g, ' ');
  },
  
  hasClass(element, className) {
    return element.classList.contains(className);
  },
  
  findParentWithClass(element, className) {
    let current = element;
    while (current && current !== document.body) {
      if (this.hasClass(current, className)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  },
  
  getAttributes(element) {
    const attrs = {};
    for (const attr of element.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  },
  
  isInteractable(element) {
    const tagName = element.tagName.toLowerCase();
    const interactableTags = ['a', 'button', 'input', 'select', 'textarea'];
    
    if (interactableTags.includes(tagName)) {
      return true;
    }
    
    if (element.onclick || element.getAttribute('onclick')) {
      return true;
    }
    
    const role = element.getAttribute('role');
    const interactableRoles = ['button', 'link', 'checkbox', 'radio', 'menuitem'];
    if (role && interactableRoles.includes(role)) {
      return true;
    }
    
    const cursor = window.getComputedStyle(element).cursor;
    if (cursor === 'pointer') {
      return true;
    }
    
    return false;
  }
};