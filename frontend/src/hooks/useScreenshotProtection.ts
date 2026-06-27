import { useEffect } from "react";
import { Platform } from "react-native";
import * as ScreenCapture from "expo-screen-capture";

/**
 * Prevents screenshots & screen recording while the screen is mounted.
 * - Android: FLAG_SECURE — completely blocks screenshots & recording (only in dev/production builds, NOT Expo Go).
 * - iOS: cannot block, but `addScreenshotListener` lets us react if a user does screenshot.
 * - Web: native API not available, no-op.
 */
export function useScreenshotProtection(onAttempt?: () => void) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    let sub: { remove: () => void } | undefined;
    let alive = true;

    (async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch {}
      if (!alive) return;
      try {
        sub = ScreenCapture.addScreenshotListener(() => {
          onAttempt?.();
        });
      } catch {}
    })();

    return () => {
      alive = false;
      try { sub?.remove(); } catch {}
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [onAttempt]);
}
