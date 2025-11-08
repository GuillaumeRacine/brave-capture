// File-based storage module for Brave Capture
// Saves captures as individual JSON files with descriptive names
// Format: [protocol-url]_[YYYY-MM-DD]_[HH-MM-SS].json

/**
 * Generate a filename for a capture
 * Format: orca.so-liquidity_2025-01-27_14-30-45.json
 */
function generateFilename(capture) {
  const url = new URL(capture.url);

  // Clean hostname (remove www, app, etc)
  let hostname = url.hostname
    .replace(/^(www\.|app\.)/, '')
    .replace(/\./g, '-');

  // Add path if meaningful (not just "/" or empty)
  let path = url.pathname
    .replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');

  if (path && path.length > 0 && path !== 'index') {
    hostname += '-' + path;
  }

  // Format: orca-so-liquidity_2025-01-27_14-30-45
  const timestamp = new Date(capture.timestamp);
  const date = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS

  return `${hostname}_${date}_${time}.json`;
}

/**
 * Generate a directory name based on protocol and URL
 * Format: captures/orca-so/2025-01/
 */
function generateDirectory(capture) {
  const url = new URL(capture.url);
  const hostname = url.hostname.replace(/^(www\.|app\.)/, '').replace(/\./g, '-');
  const timestamp = new Date(capture.timestamp);
  const yearMonth = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;

  return `captures/${hostname}/${yearMonth}`;
}

/**
 * Save capture to a file
 * @param {Object} capture - The capture object
 * @param {string} baseDir - Base directory path (optional)
 * @returns {Promise<Object>} Result with filename and path
 */
async function saveCaptureToFile(capture, baseDir = null) {
  try {
    const filename = generateFilename(capture);
    const directory = generateDirectory(capture);

    // For browser extension, we'll use Chrome downloads API
    const jsonStr = JSON.stringify(capture, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Suggest the organized directory structure
    const suggestedPath = `${directory}/${filename}`;

    return new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: url,
        filename: suggestedPath,
        saveAs: false, // Auto-save to avoid popup
        conflictAction: 'uniquify' // Add (1), (2), etc if file exists
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          // Clean up the blob URL after a delay
          setTimeout(() => URL.revokeObjectURL(url), 60000);

          resolve({
            success: true,
            filename: filename,
            path: suggestedPath,
            downloadId: downloadId
          });
        }
      });
    });
  } catch (error) {
    console.error('Error saving capture to file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse filename to extract metadata
 * @param {string} filename - Filename to parse
 * @returns {Object} Parsed metadata
 */
function parseFilename(filename) {
  // Format: orca-so-liquidity_2025-01-27_14-30-45.json
  const match = filename.match(/^(.+?)_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.json$/);

  if (!match) {
    return null;
  }

  const [, urlPart, date, time] = match;

  return {
    urlSlug: urlPart,
    date: date,
    time: time.replace(/-/g, ':'),
    timestamp: new Date(`${date}T${time.replace(/-/g, ':')}`),
    filename: filename
  };
}

/**
 * Group captures by URL for timeline view
 * @param {Array<string>} filenames - Array of filenames
 * @returns {Object} Grouped by URL slug
 */
function groupCapturesByUrl(filenames) {
  const grouped = {};

  filenames.forEach(filename => {
    const parsed = parseFilename(filename);
    if (parsed) {
      if (!grouped[parsed.urlSlug]) {
        grouped[parsed.urlSlug] = [];
      }
      grouped[parsed.urlSlug].push(parsed);
    }
  });

  // Sort each group by timestamp
  Object.keys(grouped).forEach(urlSlug => {
    grouped[urlSlug].sort((a, b) => b.timestamp - a.timestamp);
  });

  return grouped;
}

/**
 * Get file listing for a specific URL
 * @param {string} urlSlug - URL slug (e.g., "orca-so-liquidity")
 * @param {Array<string>} allFiles - Array of all filenames
 * @returns {Array} Sorted captures for that URL
 */
function getCaptureTimeline(urlSlug, allFiles) {
  const timeline = allFiles
    .map(parseFilename)
    .filter(parsed => parsed && parsed.urlSlug === urlSlug)
    .sort((a, b) => b.timestamp - a.timestamp);

  return timeline;
}

/**
 * Generate a summary of captures
 * @param {Array<string>} filenames - Array of filenames
 * @returns {Object} Summary statistics
 */
function generateCaptureSummary(filenames) {
  const grouped = groupCapturesByUrl(filenames);
  const urlCount = Object.keys(grouped).length;
  const totalCaptures = filenames.length;

  // Find most captured URL
  let mostCaptured = null;
  let maxCount = 0;
  Object.entries(grouped).forEach(([urlSlug, captures]) => {
    if (captures.length > maxCount) {
      maxCount = captures.length;
      mostCaptured = urlSlug;
    }
  });

  // Date range
  const allParsed = filenames.map(parseFilename).filter(Boolean);
  const timestamps = allParsed.map(p => p.timestamp.getTime());
  const oldest = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
  const newest = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

  return {
    totalCaptures,
    uniqueUrls: urlCount,
    mostCapturedUrl: mostCaptured,
    mostCapturedCount: maxCount,
    dateRange: {
      oldest: oldest?.toISOString(),
      newest: newest?.toISOString()
    },
    urlBreakdown: Object.entries(grouped).map(([urlSlug, captures]) => ({
      url: urlSlug,
      count: captures.length,
      latest: captures[0].timestamp.toISOString()
    }))
  };
}

// Example filenames:
// orca-so_2025-01-27_14-30-45.json
// raydium-io-clmm_2025-01-27_15-00-00.json
// aerodrome-finance-liquidity_2025-01-28_09-15-30.json

// Make functions available globally
if (typeof window !== 'undefined') {
  window.FileStorage = {
    generateFilename,
    generateDirectory,
    saveCaptureToFile,
    parseFilename,
    groupCapturesByUrl,
    getCaptureTimeline,
    generateCaptureSummary
  };
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateFilename,
    generateDirectory,
    saveCaptureToFile,
    parseFilename,
    groupCapturesByUrl,
    getCaptureTimeline,
    generateCaptureSummary
  };
}
