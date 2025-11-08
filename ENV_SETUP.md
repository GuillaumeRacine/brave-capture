# Environment Variables & Configuration

## Overview

Your Supabase credentials are stored in `.env.local` and automatically converted to `config.js` for the browser extension.

## Files

### `.env.local` (Your Credentials - DO NOT COMMIT)
Contains your API keys and database credentials:
```env
# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://mbshzqwskqvzuiegfmkr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Direct database connection
SUPABASE_CONNECTION=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
SUPABASE_PASSWORD=your_db_password

# AI Validation (optional)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### `config.js` (Auto-Generated - DO NOT COMMIT)
Generated from `.env.local` using the build script:
```javascript
const CONFIG = {
  SUPABASE_URL: 'https://...',
  SUPABASE_ANON_KEY: 'eyJhbGc...'
};
```

### `config.example.js` (Template - Safe to Commit)
Template file showing the structure without real credentials.

## Build Process

### Automatic Generation

Run this command whenever you update `.env.local`:

```bash
npm run build:config
```

This reads `.env.local` and generates `config.js` for the extension.

### What It Does

1. Reads `.env.local`
2. Extracts `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Generates `config.js` with these values
4. Extension loads `config.js` in the browser

## Security

### Protected Files (in .gitignore)
- `.env.local` - Your credentials
- `.env` - Alternative env file
- `config.js` - Auto-generated with credentials

### Safe Files (can be committed)
- `config.example.js` - Template without credentials
- `build-config.js` - Build script
- All other code files

## Workflow

### Initial Setup
```bash
# 1. Add credentials to .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here" >> .env.local

# 2. Generate config.js
npm run build:config

# 3. Load extension in Chrome
# Go to chrome://extensions/ and reload
```

### When Credentials Change
```bash
# 1. Update .env.local with new credentials
# 2. Regenerate config
npm run build:config

# 3. Reload extension
```

### Before Committing to Git
```bash
# Check what will be committed
git status

# Make sure these are NOT listed:
# ❌ .env.local
# ❌ config.js

# These should be listed as "Untracked files (use -f to add)"
# or not appear at all (already in .gitignore)
```

## Environment Variables Reference

### Required for Extension

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/anon key from Supabase | `eyJhbGc...` |

### Optional

| Variable | Description | Used By |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API for AI validation | `validate-capture.js` |
| `SUPABASE_CONNECTION` | Direct database URL | Future features |
| `SUPABASE_PASSWORD` | Database password | Future features |

## Troubleshooting

### "Supabase not configured" Error

**Cause:** `config.js` doesn't exist or has placeholder values

**Solution:**
```bash
# Check if config.js exists
ls -la config.js

# If missing or has placeholders, regenerate
npm run build:config

# Verify it has real values
cat config.js | grep SUPABASE_URL
```

### Build Script Fails

**Error:** `Cannot find module '.env.local'`

**Solution:**
```bash
# Create .env.local with your credentials
cp .env.example .env.local
# Edit .env.local with real values
nano .env.local
```

**Error:** `Missing Supabase credentials in .env.local`

**Solution:** Make sure you have these exact variable names:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Extension Shows Old Credentials

**Cause:** Extension cached old config.js

**Solution:**
```bash
# 1. Update .env.local
# 2. Regenerate config
npm run build:config

# 3. Hard reload extension
# Chrome: chrome://extensions/ → Click reload icon
# OR disable and re-enable the extension
```

## Alternative: Manual Configuration

If you prefer not to use `.env.local`:

1. Copy template:
```bash
cp config.example.js config.js
```

2. Edit `config.js` manually:
```javascript
const CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your_actual_key_here'
};
```

3. Load extension

⚠️ **Remember:** Never commit `config.js` to git!

## For Team Members / Other Developers

When setting up this project:

1. Clone the repository
2. Create your own `.env.local`:
```bash
cp .env.example .env.local
# Edit with your Supabase credentials
```
3. Generate config:
```bash
npm install
npm run build:config
```
4. Load extension in browser

## Summary

✅ **Good Practice:**
- Keep credentials in `.env.local`
- Run `npm run build:config` to update
- Never commit `.env.local` or `config.js`

❌ **Bad Practice:**
- Hardcoding credentials in code
- Committing `config.js` to git
- Sharing `.env.local` file
- Putting credentials in public repos

---

**Quick Command Reference:**
```bash
# Generate config from .env.local
npm run build:config

# Check what's in config.js
cat config.js | head -10

# Verify credentials are hidden from git
git status | grep config.js
# (should not appear or show as untracked)
```
