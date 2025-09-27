# Google Play Store Data Safety Section
## Complete Answers for EduDash Pro

This document provides the exact answers you need for the Google Play Store Data Safety section, based on your EduDash Pro implementation.

---

## 📊 **Data Collection Overview**

### Does your app collect or share any of the required user data types?
**Answer: YES**

### Does your app collect data for children under 13?
**Answer: YES** - Educational app for preschools

### Is all the user data collected by your app encrypted in transit?
**Answer: YES** - All data transmitted via HTTPS/SSL

### Do you provide a way for users to request that their data is deleted?
**Answer: YES**
- **Data Deletion URL:** https://www.edudashpro.org.za/marketing/data-deletion
- **Account Deletion URL:** https://www.edudashpro.org.za/marketing/account-deletion

---

## 🔐 **Data Types Collected**

### 1. **Personal Info** - ✅ COLLECTED
- **Data Types:**
  - [x] Name (First/Last name for teachers, parents; First name only for children)
  - [x] Email address (Teachers, parents only - NOT children)
  - [ ] User IDs *(We use internal UUIDs, not personal identifiers)*
  - [ ] Address *(Not collected)*
  - [ ] Phone number *(Not collected)*
  - [ ] Race and ethnicity *(Not collected)*
  - [ ] Political or religious beliefs *(Not collected)*
  - [ ] Sexual orientation *(Not collected)*
  - [ ] Other personal info *(Not applicable)*

- **Data Usage:**
  - [x] App functionality
  - [x] Account management
  - [ ] Analytics *(Personal info not used for analytics)*
  - [ ] Developer communications *(Only for support)*
  - [ ] Advertising or marketing *(Not used)*
  - [ ] Fraud prevention, security, and compliance

- **Data Sharing:**
  - [ ] Data is shared with third parties *(Personal info not shared)*

### 2. **Health and Fitness** - ❌ NOT COLLECTED

### 3. **Financial Info** - ✅ COLLECTED (LIMITED)
- **Data Types:**
  - [ ] User payment info *(Handled by payment processors)*
  - [x] Purchase history (Subscription records for billing)
  - [ ] Credit score *(Not collected)*
  - [ ] Other financial info *(Not applicable)*

- **Data Usage:**
  - [x] App functionality (Subscription management)
  - [ ] Analytics
  - [ ] Developer communications
  - [ ] Advertising or marketing
  - [x] Fraud prevention, security, and compliance

- **Data Sharing:**
  - [ ] Data is shared with third parties *(Processed by RevenueCat/Stripe but not shared)*

### 4. **Location** - ❌ NOT COLLECTED
*(Explicitly blocked in permissions)*

### 5. **Contacts** - ❌ NOT COLLECTED

### 6. **Messages** - ✅ COLLECTED
- **Data Types:**
  - [x] Emails (Parent-teacher communications)
  - [x] SMS (WhatsApp notifications if enabled)
  - [x] In-app messages (Educational messaging)
  - [ ] Other in-app communications

- **Data Usage:**
  - [x] App functionality (Educational communication)
  - [ ] Analytics *(Messages not analyzed)*
  - [ ] Developer communications
  - [ ] Advertising or marketing
  - [x] Fraud prevention, security, and compliance (Moderation)

- **Data Sharing:**
  - [ ] Data is shared with third parties

### 7. **Photos and Videos** - ✅ COLLECTED (LIMITED)
- **Data Types:**
  - [x] Photos (Profile pictures, educational submissions)
  - [ ] Videos *(Currently not implemented)*

- **Data Usage:**
  - [x] App functionality (Profiles, educational content)
  - [ ] Analytics
  - [ ] Developer communications
  - [ ] Advertising or marketing
  - [ ] Fraud prevention, security, and compliance

- **Data Sharing:**
  - [ ] Data is shared with third parties

### 8. **Audio Files** - ❌ NOT COLLECTED
*(Audio recording blocked in permissions)*

### 9. **Files and Docs** - ✅ COLLECTED
- **Data Types:**
  - [x] Files and docs (Educational materials, lesson plans, assignments)

- **Data Usage:**
  - [x] App functionality (Educational content management)
  - [ ] Analytics
  - [ ] Developer communications
  - [ ] Advertising or marketing
  - [ ] Fraud prevention, security, and compliance

- **Data Sharing:**
  - [ ] Data is shared with third parties

### 10. **Calendar** - ❌ NOT COLLECTED

### 11. **App Activity** - ✅ COLLECTED
- **Data Types:**
  - [x] App interactions (Learning progress, feature usage)
  - [x] In-app search history (Educational content searches)
  - [x] Installed apps (Not actively collected but may be in crash logs)
  - [x] Other user-generated content (Educational submissions, creative work)
  - [ ] Other app activity

- **Data Usage:**
  - [x] App functionality (Personalized learning, progress tracking)
  - [x] Analytics (Aggregated usage statistics)
  - [ ] Developer communications
  - [ ] Advertising or marketing *(Not used for ad targeting)*
  - [ ] Fraud prevention, security, and compliance

