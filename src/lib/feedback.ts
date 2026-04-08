/** Short beep + vibration to confirm a scan without the user looking at the screen. */
export function successFeedback(): void {
  if (navigator.vibrate) navigator.vibrate(80);

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => ctx.close();
  } catch {
    // Audio isn't critical to the flow; vibration alone is enough on devices
    // that block autoplay or lack Web Audio.
  }
}

export function warningFeedback(): void {
  if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
}
