let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
  const captureBtn = document.getElementById('captureBtn');
  const exportBtn = document.getElementById('exportBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const currentUrlElement = document.getElementById('currentUrl');
  const messageElement = document.getElementById('message');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    currentUrlElement.textContent = tab.url || 'Unknown';

    loadRecentCaptures();
  } catch (error) {
    currentUrlElement.textContent = 'Error loading page info';
    console.error('Error getting current tab:', error);
  }

  exportBtn.addEventListener('click', async () => {
    try {
      // Get all captures from Supabase
      const captures = await window.getCaptures();

      if (captures.length === 0) {
        showMessage('No captures to export', 'error');
        return;
      }

      const dataStr = JSON.stringify(captures, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      chrome.downloads.download({
        url: url,
        filename: `brave-capture-${timestamp}.json`,
        saveAs: true
      }, () => {
        showMessage('Data exported successfully!', 'success');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Failed to export data', 'error');
    }
  });

  dashboardBtn.addEventListener('click', () => {
    // Open dashboard in a new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  captureBtn.addEventListener('click', async () => {
    if (!currentTab) {
      showMessage('No active tab found', 'error');
      return;
    }

    // Immediate visual feedback
    captureBtn.disabled = true;
    captureBtn.innerHTML = '⏳ Capturing<span class="spinner"></span>';
    captureBtn.style.opacity = '0.7';
    showMessage('⏳ Waiting for page data...', 'info');

    let response = null; // Initialize response

    try {
      console.log('📊 Starting capture for URL:', currentTab.url);
      console.log('Tab ID:', currentTab.id);

      // Send message to content script to capture data
      response = await chrome.tabs.sendMessage(currentTab.id, { action: 'captureData' });

      console.log('📦 Response from content script:', response);

      if (response && response.success) {
        showMessage('✅ Data captured! Saving...', 'info');

        const capture = {
          url: currentTab.url,
          title: currentTab.title,
          timestamp: new Date().toISOString(),
          data: response.data,
          protocol: response.data.protocol,
          id: generateId()
        };

        // Save to Supabase (using function from supabase-client.js)
        showMessage('💾 Saving to database...', 'info');
        console.log('🔍 Attempting to save to Supabase...');
        const saveResult = await window.saveCapture(capture);
        console.log('🔍 Supabase save result:', saveResult);

        if (!saveResult.success) {
          console.error('❌ Supabase save failed:', saveResult.error);
          // Don't throw - allow file save to continue even if Supabase fails
          showMessage('⚠️ Database save failed, but file saved locally', 'warning');
        } else {
          console.log('✅ Supabase save successful');
        }

        // ALSO save to local file with timestamped name
        const fileResult = await window.FileStorage.saveCaptureToFile(capture);
        let fileSaveMessage = '';
        if (fileResult.success) {
          console.log('✅ Saved to file:', fileResult.path);
          const fileName = fileResult.path.split('/').pop();
          fileSaveMessage = ` File: ${fileName}`;
        } else {
          console.warn('⚠️ Could not save to file:', fileResult.error);
        }

        // Show success immediately - don't wait for validation/comparison
        showMessage(`✅ Captured! ${fileSaveMessage}`, 'success');

        // Run validation and comparison in background (don't block UI)
        Promise.all([
          validateCapture(capture),
          compareWithPrevious(capture)
        ]).then(([validation, comparison]) => {
          // Log results in console for debugging
          if (validation.issues.length > 0) {
            console.warn('⚠️ Validation issues:', validation.issues);
          }
          if (validation.warnings.length > 0) {
            console.log('⚠️ Validation warnings:', validation.warnings);
          }
          if (comparison) {
            console.log('📊 Changes detected:', {
              added: comparison.positionsAdded.length,
              removed: comparison.positionsRemoved.length,
              significant: comparison.significantChanges.length,
              critical: comparison.criticalChanges.length
            });
          }
        }).catch(err => {
          console.warn('Background validation/comparison failed:', err);
        });

        loadRecentCaptures();

        chrome.runtime.sendMessage({
          action: 'captureComplete',
          capture: capture
        });

      } else {
        console.error('❌ No success response from content script');
        console.error('Response received:', response);
        throw new Error(response?.error || 'Failed to capture page data - no valid response');
      }
    } catch (error) {
      console.error('❌ CAPTURE ERROR:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        url: currentTab?.url,
        tabId: currentTab?.id
      });

      // Better error messages for users
      let userMessage = 'Failed to capture page data';

      if (error.message && error.message.includes('Could not establish connection')) {
        userMessage = '⚠️ Content script not loaded. Please reload the page and extension, then try again.';
      } else if (error.message && error.message.includes('protocol')) {
        userMessage = '⚠️ Unsupported protocol or page. Try the positions/liquidity page.';
      } else if (response?.error) {
        userMessage = `❌ ${response.error}`;
      }

      showMessage(userMessage, 'error');
    } finally {
      captureBtn.disabled = false;
      captureBtn.textContent = 'Capture Page Data';
      captureBtn.style.opacity = '1';
    }
  });
});

