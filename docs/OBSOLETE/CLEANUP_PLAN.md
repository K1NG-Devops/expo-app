# Code Cleanup Plan

**Date**: 2025-10-18  
**Objective**: Remove unused code, fix imports, clean debug code, replace console statements

---

## Files to Clean (Priority Order)

### High Priority (Modified Today)
1. ✅ `services/DashAIAssistant.ts` - Replace 104+ console statements
2. ✅ `services/DashRealTimeAwareness.ts` - Replace console statements  
3. ✅ `services/modules/DashToolRegistry.ts` - Replace console statements
4. ✅ `supabase/functions/ai-gateway/index.ts` - Already using console (Deno environment - OK)

### Medium Priority (Core Services)
5. `services/DashAgenticEngine.ts`
6. `services/DashContextAnalyzer.ts`
7. `services/AgentOrchestrator.ts`

### Actions

1. **Replace console statements with logger**
   - `console.log()` → `logger.info()` or `logger.debug()`
   - `console.warn()` → `logger.warn()`
   - `console.error()` → `logger.error()`
   - `console.debug()` → `logger.debug()`

2. **Remove unused imports**
   - Check each file for unused imports
   - Remove or comment out

3. **Remove debug code**
   - Remove temporary debug comments
   - Remove commented-out code blocks
   - Keep important documentation comments

4. **Verify all imports work**
   - Check dynamic imports
   - Verify paths are correct

---

## Notes

- **ai-gateway**: Uses console.log (Deno environment) - THIS IS OK, don't change
- **logger**: Production-safe, strips logs in builds
- **Critical files only**: Focus on modified files and core services
