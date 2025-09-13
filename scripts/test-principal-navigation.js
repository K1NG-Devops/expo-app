#!/usr/bin/env node

/**
 * Navigation Test Script for Principal Tools
 * 
 * Tests that all routes referenced in the principal dashboard exist and are accessible
 */

const fs = require('fs');
const path = require('path');

// Routes defined in the principal dashboard
const routes = [
  '/screens/finance/budget-management',
  '/screens/teacher-management',
  '/screens/student-enrollment', 
  '/screens/financial-detail',
  '/screens/finance/petty-cash',
  '/screens/admin/school-settings',
  '/screens/ai-lesson-generator',
];

// Additional route mappings (since we use app directory structure)
const routeMappings = {
  '/screens/finance/budget-management': 'app/screens/finance/budget-management.tsx',
  '/screens/teacher-management': 'app/screens/teacher-management.tsx',
  '/screens/student-enrollment': 'app/screens/student-enrollment.tsx',
  '/screens/financial-detail': 'app/screens/financial-detail.tsx',
  '/screens/finance/petty-cash': 'app/screens/finance/petty-cash.tsx',
  '/screens/admin/school-settings': 'app/screens/admin/school-settings.tsx',
  '/screens/ai-lesson-generator': 'app/screens/ai-lesson-generator.tsx',
};

console.log('🧪 Testing Principal Dashboard Navigation Routes...\n');

let allRoutesExist = true;
let testResults = [];

routes.forEach(route => {
  const filePath = routeMappings[route];
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`✅ ${route} -> ${filePath}`);
    testResults.push({ route, status: 'exists', path: filePath });
  } else {
    console.log(`❌ ${route} -> ${filePath} (FILE NOT FOUND)`);
    testResults.push({ route, status: 'missing', path: filePath });
    allRoutesExist = false;
  }
});

console.log('\n📊 Test Summary:');
console.log(`Total routes tested: ${routes.length}`);
console.log(`Routes found: ${testResults.filter(r => r.status === 'exists').length}`);
console.log(`Routes missing: ${testResults.filter(r => r.status === 'missing').length}`);

if (allRoutesExist) {
  console.log('\n🎉 All principal dashboard routes exist and are properly configured!');
} else {
  console.log('\n⚠️  Some routes are missing. Please create the missing files or update the navigation paths.');
}

// Test for additional files that should exist
console.log('\n🔍 Checking additional supporting files...');

const supportingFiles = [
  'components/dashboard/PrincipalDashboard.tsx',
  'app/screens/principal-dashboard.tsx',
  'contexts/AuthContext.tsx',
  'hooks/useDashboardData.ts',
];

supportingFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n✨ Principal navigation test complete!');
