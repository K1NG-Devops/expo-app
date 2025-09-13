import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { track } from '@/lib/analytics';

// Placements we support
export type InterstitialPlacement = 'homework_submitted' | 'lesson_saved_assigned' | 'events_tab_action';

function isAndroid() { return Platform.OS === 'android'; }
function adsEnabled() { return process.env.EXPO_PUBLIC_ENABLE_ADS !== '0'; }
function isWeb() { return Platform.OS === 'web'; }

const DAILY_LIMIT = 5;
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function todayKey(placement: string) {
  const d = new Date();
  const day = `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
  return `ads:${placement}:${day}`;
}

async function canShow(placement: InterstitialPlacement) {
  if (isWeb() || !isAndroid() || !adsEnabled()) return false;
  const key = todayKey(placement);
  const raw = await SecureStore.getItemAsync(key);
  const now = Date.now();
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as { count: number; last: number };
    if (parsed.count >= DAILY_LIMIT) return false;
    if (now - parsed.last < MIN_INTERVAL_MS) return false;
    return true;
  } catch {
    return true;
  }
}

async function bump(placement: InterstitialPlacement) {
  const key = todayKey(placement);
  const raw = await SecureStore.getItemAsync(key);
  const now = Date.now();
  try {
    const parsed = raw ? (JSON.parse(raw) as { count: number; last: number }) : { count: 0, last: 0 };
    parsed.count += 1; parsed.last = now;
    await SecureStore.setItemAsync(key, JSON.stringify(parsed), { keychainService: key });
  } catch {
    await SecureStore.setItemAsync(key, JSON.stringify({ count: 1, last: now }), { keychainService: key });
  }
}

class Manager {
  private loaders: Map<InterstitialPlacement, any> = new Map();

  preload(placement: InterstitialPlacement) {
    if (isWeb() || !isAndroid() || !adsEnabled()) return;
    if (this.loaders.has(placement)) return;
    
    try {
      const { InterstitialAd, TestIds } = require('react-native-google-mobile-ads');
      const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL);
      ad.load();
      this.loaders.set(placement, ad);
    } catch (error) {
      console.warn('Failed to preload interstitial ad:', error);
    }
  }

  async showIfEligible(placement: InterstitialPlacement, role?: string, tier?: 'free'|'pro'|'enterprise') {
    if (tier && tier !== 'free') return false;
    if (!(await canShow(placement))) return false;

    try {
      const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');
      
      let ad = this.loaders.get(placement);
      if (!ad) {
        ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL);
        this.loaders.set(placement, ad);
      }

      return new Promise<boolean>((resolve) => {
        const unsubscribe = ad!.addAdEventListener(AdEventType.LOADED, async () => {
          track('ad_interstitial_loaded', { placement });
          ad!.show();
        });
        const closeUnsub = ad!.addAdEventListener(AdEventType.CLOSED, async () => {
          track('ad_interstitial_dismissed', { placement });
          await bump(placement);
          resolve(true);
        });
        const errorUnsub = ad!.addAdEventListener(AdEventType.ERROR, () => {
          resolve(false);
        });

        track('ad_interstitial_requested', { placement });
        ad!.load();

        // Safety timeout resolve after 10s
        setTimeout(() => {
          unsubscribe(); closeUnsub(); errorUnsub();
          resolve(false);
        }, 10000);
      });
    } catch (error) {
      console.warn('Failed to show interstitial ad:', error);
      return false;
    }
  }
}

export const InterstitialManager = new Manager();
