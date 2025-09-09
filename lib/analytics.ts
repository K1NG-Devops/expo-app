import * as Sentry from 'sentry-expo';
import { getPostHog } from '@/lib/posthogClient';

export function track(event: string, properties?: Record<string, any>) {
  try {
    const ph = getPostHog();
    ph?.capture(event, properties ?? {});
  } catch {}
  try {
    Sentry.Native.addBreadcrumb({
      category: 'analytics',
      message: event,
      data: properties,
      level: 'info' as any,
    });
  } catch {}
}
