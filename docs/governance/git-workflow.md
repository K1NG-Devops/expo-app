# Git Workflow & Release Management

## 🏗️ **Branch Strategy Overview**

```
feature/branch-name → development → preview → main (production)
```

### 📋 **Branch Descriptions**

| Branch | Purpose | EAS Channel | Auto-Deploy | Environment |
|--------|---------|-------------|-------------|-------------|
| `feature/*` | Development work | `development` | No | Development builds only |
| `development` | Integration testing | `development` | Yes | Internal testing |
| `preview` | Pre-production staging | `preview` | Yes | Stakeholder review |
| `main` | Production releases | `production` | Yes | Live users |

---

## 🔄 **Complete Workflow Process**

### **Phase 1: Feature Development** 
*Current: `feature/push-notifications-ota-updates`*

```bash
# Work exclusively on feature branch
git checkout feature/your-feature-name
git add .
git commit -m "feat: your changes"
git push origin feature/your-feature-name

# Continue until feature is complete and tested
```

**✅ Testing Requirements:**
- [ ] Local development testing complete
- [ ] All unit tests passing
- [ ] TypeScript compilation clean
- [ ] Linting passes with only warnings (acceptable)
- [ ] WARP.md compliance verified

### **Phase 2: Integration (Development Branch)**
*Target: `development`*

```bash
# When feature is ready for integration
git checkout development
git pull origin development
git merge feature/your-feature-name
git push origin development

# EAS will automatically build and deploy to development channel
```

**✅ Integration Checklist:**
- [ ] Feature branch fully tested
- [ ] No merge conflicts
- [ ] Development build deploys successfully
- [ ] Integration tests pass
- [ ] Team review completed

### **Phase 3: Staging (Preview Branch)**
*Target: `preview`*

```bash
# When development testing is complete
git checkout preview
git pull origin preview
git merge development
git push origin preview

# EAS will automatically build and deploy to preview channel
```

**✅ Preview Testing:**
- [ ] Development branch stable
- [ ] All features working in preview build
- [ ] Stakeholder approval received
- [ ] Performance testing completed
- [ ] Security audit passed (if required)

### **Phase 4: Production (Main Branch)**
*Target: `main` → Production*

```bash
# When preview is approved for production
git checkout main
git pull origin main
git merge preview
git tag v1.x.x  # Semantic versioning
git push origin main --follow-tags

# EAS will automatically build and deploy to production channel
```

**✅ Production Checklist:**
- [ ] Preview thoroughly tested
- [ ] All stakeholders approved
- [ ] Rollback plan documented
- [ ] Production environment variables configured
- [ ] Store listing updates ready (if needed)

---

## 🎯 **Current Status & Next Steps**

### **Current Position:**
- ✅ **Feature Branch:** `feature/push-notifications-ota-updates` (active)
- ✅ **EAS Preview Build:** In progress
- ✅ **Code State:** Clean, committed, pushed

### **Next Actions:**

1. **Complete Feature Testing** *(Current)*
   ```bash
   # Test preview build when ready
   # Verify push notifications work on physical device
   # Complete any remaining UI polishes
   ```

2. **Merge to Development** *(Next)*
   ```bash
   git checkout development
   git pull origin development
   git merge feature/push-notifications-ota-updates
   git push origin development
   ```

3. **Development Testing** *(After merge)*
   - EAS development build automatically triggered
   - Internal team testing
   - Integration verification

4. **Promote to Preview** *(When dev stable)*
   ```bash
   git checkout preview
   git pull origin preview
   git merge development
   git push origin preview
   ```

5. **Production Release** *(Final step)*
   ```bash
   git checkout main
   git pull origin main
   git merge preview
   git tag v1.2.0  # Example version
   git push origin main --follow-tags
   ```

---

## 🛡️ **Protection & Quality Gates**

### **Branch Protection Rules** (Recommended)
- `main`: Require PR reviews, status checks
- `preview`: Require PR reviews
- `development`: Direct push allowed for integration

### **Automated Checks**
- ✅ TypeScript compilation
- ✅ ESLint (warnings allowed)
- ✅ WARP.md compliance
- ✅ Build success on EAS

### **Manual Gates**
- Feature testing complete
- Integration testing passed
- Stakeholder approval (preview → production)
- Performance benchmarks met

---

## 📱 **EAS Channel Mapping**

| Git Branch | EAS Channel | Build Profile | Purpose |
|------------|-------------|---------------|---------|
| `feature/*` | `development` | `development` | Dev builds |
| `development` | `development` | `development` | Integration |
| `preview` | `preview` | `preview` | Staging |
| `main` | `production` | `production` | Live |

### **Build Commands:**
```bash
# Development builds (from any feature branch)
eas build -p android --profile development

# Preview builds (from preview branch)
eas build -p android --profile preview  

# Production builds (from main branch)
eas build -p android --profile production
```

### **Update Commands:**
```bash
# Publish to development
eas update --branch development

# Publish to preview  
eas update --branch preview

# Publish to production
eas update --branch production
```

---

## 🚀 **Hotfix Workflow**

For urgent production fixes:

```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/critical-fix
# Make minimal changes
git commit -m "hotfix: critical issue"
git push origin hotfix/critical-fix

# Merge directly to main (with approval)
git checkout main
git merge hotfix/critical-fix
git tag v1.x.x-hotfix
git push origin main --follow-tags

# Backport to other branches
git checkout preview
git merge hotfix/critical-fix
git push origin preview

git checkout development  
git merge hotfix/critical-fix
git push origin development
```

---

## 📊 **Monitoring & Rollback**

### **Deployment Monitoring**
- EAS Build status dashboard
- App store review status
- Crash reporting (Sentry)
- Performance metrics
- User feedback

### **Rollback Procedures**
```bash
# EAS OTA Rollback (immediate)
eas update --branch production --message "Rollback to previous version"

# Full app rollback (store submission)
# Revert main branch to previous stable commit
git revert <commit-hash>
git push origin main
# Submit new build to stores
```

---

## ✅ **Best Practices**

### **Commit Messages**
```bash
feat: add push notification support
fix: resolve language constraint violation  
docs: update deployment workflow
chore: update dependencies
```

### **Branch Naming**
```bash
feature/push-notifications-ota-updates
feature/ui-dashboard-improvements
hotfix/critical-payment-bug
release/v1.2.0
```

### **Testing Strategy**
- **Local:** Development server testing
- **Development:** Internal team integration
- **Preview:** Stakeholder and QA testing
- **Production:** Gradual rollout with monitoring

---

**This workflow ensures:**
- ✅ No direct production deployments
- ✅ Staged testing at each level  
- ✅ Rollback capabilities at every stage
- ✅ WARP.md compliance throughout
- ✅ Quality gates before promotion

**Current Focus:** Complete `feature/push-notifications-ota-updates` → Merge to `development`