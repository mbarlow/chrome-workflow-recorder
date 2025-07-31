# Browser Interaction Recorder - Chrome Extension

## Project Overview

A minimalist Chrome extension for recording, replaying, and sharing browser interactions for testing and automation purposes. The extension provides an instant-use interface for capturing user workflows and replaying them with functional accuracy.

## Core Requirements

### Primary Functionality
- **Recording**: Capture browser interactions (clicks, form inputs, scrolling) with precise timestamps
- **Playback**: Replay recorded sessions with configurable timing
- **Storage**: Persistent local storage with export/import capabilities
- **Sharing**: Portable JSON export for team collaboration

### User Experience Goals
- Instant activation via hotkey or extension icon
- No-nonsense, minimal UI with intuitive controls
- Fast recording start/stop workflow
- Quick sharing via downloadable files

## Technical Specifications

### Architecture Overview
```
┌─ Background Script ────────────────┐
│  - Extension lifecycle management  │
│  - Storage coordination           │
│  - Cross-tab communication        │
└───────────────────────────────────┘
            │
┌─ Content Script ──────────────────┐
│  - DOM interaction capture        │
│  - Event recording engine         │
│  - Playback execution engine      │
│  - UI overlay injection           │
└───────────────────────────────────┘
            │
┌─ Sidebar UI ──────────────────────┐
│  - Control panel interface        │
│  - Recording history management   │
│  - Export/import functionality    │
└───────────────────────────────────┘
```

### Core Components

#### 1. Recording Engine
**Purpose**: Capture and serialize browser interactions

**Captured Events**:
- Click events (buttons, links, elements)
- Form interactions (input, select, textarea, checkbox, radio)
- Page navigation
- Scroll positions (viewport-relative)
- Keyboard shortcuts (optional)

**Event Data Structure**:
```json
{
  "timestamp": 1642534800000,
  "type": "click|input|scroll|navigate",
  "selector": "css-selector-string",
  "fallbackSelectors": ["alternative", "selectors"],
  "value": "input-value-if-applicable",
  "coordinates": {"x": 100, "y": 200},
  "scrollPosition": {"x": 0, "y": 500},
  "url": "current-page-url",
  "viewport": {"width": 1920, "height": 1080}
}
```

**Element Selection Strategy**:
1. Primary: ID attribute (`#element-id`)
2. Fallback 1: Unique class combination (`.class1.class2`)
3. Fallback 2: Data attributes (`[data-testid="value"]`)
4. Fallback 3: CSS path with nth-child positioning
5. Last resort: XPath

#### 2. Playback Engine
**Purpose**: Execute recorded interactions with timing control

**Features**:
- Real-time or accelerated playback
- Adaptive element waiting (up to 5s timeout)
- Error handling for missing elements
- Visual indicators during playback
- Pause/resume capability

**Timing Modes**:
- **Real-time**: Maintain original delays between actions
- **Fast**: 2x speed with minimum 200ms delays
- **Instant**: Minimal delays, wait only for element availability

#### 3. Storage System
**Purpose**: Persist recordings locally and enable export/import

**Local Storage Structure**:
```json
{
  "recordings": [
    {
      "id": "uuid-v4",
      "name": "Recording 2024-01-18 14:30:22",
      "created": 1642534800000,
      "duration": 45000,
      "url": "https://example.com",
      "events": [...],
      "metadata": {
        "userAgent": "...",
        "viewport": {"width": 1920, "height": 1080}
      }
    }
  ],
  "settings": {
    "hotkey": "Ctrl+Shift+R",
    "playbackSpeed": "real-time",
    "autoExport": false
  }
}
```

#### 4. UI Components

**Sidebar Overlay**:
- Fixed position, right-aligned
- Collapsible with persistent state
- Dark theme with monochromatic color scheme
- Google Fonts: `JetBrains Mono` for code/data, `Inter` for UI text

**Control Panel**:
```
┌─ Browser Recorder ───────────────┐
│  ● Record    ⏸ Pause    ⏹ Stop   │
│                                  │
│  📝 Current: [Recording name]    │
│  ⏱ Duration: 00:45               │
│                                  │
│ ── History ──────────────────────│
│  📹 Recording 2024-01-18 14:30   │
│      🗑 📂 💾                     │
│  📹 Login flow test              │
│      🗑 📂 💾                     │
│                                  │
│ ── Settings ─────────────────────│
│  ⚙️ Hotkey: Ctrl+Shift+R        │
│  🎮 Playback: Real-time ▼        │
└──────────────────────────────────┘
```

**Button Functions**:
- 🗑 Delete recording
- 📂 Load/replay recording
- 💾 Export to JSON file

### Project Structure

