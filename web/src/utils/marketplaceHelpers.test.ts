import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppListingShareText,
  computeUsdRatePriceUpdates,
  haversineKm,
  mergeRecentSearches,
  sortStoresByDistance,
  SUDAN_CITY_COORDS,
  summarizeUsedChecklist,
} from './marketplaceHelpers';
import type { Listing, Store } from '../types';

test('haversineKm returns 0 for identical coordinates and accurate Khartoum-Port Sudan distance', () => {
  assert.equal(haversineKm(SUDAN_CITY_COORDS.khartoum, SUDAN_CITY_COORDS.khartoum), 0);
  const km = haversineKm(SUDAN_CITY_COORDS.khartoum, SUDAN_CITY_COORDS.port_sudan);
  assert.ok(km > 650 && km < 710, `Expected ~675km, got ${km}`);
});

test('sortStoresByDistance orders closest verified stores first', () => {
  const mockStore = (id: string, city: Store['city'], lat: number, lng: number): Store =>
    ({
      id,
      city,
      latitude: lat,
      longitude: lng,
    }) as Store;

  const sorted = sortStoresByDistance(
    [
      mockStore('ps', 'port_sudan', 19.6158, 37.2164),
      mockStore('krt', 'khartoum', 15.505, 32.561),
      mockStore('wm', 'al_jazirah', 14.4012, 33.5199),
    ],
    SUDAN_CITY_COORDS.khartoum
  );

  assert.deepEqual(
    sorted.map((s) => s.store.id),
    ['krt', 'wm', 'ps']
  );
  assert.ok(sorted[0].distanceKm < 2);
});

test('computeUsdRatePriceUpdates calculates rounded SDG prices and flags drops', () => {
  const listings = [
    { id: '1', model: 'iPhone 15', priceSdg: 2850000, usdPrice: 1000 },
    { id: '2', model: 'Galaxy A55', priceSdg: 900000, usdPrice: 350 },
    { id: '3', model: 'No USD', priceSdg: 500000, usdPrice: null },
  ] as Listing[];

  const updates = computeUsdRatePriceUpdates(listings, 2700, 1000);
  assert.equal(updates.length, 2);
  assert.equal(updates[0].newPriceSdg, 2700000);
  assert.equal(updates[0].dropped, true);
  assert.equal(updates[1].newPriceSdg, 945000);
  assert.equal(updates[1].dropped, false);
});

test('summarizeUsedChecklist counts passed verification items accurately', () => {
  assert.deepEqual(summarizeUsedChecklist(undefined), { passed: 0, total: 5 });
  assert.deepEqual(
    summarizeUsedChecklist({
      biometricsWorking: true,
      originalScreen: true,
      networkUnlocked: true,
      cleanImei: true,
      accessoriesIncluded: false,
    }),
    { passed: 4, total: 5 }
  );
});

test('buildWhatsAppListingShareText formats clean Arabic and English share messages', () => {
  const en = buildWhatsAppListingShareText({
    title: 'iPhone 15 Pro Max',
    storageGb: 256,
    conditionLabel: 'New',
    priceFormatted: '2,850,000 SDG',
    storeName: 'Nile Mobile Hub',
    cityLabel: 'Khartoum',
    lang: 'en',
  });
  assert.ok(en.includes('iPhone 15 Pro Max'));
  assert.ok(en.includes('2,850,000 SDG'));
  assert.ok(en.includes('Nile Mobile Hub'));

  const ar = buildWhatsAppListingShareText({
    title: 'آبل iPhone 15 Pro Max',
    storageGb: 256,
    conditionLabel: 'جديد',
    priceFormatted: '2,850,000 ج.س',
    storeName: 'متجر النيل للهواتف',
    cityLabel: 'الخرطوم',
    lang: 'ar',
  });
  assert.ok(ar.includes('السعر: 2,850,000 ج.س'));
});

test('mergeRecentSearches deduplicates case-insensitively, ignores 1-char noise, and caps length', () => {
  const next = mergeRecentSearches(['iPhone 15', 'Samsung', 'Xiaomi'], 'iphone 15', 3);
  assert.deepEqual(next, ['iphone 15', 'Samsung', 'Xiaomi']);
  const ignored = mergeRecentSearches(['Samsung', 'Xiaomi'], 'x', 3);
  assert.deepEqual(ignored, ['Samsung', 'Xiaomi']);
  const capped = mergeRecentSearches(['Samsung', 'Xiaomi', 'Apple'], 'Tecno', 3);
  assert.deepEqual(capped, ['Tecno', 'Samsung', 'Xiaomi']);
});
