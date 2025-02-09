# CyberCTRL Frontend

A Chrome extension that provides real-time security scanning for APIs and code.

## Features
- 🔍 Real-time API security scanning
- 📊 Trust score visualization (0-100)
- 🚨 Security risk alerts
- 🛡️ Visual risk level indicators

## Installation
1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `hacknyu-frontend` directory

## Directory Structure
├── manifest.json # Chrome extension configuration
├── popup.html # Extension popup interface
├── popup.js # Main extension logic
├── popup.css # Styling

## Usage
1. Click the CyberCTRL icon in Chrome
2. Click "Start Scan" to analyze the current page
3. View security score and alerts
4. Check detailed security warnings if any risks are detected

## Requirements
- Chrome Browser
- Backend server running on port 8001
