import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";

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
    console.log('Using cached biometric capabilities:', capabilityCache);
    return {
      isAvailable: capabilityCache.isAvailable,
      isEnrolled: capabilityCache.isEnrolled,
    };
  }

  // Fetch new capabilities
  try {
    console.log('Checking biometric capabilities...');
    const [isAvailable, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    console.log('Biometric capabilities result:', { isAvailable, isEnrolled });

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
    // Log device info for OPPO-specific debugging
    console.log('Biometric auth attempt on device:', {
      brand: Device.brand,
      model: Device.modelName,
      platform: Device.osName
    });

    // Check capabilities first
    const { isAvailable, isEnrolled } = await getCapabilities();

    if (!isAvailable || !isEnrolled) {
      console.warn("Biometric authentication not available or not enrolled");
      return false;
    }

    // Get supported authentication types for better user prompts
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    // Create appropriate prompt message based on available biometrics
    let promptMessage = reason;
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      promptMessage = reason === "Unlock EduDash Pro" 
        ? "Place your finger on the sensor to unlock EduDash Pro" 
        : reason;
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      promptMessage = reason === "Unlock EduDash Pro" 
        ? "Look at the camera to unlock EduDash Pro" 
        : reason;
    }

    // Configure authentication options (skip biometricsSecurityLevel for OPPO compatibility)
    const authOptions: LocalAuthentication.LocalAuthenticationOptions = {
      promptMessage,
      fallbackLabel: "Use passcode",
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
      // Skip biometricsSecurityLevel to avoid casting issues on OPPO and other Android devices
    };

    const res = await LocalAuthentication.authenticateAsync(authOptions);

    console.log('Biometric authentication result:', {
      success: res.success,
      error: res.error,
      warning: res.warning
    });
    return !!res.success;
  } catch (error) {
    console.error("Biometric authentication error:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
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
