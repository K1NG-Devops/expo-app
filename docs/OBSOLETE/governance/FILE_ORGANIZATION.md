# File Organization Guide

This document explains the organized file structure for EduDashPro, implemented to keep the root directory clean and improve development efficiency.

## 📁 Directory Structure Overview

### 🔥 Core Application (Root Level)
- **Purpose**: Essential application files only
- **Deployment**: These files are included in production builds
- **Files**: App.js, index.js, package.json, configuration files

### 🧪 Development & Testing
- **`tests/`** - All test files organized by type
  - `unit/` - Unit tests (26 files)
  - `integration/` - Integration tests  
  - `sql/` - SQL-specific tests
- **`debug/`** - Debugging and diagnostic scripts (21 files)
  - Scripts for checking database state, diagnosing issues
  - Development-only utilities
- **`scripts/`** - Build, deployment, and utility scripts (33 files)
  - Shell scripts for automation
  - Build and deployment tools
- **`sql/`** - Database-related files (15 files)
  - `migrations/` - Database schema migrations
  - `fixes/` - Database fixes and patches
  - `schema/` - Schema documentation and verification
  - `functions/` - Database function definitions
- **`tools/`** - Development tools and utilities (10 files)
  - User management tools
  - Data seeding scripts
  - Maintenance utilities

### 🗄️ Archive & Temporary
- **`archive/`** - Old files and backups (25 files)
  - Migration backups
  - Old keystores and certificates
  - Deprecated files
- **`temp/`** - Temporary development artifacts (23 files)
  - Log files
  - Database inspection reports
  - Development environment files
- **`artifacts/`** - Build artifacts and configuration manifests (9 files)
  - Policy manifests
  - Build configuration files
  - Generated documentation

## 🎯 Benefits

### Clean Deployments
- **Reduced Bundle Size**: Only essential files in root
- **Faster CI/CD**: Fewer files to process during builds
- **Clear Dependencies**: Easy to see what's needed for production

### Improved Development
- **Easy Navigation**: Find files by category quickly
- **Better Organization**: Related files grouped together
- **Reduced Conflicts**: Clear ownership of file categories

### Team Efficiency
- **Onboarding**: New developers can understand structure quickly
- **Maintenance**: Easy to clean up old/unused files
- **Debugging**: Debug files separated from production code

## 📋 File Placement Rules

### ✅ Root Directory - ALLOWED
```bash
# Core application files
App.js, index.js, app.json, package.json

# Configuration files
.env, app.config.js, babel.config.js, metro.config.js, tsconfig.json

# Documentation
README.md

# Git/CI configuration
.gitignore, .github/

# Essential directories
app/, components/, lib/, docs/, assets/, supabase/, node_modules/
```

### ❌ Root Directory - NOT ALLOWED
```bash
# Test files → tests/
test-*.js, *-test.js, *.test.js, test_*.sql

# Debug files → debug/
debug-*.js, diagnose-*.js, check-*.js, audit-*.js

# Scripts → scripts/ or tools/
*.sh, utility scripts, build tools

# SQL files → sql/
*.sql files (except in supabase/migrations/)

# Temporary files → temp/ (gitignored)
*.log, *.pid, *.tmp, database-*.json

# Archive files → archive/
*.bak.jks, migration_backup_*, old files
```

## 🔧 Maintenance Commands

### Check Root Directory Cleanliness
```bash
# Check for misplaced files in root
ls -la | grep -E '\.(js|sql|sh|log|json)$' | grep -v -E '(App|index|app\.config|babel\.config|metro\.config|package|tsconfig)\.'

# Should return empty if clean ✅
```

### Move Misplaced Files
```bash
# Move debug files
mv debug-*.js debug/
mv diagnose-*.js debug/
mv check-*.js debug/

# Move test files  
mv test-*.js tests/unit/
mv *test*.sql tests/sql/

# Move scripts
mv *.sh scripts/

# Move SQL files
mv *.sql sql/fixes/
```

### Generate Organization Report
```bash
echo "=== FILE ORGANIZATION REPORT ==="
echo "Tests: $(find tests/ -name "*.js" -o -name "*.sql" 2>/dev/null | wc -l) files"
echo "Debug: $(find debug/ -name "*.js" 2>/dev/null | wc -l) files"
echo "Scripts: $(find scripts/ -name "*.sh" -o -name "*.js" 2>/dev/null | wc -l) files"
echo "SQL: $(find sql/ -name "*.sql" 2>/dev/null | wc -l) files"
echo "Tools: $(find tools/ -name "*.js" 2>/dev/null | wc -l) files"
```

## 📝 Current State (Post-Organization)

### Files Organized: **162 files**
- **Tests**: 26 files (unit, integration, SQL tests)
- **Debug**: 21 files (diagnostic and checking scripts)
- **Scripts**: 33 files (shell scripts and build tools)
- **SQL**: 15 files (migrations, fixes, schema)
- **Tools**: 10 files (utilities and maintenance)
- **Archive**: 25 files (backups and deprecated files)
- **Temp**: 23 files (logs and temporary artifacts)
- **Artifacts**: 9 files (build artifacts and manifests)

### Root Directory Status: ✅ **CLEAN**
No test files, debug scripts, or temporary artifacts remain in the root directory.

## 🔐 Governance

This file organization is enforced through:
- **WARP.md Non-negotiables**: Root directory cleanliness rules
- **Pre-commit hooks**: Automatic file placement checking
- **CI/CD pipeline**: Build-time verification
- **Code reviews**: Manual verification during PR reviews
- **.gitignore**: Automatic exclusion of temp/debug/archive directories

## 🚀 Next Steps

1. **Pre-commit Hook**: Add automated checking for misplaced files
2. **CI Integration**: Add root directory cleanliness check to CI pipeline  
3. **Team Training**: Ensure all developers understand file placement rules
4. **Regular Cleanup**: Monthly review and cleanup of temp/archive directories

---

**Last Updated**: 2025-01-15  
**Files Organized**: 162  
**Root Status**: ✅ Clean  
**Next Review**: 2025-02-15