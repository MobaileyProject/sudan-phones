import React, { useMemo, useState } from 'react';
import { LocateFixed, MapPin, Navigation, ShieldCheck, Store as StoreIcon } from 'lucide-react';
import { CityId, Listing, Store } from '../../types';
import { formatCity, tText } from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import {
  GeoPoint,
  sortStoresByDistance,
  SUDAN_CITY_COORDS,
} from '../../utils/marketplaceHelpers';

// Sudan geographic bounding box for clean proportional SVG projection
const LAT_MIN = 10.5;
const LAT_MAX = 21.0;
const LNG_MIN = 22.0;
const LNG_MAX = 38.5;

function projectPoint(pt: GeoPoint): { x: number; y: number } {
  const x = ((pt.lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 86 + 7;
  const y = ((LAT_MAX - pt.lat) / (LAT_MAX - LAT_MIN)) * 80 + 10;
  return {
    x: Math.max(8, Math.min(92, x)),
    y: Math.max(10, Math.min(90, y)),
  };
}

export function StoreMapExplorer({
  stores,
  listings,
  selectedCity,
  onOpenStore,
}: {
  stores: Store[];
  listings: Listing[];
  selectedCity: CityId | 'all';
  onOpenStore: (storeId: string) => void;
}) {
  const { lang, pushToast } = usePrototype();
  const [userOrigin, setUserOrigin] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);

  const origin: GeoPoint = useMemo(() => {
    if (userOrigin) return userOrigin;
    if (selectedCity !== 'all' && SUDAN_CITY_COORDS[selectedCity]) {
      return SUDAN_CITY_COORDS[selectedCity];
    }
    return SUDAN_CITY_COORDS.khartoum;
  }, [userOrigin, selectedCity]);

  const rankedStores = useMemo(
    () => sortStoresByDistance(stores, origin),
    [stores, origin]
  );

  const [activeStoreId, setActiveStoreId] = useState<string>(rankedStores[0]?.store.id || '');
  const activeEntry =
    rankedStores.find((s) => s.store.id === activeStoreId) || rankedStores[0] || null;

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      pushToast('info', {
        ar: 'تم الترتيب حسب مركز ولاية الخرطوم.',
        en: 'Sorted from Khartoum city center.',
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        pushToast('success', {
          ar: 'تم تحديد موقعك وترتيب المتاجر الأقرب إليك.',
          en: 'Location found — stores sorted by nearest distance.',
        });
      },
      () => {
        setLocating(false);
        pushToast('info', {
          ar: 'تعذر الوصول للموقع — يتم الترتيب حسب المدينة المختارة.',
          en: 'Location unavailable — sorted using your selected city.',
        });
      },
      { timeout: 5000 }
    );
  };

  const majorHubs: { id: CityId; ar: string; en: string }[] = [
    { id: 'khartoum', ar: 'الخرطوم', en: 'Khartoum' },
    { id: 'port_sudan', ar: 'بورتسودان', en: 'Port Sudan' },
    { id: 'al_jazirah', ar: 'ود مدني', en: 'Wad Madani' },
    { id: 'kassala', ar: 'كسلا', en: 'Kassala' },
    { id: 'river_nile', ar: 'عطبرة', en: 'Atbara' },
  ];

  return (
    <div className="space-y-3.5">
      {/* Location Bar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[#5E7669]">
          {userOrigin
            ? lang === 'ar'
              ? 'المتاجر مرتّبة حسب موقعك الحالي'
              : 'Stores sorted from your current location'
            : lang === 'ar'
              ? `المسافة محسوبة من ${selectedCity !== 'all' ? formatCity(selectedCity, lang) : 'الخرطوم'}`
              : `Distances from ${selectedCity !== 'all' ? formatCity(selectedCity, lang) : 'Khartoum'}`}
        </p>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="h-9 px-3 rounded-full clay-pill text-xs font-bold text-[#1E4D34] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          {lang === 'ar' ? 'الأقرب لي' : 'Near Me'}
        </button>
      </div>

      {/* Interactive Sudan Coordinate Map Canvas */}
      <div className="relative h-[260px] sm:h-[300px] w-full rounded-[24px] overflow-hidden border border-[#172B20]/10 bg-gradient-to-br from-[#E4EFE9] via-[#EEF5F1] to-[#DDECE4]">
        {/* Subtle grid & Nile river contour SVG */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
          aria-hidden="true"
        >
          <defs>
            <pattern id="sdGrid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path
                d="M 12 0 L 0 0 0 12"
                fill="none"
                stroke="#0F6B5D"
                strokeOpacity="0.09"
                strokeWidth="0.35"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#sdGrid)" />
          {/* Nile approximate curve across Sudan */}
          <path
            d="M 59 95 Q 64 72 62 52 Q 66 32 58 10"
            fill="none"
            stroke="#5EA5C9"
            strokeOpacity="0.45"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Red Sea coastline edge */}
          <path
            d="M 82 6 Q 89 22 93 40 L 100 40 L 100 0 Z"
            fill="#89C4DF"
            fillOpacity="0.28"
          />
        </svg>

        {/* Major Hub Labels */}
        {majorHubs.map((hub) => {
          const pos = projectPoint(SUDAN_CITY_COORDS[hub.id]);
          return (
            <span
              key={hub.id}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 translate-y-3 text-[10px] font-semibold text-[#476454]/80 pointer-events-none whitespace-nowrap"
            >
              {lang === 'ar' ? hub.ar : hub.en}
            </span>
          );
        })}

        {/* Store Pins */}
        {rankedStores.map((entry) => {
          const pos = projectPoint(entry.coords);
          const isSelected = activeEntry?.store.id === entry.store.id;
          return (
            <button
              key={entry.store.id}
              type="button"
              onClick={() => setActiveStoreId(entry.store.id)}
              aria-label={tText(entry.store.name, lang)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform flex items-center gap-1 rounded-full px-2.5 h-8 shadow-md ${
                isSelected
                  ? 'z-20 scale-110 bg-[#0F6B5D] text-white ring-4 ring-[#0F6B5D]/20'
                  : 'z-10 bg-white text-[#172B20] border border-[#172B20]/15 hover:scale-105'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-bold max-w-[110px] truncate">
                {tText(entry.store.name, lang).split('—')[0].trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Store Map Card */}
      {activeEntry && (
        <div className="clay-card rounded-[22px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <StoreIcon className="w-4 h-4 text-[#0F6B5D] shrink-0" />
              <h3 className="text-sm font-bold text-[#172B20] truncate">
                {tText(activeEntry.store.name, lang)}
              </h3>
              {activeEntry.store.verificationStatus === 'verified' && (
                <ShieldCheck className="w-4 h-4 text-[#2A6F4E] shrink-0" />
              )}
            </div>
            <p className="text-xs text-[#5E7669] truncate">
              {formatCity(activeEntry.store.city, lang)} · {tText(activeEntry.store.address, lang)}
            </p>
            <p className="text-xs font-semibold text-[#1E4D34] tabular-nums">
              {activeEntry.distanceKm < 1
                ? lang === 'ar'
                  ? 'أقل من 1 كم من المركز'
                  : '< 1 km away'
                : lang === 'ar'
                  ? `يبعد ${activeEntry.distanceKm} كم`
                  : `${activeEntry.distanceKm} km away`}{' '}
              ·{' '}
              {listings.filter((l) => l.storeId === activeEntry.store.id).length}{' '}
              {lang === 'ar' ? 'جهاز متوفر' : 'phones available'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${activeEntry.coords.lat},${activeEntry.coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-3.5 rounded-full clay-pill text-xs font-bold text-[#172B20] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Navigation className="w-3.5 h-3.5 text-[#0F6B5D]" />
              {lang === 'ar' ? 'الاتجاهات' : 'Directions'}
            </a>
            <button
              type="button"
              onClick={() => onOpenStore(activeEntry.store.id)}
              className="h-10 px-4 rounded-full clay-primary-btn text-xs font-bold whitespace-nowrap"
            >
              {lang === 'ar' ? 'زيارة المتجر' : 'Open Store'}
            </button>
          </div>
        </div>
      )}

      {/* Distance-Ranked Mini List */}
      <div className="space-y-2">
        {rankedStores.map((entry) => {
          const active = activeEntry?.store.id === entry.store.id;
          return (
            <button
              key={entry.store.id}
              type="button"
              onClick={() => setActiveStoreId(entry.store.id)}
              className={`w-full p-3 rounded-[18px] text-start flex items-center justify-between gap-3 transition-colors ${
                active ? 'bg-teal-50/80 border border-[#0F6B5D]/30' : 'clay-card'
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#172B20] truncate">
                  {tText(entry.store.name, lang)}
                </p>
                <p className="text-[11px] text-[#5E7669] truncate">
                  {formatCity(entry.store.city, lang)} · {tText(entry.store.openingHours, lang)}
                </p>
              </div>
              <span className="text-xs font-bold text-[#0F6B5D] tabular-nums whitespace-nowrap shrink-0">
                {entry.distanceKm} {lang === 'ar' ? 'كم' : 'km'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
