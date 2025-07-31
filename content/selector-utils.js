class SelectorUtils {
  static getSelector(element) {
    const selectors = [];
    
    if (element.id) {
      selectors.push(`#${CSS.escape(element.id)}`);
    }
    
    if (element.hasAttribute('data-testid')) {
      selectors.push(`[data-testid="${CSS.escape(element.getAttribute('data-testid'))}"]`);
    }
    
    if (element.hasAttribute('data-id')) {
      selectors.push(`[data-id="${CSS.escape(element.getAttribute('data-id'))}"]`);
    }
    
    const uniqueClasses = this.getUniqueClasses(element);
    if (uniqueClasses) {
      selectors.push(uniqueClasses);
    }
    
    const cssPath = this.getCssPath(element);
    if (cssPath) {
      selectors.push(cssPath);
    }
    
    selectors.push(this.getXPath(element));
    
    return {
      primary: selectors[0] || cssPath,
      fallbacks: selectors.slice(1)
    };
  }
  
  static getUniqueClasses(element) {
    if (!element.className || typeof element.className !== 'string') return null;
    
    const classes = element.className.split(/\s+/).filter(c => c.length > 0);
    if (classes.length === 0) return null;
    
    const selector = '.' + classes.map(c => CSS.escape(c)).join('.');
    
    try {
      const matches = document.querySelectorAll(selector);
      if (matches.length === 1 && matches[0] === element) {
        return selector;
      }
    } catch (e) {
      console.warn('Invalid class selector:', selector, e);
    }
    
    return null;
  }
  
  static getCssPath(element) {
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      
      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      }
      
      const siblings = current.parentNode ? Array.from(current.parentNode.children) : [];
      const sameTagSiblings = siblings.filter(s => s.nodeName === current.nodeName);
      
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentNode;
    }
    
    return path.join(' > ');
  }
  
  static getXPath(element) {
    const segments = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const segment = current.nodeName.toLowerCase() + '[' + index + ']';
      segments.unshift(segment);
      current = current.parentNode;
    }
    
    return '//' + segments.join('/');
  }
  
  static findElement(selectors, timeout = 5000) {
    const primary = selectors.primary || selectors;
    const fallbacks = selectors.fallbacks || [];
    const allSelectors = [primary, ...fallbacks];
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const tryFind = () => {
        for (const selector of allSelectors) {
          try {
            let element = null;
            
            if (selector.startsWith('//')) {
              const result = document.evaluate(
                selector, 
                document, 
                null, 
                XPathResult.FIRST_ORDERED_NODE_TYPE, 
                null
              );
              element = result.singleNodeValue;
            } else {
              element = document.querySelector(selector);
            }
            
            if (element) {
              resolve(element);
              return;
            }
          } catch (e) {
            console.warn('Invalid selector:', selector, e);
          }
        }
        
        if (Date.now() - startTime < timeout) {
          requestAnimationFrame(tryFind);
        } else {
          reject(new Error(`Element not found with selectors: ${JSON.stringify(selectors)}`));
        }
      };
      
      tryFind();
    });
  }
  
  static isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const elementAtPoint = document.elementFromPoint(centerX, centerY);
    
    return element.contains(elementAtPoint) || elementAtPoint === element;
  }
  
  static waitForVisible(element, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkVisible = () => {
        if (this.isVisible(element)) {
          resolve(element);
        } else if (Date.now() - startTime < timeout) {
          requestAnimationFrame(checkVisible);
        } else {
          reject(new Error('Element did not become visible within timeout'));
        }
      };
      
      checkVisible();
    });
  }
}