import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const KEY = "biometrics_enabled";
const CACHE_DURATION = 30000; // 30 seconds cache for hardware checks

// Cache for hardware capabilities to avoid repeated expensive calls
interface CapabilityCache {
  isAvailable: boolean;
  isEnrolled: boolean;
  timestamp: number;
}

let capabilityCache: CapabilityCache | null = null;

/**
 * Get cached hardware capabilities or fetch new ones
 */
async function getCapabilities(): Promise<{
  isAvailable: boolean;
  isEnrolled: boolean;
}> {
  const now = Date.now();

  // Return cached result if still valid
  if (capabilityCache && now - capabilityCache.timestamp < CACHE_DURATION) {
    return {
      isAvailable: capabilityCache.isAvailable,
      isEnrolled: capabilityCache.isEnrolled,
    };
  }

  // Fetch new capabilities
  try {
    const [isAvailable, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    // Update cache
    capabilityCache = {
      isAvailable,
      isEnrolled,
      timestamp: now,
    };

    return { isAvailable, isEnrolled };
  } catch (error) {
    console.warn("Failed to check biometric capabilities:", error);
    return { isAvailable: false, isEnrolled: false };
  }
}

export async function isHardwareAvailable(): Promise<boolean> {
  const { isAvailable } = await getCapabilities();
  return isAvailable;
}

export async function isEnrolled(): Promise<boolean> {
  const { isEnrolled } = await getCapabilities();
  return isEnrolled;
}

export async function getEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(KEY);
    if (val === "1") return true;
    if (val === "0") return false;
    // Default off unless explicitly enabled
    return false;
  } catch {
    return false;
  }
}

export async function setEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

export async function authenticate(
  reason = "Unlock EduDash Pro",
): Promise<boolean> {
  try {
    // Check capabilities first
    const { isAvailable, isEnrolled } = await getCapabilities();

    if (!isAvailable || !isEnrolled) {
      console.warn("Biometric authentication not available or not enrolled");
      return false;
    }

    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: "Use passcode",
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
      // Enhanced security settings - cast to correct type
      biometricsSecurityLevel: LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG as any,
    });

    return !!res.success;
  } catch (error) {
    console.warn("Biometric authentication error:", error);
    return false;
  }
}

export async function promptIfEnabled(): Promise<boolean> {
  try {
    // Use optimized capabilities check
    const { isAvailable, isEnrolled } = await getCapabilities();
    const enabled = await getEnabled();

    if (!enabled || !isAvailable || !isEnrolled) {
      return true; // allow through if biometrics not enabled or available
    }

    const ok = await authenticate();
    return ok;
  } catch (error) {
    console.warn("Error in promptIfEnabled:", error);
    return true; // Default to allowing access if there's an error
  }
}

/**
 * Clear the capability cache (useful for testing or when settings change)
 */
export function clearCapabilityCache(): void {
  capabilityCache = null;
}

/**
 * Get detailed biometric information
 */
export async function getBiometricInfo(): Promise<{
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  securityLevel: LocalAuthentication.SecurityLevel | null;
}> {
  try {
    const { isAvailable, isEnrolled } = await getCapabilities();
    let supportedTypes: LocalAuthentication.AuthenticationType[] = [];
    let securityLevel: LocalAuthentication.SecurityLevel | null = null;

    if (isAvailable) {
      supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
    }

    return {
      isAvailable,
      isEnrolled,
      supportedTypes,
      securityLevel,
    };
  } catch (error) {
    console.warn("Error getting biometric info:", error);
    return {
      isAvailable: false,
      isEnrolled: false,
      supportedTypes: [],
      securityLevel: null,
    };
  }
}
