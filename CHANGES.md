# Supabase Integration - Changes Summary

## Overview

The extension has been upgraded to use Supabase (PostgreSQL) instead of Chrome local storage for persisting captured data.

## Files Modified

### 1. `manifest.json`
- Added `https://*.supabase.co/*` to `host_permissions`
- Added `web_accessible_resources` for config and client files

### 2. `popup.html`
- Added Supabase client library from CDN
- Added config.js and supabase-client.js scripts
- Order: Supabase library → config → client → popup logic

### 3. `popup.js`
- **saveCapture()**: Now uses `window.saveCapture()` from supabase-client.js
- **loadRecentCaptures()**: Fetches from Supabase instead of local storage
- **compareWithPrevious()**: Gets previous captures from Supabase
- **Export button**: Exports data from Supabase
- Removed old Chrome storage-based saveCapture function

### 4. `dashboard.html`
- Added Supabase client library from CDN
- Added config.js and supabase-client.js scripts
- **loadCaptures()**: Now calls `getLatestPositions()` from Supabase
- **applyFilters()**: Updated to work with Supabase field names (`in_range` vs `inRange`)
- **updateStats()**: Uses Supabase field names (`pending_yield`, `balance`, etc.)
- **renderPositions()**: Maps Supabase fields to display (`range_min`, `current_price`, etc.)

## Files Added

### 1. `config.js` ⭐ IMPORTANT
User must edit this file with their Supabase credentials:
```javascript
const CONFIG = {
  SUPABASE_URL: 'YOUR_URL_HERE',
  SUPABASE_ANON_KEY: 'YOUR_KEY_HERE'
};
```

### 2. `supabase-client.js`
Main database interface with functions:
- `saveCapture(capture)` - Save capture + positions
- `getCaptures(options)` - Get all captures
- `getPositions(options)` - Get all positions
- `getLatestPositions(options)` - Get most recent position for each pair
- `getRecentCaptures(limit)` - Get recent captures
- `deleteOldCaptures(days)` - Cleanup function
- `getPositionStats()` - Calculate statistics

### 3. `SUPABASE_SETUP.md`
Complete guide for:
- Creating Supabase project
- Running SQL to create tables
- Getting API credentials
- Security and RLS policies

### 4. `GETTING_STARTED.md`
Step-by-step user guide:
- Setup instructions
- Testing procedures
- Troubleshooting
- Example SQL queries
- Next steps

### 5. `CHANGES.md`
This file - technical changelog

## Database Schema

### captures table
```sql
- id (TEXT, PRIMARY KEY)
- url (TEXT)
- title (TEXT)
- timestamp (TIMESTAMPTZ)
- protocol (TEXT)
- data (JSONB)
- user_id (TEXT)
- created_at (TIMESTAMPTZ)
```

### positions table
```sql
- id (SERIAL, PRIMARY KEY)
- capture_id (TEXT, FOREIGN KEY)
- protocol, pair, token0, token1, fee_tier
- balance, pending_yield, apy (NUMERIC)
- range_min, range_max, current_price (NUMERIC)
- in_range (BOOLEAN)
- range_status, distance_from_range (TEXT)
- network (TEXT)
- captured_at, created_at (TIMESTAMPTZ)
```

## Field Name Mapping

When transitioning from JavaScript objects to PostgreSQL, field names changed:

| JavaScript (old) | PostgreSQL (new) |
|-----------------|------------------|
| `inRange` | `in_range` |
| `feeTier` | `fee_tier` |
| `pendingYield` | `pending_yield` |
| `rangeMin` | `range_min` |
| `rangeMax` | `range_max` |
| `currentPrice` | `current_price` |
| `rangeStatus` | `range_status` |
| `distanceFromRange` | `distance_from_range` |
| `capturedAt` | `captured_at` |

## Dependencies Added

```json
{
  "@supabase/supabase-js": "^2.x.x" (loaded via CDN in browser)
}
```

## Migration Notes

### Data Migration
Existing Chrome local storage data is NOT automatically migrated. Users can:
1. Export existing data using the old version
2. Start fresh with Supabase (recommended)
3. Write a migration script if needed

### Backwards Compatibility
- Extension no longer writes to Chrome local storage
- Old captures in local storage remain accessible but won't be used
- Dashboard only shows Supabase data

## Benefits

### For Users
✅ No data loss if extension is uninstalled
✅ Access positions from any device
✅ Unlimited storage (vs 1000 capture limit)
✅ Better performance for large datasets
✅ Can query data with SQL

### For Developers
✅ Structured relational data
✅ Easy to build additional features
✅ Real-time subscriptions possible
✅ Built-in auth system available
✅ RESTful API automatically generated
✅ Can integrate with other tools/platforms

## Security Considerations

### Current Setup
- Uses anon/public key (included in extension code)
- RLS policies allow all operations (for simplicity)
- Data is "public" to anyone with the key

### Production Recommendations
1. Enable Supabase Auth
2. Update RLS policies to require authentication:
```sql
CREATE POLICY "Users can only access their own data"
ON captures FOR ALL
USING (auth.uid() = user_id);
```
3. Add `user_id` column population on insert
4. Implement login flow in extension

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Config.js updated with real credentials
- [ ] Can capture data from supported protocols
- [ ] Data appears in Supabase tables
- [ ] Dashboard displays positions correctly
- [ ] Filters work (protocol, in-range/out-of-range)
- [ ] Statistics cards show correct values
- [ ] Recent captures appear in popup
- [ ] Export function works
- [ ] Historical comparison works

## Rollback Plan

If issues occur, revert to local storage:
1. Restore old versions of popup.js and dashboard.html
2. Remove Supabase-related scripts from HTML files
3. Reload extension

## Future Enhancements

Possible improvements:
- [ ] Add user authentication
- [ ] Implement offline mode with sync
- [ ] Add real-time updates via Supabase subscriptions
- [ ] Build mobile app using same database
- [ ] Add automated alerts (out of range notifications)
- [ ] Implement data import/export tools
- [ ] Add charts and analytics views
- [ ] Support for sharing positions publicly

## Support

For issues or questions:
- Check GETTING_STARTED.md for setup help
- Review SUPABASE_SETUP.md for database schema
- Examine supabase-client.js for API usage
- Consult Supabase docs: https://supabase.com/docs
