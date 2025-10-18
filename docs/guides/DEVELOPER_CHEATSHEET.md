# Developer Cheatsheet - TypeScript, Common Errors & Quick Fixes

**Last Updated:** 2025-10-18

This cheatsheet provides quick references for TypeScript configuration, common build errors, and how to fix them. Bookmark this page for rapid troubleshooting during development.

---

## Table of Contents

1. [TypeScript Basics](#typescript-basics)
2. [Common Build Errors](#common-build-errors)
3. [Configuration Files](#configuration-files)
4. [Cache & Reset Procedures](#cache--reset-procedures)
5. [Debugging Tips](#debugging-tips)

---

## TypeScript Basics

### What is TypeScript?

TypeScript is a **typed superset of JavaScript** that compiles to plain JavaScript. It adds optional static typing, classes, and interfaces to JavaScript, helping catch errors at compile-time rather than runtime.

**Key Benefits:**
- **Type Safety**: Catch errors before runtime
- **Better IDE Support**: Autocomplete, refactoring, navigation
- **Documentation**: Types serve as inline documentation
- **Refactoring**: Safer code changes with compiler checking

### Basic TypeScript Concepts

#### Types

```typescript
// Primitive types
let name: string = "John";
let age: number = 25;
let isActive: boolean = true;
let data: any = "can be anything"; // Avoid using 'any' when possible

// Arrays
let numbers: number[] = [1, 2, 3];
let names: Array<string> = ["Alice", "Bob"];

// Objects
let user: { name: string; age: number } = {
  name: "John",
  age: 25
};

// Functions
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Optional parameters
function buildName(firstName: string, lastName?: string): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}
```

#### Interfaces

Interfaces define the structure of an object:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'parent' | 'admin'; // Union type
  age?: number; // Optional property
}

// Usage
const user: User = {
  id: "123",
  name: "John Doe",
  email: "john@example.com",
  role: "teacher"
};
```

#### Type Aliases

Similar to interfaces, but more flexible:

```typescript
type UserRole = 'teacher' | 'parent' | 'admin' | 'student';

type ApiResponse<T> = {
  data: T;
  error: string | null;
  loading: boolean;
};

// Usage
const response: ApiResponse<User> = {
  data: user,
  error: null,
  loading: false
};
```

#### Generics

Write reusable, type-safe code:

```typescript
function identity<T>(arg: T): T {
  return arg;
}

// Usage
const output = identity<string>("hello");
const number = identity<number>(42);
```

#### React + TypeScript

```typescript
import React from 'react';

// Component props interface
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

// Functional component with TypeScript
const Button: React.FC<ButtonProps> = ({ title, onPress, disabled = false }) => {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
};

// With hooks
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);
```

---

## Common Build Errors

### 1. ❌ `TypeError: Cannot read property '__extends' of undefined` (Hermes)

**Symptoms:**
- App crashes on launch with Hermes engine error
- Error mentions `__extends` is undefined
- Routes show "missing default export" warnings

**Root Cause:**
This error occurs when TypeScript is configured with `"importHelpers": true` in `tsconfig.json`, which tells TypeScript to import helper functions (like `__extends` for class inheritance) from the `tslib` package. If `tslib` is not properly installed or configured, Hermes cannot find these helpers at runtime.

**The Fix:**

#### Option 1: Remove importHelpers (Recommended for Expo/React Native)

```bash
# 1. Edit tsconfig.json and remove the importHelpers line
# From:
{
  "compilerOptions": {
    "importHelpers": true,  // ❌ Remove this
    ...
  }
}

# To:
{
  "compilerOptions": {
    // importHelpers removed ✅
    ...
  }
}

# 2. Clear all caches
npm run start:clear
# Or manually:
rm -rf node_modules/.cache .expo/web/.cache .expo/web/cache
npx expo start --clear

# 3. Rebuild your app completely
# For iOS:
cd ios && pod install && cd ..
npx expo run:ios

# For Android:
npx expo run:android
```

#### Option 2: Ensure tslib is Installed (If you must use importHelpers)

```bash
# Install tslib
npm install tslib --save

# Clear metro cache
npx expo start --clear

# Rebuild app
```

**Why Remove importHelpers?**
- React Native/Expo apps work better with inlined helpers
- Reduces dependency issues with Hermes engine
- Slightly larger bundle size, but more reliable
- Industry standard for React Native projects

---

### 2. ❌ Module Resolution Errors

**Symptoms:**
```
Module not found: Can't resolve '@/components/...'
```

**Fix:**
```bash
# 1. Check babel.config.js has module-resolver plugin
# Should include:
plugins: [
  [
    'module-resolver',
    {
      alias: { '@': './' },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
  ],
]

# 2. Check tsconfig.json has path mapping
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}

# 3. Restart metro bundler
npx expo start --clear
```

---

### 3. ❌ Type Errors

**Symptoms:**
```
Type 'X' is not assignable to type 'Y'
```

**Debugging Steps:**

```typescript
// 1. Check the actual type
const value: any = someFunction();
console.log(typeof value, value); // Check runtime type

// 2. Use type assertions carefully
const value = someFunction() as ExpectedType;

// 3. Type guards for safety
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}

if (isUser(data)) {
  // TypeScript knows data is User here
  console.log(data.name);
}

// 4. Optional chaining for safety
const userName = user?.profile?.name ?? 'Unknown';
```

---

### 4. ❌ Metro Bundler Crashes

**Symptoms:**
- Metro crashes during build
- "JavaScript heap out of memory"
- Slow builds

**Fix:**

```bash
# 1. Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run start

# 2. Clear everything
rm -rf node_modules
rm -rf .expo
rm -rf android/build
rm -rf ios/build
rm package-lock.json

# 3. Reinstall
npm install

# 4. Start fresh
npx expo start --clear
```

---

### 5. ❌ Expo Router Navigation Errors

**Symptoms:**
```
Route not found
Missing default export
```

**Fix:**

```typescript
// ✅ Correct: Always use default export for routes
export default function ScreenName() {
  return <View>...</View>;
}

// ❌ Wrong: Named export won't work
export function ScreenName() {
  return <View>...</View>;
}

// ✅ You can combine both
function ScreenName() {
  return <View>...</View>;
}

export default ScreenName;
```

---

## Configuration Files

### tsconfig.json - Recommended Settings for Expo

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    // Type checking
    "strict": false,              // Enable for stricter type checking
    "skipLibCheck": true,         // Skip type checking of .d.ts files
    
    // Module resolution
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]              // Alias for clean imports
    },
    
    // JSX/React
    "jsx": "react-jsx",           // Modern JSX transform
    
    // Interop
    "esModuleInterop": true,      // Enable ES module interop
    "allowSyntheticDefaultImports": true,
    
    // DO NOT USE (causes issues with Hermes):
    // "importHelpers": true,     // ❌ REMOVE THIS
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "scripts/**/*"
  ]
}
```

### babel.config.js - Essential Plugins

```javascript
module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Path alias support
      [
        'module-resolver',
        {
          alias: { '@': './' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      // Required for reanimated (MUST be last)
      'react-native-reanimated/plugin',
    ],
  };
};
```

### metro.config.js - JSON Support for i18n

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Treat JSON files as source files (for i18n locales)
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'json');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'json'];

