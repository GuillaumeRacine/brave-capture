let isCapturing = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureData') {
    if (isCapturing) {
      sendResponse({ error: 'Capture already in progress' });
      return true;
    }

    isCapturing = true;

    // Check if we need to wait for content to load (Hyperion details page, Beefy, or PancakeSwap)
    const needsDelay = (window.location.hostname.includes('hyperion') &&
                        window.location.pathname.includes('/position/')) ||
                       (window.location.hostname.includes('beefy')) ||
                       (window.location.hostname.includes('pancakeswap'));

    if (needsDelay) {
      console.log('Dynamic content detected (Hyperion/Beefy/PancakeSwap) - waiting for content to load...');
      setTimeout(() => {
        try {
          const captureData = performDetailedCapture();
          sendResponse({ success: true, data: captureData });
        } catch (error) {
          console.error('Error capturing data:', error);
          console.error('Error stack:', error.stack);
          sendResponse({ success: false, error: error.message || 'Unknown error' });
        } finally {
          isCapturing = false;
        }
      }, 2000); // Wait 2 seconds for content to load
      return true; // Keep connection open for async response
    }

    try {
      const captureData = performDetailedCapture();
      sendResponse({ success: true, data: captureData });
    } catch (error) {
      console.error('Error capturing data:', error);
      console.error('Error stack:', error.stack);
      sendResponse({ success: false, error: error.message || 'Unknown error' });
    } finally {
      isCapturing = false;
    }

    return true;
  }

  if (request.action === 'highlightElements') {
    highlightCaptureElements();
    sendResponse({ success: true });
    return true;
  }
});

function performDetailedCapture() {
  const capture = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    domain: window.location.hostname,
    path: window.location.pathname,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    },
    content: {},
    performance: {}
  };
  
  capture.content.forms = captureForms();
  capture.content.media = captureMedia();
  capture.content.dynamicContent = captureDynamicContent();
  capture.content.dataAttributes = captureDataAttributes();
  capture.content.textHierarchy = captureTextHierarchy();
  capture.content.images = captureImages();
  capture.content.links = captureLinks();
  capture.content.tables = captureTables();
  capture.content.text = captureText();

  // Detect and parse CLM positions (protocol-specific)
  if (window.location.hostname.includes('orca.so')) {
    try {
      capture.content.clmPositions = captureOrcaCLMPositions();
      capture.protocol = 'Orca';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Orca';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('raydium.io')) {
    try {
      capture.content.clmPositions = captureRaydiumCLMPositions();
      capture.protocol = 'Raydium';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Raydium';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('aerodrome.finance')) {
    try {
      capture.content.clmPositions = captureAerodromeCLMPositions();
      capture.protocol = 'Aerodrome';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Aerodrome';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('cetus.zone') || window.location.hostname.includes('app.cetus.zone')) {
    try {
      capture.content.clmPositions = captureCetusCLMPositions();
      capture.protocol = 'Cetus';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Cetus';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('hyperion')) {
    try {
      capture.content.clmPositions = captureHyperionCLMPositions();
      capture.protocol = 'Hyperion';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Hyperion';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('pancakeswap.finance')) {
    try {
      capture.content.clmPositions = capturePancakeSwapCLMPositions();
      capture.protocol = 'PancakeSwap';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'PancakeSwap';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('beefy')) {
    try {
      capture.content.clmPositions = captureBeefyCLMPositions();
      capture.protocol = 'Beefy';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Beefy';
      capture.content.clmPositions = { error: error.message };
    }
  }

  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    capture.performance = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: timing.responseStart - timing.navigationStart
    };
  }

  return capture;
}

function captureForms() {
  const forms = document.querySelectorAll('form');
  return Array.from(forms).map(form => {
    const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
      type: input.type || input.tagName.toLowerCase(),
      name: input.name,
      id: input.id,
      value: input.type === 'password' ? '[REDACTED]' : input.value,
      placeholder: input.placeholder || '',
      required: input.required,
      checked: input.checked,
      options: input.tagName === 'SELECT' ? Array.from(input.options).map(opt => ({
        text: opt.text,
        value: opt.value,
        selected: opt.selected
      })) : undefined
    }));
    
    return {
      action: form.action,
      method: form.method,
      id: form.id,
      name: form.name,
      inputs: inputs
    };
  });
}

function captureMedia() {
  const videos = document.querySelectorAll('video');
  const audios = document.querySelectorAll('audio');
  const iframes = document.querySelectorAll('iframe');
  
  return {
    videos: Array.from(videos).map(video => ({
      src: video.src || video.currentSrc,
      duration: video.duration,
      currentTime: video.currentTime,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      width: video.width,
      height: video.height
    })),
    audios: Array.from(audios).map(audio => ({
      src: audio.src || audio.currentSrc,
      duration: audio.duration,
      currentTime: audio.currentTime,
      paused: audio.paused,
      muted: audio.muted,
      volume: audio.volume
    })),
    iframes: Array.from(iframes).map(iframe => ({
      src: iframe.src,
      width: iframe.width,
      height: iframe.height,
      title: iframe.title
    }))
  };
}

function captureDynamicContent() {
  const dynamic = {
    ajaxElements: [],
    lazyLoadedImages: [],
    infiniteScrollElements: []
  };
  
  const observedElements = document.querySelectorAll('[data-loaded], [data-src], .lazy-load, .ajax-content');
  dynamic.ajaxElements = Array.from(observedElements).map(el => ({
    tag: el.tagName.toLowerCase(),
    classes: Array.from(el.classList),
    dataSrc: el.getAttribute('data-src'),
    loaded: el.getAttribute('data-loaded') === 'true',
    content: el.innerText?.trim().substring(0, 200)
  }));
  
  const lazyImages = document.querySelectorAll('img[data-src], img.lazy, img[loading="lazy"]');
  dynamic.lazyLoadedImages = Array.from(lazyImages).map(img => ({
    currentSrc: img.src,
    dataSrc: img.getAttribute('data-src'),
    loaded: img.complete && img.naturalWidth > 0,
    alt: img.alt
  }));
  
  const scrollContainers = document.querySelectorAll('[data-infinite-scroll], .infinite-scroll, [data-pagination]');
  dynamic.infiniteScrollElements = Array.from(scrollContainers).map(container => ({
    tag: container.tagName.toLowerCase(),
    id: container.id,
    classes: Array.from(container.classList),
    childCount: container.children.length,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight
  }));
  
  return dynamic;
}

function captureDataAttributes() {
  const elementsWithData = document.querySelectorAll('*[data-id], *[data-value], *[data-price], *[data-name], *[data-category], *[data-tracking]');
  
  return Array.from(elementsWithData).map(el => {
    const dataAttrs = {};
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        dataAttrs[attr.name] = attr.value;
      }
    });
    
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id,
      classes: Array.from(el.classList),
      text: el.innerText?.trim().substring(0, 100),
      dataAttributes: dataAttrs
    };
  });
}

