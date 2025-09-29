// Feedback utility for vibration and sound alerts
// - Uses React Native Vibration for haptics (no extra deps)
// - Tries to use expo-av for sound; gracefully degrades if not available

let Audio: any = null;
let AsyncStorage: any = null;
try {
   
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

async function ensureAudio() {
  if (Audio) return Audio;
  try {
    // Dynamically import expo-av only if installed (avoids bundling issues)
     
    Audio = require('expo-av').Audio;
    return Audio;
  } catch (e) {
    // expo-av not available
    return null;
  }
}

async function playBeep() {
  const A = await ensureAudio();
  if (!A) throw new Error('expo-av not installed');

  const sound = new A.Sound();
  try {
    // Generate and play a short beep using a bundled asset or simple tone
    // If you have an asset, you can loadAsync(require('../assets/sounds/success.wav'))
    // Here, try to use a silent empty sound with volume bump (fallback behavior)
    await sound.loadAsync({ uri: 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA' });
    await sound.setStatusAsync({ shouldPlay: true, volume: 0.6 });
  } catch (e) {
    try { await sound.unloadAsync(); } catch {}
    throw e;
  }
}

async function isEnabled(key: string, defaultVal = true): Promise<boolean> {
  try {
    const v = await AsyncStorage?.getItem(key);
    if (v === 'false') return false;
    if (v === 'true') return true;
    return defaultVal;
  } catch {
    return defaultVal;
  }
}

const Feedback = {
  async playSuccess() {
    try {
      const enabled = await isEnabled('pref_sound_enabled', true);
      if (!enabled) return;
      await playBeep();
    } catch (e) {
      // No sound available; ignore
    }
  },
  async vibrate(ms = 30) {
    try {
      const enabled = await isEnabled('pref_haptics_enabled', true);
      if (!enabled) return;
      // Dynamically import to avoid breaking web
      const { Vibration } = require('react-native');
      Vibration.vibrate(ms);
    } catch {
      // ignore
    }
  }
};

export default Feedback;
