/**
 * Capacitor Native Plugin Initialization
 * 
 * This module initializes native plugins when running inside a Capacitor app.
 * It safely no-ops when running in a regular browser.
 */

import { Capacitor } from '@capacitor/core';

async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Capacitor] Running in browser mode');
    return;
  }

  console.log('[Capacitor] Initializing native plugins...');

  // Status Bar
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f172a' });
    console.log('[Capacitor] StatusBar configured');
  } catch (e) {
    console.warn('[Capacitor] StatusBar plugin not available:', e);
  }

  // Splash Screen
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    // Auto-hide after 2s (configured in capacitor.config.ts)
    // But we can also manually hide when app is ready
    setTimeout(async () => {
      await SplashScreen.hide();
    }, 2000);
    console.log('[Capacitor] SplashScreen configured');
  } catch (e) {
    console.warn('[Capacitor] SplashScreen plugin not available:', e);
  }

  // Keyboard
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    });
    console.log('[Capacitor] Keyboard listeners configured');
  } catch (e) {
    console.warn('[Capacitor] Keyboard plugin not available:', e);
  }

  // App (back button handling)
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
    console.log('[Capacitor] App back button configured');
  } catch (e) {
    console.warn('[Capacitor] App plugin not available:', e);
  }
}

// Run initialization
initCapacitor();

export { initCapacitor };
