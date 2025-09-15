import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// Show notifications while app is foregrounded (customize as needed)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // New Expo SDK requires these fields
    // See: https://docs.expo.dev/versions/latest/sdk/notifications/
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
})

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Android 8+ requires channel configuration for predictable behavior
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
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

  // Use your project ID from app.json extra.eas.projectId tied to this package
  const token = await Notifications.getExpoPushTokenAsync()
  return token.data ?? null
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
