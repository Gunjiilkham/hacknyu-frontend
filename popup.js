// Initialize scanner when popup loads
document.addEventListener("DOMContentLoaded", async () => {
  // Get elements using IDs from popup.html
  const trustScoreElement = document.getElementById("trustScore");
  const alertList = document.getElementById("alertList");
  const scanButton = document.getElementById("scanButton");

  // Debug logging
  console.log("DOM Elements:", {
      trustScore: trustScoreElement,
      alertList,
      scanButton
  });

  // Check each element individually with helpful error messages
  if (!trustScoreElement) {
      console.error("Could not find element with ID 'trustScore'");
  }
  if (!alertList) {
      console.error("Could not find element with ID 'alertList'");
  }
  if (!scanButton) {
      console.error("Could not find element with ID 'scanButton'");
  }

  // Only proceed if all elements are found
  if (!trustScoreElement || !alertList || !scanButton) {
      console.error("Required elements missing from popup.html!");
      return;
  }

  // Initialize with loading state
  const setLoadingState = () => {
      trustScoreElement.textContent = "...";
      trustScoreElement.style.color = '#666';
      alertList.innerHTML = "<li>Ready to scan...</li>";
  };

  // Check if backend is available
  const checkBackend = async () => {
      try {
          const response = await fetch('http://localhost:8000/health', {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json',
              }
          });
          return response.ok;
      } catch (error) {
          console.error("Backend health check failed:", error);
          return false;
      }
  };

  // Set initial state
  setLoadingState();

  // Add click event listener for scan button
  scanButton.addEventListener("click", async () => {
      try {
          // Check backend connection first
          const isBackendAvailable = await checkBackend();
          if (!isBackendAvailable) {
              throw new Error("Backend server is not available. Please ensure the server is running.");
          }

          // Show loading state
          trustScoreElement.textContent = "Scanning...";
          alertList.innerHTML = "<li>Analysis in progress...</li>";

          // Get current tab
          const [tab] = await chrome.tabs.query({ 
              active: true, 
              currentWindow: true 
          });

          // Check if URL is scannable
          if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
              throw new Error("Cannot scan Chrome system pages. Please try on a regular website.");
          }

          // Execute script in current tab to collect page content and scripts
          const pageContent = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                  // Collect all script contents
                  const scripts = Array.from(document.getElementsByTagName('script'))
                      .map(script => ({
                          content: script.innerHTML || '',
                          src: script.src || 'inline'
                      }))
                      .filter(script => script.content.trim().length > 0 || script.src !== 'inline');

                  // Collect page HTML
                  const content = document.documentElement.outerHTML;

                  return {
                      content,
                      scripts
                  };
              }
          });

          console.log("Making request for URL:", tab.url);

          // Make POST request to backend with collected content
          const response = await fetch('http://localhost:8000/extension/scan', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  url: tab.url,
                  content: pageContent[0].result.content,
                  scripts: pageContent[0].result.scripts
              })
          });

          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log("Scan result:", result);

          // Update trust score with color coding
          const score = result.trustScore || 0;  // Default to 0 if undefined
          trustScoreElement.textContent = score;
          
          // Add color based on score
          if (score >= 80) {
              trustScoreElement.style.color = '#4CAF50'; // Green
          } else if (score >= 60) {
              trustScoreElement.style.color = '#FFA500'; // Orange
          } else {
              trustScoreElement.style.color = '#FF0000'; // Red
          }

          // Update alerts with icons based on severity
          if (result.alerts && result.alerts.length > 0) {
              alertList.innerHTML = result.alerts
                  .map(alert => {
                      let icon = '⚠️'; // Default warning icon
                      if (alert.toLowerCase().includes('critical')) {
                          icon = '🚨'; // Critical alert
                      } else if (alert.toLowerCase().includes('high risk')) {
                          icon = '⛔'; // High risk
                      } else if (alert.toLowerCase().includes('medium risk')) {
                          icon = '⚠️'; // Medium risk
                      } else if (alert.toLowerCase().includes('low risk')) {
                          icon = 'ℹ️'; // Low risk
                      }
                      return `<li>${icon} ${alert}</li>`;
                  })
                  .join('');
          } else {
              alertList.innerHTML = "<li>✅ No threats detected</li>";
          }

      } catch (error) {
          console.error("Error during scan:", error);
          trustScoreElement.textContent = "Error";
          trustScoreElement.style.color = '#FF0000';
          
          // Handle different types of errors
          if (error.message.includes('Cannot scan Chrome system pages')) {
              alertList.innerHTML = `
                  <li>ℹ️ ${error.message}</li>
                  <li>🔍 Try scanning a regular website instead</li>
              `;
          } else if (error.message.includes('Failed to fetch')) {
              alertList.innerHTML = `
                  <li>🔴 ${error.message || 'Failed to connect to backend'}</li>
                  <li>ℹ️ Make sure the backend server is running at http://localhost:8000</li>
                  <li>ℹ️ Run 'python app.py' in the backend directory</li>
              `;
          } else {
              alertList.innerHTML = `<li>🔴 ${error.message || 'An error occurred during scanning'}</li>`;
          }
      }
  });
});