module.exports = config;
```

---

## Cache & Reset Procedures

### Quick Cache Clear (Try First)

```bash
# Clear Metro bundler cache
npx expo start --clear

# Or use the shortcut script
npm run start:clear
```

### Deep Clean (Nuclear Option)

```bash
#!/bin/bash
# Nuclear reset - use when all else fails

echo "🧹 Deep cleaning project..."

# 1. Remove all caches
rm -rf node_modules
rm -rf .expo
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*
rm -rf android/app/build
rm -rf android/.gradle
rm -rf ios/build
rm -rf ios/Pods

# 2. Remove lock files
rm package-lock.json
rm yarn.lock

# 3. Clear watchman (if installed)
watchman watch-del-all 2>/dev/null || true

# 4. Clear Metro bundler cache
npx expo start --clear & sleep 2 && pkill -f expo

# 5. Reinstall dependencies
npm install

# 6. iOS specific
if [ -d "ios" ]; then
  cd ios
  pod deintegrate 2>/dev/null || true
  pod install
  cd ..
fi

echo "✅ Deep clean complete! Now run: npm run start:clear"
```

Save this as `scripts/deep-clean.sh` and run:
```bash
chmod +x scripts/deep-clean.sh
./scripts/deep-clean.sh
```

---

## Debugging Tips

### Enable TypeScript Strict Mode Gradually

```json
{
  "compilerOptions": {
    // Start with these
    "noImplicitAny": true,
    "strictNullChecks": true,
    
    // Add later
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    
    // Final step
    "strict": true
  }
}
```

### Type Checking Without Running the App

```bash
# Check types only (no build)
npm run typecheck

# Watch mode
npx tsc --noEmit --watch
```

### Debug Metro Bundler

```bash
# Verbose logging
REACT_NATIVE_METRO_LOG_LEVEL=debug npx expo start

# See what's being bundled
npx expo start --verbose
```

### Check What TypeScript Sees

```typescript
// Add temporary type assertions to debug
const value: unknown = someComplexFunction();
type ValueType = typeof value;
// Hover over ValueType in VS Code to see the inferred type
```

### React Native Debugger

```bash
# Install
brew install --cask react-native-debugger

# Enable remote debugging in app
# Shake device → Debug Remote JS
# Open React Native Debugger
```

---

## Quick Reference: Common Commands

```bash
# Development
npm run start              # Start Expo dev server
npm run start:clear        # Start with cache clear
npm run android           # Run on Android
npm run ios               # Run on iOS
npm run web               # Run on web

# Type Checking & Linting
npm run typecheck          # Check TypeScript types
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues

# Testing
npm run test              # Run tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage

# Building
npm run build:android:apk  # Build Android APK (local)
npm run build:android:aab  # Build Android AAB (EAS)
npm run build:ios         # Build iOS (EAS)

# Troubleshooting
npx expo doctor           # Check for issues
npx expo-env-info         # Show environment info
npm run start:clear       # Clear cache and start
```

---

## When to Ask for Help

If you've tried the following and still have issues:

1. ✅ Cleared all caches (`npx expo start --clear`)
2. ✅ Removed and reinstalled `node_modules`
3. ✅ Checked TypeScript configuration
4. ✅ Verified imports and paths
5. ✅ Rebuilt the app from scratch

Then it's time to:
- Check GitHub issues for similar problems
- Ask in Expo Discord/Forums
- Create a minimal reproduction case
- Check if it's a platform-specific issue (iOS vs Android vs Web)

---

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Expo TypeScript Guide](https://docs.expo.dev/guides/typescript/)
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)

---

## Change Log

- **2025-10-18**: Initial version
  - Added TypeScript basics and common patterns
  - Documented `__extends` error and fix
  - Added cache clearing procedures
  - Added debugging tips and quick reference

---

**Pro Tip:** Bookmark this page and keep it open in a browser tab during development. Most build errors can be resolved by following the procedures here.
