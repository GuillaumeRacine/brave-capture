# File-Based Storage System

## Overview

Your extension now saves captures in **TWO places**:

1. **Supabase Database** (cloud) - For querying, dashboard, analytics
2. **Local JSON Files** (your computer) - For complete history, backups, offline access

## File Naming Convention

Each capture is saved with a descriptive filename:

```
[protocol-url]_[YYYY-MM-DD]_[HH-MM-SS].json
```

### Examples

```
orca-so_2025-01-27_14-30-45.json
raydium-io-clmm_2025-01-27_15-00-00.json
aerodrome-finance-liquidity_2025-01-28_09-15-30.json
cetus-zone-pool_2025-01-29_10-45-12.json
```

## Directory Structure

Files are auto-organized by protocol and month:

```
Downloads/
└── captures/
    ├── orca-so/
    │   ├── 2025-01/
    │   │   ├── orca-so_2025-01-27_14-30-45.json
    │   │   ├── orca-so_2025-01-27_18-15-22.json
    │   │   └── orca-so_2025-01-28_09-00-00.json
    │   └── 2025-02/
    │       └── orca-so_2025-02-01_10-30-00.json
    ├── raydium-io/
    │   └── 2025-01/
    │       ├── raydium-io-clmm_2025-01-27_15-00-00.json
    │       └── raydium-io-clmm_2025-01-28_12-00-00.json
    └── aerodrome-finance/
        └── 2025-01/
            └── aerodrome-finance-liquidity_2025-01-28_09-15-30.json
```

## Benefits

### 1. Easy Sorting
Files are chronologically sorted by name:
```bash
ls captures/orca-so/2025-01/
# Shows captures in order from oldest to newest
```

### 2. Full History
Every capture is preserved. You can:
- Track position changes over time
- See when positions went out of range
- Compare APY changes
- Analyze balance movements

### 3. Offline Access
All data is on your computer. Works without internet.

### 4. Easy Backup
```bash
# Backup all captures
cp -r ~/Downloads/captures ~/Backups/

# Or compress
tar -czf captures-backup.tar.gz ~/Downloads/captures
```

### 5. Version Control Friendly
Text-based JSON files can be tracked in git (if you want):
```bash
cd ~/Downloads/captures
git init
git add .
git commit -m "Capture history backup"
```

## Usage

### Automatic Capture

When you click "Capture Page Data":
1. ✅ Data saved to Supabase
2. ✅ File auto-downloaded to `~/Downloads/captures/[protocol]/[YYYY-MM]/`
3. ✅ Filename generated automatically

### Manual Organization

If you prefer a different location:
1. Set Chrome's download location
2. Or move files later:
```bash
mkdir -p ~/Documents/CLM-Positions
mv ~/Downloads/captures ~/Documents/CLM-Positions/
```

### View Timeline

Open `timeline.html` in your browser:
1. Click "Select Capture Files"
2. Choose multiple JSON files from a protocol
3. See chronological timeline with changes highlighted

## Timeline Viewer Features

The timeline viewer (`timeline.html`) shows:

- ✅ All captures in chronological order
- ✅ Position changes (added/removed)
- ✅ Status changes (in-range → out-of-range)
- ✅ Balance changes
- ✅ Portfolio value over time
- ✅ APY trends

### How to Use Timeline

1. **Collect captures over time**
   - Visit your protocol daily/weekly
   - Click "Capture Page Data"
   - Files auto-save

2. **View timeline**
   - Open `timeline.html`
   - Select all files for a protocol
   - See complete history

3. **Compare specific dates**
   - Select only 2 files
   - See what changed between them

## File Format

Each file contains complete capture data:

```json
{
  "id": "cap_xyz123",
  "url": "https://www.orca.so/liquidity",
  "title": "Orca - Liquidity",
  "timestamp": "2025-01-27T14:30:45.123Z",
  "protocol": "Orca",
  "data": {
    "content": {
      "clmPositions": {
        "summary": {
          "totalValue": "5000.00",
          "pendingYield": "25.50"
        },
        "positions": [
          {
            "pair": "SOL/USDC",
            "balance": 2500.00,
            "apy": 45.5,
            "inRange": true,
            "rangeMin": 100.0,
            "rangeMax": 150.0,
            "currentPrice": 125.5,
            ...
          }
        ]
      }
    }
  }
}
```

