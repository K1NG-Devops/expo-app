import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth, useLogin, useRegister, useLogout } from '../../lib/auth/useAuth';

/**
 * Login Form Component
 * Handles user authentication with email and password
 */
export const LoginForm: React.FC<{
  onLoginSuccess?: () => void;
  onSwitchToRegister?: () => void;
}> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useLogin();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    const result = await login({ email: email.trim(), password });
    
    if (result.success) {
      Alert.alert('Success', 'Login successful!');
      onLoginSuccess?.();
    } else {
      Alert.alert('Login Failed', result.error || 'An error occurred');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          <Text style={styles.title}>Sign In to EduDash Pro</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Text style={styles.errorDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {onSwitchToRegister && (
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onSwitchToRegister}>
                <Text style={styles.switchLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/**
 * Registration Form Component
 * Handles student account creation
 */
export const RegisterForm: React.FC<{
  onRegisterSuccess?: () => void;
  onSwitchToLogin?: () => void;
}> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, isLoading, error, clearError } = useRegister();

  const handleRegister = async () => {
    // Basic validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const result = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
    });
    
    if (result.success) {
      const message = result.requiresEmailVerification
        ? 'Registration successful! Please check your email to verify your account.'
        : 'Registration successful! You are now logged in.';
      
      Alert.alert('Success', message);
      onRegisterSuccess?.();
    } else {
      Alert.alert('Registration Failed', result.error || 'An error occurred');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Join EduDash Pro as a student</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Text style={styles.errorDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Create a strong password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Text style={styles.hint}>
              Minimum 12 characters with uppercase, lowercase, numbers, and symbols
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {onSwitchToLogin && (
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <TouchableOpacity onPress={onSwitchToLogin}>
                <Text style={styles.switchLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/**
 * User Profile Component
 * Displays current user information and logout option
 */
export const UserProfile: React.FC = () => {
  const { profile, user, isAdmin, isInstructor, isStudent } = useAuth();
  const { logout, isLoading } = useLogout();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const result = await logout();
            if (result.success) {
              Alert.alert('Success', 'Logged out successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  if (!profile || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No user profile found</Text>
      </View>
    );
  }

  const getRoleBadgeColor = () => {
    if (isAdmin) return '#e74c3c';
    if (isInstructor) return '#3498db';
    if (isStudent) return '#2ecc71';
    return '#95a5a6';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileContainer}>
        <Text style={styles.title}>Your Profile</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileName}>
              {profile.first_name} {profile.last_name}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor() }]}>
              <Text style={styles.roleBadgeText}>{profile.role?.toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={styles.profileEmail}>{profile.email}</Text>
          
          <View style={styles.profileDetails}>
            <Text style={styles.detailLabel}>Account Created:</Text>
            <Text style={styles.detailValue}>
              {new Date(profile.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.profileDetails}>
            <Text style={styles.detailLabel}>User ID:</Text>
            <Text style={styles.detailValue}>{profile.id}</Text>
          </View>

          {profile.capabilities && profile.capabilities.length > 0 && (
            <View style={styles.capabilitiesContainer}>
              <Text style={styles.detailLabel}>Capabilities:</Text>
              <View style={styles.capabilitiesList}>
                {profile.capabilities.map((capability, index) => (
                  <View key={index} style={styles.capabilityTag}>
                    <Text style={styles.capabilityText}>{capability}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, isLoading && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutButtonText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

/**
 * Authentication Guard Component
 * Shows different content based on authentication status
 */
export const AuthGuard: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireRole?: 'admin' | 'instructor' | 'student';
  requireCapability?: string;
}> = ({ children, fallback, requireRole, requireCapability }) => {
  const { authenticated, loading, initialized, profile } = useAuth();

  // Show loading state
  if (!initialized || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check authentication
  if (!authenticated) {
    return (
      <View style={styles.centerContainer}>
        {fallback || <Text style={styles.errorText}>Please login to continue</Text>}
      </View>
    );
  }

  // Check role requirement
  if (requireRole && profile?.role !== requireRole) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Access denied. This feature requires {requireRole} role.
        </Text>
      </View>
    );
  }

  // Check capability requirement
  if (requireCapability && !profile?.capabilities?.includes(requireCapability)) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Access denied. You don't have permission to access this feature.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 16,
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#666',
    fontSize: 14,
  },
  switchLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    flex: 1,
  },
  errorDismiss: {
    color: '#c62828',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  profileContainer: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  profileDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  capabilitiesContainer: {
    marginTop: 16,
  },
  capabilitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  capabilityTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  capabilityText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
});