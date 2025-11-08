// Configuration file for Supabase credentials
// TEMPLATE - Copy this to config.js and add your credentials
// OR run: npm run build:config (reads from .env.local)

const CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE', // e.g., https://xxxxx.supabase.co
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE' // Your anon/public key from Supabase
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = CONFIG;
}
