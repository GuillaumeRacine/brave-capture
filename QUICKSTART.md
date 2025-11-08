# Quick Start - 5 Minutes to Get Running

## 1. Create Supabase Account (2 min)

1. Go to https://supabase.com → Sign up
2. Click "New Project"
3. Name: `brave-capture-clm`
4. Set password (save it!)
5. Choose region
6. Click "Create" → Wait ~2 minutes

## 2. Setup Database (1 min)

1. In Supabase, click **SQL Editor**
2. Open `SUPABASE_SETUP.md` in this folder
3. Copy the entire SQL block (starts with `CREATE TABLE captures`)
4. Paste into SQL Editor
5. Click **Run** ▶️

## 3. Get Your Credentials (30 sec)

1. Click **Settings** → **API**
2. Copy two values:
   - Project URL: `https://xxxxx.supabase.co`
   - anon/public key: `eyJhbGc...`

## 4. Configure Extension (10 sec)

**Option A: Automatic (if you have .env.local)**
```bash
npm run build:config
```
✅ Done! Your credentials are automatically loaded.

**Option B: Manual**
1. Copy values to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```
2. Run: `npm run build:config`

## 5. Install Extension (1 min)

1. Open Chrome/Brave
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select this folder (`Brave-Capture`)
6. Done! 🎉

## Test It

1. Go to Orca.so (or another supported protocol)
2. Navigate to your liquidity positions page
3. Click the extension icon
4. Click "Capture Page Data"
5. ✅ Success message!

## View Your Data

### In Supabase:
- Go to **Table Editor** → `positions` table
- See your captured positions!

### In Dashboard:
- Open `dashboard.html` in your browser
- See beautiful visualizations of your positions

## That's It!

Your positions are now stored in the cloud, backed up, and accessible from anywhere!

## Need Help?

- Full guide: Read `GETTING_STARTED.md`
- Setup details: See `SUPABASE_SETUP.md`
- What changed: Check `CHANGES.md`

---

**Supported Protocols:**
- ✅ Orca (Solana)
- ✅ Raydium (Solana)
- ✅ Aerodrome (Base)
- ✅ Cetus (Sui)
- ✅ Hyperion (Aptos)
- ✅ Beefy Finance (Multi-chain)
- ✅ PancakeSwap (Base/BSC)
