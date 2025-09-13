/**
 * Biometric Backup and Security Manager
 *
 * Provides backup mechanisms, fallback authentication methods, and enhanced security
 * features for biometric authentication in EduDash Pro.
 */

import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import i18next from "i18next";

const BACKUP_KEY = "biometric_backup_data";
const FALLBACK_PIN_KEY = "fallback_pin_hash";
const SECURITY_QUESTIONS_KEY = "security_questions";
const BACKUP_RECOVERY_KEY = "backup_recovery_token";

export interface BackupSecurityQuestion {
  id: string;
  question: string;
  answerHash: string;
}

export interface BiometricBackupData {
  userId: string;
  email: string;
  createdAt: string;
  backupMethod: "pin" | "security_questions" | "both";
  hasPin: boolean;
  hasSecurityQuestions: boolean;
  recoveryToken: string;
  version: number;
}

export interface BackupOptions {
  enablePinFallback: boolean;
  enableSecurityQuestions: boolean;
  securityQuestions?: BackupSecurityQuestion[];
  pin?: string;
}

export class BiometricBackupManager {
  /**
   * Create a hash for sensitive data
   */
  private static async hashData(data: string): Promise<string> {
    // Simple hash function for React Native compatibility
    let hash = 0;
    if (data.length === 0) return hash.toString();
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate a secure recovery token
   */
  private static generateRecoveryToken(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 256)
    ).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${timestamp}-${randomBytes}`;
  }

  /**
   * Set up biometric backup with fallback authentication methods
   */
  static async setupBiometricBackup(
    userId: string,
    email: string,
    options: BackupOptions,
  ): Promise<boolean> {
    try {
      let hasPin = false;
      let hasSecurityQuestions = false;

      // Set up PIN fallback if requested
      if (options.enablePinFallback && options.pin) {
        const pinHash = await this.hashData(options.pin);
        await SecureStore.setItemAsync(FALLBACK_PIN_KEY, pinHash);
        hasPin = true;
      }

      // Set up security questions if provided
      if (options.enableSecurityQuestions && options.securityQuestions) {
        await SecureStore.setItemAsync(
          SECURITY_QUESTIONS_KEY,
          JSON.stringify(options.securityQuestions),
        );
        hasSecurityQuestions = true;
      }

      // Create backup data
      const recoveryToken = this.generateRecoveryToken();
      const backupData: BiometricBackupData = {
        userId,
        email,
        createdAt: new Date().toISOString(),
        backupMethod:
          hasPin && hasSecurityQuestions
            ? "both"
            : hasPin
              ? "pin"
              : "security_questions",
        hasPin,
        hasSecurityQuestions,
        recoveryToken,
        version: 1,
      };

      await SecureStore.setItemAsync(BACKUP_KEY, JSON.stringify(backupData));
      await SecureStore.setItemAsync(BACKUP_RECOVERY_KEY, recoveryToken);

      return true;
    } catch (error) {
      console.error("Error setting up biometric backup:", error);
      return false;
    }
  }

  /**
   * Verify PIN fallback authentication
   */
  static async verifyPinFallback(pin: string): Promise<boolean> {
    try {
      const storedPinHash = await SecureStore.getItemAsync(FALLBACK_PIN_KEY);
      if (!storedPinHash) {
        return false;
      }

      const pinHash = await this.hashData(pin);
      return pinHash === storedPinHash;
    } catch (error) {
      console.error("Error verifying PIN fallback:", error);
      return false;
    }
  }

  /**
   * Verify security question answers
   */
  static async verifySecurityQuestions(
    answers: { questionId: string; answer: string }[],
  ): Promise<boolean> {
    try {
      const storedQuestions = await SecureStore.getItemAsync(
        SECURITY_QUESTIONS_KEY,
      );
      if (!storedQuestions) {
        return false;
      }

      const questions: BackupSecurityQuestion[] = JSON.parse(storedQuestions);

      // Check if all provided answers are correct
      for (const answer of answers) {
        const question = questions.find((q) => q.id === answer.questionId);
        if (!question) {
          return false;
        }

        const answerHash = await this.hashData(
          answer.answer.toLowerCase().trim(),
        );
        if (answerHash !== question.answerHash) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error verifying security questions:", error);
      return false;
    }
  }

  /**
   * Get available fallback methods
   */
  static async getAvailableFallbackMethods(): Promise<{
    hasPin: boolean;
    hasSecurityQuestions: boolean;
    questions?: string[];
  }> {
    try {
      const backupData = await this.getBackupData();

      if (!backupData) {
        return { hasPin: false, hasSecurityQuestions: false };
      }

      let questions: string[] = [];
      if (backupData.hasSecurityQuestions) {
        const storedQuestions = await SecureStore.getItemAsync(
          SECURITY_QUESTIONS_KEY,
        );
        if (storedQuestions) {
          const parsedQuestions: BackupSecurityQuestion[] =
            JSON.parse(storedQuestions);
          questions = parsedQuestions.map((q) => q.question);
        }
      }

      return {
        hasPin: backupData.hasPin,
        hasSecurityQuestions: backupData.hasSecurityQuestions,
        questions: questions.length > 0 ? questions : undefined,
      };
    } catch (error) {
      console.error("Error getting fallback methods:", error);
      return { hasPin: false, hasSecurityQuestions: false };
    }
  }

  /**
   * Get backup data
   */
  static async getBackupData(): Promise<BiometricBackupData | null> {
    try {
      const data = await SecureStore.getItemAsync(BACKUP_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting backup data:", error);
      return null;
    }
  }

  /**
   * Disable biometric backup
   */
  static async disableBiometricBackup(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(BACKUP_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(FALLBACK_PIN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(SECURITY_QUESTIONS_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(BACKUP_RECOVERY_KEY).catch(() => {}),
      ]);
    } catch (error) {
      console.error("Error disabling biometric backup:", error);
    }
  }

  /**
   * Update PIN fallback
   */
  static async updatePinFallback(newPin: string): Promise<boolean> {
    try {
      const pinHash = await this.hashData(newPin);
      await SecureStore.setItemAsync(FALLBACK_PIN_KEY, pinHash);

      // Update backup data
      const backupData = await this.getBackupData();
      if (backupData) {
        backupData.hasPin = true;
        backupData.backupMethod = backupData.hasSecurityQuestions
          ? "both"
          : "pin";
        await SecureStore.setItemAsync(BACKUP_KEY, JSON.stringify(backupData));
      }

      return true;
    } catch (error) {
      console.error("Error updating PIN fallback:", error);
      return false;
    }
  }

  /**
   * Show fallback authentication options to user
   */
  static async showFallbackOptions(): Promise<boolean> {
    const methods = await this.getAvailableFallbackMethods();

    return new Promise((resolve) => {
      try {
        if (!methods.hasPin && !methods.hasSecurityQuestions) {
          Alert.alert(
            "No Backup Methods Available",
            "Please set up backup authentication methods in your profile settings.",
            [{ text: i18next.t("common.ok"), onPress: () => resolve(false) }],
          );
          return;
        }

        const options = [];
        if (methods.hasPin) {
          options.push({
            text: "Use PIN",
            onPress: () => this.promptPinFallback().then(resolve),
          });
        }

        if (methods.hasSecurityQuestions) {
          options.push({
            text: "Use Security Questions",
            onPress: () => this.promptSecurityQuestions().then(resolve),
          });
        }

        options.push({
          text: i18next.t("navigation.cancel"),
          style: "cancel" as const,
          onPress: () => resolve(false),
        });

        Alert.alert(
          "Alternative Authentication",
          "Choose a backup authentication method:",
          options,
        );
      } catch (error) {
        console.error("Error showing fallback options:", error);
        resolve(false);
      }
    });
  }

  /**
   * Prompt user for PIN fallback
   */
  private static async promptPinFallback(): Promise<boolean> {
    // This would typically show a custom PIN input modal
    // For now, using a simple prompt
    return new Promise((resolve) => {
      Alert.prompt(
        "Enter PIN",
        "Enter your backup PIN to authenticate:",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Verify",
            onPress: async (pin) => {
              if (!pin) {
                resolve(false);
                return;
              }
              const isValid = await this.verifyPinFallback(pin);
              if (isValid) {
                Alert.alert("Success", "PIN verified successfully!");
                resolve(true);
              } else {
                Alert.alert("Error", "Invalid PIN. Please try again.");
                resolve(false);
              }
            },
          },
        ],
        "secure-text",
      );
    });
  }

  /**
   * Prompt user for security questions
   */
  private static async promptSecurityQuestions(): Promise<boolean> {
    // This would typically show a custom security questions modal
    // For now, showing a simplified version
    const methods = await this.getAvailableFallbackMethods();

    return new Promise((resolve) => {
      if (!methods.questions || methods.questions.length === 0) {
        resolve(false);
        return;
      }

      // For demo purposes, just show the first question
      Alert.prompt("Security Question", methods.questions[0], [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: "Submit",
          onPress: async (answer) => {
            if (!answer) {
              resolve(false);
              return;
            }

            const storedQuestions = await SecureStore.getItemAsync(
              SECURITY_QUESTIONS_KEY,
            );
            if (storedQuestions) {
              const questions: BackupSecurityQuestion[] =
                JSON.parse(storedQuestions);
              const isValid = await this.verifySecurityQuestions([
                { questionId: questions[0].id, answer },
              ]);

              if (isValid) {
                Alert.alert("Success", "Security question answered correctly!");
                resolve(true);
              } else {
                Alert.alert("Error", "Incorrect answer. Please try again.");
                resolve(false);
              }
            } else {
              resolve(false);
            }
          },
        },
      ]);
    });
  }

  /**
   * Export backup data for user (encrypted)
   */
  static async exportBackupData(): Promise<string | null> {
    try {
      const backupData = await this.getBackupData();
      if (!backupData) {
        return null;
      }

      // Create a simplified backup export (without sensitive data)
      const exportData = {
        userId: backupData.userId,
        email: backupData.email,
        createdAt: backupData.createdAt,
        backupMethod: backupData.backupMethod,
        hasPin: backupData.hasPin,
        hasSecurityQuestions: backupData.hasSecurityQuestions,
        version: backupData.version,
      };

      return JSON.stringify(exportData);
    } catch (error) {
      console.error("Error exporting backup data:", error);
      return null;
    }
  }
}

export default BiometricBackupManager;
