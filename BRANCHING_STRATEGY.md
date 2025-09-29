# 🌳 Git Branching Strategy for EduDashPro

## Current Branch Structure

```
main (stable production-ready code)
 ├── mobile (mobile-specific development)
 └── web (web-specific development)
```

## Branch Purposes

### `main` Branch
- **Purpose**: Production-ready code that works across all platforms
- **Merge from**: `mobile` and `web` branches after thorough testing
- **Protection**: Should always be stable and deployable
- **Deploy from**: Production builds and releases

### `mobile` Branch
- **Purpose**: React Native mobile development (iOS & Android)
- **Focus**:
  - Native features (Porcupine, Biometrics, Push Notifications)
  - Mobile UI/UX optimizations
  - Device-specific functionality
  - EAS builds and updates
- **Current HEAD**: `c3ee4b7` - Porcupine wake word detection fix

### `web` Branch
- **Purpose**: Web platform development
- **Focus**:
  - Web-specific features
  - Progressive Web App (PWA) functionality
  - Web performance optimizations
  - Browser compatibility
- **Current HEAD**: `4e2327a` - Firebase credentials cleanup

---

## Workflow

### 1. Working on Mobile Features

```bash
# Switch to mobile branch
git checkout mobile

# Make your changes
# ... edit files ...

# Commit changes
git add -A
git commit -m "feat(mobile): your feature description"

# Push to remote (if using remote repo)
git push origin mobile
```

### 2. Working on Web Features

```bash
# Switch to web branch
git checkout web

# Make your changes
# ... edit files ...

# Commit changes
git add -A
git commit -m "feat(web): your feature description"

# Push to remote
git push origin web
```

### 3. Merging Mobile Changes to Main

```bash
# Switch to main
git checkout main

# Merge mobile branch
git merge mobile --no-ff -m "merge: integrate mobile features from mobile branch"

# Test thoroughly
npm run typecheck
npm run lint

# If issues, fix them on main
# Otherwise, push to remote
git push origin main
```

### 4. Merging Web Changes to Main

```bash
# Switch to main
git checkout main

# Merge web branch
git merge web --no-ff -m "merge: integrate web features from web branch"

# Test thoroughly
npm run typecheck
npm run lint
npm run web  # Test web build

# Push to remote
git push origin main
```

### 5. Syncing Branches (Keep mobile and web updated from main)

```bash
# When main has important shared fixes/features

# Update mobile with main changes
git checkout mobile
git merge main -m "sync: update mobile with main changes"

# Update web with main changes
git checkout web
git merge main -m "sync: update web with main changes"
```

---

## Commit Message Convention

Use semantic commit prefixes:

- `feat(mobile):` - New mobile feature
- `feat(web):` - New web feature
- `feat:` - Cross-platform feature
- `fix(mobile):` - Mobile bug fix
- `fix(web):` - Web bug fix
- `fix:` - Cross-platform bug fix
- `chore:` - Maintenance tasks
- `docs:` - Documentation updates
- `refactor:` - Code refactoring
- `test:` - Testing additions/changes
- `perf:` - Performance improvements

---

## Conflict Resolution

When merging, conflicts may occur. Handle them carefully:

```bash
# If conflicts during merge
git status  # See conflicting files

# Edit files to resolve conflicts
# Remove conflict markers: <<<<<<<, =======, >>>>>>>

# After resolving
git add <resolved-files>
git commit -m "merge: resolve conflicts between mobile and main"
```

---

## Quick Reference Commands

```bash
# See current branch
git branch

# See all branches with commits
git branch -v

# See branch history graph
git log --oneline --graph --all --decorate -20

# Check what's changed
git status

# See diff between branches
git diff mobile..web            # Compare mobile and web
git diff main..mobile           # See what's new in mobile vs main

# Switch branch
git checkout mobile             # Switch to mobile
git checkout web                # Switch to web
git checkout main               # Switch to main

# Stash changes if needed
git stash                       # Save uncommitted changes
git stash pop                   # Restore stashed changes
```

---

## Platform-Specific Files

### Mobile-Only Files (keep in mobile branch)
- Native module configurations
- `android/` and `ios/` platform directories
- Mobile-specific screens/components
- `eas.json` build profiles
- Wake word models (`assets/wake-words/`)

### Web-Only Files (keep in web branch)
- Web-specific build configurations
- PWA manifests and service workers
- Web-optimized components
- Browser-specific polyfills

### Shared Files (merge to main from both)
- Core business logic (`lib/`)
- Shared components (`components/`)
- Types and interfaces (`types/`)
- Supabase schemas and migrations
- `package.json` (merge carefully!)
- Documentation (`docs/`)

---

## Current Status

✅ **Committed**: Wake word detection fix on `mobile` branch  
📍 **Current Branch**: `mobile`  
🎯 **Next Step**: Continue mobile development or switch to `web` for web features

---

## Tips

1. **Always commit before switching branches** to avoid losing work
2. **Use descriptive commit messages** with the proper prefix
3. **Test before merging to main** - main should always be stable
4. **Merge frequently** to avoid large conflicts
5. **Use `git stash`** if you need to switch branches with uncommitted changes
6. **Review diffs before merging** with `git diff branch1..branch2`

---

**Last Updated**: After commit `c3ee4b7` - Porcupine wake word detection fix