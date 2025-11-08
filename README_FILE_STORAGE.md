# Dual Storage System: Database + Files

## 🎯 What You Get

Your extension now saves captures in **TWO places simultaneously**:

### 1. Supabase Database (Cloud) ☁️
- Query with SQL
- Power the dashboard
- Aggregate statistics
- Access from anywhere

### 2. Local JSON Files (Your Computer) 💾
- Complete history preserved
- Timestamped filenames
- Easy to backup
- Offline access
- Timeline view

## 📁 File Naming

Every capture creates a file with this format:

```
[protocol-url]_[YYYY-MM-DD]_[HH-MM-SS].json
```

**Examples:**
```
orca-so_2025-01-27_14-30-45.json
raydium-io-clmm_2025-01-27_18-15-22.json
aerodrome-finance-liquidity_2025-01-28_09-15-30.json
```

Files auto-organize into:
```
Downloads/captures/
  ├── orca-so/2025-01/
  ├── raydium-io/2025-01/
  └── aerodrome-finance/2025-01/
```

## 🚀 How It Works

### When You Capture

1. Click "Capture Page Data"
2. ✅ Saved to Supabase (for dashboard)
3. ✅ Downloaded as JSON file (for history)
4. ✅ Filename auto-generated with timestamp
5. ✅ File auto-organized by protocol/month

### What You Can Do

**View Current State:**
- Open `dashboard.html`
- See latest positions from Supabase
- Filter by protocol/status
- View statistics

**View History:**
- Open `timeline.html`
- Select multiple JSON files
- See chronological timeline
- Track changes over time

## 📊 Timeline Viewer

The timeline viewer shows:
- All captures in order
- Position changes (added/removed)
- Status changes (in-range → out-of-range)
- Balance changes
- Portfolio value trends

### Using Timeline

1. Capture positions regularly (daily/weekly)
2. Open `timeline.html` in browser
3. Click "Select Capture Files"
4. Choose all JSON files for a protocol
5. See complete history with changes highlighted!

## 🔄 Benefits of Both

| Feature | Supabase | Local Files |
|---------|----------|-------------|
| Query with SQL | ✅ | ❌ |
| Dashboard | ✅ | ❌ |
| Access anywhere | ✅ | ❌ |
| Offline access | ❌ | ✅ |
| Complete history | ⚠️ (can be cleaned) | ✅ |
| Easy backup | ⚠️ (manual export) | ✅ |
| Timeline view | ❌ | ✅ |
| Version control | ❌ | ✅ |

## 📂 File Locations

### Default Location
```
~/Downloads/captures/[protocol]/[YYYY-MM]/filename.json
```

### Custom Location
Change Chrome's download folder:
1. `chrome://settings/downloads`
2. Set your preferred location
3. Captures will go there instead

## 🔍 Finding Your Files

### macOS/Linux
```bash
# Find all captures
find ~/Downloads/captures -name "*.json"

# Find captures for specific protocol
ls ~/Downloads/captures/orca-so/*/

# Find captures from specific date
find ~/Downloads/captures -name "*2025-01-27*.json"
```

### Windows
```powershell
# Find all captures
Get-ChildItem -Path "$env:USERPROFILE\Downloads\captures" -Filter "*.json" -Recurse

# Find captures for specific protocol
Get-ChildItem -Path "$env:USERPROFILE\Downloads\captures\orca-so"
```

## 💡 Use Cases

### Track Performance
Capture daily, then use timeline to see:
- APY trends
- Position rebalancing
- When positions went out of range
- Balance changes

### Compare Strategies
Capture multiple protocols, then compare:
- Which has better APY
- Which stays in range longer
- Which has more stable returns

### Backup & Archive
Keep complete history:
- Backup files to external drive
- Compress old months
- Share with team/accountant

### Data Analysis
Files are standard JSON:
- Import to Excel/Google Sheets
- Analyze in Python/R
- Build custom visualizations

## 🛠️ Advanced Features

### Export All Data
```bash
# Export positions to CSV
jq -r '.data.content.clmPositions.positions[] |
       [.timestamp, .pair, .balance, .apy, .inRange] |
       @csv' \
  captures/*/*/*json > all-positions.csv
```

### Track Specific Pair
```bash
# Track SOL/USDC over time
jq '.data.content.clmPositions.positions[] |
    select(.pair == "SOL/USDC") |
    {time: .capturedAt, apy: .apy, balance: .balance}' \
  captures/orca-so/*/*.json
```

### Calculate Returns
```python
import json
import glob

files = sorted(glob.glob('captures/orca-so/*/*.json'))
first = json.load(open(files[0]))
last = json.load(open(files[-1]))

first_value = sum(p['balance'] for p in first['data']['content']['clmPositions']['positions'])
last_value = sum(p['balance'] for p in last['data']['content']['clmPositions']['positions'])

returns = ((last_value - first_value) / first_value) * 100
print(f"Returns: {returns:.2f}%")
```

## 📖 Documentation

- **FILE_STORAGE.md** - Complete file storage guide
- **timeline.html** - Interactive timeline viewer
- **file-storage.js** - Storage module API
- **GETTING_STARTED.md** - Setup guide
- **SUPABASE_SETUP.md** - Database setup

## 🎯 Quick Start

1. **Setup Supabase** (if not done)
   - Follow FINAL_SETUP.md
   - Create tables
   - Configure credentials

2. **Load Extension**
   - `chrome://extensions/`
   - Load unpacked
   - Select this folder

3. **Capture Positions**
   - Visit your protocol
   - Click extension → "Capture Page Data"
   - ✅ Saved to database AND file

4. **View Data**
   - Dashboard: `dashboard.html` (current state)
   - Timeline: `timeline.html` (history)

## 🐛 Troubleshooting

### Files Not Saving

**Check download settings:**
- `chrome://settings/downloads`
- Ensure location is set
- Disable "Ask where to save"

### Can't Find Files

**Search:**
```bash
find ~/Downloads -name "*capture*.json"
```

### Timeline Not Loading

**Verify:**
1. Files are valid JSON
2. Files contain `data.content.clmPositions`
3. Browser console for errors

## 🎉 Summary

✅ **Dual storage:** Database + Files
✅ **Automatic:** No extra clicks needed
✅ **Organized:** By protocol and month
✅ **Timestamped:** Easy chronological sorting
✅ **Complete history:** Never lose data
✅ **Timeline view:** See changes over time
✅ **Backup-friendly:** Standard JSON format

Your CLM positions are now tracked with complete history! 📊🚀
