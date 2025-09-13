/**
 * Biometric Authentication Service
 *
 * Provides secure biometric authentication using fingerprint, face ID, and other
 * device-native authentication methods for enhanced security.
 */

import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

const BIOMETRIC_STORAGE_KEY = "biometric_enabled";
const BIOMETRIC_USER_KEY = "biometric_user_data";
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

export interface BiometricCapabilities {
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  isEnrolled: boolean;
  securityLevel: "weak" | "strong";
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: LocalAuthentication.AuthenticationType;
}

export interface StoredBiometricData {
  userId: string;
  email: string;
  enabledAt: string;
  lastUsed?: string;
  securityToken: string;
  version: number;
}

export interface BiometricSecurityState {
  failedAttempts: number;
  lastFailedAttempt?: string;
  lockedUntil?: string;
}

export class BiometricAuthService {
  /**
   * Check if biometric authentication is available and enrolled
   */
  static async checkCapabilities(): Promise<BiometricCapabilities> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Determine security level based on available authentication types
      const hasStrongBiometrics = supportedTypes.some(
        (type) =>
          type === LocalAuthentication.AuthenticationType.FINGERPRINT ||
          type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION ||
          type === LocalAuthentication.AuthenticationType.IRIS,
      );

      // Additional security check for biometric strength
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      const isSecure =
        securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;

