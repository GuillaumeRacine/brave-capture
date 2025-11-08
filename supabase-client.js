// Supabase client for browser extension
// This file is imported by both popup.js and dashboard.html

// Get configuration from config.js
const SUPABASE_URL = window.SUPABASE_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.SUPABASE_ANON_KEY;

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️ Supabase not configured. Please update config.js with your credentials.');
}

// Cache for positions data
const cache = {
  positions: null,
  latestPositions: null,
  timestamp: null,
  ttl: 30000 // 30 seconds cache TTL
};

/**
 * Clear the cache (called after new captures)
 */
function clearCache() {
  cache.positions = null;
  cache.latestPositions = null;
  cache.timestamp = null;
  console.log('🔄 Cache cleared');
}

/**
 * Check if cache is valid
 */
function isCacheValid() {
  if (!cache.timestamp) return false;
  const age = Date.now() - cache.timestamp;
  return age < cache.ttl;
}

/**
 * Save a capture to Supabase
 * @param {Object} capture - The capture object
 * @returns {Promise<Object>} Result with success status
 */
async function saveCapture(capture) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Insert the main capture record
    const { data: captureData, error: captureError } = await supabase
      .from('captures')
      .insert([{
        id: capture.id,
        url: capture.url,
        title: capture.title,
        timestamp: capture.timestamp,
        protocol: capture.protocol,
        data: capture.data
      }])
      .select()
      .single();

    if (captureError) {
      console.error('Error saving capture:', captureError);
      return { success: false, error: captureError.message };
    }

    // Extract and insert positions if they exist
    if (capture.data?.content?.clmPositions?.positions) {
      const positions = capture.data.content.clmPositions.positions.map(pos => ({
        capture_id: capture.id,
        protocol: capture.protocol,
        pair: pos.pair,
        token0: pos.token0,
        token1: pos.token1,
        fee_tier: pos.feeTier,
        balance: pos.balance,
        pending_yield: pos.pendingYield,
        apy: pos.apy,
        range_min: pos.rangeMin,
        range_max: pos.rangeMax,
        current_price: pos.currentPrice,
        in_range: pos.inRange,
        range_status: pos.rangeStatus,
        distance_from_range: pos.distanceFromRange,
        network: pos.network,
        captured_at: pos.capturedAt || capture.timestamp
      }));

      const { error: positionsError } = await supabase
        .from('positions')
        .insert(positions);

      if (positionsError) {
        console.error('Error saving positions:', positionsError);
        // Don't fail the whole operation if positions fail
      }
    }

    console.log('✅ Capture saved to Supabase:', capture.id);

    // Clear cache after saving new data
    clearCache();

    return { success: true, data: captureData };

  } catch (error) {
    console.error('Error in saveCapture:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all captures, optionally filtered by protocol
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of captures
 */
async function getCaptures(options = {}) {
  try {
    let query = supabase
      .from('captures')
      .select('*')
      .order('timestamp', { ascending: false });

    if (options.protocol) {
      query = query.eq('protocol', options.protocol);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching captures:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCaptures:', error);
    return [];
  }
}

/**
 * Get all positions with filters
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of positions
 */
async function getPositions(options = {}) {
  try {
    // Check cache first (only if no filters applied)
    if (!options.protocol && !options.pair && !options.limit && options.inRange === undefined) {
      if (isCacheValid() && cache.positions) {
        console.log('📦 Using cached positions');
        return cache.positions;
      }
    }

    let query = supabase
      .from('positions')
      .select('*')
      .order('captured_at', { ascending: false });

    if (options.protocol) {
      query = query.eq('protocol', options.protocol);
    }

    if (options.inRange !== undefined) {
      query = query.eq('in_range', options.inRange);
    }

    if (options.pair) {
      query = query.eq('pair', options.pair);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching positions:', error);
      return [];
    }

    // Cache the unfiltered results
    if (!options.protocol && !options.pair && !options.limit && options.inRange === undefined) {
      cache.positions = data || [];
      cache.timestamp = Date.now();
      console.log('💾 Cached positions:', cache.positions.length);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPositions:', error);
    return [];
  }
}

/**
 * Get the most recent position for each unique pair
 * Useful for dashboard showing current state
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of latest positions
 */
async function getLatestPositions(options = {}) {
  try {
    // Check cache first (only if no filters)
    if (Object.keys(options).length === 0) {
      if (isCacheValid() && cache.latestPositions) {
        console.log('📦 Using cached latest positions');
        return cache.latestPositions;
      }
    }

    // Get all positions
    const positions = await getPositions(options);

    // Group by pair and keep only the most recent
    const latestMap = new Map();
    positions.forEach(pos => {
      const key = `${pos.protocol}-${pos.pair}`;
      const existing = latestMap.get(key);

      if (!existing || new Date(pos.captured_at) > new Date(existing.captured_at)) {
        latestMap.set(key, pos);
      }
    });

    const result = Array.from(latestMap.values());

    // Cache the result if no filters
    if (Object.keys(options).length === 0) {
      cache.latestPositions = result;
      cache.timestamp = Date.now();
      console.log('💾 Cached latest positions:', result.length);
    }

    return result;
  } catch (error) {
    console.error('Error in getLatestPositions:', error);
    return [];
  }
}

/**
 * Get recent captures for display
 * @param {number} limit - Number of captures to fetch
 * @returns {Promise<Array>} Array of recent captures
 */
async function getRecentCaptures(limit = 5) {
  return getCaptures({ limit });
}

/**
 * Delete old captures (optional cleanup)
 * @param {number} daysToKeep - Keep captures from the last N days
 * @returns {Promise<Object>} Result with count of deleted records
 */
async function deleteOldCaptures(daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from('captures')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
      .select();

    if (error) {
      console.error('Error deleting old captures:', error);
      return { success: false, error: error.message };
    }

    console.log(`🗑️ Deleted ${data?.length || 0} old captures`);
    return { success: true, deletedCount: data?.length || 0 };

  } catch (error) {
    console.error('Error in deleteOldCaptures:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get position statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getPositionStats() {
  try {
    const positions = await getLatestPositions();

    const stats = {
      totalPositions: positions.length,
      inRangeCount: positions.filter(p => p.in_range).length,
      outOfRangeCount: positions.filter(p => !p.in_range).length,
      totalValue: positions.reduce((sum, p) => sum + (p.balance || 0), 0),
      totalPendingYield: positions.reduce((sum, p) => sum + (p.pending_yield || 0), 0),
      avgAPY: positions.length > 0
        ? positions.reduce((sum, p) => sum + (p.apy || 0), 0) / positions.length
        : 0,
      protocols: [...new Set(positions.map(p => p.protocol))],
      pairs: [...new Set(positions.map(p => p.pair))]
    };

    return stats;
  } catch (error) {
    console.error('Error in getPositionStats:', error);
    return {
      totalPositions: 0,
      inRangeCount: 0,
      outOfRangeCount: 0,
      totalValue: 0,
      totalPendingYield: 0,
      avgAPY: 0,
      protocols: [],
      pairs: []
    };
  }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    supabase,
    saveCapture,
    getCaptures,
    getPositions,
    getLatestPositions,
    getRecentCaptures,
    deleteOldCaptures,
    getPositionStats
  };
}

// Also expose to window object for browser usage (popup, dashboard)
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.saveCapture = saveCapture;
  window.getCaptures = getCaptures;
  window.getPositions = getPositions;
  window.getLatestPositions = getLatestPositions;
  window.getRecentCaptures = getRecentCaptures;
  window.deleteOldCaptures = deleteOldCaptures;
  window.getPositionStats = getPositionStats;
  window.clearCache = clearCache; // Allow manual cache clearing
}
