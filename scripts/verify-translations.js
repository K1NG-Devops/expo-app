#!/usr/bin/env node
/**
 * Verify translation parity across all languages
 * 
 * Usage: node scripts/verify-translations.js
 * Exit code: 0 = all good, 1 = missing keys found
 */

const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'af', 'zu', 'st'];
const localesDir = path.join(__dirname, '../locales');

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value, fullKey).forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

console.log('\n📊 Translation Parity Check\n');
console.log('='.repeat(50));

const results = {};
for (const lang of LANGUAGES) {
  const file = path.join(localesDir, lang, 'common.json');
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      results[lang] = flattenKeys(data);
    } catch (error) {
      console.error(`\n❌ ${lang.toUpperCase()}: Failed to parse JSON - ${error.message}`);
      results[lang] = new Set();
    }
  } else {
    console.warn(`\n⚠️  ${lang.toUpperCase()}: File not found at ${file}`);
    results[lang] = new Set();
  }
}

const enKeys = results.en;
let hasErrors = false;

if (!enKeys || enKeys.size === 0) {
  console.error('\n❌ English translations not found or empty!');
  process.exit(1);
}

for (const lang of LANGUAGES.filter(l => l !== 'en')) {
  const missing = [...enKeys].filter(k => !results[lang].has(k));
  const extra = [...results[lang]].filter(k => !enKeys.has(k));
  
  if (missing.length > 0) {
    console.error(`\n❌ ${lang.toUpperCase()}: Missing ${missing.length} keys`);
    if (missing.length <= 10) {
      console.error(`   Keys: ${missing.join(', ')}`);
    } else {
      console.error(`   First 10: ${missing.slice(0, 10).join(', ')}`);
      console.error(`   ... and ${missing.length - 10} more`);
    }
    hasErrors = true;
  }
  
  if (extra.length > 0) {
    console.warn(`\n⚠️  ${lang.toUpperCase()}: ${extra.length} extra keys not in English`);
    if (extra.length <= 5) {
      console.warn(`   Keys: ${extra.join(', ')}`);
    }
  }
  
  if (missing.length === 0 && extra.length === 0) {
    console.log(`\n✅ ${lang.toUpperCase()}: Perfect match (${results[lang].size} keys)`);
  }
}

console.log('\n' + '='.repeat(50));
console.log(`\nEnglish keys: ${enKeys.size}`);
console.log(`Total languages: ${LANGUAGES.length}`);

if (hasErrors) {
  console.log('\n❌ Translation check FAILED');
  console.log('💡 Run: npm run i18n:export to generate a CSV template\n');
  process.exit(1);
} else {
  console.log('\n✅ Translation check PASSED\n');
  process.exit(0);
}
