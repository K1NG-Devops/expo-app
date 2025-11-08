/**
 * Firebase Admin SDK for Server-Side Push Notifications
 * Uses environment variables set in Vercel for security
 */

interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
}

/**
 * Get Firebase service account from environment variables
 */
export function getFirebaseServiceAccount(): FirebaseServiceAccount | null {
  // Method 1: Individual environment variables (most secure)
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    return {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_CERT_URL ||
        'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    };
  }

  // Method 2: Base64-encoded JSON (alternative method)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        'base64'
      ).toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', error);
      return null;
    }
  }

  console.warn('⚠️ Firebase credentials not found in environment variables');
  return null;
}

/**
 * Get OAuth2 access token for Firebase Cloud Messaging
 */
export async function getFirebaseAccessToken(): Promise<string> {
  const serviceAccount = getFirebaseServiceAccount();
  
  if (!serviceAccount) {
    throw new Error('Firebase service account not configured');
  }

  const jwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Create JWT
  const jwt = await createJWT(jwtHeader, jwtClaimSet, serviceAccount.private_key);

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create a signed JWT using RS256
 */
async function createJWT(
  header: object,
  payload: object,
  privateKey: string
): Promise<string> {
  const encoder = new TextEncoder();

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const encodedSignature = base64UrlEncode(signature);
  return `${unsignedToken}.${encodedSignature}`;
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;
  
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    const binary = String.fromCharCode(...bytes);
    base64 = btoa(binary);
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Send push notification via Firebase Cloud Messaging
 */
export async function sendPushNotification(options: {
  token?: string;
  topic?: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
  tag?: string;
  requireInteraction?: boolean;
}): Promise<void> {
  const serviceAccount = getFirebaseServiceAccount();
  
  if (!serviceAccount) {
    console.warn('⚠️ Push notifications not configured - skipping');
    return;
  }

  const accessToken = await getFirebaseAccessToken();

  const message: any = {
    notification: {
      title: options.title,
      body: options.body,
      icon: options.icon || '/icon-192.png',
    },
    webpush: {
      notification: {
        icon: options.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      },
      fcm_options: {
        link: options.data?.url || '/dashboard',
      },
    },
    data: options.data || {},
  };

  // Add target (token or topic)
  if (options.token) {
    message.token = options.token;
  } else if (options.topic) {
    message.topic = options.topic;
  } else {
    throw new Error('Either token or topic must be provided');
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send push notification: ${error}`);
  }

  console.log('✅ Push notification sent successfully');
}

/**
 * Send deployment notification to all users subscribed to 'updates' topic
 */
export async function sendDeploymentNotification(version?: string): Promise<void> {
  try {
    await sendPushNotification({
      topic: 'updates',
      title: 'EduDash Pro Updated! 🎉',
      body: version
        ? `Version ${version} is now available. Refresh to update.`
        : 'A new version is available. Refresh to update.',
      icon: '/icon-512.png',
      tag: 'deployment',
      requireInteraction: true,
      data: {
        type: 'deployment',
        version: version || 'latest',
        url: '/dashboard',
      },
    });
  } catch (error) {
    console.error('Failed to send deployment notification:', error);
  }
}
