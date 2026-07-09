import { prominent } from 'color.js';
import type { PageClassification } from '@/types/analysis';

/** True when all prominent colors are within threshold of gray. */
export function isBwFromProminentColors(colors: number[][], threshold: number): boolean {
  for (let i = 0; i < colors.length; i++) {
    const r = colors[i][0];
    const g = colors[i][1];
    const b = colors[i][2];
    const average = (r + g + b) / 3;
    if (
      Math.abs(r - average) / 255 > threshold ||
      Math.abs(g - average) / 255 > threshold ||
      Math.abs(b - average) / 255 > threshold
    ) {
      return false;
    }
  }
  return true;
}

/** Classify a rendered page image as black-and-white or color. */
export async function classifyPageFromDataUrl(
  dataUrl: string,
  threshold: number,
): Promise<PageClassification> {
  const image = new Image();
  return new Promise((resolve, reject) => {
    image.onload = () => {
      prominent(image, {
        amount: Infinity,
        group: 1,
        sample: 1,
      })
        .then((colors) => {
          resolve(isBwFromProminentColors(colors, threshold) ? 'bw' : 'color');
        })
        .catch(reject);
    };
    image.onerror = () => reject(new Error('Failed to load page image'));
    image.src = dataUrl;
  });
}
