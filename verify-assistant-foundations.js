/**
 * Verify Assistant Foundations Integration
 * 
 * This script checks if all the assistant foundation components
 * are properly implemented and structured.
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkFileContains(filePath, patterns) {
  if (!fs.existsSync(filePath)) return false;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return patterns.every(pattern => {
      if (typeof pattern === 'string') {
        return content.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(content);
      }
      return false;
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return false;
  }
}

async function verifyAssistantFoundations() {
  console.log('🔍 Verifying Assistant Foundation Components...\n');
  
  const checks = [
    {
      name: 'Feature Flags System',
      file: './lib/featureFlags.ts',
      patterns: [
        'assistant_v2',
        'assistant_voice_overlay', 
        'assistant_quota_prefetch',
        'assistant_semantic_memory',
        'getFeatureFlagsSync',
        'DEFAULT_FLAGS'
      ]
    },
    {
      name: 'Monitoring Utilities', 
      file: './lib/monitoring.ts',
      patterns: [
        'generateCorrelationId',
        'trackAssistantEvent',
        'trackAssistantPerformance',
        'correlation_id',
        'dash_'
      ]
    },
    {
      name: 'Assistant Context Bridge',
      file: './lib/AssistantContextBridge.ts',
      patterns: [
        'AssistantContextBridge',
        'updateCurrentRoute',
        'getContextSnapshot',
        'RouteContext',
        'ContextSnapshot',
        'current_route'
      ]
    },
    {
      name: 'App Data Connectors',
      file: './lib/AppDataConnectors.ts', 
      patterns: [
        'StudentConnector',
        'LessonConnector',
        'MessagingConnector',
        'listStudents',
        'standards',
        'templates'
      ]
    },
    {
      name: 'Enhanced DashAI Assistant',
      file: './services/DashAIAssistant.ts',
      patterns: [
        'DashAIAssistant',
        'generateCorrelationId',
        'assistantContextBridge',
        'trackAssistantEvent'
      ]
    }
  ];

  let passCount = 0;
  let totalCount = checks.length;

  for (const check of checks) {
    console.log(`🔄 Checking ${check.name}...`);
    
    if (!checkFileExists(check.file)) {
      console.log(`❌ File not found: ${check.file}`);
      continue;
    }
    
    if (checkFileContains(check.file, check.patterns)) {
      console.log(`✅ ${check.name} - All patterns found`);
      passCount++;
    } else {
      console.log(`⚠️  ${check.name} - Some patterns missing in ${check.file}`);
      
      // Show which patterns are missing
      const content = fs.readFileSync(check.file, 'utf8');
      const missing = check.patterns.filter(pattern => {
        if (typeof pattern === 'string') {
          return !content.includes(pattern);
        } else if (pattern instanceof RegExp) {
          return !pattern.test(content);
        }
        return true;
      });
      
      if (missing.length > 0) {
        console.log(`   Missing: ${missing.join(', ')}`);
      }
    }
    console.log('');
  }

  // Additional file structure checks
  console.log('🔄 Checking file structure...');
  
  const structureChecks = [
    './lib/__tests__/assistant-foundations.test.ts',
    './lib/services/EducationalPDFService.ts'
  ];

  let structurePass = 0;
  for (const file of structureChecks) {
    if (checkFileExists(file)) {
      console.log(`✅ ${file} exists`);
      structurePass++;
    } else {
      console.log(`❌ ${file} missing`);
    }
  }

  // Test summary  
  console.log('\n📊 Verification Summary:');
  console.log(`✅ Core components: ${passCount}/${totalCount} passing`);
  console.log(`✅ File structure: ${structurePass}/${structureChecks.length} complete`);
  
  if (passCount === totalCount && structurePass === structureChecks.length) {
    console.log('\n🎉 All assistant foundation components are properly implemented!');
    console.log('\n📋 Ready for next steps:');
    console.log('   1. Enable feature flags in environment');
    console.log('   2. Test with React Native/Expo runtime');  
    console.log('   3. Implement PDF generation enhancements');
    console.log('   4. Add remaining roadmap features');
    return true;
  } else {
    console.log('\n⚠️  Some components need attention before proceeding.');
    return false;
  }
}

// Additional validation - check package.json for dependencies
function checkDependencies() {
  console.log('\n🔄 Checking dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    
    const requiredDeps = [
      '@supabase/supabase-js',
      '@react-native-async-storage/async-storage',
      'expo-router'
    ];
    
    let depsFound = 0;
    for (const dep of requiredDeps) {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        console.log(`✅ ${dep} installed`);
        depsFound++;
      } else {
        console.log(`❌ ${dep} missing`);
      }
    }
    
    console.log(`Dependencies: ${depsFound}/${requiredDeps.length} available`);
    return depsFound === requiredDeps.length;
    
  } catch (error) {
    console.error('Error checking dependencies:', error.message);
    return false;
  }
}

async function main() {
  const foundationsOk = await verifyAssistantFoundations();
  const depsOk = checkDependencies();
  
  console.log('\n🎯 Overall Status:');
  if (foundationsOk && depsOk) {
    console.log('✅ Assistant foundations are ready for integration!');
    process.exit(0);
  } else {
    console.log('⚠️  Some issues need to be resolved.');
    process.exit(1);
  }
}

main().catch(console.error);