import { CityId, Language, Listing, Store, UsedChecklist } from '../types';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export const SUDAN_CITY_COORDS: Record<CityId, GeoPoint> = {
  khartoum: { lat: 15.5007, lng: 32.5599 },
  omdurman: { lat: 15.6445, lng: 32.4777 },
  port_sudan: { lat: 19.6158, lng: 37.2164 },
  al_jazirah: { lat: 14.4012, lng: 33.5199 },
  river_nile: { lat: 17.7022, lng: 33.9864 },
  northern: { lat: 19.1667, lng: 30.4833 },
  kassala: { lat: 15.451, lng: 36.4 },
  gedaref: { lat: 14.0349, lng: 35.3834 },
  sennar: { lat: 13.5691, lng: 33.5672 },
  white_nile: { lat: 13.1629, lng: 32.6635 },
  blue_nile: { lat: 11.7891, lng: 34.3592 },
  north_kordofan: { lat: 13.1842, lng: 30.2167 },
  south_kordofan: { lat: 11.0111, lng: 29.7183 },
  west_kordofan: { lat: 12.6956, lng: 28.4383 },
  north_darfur: { lat: 13.6279, lng: 25.3494 },
  south_darfur: { lat: 12.05, lng: 24.8833 },
  west_darfur: { lat: 13.4526, lng: 22.4473 },
  central_darfur: { lat: 12.9092, lng: 23.4706 },
  east_darfur: { lat: 11.4619, lng: 26.1283 },
};

/**
 * Great-circle Haversine distance in kilometers between two lat/lng points.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const dist = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  return Math.round(dist * 10) / 10;
}

export function getStoreCoordinates(store: Store): GeoPoint {
  if (typeof store.latitude === 'number' && typeof store.longitude === 'number') {
    return { lat: store.latitude, lng: store.longitude };
  }
  return SUDAN_CITY_COORDS[store.city] || SUDAN_CITY_COORDS.khartoum;
}

export function sortStoresByDistance(
  stores: Store[],
  origin: GeoPoint
): Array<{ store: Store; distanceKm: number; coords: GeoPoint }> {
  return stores
    .map((store) => {
      const coords = getStoreCoordinates(store);
      return { store, coords, distanceKm: haversineKm(origin, coords) };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Compute preview of USD-linked listing prices for a new SDG/USD exchange rate.
 */
export function computeUsdRatePriceUpdates(
  listings: Listing[],
  usdRateSdg: number,
  roundTo = 1000
): Array<{
  listingId: string;
  model: string;
  oldPriceSdg: number;
  newPriceSdg: number;
  dropped: boolean;
}> {
  if (!Number.isFinite(usdRateSdg) || usdRateSdg <= 0) return [];
  const step = roundTo > 0 ? roundTo : 1;
  return listings
    .filter((l) => typeof l.usdPrice === 'number' && l.usdPrice > 0)
    .map((l) => {
      const raw = (l.usdPrice || 0) * usdRateSdg;
      const newPriceSdg = Math.max(step, Math.round(raw / step) * step);
      return {
        listingId: l.id,
        model: l.model,
        oldPriceSdg: l.priceSdg,
        newPriceSdg,
        dropped: newPriceSdg < l.priceSdg,
      };
    });
}

/**
 * Count passed verification checks on a used phone checklist.
 */
export function summarizeUsedChecklist(checklist?: UsedChecklist | null): {
  passed: number;
  total: number;
} {
  if (!checklist) return { passed: 0, total: 5 };
  const keys: Array<keyof UsedChecklist> = [
    'biometricsWorking',
    'originalScreen',
    'networkUnlocked',
    'cleanImei',
    'accessoriesIncluded',
  ];
  const passed = keys.filter((k) => Boolean(checklist[k])).length;
  return { passed, total: keys.length };
}

/**
 * Build a clean bilingual WhatsApp share text for a listing or store.
 */
export function buildWhatsAppListingShareText(params: {
  title: string;
  storageGb: number;
  conditionLabel: string;
  priceFormatted: string;
  storeName: string;
  cityLabel: string;
  lang: Language;
  url?: string;
}): string {
  const { title, storageGb, conditionLabel, priceFormatted, storeName, cityLabel, lang, url } = params;
  const lines =
    lang === 'ar'
      ? [
          `📱 ${title} (${storageGb}GB — ${conditionLabel})`,
          `💰 السعر: ${priceFormatted}`,
          `🏪 المتجر: ${storeName} — ${cityLabel}`,
          url ? `🔗 ${url}` : 'عبر تطبيق سودان فونز (Sudan Phones)',
        ]
      : [
          `📱 ${title} (${storageGb}GB — ${conditionLabel})`,
          `💰 Price: ${priceFormatted}`,
          `🏪 Store: ${storeName} — ${cityLabel}`,
          url ? `🔗 ${url}` : 'Found on Sudan Phones',
        ];
  return lines.join('\n');
}

/**
 * Maintain a deduplicated, bounded list of recent search queries.
 */
export function mergeRecentSearches(existing: string[], query: string, maxItems = 6): string[] {
  const cleaned = query.trim();
  if (cleaned.length < 2) return existing;
  const lower = cleaned.toLowerCase();
  const filtered = existing.filter((item) => item.trim().toLowerCase() !== lower);
  return [cleaned, ...filtered].slice(0, maxItems);
}