function captureTextHierarchy() {
  const hierarchy = {
    mainContent: '',
    sections: [],
    lists: [],
    emphasis: []
  };
  
  const main = document.querySelector('main, [role="main"], #main, .main-content');
  if (main) {
    hierarchy.mainContent = main.innerText?.trim().substring(0, 1000);
  }
  
  const sections = document.querySelectorAll('section, article, [role="article"]');
  hierarchy.sections = Array.from(sections).slice(0, 10).map(section => ({
    heading: section.querySelector('h1, h2, h3')?.innerText?.trim(),
    text: section.innerText?.trim().substring(0, 500),
    id: section.id,
    classes: Array.from(section.classList)
  }));
  
  const lists = document.querySelectorAll('ul, ol');
  hierarchy.lists = Array.from(lists).slice(0, 10).map(list => ({
    type: list.tagName.toLowerCase(),
    itemCount: list.children.length,
    items: Array.from(list.children).slice(0, 5).map(li => li.innerText?.trim())
  }));
  
  const emphasisElements = document.querySelectorAll('strong, b, em, i, mark, .highlight, .important');
  hierarchy.emphasis = Array.from(emphasisElements).slice(0, 20).map(el => ({
    tag: el.tagName.toLowerCase(),
    text: el.innerText?.trim(),
    classes: Array.from(el.classList)
  }));
  
  return hierarchy;
}

