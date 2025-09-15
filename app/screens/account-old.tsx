import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  getEnabled as getBiometricsEnabled,
  setEnabled as setBiometricsEnabled,
  isHardwareAvailable,
  isEnrolled,
} from "@/lib/biometrics";
import { BiometricAuthService } from "@/services/BiometricAuthService";
import { BiometricBackupManager } from "@/lib/BiometricBackupManager";
import { supabase } from "@/lib/supabase";
import { signOutAndRedirect } from "@/lib/authActions";

export default function AccountScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
  const [biometricLastUsed, setBiometricLastUsed] = useState<string | null>(
    null,
  );
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showBackupSetup, setShowBackupSetup] = useState(false);
  const [backupPin, setBackupPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [hasBackupMethods, setHasBackupMethods] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase!.auth.getUser();
    const u = data.user;
    setEmail(u?.email ?? null);

    // Get user metadata
    let r = (u?.user_metadata as any)?.role ?? null;
    let s = (u?.user_metadata as any)?.preschool_id ?? null;
    let fn = (u?.user_metadata as any)?.first_name ?? null;
    let ln = (u?.user_metadata as any)?.last_name ?? null;
    let img = (u?.user_metadata as any)?.avatar_url ?? null;

    if (u?.id) {
      try {
        const { data: p } = await supabase!
          .from("profiles")
          .select("role,preschool_id,first_name,last_name,avatar_url")
          .eq("id", u.id)
          .maybeSingle();
        r = r || (p as any)?.role || null;
        s = s || (p as any)?.preschool_id || null;
        fn = fn || (p as any)?.first_name || null;
        ln = ln || (p as any)?.last_name || null;
        img = img || (p as any)?.avatar_url || null;
      } catch {
        /* noop */
      }
    }

    setRole(r);
    setSchool(s);
    setFirstName(fn);
    setLastName(ln);
    setProfileImage(img);

    // Set edit form values
    setEditFirstName(fn || "");
    setEditLastName(ln || "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const securityInfo = await BiometricAuthService.getSecurityInfo();
        setBiometricSupported(securityInfo.capabilities.isAvailable);
        setBiometricEnrolled(securityInfo.capabilities.isEnrolled);
        setBiometricEnabled(securityInfo.isEnabled);
        setBiometricTypes(securityInfo.availableTypes);
        setBiometricLastUsed(securityInfo.lastUsed || null);

        // Check for backup methods
        const backupMethods =
          await BiometricBackupManager.getAvailableFallbackMethods();
        setHasBackupMethods(
          backupMethods.hasPin || backupMethods.hasSecurityQuestions,
        );
      } catch {
        console.error("Error loading biometric info");
        // Fallback to original method
        const [supported, enrolled, enabled] = await Promise.all([
          isHardwareAvailable(),
          isEnrolled(),
          getBiometricsEnabled(),
        ]);
        setBiometricSupported(supported);
        setBiometricEnrolled(enrolled);
        setBiometricEnabled(enabled);
      }
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need camera roll permissions to select a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to select image");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need camera permissions to take a photo.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const uploadProfileImage = async (uri: string) => {
    try {
      setUploadingImage(true);
      const { data } = await supabase!.auth.getUser();
      const user = data.user;

      if (!user?.id) {
        Alert.alert("Error", "User not found");
        return;
      }

      // Read the image file
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `profile_${user.id}_${Date.now()}.jpg`;

      // Try to upload to Supabase Storage
      let publicUrl = null;
      try {
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase!.storage
          .from("avatars")
          .upload(filename, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          console.warn("Storage upload failed:", uploadError);
          throw uploadError;
        }

        // Get public URL
        const {
          data: { publicUrl: url },
        } = supabase!.storage.from("avatars").getPublicUrl(filename);

        publicUrl = url;
      } catch (storageError) {
        console.warn("Storage upload failed, using local URI:", storageError);
        // Fallback: just use the local URI for now
        publicUrl = uri;
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase!
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        console.warn("Profile update error:", updateError);
        // Still update local state even if DB update fails
      }

      // Update local state
      setProfileImage(publicUrl);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Error",
        "Failed to update profile picture. Please try again.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Update Profile Picture",
      "Choose an option",
      [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Library", onPress: pickImage },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  const toggleBiometric = async () => {
    if (!biometricEnrolled) {
      Alert.alert(
        "Biometric Setup Required",
        "Please set up fingerprint or face recognition in your device settings first.",
        [{ text: "OK" }],
      );
      return;
    }

    try {
      const { data } = await supabase!.auth.getUser();
      const user = data.user;

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      if (biometricEnabled) {
        // Disable biometric authentication
        await BiometricAuthService.disableBiometric();
        await setBiometricsEnabled(false);
        setBiometricEnabled(false);
        Alert.alert(
          "Biometric Login Disabled",
          "You will need to use your password to sign in.",
        );
      } else {
        // Enable biometric authentication
        const success = await BiometricAuthService.enableBiometric(
          user.id,
          user.email || "",
        );
        if (success) {
          await setBiometricsEnabled(true);
          setBiometricEnabled(true);
          Alert.alert(
            "Biometric Login Enabled",
            "You can now use biometric authentication to sign in quickly.",
          );
        }
      }
    } catch (error) {
      console.error("Error toggling biometric:", error);
      Alert.alert("Error", "Failed to update biometric settings.");
    }

    setShowSettingsMenu(false);
  };

  const saveProfileChanges = async () => {
    try {
      setSavingProfile(true);
      const { data } = await supabase!.auth.getUser();
      const user = data.user;

      if (!user?.id) {
        Alert.alert("Error", "User not found");
        return;
      }

      // Update profile in database
      const { error: profileError } = await supabase!
        .from("profiles")
        .update({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
        })
        .eq("id", user.id);

      if (profileError) {
        console.warn("Profile update error:", profileError);
        Alert.alert(
          "Warning",
          "Profile updated locally but failed to sync to database.",
        );
      }

      // Update local state
      setFirstName(editFirstName.trim() || null);
      setLastName(editLastName.trim() || null);
      setShowEditProfile(false);

      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile changes.");
    } finally {
      setSavingProfile(false);
    }
  };

  const cancelProfileEdit = () => {
    setEditFirstName(firstName || "");
    setEditLastName(lastName || "");
    setShowEditProfile(false);
  };

  const setupBackupMethods = async () => {
    if (!backupPin || backupPin.length < 4) {
      Alert.alert("Invalid PIN", "Please enter a PIN with at least 4 digits.");
      return;
    }

    if (backupPin !== confirmPin) {
      Alert.alert("PIN Mismatch", "Please make sure both PIN entries match.");
      return;
    }

    try {
      const { data } = await supabase!.auth.getUser();
      const user = data.user;

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      const success = await BiometricBackupManager.setupBiometricBackup(
        user.id,
        user.email || "",
        {
          enablePinFallback: true,
          enableSecurityQuestions: false,
          pin: backupPin,
        },
      );

      if (success) {
        setHasBackupMethods(true);
        setShowBackupSetup(false);
        setBackupPin("");
        setConfirmPin("");
        Alert.alert(
          "Success",
          "Backup authentication method set up successfully!",
        );
      } else {
        Alert.alert("Error", "Failed to set up backup authentication.");
      }
    } catch (error) {
      console.error("Error setting up backup methods:", error);
      Alert.alert("Error", "Failed to set up backup authentication.");
    }
  };

  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    if (lastName) return lastName;
    return email?.split("@")[0] || "User";
  };

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) return firstName.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Profile",
          headerStyle: { backgroundColor: "#0b1220" },
          headerTitleStyle: { color: "#fff" },
          headerTintColor: "#00f5ff",
          headerRight: () => (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowSettingsMenu(true)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#00f5ff" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00f5ff"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={showImageOptions}
            disabled={uploadingImage}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}

            <View style={styles.cameraIconContainer}>
              {uploadingImage ? (
                <View style={styles.loadingIcon}>
                  <Text style={styles.loadingText}>⟳</Text>
                </View>
              ) : (
                <Ionicons name="camera" size={16} color="#0b1220" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{getDisplayName()}</Text>
          <Text style={styles.email}>{email}</Text>

          {role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {role.replace("_", " ").toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Profile Information Cards */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>
                  {firstName || lastName
                    ? `${firstName || ""} ${lastName || ""}`.trim()
                    : "Not set"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowEditProfile(true)}
              >
                <Ionicons name="pencil" size={16} color="#00f5ff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{email || "Not set"}</Text>
              </View>
            </View>
          </View>

          {role && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={20} color="#9CA3AF" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Role</Text>
                  <Text style={styles.infoValue}>{role.replace("_", " ")}</Text>
                </View>
              </View>
            </View>
          )}

          {school && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={20} color="#9CA3AF" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>School ID</Text>
                  <Text style={styles.infoValue}>{school}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
        
        {/* Security Section */}
        {biometricSupported && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Security & Privacy</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons 
                  name={biometricEnabled ? "finger-print" : "finger-print-outline"} 
                  size={20} 
                  color={biometricEnabled ? "#00f5ff" : "#9CA3AF"} 
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Biometric Login</Text>
                  <Text style={[styles.infoValue, { color: biometricEnabled ? '#10B981' : '#9CA3AF' }]}>
                    {biometricEnrolled ? (
                      biometricEnabled ? 'Enabled' : 'Available - Not Enabled'
                    ) : 'Setup Required'}
                  </Text>
                  {biometricEnabled && biometricLastUsed && (
                    <Text style={styles.infoSubtext}>
                      Last used: {new Date(biometricLastUsed).toLocaleDateString()}
                    </Text>
                  )}
                  {biometricEnabled && biometricTypes.length > 0 && (
                    <Text style={styles.infoSubtext}>
                      Available: {biometricTypes.join(', ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setShowSettingsMenu(true)}
                >
                  <Ionicons name="settings-outline" size={16} color="#00f5ff" />
                </TouchableOpacity>
              </View>
            </View>
            
            {hasBackupMethods && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="key" size={20} color="#00f5ff" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Backup Authentication</Text>
                    <Text style={[styles.infoValue, { color: '#10B981' }]}>Configured</Text>
                    <Text style={styles.infoSubtext}>
                      PIN backup method is set up and ready
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setShowSettingsMenu(true)}
                  >
                    <Ionicons name="settings-outline" size={16} color="#00f5ff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Biometric Setup CTA */}
            {biometricEnrolled && !biometricEnabled && (
              <TouchableOpacity
                style={styles.ctaCard}
                onPress={toggleBiometric}
              >
                <View style={styles.ctaContent}>
                  <Ionicons name="finger-print" size={24} color="#00f5ff" />
                  <View style={styles.ctaText}>
                    <Text style={styles.ctaTitle}>Enable Biometric Login</Text>
                    <Text style={styles.ctaSubtitle}>
                      Quick and secure access with your fingerprint or face
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#00f5ff" />
                </View>
              </TouchableOpacity>
            )}
            
            {/* Device Setup Guide */}
            {!biometricEnrolled && (
              <View style={styles.setupGuideCard}>
                <View style={styles.setupGuideContent}>
                  <Ionicons name="information-circle" size={24} color="#FFA500" />
                  <View style={styles.setupGuideText}>
                    <Text style={styles.setupGuideTitle}>Set Up Device Security</Text>
                    <Text style={styles.setupGuideSubtitle}>
                      Enable fingerprint or face recognition in your device settings to use biometric login
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={() => signOutAndRedirect({ clearBiometrics: false, redirectTo: '/(auth)/sign-in' })}
          style={styles.signOutButton}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSettingsMenu}
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsMenu(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Biometric Setting */}
            {biometricSupported && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={toggleBiometric}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name={
                      biometricEnrolled
                        ? biometricEnabled
                          ? "finger-print"
                          : "finger-print-outline"
                        : "finger-print-outline"
                    }
                    size={24}
                    color={
                      biometricEnrolled
                        ? biometricEnabled
                          ? "#00f5ff"
                          : "#9CA3AF"
                        : "#666"
                    }
                  />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Biometric Login</Text>
                    <Text style={styles.settingSubtitle}>
                      {biometricEnrolled
                        ? biometricTypes.length > 0
                          ? `Available: ${biometricTypes.join(", ")}`
                          : "Use biometric authentication to sign in"
                        : "Setup required in device settings"}
                    </Text>
                    {biometricLastUsed && (
                      <Text
                        style={[
                          styles.settingSubtitle,
                          { fontSize: 12, opacity: 0.7 },
                        ]}
                      >
                        Last used:{" "}
                        {new Date(biometricLastUsed).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.toggle,
                    biometricEnabled ? styles.toggleOn : styles.toggleOff,
                    !biometricEnrolled && styles.toggleDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      biometricEnabled
                        ? styles.toggleTextOn
                        : styles.toggleTextOff,
                    ]}
                  >
                    {biometricEnabled ? "ON" : "OFF"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Biometric Setup (when not yet configured) */}
            {biometricSupported && !biometricEnabled && biometricEnrolled && (
              <View style={styles.setupPrompt}>
                <Ionicons name="information-circle" size={20} color="#00f5ff" />
                <View style={styles.setupPromptText}>
                  <Text style={styles.setupPromptTitle}>
                    Set Up Biometric Login
                  </Text>
                  <Text style={styles.setupPromptSubtitle}>
                    Enable quick and secure sign-in with your fingerprint or
                    face recognition.
                  </Text>
                </View>
              </View>
            )}

            {/* Security Info Display */}
            {biometricSupported && biometricEnabled && (
              <View style={styles.infoItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Security Status</Text>
                    <Text
                      style={[styles.settingSubtitle, { color: "#10B981" }]}
                    >
                      Biometric login is active and secure
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Initial Biometric Setup Guide */}
            {biometricSupported && !biometricEnabled && !biometricEnrolled && (
              <TouchableOpacity
                style={styles.setupGuideItem}
                onPress={() =>
                  Alert.alert(
                    "Set Up Biometric Authentication",
                    "To use biometric login:\n\n1. Go to your device Settings\n2. Find Security or Biometrics\n3. Set up fingerprint or face recognition\n4. Come back here to enable biometric login",
                    [{ text: "OK" }],
                  )
                }
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="finger-print-outline"
                    size={24}
                    color="#FFA500"
                  />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>
                      Enable Biometric Login
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      Set up fingerprint or face recognition for quick access
                    </Text>
                  </View>
                </View>
                <View style={styles.setupBadge}>
                  <Text style={styles.setupBadgeText}>SETUP</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Backup Authentication */}
            {biometricSupported && biometricEnabled && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  if (hasBackupMethods) {
                    Alert.alert(
                      "Backup Methods",
                      "You have backup authentication methods set up. You can test them or disable them.",
                      [
                        {
                          text: "Test Backup",
                          onPress: () =>
                            BiometricBackupManager.showFallbackOptions(),
                        },
                        {
                          text: "Disable Backup",
                          onPress: async () => {
                            await BiometricBackupManager.disableBiometricBackup();
                            setHasBackupMethods(false);
                            Alert.alert("Success", "Backup methods disabled.");
                          },
                        },
                        { text: "Cancel", style: "cancel" },
                      ],
                    );
                  } else {
                    setShowBackupSetup(true);
                  }
                  setShowSettingsMenu(false);
                }}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name={hasBackupMethods ? "key" : "key-outline"}
                    size={24}
                    color={hasBackupMethods ? "#00f5ff" : "#9CA3AF"}
                  />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>
                      Backup Authentication
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      {hasBackupMethods
                        ? "Backup methods configured"
                        : "Set up backup authentication methods"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            )}

            {/* Additional Settings */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Theme settings will be available in the next update.",
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons name="color-palette" size={24} color="#9CA3AF" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Theme</Text>
                  <Text style={styles.settingSubtitle}>
                    Customize appearance
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Notification settings will be available in the next update.",
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={24} color="#9CA3AF" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Notifications</Text>
                  <Text style={styles.settingSubtitle}>Manage your alerts</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                Alert.alert(
                  "Privacy & Security",
                  "Your data is encrypted and stored securely. Biometric data never leaves your device.",
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Privacy & Security</Text>
                  <Text style={styles.settingSubtitle}>
                    Data protection info
                  </Text>
                </View>
              </View>
              <Ionicons name="information-circle" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showEditProfile}
        onRequestClose={cancelProfileEdit}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={cancelProfileEdit}>
              <Text style={styles.editModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={saveProfileChanges}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#00f5ff" size="small" />
              ) : (
                <Text style={styles.editModalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalContent}>
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Personal Information</Text>

              <View style={styles.editFieldContainer}>
                <Text style={styles.editFieldLabel}>First Name</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="Enter your first name"
                  placeholderTextColor="#666"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.editFieldContainer}>
                <Text style={styles.editFieldLabel}>Last Name</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Enter your last name"
                  placeholderTextColor="#666"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Account Information</Text>
              <View style={styles.editFieldContainer}>
                <Text style={styles.editFieldLabel}>Email</Text>
                <Text style={styles.readOnlyField}>{email}</Text>
                <Text style={styles.readOnlyNote}>
                  Email cannot be changed here
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Backup Authentication Setup Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showBackupSetup}
        onRequestClose={() => setShowBackupSetup(false)}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => setShowBackupSetup(false)}>
              <Text style={styles.editModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Backup Authentication</Text>
            <TouchableOpacity onPress={setupBackupMethods}>
              <Text style={styles.editModalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalContent}>
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>PIN Backup</Text>
              <Text style={styles.backupDescription}>
                Set up a PIN as a backup method for biometric authentication.
                This PIN will allow you to sign in if biometric authentication
                fails.
              </Text>

              <View style={styles.editFieldContainer}>
                <Text style={styles.editFieldLabel}>
                  Backup PIN (4-6 digits)
                </Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={backupPin}
                  onChangeText={setBackupPin}
                  placeholder="Enter backup PIN"
                  placeholderTextColor="#666"
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <View style={styles.editFieldContainer}>
                <Text style={styles.editFieldLabel}>Confirm PIN</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  placeholder="Confirm backup PIN"
                  placeholderTextColor="#666"
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.securityNotice}>
              <Ionicons name="information-circle" size={20} color="#00f5ff" />
              <Text style={styles.securityNoticeText}>
                Your backup PIN is encrypted and stored securely. It never
                leaves your device unencrypted.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Profile Header
  profileHeader: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: "#111827",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#00f5ff",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1f2937",
    borderWidth: 4,
    borderColor: "#00f5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#00f5ff",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00f5ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#111827",
  },
  loadingIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#0b1220",
    fontWeight: "800",
  },
  displayName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 12,
    textAlign: "center",
  },
  roleBadge: {
    backgroundColor: "#00f5ff",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0b1220",
  },
  // Info Section
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    lineHeight: 18,
  },
  // Sign Out Button
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 24,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B6B",
    marginLeft: 8,
  },
  // Settings Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#1f2937",
    borderRadius: 16,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 50,
    alignItems: "center",
  },
  toggleOn: {
    backgroundColor: "#00f5ff",
    borderColor: "#00f5ff",
  },
  toggleOff: {
    backgroundColor: "transparent",
    borderColor: "#666",
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  toggleTextOn: {
    color: "#0b1220",
  },
  toggleTextOff: {
    color: "#9CA3AF",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#1f2937",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  editButton: {
    padding: 8,
    backgroundColor: "rgba(0, 245, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00f5ff",
  },
  // Profile Edit Modal
  editModalContainer: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  editModalCancel: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  editModalSave: {
    fontSize: 16,
    color: "#00f5ff",
    fontWeight: "700",
  },
  editModalContent: {
    flex: 1,
    padding: 24,
  },
  editSection: {
    marginBottom: 32,
  },
  editSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
  },
  editFieldContainer: {
    marginBottom: 20,
  },
  editFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 8,
  },
  editFieldInput: {
    backgroundColor: "#111827",
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  readOnlyField: {
    backgroundColor: "#1f2937",
    color: "#9CA3AF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  readOnlyNote: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  backupDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
    marginBottom: 20,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(0, 245, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 255, 0.2)",
  },
  securityNoticeText: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  setupPrompt: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(0, 245, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 255, 0.2)",
  },
  setupPromptText: {
    marginLeft: 12,
    flex: 1,
  },
  setupPromptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00f5ff",
    marginBottom: 4,
  },
  setupPromptSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
  },
  setupGuideItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 165, 0, 0.1)",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 165, 0, 0.3)",
  },
  setupBadge: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  setupBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  ctaCard: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00f5ff',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  setupGuideCard: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  setupGuideContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  setupGuideText: {
    flex: 1,
    marginLeft: 12,
  },
  setupGuideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA500',
    marginBottom: 4,
  },
  setupGuideSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});
