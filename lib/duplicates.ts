import type { DuplicatePair, Requirement } from "@/types";

/*
 * Deterministic near-duplicate detection (no AI call needed).
 * Words are lower-cased, stop words removed and long words cut to a 6-letter
 * stem, which is crude but works for both English and Russian inflection
 * ("лимит", "лимита", "лимиту" share a stem). Pairs are compared with Jaccard
 * similarity.
 */

const STOP_WORDS = new Set([
  "the", "and", "for", "shall", "must", "should", "will", "can", "may", "with", "that", "this", "are", "from",
  "when", "into", "have", "has", "not", "all", "any", "its", "their", "his", "her", "per", "via", "system",
  "для", "при", "что", "как", "или", "это", "его", "она", "они", "все", "всех", "так", "уже", "если", "также",
  "должна", "должен", "должно", "должны", "может", "могут", "система", "системы", "быть",
]);

function stems(text: string): Set<string> {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(
    words
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
      .map((w) => (w.length > 6 ? w.slice(0, 6) : w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

/** 0-1 similarity of two short texts, used to merge near-identical findings. */
export function textSimilarity(a: string, b: string): number {
  return jaccard(stems(a), stems(b));
}

export function findDuplicateRequirements(requirements: Requirement[], threshold = 0.6): DuplicatePair[] {
  const prepared = requirements.map((r) => ({ id: r.id, stems: stems(r.text) }));
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const a = prepared[i];
      const b = prepared[j];
      if (a.stems.size < 3 || b.stems.size < 3) continue;
      const similarity = jaccard(a.stems, b.stems);
      if (similarity >= threshold) pairs.push({ a: a.id, b: b.id, similarity: Math.round(similarity * 100) / 100 });
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity).slice(0, 20);
}
