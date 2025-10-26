# Web Branch Execution Plan - Privacy Policies on Vercel

**Date**: 2025-10-26  
**Branch**: `web`  
**Vercel Project**: `prj_wGmUGovAXj814F7FGCeK3ZVHJjdU`  
**Deploy Target**: Privacy policies to Vercel

---

## ✅ Current Vercel Setup (Confirmed)

- **Project ID**: `prj_wGmUGovAXj814F7FGCeK3ZVHJjdU`
- **Org ID**: `team_giHKj8I9KO4Lt858w2ADYKb6`
- **Output Directory**: `public/`
- **Branch**: `web` (this branch)
- **Status**: ✅ Linked and ready to deploy

### Vercel Configuration:
```json
{
  "buildCommand": null,  // Static files only
  "outputDirectory": "public",  // Serves from public/
  "rewrites": [...],  // App links configured
  "headers": [...]  // CORS and caching configured
}
```

---

## 🎯 Corrected Strategy

You were right! Here's the proper flow:

### Phase 1: Complete RevenueCat (30 mins)
- ✅ Dashboard open
- Add 6 missing products
- **Do this NOW** while planning web deployment

### Phase 2: Create Privacy Policies in Web Branch (2-3 hours)
```bash
# Already on web branch ✅
# Create privacy policies in public/
mkdir -p public/legal
```

### Phase 3: Deploy to Vercel (5 mins)
```bash
# From web branch
vercel --prod

# Or if first time:
vercel login
vercel link  # Already linked ✅
vercel --prod
```

### Phase 4: Update Mobile App (15 mins)
```bash
# Switch to development
git checkout development

# Update app.json with Vercel URL
# Merge relevant changes from web

# Commit and push
```

### Phase 5: Continue Mobile Deployment
- Merge development → main
- Play Store upload

---

## 📝 Privacy Policy Creation (I'll Generate)

I'll create complete templates for:

### 1. Privacy Policy (`public/legal/privacy-policy.html`)
Full HTML with:
- Data collection disclosure
- Third-party services (Supabase, Azure, Claude, PostHog, RevenueCat, AdMob, PayFast, WhatsApp)
- Children's privacy (COPPA, GDPR, POPIA)
- User rights
- Security measures
- Contact information

### 2. Terms of Service (`public/legal/terms-of-service.html`)
Standard terms covering:
- Service description
- User responsibilities
- Account management
- Subscription terms
- Intellectual property
- Liability
- Dispute resolution

### 3. Index Page (`public/index.html`)
Simple landing with links to legal docs

---

## 🚀 Immediate Execution Plan

### Step 1: Complete RevenueCat (30 mins) - DO NOW
Use `docs/deployment/REVENUECAT_CHECKLIST.md`

### Step 2: Create Privacy Policy Files (I'll do this)
While you work on RevenueCat, I'll generate:
- `public/legal/privacy-policy.html`
- `public/legal/terms-of-service.html`
- `public/index.html` (landing page)

### Step 3: Review & Customize (30 mins)
When done with RevenueCat:
- Review generated templates
- Add your contact email
- Customize any South Africa-specific legal requirements

### Step 4: Deploy to Vercel (5 mins)
```bash
# Commit files
git add public/legal/
git commit -m "feat: add privacy policy and terms for Play Store compliance"

# Deploy
vercel --prod

# Get URL (something like: https://edudashpro.vercel.app)
```

### Step 5: Update Mobile App (15 mins)
```bash
git checkout development

# Update app.json
"privacy": "https://edudashpro.vercel.app/legal/privacy-policy.html",
"android": {
  "privacyUrl": "https://edudashpro.vercel.app/legal/privacy-policy.html"
}

# Commit and continue
```

---

## 📋 File Structure (To Create)

