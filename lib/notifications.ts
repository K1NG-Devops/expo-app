import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import * as Application from 'expo-application'
import * as Localization from 'expo-localization'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

// Constant project ID for Expo push tokens (Android only scope for now)
// Matches extra.eas.projectId in app.config.js
const EXPO_PROJECT_ID = '253b1057-8489-44cf-b0e3-c3c10319a298'

// Show notifications while app is foregrounded (customize as needed)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // SDK >= 51 supports banner/list behavior on iOS
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
})

export type PushRegistrationResult = {
  status: 'registered' | 'denied' | 'skipped' | 'error'
  token?: string
  reason?: string
  message?: string
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Web or emulators/devices that don't support notifications should return null
  if (Platform.OS === 'web' || !Device.isDevice) return null

  // Android 8+ requires channel configuration for predictable behavior
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  // iOS requires explicit permission prompt; Android shows without prompt
  const settings = await Notifications.getPermissionsAsync()
  let status = settings.status
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync()
    status = req.status
  }
  if (status !== 'granted') return null

  // Bind token to this Expo project to ensure it works in internal/dev builds
  const token = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID })
  return token.data ?? null
}

export async function registerPushDevice(supabase: any, user: any): Promise<PushRegistrationResult> {
  try {
    // Skip registration on web or emulators
    if (Platform.OS === 'web' || !Device.isDevice) {
      return { status: 'skipped', reason: 'unsupported_platform' }
    }

    // Get device metadata
    const installationId = await Application.getInstallationIdAsync()
    const deviceMetadata = {
      platform: Platform.OS,
      brand: Device.brand,
      model: Device.modelName,
      osVersion: Device.osVersion,
      appVersion: Constants.expoConfig?.version,
      appBuild: Constants.expoConfig?.runtimeVersion,
      locale: Localization.getLocales?.()?.[0]?.languageTag || 'en',
      timezone: Localization.getCalendars?.()?.[0]?.timeZone || 'UTC',
      installationId,
    }

    // Get push token
    const token = await registerForPushNotificationsAsync()
    if (!token) {
      return { status: 'denied', reason: 'permissions_denied', message: 'Push notifications not permitted' }
    }

    // Upsert to database
    const { error } = await supabase
      .from('push_devices')
      .upsert({
        user_id: user.id,
        expo_push_token: token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        is_active: true,
        device_installation_id: installationId,
        device_metadata: deviceMetadata,
        language: deviceMetadata.locale,
        timezone: deviceMetadata.timezone,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,device_installation_id'
      })

    if (error) {
      console.error('Push device registration failed:', error)
      return { status: 'error', reason: 'database_error', message: error.message }
    }

    return { status: 'registered', token }
  } catch (error: any) {
    console.error('Push registration exception:', error)
    return { status: 'error', reason: 'exception', message: String(error) }
  }
}

export async function deregisterPushDevice(supabase: any, user: any): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return
    
    const installationId = await Application.getInstallationIdAsync()
    
    await supabase
      .from('push_devices')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('device_installation_id', installationId)
  } catch (error) {
    console.debug('Push device deregistration failed:', error)
  }
}

export async function scheduleLocalNotification(title: string, body: string) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // fire immediately
  })
}

export function onNotificationReceived(cb: (n: Notifications.Notification) => void) {
  const sub = Notifications.addNotificationReceivedListener(cb)
  return () => sub.remove()
}
