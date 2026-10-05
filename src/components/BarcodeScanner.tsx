import { useEffect, useRef, useState } from 'react';
import type { ReaderOptions } from 'zxing-wasm/reader';
// Bundled with the app so decoding works offline (the library's default is a CDN fetch).
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { enhance, type EnhanceOptions } from '../lib/enhance';

interface Props {
  /** Called with the decoded barcode text. The caller decides what to do with repeats. */
  onDecode: (text: string) => void;
  /** Pause decoding briefly after a successful scan to avoid re-firing on the same card. */
  cooldownMs?: number;
}

/** Gap between decode passes. Lower is snappier but costs more CPU on slow phones. */
const SCAN_INTERVAL_MS = 30;
/**
 * Zoom applied when the camera supports it. Phone lenses cannot focus on a
 * card held a few centimetres away, so zooming lets the card sit further back
 * (in focus) while the barcode still fills the brackets. Tune per device range.
 */
const CAMERA_ZOOM = 2;
/** Matches the 4:3 .scanner-frame the video is cropped to with object-fit: cover. */
const PREVIEW_ASPECT = 4 / 3;
/** The aiming brackets plus a margin, as a fraction of the visible preview. */
const BOX = { width: 0.9, height: 0.6 };
/** An enhanced read only counts once the same value shows up again within this window. */
const CONFIRM_WINDOW_MS = 2000;

/** 1D formats used on ID cards. 2D codes are skipped to keep each pass fast. */
const READER_OPTIONS: ReaderOptions = {
  formats: ['Code128', 'Code39', 'Code93', 'Codabar', 'ITF', 'EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'],
  tryHarder: true,
  tryRotate: true,
  tryInvert: false,
  tryDownscale: true,
  maxNumberOfSymbols: 1,
};
const NATIVE_FORMATS = ['code_128', 'code_39', 'code_93', 'codabar', 'itf', 'ean_13', 'ean_8', 'upc_a', 'upc_e'];

/**
 * Rescue attempts for frames the plain read cannot decode, one per pass in
 * rotation. `half` works at half resolution (faster, and itself a denoiser),
 * `rotate` turns the frame so a steeply tilted barcode lies flat (the decoder
 * alone copes with about 18 degrees either way, and with sideways cards).
 */
interface Attempt extends EnhanceOptions {
  half?: boolean;
  double?: boolean;
  rotate?: number;
  whole?: boolean;
}
const ATTEMPTS: Attempt[] = [
  { half: true, smooth: 5 }, // bright surroundings, glare, noise
  { sharpen: 1.5 }, // soft focus
  { rotate: -30, half: true },
  { half: true, smooth: 5 },
  { sharpen: 3, smooth: 5 }, // heavier blur
  { rotate: 30, half: true },
  { whole: true, half: true }, // barcode outside the brackets
  { rotate: 60, half: true },
  { rotate: -60, half: true },
];

/**
 * Extra attempt for low resolution cameras (720p laptop webcams), run on every
 * other pass. Their fixed focus only gets a card sharp at arm's length, where
 * each bar is under two pixels wide; enlarging before sharpening is what makes
 * those frames readable. Measured on real webcam frames: stronger sharpening
 * than this starts inventing wrong values.
 */
const LOW_RES_ATTEMPT: Attempt = { double: true, sharpen: 1.5 };
const LOW_RES_MAX_HEIGHT = 720;

interface NativeDetector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
interface NativeDetectorClass {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

/** The browser's built in detector (ML Kit on Android), where it exists and reads Code 128. */
async function createNativeDetector(): Promise<NativeDetector | null> {
  const Native = (window as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (!Native) return null;
  try {
    const supported = await Native.getSupportedFormats();
    if (!supported.includes('code_128')) return null;
    return new Native({ formats: NATIVE_FORMATS.filter((format) => supported.includes(format)) });
  } catch {
    return null; // present but unusable, for example without Play Services
  }
}

const hasAutofocus = (track: MediaStreamTrack) =>
  !!(track.getCapabilities?.() as { focusMode?: string[] } | undefined)?.focusMode?.includes('continuous');

/**
 * Opens a rear camera that can autofocus. Phones with several rear lenses
 * often hand back a fixed focus wide angle lens for `facingMode: environment`,
 * and a card held at scanning distance is hopelessly blurred through it. When
 * the default lens cannot autofocus, the other rear lenses are tried in turn.
 */
async function openCamera(): Promise<MediaStream> {
  // Ask for high resolution. Browsers default to 640x480, where the narrow
  // bars of an ID card barcode blur together.
  const open = (which: MediaTrackConstraints) =>
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, ...which } });

  const first = await open({ facingMode: 'environment' });
  const firstTrack = first.getVideoTracks()[0];
  if (hasAutofocus(firstTrack)) return first;

  // Labels are only filled in once permission is granted, which it now is.
  const others = (await navigator.mediaDevices.enumerateDevices())
    .filter((d) => d.kind === 'videoinput' && /back|rear|environment/i.test(d.label) && d.deviceId !== firstTrack.getSettings().deviceId)
    .sort((a, b) => a.label.localeCompare(b.label));
  if (!others.length) return first; // laptops and single lens phones
  firstTrack.stop(); // Android cannot hold two cameras open at once
  for (const device of others) {
    try {
      const stream = await open({ deviceId: { exact: device.deviceId } });
      const track = stream.getVideoTracks()[0];
      if (hasAutofocus(track)) return stream;
      track.stop();
    } catch {
      // This lens could not be opened; try the next one.
    }
  }
  return open({ facingMode: 'environment' });
}