function capturePageData() {
  const data = {
    text: {},
    links: [],
    images: [],
    tables: [],
    metadata: {}
  };
  
  data.metadata.capturedAt = new Date().toISOString();
  data.metadata.url = window.location.href;
  data.metadata.title = document.title;
  
  const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, li, td, th');
  const textContent = new Set();
  
  textElements.forEach(element => {
    const text = element.innerText?.trim();
    if (text && text.length > 0 && text.length < 5000) {
      textContent.add(text);
    }
  });
  
  data.text.allText = Array.from(textContent);
  
  const headings = {};
  for (let i = 1; i <= 6; i++) {
    const elements = document.querySelectorAll(`h${i}`);
    if (elements.length > 0) {
      headings[`h${i}`] = Array.from(elements).map(el => el.innerText?.trim()).filter(Boolean);
    }
  }
  data.text.headings = headings;
  
  const links = document.querySelectorAll('a[href]');
  data.links = Array.from(links).map(link => ({
    text: link.innerText?.trim() || link.title || '',
    href: link.href,
    isExternal: !link.href.includes(window.location.hostname)
  })).filter(link => link.text || link.href);
  
  const images = document.querySelectorAll('img[src]');
  data.images = Array.from(images).map(img => ({
    src: img.src,
    alt: img.alt || '',
    title: img.title || '',
    width: img.naturalWidth,
    height: img.naturalHeight
  }));
  
  const tables = document.querySelectorAll('table');
  data.tables = Array.from(tables).map(table => {
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText?.trim());
    const rows = Array.from(table.querySelectorAll('tr')).map(tr => {
      return Array.from(tr.querySelectorAll('td')).map(td => td.innerText?.trim());
    }).filter(row => row.length > 0);
    
    return {
      headers,
      rows,
      summary: table.getAttribute('summary') || ''
    };
  });
  
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLdScripts.length > 0) {
    data.metadata.structuredData = Array.from(jsonLdScripts).map(script => {
      try {
        return JSON.parse(script.textContent);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  }
  
  const metaTags = document.querySelectorAll('meta');
  data.metadata.meta = {};
  metaTags.forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property');
    const content = meta.getAttribute('content');
    if (name && content) {
      data.metadata.meta[name] = content;
    }
  });
  
  const customDataElements = document.querySelectorAll('[data-capture], [data-track], .capture-this');
  if (customDataElements.length > 0) {
    data.customElements = Array.from(customDataElements).map(el => ({
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList),
      text: el.innerText?.trim(),
      attributes: Array.from(el.attributes).reduce((acc, attr) => {
        if (attr.name.startsWith('data-')) {
          acc[attr.name] = attr.value;
        }
        return acc;
      }, {})
    }));
  }
  
  return data;
}

async function compareWithPrevious(capture) {
  // Only compare if we have CLM position data
  if (!capture.data?.content?.clmPositions) {
    return null;
  }

  try {
    // Get previous captures from Supabase
    const previousCaptures = await window.getCaptures({
      protocol: capture.protocol,
      limit: 10
    });

    // Find the most recent previous capture (excluding current one)
    const previousCapture = previousCaptures.find(c =>
      c.id !== capture.id &&
      c.data?.content?.clmPositions
    );

    if (!previousCapture) {
      return null;
    }

    const current = capture.data.content.clmPositions;
    const previous = previousCapture.data.content.clmPositions;

    const criticalChanges = [];
    const significantChanges = [];
    const positionsAdded = [];
    const positionsRemoved = [];

    // Create maps for easier comparison
    const currentPairs = new Map();
    current.positions.forEach(pos => {
      if (pos.pair) currentPairs.set(pos.pair, pos);
    });

    const previousPairs = new Map();
    previous.positions.forEach(pos => {
      if (pos.pair) previousPairs.set(pos.pair, pos);
    });

    // Find added positions
    currentPairs.forEach((pos, pair) => {
      if (!previousPairs.has(pair)) {
        positionsAdded.push(pair);
      }
    });

    // Find removed positions
    previousPairs.forEach((pos, pair) => {
      if (!currentPairs.has(pair)) {
        positionsRemoved.push(pair);
      }
    });

    // Compare existing positions
    currentPairs.forEach((currentPos, pair) => {
      const previousPos = previousPairs.get(pair);
      if (!previousPos) return;

      // Check if position went out of range
      if (previousPos.inRange && !currentPos.inRange) {
        criticalChanges.push(`${pair}: Position went OUT OF RANGE`);
      }

      // Check if position came back in range
      if (!previousPos.inRange && currentPos.inRange) {
        significantChanges.push(`${pair}: Position came back IN RANGE`);
      }

      // Check for large balance changes (>50%)
      if (previousPos.balance && currentPos.balance) {
        const balanceChange = Math.abs(currentPos.balance - previousPos.balance) / previousPos.balance;
        if (balanceChange > 0.5) {
          const direction = currentPos.balance > previousPos.balance ? 'increased' : 'decreased';
          const percentChange = (balanceChange * 100).toFixed(1);
          criticalChanges.push(`${pair}: Balance ${direction} by ${percentChange}%`);
        }
      }

      // Check for significant APY changes (>20% absolute change)
      if (previousPos.apy && currentPos.apy) {
        const apyChange = Math.abs(currentPos.apy - previousPos.apy);
        if (apyChange > 20) {
          const direction = currentPos.apy > previousPos.apy ? 'increased' : 'decreased';
          significantChanges.push(`${pair}: APY ${direction} from ${previousPos.apy.toFixed(1)}% to ${currentPos.apy.toFixed(1)}%`);
        }
      }

      // Check for price moving close to range boundaries
      if (currentPos.inRange && currentPos.currentPrice && currentPos.rangeMin && currentPos.rangeMax) {
        const rangeSize = currentPos.rangeMax - currentPos.rangeMin;
        const distanceToMin = Math.abs(currentPos.currentPrice - currentPos.rangeMin);
        const distanceToMax = Math.abs(currentPos.currentPrice - currentPos.rangeMax);

        if (distanceToMin < rangeSize * 0.1 || distanceToMax < rangeSize * 0.1) {
          criticalChanges.push(`${pair}: Price approaching range boundary`);
        }
      }
    });

    // Check for total portfolio value changes
    if (previous.summary?.totalValue && current.summary?.totalValue) {
      const prevValue = parseFloat(previous.summary.totalValue);
      const currValue = parseFloat(current.summary.totalValue);
      const valueChange = Math.abs(currValue - prevValue) / prevValue;

      if (valueChange > 0.2) {
        const direction = currValue > prevValue ? 'increased' : 'decreased';
        const percentChange = (valueChange * 100).toFixed(1);
        significantChanges.push(`Total portfolio value ${direction} by ${percentChange}%`);
      }
    }

    return {
      previousTimestamp: previousCapture.timestamp,
      criticalChanges,
      significantChanges,
      positionsAdded,
      positionsRemoved
    };
  } catch (error) {
    console.error('Error comparing with previous:', error);
    return null;
  }
}

