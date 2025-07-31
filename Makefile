.PHONY: help install build test lint package clean watch

# Default target
help:
	@echo "Browser Interaction Recorder - Development Commands"
	@echo ""
	@echo "  make install    - Load extension in Chrome dev mode"
	@echo "  make build      - Prepare extension for distribution"
	@echo "  make test       - Run unit tests"
	@echo "  make lint       - Run code quality checks"
	@echo "  make package    - Create .zip file for Chrome Web Store"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make watch      - Watch files for changes"

# Load extension in Chrome dev mode
install:
	@echo "To install the extension in Chrome:"
	@echo "1. Open Chrome and navigate to chrome://extensions/"
	@echo "2. Enable 'Developer mode' in the top right"
	@echo "3. Click 'Load unpacked' and select this directory:"
	@echo "   $(PWD)"
	@echo ""
	@echo "The extension is now ready to use!"

# Build extension (minify, optimize)
build:
	@echo "Building extension..."
	@mkdir -p dist
	@cp -r manifest.json background content ui popup assets utils dist/
	@echo "Build complete in dist/"

# Run tests (placeholder for now)
test:
	@echo "Running tests..."
	@echo "No tests configured yet"

# Run linting
lint:
	@echo "Running code quality checks..."
	@if command -v eslint >/dev/null 2>&1; then \
		eslint background/*.js content/*.js popup/*.js utils/*.js --fix; \
	else \
		echo "ESLint not installed. Run: npm install -g eslint"; \
	fi

# Package extension for distribution
package: clean build
	@echo "Creating extension package..."
	@cd dist && zip -r ../browser-recorder-$(shell date +%Y%m%d).zip . -x "*.DS_Store" -x "__MACOSX/*"
	@echo "Package created: browser-recorder-$(shell date +%Y%m%d).zip"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf dist/
	@rm -f browser-recorder-*.zip
	@echo "Clean complete"

# Watch for file changes
watch:
	@echo "Watching for file changes..."
	@echo "Reload the extension in Chrome when files change"
	@if command -v fswatch >/dev/null 2>&1; then \
		fswatch -o . -e "dist" -e ".git" | xargs -n1 -I{} echo "Files changed, reload extension in Chrome"; \
	else \
		echo "fswatch not installed. On macOS run: brew install fswatch"; \
	fi

# Create placeholder icons if they don't exist
icons:
	@mkdir -p assets/icons
	@echo "Creating placeholder icons..."
	@if command -v convert >/dev/null 2>&1; then \
		convert -size 16x16 xc:#4CAF50 assets/icons/icon-16.png; \
		convert -size 48x48 xc:#4CAF50 assets/icons/icon-48.png; \
		convert -size 128x128 xc:#4CAF50 assets/icons/icon-128.png; \
		convert -size 16x16 xc:#FF4444 assets/icons/icon-recording-16.png; \
		convert -size 48x48 xc:#FF4444 assets/icons/icon-recording-48.png; \
		convert -size 128x128 xc:#FF4444 assets/icons/icon-recording-128.png; \
	else \
		echo "ImageMagick not installed. Creating empty icon files..."; \
		touch assets/icons/icon-16.png; \
		touch assets/icons/icon-48.png; \
		touch assets/icons/icon-128.png; \
		touch assets/icons/icon-recording-16.png; \
		touch assets/icons/icon-recording-48.png; \
		touch assets/icons/icon-recording-128.png; \
	fi
	@echo "Icons created in assets/icons/"