- **Data Sharing:**
  - [ ] Data is shared with third parties *(Analytics aggregated only)*

### 12. **Web Browsing** - ❌ NOT COLLECTED

### 13. **App Info and Performance** - ✅ COLLECTED
- **Data Types:**
  - [x] Crash logs (Error reporting via Sentry)
  - [x] Diagnostics (Performance monitoring)
  - [ ] Other app performance data

- **Data Usage:**
  - [x] App functionality (Bug fixes, performance improvement)
  - [x] Analytics (Performance metrics)
  - [ ] Developer communications
  - [ ] Advertising or marketing
  - [ ] Fraud prevention, security, and compliance

- **Data Sharing:**
  - [x] Data is shared with third parties (Sentry for error monitoring)

### 14. **Device or Other IDs** - ✅ COLLECTED (MINIMAL)
- **Data Types:**
  - [x] Device or other IDs (For crash reporting and analytics only)

- **Data Usage:**
  - [x] App functionality (Session management)
  - [x] Analytics (Aggregated device statistics)
  - [ ] Developer communications
  - [ ] Advertising or marketing *(Not used for ad personalization)*
  - [ ] Fraud prevention, security, and compliance

- **Data Sharing:**
  - [x] Data is shared with third parties (Analytics providers)

---

## 👶 **Children's Data (Under 13)**

### Does your app collect data from children under 13?
**Answer: YES**

### What data do you collect from children?
- **Personal Info:** First name and grade level only
- **App Activity:** Learning progress, educational submissions, activity completion
- **Files and Docs:** Educational work, creative projects (with consent)
- **Photos:** Profile pictures (with parent/school permission)

### COPPA Compliance Measures:
- [x] Parental consent obtained through school enrollment
- [x] Minimal data collection for educational purposes only
- [x] No behavioral advertising to children
- [x] Enhanced security for children's data
- [x] Easy deletion process for parents/schools
- [x] No sharing of children's personal information

---

## 🔒 **Security Measures**

### Data Encryption:
- [x] All data encrypted in transit (HTTPS/TLS)
- [x] Database encryption at rest (Supabase)
- [x] Secure API endpoints with authentication

### Access Controls:
- [x] Role-based access (teachers see only their students)
- [x] School-scoped data isolation
- [x] Two-factor authentication for sensitive accounts

### Data Retention:
- Student data: Retained during enrollment, deleted on request
- Educational content: Institutional retention unless deleted
- Technical logs: Auto-deleted after 90 days
- Billing: 7 years as required by law

---

## 🤝 **Third-Party Data Sharing**

### Service Providers (with Data Processing Agreements):

1. **Supabase** (Database hosting)
   - **Purpose:** Data storage and backend services
   - **Data Shared:** All app data (encrypted)
   - **GDPR Compliant:** Yes

2. **Sentry** (Error monitoring)
   - **Purpose:** App performance and crash reporting
   - **Data Shared:** Technical logs, error reports (no personal data)
   - **Privacy-focused:** Yes

3. **Google AdMob** (Family-safe ads)
   - **Purpose:** Educational advertisements
   - **Data Shared:** No personal data, aggregated analytics only
   - **Family-safe:** Yes, COPPA compliant

4. **RevenueCat** (Subscription management)
   - **Purpose:** Payment processing and subscription management
   - **Data Shared:** Purchase history, subscription status
   - **Secure:** Yes

---

## 📝 **User Rights and Controls**

### Users can:
- [x] View all their data through app settings
- [x] Request data deletion (partial or complete)
- [x] Export their educational data
- [x] Control communication preferences
- [x] Block other users
- [x] Report inappropriate content

### Parents can (for children under 13):
- [x] Review their child's data
- [x] Request deletion of their child's data
- [x] Control their child's data sharing
- [x] Revoke consent for data collection

---

## 🎯 **Summary for Data Safety Declaration**

**Key Points to Emphasize:**
1. **Educational Purpose:** All data collection serves educational goals
2. **COPPA Compliant:** Special protections for children under 13
3. **Minimal Collection:** Only necessary data for app functionality
4. **No Selling:** Personal data is never sold to third parties
5. **Strong Security:** Encryption, access controls, and monitoring
6. **User Control:** Easy deletion and management tools
7. **Transparency:** Clear privacy policy and terms of service

**Target Audience:** Families (ages 3-6 primary, adults secondary)
**Content Rating:** Educational, family-safe
**Privacy Approach:** Privacy by design with child protection focus

---

## 🔗 **Required Links for Play Console**

- **Privacy Policy:** https://www.edudashpro.org.za/marketing/privacy-policy
- **Data Deletion:** https://www.edudashpro.org.za/marketing/data-deletion  
- **Account Deletion:** https://www.edudashpro.org.za/marketing/account-deletion
- **Terms of Service:** https://www.edudashpro.org.za/marketing/terms-of-service

---

**Last Updated:** September 26, 2025  
**Review Status:** Ready for Google Play Console submission  
**Compliance Level:** COPPA, GDPR, and Family Policy compliant