async function validateCapture(capture) {
  const issues = [];
  const warnings = [];

  // Only validate if we have CLM position data
  if (!capture.data?.content?.clmPositions) {
    return { issues, warnings, passed: true };
  }

  const { clmPositions } = capture.data.content;
  const { positions, summary } = clmPositions;

  // Check summary data
  if (!summary?.totalValue) {
    warnings.push('Missing total portfolio value');
  }

  if (summary?.totalValue && parseFloat(summary.totalValue) < 0) {
    issues.push('Negative total portfolio value');
  }

  // Validate each position
  positions.forEach((pos, index) => {
    const posId = `${pos.pair || 'Position ' + (index + 1)}`;

    // Missing critical data
    if (!pos.pair) warnings.push(`${posId}: Missing pair name`);
    if (pos.balance === null || pos.balance === undefined) {
      warnings.push(`${posId}: Missing balance`);
    }

    // Range validation
    if (pos.rangeMin !== null && pos.rangeMax !== null) {
      if (pos.rangeMin > pos.rangeMax) {
        issues.push(`${posId}: Range min (${pos.rangeMin}) > range max (${pos.rangeMax})`);
      }

      // In-range logic validation
      if (pos.currentPrice && pos.rangeMin && pos.rangeMax) {
        const shouldBeInRange = pos.currentPrice >= pos.rangeMin && pos.currentPrice <= pos.rangeMax;
        if (shouldBeInRange !== pos.inRange) {
          issues.push(`${posId}: In-range logic error`);
        }
      }
    }

    // Outlier detection
    if (pos.apy && pos.apy > 10000) {
      warnings.push(`${posId}: Very high APY (${pos.apy}%)`);
    }

    if (pos.apy && pos.apy < 0) {
      issues.push(`${posId}: Negative APY`);
    }

    if (pos.balance && pos.balance < 0) {
      issues.push(`${posId}: Negative balance`);
    }
  });

  return {
    issues,
    warnings,
    passed: issues.length === 0
  };
}

// saveCapture function is now provided by supabase-client.js
// No longer using Chrome local storage

async function loadRecentCaptures() {
  try {
    // Load from Supabase instead of local storage
    const recentCaptures = await window.getRecentCaptures(5);

    if (recentCaptures.length > 0) {
      const capturesContainer = document.getElementById('recentCaptures');
      const capturesList = document.getElementById('capturesList');

      capturesContainer.style.display = 'block';
      capturesList.innerHTML = recentCaptures.map(capture => {
        const date = new Date(capture.timestamp);
        const timeStr = date.toLocaleTimeString();
        const dateStr = date.toLocaleDateString();
        const domain = new URL(capture.url).hostname;

        return `
          <div class="capture-item">
            <strong>${domain}</strong><br>
            ${dateStr} at ${timeStr}
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading recent captures:', error);
  }
}

function showMessage(text, type) {
  const messageElement = document.getElementById('message');
  messageElement.className = `message ${type}`;
  messageElement.textContent = text;
  
  setTimeout(() => {
    messageElement.innerHTML = '';
    messageElement.className = '';
  }, 3000);
}

function generateId() {
  return `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}