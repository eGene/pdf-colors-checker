declare module 'color.js' {
  export interface ProminentOptions {
    amount?: number;
    group?: number;
    sample?: number;
  }

  export function prominent(
    image: HTMLImageElement,
    options?: ProminentOptions,
  ): Promise<number[][]>;
}
