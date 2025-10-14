#!/usr/bin/env node
/**
 * Export English translation keys to CSV for translators
 * 
 * Usage: node scripts/export-for-translation.js
 * Output: translations-template.csv
 */

const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'af', 'zu', 'st'];
const enFile = path.join(__dirname, '../locales/en/common.json');

function flattenKeys(obj, prefix = '') {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result.push(...flattenKeys(value, fullKey));
    } else {
      result.push({ key: fullKey, en: value });
    }
  }
  return result;
}

try {
  console.log('📤 Exporting translation keys...\n');
  
  const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
  const keys = flattenKeys(enData);

  // Generate CSV
  const header = ['Key', ...LANGUAGES].join(',');
  const rows = keys.map(({ key, en }) => {
    const cells = [key, en, ...Array(LANGUAGES.length - 1).fill('')];
    return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
  });

  const csvPath = path.join(__dirname, '../translations-template.csv');
  fs.writeFileSync(csvPath, [header, ...rows].join('\n'));
  
  console.log(`✅ Exported ${keys.length} keys to translations-template.csv`);
  console.log(`📊 Languages: ${LANGUAGES.join(', ')}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Open translations-template.csv in a spreadsheet editor`);
  console.log(`   2. Fill in translations for each language column`);
  console.log(`   3. Import back to locales/ directory`);
} catch (error) {
  console.error('❌ Export failed:', error.message);
  process.exit(1);
}
