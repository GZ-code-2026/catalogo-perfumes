export interface PerfumeSummary {
  id: string;
  name: string;
  house: string;
  year?: number;
  gender?: "men" | "women" | "unisex";
  family?: string;
  accords: string[];
  keyNotes: string[];
  character?: string;
}

export interface SimilarItem {
  id: string;
  name: string;
  house: string;
  closeness?: string;
  sharedNotes: string[];
}

export interface PerfumeDetail extends PerfumeSummary {
  concentration?: string;
  pyramid?: { top: string[]; heart: string[]; base: string[] };
  seasons: string[];
  occasions: string[];
  styles: string[];
  longevity?: number;
  projection?: number;
  perfumers: string[];
  similar: SimilarItem[];
}

export interface SearchPage {
  results: PerfumeSummary[];
  nextCursor: string | null;
  total: number;
}
