# Fixing `__extends` Error in React Native with Hermes

## Problem Overview

### Symptoms
```
ERROR TypeError: Cannot read property '__extends' of undefined, js engine: hermes
WARN Route "./file.tsx" is missing the required default export.
```

### Root Cause
The `__extends` error occurs when TypeScript class inheritance helpers are not properly injected by Babel during transpilation. This is common with the Hermes JavaScript engine used in React Native.

The "missing default export" warnings are **symptoms**, not the root cause - the files actually have default exports, but they fail to load due to the `__extends` error.

---

## Solution Steps

### 1. Update `tsconfig.json`

**CRITICAL**: Remove `importHelpers` option! This is what causes the `__extends` error with Hermes.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "downlevelIteration": true,
    "noEmit": true,
    // DO NOT ADD importHelpers: true - this causes __extends errors!
  }
}
```

**Key settings:**
- `target`: ES2020 is compatible with Hermes
- `downlevelIteration`: Properly handles for-of loops and array spreads
- **NO `importHelpers`**: This tells TypeScript to inline helpers instead of importing them

### 2. Keep Babel Config Simple

```javascript
module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
    ],
    plugins: [
      [
        'module-resolver',
        {
          alias: { '@': './' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
```

**DO NOT use `@babel/plugin-transform-runtime`** with Hermes - it causes conflicts!

### 4. Clear Cache and Restart

```bash
# Clear Metro bundler cache and restart
rm -rf node_modules/.cache .expo
npx expo start --clear
```

---

## Why This Happens

1. **TypeScript generates helper functions** like `__extends` for class inheritance
2. **With `importHelpers: true`**, TypeScript tries to import `__extends` from the `tslib` package
3. **Hermes doesn't resolve these imports correctly**, causing "undefined" errors
4. **Solution**: Remove `importHelpers` so TypeScript **inlines** the helper code directly into your files

---

## Prevention

### Always use these settings for React Native + TypeScript + Hermes:

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "downlevelIteration": true,
    "noEmit": true
    // DO NOT use importHelpers: true
  }
}
```

**babel.config.js:**
```javascript
{
  presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
  // Do NOT use @babel/plugin-transform-runtime with Hermes
}
```

---

## Other Common Hermes Errors

### `__assign` is undefined
**Solution:** Same as `__extends` - add `@babel/plugin-transform-runtime`

### `__awaiter` is undefined
**Solution:** Ensure `regenerator: true` in the transform-runtime plugin

### `__spreadArray` is undefined
**Solution:** Add `downlevelIteration: true` to tsconfig.json

---

## Testing the Fix

After applying changes:

1. **Clear all caches:**
   ```bash
   npx expo start --clear
   ```

2. **Check console output** - should see no `__extends` errors

3. **Verify routes load** - all default exports should be recognized

4. **Test on device/simulator** - ensure app runs without crashes

---

## Additional Resources

- [Babel Transform Runtime Docs](https://babeljs.io/docs/en/babel-plugin-transform-runtime)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [Hermes JavaScript Engine](https://hermesengine.dev/)
- [Expo Babel Preset](https://docs.expo.dev/guides/customizing-metro/#customizing-the-babel-transformer)

---

## Summary

✅ **Root Cause:** Missing TypeScript helper functions in Hermes engine  
✅ **Solution:** Configure Babel to inject helpers via `@babel/plugin-transform-runtime`  
✅ **Prevention:** Always use proper TypeScript and Babel config for React Native  
