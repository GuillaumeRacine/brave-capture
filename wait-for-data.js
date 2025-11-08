/**
 * Smart waiting system for dynamic content loading
 * Waits for protocol-specific data to be fully loaded before capturing
 */

/**
 * Protocol-specific data readiness checks
 * Returns true when the page has loaded the critical data
 */
const DATA_READY_CHECKS = {
  'orca.so': () => {
    // Wait for Total Value heading and position table
    const hasTotalValue = !!Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent.trim() === 'Total Value'
    );
    // Look for position table rows (Orca shows positions in table with 6+ cells)
    const tableRows = document.querySelectorAll('table tbody tr, [role="row"]');
    const hasPositions = tableRows.length > 0 ||
                         document.body.textContent.includes('No positions found');

    const ready = hasTotalValue && hasPositions;
    if (ready) {
      console.log('✅ Orca data ready: Total Value found + ' + tableRows.length + ' position rows');
    }
    return ready;
  },

  'raydium.io': () => {
    // Wait for position table or empty state
    const hasTable = document.querySelector('table') !== null;
    const hasEmptyState = document.body.textContent.includes('No liquidity') ||
                          document.body.textContent.includes('No positions');
    return hasTable || hasEmptyState;
  },

  'aerodrome.finance': () => {
    // Wait for liquidity positions to load
    const hasPositions = document.querySelectorAll('[class*="position"]').length > 0 ||
                        document.querySelectorAll('[class*="liquidity"]').length > 0 ||
                        document.body.textContent.includes('No positions');
    return hasPositions;
  },

  'app.cetus.zone': () => {
    // Wait for Cetus position data
    const hasPositionData = document.body.textContent.includes('Total Value') ||
                            document.body.textContent.includes('My Positions') ||
                            document.querySelectorAll('[class*="position"]').length > 0;
    return hasPositionData;
  },

  'hyperion.xyz': () => {
    // Wait for Hyperion position details
    const hasDetails = document.body.textContent.includes('Position Details') ||
                      document.body.textContent.includes('Current Price') ||
                      document.querySelectorAll('[class*="position"]').length > 0;
    return hasDetails;
  },

  'app.beefy.com': () => {
    // Wait for Beefy vault data
    const hasVaults = document.querySelectorAll('[class*="vault"]').length > 0 ||
                     document.querySelectorAll('[class*="position"]').length > 0 ||
                     document.body.textContent.includes('No vaults');
    return hasVaults;
  },

  'pancakeswap.finance': () => {
    // Wait for PancakeSwap liquidity data
    const hasLiquidity = document.body.textContent.includes('Your Liquidity') ||
                        document.body.textContent.includes('No liquidity found') ||
                        document.querySelectorAll('[class*="liquidity"]').length > 0;
    return hasLiquidity;
  }
};

/**
 * Wait for data to be ready with MutationObserver (dynamic detection)
 * @param {number} maxWaitMs - Maximum time to wait (default 5 seconds)
 * @returns {Promise<boolean>} - Resolves true when ready, false if timeout
 */
async function waitForDataReady(maxWaitMs = 5000) {
  const hostname = window.location.hostname;
  const startTime = Date.now();

  console.log('⏳ Waiting for data to load on:', hostname);

  // Find the right check function for this protocol
  const checkFunction = Object.entries(DATA_READY_CHECKS).find(([domain]) =>
    hostname.includes(domain)
  )?.[1];

  if (!checkFunction) {
    console.log('⚠️ No specific check for this protocol, skipping wait');
    // Skip wait for unknown protocols
    return true;
  }

  // Check immediately if data is already loaded
  if (checkFunction()) {
    console.log('✅ Data already loaded, no wait needed');
    return true;
  }

  // Use MutationObserver to watch for data appearing dynamically
  return new Promise((resolve) => {
    let observer;
    let timeoutId;

    const cleanup = () => {
      if (observer) observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };

    const onReady = () => {
      cleanup();
      const elapsed = Date.now() - startTime;
      console.log(`✅ Data ready after ${elapsed}ms`);
      resolve(true);
    };

    const onTimeout = () => {
      cleanup();
      console.warn(`⏱️ Timeout after ${maxWaitMs}ms - proceeding anyway`);
      resolve(false);
    };

    // Check on every DOM mutation
    const checkDataReady = () => {
      if (checkFunction()) {
        onReady();
      }
    };

    // Watch for DOM changes
    observer = new MutationObserver(checkDataReady);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Set timeout fallback
    timeoutId = setTimeout(onTimeout, maxWaitMs);
  });
}

/**
 * Wait for DOM to stop changing (useful for SPAs)
 * @param {number} quietPeriodMs - How long DOM must be quiet (default 1000ms)
 * @param {number} maxWaitMs - Maximum time to wait (default 10 seconds)
 * @returns {Promise<boolean>}
 */
async function waitForDOMQuiet(quietPeriodMs = 1000, maxWaitMs = 10000) {
  return new Promise((resolve) => {
    let timeoutId;
    let observer;
    let startTime = Date.now();

    const cleanup = () => {
      if (observer) observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };

    const onQuiet = () => {
      cleanup();
      const elapsed = Date.now() - startTime;
      console.log(`🔇 DOM quiet after ${elapsed}ms`);
      resolve(true);
    };

    const onTimeout = () => {
      cleanup();
      console.warn(`⏱️ DOM never became quiet, timeout after ${maxWaitMs}ms`);
      resolve(false);
    };

    // Reset timer on any DOM change
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      // Check if we've exceeded max wait
      if (Date.now() - startTime >= maxWaitMs) {
        onTimeout();
        return;
      }

      timeoutId = setTimeout(onQuiet, quietPeriodMs);
    };

    // Watch for DOM changes
    observer = new MutationObserver(resetTimer);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Start the timer
    resetTimer();
  });
}

/**
 * Combined smart wait: waits for data ready with dynamic detection
 * @returns {Promise<boolean>}
 */
async function smartWaitForData() {
  console.log('🧠 Smart wait: Watching for data to load...');

  // Use dynamic detection - responds instantly when data appears
  const ready = await waitForDataReady(5000);

  console.log(ready ? '✅ Data is ready for capture' : '⚠️ Proceeding with capture despite timeout');

  return ready;
}

// Export for use in content.js
if (typeof window !== 'undefined') {
  window.waitForDataReady = waitForDataReady;
  window.waitForDOMQuiet = waitForDOMQuiet;
  window.smartWaitForData = smartWaitForData;
}
