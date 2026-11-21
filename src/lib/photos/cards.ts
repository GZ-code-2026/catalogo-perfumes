import "server-only";
import type { PerfumeSummary, SimilarItem } from "../tenml/types";
import { getPhotoService } from "./index";

export interface CardData {
  id: string;
  name: string;
  house: string;
  family?: string;
  imageUrl: string | null;
}

// Junta cada perfume com a foto que já está em cache (nunca chama a Fragella).
export async function toCards(items: (PerfumeSummary | SimilarItem)[]): Promise<CardData[]> {
  const fotos = await getPhotoService().getPhotosCacheOnly(
    items.map((item) => ({ id: item.id, name: item.name, house: item.house })),
  );

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    house: item.house,
    family: "family" in item ? item.family : undefined,
    imageUrl: fotos.get(item.id) ?? null,
  }));
}
