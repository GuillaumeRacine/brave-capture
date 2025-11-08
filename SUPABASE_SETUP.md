# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Name**: brave-capture-clm
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to you
5. Click "Create new project" (takes ~2 minutes)

## Step 2: Create Database Tables

Once your project is ready, go to **SQL Editor** and run this SQL:

```sql
-- Create captures table
CREATE TABLE captures (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  protocol TEXT,
  data JSONB NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create positions table (denormalized for easier querying)
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  capture_id TEXT NOT NULL REFERENCES captures(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL,
  pair TEXT NOT NULL,
  token0 TEXT,
  token1 TEXT,
  fee_tier TEXT,
  balance NUMERIC,
  pending_yield NUMERIC,
  apy NUMERIC,
  range_min NUMERIC,
  range_max NUMERIC,
  current_price NUMERIC,
  in_range BOOLEAN,
  range_status TEXT,
  distance_from_range TEXT,
  network TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_captures_timestamp ON captures(timestamp DESC);
CREATE INDEX idx_captures_protocol ON captures(protocol);
CREATE INDEX idx_positions_capture_id ON positions(capture_id);
CREATE INDEX idx_positions_protocol ON positions(protocol);
CREATE INDEX idx_positions_pair ON positions(pair);
CREATE INDEX idx_positions_in_range ON positions(in_range);
CREATE INDEX idx_positions_captured_at ON positions(captured_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - you can add auth later)
CREATE POLICY "Enable all access for captures" ON captures
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for positions" ON positions
  FOR ALL USING (true) WITH CHECK (true);
```

## Step 3: Get API Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project API Key** (anon/public): `eyJhbGc...`

## Step 4: Add Credentials to Extension

Create a file `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Important:** Use the `NEXT_PUBLIC_` prefix for the environment variables.

## Step 5: Build Configuration File

Run the build script to generate `config.js` from your `.env.local`:

```bash
npm install
npm run build:config
```

This creates `config.js` which is loaded by the extension:

```javascript
// config.js (auto-generated - do not edit manually)
const CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGc...'
};

if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = CONFIG;
}
```

**Important:** `config.js` is in `.gitignore` to prevent committing credentials.

## Step 6: Download Supabase Client Library

Since Manifest V3 doesn't allow external CDN scripts, download the Supabase library locally:

```bash
curl -o supabase.js https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js
```

Verify the file was downloaded:

```bash
ls -lh supabase.js
# Should show ~138KB file
```

## Verification

Check that all required files are present:

```bash
ls -lh config.js supabase.js supabase-client.js file-storage.js
```

Expected output:
```
-rw-r--r--  1 user  staff   621B config.js
-rw-r--r--  1 user  staff   138K supabase.js
-rw-r--r--  1 user  staff   7.6K supabase-client.js
-rw-r--r--  1 user  staff   6.5K file-storage.js
```

## How It Works

The extension now uses a **dual storage system**:

1. **Supabase Database** (Primary)
   - Captures saved to `captures` table with full JSONB data
   - Positions denormalized to `positions` table for fast queries
   - Powers the real-time dashboard
   - Enables historical comparison and analytics

2. **Local File Export** (Backup)
   - Timestamped JSON files: `[protocol]_[YYYY-MM-DD]_[HH-MM-SS].json`
   - Auto-organized: `~/Downloads/captures/[protocol]/[YYYY-MM]/`
   - Complete backup for offline access
   - Timeline analysis and historical tracking

## Query Examples

Once you have data in Supabase, you can run SQL queries:

**Get all captures:**
```sql
SELECT id, url, protocol, timestamp
FROM captures
ORDER BY timestamp DESC;
```

**Get positions for a specific protocol:**
```sql
SELECT pair, balance, apy, in_range, captured_at
FROM positions
WHERE protocol = 'orca'
  AND balance >= 1000
ORDER BY balance DESC;
```

**Get latest position for each pair:**
```sql
SELECT DISTINCT ON (protocol, pair)
  protocol, pair, balance, apy, in_range, captured_at
FROM positions
ORDER BY protocol, pair, captured_at DESC;
```

**Calculate weighted APY:**
```sql
SELECT
  SUM(balance * apy) / SUM(balance) as weighted_apy,
  SUM(balance) as total_value,
  COUNT(*) as position_count
FROM positions
WHERE balance >= 1000
  AND captured_at > NOW() - INTERVAL '1 day';
```

## Optional: Add User Authentication

Later, you can add Supabase Auth to:
- Have multiple users with separate data
- Secure your data with proper RLS policies
- Sync data across devices

For now, the policies allow public access (anyone with the API key can read/write).
If you want to keep it private, don't share your API keys!
