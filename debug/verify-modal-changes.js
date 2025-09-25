#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/screens/super-admin-subscriptions.tsx');

console.log('🔍 Verifying modal changes in super-admin-subscriptions.tsx...\n');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for back button
  const hasBackButton = content.includes('← Back');
  console.log('✅ Has back button text "← Back":', hasBackButton);
  
  // Check for back button styles
  const hasBackButtonStyles = content.includes('backButton:') && content.includes('backButtonText:');
  console.log('✅ Has back button styles:', hasBackButtonStyles);
  
  // Check for modal debug logging
  const hasModalDebug = content.includes('Modal rendering with showCreateModal');
  console.log('✅ Has modal debug logging:', hasModalDebug);
  
  // Check for create button debug logging
  const hasCreateButtonDebug = content.includes('Create Subscription button clicked');
  console.log('✅ Has create button debug logging:', hasCreateButtonDebug);
  
  // Check modal structure
  const hasModalHeader = content.includes('modalHeader') && content.includes('modalTitle');
  console.log('✅ Has modal header structure:', hasModalHeader);
  
  console.log('\n📋 Summary:');
  if (hasBackButton && hasBackButtonStyles && hasModalHeader) {
    console.log('🎉 All modal changes are present in the file!');
    console.log('\n📌 If you\'re not seeing the back button:');
    console.log('1. Make sure your development server is running');
    console.log('2. Try refreshing the app (shake device -> reload)');
    console.log('3. Clear cache and restart: expo start -c');
    console.log('4. Check browser console for debug logs when clicking buttons');
  } else {
    console.log('❌ Some changes are missing. Check the file content.');
  }
  
} catch (_error) {
  console._error('❌ Error reading file:', _error.message);
}