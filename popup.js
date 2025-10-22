let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
  const captureBtn = document.getElementById('captureBtn');
  const exportBtn = document.getElementById('exportBtn');
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
      chrome.storage.local.get(['captures'], (result) => {
        const captures = result.captures || [];

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
      });
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Failed to export data', 'error');
    }
  });

  captureBtn.addEventListener('click', async () => {
    if (!currentTab) {
      showMessage('No active tab found', 'error');
      return;
    }

    captureBtn.disabled = true;
    captureBtn.innerHTML = 'Capturing<span class="spinner"></span>';
    messageElement.innerHTML = '';

    try {
      // Send message to content script to capture data
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'captureData' });

      if (response && response.success) {
        const capture = {
          url: currentTab.url,
          title: currentTab.title,
          timestamp: new Date().toISOString(),
          data: response.data,
          protocol: response.data.protocol,
          id: generateId()
        };

        await saveCapture(capture);

        // Run basic validation on the captured data
        const validation = await validateCapture(capture);

        // Compare with previous capture to detect changes
        const comparison = await compareWithPrevious(capture);

        // Display combined validation and comparison results
        const allIssues = [...validation.issues];
        const allWarnings = [...validation.warnings];

        if (comparison) {
          if (comparison.criticalChanges.length > 0) {
            allWarnings.push(...comparison.criticalChanges);
          }

          console.log('📊 Historical Comparison:', {
            positionsAdded: comparison.positionsAdded,
            positionsRemoved: comparison.positionsRemoved,
            significantChanges: comparison.significantChanges,
            criticalChanges: comparison.criticalChanges
          });
        }

        if (allIssues.length > 0) {
          showMessage(`Captured with ${allIssues.length} issue(s) - check console`, 'warning');
          console.warn('Capture validation issues:', allIssues);
        } else if (allWarnings.length > 0) {
          showMessage(`Captured with ${allWarnings.length} warning(s)`, 'success');
          console.warn('Capture warnings:', allWarnings);
        } else {
          showMessage('Page data captured successfully!', 'success');
        }

        loadRecentCaptures();

        chrome.runtime.sendMessage({
          action: 'captureComplete',
          capture: capture
        });

      } else {
        throw new Error(response?.error || 'Failed to capture page data');
      }
    } catch (error) {
      console.error('Capture error:', error);
      showMessage('Failed to capture page data', 'error');
    } finally {
      captureBtn.disabled = false;
      captureBtn.textContent = 'Capture Page Data';
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

  return new Promise((resolve) => {
    chrome.storage.local.get(['captures'], (result) => {
      const captures = result.captures || [];

      // Find the most recent previous capture from the same protocol
      const previousCapture = captures.find((c, index) =>
        index > 0 && // Skip the current capture (index 0)
        c.protocol === capture.protocol &&
        c.data?.content?.clmPositions
      );

      if (!previousCapture) {
        resolve(null);
        return;
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

      resolve({
        previousTimestamp: previousCapture.timestamp,
        criticalChanges,
        significantChanges,
        positionsAdded,
        positionsRemoved
      });
    });
  });
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

async function saveCapture(capture) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['captures'], (result) => {
      const captures = result.captures || [];
      captures.unshift(capture);
      
      if (captures.length > 1000) {
        captures.splice(1000);
      }
      
      chrome.storage.local.set({ captures }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });
}

async function loadRecentCaptures() {
  chrome.storage.local.get(['captures'], (result) => {
    const captures = result.captures || [];
    const recentCaptures = captures.slice(0, 5);
    
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
  });
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