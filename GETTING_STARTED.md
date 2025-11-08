# Getting Started with Supabase Integration

Congratulations! Your Brave Capture extension now saves data to Supabase instead of local browser storage.

## What Changed?

### Before
- Data stored in Chrome local storage
- Limited to 1000 captures
- Lost if extension is uninstalled
- Only accessible from the browser where captures were made

### After ✅
- Data stored in Supabase PostgreSQL database
- Unlimited storage (depends on your plan)
- Persistent and backed up
- Accessible from any device/browser with your credentials
- Can query and analyze data with SQL
- Can build additional tools/apps using the same database

## Setup Instructions

### Step 1: Create Your Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/log in
2. Click "New Project"
3. Fill in the details:
   - **Name**: `brave-capture-clm`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to you (e.g., US West, EU Central)
4. Click "Create new project" and wait ~2 minutes

### Step 2: Create the Database Tables

1. Once your project is ready, click on **SQL Editor** in the left sidebar
2. Click "New query"
3. Copy and paste the entire SQL script from `SUPABASE_SETUP.md`
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

This creates:
- `captures` table - stores complete capture data
- `positions` table - stores individual positions (denormalized for easy querying)
- Indexes for fast queries
- Row Level Security policies

### Step 3: Get Your API Credentials

1. Go to **Settings** → **API** in the left sidebar
2. You'll see two important values:

**Project URL:**
```
https://xxxxxxxxxxxxx.supabase.co
```

**API Keys:**
- anon/public key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

Copy both of these!

### Step 4: Configure the Extension

1. Open `config.js` in your Brave-Capture folder
2. Replace the placeholder values:

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxxxxxxx.supabase.co', // ← Your project URL
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // ← Your anon key
};
```

3. Save the file

### Step 5: Reload the Extension

1. Open Chrome/Brave
2. Go to `chrome://extensions/`
3. Find "Brave Capture - CLM Position Tracker"
4. Click the refresh/reload icon 🔄
5. Done!

## Testing It Out

### Test 1: Capture Some Data

1. Go to one of your DeFi protocols (Orca, Raydium, etc.)
2. Make sure you're on the positions/liquidity page
3. Click the extension icon
4. Click "Capture Page Data"
5. You should see "Page data captured successfully!"

### Test 2: Verify in Supabase

1. Go back to your Supabase project
2. Click **Table Editor** in the left sidebar
3. Select the `captures` table
4. You should see your captured data!
5. Check the `positions` table too - individual positions should be there

### Test 3: View the Dashboard

1. Open `dashboard.html` in your browser:
   - File: `file:///Volumes/Crucial X8/Code/Brave-Capture/dashboard.html`
   - Or: `http://localhost:8000/dashboard.html` (if server is running)
2. You should see your positions displayed with stats and cards!

## Troubleshooting

### "Supabase not configured" Warning

**Problem:** You see this in the browser console
**Solution:** Make sure you updated `config.js` with real credentials (not the placeholder text)

### "Failed to save capture"

**Problem:** Data not saving to Supabase
**Solutions:**
1. Check that you ran the SQL script to create the tables
2. Verify your API key is correct
3. Check the browser console for specific errors
4. Make sure you have an internet connection

### Dashboard Shows "No positions found"

**Problem:** Dashboard is empty
**Solutions:**
1. Make sure you've captured at least one position using the extension
2. Check that Supabase has data (Table Editor → captures)
3. Open browser console and look for errors
4. Verify `config.js` has the correct credentials

### Chrome Extension Error

**Problem:** Extension doesn't load or shows errors
**Solutions:**
1. Reload the extension at `chrome://extensions/`
2. Check that all files are present
3. Look at the extension's console (click "Inspect" on the extension)

## What's in the Database?

### captures table
- `id`: Unique capture ID
- `url`: Page URL where capture was made
- `title`: Page title
- `timestamp`: When the capture happened
- `protocol`: Which protocol (Orca, Raydium, etc.)
- `data`: Complete JSON data (JSONB field - queryable!)

### positions table
- All individual position fields (pair, balance, APY, etc.)
- Links to parent capture via `capture_id`
- Easier to query than nested JSON

## Advanced: Query Your Data with SQL

You can run custom SQL queries in Supabase!

### Get all positions for a specific protocol:
```sql
SELECT * FROM positions
WHERE protocol = 'Orca'
ORDER BY captured_at DESC;
```

### Find out-of-range positions:
```sql
SELECT pair, balance, protocol, captured_at
FROM positions
WHERE in_range = false
ORDER BY balance DESC;
```

### Calculate total portfolio value:
```sql
SELECT
  protocol,
  COUNT(*) as position_count,
  SUM(balance) as total_value,
  AVG(apy) as avg_apy
FROM positions
WHERE captured_at > NOW() - INTERVAL '7 days'
GROUP BY protocol;
```

### Track a specific pair over time:
```sql
SELECT
  captured_at,
  balance,
  apy,
  current_price,
  in_range
FROM positions
WHERE pair = 'SOL/USDC'
ORDER BY captured_at DESC
LIMIT 50;
```

## Next Steps

### Optional: Add Authentication

Currently, anyone with your API key can access your data. To make it truly private:

1. Go to **Authentication** → **Providers** in Supabase
2. Enable Email authentication (or Google, GitHub, etc.)
3. Update the RLS policies to require authentication
4. Modify the extension to handle login

### Optional: Build Additional Tools

Since your data is in Supabase, you can:
- Build a mobile app (React Native, Flutter)
- Create a web dashboard (Next.js, React)
- Set up automated alerts (Supabase Edge Functions)
- Export to Google Sheets or Excel
- Integrate with trading bots or analytics platforms

### Optional: Backup Your Data

Even though Supabase is reliable, you can export your data:
- Click "Export Data" in the extension
- OR use Supabase's backup tools
- OR write a script to export to CSV/JSON periodically

## Need Help?

- Check the Supabase docs: https://supabase.com/docs
- Review `SUPABASE_SETUP.md` for the SQL schema
- Look at `supabase-client.js` to see how the extension connects

Your positions are now safely stored in the cloud! 🎉
