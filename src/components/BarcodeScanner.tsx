import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Called with the decoded barcode text. The caller decides what to do with repeats. */
  onDecode: (text: string) => void;
  /** Pause decoding briefly after a successful scan to avoid re-firing on the same card. */
  cooldownMs?: number;
}

/**
 * Wraps ZXing's continuous camera decoder for 1D barcodes (Code 128 etc, the
 * format used on the college ID cards). Renders the live video feed and
 * reports every decoded value, throttled by cooldownMs.
 */
export default function BarcodeScanner({ onDecode, cooldownMs = 1200 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let lastDecodeAt = 0;
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (!result) return;
        const now = Date.now();
        if (now - lastDecodeAt < cooldownMs) return;
        lastDecodeAt = now;
        onDecode(result.getText());
      })
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not access the camera'));

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownMs]);

  if (error) {
    return (
      <div className="card" role="alert">
        <p>Camera unavailable: {error}</p>
        <p className="muted">Use manual entry below instead.</p>
      </div>
    );
  }

  return (
    <div className="scanner-frame">
      <video ref={videoRef} className="scanner-video" muted playsInline aria-label="Camera preview for barcode scanning" />
    </div>
  );
}
