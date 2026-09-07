import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// No-op in a normal browser -- only wires up the hardware back button inside the native
// (Capacitor) shell. Without this, Android's back button does nothing at all inside a WebView,
// which reads as a broken app.
export function setupNativeBackButton() {
  if (!Capacitor.isNativePlatform()) return;

  CapacitorApp.addListener('backButton', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      CapacitorApp.exitApp();
    }
  });
}
