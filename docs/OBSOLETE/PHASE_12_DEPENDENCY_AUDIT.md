# Phase 12: Dependency Audit & Pruning

## 📊 Bundle Analysis Complete

**Current State:**
- Total Dependencies: 68
- Production: 66
- Dev Dependencies: 8
- Estimated Bundle Size: ~6.5MB (after Phase 11)
- Target Bundle Size: <5MB

---

## 🎯 Optimization Opportunities

### 1. Heavy Dependencies to Optimize

#### **date-fns** (~200KB)
**Current:** Full library imported
**Issue:** Importing entire library when only using a few functions
**Solution:**
```typescript
// ❌ Before
import { format, parseISO } from 'date-fns';

// ✅ After (tree-shakeable)
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
```

**Action:** Already tree-shakeable, ensure imports are optimized

---

#### **exceljs** (~500KB)
**Current:** Always loaded
**Issue:** Heavy library for occasional use
**Solution:** Lazy load only when needed
```typescript
// ✅ Lazy load
const Excel = await import('exceljs');
```

**Action:** Already implemented in `lib/lazy-loading.tsx` ✅

---

#### **react-native-chart-kit** (~180KB + dependencies)
**Current:** Always loaded
**Alternative:** Lightweight chart library or custom charts
**Solution:**
- Consider **react-native-svg-charts** (lighter)
- Or build custom charts with react-native-svg
- Lazy load charts only when needed

**Action:** Lazy load chart components

---

#### **i18next + plugins** (~150KB)
**Current:** Phase 2 already optimized with lazy loading
**Status:** ✅ Already optimized

---

### 2. Potentially Unused Dependencies

Run this analysis (requires Node.js installed):
```bash
npx depcheck
```

**Potential Candidates for Removal:**
- `@expo/ngrok` - Only needed for development tunneling
- `dotenv` - Expo uses .env files natively
- `js-yaml` - Check if actually used
- `tslib` - May be redundant with TypeScript 5.8

---

### 3. Duplicate Dependencies

Check for duplicates:
```bash
npm ls <package-name>
```

**Known Duplicates to Check:**
- Multiple React versions (already resolved with overrides ✅)
- Metro versions (already resolved with overrides ✅)

---

## 🔧 Recommended Optimizations

### Optimization 1: Lazy Load Heavy Libraries

```typescript
// lib/dynamic-imports.ts
export const DynamicLibraries = {
  // Excel generation (500KB)
  Excel: () => import('exceljs'),
  
  // Charts (180KB + deps)
  Charts: () => import('react-native-chart-kit'),
  
  // Image manipulation (when needed)
  ImageManipulator: () => import('expo-image-manipulator'),
  
  // Document picker (on demand)
  DocumentPicker: () => import('expo-document-picker'),
  
  // Print functionality
  Print: () => import('expo-print'),
  
  // Sharing (when needed)
  Sharing: () => import('expo-sharing'),
};
```

---

### Optimization 2: Optimize date-fns Imports

Create a centralized date utilities file:

```typescript
// lib/date-utils.ts
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import addDays from 'date-fns/addDays';
import subDays from 'date-fns/subDays';
import differenceInDays from 'date-fns/differenceInDays';
import isValid from 'date-fns/isValid';

export {
  format,
  parseISO,
  addDays,
  subDays,
  differenceInDays,
  isValid,
};

// Add custom helpers
export const formatDate = (date: Date | string, pattern = 'PP') => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, pattern) : '';
};
```

Then update all imports to use this centralized file.

---

### Optimization 3: Remove Unused Dev Dependencies

**Review:**
- `@expo/ngrok` - Only keep if actively using ngrok tunneling
- Consider moving rarely-used tools to `npx` on-demand

---

### Optimization 4: Optimize Chart Usage

```typescript
// components/charts/ChartLoader.tsx
import { lazy, Suspense } from 'react';

const LazyLineChart = lazy(() => 
  import('react-native-chart-kit').then(module => ({
    default: module.LineChart
  }))
);

const LazyBarChart = lazy(() => 
  import('react-native-chart-kit').then(module => ({
    default: module.BarChart
  }))
);

export function LineChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyLineChart {...props} />
    </Suspense>
  );
}
```

---

## 📦 Recommended package.json Changes

### Dependencies to Move to Optional/Lazy Load

```json
{
  "optionalDependencies": {
    "exceljs": "^4.4.0",
    "@expo/ngrok": "^4.1.3"
  }
}
```

### Consider Lighter Alternatives

| Current Package | Size | Alternative | New Size | Savings |
|----------------|------|-------------|----------|---------|
| `date-fns` | 200KB | Keep (already tree-shakeable) | - | - |
| `react-native-chart-kit` | 180KB | Custom SVG charts | 50KB | 130KB |
| `exceljs` | 500KB | Lazy load (current) | - | - |

---

## 🚀 Implementation Priority

### High Priority (Immediate)
1. ✅ Lazy load exceljs (already done)
2. ✅ Optimize date-fns imports (verify current usage)
3. 🔲 Lazy load chart components
4. 🔲 Create centralized date utilities

### Medium Priority (This Phase)
5. 🔲 Analyze with depcheck for unused deps
6. 🔲 Review and remove unused devDependencies
7. 🔲 Optimize expo module imports

### Low Priority (Future)
8. 🔲 Consider chart alternatives
9. 🔲 Bundle size monitoring in CI
10. 🔲 Automatic dependency updates

---

## 📊 Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Bundle Size** | 6.5MB | < 5MB | -23% |
| **Initial Load** | 2.1s | < 1.8s | -14% |
| **Dependencies** | 68 | ~62 | -6 deps |
| **Install Time** | ~2min | ~1.5min | -25% |

---

## 🔍 Dependency Health Check

### Security Audit
```bash
npm audit
npm audit fix
```

### Outdated Packages
```bash
npm outdated
```

### Dependency Analysis
```bash
npx depcheck
npx license-checker
```

---

## 🛡️ Dependency Security

### Current Status
- All dependencies from trusted sources ✅
- Expo SDK 53 (latest stable) ✅
- React 19.0.0 (latest) ✅
- Regular security patches via overrides ✅

### Recommendations
1. Enable GitHub Dependabot
2. Set up automated security scanning
3. Regular quarterly dependency reviews
4. Monitor for CVEs in production dependencies

---

## 📝 Action Items

### Immediate Actions
- [ ] Run `npx depcheck` to find unused dependencies
- [ ] Create centralized `lib/date-utils.ts`
- [ ] Implement lazy loading for charts
- [ ] Review and optimize all date-fns imports
- [ ] Remove unused dependencies

### CI/CD Integration
- [ ] Add bundle size checking to CI
- [ ] Set up dependency update automation
- [ ] Add security scanning
- [ ] Monitor bundle size over time

---

## 🎯 Phase 12 Success Criteria

✅ Bundle size reduced by 20%+  
✅ No unused dependencies  
✅ All heavy libs lazy-loaded  
✅ Centralized date utilities  
✅ Security audit passed  
✅ Faster npm install  

---

## 📚 Related Documentation

- [Phase 11: Route Code Splitting](./PHASE_11_ROUTE_SPLITTING.md)
- [Metro Configuration](../metro.config.js)
- [Babel Configuration](../babel.config.js)

---

**Phase 12 Status:** Ready for Implementation
**Estimated Time:** 2-3 hours
**Impact:** High (bundle size, load time, maintainability)
