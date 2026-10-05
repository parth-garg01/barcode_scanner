import { describe, expect, it } from 'vitest';
import { enhance } from '../enhance';

describe('enhance', () => {
  it('gives low contrast bars full contrast regardless of a brightness gradient', () => {
    // Vertical bars 4px wide, only 20 grey levels apart, on a left to right
    // brightness ramp (as under glare) that is far larger than the bar contrast.
    const width = 160;
    const height = 60;
    const data = new Uint8ClampedArray(width * height * 4);
    const isBar = (x: number) => Math.floor(x / 4) % 2 === 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = 60 + x + (isBar(x) ? 0 : 20);
        data.set([value, value, value, 255], (y * width + x) * 4);
      }
    }

    const out = enhance({ width, height, data });

    const row = 30 * width * 4;
    for (let x = 20; x < width - 20; x++) {
      const value = out[row + x * 4];
      if (isBar(x)) expect(value).toBeLessThan(110);
      else expect(value).toBeGreaterThan(146);
    }
  });
});
