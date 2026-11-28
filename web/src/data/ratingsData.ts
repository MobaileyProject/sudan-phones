import { BrandId, Listing, RatingReview, RatingSummary } from '../types';

export const RATINGS_STORAGE_KEY = 'sudan_phones_ratings_v3';

/**
 * Normalizes a phone model key (e.g. "apple::iphone 15 pro max", "samsung::galaxy s24 ultra")
 * so every product listing's ratings link cleanly to its single parent phone model.
 */
export function getPhoneModelRatingKey(brand: BrandId | string, model: string): string {
  return `${String(brand).trim().toLowerCase()}::${model.trim().toLowerCase()}`;
}

function summarizeMatchedReviews(
  matched: RatingReview[],
  linkedProductCount?: number
): RatingSummary {
  const breakdown: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;

  for (const r of matched) {
    const clamped = Math.min(5, Math.max(1, Math.round(r.rating)));
    sum += clamped;
    breakdown[5 - clamped] += 1;
  }

  const count = matched.length;
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

  return {
    average,
    count,
    breakdown,
    reviews: matched,
    ...(linkedProductCount !== undefined ? { linkedProductCount } : {}),
  };
}

/**
 * Computes rating summary for a single store or a single product listing.
 */
export function computeRatingSummary(
  allReviews: RatingReview[],
  targetType: 'store' | 'product',
  targetId: string
): RatingSummary {
  const matched = allReviews.filter(
    (r) => r.targetType === targetType && r.targetId === targetId
  );
  return summarizeMatchedReviews(matched);
}

/**
 * Aggregates all product (listing) ratings linked to a single phone model
 * into one unified model-level rating summary.
 */
export function computeAggregatedModelRatingSummary(
  allReviews: RatingReview[],
  listings: Listing[],
  brand: BrandId | string,
  model: string
): RatingSummary {
  const key = getPhoneModelRatingKey(brand, model);
  const matchingListingIds = new Set(
    listings
      .filter((l) => getPhoneModelRatingKey(l.brand, l.model) === key)
      .map((l) => l.id)
  );

  const matched = allReviews.filter(
    (r) =>
      r.targetType === 'product' &&
      (r.modelKey === key || matchingListingIds.has(r.targetId))
  );

  const linkedProductCount = new Set(matched.map((r) => r.targetId)).size;
  return summarizeMatchedReviews(matched, linkedProductCount);
}
