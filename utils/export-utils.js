export const ExportUtils = {
  exportToJSON(recordings, options = {}) {
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      recordings: Array.isArray(recordings) ? recordings : [recordings],
      metadata: {
        exportedBy: 'Browser Interaction Recorder',
        totalEvents: recordings.reduce((sum, rec) => sum + (rec.events?.length || 0), 0),
        ...options.metadata
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  },
  
  validateImportData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid import data: must be an object');
    }
    
    if (!data.recordings || !Array.isArray(data.recordings)) {
      throw new Error('Invalid import data: missing recordings array');
    }
    
    for (const recording of data.recordings) {
      if (!recording.id || !recording.name) {
        throw new Error('Invalid recording: missing id or name');
      }
      
      if (!recording.events || !Array.isArray(recording.events)) {
        throw new Error('Invalid recording: missing events array');
      }
    }
    
    return true;
  },
  
  downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  },
  
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const data = JSON.parse(content);
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse file: ' + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  },
  
  exportToSelenium(recording, language = 'python') {
    const generators = {
      python: this.generateSeleniumPython,
      javascript: this.generateSeleniumJavaScript,
      java: this.generateSeleniumJava
    };
    
    const generator = generators[language];
    if (!generator) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    return generator.call(this, recording);
  },
  
  generateSeleniumPython(recording) {
    const lines = [
      'from selenium import webdriver',
      'from selenium.webdriver.common.by import By',
      'from selenium.webdriver.support.ui import WebDriverWait',
      'from selenium.webdriver.support import expected_conditions as EC',
      'import time',
      '',
      'driver = webdriver.Chrome()',
      'wait = WebDriverWait(driver, 10)',
      ''
    ];
    
    for (const event of recording.events) {
      switch (event.type) {
        case 'navigate':
          lines.push(`driver.get("${event.url}")`);
          break;
        
        case 'click':
          lines.push(`element = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "${event.selector}")))`);
          lines.push('element.click()');
          break;
        
        case 'input':
          lines.push(`element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${event.selector}")))`);
          lines.push('element.clear()');
          lines.push(`element.send_keys("${event.value}")`);
          break;
        
        case 'scroll':
          lines.push(`driver.execute_script("window.scrollTo(${event.scrollPosition.x}, ${event.scrollPosition.y})")`);
          break;
      }
      
      lines.push('time.sleep(0.5)');
      lines.push('');
    }
    
    lines.push('driver.quit()');
    
    return lines.join('\n');
  },
  
  generateSeleniumJavaScript(recording) {
    const lines = [
      'const { Builder, By, until } = require("selenium-webdriver");',
      '',
      'async function runTest() {',
      '  const driver = await new Builder().forBrowser("chrome").build();',
      '  ',
      '  try {'
    ];
    
    for (const event of recording.events) {
      switch (event.type) {
        case 'navigate':
          lines.push(`    await driver.get("${event.url}");`);
          break;
        
        case 'click':
          lines.push(`    const element = await driver.wait(until.elementLocated(By.css("${event.selector}")), 10000);`);
          lines.push('    await element.click();');
          break;
        
        case 'input':
          lines.push(`    const element = await driver.wait(until.elementLocated(By.css("${event.selector}")), 10000);`);
          lines.push('    await element.clear();');
          lines.push(`    await element.sendKeys("${event.value}");`);
          break;
        
        case 'scroll':
          lines.push(`    await driver.executeScript("window.scrollTo(${event.scrollPosition.x}, ${event.scrollPosition.y})");`);
          break;
      }
      
      lines.push('    await driver.sleep(500);');
      lines.push('');
    }
    
    lines.push('  } finally {');
    lines.push('    await driver.quit();');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('runTest();');
    
    return lines.join('\n');
  },
  
  generateSeleniumJava(recording) {
    const lines = [
      'import org.openqa.selenium.*;',
      'import org.openqa.selenium.chrome.ChromeDriver;',
      'import org.openqa.selenium.support.ui.WebDriverWait;',
      'import org.openqa.selenium.support.ui.ExpectedConditions;',
      '',
      'public class RecordedTest {',
      '  public static void main(String[] args) throws InterruptedException {',
      '    WebDriver driver = new ChromeDriver();',
      '    WebDriverWait wait = new WebDriverWait(driver, 10);',
      '    ',
      '    try {'
    ];
    
    for (const event of recording.events) {
      switch (event.type) {
        case 'navigate':
          lines.push(`      driver.get("${event.url}");`);
          break;
        
        case 'click':
          lines.push(`      WebElement element = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("${event.selector}")));`);
          lines.push('      element.click();');
          break;
        
        case 'input':
          lines.push(`      WebElement element = wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("${event.selector}")));`);
          lines.push('      element.clear();');
          lines.push(`      element.sendKeys("${event.value}");`);
          break;
        
        case 'scroll':
          lines.push(`      ((JavascriptExecutor) driver).executeScript("window.scrollTo(${event.scrollPosition.x}, ${event.scrollPosition.y})");`);
          break;
      }
      
      lines.push('      Thread.sleep(500);');
      lines.push('');
    }
    
    lines.push('    } finally {');
    lines.push('      driver.quit();');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    
    return lines.join('\n');
  },
  
  exportToCSV(recordings) {
    const headers = ['Recording Name', 'Event Type', 'Selector', 'Value', 'URL', 'Timestamp'];
    const rows = [headers];
    
    for (const recording of recordings) {
      for (const event of recording.events) {
        rows.push([
          recording.name,
          event.type,
          event.selector || '',
          event.value || '',
          event.url || '',
          new Date(event.timestamp).toISOString()
        ]);
      }
    }
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
};