```
public/
├── .well-known/
│   └── assetlinks.json  # Already exists ✅
├── legal/
│   ├── privacy-policy.html  # NEW - Full privacy policy
│   ├── terms-of-service.html  # NEW - Terms of service
│   └── styles.css  # NEW - Shared styles for legal docs
└── index.html  # NEW - Landing page with links
```

---

## ✅ Vercel Deployment Checklist

### Before Deployment:
- [ ] Privacy policy HTML created
- [ ] Terms of service HTML created
- [ ] Files committed to web branch
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Logged in to Vercel (`vercel login`)

### Deployment:
- [ ] Run `vercel --prod` from web branch
- [ ] Note the deployment URL
- [ ] Test privacy policy URL loads
- [ ] Test terms of service URL loads

### After Deployment:
- [ ] Update mobile app.json with Vercel URL
- [ ] Add URL to Play Store listing
- [ ] Test URL from mobile device
- [ ] Bookmark for future reference

---

## 🌐 Expected Vercel URLs

After deployment, your URLs will be:
- **Privacy Policy**: `https://edudashpro.vercel.app/legal/privacy-policy.html`
- **Terms of Service**: `https://edudashpro.vercel.app/legal/terms-of-service.html`
- **Landing Page**: `https://edudashpro.vercel.app/`

*Note: Actual domain may vary based on Vercel project settings*

---

## 📊 Revised Timeline

| Phase | Duration | Branch | Status |
|-------|----------|--------|--------|
| 1. RevenueCat | 30 mins | N/A | 🟡 In Progress |
| 2. Create Privacy Files | 1 hour | web | ⏳ Templates ready |
| 3. Deploy to Vercel | 5 mins | web | ⏳ After #2 |
| 4. Update Mobile App | 15 mins | development | ⏳ After #3 |
| 5. PayFast Dynamic Mode | 2 hours | development | ⏳ Can overlap |
| 6. Merge to Main | 4 hours | main | ⏳ After #4 |
| 7. Play Store Upload | 1 day | main | ⏳ After #6 |

**Total**: 2-3 days to Play Store submission ✅

---

## 💡 Why This Approach Works

1. ✅ **Vercel already configured** - Just add files and deploy
2. ✅ **Static hosting** - Privacy policies are simple HTML
3. ✅ **Stable URLs** - Vercel provides reliable hosting
4. ✅ **Fast deployment** - Push and deploy in minutes
5. ✅ **Separate from app** - Legal docs independent of app updates
6. ✅ **Web branch stays clean** - For web app deployment later

---

## 🎯 What I'll Do NOW

While you complete RevenueCat, I'll generate:

1. **Complete Privacy Policy HTML** - Based on your services:
   - Supabase, Azure Speech, Claude AI, PostHog, Sentry
   - RevenueCat, Google AdMob, PayFast, WhatsApp
   - COPPA, GDPR, POPIA compliance
   - User rights and security

2. **Terms of Service HTML** - Standard terms adapted for:
   - Educational platform
   - Multi-role users (teachers, parents, principals)
   - Subscription model
   - South African context

3. **Landing Page HTML** - Simple index with:
   - App description
   - Links to legal docs
   - Contact information
   - Professional styling

---

## 🚀 Next Actions

**YOU**: 
1. Complete RevenueCat products (30 mins)
2. Come back when ready

**ME**: 
1. Generate privacy policy HTML
2. Generate terms of service HTML
3. Generate landing page HTML
4. Provide Vercel deployment commands

**THEN TOGETHER**:
1. Review templates
2. Deploy to Vercel
3. Update mobile app
4. Continue with Play Store

---

**Ready? Focus on RevenueCat while I prepare the privacy policy templates!** 🚀

After RevenueCat, just say "Ready for privacy templates" and I'll show you the complete HTML files to commit and deploy.

---

*Web Branch Execution Plan*  
*Vercel Project: prj_wGmUGovAXj814F7FGCeK3ZVHJjdU*  
*Branch: web*  
*Status: Ready for privacy policy deployment*
