/** Short vibration to confirm a scan without the user looking at the screen. */
export function successFeedback(): void {
  if (navigator.vibrate) navigator.vibrate(80);
}

export function warningFeedback(): void {
  if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
}