## Query Examples

### Find All Captures for a Protocol

```bash
cd ~/Downloads/captures/orca-so
ls -lt */orca-so_*.json
```

### Get Latest Capture

```bash
ls -t captures/orca-so/*/*.json | head -1
```

### Find Captures from Specific Date

```bash
find captures -name "*2025-01-27*.json"
```

### Count Captures per Protocol

```bash
for dir in captures/*/; do
  echo "$(basename $dir): $(find $dir -name '*.json' | wc -l) captures"
done
```

## Analysis Scripts

### Compare Two Captures

```bash
# Compare position changes
diff \
  captures/orca-so/2025-01/orca-so_2025-01-27_14-30-45.json \
  captures/orca-so/2025-01/orca-so_2025-01-28_14-30-45.json
```

### Extract Specific Data

```bash
# Get all APY values
jq '.data.content.clmPositions.positions[].apy' \
  captures/orca-so/*/*.json
```

### Track Position Over Time

```bash
# See how SOL/USDC APY changed
jq '.data.content.clmPositions.positions[] |
    select(.pair == "SOL/USDC") |
    {timestamp: .capturedAt, apy: .apy}' \
  captures/orca-so/*/*.json
```

## Data Management

### Clean Old Captures

Keep only last 30 days:
```bash
find ~/Downloads/captures -name "*.json" -mtime +30 -delete
```

### Archive by Month

```bash
cd ~/Downloads/captures
tar -czf archive-2025-01.tar.gz */2025-01/
rm -rf */2025-01/
```

### Export to CSV

```bash
# Extract key metrics to CSV
jq -r '.data.content.clmPositions.positions[] |
       [.pair, .balance, .apy, .inRange] |
       @csv' \
  captures/*/*/*json > positions.csv
```

## Integration

### Use with External Tools

Since files are standard JSON:
- Import into Excel/Google Sheets
- Analyze in Python/R
- Visualize with custom scripts
- Share with team members

### Example: Python Analysis

```python
import json
import glob
from datetime import datetime

# Load all captures
files = glob.glob('captures/*/*/*json')
captures = [json.load(open(f)) for f in files]

# Analyze APY trends
for cap in sorted(captures, key=lambda x: x['timestamp']):
    positions = cap['data']['content']['clmPositions']['positions']
    avg_apy = sum(p['apy'] for p in positions) / len(positions)
    print(f"{cap['timestamp']}: {avg_apy:.2f}% avg APY")
```

## Backup Strategy

### Recommended Approach

1. **Automated Daily Backup**
   ```bash
   # Add to crontab
   0 2 * * * tar -czf ~/Backups/captures-$(date +\%Y-\%m-\%d).tar.gz ~/Downloads/captures
   ```

2. **Cloud Sync**
   ```bash
   # Sync to Dropbox/iCloud/Google Drive
   rsync -av ~/Downloads/captures ~/Dropbox/CLM-Backups/
   ```

3. **Git Versioning** (optional)
   ```bash
   cd ~/Downloads/captures
   git add .
   git commit -m "Daily capture backup $(date)"
   git push
   ```

## Troubleshooting

### Files Not Auto-Downloading

**Check Chrome settings:**
1. `chrome://settings/downloads`
2. Ensure download location is set
3. Turn off "Ask where to save each file before downloading"

### Files Going to Wrong Location

**Fix download path:**
```javascript
// In popup.js, modify saveCaptureToFile:
chrome.downloads.download({
  filename: 'captures/...',  // Relative to Downloads folder
  saveAs: false  // Don't ask user
})
```

### Cannot Find Files

**Search for captures:**
```bash
find ~/Downloads -name "*orca-so*.json"
```

## Summary

✅ **Automatic:** Files save on every capture
✅ **Organized:** By protocol and month
✅ **Descriptive:** Filenames show protocol, date, time
✅ **Complete:** Full capture data in each file
✅ **Timeline:** View history with timeline.html
✅ **Backup-friendly:** Standard JSON format
✅ **Offline:** Works without internet

Your position history is preserved forever! 📊