```
browser-recorder/
├── manifest.json                 # Extension configuration
├── background/
│   ├── background.js            # Service worker, storage management
│   └── storage.js               # Storage utilities
├── content/
│   ├── content.js               # Main content script injection
│   ├── recorder.js              # Event capture engine
│   ├── player.js                # Playback execution engine
│   └── selector-utils.js        # Element selection strategies
├── ui/
│   ├── sidebar.html             # Sidebar overlay template
│   ├── sidebar.js               # Sidebar functionality
│   ├── sidebar.css              # UI styling
│   └── controls.js              # Recording controls logic
├── popup/
│   ├── popup.html               # Extension popup interface
│   ├── popup.js                 # Popup functionality
│   └── popup.css                # Popup styling
├── assets/
│   ├── icons/                   # Extension icons (16, 48, 128px)
│   └── fonts/                   # Local font files (optional)
├── utils/
│   ├── dom-utils.js             # DOM manipulation utilities
│   ├── event-utils.js           # Event handling utilities
│   └── export-utils.js          # JSON export/import functions
├── README.md                    # Installation and usage guide
├── Makefile                     # Build and development commands
└── docs/
    ├── architecture.md          # Technical architecture details
    ├── api.md                   # Internal API documentation
    └── contributing.md          # Development guidelines
```

## Feature Specifications

### Recording Features
- **Instant Start**: Single hotkey activation (`Ctrl+Shift+R`)
- **Visual Feedback**: Recording indicator in sidebar + page overlay
- **Smart Capture**: Automatic element identification with fallbacks
- **Pause/Resume**: Maintain recording session across interruptions
- **Auto-naming**: Timestamp-based default names with edit capability

### Playback Features
- **Speed Control**: Real-time, 2x, or instant playback modes
- **Step Through**: Manual step-by-step execution for debugging
- **Error Handling**: Graceful failure with element not found warnings
- **Progress Indicator**: Visual progress during playback
- **Stop/Restart**: Ability to halt and restart playback

### Storage & Export Features
- **Local Persistence**: Recordings saved in Chrome extension storage
- **JSON Export**: Clean, portable format for team sharing
- **Bulk Export**: Export multiple recordings as ZIP archive
- **Import**: Drag-and-drop JSON files to import recordings
- **Storage Management**: View storage usage, cleanup old recordings

### UI/UX Features
- **Minimalist Design**: Clean, distraction-free interface
- **Dark Theme**: Medium-dark monochromatic color scheme
- **Responsive**: Works across different viewport sizes
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Quick Actions**: Right-click context menu for common actions

## Development Workflow

### Setup Commands (Makefile)
```makefile
install:        # Load extension in Chrome dev mode
build:          # Prepare extension for distribution
test:           # Run unit tests
lint:           # Code quality checks
package:        # Create .crx file for distribution
clean:          # Clean build artifacts
```

### Chrome Extension Manifest (v3)
```json
{
  "manifest_version": 3,
  "name": "Browser Interaction Recorder",
  "version": "1.0.0",
  "description": "Record, replay, and share browser interactions for testing",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ],
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["ui/sidebar.css"],
      "run_at": "document_end"
    }
  ],
  "commands": {
    "toggle-recording": {
      "suggested_key": {
        "default": "Ctrl+Shift+R"
      },
      "description": "Toggle recording"
    }
  }
}
```

## Quality Standards

### Error Handling
- Graceful degradation when elements not found
- Clear error messages for user feedback
- Automatic retry logic for timing-sensitive operations
- Fallback strategies for different element selection methods

### Performance
- Minimal DOM manipulation during recording
- Efficient event delegation patterns
- Lazy loading of UI components
- Storage optimization for large recording sets

### Browser Compatibility
- Chrome 88+ (Manifest V3 support)
- Handles dynamic content and SPAs
- Works with iframes (where security permits)
- Respects Content Security Policy restrictions

### Testing Strategy
- Unit tests for core recording/playback logic
- Integration tests with sample web applications
- Performance testing with large recording sets
- Cross-site compatibility testing

## Success Metrics

### Primary Goals
- **Speed**: Recording start in <200ms from hotkey press
- **Accuracy**: 95%+ successful playback on recorded actions
- **Usability**: New user can record/replay in <60 seconds
- **Portability**: Exported recordings work across team members

### Technical Targets
- Storage efficiency: <1KB per recorded action
- Memory usage: <50MB during active recording
- Playback reliability: Handle 95% of common web patterns
- Export speed: Generate JSON in <1 second for typical recordings

## Future Considerations (Post-v1)

### Advanced Features
- Variable extraction and parameterization
- Conditional logic and branching
- Integration with testing frameworks
- Cloud storage and team collaboration
- Mobile browser support

### Export Formats
- Selenium WebDriver scripts
- Playwright test generation
- Cypress test conversion
- Custom automation formats

This specification provides a comprehensive foundation for building a production-ready browser interaction recorder that meets your requirements for speed, simplicity, and team collaboration.
