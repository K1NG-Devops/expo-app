# EAS Deployment Strategy

## Current Problem
- Multiple EAS updates per day (14+ in recent history)
- Updates pushed for minor changes
- No proper staging/review process
- Production users receive too many updates

## New Deployment Process

### 1. Development Testing
```bash
# Local development - no EAS updates
npx expo start --dev-client --host localhost

# Local testing with preview
npx expo start --dev-client --host localhost --clear
```

### 2. Preview/Staging Updates (Internal Only)
```bash
# For internal testing only - limited frequency
eas update --branch preview --message "Internal: [specific change description]"

# Only push preview updates for:
# - Major feature additions
# - Critical bug fixes
# - Pre-production testing
```

### 3. Production Updates (User-Facing)
```bash
# Only for significant releases
eas update --branch production --message "Release v1.0.X: [user-facing changes]"

# Only push production updates for:
# - Version releases (1.0.1, 1.0.2, etc.)
# - Critical security fixes
# - Major bug fixes affecting users
# - Significant feature releases
```

### 4. Version Management
- Update version numbers only for actual releases
- Keep versions aligned between app.json and app.config.js
- Use semantic versioning (1.0.0 → 1.0.1 → 1.1.0)

## Update Frequency Guidelines

### ❌ DO NOT Push Updates For:
- Code cleanup/refactoring
- ESLint/TypeScript fixes
- Development debugging
- Minor UI tweaks
- Internal testing

### ✅ DO Push Updates For:
- New user-facing features
- Critical bug fixes
- Security patches
- Performance improvements
- Version releases

## Recommended Schedule

### Development
- Test locally with dev client
- Push to preview branch max 1-2 times per day for internal testing

### Production
- Weekly releases maximum
- Emergency fixes only when critical
- Batched updates for multiple small fixes

## Implementation Commands

### Current Status Check
```bash
# Check current update history
eas update:list --branch preview
eas update:list --branch production

# Check build status
eas build:list
```

### Emergency Rollback
```bash
# If issues arise, rollback to previous update
eas update --branch production --message "Rollback to stable version"
```

## Success Metrics
- Reduce production updates to max 2-3 per week
- Reduce preview updates to max 5-7 per week
- Zero emergency rollbacks
- Higher user retention (fewer update fatigue)