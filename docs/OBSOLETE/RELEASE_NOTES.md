# Release v1.0.2 — Sync main to feature branch

Date: 2025-10-06
Commit: ec63ab7ce74f
Branch: fix/ai-progress-analysis-schema-and-theme

Summary
- The main branch has been force-updated to match the feature branch because the previous main was obsolete and non-functional.
- This aligns all app code, configuration, and Supabase migrations with the working feature branch state.

Highlights
- EAS build profiles updated for internal testing and production APK flow
- AdMob placeholder integration and release manifest hardening
- Voice lock UI feedback enhancements
- Expo config standardized via app.config.js (app.json removed)
- Numerous fixes and improvements across app screens, AI components, and services
- Expanded Supabase migrations and schema adjustments

Breaking/Operational Notes
- History rewrite: main was force-updated to the feature branch commit.
- If you had local work on main, rebase or reset onto origin/main.
- Ensure your environment variables are up to date with the latest .env.example keys.

Developer Checklist
1) Install deps: npm ci
2) Type check: npm run typecheck
3) Lint: npm run lint
4) Build/Run:
   - Android dev: npm run dev:android
   - Web: npm run web
   - EAS builds (example): eas build --platform android --profile production

Upgrade Guidance
- Pull the updated main and reinstall dependencies.
- Review the latest Supabase migrations and plan for a safe apply in staging before production.
- Verify AdMob/analytics keys and EAS profiles per environment.
