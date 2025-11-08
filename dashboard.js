// Dashboard JavaScript
let allPositions = [];
let filteredPositions = [];
let currentSort = { field: 'balance', direction: 'desc' };

// Load positions on page load
window.addEventListener('DOMContentLoaded', () => {
  loadCaptures();

  // Add refresh button handler
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      console.log('🔄 Manual refresh triggered');

      // Disable button during refresh
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳ Refreshing...';

      // Clear cache
      if (typeof window.clearCache === 'function') {
        window.clearCache();
      }

      // Reload captures
      await loadCaptures();

      // Re-enable button
      refreshBtn.disabled = false;
      refreshBtn.textContent = '↻ Refresh';
      console.log('✅ Refresh complete');
    });
  }

  // Auto-refresh every 30 seconds
  setInterval(() => {
    console.log('🔄 Auto-refresh triggered (30s interval)');
    if (typeof window.clearCache === 'function') {
      window.clearCache();
    }
    loadCaptures();
  }, 30000);
});

async function loadCaptures() {
  try {
    console.log('🔍 Dashboard: Starting loadCaptures()');
    console.log('🔍 window.getLatestPositions exists?', typeof window.getLatestPositions);
    console.log('🔍 window.SUPABASE_CONFIG exists?', typeof window.SUPABASE_CONFIG);

    // Show loading state
    document.getElementById('positionsTableBody').innerHTML = `
      <tr>
        <td colspan="9" class="loading">
          <div class="spinner"></div>
          <div>Loading positions...</div>
        </td>
      </tr>
    `;

    // Check if function exists
    if (typeof window.getLatestPositions !== 'function') {
      throw new Error('getLatestPositions function not found. Make sure supabase-client.js is loaded.');
    }

    // Get latest positions from Supabase
    console.log('🔍 Calling getLatestPositions()...');
    let positions = await getLatestPositions();
    console.log('🔍 Got positions from Supabase:', positions.length);

    if (positions.length > 0) {
      console.log('📊 Sample position:', positions[0]);
      console.log('📊 Protocols found:', [...new Set(positions.map(p => p.protocol))]);
      console.log('📊 Latest capture time:', positions.map(p => p.captured_at).sort().reverse()[0]);
    } else {
      console.warn('⚠️ No positions returned from Supabase. Check:');
      console.warn('  1. Are captures being uploaded to Supabase?');
      console.warn('  2. Check Supabase table "positions" has data');
      console.warn('  3. Check browser console for Supabase errors');
    }

    // Apply business rules:
    // 1. Hide positions under $1,000
    // 2. Mark Beefy positions as always in-range (auto-adjusts)
    allPositions = positions
      .filter(pos => {
        const balance = parseFloat(pos.balance) || 0;
        return balance >= 1000; // Only show positions >= $1K
      })
      .map(pos => {
        // Beefy auto-adjusts ranges, so always mark as in-range
        if (pos.protocol && pos.protocol.toLowerCase() === 'beefy') {
          return { ...pos, in_range: true };
        }
        return pos;
      });

    // Populate protocol filter
    populateProtocolFilter();

    // Apply filters and render
    applyFilters();

  } catch (error) {
    console.error('❌ Error loading positions:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    document.getElementById('positionsTableBody').innerHTML = `
      <tr>
        <td colspan="9" class="no-data">
          ❌ Error loading positions: ${error.message}<br>
          <small>Check browser console (F12) for details.</small>
        </td>
      </tr>
    `;
  }
}

function populateProtocolFilter() {
  const protocols = [...new Set(allPositions.map(p => p.protocol))].sort();
  const protocolFilter = document.getElementById('protocolFilter');

  // Keep "All Protocols" option and add others
  protocolFilter.innerHTML = '<option value="all">All Protocols</option>' +
    protocols.map(protocol =>
      `<option value="${protocol}">${protocol.charAt(0).toUpperCase() + protocol.slice(1)}</option>`
    ).join('');
}

function applyFilters() {
  const protocolFilter = document.getElementById('protocolFilter').value;
  const rangeFilter = document.getElementById('rangeFilter').value;
  const sortBy = document.getElementById('sortBy').value;

  // Filter positions
  filteredPositions = allPositions.filter(pos => {
    const matchesProtocol = protocolFilter === 'all' || pos.protocol === protocolFilter;
    const matchesRange = rangeFilter === 'all' ||
      (rangeFilter === 'in-range' && pos.in_range) ||
      (rangeFilter === 'out-of-range' && !pos.in_range);

    return matchesProtocol && matchesRange;
  });

  // Parse sort option
  const [field, direction] = sortBy.split('-');
  currentSort = { field, direction };

  // Sort positions
  sortPositions();

  // Update display
  updateStats();
  renderPositions();
}

function sortPositions() {
  const { field, direction } = currentSort;
  const multiplier = direction === 'asc' ? 1 : -1;

  filteredPositions.sort((a, b) => {
    let aVal, bVal;

    switch (field) {
      case 'pair':
        aVal = a.pair || '';
        bVal = b.pair || '';
        return multiplier * aVal.localeCompare(bVal);

      case 'protocol':
        aVal = a.protocol || '';
        bVal = b.protocol || '';
        return multiplier * aVal.localeCompare(bVal);

      case 'balance':
        aVal = parseFloat(a.balance) || 0;
        bVal = parseFloat(b.balance) || 0;
        return multiplier * (aVal - bVal);

      case 'apy':
        aVal = parseFloat(a.apy) || 0;
        bVal = parseFloat(b.apy) || 0;
        return multiplier * (aVal - bVal);

      case 'pending':
        aVal = parseFloat(a.pending_yield) || 0;
        bVal = parseFloat(b.pending_yield) || 0;
        return multiplier * (aVal - bVal);

      case 'status':
        aVal = a.in_range ? 1 : 0;
        bVal = b.in_range ? 1 : 0;
        return multiplier * (aVal - bVal);

      case 'timestamp':
        aVal = new Date(a.captured_at);
        bVal = new Date(b.captured_at);
        return multiplier * (aVal - bVal);

      default:
        return 0;
    }
  });
}

function updateStats() {
  const totalPositions = filteredPositions.length;
  const inRangeCount = filteredPositions.filter(p => p.in_range).length;
  const totalValue = filteredPositions.reduce((sum, p) => sum + (parseFloat(p.balance) || 0), 0);
  const totalPendingYield = filteredPositions.reduce((sum, p) => sum + (parseFloat(p.pending_yield) || 0), 0);

  // Calculate weighted average APY based on position balance
  let weightedAPY = 0;
  if (totalValue > 0) {
    weightedAPY = filteredPositions.reduce((sum, p) => {
      const balance = parseFloat(p.balance) || 0;
      const apy = parseFloat(p.apy) || 0;
      return sum + (balance * apy);
    }, 0) / totalValue;
  }

  document.getElementById('totalPositions').textContent = totalPositions;
  document.getElementById('inRangeCount').textContent = inRangeCount;
  document.getElementById('inRangePercent').textContent =
    totalPositions > 0 ? `${((inRangeCount / totalPositions) * 100).toFixed(1)}%` : '';
  document.getElementById('totalValue').textContent = '$' + totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('totalPendingYield').textContent = '$' + totalPendingYield.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('avgAPY').textContent = weightedAPY.toFixed(2) + '%';
}

function renderPositions() {
  const tbody = document.getElementById('positionsTableBody');

  if (filteredPositions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="no-data">
          No positions found. Try adjusting filters or capture some data first.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredPositions.map(pos => {
    const statusClass = pos.in_range ? 'in-range' : 'out-of-range';
    const statusText = pos.in_range ? 'In Range' : 'Out of Range';

    // Calculate range position percentage
    let rangePosition = 50; // Default to middle
    if (pos.current_price && pos.range_min && pos.range_max) {
      const rangeSize = pos.range_max - pos.range_min;
      rangePosition = ((pos.current_price - pos.range_min) / rangeSize) * 100;
      rangePosition = Math.max(0, Math.min(100, rangePosition));
    }

    const capturedDate = new Date(pos.captured_at);
    const timeAgo = getTimeAgo(capturedDate);

    return `
      <tr class="${statusClass}">
        <td>
          <span class="protocol-badge">${pos.protocol || 'Unknown'}</span>
        </td>
        <td class="pair-cell">${pos.pair || 'Unknown'}</td>
        <td class="center">
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td class="right value-neutral">
          $${(parseFloat(pos.balance) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td class="right value-positive">
          ${(parseFloat(pos.apy) || 0).toFixed(2)}%
        </td>
        <td class="right value-neutral">
          $${(parseFloat(pos.pending_yield) || 0).toFixed(2)}
        </td>
        <td>
          <div class="price-info">
            <div><strong>Min:</strong> ${pos.range_min || 'N/A'}</div>
            <div class="current-price"><strong>Current:</strong> ${pos.current_price || 'N/A'}</div>
            <div><strong>Max:</strong> ${pos.range_max || 'N/A'}</div>
          </div>
        </td>
        <td class="center">
          <div class="range-indicator">
            <div class="range-marker" style="left: ${rangePosition}%;"></div>
          </div>
        </td>
        <td class="right timestamp">${timeAgo}</td>
      </tr>
    `;
  }).join('');
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

// Add click handlers for sortable headers
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.positions-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortField = th.dataset.sort;

      // Toggle direction if same field, otherwise default to desc
      if (currentSort.field === sortField) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = sortField;
        currentSort.direction = 'desc';
      }

      // Update UI
      document.querySelectorAll('.positions-table th.sortable').forEach(h => {
        h.classList.remove('asc', 'desc');
      });
      th.classList.add(currentSort.direction);

      // Re-sort and render
      sortPositions();
      renderPositions();
    });
  });
});
