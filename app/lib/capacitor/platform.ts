/**
 * Capacitor Platform Utilities
 * 
 * Helper functions to detect the current platform and adjust
 * behavior accordingly.
 */

import { Capacitor } from '@capacitor/core';

/** Check if running inside a native app (Android/iOS) */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Check if running on Android */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** Check if running on iOS */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/** Check if running in web browser */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

/** Get the current platform name */
export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
}

/** Trigger haptic feedback on native */
export async function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!isNative()) return;

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[type] });
  } catch (e) {
    // Haptics not available, ignore silently
  }
}
