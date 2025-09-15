/*
 * Lightweight logging helpers to gate console noise in production builds.
 *
 * Usage:
 * - import { log, warn, debug, error } from '@/lib/debug'
 * - log/warn/debug are no-ops in production by default; error always logs
 * - To enable logs in production builds, set EXPO_PUBLIC_ENABLE_CONSOLE=true at build time
 */

export type LogFn = (...args: any[]) => void;

// Allow enabling logs in production via env flag
const ENABLE_CONSOLE = (__DEV__ as boolean) || process.env.EXPO_PUBLIC_ENABLE_CONSOLE === 'true';

export const log: LogFn = ENABLE_CONSOLE ? console.log.bind(console) : () => {};
export const warn: LogFn = ENABLE_CONSOLE ? console.warn.bind(console) : () => {};
export const debug: LogFn = ENABLE_CONSOLE ? console.debug.bind(console) : () => {};
export const error: LogFn = console.error.bind(console);

// Optional: helper to safely stringify objects without throwing
export function safeJson(value: any, space: number = 2): string {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return String(value);
  }
}
