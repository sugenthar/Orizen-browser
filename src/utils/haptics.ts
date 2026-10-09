import * as Haptics from 'expo-haptics';

/**
 * Lightweight tactile feedback. Fire-and-forget and fully guarded: haptics
 * must never break a press handler or crash the app.
 */
export function tap(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // haptics unavailable — taps still work
  }
}

export function confirm(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch {
    // ignore
  }
}
