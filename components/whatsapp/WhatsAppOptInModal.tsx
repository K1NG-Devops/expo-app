import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useWhatsAppConnection } from '../../hooks/useWhatsAppConnection'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { track } from '../../lib/analytics'
import { useAuth } from '../../contexts/AuthContext'
import { convertToE164, formatAsUserTypes, validatePhoneNumber, EXAMPLE_PHONE_NUMBERS } from '../../lib/utils/phoneUtils'

interface WhatsAppOptInModalProps {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const WhatsAppOptInModal: React.FC<WhatsAppOptInModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    connectionStatus,
    isOptingIn,
    optIn,
    optOut,
    getWhatsAppDeepLink,
    formatPhoneNumber,
    optInError,
    sendTestMessage,
    isSendingTest,
  } = useWhatsAppConnection()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [step, setStep] = useState<'phone' | 'consent' | 'success' | 'connected'>('phone')
  const modalOpenedAtRef = useRef<Date | null>(null)
  const prevVisibleRef = useRef<boolean>(false)

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      // Modal opened
      modalOpenedAtRef.current = new Date()
      track('edudash.whatsapp.modal_opened', {
        current_status: connectionStatus.isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      })

      // Reset form when modal opens
      if (connectionStatus.isConnected) {
        setStep('connected')
        if (connectionStatus.contact) {
          setPhoneNumber(connectionStatus.contact.phone_e164)
        }
      } else {
        setStep('phone')
        setPhoneNumber('')
        setConsentGiven(false)
      }
    } else if (!visible && prevVisibleRef.current) {
      // Modal closed
      const openedAt = modalOpenedAtRef.current
      if (openedAt) {
        const sessionDuration = Date.now() - openedAt.getTime()
        track('edudash.whatsapp.modal_closed', {
          final_status: connectionStatus.isConnected ? 'connected' : 'disconnected',
          session_duration_ms: sessionDuration
        })
      }
      modalOpenedAtRef.current = null
    }

    prevVisibleRef.current = visible
  }, [visible, connectionStatus.isConnected, connectionStatus.contact])

  // Use the new phone validation utility
  const validatePhone = (phone: string) => {
    return validatePhoneNumber(phone).isValid;
  }

  // Handle phone number input with auto-formatting
  const handlePhoneChange = (text: string) => {
    const formatted = formatAsUserTypes(text);
    setPhoneNumber(formatted);
  }

  const handlePhoneSubmit = () => {
    const validation = validatePhoneNumber(phoneNumber);
    
    if (!validation.isValid) {
      // Track validation failure
      const digitsOnly = phoneNumber.replace(/\D/g, '')
      let errorType: 'format' | 'length' | 'country' = 'format'
      
      if (digitsOnly.length < 9) {
        errorType = 'length'
      } else if (!digitsOnly.startsWith('0') && !digitsOnly.startsWith('27')) {
        errorType = 'country'
      }
      
      track('edudash.whatsapp.phone_validation_failed', {
        phone_input: phoneNumber.substring(0, 3) + '***', // Partial for privacy
        error_type: errorType
      })
      
      Alert.alert(
        'Invalid Phone Number',
        validation.message || 'Please enter a valid South African mobile number',
        [{ text: t('common.ok') }]
      )
      return
    }
    
    // Convert to E.164 format for storage
    const e164Result = convertToE164(phoneNumber);
    if (e164Result.isValid && e164Result.e164) {
      setPhoneNumber(e164Result.e164); // Update to E.164 format
    }
    
    setStep('consent')
  }

  const handleOptIn = async () => {
    if (!consentGiven) {
      // Track consent declined
      track('edudash.whatsapp.consent_declined', {
        user_id: user?.id || '',
        step: 'consent',
        timestamp: new Date().toISOString()
      })
      
      Alert.alert(
        t('whatsapp:consentRequired'),
        t('whatsapp:consentRequiredMessage'),
        [{ text: t('common.ok') }]
      )
      return
    }

    // Track consent given
    track('edudash.whatsapp.consent_given', {
      user_id: user?.id || '',
      timestamp: new Date().toISOString()
    })

    try {
      await optIn(phoneNumber, true)
      setStep('success')
      onSuccess?.()
    } catch (error) {
      console.error('WhatsApp opt-in failed:', error)
      Alert.alert(
        t('whatsapp:optInFailed'),
        t('whatsapp:optInFailedMessage'),
        [{ text: t('common.ok') }]
      )
    }
  }

  const handleOptOut = async () => {
    Alert.alert(
      t('whatsapp:confirmOptOut'),
      t('whatsapp:confirmOptOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('whatsapp:optOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await optOut()
              setStep('phone')
              setPhoneNumber('')
              setConsentGiven(false)
            } catch (error) {
              console.error('WhatsApp opt-out failed:', error)
            }
          }
        }
      ]
    )
  }

  const handleOpenWhatsApp = () => {
    const deepLink = getWhatsAppDeepLink()
    if (deepLink) {
      Linking.openURL(deepLink).catch(err => {
        console.error('Failed to open WhatsApp:', err)
        Alert.alert(
          t('whatsapp:openFailed'),
          t('whatsapp:openFailedMessage'),
          [{ text: t('common.ok') }]
        )
      })
    }
  }

  const handleSendTestMessage = async () => {
    try {
      await sendTestMessage()
      Alert.alert(
        t('whatsapp:testMessageSent'),
        t('whatsapp:testMessageSentMessage'),
        [{ text: t('common.ok') }]
      )
    } catch (error) {
      Alert.alert(
        t('whatsapp:testMessageFailed'),
        t('whatsapp:testMessageFailedMessage'),
        [{ text: t('common.ok') }]
      )
    }
  }

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxWidth: 400,
      width: '90%',
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
      marginLeft: 12,
    },
    closeButton: {
      padding: 4,
    },
    content: {
      padding: 20,
    },
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
      marginHorizontal: 4,
    },
    stepDotActive: {
      backgroundColor: '#25D366',
    },
    stepDotCompleted: {
      backgroundColor: theme.primary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 8,
    },
    phoneInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
      marginBottom: 20,
    },
    phoneInputFocused: {
      borderColor: theme.primary,
      borderWidth: 2,
    },
    phoneHint: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: -16,
      marginBottom: 20,
    },
    consentContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 4,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    consentText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    consentLink: {
      color: theme.primary,
      textDecorationLine: 'underline',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    button: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
    },
    buttonDestructive: {
      backgroundColor: '#FF4757',
    },
    buttonDisabled: {
      backgroundColor: theme.border,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    buttonTextSecondary: {
      color: theme.text,
    },
    successContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#25D366',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    successTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    successDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    connectedInfo: {
      backgroundColor: '#25D366',
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    connectedText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 12,
      flex: 1,
    },
    phoneDisplay: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 20,
    },
    actionButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    actionButtonText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    loadingText: {
      marginLeft: 8,
      color: theme.textSecondary,
    },
  })

  const renderPhoneStep = () => (
    <View>
      <Text style={styles.sectionTitle}>{t('whatsapp:enterPhoneTitle')}</Text>
      <Text style={styles.description}>
        {t('whatsapp:enterPhoneDescription')}
      </Text>
      
      <Text style={styles.inputLabel}>{t('whatsapp:phoneNumberLabel')}</Text>
      <TextInput
        style={styles.phoneInput}
        value={phoneNumber}
        onChangeText={handlePhoneChange}
        placeholder={EXAMPLE_PHONE_NUMBERS.local}
        placeholderTextColor={theme.textSecondary}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={13} // Allow for formatted input
      />
      <Text style={styles.phoneHint}>
        {t('whatsapp:phoneHint')}
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={onClose}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            !validatePhone(phoneNumber) && styles.buttonDisabled
          ]}
          onPress={handlePhoneSubmit}
          disabled={!validatePhone(phoneNumber)}
        >
          <Text style={styles.buttonText}>
            {t('common.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderConsentStep = () => (
    <View>
      <Text style={styles.sectionTitle}>{t('whatsapp:consentTitle')}</Text>
      <Text style={styles.description}>
        {t('whatsapp:consentDescription')}
      </Text>

      <TouchableOpacity
        style={styles.consentContainer}
        onPress={() => setConsentGiven(!consentGiven)}
      >
        <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
          {consentGiven && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
        </View>
        <Text style={styles.consentText}>
          {t('whatsapp:consentText')}{' '}
          <Text style={styles.consentLink}>
            {t('whatsapp:privacyPolicy')}
          </Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setStep('phone')}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            {t('common.back')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            (!consentGiven || isOptingIn) && styles.buttonDisabled
          ]}
          onPress={handleOptIn}
          disabled={!consentGiven || isOptingIn}
        >
          {isOptingIn ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.buttonText, styles.loadingText]}>
                {t('whatsapp:connecting')}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {t('whatsapp:connect')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderSuccessStep = () => (
    <View>
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>
          {t('whatsapp:connectionSuccessTitle')}
        </Text>
        <Text style={styles.successDescription}>
          {t('whatsapp:connectionSuccessDescription')}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleOpenWhatsApp}
      >
        <Text style={styles.actionButtonText}>
          {t('whatsapp:openWhatsApp')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleSendTestMessage}
        disabled={isSendingTest}
      >
        {isSendingTest ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.loadingText}>
              {t('whatsapp:sendingTest')}
            </Text>
          </View>
        ) : (
          <Text style={styles.actionButtonText}>
            {t('whatsapp:sendTestMessage')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={onClose}
      >
        <Text style={styles.buttonText}>
          {t('common.done')}
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderConnectedStep = () => (
    <View>
      <View style={styles.connectedInfo}>
        <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
        <Text style={styles.connectedText}>
          {t('whatsapp:alreadyConnected')}
        </Text>
      </View>

      {connectionStatus.contact && (
        <Text style={styles.phoneDisplay}>
          {t('whatsapp:connectedPhone')}: {formatPhoneNumber(connectionStatus.contact.phone_e164)}
        </Text>
      )}

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleOpenWhatsApp}
      >
        <Text style={styles.actionButtonText}>
          {t('whatsapp:openWhatsApp')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleSendTestMessage}
        disabled={isSendingTest}
      >
        {isSendingTest ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.loadingText}>
              {t('whatsapp:sendingTest')}
            </Text>
          </View>
        ) : (
          <Text style={styles.actionButtonText}>
            {t('whatsapp:sendTestMessage')}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonDestructive]}
          onPress={handleOptOut}
        >
          <Text style={styles.buttonText}>
            {t('whatsapp:disconnect')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>
            {t('common.done')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={styles.headerTitle}>
              {t('whatsapp:title')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 'phone' && renderPhoneStep()}
            {step === 'consent' && renderConsentStep()}
            {step === 'success' && renderSuccessStep()}
            {step === 'connected' && renderConnectedStep()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default WhatsAppOptInModal