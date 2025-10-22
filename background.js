console.log('Brave Capture background service worker started');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Brave Capture extension installed');
  
  chrome.storage.local.get(['captures'], (result) => {
    if (!result.captures) {
      chrome.storage.local.set({ captures: [] });
    }
  });
  
  chrome.storage.local.set({
    settings: {
      maxCaptures: 1000,
      autoExport: false,
      exportFormat: 'json',
      captureInterval: null
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureComplete') {
    handleCaptureComplete(request.capture);
  }
  
  if (request.action === 'exportData') {
    exportCaptures(request.format || 'json').then(sendResponse);
    return true;
  }
  
  if (request.action === 'getCaptureStats') {
    getCaptureStatistics().then(sendResponse);
    return true;
  }
  
  if (request.action === 'clearOldCaptures') {
    clearOldCaptures(request.daysToKeep || 30).then(sendResponse);
    return true;
  }
  
  if (request.action === 'scheduleCapture') {
    scheduleAutomaticCapture(request.url, request.interval).then(sendResponse);
    return true;
  }
});

function handleCaptureComplete(capture) {
  chrome.storage.local.get(['captures', 'settings'], (result) => {
    const captures = result.captures || [];
    const settings = result.settings || {};
    
    const existingIndex = captures.findIndex(c => 
      c.url === capture.url && 
      Math.abs(new Date(c.timestamp) - new Date(capture.timestamp)) < 60000
    );
    
    if (existingIndex === -1) {
      console.log('New capture saved for:', capture.url);
      
      if (settings.autoExport) {
        exportCaptures(settings.exportFormat);
      }
      
      chrome.storage.local.get(['captureGroups'], (groupResult) => {
        const groups = groupResult.captureGroups || {};
        const domain = new URL(capture.url).hostname;
        
        if (!groups[domain]) {
          groups[domain] = [];
        }
        
        groups[domain].push({
          id: capture.id,
          timestamp: capture.timestamp,
          title: capture.title
        });
        
        chrome.storage.local.set({ captureGroups: groups });
      });
    }
  });
}

