/**
 * Capacitor Push Notifications Service
 * 
 * Handles push notification registration, permission requests,
 * and FCM token management for native mobile platforms.
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '~/lib/firebase/config';

export async function registerPushNotifications(userId: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Not on native platform, skipping registration');
    return null;
  }

  try {
    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    
    if (permResult.receive !== 'granted') {
      console.warn('[Push] Permission not granted');
      return null;
    }

    // Register with FCM / APNs
    await PushNotifications.register();

    // Listen for FCM token
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', async (token) => {
        console.log('[Push] FCM Token:', token.value);

        // Save token to Firestore user profile
        try {
          if (!db) {
            console.warn('[Push] Firestore not initialized');
            resolve(token.value);
            return;
          }
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmToken: token.value,
            fcmTokenUpdatedAt: new Date(),
          });
          console.log('[Push] Token saved to Firestore');
        } catch (e) {
          console.error('[Push] Failed to save token:', e);
        }

        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[Push] Registration error:', error);
        resolve(null);
      });
    });
  } catch (e) {
    console.error('[Push] Registration failed:', e);
    return null;
  }
}

export function setupPushListeners() {
  if (!Capacitor.isNativePlatform()) return;

  // Handle received notifications while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Notification received:', notification);
    // You can show an in-app toast/banner here
  });

  // Handle notification tap (app opened from notification)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] Notification action:', action);
    const data = action.notification.data;
    
    // Navigate based on notification data
    if (data?.orderId) {
      window.location.href = `/order/${data.orderId}`;
    }
  });
}