/** Best effort: keep refocusing and zoom in, on cameras that expose those controls. */
function tuneCamera(track: MediaStreamTrack) {
  const caps = (track.getCapabilities?.() ?? {}) as { focusMode?: string[]; zoom?: { min: number; max: number } };
  const advanced: Record<string, unknown> = {};
  if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous';
  if (caps.zoom) advanced.zoom = Math.min(Math.max(CAMERA_ZOOM, caps.zoom.min), caps.zoom.max);
  if (Object.keys(advanced).length) {
    track.applyConstraints({ advanced: [advanced] } as MediaTrackConstraints).catch(() => {});
  }
}

/**
 * Continuous camera decoder for 1D barcodes (Code 128 etc, the format used on
 * the college ID cards). Renders the live video feed and reports every decoded
 * value, throttled by cooldownMs.
 *
 * Each pass tries, in order: the platform detector, a plain read of the whole
 * visible frame, then one enhanced rescue attempt (see ATTEMPTS). Plain reads
 * are trusted at once. Enhanced reads work on amplified, noisier pixels, so a
 * value is only reported once it has been seen twice.
 */
export default function BarcodeScanner({ onDecode, cooldownMs = 1200 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('this page needs HTTPS (or localhost) to use the camera');
      }
      // The decoder is large; load it only when the scan screen mounts.
      const [zxing, native, media] = await Promise.all([
        import('zxing-wasm/reader'),
        createNativeDetector(),
        openCamera(),
      ]);
      stream = media;
      const video = videoRef.current;
      if (cancelled || !video) return stop();
      zxing.prepareZXingModule({
        overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
      });
      tuneCamera(stream.getVideoTracks()[0]);
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      /** Copies the centre of the visible preview, optionally rotated and scaled, off the video. */
      const grab = (widthFraction: number, heightFraction: number, scale: number, rotate = 0) => {
        const visibleW = Math.min(video.videoWidth, video.videoHeight * PREVIEW_ASPECT);
        canvas.width = Math.round(visibleW * widthFraction * scale);
        canvas.height = Math.round((visibleW / PREVIEW_ASPECT) * heightFraction * scale);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.scale(scale, scale);
        ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      const read = async (image: ImageData) => (await zxing.readBarcodes(image, READER_OPTIONS))[0]?.text;

      const lowRes = Math.min(video.videoWidth, video.videoHeight) <= LOW_RES_MAX_HEIGHT;
      const attempts = lowRes ? ATTEMPTS.flatMap((a) => [LOW_RES_ATTEMPT, a]) : ATTEMPTS;
      let attempt = 0;
      let sighting = { text: '', at: 0 };
      let nativeOk = !!native;

      /** One pass over the current frame. Returns a value only when it is safe to report. */
      const readFrame = async (): Promise<string | undefined> => {
        if (!video.videoWidth) return;
        if (nativeOk) {
          try {
            const text = (await native!.detect(video))[0]?.rawValue;
            if (text) return text;
          } catch {
            // Advertised but not working (for example its model never downloaded): stop asking.
            nativeOk = false;
          }
        }
        const plain = await read(grab(1, 1, 1));
        if (plain) return plain;

        const { half, double, rotate, whole, ...options } = attempts[attempt];
        const scale = half ? 0.5 : double ? 2 : 1;
        const frame = whole ? grab(1, 1, scale) : grab(BOX.width, BOX.height, scale, rotate);
        const text = await read(new ImageData(enhance(frame, options), frame.width, frame.height));
        if (!text) {
          attempt = (attempt + 1) % attempts.length;
          return;
        }
        // Stay on the attempt that worked so the confirming read comes on the next pass.
        const confirmed = text === sighting.text && Date.now() - sighting.at < CONFIRM_WINDOW_MS;
        sighting = { text, at: Date.now() };
        return confirmed ? text : undefined;
      };

      const scan = async () => {
        let wait = SCAN_INTERVAL_MS;
        try {
          const text = await readFrame();
          if (cancelled) return;
          if (text) {
            sighting = { text: '', at: 0 };
            onDecode(text);
            wait = cooldownMs;
          }
        } catch {
          // A frame that could not be read (for example mid camera switch); try the next one.
        }
        if (!cancelled) timer = setTimeout(scan, wait);
      };
      scan();
    }

    function stop() {
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    }

    start().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not access the camera');
    });

    return () => {
      cancelled = true;
      stop();
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
      <div className="scanner-guide" aria-hidden="true" />
    </div>
  );
}