      return {
        isAvailable,
        supportedTypes,
        isEnrolled,
        securityLevel: hasStrongBiometrics && isSecure ? "strong" : "weak",
      };
    } catch (error) {
      console.error("Error checking biometric capabilities:", error);
      return {
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
        securityLevel: "weak",
      };
    }
  }

  /**
   * Get user-friendly names for biometric types
   */
  static getBiometricTypeName(
    type: LocalAuthentication.AuthenticationType,
  ): string {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return "Fingerprint";
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return "Face ID";
      case LocalAuthentication.AuthenticationType.IRIS:
        return "Iris Scan";
      default:
        return "Biometric";
    }
  }

  /**
   * Get available biometric options as user-friendly list
   */
  static async getAvailableBiometricOptions(): Promise<string[]> {
    const capabilities = await this.checkCapabilities();

    if (!capabilities.isAvailable || !capabilities.isEnrolled) {
      return [];
    }

    return capabilities.supportedTypes.map((type) =>
      this.getBiometricTypeName(type),
    );
  }

  /**
   * Check if biometric authentication is currently locked out
   */
  static async isLockedOut(): Promise<boolean> {
    try {
      const securityState = await this.getSecurityState();
      if (securityState.lockedUntil) {
        const lockoutTime = new Date(securityState.lockedUntil).getTime();
        return Date.now() < lockoutTime;
      }
      return false;
    } catch (error) {
      console.error("Error checking lockout status:", error);
      return false;
    }
  }

  /**
   * Get current security state
   */
  static async getSecurityState(): Promise<BiometricSecurityState> {
    try {
      const stateData = await SecureStore.getItemAsync(
        "biometric_security_state",
      );
      return stateData ? JSON.parse(stateData) : { failedAttempts: 0 };
    } catch (error) {
      console.error("Error getting security state:", error);
      return { failedAttempts: 0 };
    }
  }

  /**
   * Update security state after authentication attempt
   */
  static async updateSecurityState(success: boolean): Promise<void> {
    try {
      const currentState = await this.getSecurityState();

      if (success) {
        // Reset failed attempts on successful authentication
        await SecureStore.setItemAsync(
          "biometric_security_state",
          JSON.stringify({ failedAttempts: 0 }),
        );
      } else {
        const newFailedAttempts = currentState.failedAttempts + 1;
        const newState: BiometricSecurityState = {
          failedAttempts: newFailedAttempts,
          lastFailedAttempt: new Date().toISOString(),
        };

        // Apply lockout if max attempts reached
        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          newState.lockedUntil = new Date(
            Date.now() + LOCKOUT_DURATION,
          ).toISOString();
        }

        await SecureStore.setItemAsync(
          "biometric_security_state",
          JSON.stringify(newState),
        );
      }
    } catch (error) {
      console.error("Error updating security state:", error);
    }
  }

  /**
   * Generate a secure token for biometric data
   */
  static async generateSecurityToken(): Promise<string> {
    const timestamp = Date.now().toString();
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${timestamp}-${randomBytes}`;
  }

  /**
   * Authenticate user with biometrics
   */
  static async authenticate(reason?: string): Promise<BiometricAuthResult> {
    try {
      // Check if locked out first
      const isLocked = await this.isLockedOut();
      if (isLocked) {
        const securityState = await this.getSecurityState();
        const lockoutTime = securityState.lockedUntil
          ? new Date(securityState.lockedUntil)
          : new Date();
        const remainingMinutes = Math.ceil(
          (lockoutTime.getTime() - Date.now()) / 60000,
        );

        return {
          success: false,
          error: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
        };
      }

      const capabilities = await this.checkCapabilities();

      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: "Biometric authentication is not available on this device",
        };
      }

      if (!capabilities.isEnrolled) {
        return {
          success: false,
          error: "No biometric data is enrolled on this device",
        };
      }

      // Enhanced security check
      if (capabilities.securityLevel === "weak") {
        return {
          success: false,
          error:
            "Biometric security level is insufficient. Please use a stronger authentication method.",
        };
      }

      const defaultReason = capabilities.supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
        ? "Use Face ID to sign in to EduDash"
        : "Use your fingerprint to sign in to EduDash";

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || defaultReason,
        cancelLabel: "Cancel",
        fallbackLabel: "Use Password",
        requireConfirmation: false,
        // Use biometric authentication only with strong security
        biometricsSecurityLevel: LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG as any,
        // Disable device fallback to prevent PIN/Pattern bypass
        disableDeviceFallback: true,
      });

      // Update security state based on result
      await this.updateSecurityState(result.success);

      if (result.success) {
        // Update last used timestamp
        await this.updateLastUsed();

        return {
          success: true,
          biometricType: capabilities.supportedTypes[0],
        };
      } else {
        return {
          success: false,
          error: result.error || "Authentication failed",
        };
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      // Update security state for failed attempt
      await this.updateSecurityState(false);

      return {
        success: false,
        error: "Authentication error occurred",
      };
    }
  }

  /**
   * Check if biometric login is enabled for the app
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      // Try SecureStore first, fallback to AsyncStorage
      let enabled = await SecureStore.getItemAsync(BIOMETRIC_STORAGE_KEY).catch(
        () => null,
      );
      if (!enabled) {
        enabled = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
      }
      return enabled === "true";
    } catch (error) {
      console.error("Error checking biometric enabled status:", error);
      return false;
    }
  }

  /**
   * Enable biometric authentication for current user
   */
  static async enableBiometric(
    userId: string,
    email: string,
  ): Promise<boolean> {
    try {
      const capabilities = await this.checkCapabilities();

      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        Alert.alert(
          "Biometric Authentication Unavailable",
          "Please set up fingerprint or face recognition in your device settings first.",
        );
        return false;
      }

      // Test authentication first
      const authResult = await this.authenticate(
        "Enable biometric login for EduDash",
      );

      if (!authResult.success) {
        Alert.alert(
          "Authentication Failed",
          authResult.error || "Could not verify biometric authentication",
        );
        return false;
      }

      // Generate security token
      const securityToken = await this.generateSecurityToken();

      // Store biometric data with enhanced security
      const biometricData: StoredBiometricData = {
        userId,
        email,
        enabledAt: new Date().toISOString(),
        securityToken,
        version: 1,
      };

      // Use SecureStore for sensitive data
      await SecureStore.setItemAsync(BIOMETRIC_STORAGE_KEY, "true");
      await SecureStore.setItemAsync(
        BIOMETRIC_USER_KEY,
        JSON.stringify(biometricData),
      );

      // Also maintain AsyncStorage compatibility for existing code
      await AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, "true");

      return true;
    } catch (error) {
      console.error("Error enabling biometric authentication:", error);
      Alert.alert("Error", "Failed to enable biometric authentication");
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disableBiometric(): Promise<void> {
    try {
      // Remove from both SecureStore and AsyncStorage
      await Promise.all([
        SecureStore.deleteItemAsync(BIOMETRIC_STORAGE_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY).catch(() => {}),
        SecureStore.deleteItemAsync("biometric_security_state").catch(() => {}),
        AsyncStorage.removeItem(BIOMETRIC_STORAGE_KEY),
        AsyncStorage.removeItem(BIOMETRIC_USER_KEY),
      ]);
    } catch (error) {
      console.error("Error disabling biometric authentication:", error);
    }
  }

  /**
   * Get stored biometric user data
   */
  static async getStoredBiometricData(): Promise<StoredBiometricData | null> {
    try {
      // Try SecureStore first, fallback to AsyncStorage for compatibility
      let data = await SecureStore.getItemAsync(BIOMETRIC_USER_KEY).catch(
        () => null,
      );
      if (!data) {
        data = await AsyncStorage.getItem(BIOMETRIC_USER_KEY);
      }

      if (data) {
        const parsedData = JSON.parse(data);

        // Migrate old data format if needed
        if (!parsedData.version) {
          parsedData.version = 1;
          parsedData.securityToken = await this.generateSecurityToken();
          // Save migrated data to SecureStore
          await SecureStore.setItemAsync(
            BIOMETRIC_USER_KEY,
            JSON.stringify(parsedData),
          );
        }

        return parsedData;
      }

      return null;
    } catch (error) {
      console.error("Error getting stored biometric data:", error);
      return null;
    }
  }

  /**
   * Update last used timestamp
   */
  private static async updateLastUsed(): Promise<void> {
    try {
      const existingData = await this.getStoredBiometricData();
      if (existingData) {
        const updatedData: StoredBiometricData = {
          ...existingData,
          lastUsed: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          BIOMETRIC_USER_KEY,
          JSON.stringify(updatedData),
        );
      }
    } catch (error) {
      console.error("Error updating last used timestamp:", error);
    }
  }

  /**
   * Show biometric setup prompt if available but not enabled
   */
  static async promptBiometricSetup() {
    const capabilities = await this.checkCapabilities();
    const isEnabled = await this.isBiometricEnabled();

    if (!capabilities.isAvailable || isEnabled) {
      return false;
    }

    const biometricOptions = await this.getAvailableBiometricOptions();
    const optionsText = biometricOptions.join(" or ");

    if (capabilities.isEnrolled) {
      Alert.alert(
        "Enable Biometric Login?",
        `Use ${optionsText} for faster, more secure access to EduDash.`,
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Enable",
            onPress: async () => {
              // This should be called with actual user data
              console.log(
                "Biometric setup requested - implement with user data",
              );
            },
          },
        ],
      );
      return true;
    } else {
      Alert.alert(
        "Set Up Biometric Authentication",
        `Set up ${optionsText} in your device settings to enable secure login.`,
        [
          { text: "Later", style: "cancel" },
          {
            text: "Settings",
            onPress: () => LocalAuthentication.authenticateAsync(),
          },
        ],
      );
      return false;
    }
  }

  /**
   * Attempt biometric login and return user data if successful
   */
  static async attemptBiometricLogin(): Promise<StoredBiometricData | null> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return null;
      }

      const authResult = await this.authenticate();
      if (!authResult.success) {
        return null;
      }

      return await this.getStoredBiometricData();
    } catch (error) {
      console.error("Biometric login attempt failed:", error);
      return null;
    }
  }

  /**
   * Get security info for display
   */
  static async getSecurityInfo(): Promise<{
    isEnabled: boolean;
    capabilities: BiometricCapabilities;
    availableTypes: string[];
    lastUsed?: string;
  }> {
    const isEnabled = await this.isBiometricEnabled();
    const capabilities = await this.checkCapabilities();
    const availableTypes = await this.getAvailableBiometricOptions();
    const storedData = await this.getStoredBiometricData();

    return {
      isEnabled,
      capabilities,
      availableTypes,
      lastUsed: storedData?.lastUsed,
    };
  }
}

export default BiometricAuthService;
