/** Minimal shape of an RGBA frame, so this runs on a canvas ImageData or a plain test fixture. */
export interface Frame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface EnhanceOptions {
  /** Unsharp mask strength across the bars; recovers bars softened by poor focus. 0 is off. */
  sharpen?: number;
  /** Rows averaged above and below each pixel; cancels sensor noise without touching bar edges. 0 is off. */
  smooth?: number;
}

/** Summed-area table of `src` (optionally squared), so the sum over any box is four lookups. */
function integral(src: Float32Array, w: number, h: number, square: boolean): Float64Array {
  const out = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const v = src[y * w + x];
      row += square ? v * v : v;
      out[(y + 1) * (w + 1) + x + 1] = out[y * (w + 1) + x + 1] + row;
    }
  }
  return out;
}

/**
 * Prepares a camera frame for 1D barcode decoding and returns it as greyscale
 * RGBA. The last step rewrites every pixel relative to the mean and spread of
 * its own neighbourhood, so a barcode keeps full contrast under glare, in a
 * dim hall, or beside a bright table that would otherwise set the threshold.
 */
export function enhance({ width: w, height: h, data }: Frame, { sharpen = 0, smooth = 0 }: EnhanceOptions = {}): Uint8ClampedArray<ArrayBuffer> {
  let grey = new Float32Array(w * h);
  for (let i = 0, p = 0; i < grey.length; i++, p += 4) {
    grey[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  if (smooth) {
    // Average along the bars (vertically): noise cancels, edges stay sharp.
    const sums = integral(grey, w, h, false);
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - smooth);
      const y1 = Math.min(h, y + smooth + 1);
      for (let x = 0; x < w; x++) {
        const column = sums[y1 * (w + 1) + x + 1] - sums[y0 * (w + 1) + x + 1] - sums[y1 * (w + 1) + x] + sums[y0 * (w + 1) + x];
        next[y * w + x] = column / (y1 - y0);
      }
    }
    grey = next;
  }

  if (sharpen) {
    // Unsharp mask across the bars (horizontally) with a sliding window sum.
    const radius = 4;
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -radius; x < w; x++) {
        if (x + radius < w) sum += grey[row + x + radius];
        if (x - radius - 1 >= 0) sum -= grey[row + x - radius - 1];
        if (x < 0) continue;
        const count = Math.min(w - 1, x + radius) - Math.max(0, x - radius) + 1;
        next[row + x] = grey[row + x] + sharpen * (grey[row + x] - sum / count);
      }
    }
    grey = next;
  }

  // Local contrast normalisation.
  const sums = integral(grey, w, h, false);
  const squares = integral(grey, w, h, true);
  const radius = Math.max(12, Math.round(h / 6));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w, x + radius + 1);
      const count = (x1 - x0) * (y1 - y0);
      const a = y1 * (w + 1) + x1;
      const b = y0 * (w + 1) + x1;
      const c = y1 * (w + 1) + x0;
      const d = y0 * (w + 1) + x0;
      const mean = (sums[a] - sums[b] - sums[c] + sums[d]) / count;
      const spread = Math.sqrt(Math.max(0, (squares[a] - squares[b] - squares[c] + squares[d]) / count - mean * mean));
      // The floor on spread stops flat areas (blank card, table) being amplified into noise.
      const value = 128 + (72 * (grey[y * w + x] - mean)) / Math.max(spread, 6);
      const p = (y * w + x) * 4;
      out[p] = out[p + 1] = out[p + 2] = value; // clamped to 0..255 by the array
      out[p + 3] = 255;
    }
  }
  return out;
}
