#!/usr/bin/env node
/**
 * Build script to generate config.js from .env.local
 *
 * This script reads SUPABASE credentials from .env.local
 * and generates a config.js file for the browser extension.
 *
 * Usage: node build-config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file not found!');
  console.error('Please create .env.local with your Supabase credentials.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');

// Parse environment variables
const env = {};
envContent.split('\n').forEach(line => {
  line = line.trim();

  // Skip comments and empty lines
  if (!line || line.startsWith('#')) return;

  // Parse KEY=VALUE
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    env[key] = value;
  }
});

// Get Supabase credentials
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)');
  process.exit(1);
}

// Generate config.js content
const configContent = `// Configuration file for Supabase credentials
// ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
// This file is generated from .env.local by build-config.js
// Run: npm run build:config to regenerate

const CONFIG = {
  SUPABASE_URL: '${supabaseUrl}',
  SUPABASE_ANON_KEY: '${supabaseKey}'
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = CONFIG;
}
`;

// Write config.js
const configPath = path.join(__dirname, 'config.js');
fs.writeFileSync(configPath, configContent, 'utf-8');

console.log('✅ config.js generated successfully!');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
console.log('');
console.log('📦 Your extension is now configured.');
console.log('   Reload the extension at chrome://extensions/');