function captureOrcaCLMPositions() {
  const positions = [];

  // Try to capture portfolio summary
  const portfolioSummary = {};

  // Total Value
  const totalValueText = Array.from(document.querySelectorAll('*')).find(el =>
    el.textContent.includes('Total Value') && el.textContent.includes('$')
  );
  if (totalValueText) {
    const match = totalValueText.textContent.match(/\$([0-9,]+\.[0-9]{2})/);
    if (match) portfolioSummary.totalValue = match[1].replace(/,/g, '');
  }

  // Estimated Yield
  const yieldText = Array.from(document.querySelectorAll('*')).find(el =>
    el.textContent.includes('Estimated Yield') && el.textContent.includes('%')
  );
  if (yieldText) {
    const amountMatch = yieldText.textContent.match(/\$([0-9,]+\.[0-9]{2})/);
    const percentMatch = yieldText.textContent.match(/([0-9]+\.[0-9]+)%/);
    if (amountMatch) portfolioSummary.estimatedYieldAmount = amountMatch[1].replace(/,/g, '');
    if (percentMatch) portfolioSummary.estimatedYieldPercent = percentMatch[1];
  }

  // Pending Yield
  const pendingText = Array.from(document.querySelectorAll('*')).find(el =>
    el.textContent.includes('Pending Yield') && el.textContent.includes('$')
  );
  if (pendingText) {
    const match = pendingText.textContent.match(/\$([0-9,]+\.[0-9]{2})/);
    if (match) portfolioSummary.pendingYield = match[1].replace(/,/g, '');
  }

  // Find all table rows with position data
  const rows = document.querySelectorAll('table tbody tr, [role="row"]');

  rows.forEach((row, rowIndex) => {
    try {
      const cells = row.querySelectorAll('td, [role="cell"]');

      if (cells.length < 6) {
        return; // Need at least 6 cells for position data
      }

      const position = {};

      // Pool name and fee tier (first cell)
      const poolText = cells[0]?.textContent?.trim();
      if (poolText && poolText.includes('/')) {
        const poolMatch = poolText.match(/([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/);
        const feeMatch = poolText.match(/([0-9.]+)%/);
        if (poolMatch) {
          position.token0 = poolMatch[1];
          position.token1 = poolMatch[2];
          position.pair = `${poolMatch[1]}/${poolMatch[2]}`;
        }
        if (feeMatch) {
          position.feeTier = feeMatch[1];
        }
      }

      // Balance (second cell)
      const balanceText = cells[1]?.textContent?.trim();
      const balanceMatch = balanceText?.match(/\$([0-9,]+\.[0-9]{2})/);
      if (balanceMatch) {
        position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
        position.balanceFormatted = balanceMatch[1];
      }

      // Pending Yield (third cell)
      const pendingYieldText = cells[2]?.textContent?.trim();
      const pendingYieldMatch = pendingYieldText?.match(/\$([0-9,]+\.[0-9]{2})/);
      if (pendingYieldMatch) {
        position.pendingYield = parseFloat(pendingYieldMatch[1].replace(/,/g, ''));
        position.pendingYieldFormatted = pendingYieldMatch[1];
      }

      // Est. Yield APY (fourth cell)
      const apyText = cells[3]?.textContent?.trim();
      const apyMatch = apyText?.match(/([0-9.]+)%/);
      if (apyMatch) {
        position.apy = parseFloat(apyMatch[1]);
      }

      // Position Range (fifth cell) - use innerText which preserves line breaks
      const rangeCell = cells[4];
      const rangeText = rangeCell?.innerText || rangeCell?.textContent || '';

      // Split by line breaks to get individual values
      const lines = rangeText.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);

      const rangeNumbers = [];
      const percentages = [];

      // Parse each line
      for (const line of lines) {
        if (line.includes('%')) {
          // This is a percentage line
          const pcts = line.match(/([+-]?[0-9.]+%)/g);
          if (pcts) percentages.push(...pcts);
        } else {
          // This should be a range values line
          // Extract all decimal numbers from this line
          const nums = line.match(/([0-9]+\.?[0-9]+)/g);
          if (nums) {
            nums.forEach(n => rangeNumbers.push(parseFloat(n)));
          }
        }
      }

      // Remove duplicates by converting to Set and back to array
      const uniqueRangeNumbers = [...new Set(rangeNumbers)];

      if (uniqueRangeNumbers.length >= 2) {
        position.rangeMin = uniqueRangeNumbers[0];
        position.rangeMax = uniqueRangeNumbers[1];
      }

      // Filter percentages to only include actual percentage strings
      const actualPercentages = percentages.filter(p => p.includes('%') && p.match(/^[+-]?\d/));
      if (actualPercentages.length >= 2) {
        position.rangeMinPercent = actualPercentages[0];
        position.rangeMaxPercent = actualPercentages[1];
      }

      // Current Price (sixth cell)
      const priceText = cells[5]?.textContent?.trim();
      if (priceText) {
        const priceMatch = priceText.match(/([0-9.]+)/);
        if (priceMatch) {
          position.currentPrice = parseFloat(priceMatch[1]);
          position.currentPriceFormatted = priceText;
        }
      }

      // Calculate if position is in range
      if (position.rangeMin && position.rangeMax && position.currentPrice) {
        position.inRange = position.currentPrice >= position.rangeMin &&
                          position.currentPrice <= position.rangeMax;

        // Calculate distance from range boundaries
        if (position.currentPrice < position.rangeMin) {
          position.rangeStatus = 'below';
          const distancePercent = ((position.rangeMin - position.currentPrice) / position.currentPrice) * 100;
          position.distanceFromRange = `-${distancePercent.toFixed(2)}%`;
        } else if (position.currentPrice > position.rangeMax) {
          position.rangeStatus = 'above';
          const distancePercent = ((position.currentPrice - position.rangeMax) / position.rangeMax) * 100;
          position.distanceFromRange = `+${distancePercent.toFixed(2)}%`;
        } else {
          position.rangeStatus = 'in-range';
          position.distanceFromRange = '0%';
        }
      }

      // Add timestamp
      position.capturedAt = new Date().toISOString();

      // Only add if we have essential data
      if (position.pair && position.balance) {
        positions.push(position);
      }
    } catch (error) {
      console.error('Error parsing position row:', error);
    }
  });

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureRaydiumCLMPositions() {
  const positions = [];
  const portfolioSummary = {};

  // Raydium uses card-based layout
  // Strategy: Find containers that have BOTH "My Position" header AND "CLMM" indicator
  const allElements = document.querySelectorAll('div');

  // First find the main liquidity/position section
  const liquiditySection = Array.from(allElements).find(el => {
    const text = el.innerText || '';
    return text.includes('My Position') &&
           text.includes('Pending Yield') &&
           text.includes('CLMM') &&
           text.includes('Current Price');
  });

  if (!liquiditySection) {
    console.log('Raydium: No liquidity section found');
    return {
      summary: portfolioSummary,
      positions: positions,
      positionCount: 0,
      inRangeCount: 0,
      outOfRangeCount: 0
    };
  }

  // Extract all text from this section
  const sectionText = liquiditySection.innerText || '';
  console.log('Raydium: Found liquidity section');

  // Parse the position data from the section
  const position = {};

  // Extract pair
  const pairMatch = sectionText.match(/([A-Z][A-Za-z0-9]+)\s*\/\s*([A-Z][A-Za-z0-9]+)/);
  if (pairMatch) {
    position.token0 = pairMatch[1];
    position.token1 = pairMatch[2];
    position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
  }

  // Extract position balance - look for pattern "Position\n$X,XXX.XX"
  const balanceMatch = sectionText.match(/Position\s*\$([0-9,]+\.?[0-9]*)/);
  if (balanceMatch) {
    position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    position.balanceFormatted = balanceMatch[1];
  }

  // Extract APR
  const aprMatch = sectionText.match(/APR\s*([0-9]+\.?[0-9]*)%/);
  if (aprMatch) {
    position.apy = parseFloat(aprMatch[1]);
  }

  // Extract current price
  const priceMatch = sectionText.match(/Current Price:\s*([0-9]+\.?[0-9]*)/);
  if (priceMatch) {
    position.currentPrice = parseFloat(priceMatch[1]);
  }

  // Extract range
  const rangeMatch = sectionText.match(/([0-9]+\.?[0-9]+)\s*-\s*([0-9]+\.?[0-9]+)/);
  if (rangeMatch) {
    position.rangeMin = parseFloat(rangeMatch[1]);
    position.rangeMax = parseFloat(rangeMatch[2]);
  }

  // Extract pending yield - allow for newlines and extra text between label and value
  const pendingYieldMatch = sectionText.match(/Pending Yield[^\$]*\$([0-9,]+\.?[0-9]*)/);
  if (pendingYieldMatch) {
    position.pendingYield = parseFloat(pendingYieldMatch[1].replace(/,/g, ''));
    position.pendingYieldFormatted = pendingYieldMatch[1];
  } else {
    // Try alternative pattern - sometimes the value might be without $
    const altPendingMatch = sectionText.match(/Pending Yield[^\d]*([0-9,]+\.?[0-9]+)/);
    if (altPendingMatch) {
      position.pendingYield = parseFloat(altPendingMatch[1].replace(/,/g, ''));
      position.pendingYieldFormatted = altPendingMatch[1];
    }
  }

  // Calculate in-range status
  if (position.rangeMin && position.rangeMax && position.currentPrice) {
    position.inRange = position.currentPrice >= position.rangeMin &&
                      position.currentPrice <= position.rangeMax;

    if (position.currentPrice < position.rangeMin) {
      position.rangeStatus = 'below';
      const distancePercent = ((position.rangeMin - position.currentPrice) / position.currentPrice) * 100;
      position.distanceFromRange = `-${distancePercent.toFixed(2)}%`;
    } else if (position.currentPrice > position.rangeMax) {
      position.rangeStatus = 'above';
      const distancePercent = ((position.currentPrice - position.rangeMax) / position.rangeMax) * 100;
      position.distanceFromRange = `+${distancePercent.toFixed(2)}%`;
    } else {
      position.rangeStatus = 'in-range';
      position.distanceFromRange = '0%';
    }
  }

  position.capturedAt = new Date().toISOString();

  console.log('Raydium parsed position:', {
    pair: position.pair,
    balance: position.balance,
    pendingYield: position.pendingYield,
    apy: position.apy,
    currentPrice: position.currentPrice,
    rangeMin: position.rangeMin,
    rangeMax: position.rangeMax,
    inRange: position.inRange
  });

  // Only add if we have essential data
  if (position.pair && position.balance) {
    positions.push(position);
  }

  // Extract wallet overview and pending yield from the My Position section
  const walletOverviewEl = Array.from(allElements).find(el => {
    const text = el.innerText || '';
    return text.includes('Wallet Overview') && text.includes('$');
  });

  if (walletOverviewEl) {
    const text = walletOverviewEl.innerText || '';
    const totalValueMatch = text.match(/\$([0-9,]+\.?[0-9]*)/);
    if (totalValueMatch) {
      portfolioSummary.totalValue = totalValueMatch[1].replace(/,/g, '');
    }
  }

  // Try to get total pending yield from the My Position header section
  if (liquiditySection) {
    const headerText = liquiditySection.innerText || '';
    // Look for "Pending Yield" in the header area (before the position details)
    const headerPendingMatch = headerText.match(/Pending Yield[^\d]*([0-9,]+\.?[0-9]*)/);
    if (headerPendingMatch) {
      portfolioSummary.pendingYield = headerPendingMatch[1].replace(/,/g, '');
    }
  }

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureAerodromeCLMPositions() {
  const positions = [];
  const portfolioSummary = {};

  // Token address to symbol mapping for Base chain (Aerodrome)
  const tokenMap = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 'cbBTC',
    '0x4200000000000000000000000000000000000006': 'WETH',
    '0x940181a94a35a4569e4529a3cdfb74e38fd98631': 'AERO',
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI',
    '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': 'cbETH',
    '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42': 'EURC',
    '0x04d5ddf5f3a8939889f11e97f8c4bb48317f1938': 'USDz',
    '0x236aa50979d5f3de3bd1eeb40e81137f22ab794b': 'tBTC',
    '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'USDbC'
  };

  // Find all deposit links - these indicate positions
  const depositLinks = document.querySelectorAll('a[href*="/deposit?token0="]');
  console.log(`Aerodrome: Found ${depositLinks.length} deposit links`);

  // Group by token pair (multiple deposits for same pair)
  const positionMap = new Map();

  depositLinks.forEach((link, index) => {
    try {
      const href = link.getAttribute('href');

      // Extract token addresses from URL
      const token0Match = href.match(/token0=(0x[a-fA-F0-9]+)/);
      const token1Match = href.match(/token1=(0x[a-fA-F0-9]+)/);

      if (!token0Match || !token1Match) return;

      const token0Addr = token0Match[1].toLowerCase();
      const token1Addr = token1Match[1].toLowerCase();

      const token0 = tokenMap[token0Addr] || `Token${token0Addr.substring(0, 6)}`;
      const token1 = tokenMap[token1Addr] || `Token${token1Addr.substring(0, 6)}`;
      const pair = `${token0}/${token1}`;

      // Find the parent container that has "Deposited" and balance
      let container = link.closest('div');
      let attempts = 0;
      while (container && attempts < 10) {
        const text = container.innerText || '';
        if (text.includes('Deposited') && text.includes('~$')) {
          break;
        }
        container = container.parentElement;
        attempts++;
      }

      if (!container) {
        console.log(`Aerodrome: Could not find container for ${pair}`);
        return;
      }

      const allText = container.innerText || container.textContent || '';

      // Extract deposited value
      const depositMatch = allText.match(/Deposited[\s\S]*?~\$([0-9,]+\.?[0-9]*)/i);
      if (!depositMatch) return;

      const balance = parseFloat(depositMatch[1].replace(/,/g, ''));

      // Skip closed positions
      if (balance < 0.01) {
        console.log(`Aerodrome: Skipping closed position ${pair} with balance $${balance}`);
        return;
      }

      // Check if we already have this pair
      if (positionMap.has(pair)) {
        const existing = positionMap.get(pair);
        // Keep the one with more data or higher balance
        if (balance > existing.balance) {
          positionMap.set(pair, { container, balance, pair, token0, token1 });
        }
        return;
      }

      positionMap.set(pair, { container, balance, pair, token0, token1 });

    } catch (error) {
      console.error(`Aerodrome: Error parsing deposit link ${index}:`, error);
    }
  });

  console.log(`Aerodrome: Found ${positionMap.size} unique token pairs`);

  // Now extract full position data for each unique pair
  positionMap.forEach(({ container, balance, pair, token0, token1 }) => {
    try {
      const allText = container.innerText || container.textContent || '';
      const position = {
        pair,
        token0,
        token1,
        balance,
        capturedAt: new Date().toISOString()
      };

      // Check if ALM
      const isALM = allText.includes('ALM') ||
                    allText.includes('Automated') ||
                    container.querySelector('a[href*="&alm="]') !== null;

      if (isALM) {
        position.isAutomated = true;
        position.rangeMin = null;
        position.rangeMax = null;
        position.inRange = true;
        position.rangeStatus = 'alm-managed';
      } else {
        // Extract range for non-ALM positions
        const rangeMatch = allText.match(/Range[^\d]*([0-9]+\.?[0-9]+)[^\d]+([0-9]+\.?[0-9]+)/i);
        if (rangeMatch) {
          position.rangeMin = parseFloat(rangeMatch[1]);
          position.rangeMax = parseFloat(rangeMatch[2]);
        }

        const priceMatch = allText.match(/Current[^\d]*([0-9]+\.?[0-9]+)/i);
        if (priceMatch) {
          position.currentPrice = parseFloat(priceMatch[1]);
        }

        if (position.rangeMin && position.rangeMax && position.currentPrice) {
          position.inRange = position.currentPrice >= position.rangeMin &&
                            position.currentPrice <= position.rangeMax;
          position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';
        }
      }

      // Extract highest APR (optional - may not be in container)
      const aprMatches = allText.matchAll(/APR[^\d]*([0-9]+\.?[0-9]*)%/gi);
      let maxAPR = 0;
      for (const match of aprMatches) {
        const apr = parseFloat(match[1]);
        if (apr > maxAPR) maxAPR = apr;
      }
      if (maxAPR > 0) {
        position.apy = maxAPR;
      }

      // Extract pending yield (optional - may not be in container)
      let totalPendingUSD = 0;

      // Trading fees (USDC)
      const tradingFeeMatches = allText.matchAll(/Trading Fees[\s\S]*?([0-9]+\.?[0-9]*)\s+USDC/gi);
      for (const match of tradingFeeMatches) {
        const amt = parseFloat(match[1]);
        if (amt > 0) totalPendingUSD += amt;
      }

      // Emissions (AERO ≈ $1)
      const emissionMatches = allText.matchAll(/Emissions[\s\S]*?([0-9]+\.?[0-9]*)\s+AERO/gi);
      for (const match of emissionMatches) {
        const amt = parseFloat(match[1]);
        if (amt > 0) totalPendingUSD += amt * 1.0;
      }

      if (totalPendingUSD > 0) {
        position.pendingYield = totalPendingUSD;
      }

      console.log(`Aerodrome: ${position.pair} - $${position.balance.toFixed(2)}`);

      positions.push(position);

    } catch (error) {
      console.error(`Aerodrome: Error parsing position for ${pair}:`, error);
    }
  });

  console.log(`Aerodrome: Parsed ${positions.length} positions`);

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureCetusCLMPositions() {
  const positions = [];
  const portfolioSummary = {};

  // Cetus uses card-based layout, not tables
  // Look for containers that have pair names and liquidity values
  const allDivs = document.querySelectorAll('div');

  const positionCards = Array.from(allDivs).filter(div => {
    const text = div.innerText || '';
    // Must have pair format (TOKEN - TOKEN), APR, and Liquidity
    return /[A-Z]+\s*-\s*[A-Z]+/.test(text) &&
           text.includes('APR') &&
           text.includes('Liquidity') &&
           text.length > 50 && text.length < 2000;
  });

  console.log(`Cetus: Found ${positionCards.length} potential position cards`);

  positionCards.forEach((card, index) => {
    try {
      const allText = card.innerText || card.textContent || '';
      const position = {};

      // Extract pair (format: "SUI - USDC")
      const pairMatch = allText.match(/([A-Z][A-Za-z0-9]+)\s*-\s*([A-Z][A-Za-z0-9]+)/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Extract fee tier (e.g., "0.25%")
      const feeTierMatch = allText.match(/([0-9]+\.?[0-9]+)%(?!\s*APR)/);
      if (feeTierMatch) {
        position.feeTier = feeTierMatch[1];
      }

      // Extract liquidity (balance)
      const liquidityMatch = allText.match(/Liquidity[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
      if (liquidityMatch) {
        position.balance = parseFloat(liquidityMatch[1].replace(/,/g, ''));
      }

      // Extract APR
      const aprMatch = allText.match(/APR[\s\S]*?([0-9]+\.?[0-9]*)%/i);
      if (aprMatch) {
        position.apy = parseFloat(aprMatch[1]);
        console.log(`Cetus: APR found for ${position.pair}: ${position.apy}%`);
      } else {
        console.log(`Cetus: APR not found for ${position.pair}, container text:`, allText.substring(0, 300));
      }

      // Extract claimable yield (pending yield)
      const yieldMatch = allText.match(/Claimable Yield[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
      if (yieldMatch) {
        position.pendingYield = parseFloat(yieldMatch[1].replace(/,/g, ''));
      }

      // Extract price range (format: "1.9978 - 4.0069")
      const rangeMatch = allText.match(/Price Range[\s\S]*?([0-9]+\.?[0-9]+)\s*-\s*([0-9]+\.?[0-9]+)/i);
      if (rangeMatch) {
        position.rangeMin = parseFloat(rangeMatch[1]);
        position.rangeMax = parseFloat(rangeMatch[2]);
      }

      // Extract current price
      const priceMatch = allText.match(/Current Price[\s\S]*?([0-9]+\.?[0-9]+)/i);
      if (priceMatch) {
        position.currentPrice = parseFloat(priceMatch[1]);
      }

      // Check if active (in-range)
      const isActive = allText.includes('Active');
      if (position.rangeMin && position.rangeMax && position.currentPrice) {
        position.inRange = position.currentPrice >= position.rangeMin &&
                          position.currentPrice <= position.rangeMax;
        position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';
      } else if (isActive !== undefined) {
        position.inRange = isActive;
        position.rangeStatus = isActive ? 'in-range' : 'out-of-range';
      }

      position.capturedAt = new Date().toISOString();

      console.log(`Cetus: ${position.pair} - $${position.balance}`);

      if (position.pair && position.balance) {
        positions.push(position);
      }
    } catch (error) {
      console.error(`Cetus: Error parsing position card ${index}:`, error);
    }
  });

  // Deduplicate by pair + balance (keep smallest balance as it's most specific)
  const uniquePositions = [];
  const seen = new Map();
  positions.forEach(pos => {
    const key = pos.pair;
    const existing = seen.get(key);
    if (!existing || pos.balance < existing.balance) {
      seen.set(key, pos);
    }
  });
  seen.forEach(pos => uniquePositions.push(pos));

  console.log(`Cetus: Parsed ${positions.length} positions, ${uniquePositions.length} unique`);

  return {
    summary: portfolioSummary,
    positions: uniquePositions,
    positionCount: uniquePositions.length,
    inRangeCount: uniquePositions.filter(p => p.inRange).length,
    outOfRangeCount: uniquePositions.filter(p => !p.inRange).length
  };
}

function captureHyperionCLMPositions() {
  // Check if we're on a position details page
  const url = window.location.href;
  if (url.includes('/position/')) {
    return captureHyperionPositionDetails();
  }

  // Otherwise, parse the positions list page
  const positions = [];
  const portfolioSummary = {};

  // Hyperion uses table rows for positions
  // Look for rows that contain pair names and "Add / Remove" button
  const allElements = document.querySelectorAll('div, tr');

  const positionRows = Array.from(allElements).filter(el => {
    const text = el.innerText || '';
    // Must have pair format (APT-USDC), fee tier, and "Add / Remove"
    return /[A-Z]+\-[A-Z]+/.test(text) &&
           text.includes('%') &&
           (text.includes('Add / Remove') || text.includes('Active') || text.includes('Inactive')) &&
           text.length > 20 && text.length < 500;
  });

  console.log(`Hyperion: Found ${positionRows.length} potential position rows`);

  positionRows.forEach((row, index) => {
    try {
      const allText = row.innerText || row.textContent || '';
      const position = {};

      // Extract pair (format: "APT-USDC" or "WBTC-USDC")
      const pairMatch = allText.match(/([A-Z][A-Za-z0-9]+)\-([A-Z][A-Za-z0-9]+)/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Extract fee tier (e.g., "0.05%")
      const feeTierMatch = allText.match(/([0-9]+\.?[0-9]+)%/);
      if (feeTierMatch) {
        position.feeTier = feeTierMatch[1];
      }

      // Extract value (balance) - look for "$16K" or "$8.89K" or "$499.9"
      const valueMatch = allText.match(/\$([0-9]+\.?[0-9]*)K/i) ||
                         allText.match(/\$([0-9,]+\.?[0-9]*)/);
      if (valueMatch) {
        let value = parseFloat(valueMatch[1].replace(/,/g, ''));
        // If it had "K", multiply by 1000
        if (allText.match(/\$[0-9]+\.?[0-9]*K/i)) {
          value *= 1000;
        }
        position.balance = value;
      }

      // Extract APR - look for percentage after fee tier
      const aprMatch = allText.match(/[0-9]+\.?[0-9]+%[\s\S]*?([0-9]+\.?[0-9]+)%/);
      if (aprMatch) {
        position.apy = parseFloat(aprMatch[1]);
      }

      // Extract rewards (pending yield) - look for "$194.75" etc after APR
      const rewardsMatches = allText.matchAll(/\$([0-9]+\.?[0-9]+)/g);
      const dollarAmounts = [];
      for (const match of rewardsMatches) {
        dollarAmounts.push(parseFloat(match[1]));
      }
      // Last dollar amount is usually rewards
      if (dollarAmounts.length > 1) {
        position.pendingYield = dollarAmounts[dollarAmounts.length - 1];
      }

      // Check if active (in-range)
      const isActive = allText.includes('Active');
      position.inRange = isActive;
      position.rangeStatus = isActive ? 'in-range' : 'out-of-range';

      position.capturedAt = new Date().toISOString();

      console.log(`Hyperion: ${position.pair} - $${position.balance}`);

      if (position.pair && position.balance) {
        positions.push(position);
      }
    } catch (error) {
      console.error(`Hyperion: Error parsing position row ${index}:`, error);
    }
  });

  console.log(`Hyperion: Parsed ${positions.length} positions`);

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureHyperionPositionDetails() {
  console.log('Hyperion: Parsing position details page');

  const position = {};

  // Get all text on the page
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Hyperion Details: Page text length:', pageText.length);

  // Search the entire page text for data
  // Extract pair from URL first (more reliable)
  const urlParams = new URLSearchParams(window.location.search);
  const currencyA = urlParams.get('currencyA');
  const currencyB = urlParams.get('currencyB');

  // Token mapping for Aptos (Hyperion)
  const aptosTokens = {
    '0x1::aptos_coin::AptosCoin': 'APT',
    '0x000000000000000000000000000000000000000000000000000000000000000a': 'APT',
    '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b': 'USDC',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa': 'USDC',
    '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e': 'WBTC'
  };

  if (currencyA && currencyB) {
    const token0 = aptosTokens[currencyA] || 'Token0';
    const token1 = aptosTokens[currencyB] || 'Token1';
    position.token0 = token0;
    position.token1 = token1;
    position.pair = `${token0}/${token1}`;
    console.log('Hyperion Details: Extracted pair from URL:', position.pair);
  }

  // If not in URL, try to find in page text
  if (!position.pair) {
    const pairMatch = pageText.match(/([A-Z][A-Za-z0-9]+)\s*[-\/]\s*([A-Z][A-Za-z0-9]+)/);
    if (pairMatch) {
      position.token0 = pairMatch[1];
      position.token1 = pairMatch[2];
      position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      console.log('Hyperion Details: Found pair in text:', position.pair);
    }
  }

  // Search all divs and spans for labeled data
  const allElements = document.querySelectorAll('div, span, p, td, th');

  allElements.forEach(el => {
    const text = el.innerText || el.textContent || '';

    // Look for "Price Range" with tilde separator: "2.535406 ~ 3.797465"
    if (!position.rangeMin || !position.rangeMax) {
      const rangeMatch = text.match(/Price\s+Range[:\s]+([0-9]+\.?[0-9]+)\s*~\s*([0-9]+\.?[0-9]+)/i);
      if (rangeMatch) {
        position.rangeMin = parseFloat(rangeMatch[1]);
        position.rangeMax = parseFloat(rangeMatch[2]);
        console.log('Hyperion Details: Found price range:', position.rangeMin, '~', position.rangeMax);
      }
    }

    // Look for "Min" or "Low" price (fallback)
    if (!position.rangeMin) {
      const minMatch = text.match(/(?:Min|Low|Lower)(?:\s+Price)?[:\s]+([0-9]+\.?[0-9]+)/i);
      if (minMatch) {
        position.rangeMin = parseFloat(minMatch[1]);
        console.log('Hyperion Details: Found min price:', position.rangeMin);
      }
    }

    // Look for "Max" or "High" price (fallback)
    if (!position.rangeMax) {
      const maxMatch = text.match(/(?:Max|High|Upper)(?:\s+Price)?[:\s]+([0-9]+\.?[0-9]+)/i);
      if (maxMatch) {
        position.rangeMax = parseFloat(maxMatch[1]);
        console.log('Hyperion Details: Found max price:', position.rangeMax);
      }
    }

    // Look for "Current Price"
    if (!position.currentPrice) {
      const currentMatch = text.match(/Current\s+Price[:\s]+([0-9]+\.?[0-9]+)/i);
      if (currentMatch) {
        position.currentPrice = parseFloat(currentMatch[1]);
        console.log('Hyperion Details: Found current price:', position.currentPrice);
      }
    }

    // Look for "Value" with K suffix: "$16.02K"
    if (!position.balance) {
      const valueMatch = text.match(/Value[:\s]+\$([0-9]+\.?[0-9]*)K/i);
      if (valueMatch) {
        position.balance = parseFloat(valueMatch[1]) * 1000;
        console.log('Hyperion Details: Found value (K):', position.balance);
      } else {
        const balanceMatch = text.match(/(?:Total\s+)?(?:Balance|Value|Liquidity)[:\s]+\$([0-9,]+\.?[0-9]*)/i);
        if (balanceMatch) {
          position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
          console.log('Hyperion Details: Found balance:', position.balance);
        }
      }
    }

    // Look for "Position APR" - more specific to avoid wrong match
    if (!position.apy) {
      const posAprMatch = text.match(/Position\s+APR[^0-9]*([0-9]+\.?[0-9]*)%/i);
      if (posAprMatch) {
        position.apy = parseFloat(posAprMatch[1]);
        console.log('Hyperion Details: Found Position APR:', position.apy);
      } else {
        // Fallback to generic APR
        const aprMatch = text.match(/APR[:\s]+([0-9]+\.?[0-9]*)%/i);
        if (aprMatch) {
          position.apy = parseFloat(aprMatch[1]);
          console.log('Hyperion Details: Found APR:', position.apy);
        }
      }
    }

    // Look for "Claimable Rewards" total with ≈ symbol
    if (!position.pendingYield) {
      const claimableMatch = text.match(/Claimable\s+Rewards[\s\S]*?≈\s*\$([0-9]+\.?[0-9]+)/i);
      if (claimableMatch) {
        position.pendingYield = parseFloat(claimableMatch[1]);
        console.log('Hyperion Details: Found claimable rewards:', position.pendingYield);
      } else {
        const rewardMatch = text.match(/(?:Rewards?|Claimable|Pending)[:\s]+\$([0-9]+\.?[0-9]+)/i);
        if (rewardMatch) {
          position.pendingYield = parseFloat(rewardMatch[1]);
          console.log('Hyperion Details: Found rewards:', position.pendingYield);
        }
      }
    }
  });

  // Also try searching the full page text with simpler patterns
  if (!position.rangeMin) {
    // Look for pattern like "10.5" or "0.05" that could be min price
    const allNumbers = pageText.match(/([0-9]+\.[0-9]+)/g);
    if (allNumbers && allNumbers.length >= 2) {
      console.log('Hyperion Details: Found numeric values:', allNumbers.slice(0, 10));
    }
  }

  // Check in-range status if we have range data
  if (position.rangeMin && position.rangeMax && position.currentPrice) {
    position.inRange = position.currentPrice >= position.rangeMin &&
                       position.currentPrice <= position.rangeMax;
    position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';

    // Calculate distance from range
    if (position.inRange) {
      const rangeSize = position.rangeMax - position.rangeMin;
      const distanceToMin = position.currentPrice - position.rangeMin;
      const distanceToMax = position.rangeMax - position.currentPrice;
      const minDistance = Math.min(distanceToMin, distanceToMax);
      const distancePercent = ((minDistance / rangeSize) * 100).toFixed(1);
      position.distanceFromRange = `${distancePercent}%`;
    } else {
      if (position.currentPrice < position.rangeMin) {
        const distance = ((position.rangeMin - position.currentPrice) / position.rangeMin * 100).toFixed(1);
        position.distanceFromRange = `-${distance}%`;
      } else {
        const distance = ((position.currentPrice - position.rangeMax) / position.rangeMax * 100).toFixed(1);
        position.distanceFromRange = `+${distance}%`;
      }
    }
  }

  position.capturedAt = new Date().toISOString();

  const positions = position.pair ? [position] : [];

  console.log('Hyperion Details: Final position:', JSON.stringify(position, null, 2));

  return {
    summary: {},
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function capturePancakeSwapCLMPositions() {
  console.log('PancakeSwap: Parsing CLM positions');

  // Check if we're on a position details page
  const url = window.location.href;
  if (url.includes('/liquidity/')) {
    return capturePancakeSwapPositionDetails();
  }

  // Otherwise, parse the positions list page
  const positions = [];
  const portfolioSummary = {};

  const rows = document.querySelectorAll('table tbody tr, [role="row"], .position-row, [data-position]');

  rows.forEach((row, rowIndex) => {
    try {
      const cells = row.querySelectorAll('td, [role="cell"], .cell');

      if (cells.length < 3) return;

      const position = {};
      const allText = row.innerText || row.textContent;

      // Extract pair
      const pairMatch = allText.match(/([A-Za-z0-9]+)[\s\-\/]+([A-Za-z0-9]+)/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Balance
      const balanceMatch = allText.match(/\$([0-9,]+\.?[0-9]*)/);
      if (balanceMatch) {
        position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
      }

      // APR
      const aprMatch = allText.match(/([0-9]+\.?[0-9]*)%/);
      if (aprMatch) {
        position.apy = parseFloat(aprMatch[1]);
      }

      // Pending yield
      const pendingYieldMatch = allText.match(/(?:Pending|Unclaimed|Rewards?)[^\$]*\$([0-9,]+\.?[0-9]*)/i);
      if (pendingYieldMatch) {
        position.pendingYield = parseFloat(pendingYieldMatch[1].replace(/,/g, ''));
      }

      // Range detection
      const numbers = allText.match(/([0-9]+\.?[0-9]+)/g);
      if (numbers && numbers.length >= 3) {
        const unique = [...new Set(numbers.map(parseFloat))];
        if (unique.length >= 3) {
          position.rangeMin = unique[0];
          position.rangeMax = unique[1];
          position.currentPrice = unique[2];
          position.inRange = position.currentPrice >= position.rangeMin &&
                           position.currentPrice <= position.rangeMax;
        }
      }

      position.capturedAt = new Date().toISOString();

      if (position.pair && position.balance) {
        positions.push(position);
      }
    } catch (error) {
      console.error('Error parsing PancakeSwap position row:', error);
    }
  });

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function capturePancakeSwapPositionDetails() {
  console.log('PancakeSwap: Parsing position details page');

  const position = {};
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('PancakeSwap Details: Page text length:', pageText.length);

  // Search all elements for data
  const allElements = document.querySelectorAll('div, span, p, h1, h2, h3');

  allElements.forEach(el => {
    const text = el.innerText || '';

    // Extract pair (format: "USDC-ETH" or "WETH-USDC")
    if (!position.pair) {
      const pairMatch = text.match(/^([A-Z][A-Za-z0-9]+)[\-\/]([A-Z][A-Za-z0-9]+)$/);
      if (pairMatch && text.length < 30) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
        console.log('PancakeSwap Details: Found pair:', position.pair);
      }
    }

    // Extract balance/liquidity
    if (!position.balance) {
      const balanceMatch = text.match(/(?:Liquidity|Value|Position Value)[:\s]+\$([0-9,]+\.?[0-9]*)/i);
      if (balanceMatch) {
        position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found balance:', position.balance);
      }
    }

    // Extract APY/APR - look for "APR" followed by percentage
    if (!position.apy) {
      const apyMatch = text.match(/APR[^0-9]*([0-9]+\.?[0-9]*)%/i);
      if (apyMatch) {
        position.apy = parseFloat(apyMatch[1]);
        console.log('PancakeSwap Details: Found APY:', position.apy);
      }
    }

    // Extract Unclaimed Fees
    if (!position.pendingYield) {
      const unclaimedMatch = text.match(/Unclaimed\s+Fees[:\s]+\$([0-9,]+\.?[0-9]+)/i);
      if (unclaimedMatch) {
        position.pendingYield = parseFloat(unclaimedMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found unclaimed fees:', position.pendingYield);
      }
    }

    // Extract Min Price with label
    if (!position.rangeMin) {
      const minMatch = text.match(/Min\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);
      if (minMatch) {
        position.rangeMin = parseFloat(minMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found min price:', position.rangeMin);
      }
    }

    // Extract Max Price with label
    if (!position.rangeMax) {
      const maxMatch = text.match(/Max\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);
      if (maxMatch) {
        position.rangeMax = parseFloat(maxMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found max price:', position.rangeMax);
      }
    }

    // Extract Current Price with label
    if (!position.currentPrice) {
      const currentMatch = text.match(/Current\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);
      if (currentMatch) {
        position.currentPrice = parseFloat(currentMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found current price:', position.currentPrice);
      }
    }
  });

  // Calculate in-range status
  if (position.rangeMin && position.rangeMax && position.currentPrice) {
    position.inRange = position.currentPrice >= position.rangeMin &&
                       position.currentPrice <= position.rangeMax;
    position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';

    // Calculate distance from range
    if (position.inRange) {
      const rangeSize = position.rangeMax - position.rangeMin;
      const distanceToMin = position.currentPrice - position.rangeMin;
      const distanceToMax = position.rangeMax - position.currentPrice;
      const minDistance = Math.min(distanceToMin, distanceToMax);
      const distancePercent = ((minDistance / rangeSize) * 100).toFixed(1);
      position.distanceFromRange = `${distancePercent}%`;
    } else {
      if (position.currentPrice < position.rangeMin) {
        const distance = ((position.rangeMin - position.currentPrice) / position.rangeMin * 100).toFixed(1);
        position.distanceFromRange = `-${distance}%`;
      } else {
        const distance = ((position.currentPrice - position.rangeMax) / position.rangeMax * 100).toFixed(1);
        position.distanceFromRange = `+${distance}%`;
      }
    }
  }

  position.capturedAt = new Date().toISOString();

  const positions = position.pair ? [position] : [];

  console.log('PancakeSwap Details: Final position:', JSON.stringify(position, null, 2));

  return {
    summary: {},
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureBeefyCLMPositions() {
  console.log('Beefy: Parsing CLM positions');

  // Check if we're on a vault details page
  const url = window.location.href;
  if (url.includes('/vault/')) {
    return captureBeefyVaultDetails();
  }

  // Otherwise, parse the main dashboard page
  const positions = [];
  const portfolioSummary = {};

  // Get page text for debugging
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Beefy: Page text length:', pageText.length);

  // Extract portfolio summary from the top
  const allElements = document.querySelectorAll('div, span, p');

  allElements.forEach(el => {
    const text = el.innerText || '';

    // Look for "Deposited" amount
    if (!portfolioSummary.totalValue) {
      const depositedMatch = text.match(/Deposited[:\s]+\$([0-9,]+)/i);
      if (depositedMatch) {
        portfolioSummary.totalValue = depositedMatch[1];
        console.log('Beefy: Found deposited:', portfolioSummary.totalValue);
      }
    }

    // Look for "Avg. APY"
    if (!portfolioSummary.avgAPY) {
      const avgApyMatch = text.match(/Avg\.?\s+APY[:\s]+([0-9]+\.?[0-9]*)%/i);
      if (avgApyMatch) {
        portfolioSummary.avgAPY = avgApyMatch[1];
        console.log('Beefy: Found avg APY:', portfolioSummary.avgAPY);
      }
    }

    // Look for "Daily yield"
    if (!portfolioSummary.dailyYield) {
      const dailyMatch = text.match(/Daily\s+yield[:\s]+\$([0-9.]+)/i);
      if (dailyMatch) {
        portfolioSummary.dailyYield = dailyMatch[1];
        console.log('Beefy: Found daily yield:', portfolioSummary.dailyYield);
      }
    }
  });

  // Find position links - Beefy positions are clickable links
  const allLinks = document.querySelectorAll('a[href*="vault"]');

  const positionLinks = Array.from(allLinks).filter(link => {
    const text = link.innerText || '';
    // Must contain: "CLM" and dollar amount (token pair check happens during parsing)
    return /CLM/i.test(text) &&
           /\$[0-9,]+/.test(text) &&
           text.length > 30 && text.length < 1000;
  });

  console.log(`Beefy: Found ${positionLinks.length} position links`);

  if (positionLinks.length > 0) {
    console.log(`Beefy: Sample link text (first 200 chars):`, positionLinks[0].innerText.substring(0, 200));
  }

  positionLinks.forEach((container, index) => {
    try {
      const allText = container.innerText || container.textContent || '';
      const position = {};

      // Extract pair FIRST (before network) - format: "WBTC-WETH" or "cbBTC-USDC"
      // Note: Beefy uses special Unicode dash character
      // Match any dash-like character, and capture full token names (including prefixes like "cb", "W", etc.)
      // Use greedy match to get full token name before the dash
      const pairMatch = allText.match(/([a-z]*[A-Z][A-Za-z0-9]+)[\u002D\u2013\u2014\u200B\-​]+([a-z]*[A-Z][A-Za-z0-9]+)/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Extract network/chain - Beefy shows network name in the card but separate from the link
      let networkMatch = allText.match(/(Arbitrum|Base|Optimism|Polygon|Ethereum|BSC|Avalanche|Fantom)/i);

      if (!networkMatch) {
        // The network is usually in a parent container that holds both the network label and the position link
        // Walk up the DOM tree to find a container that has the network name
        let parent = container.parentElement;
        let attempts = 0;
        while (parent && !networkMatch && attempts < 10) {
          const parentText = parent.innerText || '';
          // Check if this container has the network name and isn't too large (avoid capturing entire page)
          if (parentText.length < 2000 && parentText.includes(position.pair)) {
            // This parent contains our position, so search for network name
            networkMatch = parentText.match(/(Arbitrum|Base|Optimism|Polygon|Ethereum|BSC|Avalanche|Fantom)/i);
            if (networkMatch) {
              console.log(`Beefy: Found network "${networkMatch[1]}" in parent container for ${position.pair}`);
              break;
            }
          }
          parent = parent.parentElement;
          attempts++;
        }
      }

      if (networkMatch) {
        position.network = networkMatch[1];
      } else {
        console.log(`Beefy: Could not find network for ${position.pair}`);
      }

      // Extract protocol (Uniswap, etc)
      const protocolMatch = allText.match(/(Uniswap|PancakeSwap|SushiSwap|Balancer|Curve)/i);
      if (protocolMatch) {
        position.protocol = protocolMatch[1];
      }

      // Extract balance - look for dollar amounts
      const dollarAmounts = allText.matchAll(/\$([0-9,]+\.?[0-9]*)/g);
      const amounts = [];
      for (const match of dollarAmounts) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (value > 0 && value < 1000000000) { // Reasonable range for a position
          amounts.push(value);
        }
      }

      // First dollar amount is usually the position balance
      if (amounts.length > 0) {
        position.balance = amounts[0];
      }

      // Extract APY - look for percentage that's not a tiny daily rate
      const percentages = allText.matchAll(/([0-9]+\.?[0-9]+)%/g);
      const apyValues = [];
      for (const match of percentages) {
        const value = parseFloat(match[1]);
        // APY is usually > 1% and < 1000%
        if (value > 1 && value < 1000) {
          apyValues.push(value);
        }
      }

      // First reasonable percentage is usually APY
      if (apyValues.length > 0) {
        position.apy = apyValues[0];
      }

      // Extract daily yield percentage (smaller percentage like 0.027%)
      const dailyYieldMatch = allText.match(/0\.0*[0-9]+%/);
      if (dailyYieldMatch) {
        position.dailyYield = dailyYieldMatch[0];
      }

      position.capturedAt = new Date().toISOString();

      console.log(`Beefy Position ${index + 1}:`, position.pair, '-', position.network, '-', `$${position.balance}`, '-', `${position.apy}%`);

      if (position.pair && position.balance) {
        positions.push(position);
      }
    } catch (error) {
      console.error(`Beefy: Error parsing position container ${index}:`, error);
    }
  });

  console.log(`Beefy: Parsed ${positions.length} positions`);

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureBeefyVaultDetails() {
  console.log('Beefy: Parsing vault details page');

  const position = {};
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Beefy Details: Page text length:', pageText.length);

  // Search all elements for data
  const allElements = document.querySelectorAll('div, span, p, h1, h2, h3');

  allElements.forEach(el => {
    const text = el.innerText || '';

    // Extract pair from heading (format: "WBTC-​WETH")
    if (!position.pair) {
      const pairMatch = text.match(/^([A-Z][A-Za-z0-9]+)[\u002D\u2013\u2014\u200B\-​]+([A-Z][A-Za-z0-9]+)$/);
      if (pairMatch && text.length < 30) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
        console.log('Beefy Details: Found pair:', position.pair);
      }
    }

    // Extract chain
    if (!position.network) {
      const chainMatch = text.match(/CHAIN:\s*(Arbitrum|Base|Optimism|Polygon|Ethereum|BSC)/i);
      if (chainMatch) {
        position.network = chainMatch[1];
        console.log('Beefy Details: Found chain:', position.network);
      }
    }

    // Extract platform
    if (!position.protocol) {
      const platformMatch = text.match(/PLATFORM:\s*(Uniswap|PancakeSwap|SushiSwap|Balancer|Curve)/i);
      if (platformMatch) {
        position.protocol = platformMatch[1];
        console.log('Beefy Details: Found platform:', position.protocol);
      }
    }

    // Extract APY
    if (!position.apy) {
      const apyMatch = text.match(/^APY\s+([0-9]+\.?[0-9]*)%$/i);
      if (apyMatch) {
        position.apy = parseFloat(apyMatch[1]);
        console.log('Beefy Details: Found APY:', position.apy);
      }
    }

    // Extract Your Deposit balance
    if (!position.balance) {
      const balanceMatch = text.match(/Your Deposit[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
      if (balanceMatch) {
        position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
        console.log('Beefy Details: Found balance:', position.balance);
      }
    }

    // Extract Min Price
    if (!position.rangeMin) {
      const minMatch = text.match(/Min Price\s+([0-9]+\.?[0-9]+)/i);
      if (minMatch) {
        position.rangeMin = parseFloat(minMatch[1]);
        console.log('Beefy Details: Found min price:', position.rangeMin);
      }
    }

    // Extract Max Price
    if (!position.rangeMax) {
      const maxMatch = text.match(/Max Price\s+([0-9]+\.?[0-9]+)/i);
      if (maxMatch) {
        position.rangeMax = parseFloat(maxMatch[1]);
        console.log('Beefy Details: Found max price:', position.rangeMax);
      }
    }

    // Extract Current Price and in-range status
    if (!position.currentPrice) {
      const currentMatch = text.match(/Current Price\s*\(In Range\)\s+([0-9]+\.?[0-9]+)/i);
      if (currentMatch) {
        position.currentPrice = parseFloat(currentMatch[1]);
        position.inRange = true;
        console.log('Beefy Details: Found current price (in range):', position.currentPrice);
      } else {
        const currentOutMatch = text.match(/Current Price\s*\(Out of Range\)\s+([0-9]+\.?[0-9]+)/i);
        if (currentOutMatch) {
          position.currentPrice = parseFloat(currentOutMatch[1]);
          position.inRange = false;
          console.log('Beefy Details: Found current price (out of range):', position.currentPrice);
        } else {
          const currentSimpleMatch = text.match(/Current Price\s+([0-9]+\.?[0-9]+)/i);
          if (currentSimpleMatch) {
            position.currentPrice = parseFloat(currentSimpleMatch[1]);
            console.log('Beefy Details: Found current price:', position.currentPrice);
          }
        }
      }
    }
  });

  // Calculate in-range status if we have all price data
  if (position.rangeMin && position.rangeMax && position.currentPrice && position.inRange === undefined) {
    position.inRange = position.currentPrice >= position.rangeMin &&
                       position.currentPrice <= position.rangeMax;
  }

  if (position.inRange !== undefined) {
    position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';

    // Calculate distance from range
    if (position.rangeMin && position.rangeMax && position.currentPrice) {
      if (position.inRange) {
        const rangeSize = position.rangeMax - position.rangeMin;
        const distanceToMin = position.currentPrice - position.rangeMin;
        const distanceToMax = position.rangeMax - position.currentPrice;
        const minDistance = Math.min(distanceToMin, distanceToMax);
        const distancePercent = ((minDistance / rangeSize) * 100).toFixed(1);
        position.distanceFromRange = `${distancePercent}%`;
      } else {
        if (position.currentPrice < position.rangeMin) {
          const distance = ((position.rangeMin - position.currentPrice) / position.rangeMin * 100).toFixed(1);
          position.distanceFromRange = `-${distance}%`;
        } else {
          const distance = ((position.currentPrice - position.rangeMax) / position.rangeMax * 100).toFixed(1);
          position.distanceFromRange = `+${distance}%`;
        }
      }
    }
  }

  position.capturedAt = new Date().toISOString();

  const positions = position.pair ? [position] : [];

  console.log('Beefy Details: Final position:', JSON.stringify(position, null, 2));

  return {
    summary: {},
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureImages() {
  const images = document.querySelectorAll('img[src]');
  return Array.from(images).map(img => ({
    src: img.src,
    alt: img.alt || '',
    title: img.title || '',
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height
  }));
}

function captureLinks() {
  const links = document.querySelectorAll('a[href]');
  return Array.from(links).map(link => ({
    text: link.innerText?.trim() || link.title || '',
    href: link.href,
    isExternal: !link.href.includes(window.location.hostname)
  })).filter(link => link.text || link.href);
}

function captureTables() {
  const tables = document.querySelectorAll('table');
  return Array.from(tables).map(table => {
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
}

function captureText() {
  const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
  const textContent = new Set();

  textElements.forEach(element => {
    const text = element.innerText?.trim();
    if (text && text.length > 0 && text.length < 5000) {
      textContent.add(text);
    }
  });

  const headings = {};
  for (let i = 1; i <= 6; i++) {
    const elements = document.querySelectorAll(`h${i}`);
    if (elements.length > 0) {
      headings[`h${i}`] = Array.from(elements).map(el => el.innerText?.trim()).filter(Boolean);
    }
  }

  return {
    allText: Array.from(textContent),
    headings: headings
  };
}

function highlightCaptureElements() {
  const style = document.createElement('style');
  style.id = 'brave-capture-highlight';
  style.textContent = `
    .brave-capture-highlight {
      outline: 2px solid #667eea !important;
      outline-offset: 2px !important;
      animation: brave-capture-pulse 2s infinite !important;
    }
    
    @keyframes brave-capture-pulse {
      0% { outline-color: #667eea; }
      50% { outline-color: #764ba2; }
      100% { outline-color: #667eea; }
    }
  `;
  
  const existingStyle = document.getElementById('brave-capture-highlight');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  document.head.appendChild(style);
  
  const elementsToHighlight = document.querySelectorAll('[data-capture], [data-track], .capture-this, form, table, [data-id], [data-value]');
  elementsToHighlight.forEach(el => {
    el.classList.add('brave-capture-highlight');
  });
  
  setTimeout(() => {
    elementsToHighlight.forEach(el => {
      el.classList.remove('brave-capture-highlight');
    });
    style.remove();
  }, 5000);
}