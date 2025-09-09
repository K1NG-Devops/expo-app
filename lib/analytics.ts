import * as Sentry from 'sentry-expo';
import PostHog from 'posthog-react-native';

export function track(event: string, properties?: Record<string, any>) {
  try {
    PostHog.capture(event, properties ?? {});
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
