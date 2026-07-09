export interface IccInfo {
  name: string;
  colorSpace: string;
  deviceClass: string;
  outputIntent: string | null;
}

export interface SpotColor {
  name: string;
  pageCount: number;
}

export interface PerPageProfile {
  pageNumber: number;
  colorSpaces: string[];
  spotColors: string[];
  flag: 'OK' | 'RGB';
}

export interface ColorProfileResult {
  verdict: string;
  documentColorSpaces: string[];
  stats: {
    totalPages: number;
    colorSpaceCount: number;
    spotColorCount: number;
  };
  icc: IccInfo | null;
  spotColors: SpotColor[];
  perPage: PerPageProfile[];
  note?: string;
}
