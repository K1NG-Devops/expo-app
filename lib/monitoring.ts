import * as Sentry from 'sentry-expo';
import { initPostHog } from '@/lib/posthogClient';

let started = false;

export function startMonitoring() {
  if (started) return; started = true;

  const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      enableInExpoDevelopment: true,
      debug: false,
      tracesSampleRate: 0.2,
    });
  }

  const PH_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
  const PH_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
  if (PH_KEY) {
    initPostHog(PH_KEY, {
      host: PH_HOST,
      captureAppLifecycleEvents: true,
    });
  }
}

