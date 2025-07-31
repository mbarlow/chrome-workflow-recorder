# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Building and Testing
- `make install` - Instructions for loading extension in Chrome dev mode
- `make build` - Prepare extension for distribution
- `make package` - Create .zip file for Chrome Web Store submission
- `make icons` - Generate placeholder icons if needed
- `make clean` - Clean build artifacts

### Development Workflow
1. Make code changes
2. Reload extension in Chrome (chrome://extensions/)
3. Test functionality in a browser tab
4. Check browser console for errors

## High-Level Architecture

### Extension Structure
This is a Chrome Extension (Manifest V3) with three main components:

1. **Background Service Worker** (`background/background.js`)
   - Central hub for extension state management
   - Handles communication between content scripts and popup
   - Manages recording state and storage operations
   - Processes keyboard shortcuts (Ctrl+Shift+R)

2. **Content Scripts** (`content/`)
   - `content.js` - Main entry point, injects sidebar UI
   - `recorder.js` - Captures DOM events during recording
   - `player.js` - Replays recorded events
   - `selector-utils.js` - Smart element selection with fallbacks

3. **UI Components**
   - **Popup** (`popup/`) - Quick access control panel
   - **Sidebar** (injected by content script) - Full recording interface
   - Dark theme with monochromatic design

### Key Architectural Decisions

1. **Event Recording Strategy**
   - Multiple selector fallbacks (ID → data attributes → classes → CSS path → XPath)
   - Captures viewport and scroll position for accurate replay
   - Throttles scroll events to avoid overwhelming storage

2. **Storage System**
   - Uses Chrome's local storage API
   - Recordings stored as JSON with events array
   - Settings persist across sessions

3. **Playback Engine**
   - Adaptive element waiting (up to 5s timeout)
   - Three speed modes: real-time, fast (2x), instant
   - Error handling with user prompts to skip/stop

4. **Module System**
   - ES6 modules with explicit exports/imports
   - Utilities separated by concern (DOM, events, export)
   - Background script uses dynamic imports

### Communication Flow
```
User Action → Content Script → Background Script → Storage
                     ↓                    ↓
                  Sidebar UI          Popup UI
```

### Important Implementation Notes

1. **Security Considerations**
   - Extension requires broad host permissions for recording
   - Content scripts run in isolated context
   - No external dependencies or CDNs

2. **Performance Optimizations**
   - Event throttling for high-frequency events (scroll, mousemove)
   - Debounced input recording (300ms delay)
   - Efficient DOM queries with caching

3. **Error Handling**
   - Graceful degradation when elements not found
   - User-friendly error messages in UI
   - Fallback selectors for robust replay

4. **Browser Compatibility**
   - Chrome 88+ required (Manifest V3)
   - Uses modern JavaScript features (async/await, ES6 modules)
   - Handles dynamic SPAs with mutation observers