async function exportCaptures(format = 'json') {
  return new Promise((resolve) => {
    chrome.storage.local.get(['captures'], async (result) => {
      const captures = result.captures || [];
      
      if (captures.length === 0) {
        resolve({ success: false, message: 'No captures to export' });
        return;
      }
      
      let exportData;
      let filename;
      let mimeType;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      switch (format) {
        case 'json':
          exportData = JSON.stringify(captures, null, 2);
          filename = `brave-capture-export-${timestamp}.json`;
          mimeType = 'application/json';
          break;
          
        case 'csv':
          exportData = convertToCSV(captures);
          filename = `brave-capture-export-${timestamp}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'html':
          exportData = generateHTMLReport(captures);
          filename = `brave-capture-export-${timestamp}.html`;
          mimeType = 'text/html';
          break;
          
        default:
          exportData = JSON.stringify(captures, null, 2);
          filename = `brave-capture-export-${timestamp}.json`;
          mimeType = 'application/json';
      }
      
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, message: chrome.runtime.lastError.message });
        } else {
          resolve({ success: true, filename: filename, downloadId: downloadId });
        }
        
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
    });
  });
}

function convertToCSV(captures) {
  const headers = ['ID', 'URL', 'Title', 'Timestamp', 'Domain', 'Text Count', 'Links Count', 'Images Count'];
  
  const rows = captures.map(capture => {
    const textCount = capture.data?.text?.allText?.length || 0;
    const linksCount = capture.data?.links?.length || 0;
    const imagesCount = capture.data?.images?.length || 0;
    const domain = new URL(capture.url).hostname;
    
    return [
      capture.id,
      capture.url,
      capture.title?.replace(/,/g, ';'),
      capture.timestamp,
      domain,
      textCount,
      linksCount,
      imagesCount
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

function generateHTMLReport(captures) {
  const groupedByDomain = {};
  
  captures.forEach(capture => {
    const domain = new URL(capture.url).hostname;
    if (!groupedByDomain[domain]) {
      groupedByDomain[domain] = [];
    }
    groupedByDomain[domain].push(capture);
  });
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Brave Capture Export Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #667eea;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .domain-section {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .domain-title {
      color: #333;
      font-size: 20px;
      margin-bottom: 15px;
      border-left: 4px solid #764ba2;
      padding-left: 10px;
    }
    .capture-item {
      border-left: 2px solid #e0e0e0;
      padding-left: 15px;
      margin: 15px 0;
    }
    .capture-meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .capture-data {
      background: #f9f9f9;
      padding: 10px;
      border-radius: 4px;
      font-size: 13px;
      max-height: 200px;
      overflow-y: auto;
    }
    .stats {
      display: flex;
      gap: 20px;
      margin-top: 10px;
      font-size: 14px;
    }
    .stat-item {
      background: #667eea15;
      padding: 5px 10px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>Brave Capture Export Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <p>Total Captures: ${captures.length}</p>
  
  ${Object.entries(groupedByDomain).map(([domain, domainCaptures]) => `
    <div class="domain-section">
      <h2 class="domain-title">${domain} (${domainCaptures.length} captures)</h2>
      ${domainCaptures.map(capture => `
        <div class="capture-item">
          <div class="capture-meta">
            <strong>${capture.title || 'Untitled'}</strong><br>
            ${new Date(capture.timestamp).toLocaleString()}<br>
            <a href="${capture.url}" target="_blank">${capture.url}</a>
          </div>
          <div class="stats">
            <span class="stat-item">Text: ${capture.data?.text?.allText?.length || 0} items</span>
            <span class="stat-item">Links: ${capture.data?.links?.length || 0}</span>
            <span class="stat-item">Images: ${capture.data?.images?.length || 0}</span>
            <span class="stat-item">Tables: ${capture.data?.tables?.length || 0}</span>
          </div>
          <details>
            <summary>View captured data</summary>
            <div class="capture-data">
              <pre>${JSON.stringify(capture.data, null, 2)}</pre>
            </div>
          </details>
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>`;
  
  return html;
}

async function getCaptureStatistics() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['captures'], (result) => {
      const captures = result.captures || [];
      
      const stats = {
        totalCaptures: captures.length,
        uniqueDomains: new Set(captures.map(c => new URL(c.url).hostname)).size,
        oldestCapture: captures.length > 0 ? captures[captures.length - 1].timestamp : null,
        newestCapture: captures.length > 0 ? captures[0].timestamp : null,
        averageDataSize: 0,
        topDomains: {}
      };
      
      const domainCounts = {};
      let totalSize = 0;
      
      captures.forEach(capture => {
        const domain = new URL(capture.url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        
        totalSize += JSON.stringify(capture.data).length;
      });
      
      stats.averageDataSize = captures.length > 0 ? Math.round(totalSize / captures.length) : 0;
      
      stats.topDomains = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .reduce((acc, [domain, count]) => {
          acc[domain] = count;
          return acc;
        }, {});
      
      resolve(stats);
    });
  });
}

async function clearOldCaptures(daysToKeep) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['captures'], (result) => {
      const captures = result.captures || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const filteredCaptures = captures.filter(capture => {
        return new Date(capture.timestamp) > cutoffDate;
      });
      
      const removedCount = captures.length - filteredCaptures.length;
      
      chrome.storage.local.set({ captures: filteredCaptures }, () => {
        resolve({
          success: true,
          removedCount: removedCount,
          remainingCount: filteredCaptures.length
        });
      });
    });
  });
}

async function scheduleAutomaticCapture(url, intervalMinutes) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['scheduledCaptures'], (result) => {
      const scheduled = result.scheduledCaptures || {};
      
      if (intervalMinutes <= 0) {
        delete scheduled[url];
      } else {
        scheduled[url] = {
          interval: intervalMinutes,
          lastCapture: null,
          nextCapture: new Date(Date.now() + intervalMinutes * 60000).toISOString()
        };
      }
      
      chrome.storage.local.set({ scheduledCaptures: scheduled }, () => {
        if (intervalMinutes > 0) {
          setupCaptureAlarm(url, intervalMinutes);
        } else {
          chrome.alarms.clear(`capture-${url}`);
        }
        
        resolve({
          success: true,
          scheduled: intervalMinutes > 0,
          url: url,
          interval: intervalMinutes
        });
      });
    });
  });
}

function setupCaptureAlarm(url, intervalMinutes) {
  const alarmName = `capture-${url}`;
  
  chrome.alarms.create(alarmName, {
    delayInMinutes: intervalMinutes,
    periodInMinutes: intervalMinutes
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('capture-')) {
    const url = alarm.name.replace('capture-', '');
    performScheduledCapture(url);
  }
});

async function performScheduledCapture(url) {
  try {
    const tabs = await chrome.tabs.query({ url: url });
    
    if (tabs.length === 0) {
      const newTab = await chrome.tabs.create({ url: url, active: false });
      
      setTimeout(async () => {
        const results = await chrome.scripting.executeScript({
          target: { tabId: newTab.id },
          files: ['content.js']
        });
        
        chrome.tabs.remove(newTab.id);
      }, 5000);
    } else {
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      });
    }
  } catch (error) {
    console.error('Error performing scheduled capture:', error);
  }
}