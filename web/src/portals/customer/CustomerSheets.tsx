import React, { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Compass,
  ExternalLink,
  Globe,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Phone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandId, CityId, DeviceCondition, Listing, Store } from '../../types';
import {
  BRANDS,
  CITIES,
  formatCity,
  formatCondition,
  formatListingTitle,
  formatSdg,
  tText,
} from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import { LtrValue } from '../../components/DesignSystem';

/**
 * C-00: Minimalist Claymorphism Startup / Loading / Failure + Retry Overlay
 */
export function CustomerStartupOverlay() {
  const { lang, setLang, sim, updateSim } = usePrototype();

  if (sim.startupMode === 'ready') return null;

  return (
    <div className="store-clay absolute inset-0 z-50 flex flex-col justify-between p-6 overflow-hidden">
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs text-[#265B3E] font-semibold">
          {lang === 'ar' ? 'سوق الموبايلات الموثوق' : 'Verified Phone Marketplace'}
        </span>
        <button
          type="button"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="clay-pill clay-focus-ring inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold text-[#172B20]"
        >
          <Globe className="w-3.5 h-3.5 text-[#2D6145]" />
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center my-auto">
        <div className="clay-card w-20 h-20 rounded-[28px] text-[#23573A] flex items-center justify-center mb-5">
          <Smartphone className="w-9 h-9 stroke-[1.9]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#172B20] mb-1.5">
          {lang === 'ar' ? 'سودان فونز' : 'Sudan Phones'}
        </h1>
        <p className="text-xs text-[#5A7265] max-w-[260px] leading-relaxed">
          {lang === 'ar'
            ? 'قارن أسعار الهواتف الجديدة والمستعملة من المتاجر الموثقة في بورتسودان والخرطوم وأم درمان'
            : 'Compare new & used phones from verified physical stores in Port Sudan, Khartoum & Omdurman'}
        </p>

        {sim.startupMode === 'loading' && (
          <div className="mt-8 flex flex-col items-center gap-2.5">
            <RefreshCw className="w-5 h-5 animate-spin text-[#2D6145]" />
            <span className="text-xs text-[#5A7265] font-medium">
              {lang === 'ar' ? 'جاري تحميل قائمة المدن والمتاجر الموثقة...' : 'Loading pilot cities & verified stores...'}
            </span>
          </div>
        )}

        {sim.startupMode === 'error' && (
          <div className="mt-7 w-full clay-card rounded-[26px] p-4 text-start">
            <div className="flex items-start gap-2.5 mb-3.5">
              <AlertCircle className="w-5 h-5 text-[#B36B12] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#172B20]">
                  {lang === 'ar' ? 'تعذّر إكمال بدء التشغيل' : 'Startup could not complete'}
                </p>
                <p className="text-xs text-[#5E7669] mt-0.5 leading-relaxed">
                  {lang === 'ar'
                    ? 'قد يكون اتصال الشبكة ضعيفاً حالياً. أعد المحاولة للوصول إلى العروض.'
                    : 'Your mobile connection timed out. Retry to load verified listings.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                updateSim({ startupMode: 'loading' });
                window.setTimeout(() => updateSim({ startupMode: 'ready' }), 700);
              }}
              className="clay-primary-btn clay-focus-ring w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry startup'}
            </button>
          </div>
        )}

        {sim.startupMode === 'splash' && (
          <div className="mt-8 w-full space-y-2.5">
            <button
              type="button"
              onClick={() => updateSim({ startupMode: 'ready' })}
              className="clay-primary-btn clay-focus-ring w-full h-13 rounded-full font-bold text-sm"
            >
              {lang === 'ar' ? 'تصفح كضيف بدون تسجيل' : 'Browse as Guest (No Sign-In)'}
            </button>
            <p className="text-[11px] text-[#667D71]">
              {lang === 'ar'
                ? 'لا يتطلب إنشاء حساب أو تفعيل الموقع للتصفح'
                : 'No account or location permission required to browse'}
            </p>
          </div>
        )}
      </div>

      <div className="relative z-10 text-center text-[11px] text-[#6B8276]">
        {lang === 'ar' ? 'العملة: الجنيه السوداني (ج.س) · متاجر فعلية فقط' : 'Currency: Sudanese Pound (SDG) · Physical stores only'}
      </div>
    </div>
  );
}

/**
 * C-00: City Selection & Simulated Location Permission Clay Bottom Sheet
 */
export function CitySelectorSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang, selectedCity, setSelectedCity, setHasCompletedCitySelection, pushToast } =
    usePrototype();
  const [locStep, setLocStep] = useState<
    'idle' | 'explainer' | 'detecting' | 'denied' | 'outside' | 'detected'
  >('idle');
  const [detectedCity, setDetectedCity] = useState<CityId>('port_sudan');

  if (!open) return null;

  const chooseCity = (city: CityId | 'all') => {
    setSelectedCity(city);
    setHasCompletedCitySelection(true);
    setLocStep('idle');
    onClose();
    pushToast('info', {
      ar: `تم ضبط المدينة على: ${formatCity(city, 'ar')}`,
      en: `City set to: ${formatCity(city, 'en')}`,
    });
  };

  const simulateDetection = (outcome: 'port_sudan' | 'denied' | 'outside') => {
    setLocStep('detecting');
    window.setTimeout(() => {
      if (outcome === 'port_sudan') {
        setDetectedCity('port_sudan');
        setLocStep('detected');
      } else if (outcome === 'denied') {
        setLocStep('denied');
      } else {
        setLocStep('outside');
      }
    }, 650);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-[#15281E]/35 backdrop-blur-[3px]"
      onClick={() => {
        setLocStep('idle');
        onClose();
      }}
    >
      <motion.div
        initial={{ y: 36, opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="clay-sheet text-[#172B20] rounded-t-[32px] max-h-[88%] flex flex-col overflow-hidden"
      >
        <div className="w-10 h-1.5 bg-[#C5D5CC] rounded-full mx-auto mt-3 mb-1 shrink-0" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#172B20]/[0.06]">
          <div>
            <h3 className="text-base font-bold text-[#172B20]">
              {lang === 'ar' ? 'اختر المدينة' : 'Select Your City'}
            </h3>
            <p className="text-xs text-[#60776B] mt-0.5">
              {lang === 'ar'
                ? 'يمكنك تغيير المدينة في أي وقت دون الحاجة لإذن الموقع'
                : 'Change cities anytime — location permission is optional'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocStep('idle');
              onClose();
            }}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="clay-pill clay-focus-ring w-10 h-10 rounded-full flex items-center justify-center text-[#3D574A]"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto thin-scroll space-y-4">
          {/* Location action block */}
          {locStep === 'idle' && (
            <button
              type="button"
              onClick={() => setLocStep('explainer')}
              className="w-full clay-card-tint clay-focus-ring flex items-center justify-between gap-3 p-3.5 rounded-[24px] text-start"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[15px] clay-primary-btn flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#163926]">
                    {lang === 'ar' ? 'استخدام موقعي الحالي' : 'Use my current location'}
                  </p>
                  <p className="text-xs text-[#3B624C]">
                    {lang === 'ar'
                      ? 'لاقتراح أقرب ولاية سودانية تلقائياً'
                      : 'Automatically suggest your nearest Sudan state'}
                  </p>
                </div>
              </div>
              <Compass className="w-4 h-4 text-[#23573A] shrink-0" />
            </button>
          )}

          {locStep === 'explainer' && (
            <div className="p-4 rounded-[24px] clay-card space-y-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-[#2D6145] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#172B20]">
                    {lang === 'ar' ? 'تحديد الولاية تلقائياً' : 'Detect Your State'}
                  </p>
                  <p className="text-xs text-[#5A7265] mt-1 leading-relaxed">
                    {lang === 'ar'
                      ? 'نستخدم موقعك التقريبي لمرة واحدة فقط لاقتراح أقرب ولاية سودانية. يمكنك دائماً اختيار الولاية يدوياً أدناه.'
                      : 'We use approximate location once to suggest your nearest state in Sudan. You can always pick any state manually below.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLocStep('detecting');
                    const SUDAN_STATE_COORDS: { id: CityId; lat: number; lng: number }[] = [
                      { id: 'khartoum', lat: 15.5007, lng: 32.5599 },
                      { id: 'omdurman', lat: 15.6445, lng: 32.4777 },
                      { id: 'port_sudan', lat: 19.6158, lng: 37.2164 },
                      { id: 'al_jazirah', lat: 14.4012, lng: 33.5199 },
                      { id: 'river_nile', lat: 17.7022, lng: 33.9864 },
                      { id: 'northern', lat: 19.1698, lng: 30.4749 },
                      { id: 'kassala', lat: 15.4510, lng: 36.3999 },
                      { id: 'gedaref', lat: 14.0349, lng: 35.3834 },
                      { id: 'sennar', lat: 13.5691, lng: 33.5672 },
                      { id: 'white_nile', lat: 13.1629, lng: 32.6635 },
                      { id: 'blue_nile', lat: 11.7891, lng: 34.3592 },
                      { id: 'north_kordofan', lat: 13.1833, lng: 30.2167 },
                      { id: 'south_kordofan', lat: 11.0111, lng: 29.7183 },
                      { id: 'west_kordofan', lat: 11.7175, lng: 28.3400 },
                      { id: 'north_darfur', lat: 13.6279, lng: 25.3494 },
                      { id: 'south_darfur', lat: 12.0489, lng: 24.8807 },
                      { id: 'west_darfur', lat: 13.4526, lng: 22.4472 },
                      { id: 'central_darfur', lat: 12.9092, lng: 23.4741 },
                      { id: 'east_darfur', lat: 11.4619, lng: 26.1258 },
                    ];
                    const matchNearest = (lat: number, lng: number): CityId => {
                      let best: CityId = 'khartoum';
                      let bestDist = Infinity;
                      for (const st of SUDAN_STATE_COORDS) {
                        const d = (lat - st.lat) ** 2 + (lng - st.lng) ** 2;
                        if (d < bestDist) {
                          bestDist = d;
                          best = st.id;
                        }
                      }
                      return best;
                    };
                    try {
                      const perm = await Geolocation.requestPermissions().catch(() => null);
                      if (perm && perm.location === 'denied' && perm.coarseLocation === 'denied') {
                        setLocStep('denied');
                        return;
                      }
                      const pos = await Geolocation.getCurrentPosition({
                        enableHighAccuracy: false,
                        timeout: 10000,
                      });
                      setDetectedCity(matchNearest(pos.coords.latitude, pos.coords.longitude));
                      setLocStep('detected');
                    } catch {
                      if (typeof navigator !== 'undefined' && navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setDetectedCity(matchNearest(pos.coords.latitude, pos.coords.longitude));
                            setLocStep('detected');
                          },
                          () => setLocStep('denied'),
                          { timeout: 8000 }
                        );
                      } else {
                        setLocStep('denied');
                      }
                    }
                  }}
                  className="clay-primary-btn clay-focus-ring w-full h-11 rounded-full text-xs font-bold"
                >
                  {lang === 'ar' ? 'السماح وتحديد الموقع' : 'Allow & Detect Location'}
                </button>
              </div>
            </div>
          )}

          {locStep === 'detecting' && (
            <div className="p-4 rounded-[22px] clay-card flex items-center gap-3 text-sm text-[#172B20]">
              <RefreshCw className="w-4 h-4 animate-spin text-[#2D6145]" />
              <span className="font-medium">{lang === 'ar' ? 'جاري تحديد أقرب مدينة...' : 'Detecting nearest city...'}</span>
            </div>
          )}

          {locStep === 'detected' && (
            <div className="p-4 rounded-[24px] clay-card-tint space-y-2.5">
              <div className="flex items-center gap-2 text-[#163926] font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-[#23573A]" />
                <span>
                  {lang === 'ar'
                    ? `تم التعرف على موقعك: ${formatCity(detectedCity, 'ar')}`
                    : `Detected city: ${formatCity(detectedCity, 'en')}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => chooseCity(detectedCity)}
                className="clay-primary-btn clay-focus-ring w-full h-11 rounded-full text-xs font-bold"
              >
                {lang === 'ar' ? `اعتماد ${formatCity(detectedCity, 'ar')}` : `Confirm ${formatCity(detectedCity, 'en')}`}
              </button>
            </div>
          )}

          {locStep === 'denied' && (
            <div className="p-3.5 rounded-[22px] bg-[#FDF6E8] border border-white/85 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9)] text-xs text-[#7A4A10] space-y-1">
              <p className="font-bold">
                {lang === 'ar' ? 'تم رفض إذن الموقع — لا مشكلة!' : 'Location permission denied — no problem!'}
              </p>
              <p className="text-[#8A5B22] leading-relaxed">
                {lang === 'ar'
                  ? 'اختر مدينتك يدوياً من القائمة أدناه لمتابعة التصفح بحرية.'
                  : 'Select your city manually below to browse verified offers.'}
              </p>
            </div>
          )}

          {locStep === 'outside' && (
            <div className="p-3.5 rounded-[22px] bg-[#FDF6E8] border border-white/85 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9)] text-xs text-[#7A4A10] space-y-1">
              <p className="font-bold">
                {lang === 'ar'
                  ? 'موقعك الحالي خارج التغطية الفورية'
                  : 'Detected location is outside Sudan'}
              </p>
              <p className="text-[#8A5B22] leading-relaxed">
                {lang === 'ar'
                  ? 'يمكنك اختيار أي ولاية من جميع ولايات السودان الـ 18 أدناه أو تصفح كل الولايات.'
                  : 'Choose any of the 18 states of Sudan below or browse all states.'}
              </p>
            </div>
          )}

          {/* All 18 Sudan States Dropdown Selector */}
          <div className="space-y-3">
            <label
              htmlFor="sheet-state-select"
              className="block text-xs font-bold text-[#4E6659]"
            >
              {lang === 'ar' ? 'اختر الولاية (جميع ولايات السودان)' : 'Select State (All Sudan States)'}
            </label>
            <div className="relative">
              <select
                id="sheet-state-select"
                value={selectedCity}
                onChange={(e) => chooseCity(e.target.value as CityId | 'all')}
                className="w-full h-13 ps-4 pe-10 rounded-[20px] clay-inset text-sm font-bold text-[#172B20] appearance-none focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#F6FAF7] text-[#172B20]">
                  {lang === 'ar' ? 'جميع ولايات السودان (كل الولايات)' : 'All Sudan States (18 States)'}
                </option>
                {CITIES.map((city) => (
                  <option key={city.id} value={city.id} className="bg-[#F6FAF7] text-[#172B20]">
                    {tText(city.name, lang)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#2D6145]" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#667D71] px-1">
              <span>
                {lang === 'ar' ? 'الولاية المختارة حالياً:' : 'Currently selected:'}
              </span>
              <span className="font-bold text-[#245A3D]">{formatCity(selectedCity, lang)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * C-02: Native-Style Minimalist Claymorphism Search Filter Bottom Sheet
 */
export interface CustomerFilterState {
  brand: BrandId | 'all';
  condition: DeviceCondition | 'all';
  storageGb: number | 'all';
  city: CityId | 'all';
  minPrice: string;
  maxPrice: string;
  acceptsTradeIn: boolean;
  sortBy: 'newest' | 'price_asc' | 'price_desc';
}

export function FilterBottomSheet({
  open,
  filters,
  onApply,
  onReset,
  onClose,
}: {
  open: boolean;
  filters: CustomerFilterState;
  onApply: (next: CustomerFilterState) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { lang, brands } = usePrototype();
  const [draft, setDraft] = useState<CustomerFilterState>(filters);

  React.useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-[#15281E]/35 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 36, opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="clay-sheet text-[#172B20] rounded-t-[32px] max-h-[86%] flex flex-col overflow-hidden"
      >
        <div className="w-10 h-1.5 bg-[#C5D5CC] rounded-full mx-auto mt-3 mb-1 shrink-0" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#172B20]/[0.06]">
          <h3 className="text-base font-bold text-[#172B20]">
            {lang === 'ar' ? 'تصفية وترتيب النتائج' : 'Filter & Sort'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="clay-pill clay-focus-ring w-9 h-9 rounded-full flex items-center justify-center text-[#3D574A]"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto thin-scroll space-y-5">
          {/* Sort */}
          <div>
            <label className="block text-xs font-bold text-[#4E6659] mb-2">
              {lang === 'ar' ? 'الترتيب حسب' : 'Sort by'}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 clay-inset rounded-[20px]">
              {(
                [
                  { id: 'newest', ar: 'الأحدث', en: 'Newest' },
                  { id: 'price_asc', ar: 'الأقل سعراً', en: 'Lowest Price' },
                  { id: 'price_desc', ar: 'الأعلى سعراً', en: 'Highest Price' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, sortBy: opt.id }))}
                  className={`h-9 rounded-[15px] text-xs font-bold transition-all whitespace-nowrap ${
                    draft.sortBy === opt.id
                      ? 'clay-pill text-[#172B20]'
                      : 'text-[#5E7669] hover:text-[#172B20]'
                  }`}
                >
                  {lang === 'ar' ? opt.ar : opt.en}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-bold text-[#4E6659] mb-2">
              {lang === 'ar' ? 'الحالة' : 'Condition'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'all', ar: 'الكل', en: 'All' },
                  { id: 'new', ar: 'جديد مختوم', en: 'New' },
                  { id: 'used', ar: 'مستعمل', en: 'Used' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, condition: opt.id }))}
                  className={`h-10 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    draft.condition === opt.id
                      ? 'clay-pill-active'
                      : 'clay-pill text-[#4E6659]'
                  }`}
                >
                  {lang === 'ar' ? opt.ar : opt.en}
                </button>
              ))}
            </div>
          </div>

          {/* State / Location Dropdown (All 18 States of Sudan) */}
          <div>
            <label
              htmlFor="filter-state-select"
              className="block text-xs font-bold text-[#4E6659] mb-2"
            >
              {lang === 'ar' ? 'الولاية' : 'State'}
            </label>
            <div className="relative">
              <select
                id="filter-state-select"
                value={draft.city}
                onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value as CityId | 'all' }))}
                className="w-full h-11 ps-3.5 pe-10 rounded-[18px] clay-inset text-xs font-bold text-[#172B20] appearance-none focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#F6FAF7] text-[#172B20]">
                  {lang === 'ar' ? 'جميع ولايات السودان' : 'All Sudan States'}
                </option>
                {CITIES.map((city) => (
                  <option key={city.id} value={city.id} className="bg-[#F6FAF7] text-[#172B20]">
                    {tText(city.name, lang)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D6145]" />
            </div>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs font-bold text-[#4E6659] mb-2">
              {lang === 'ar' ? 'الماركة' : 'Brand'}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, brand: 'all' }))}
                className={`h-9 px-3.5 rounded-full text-xs font-semibold ${
                  draft.brand === 'all' ? 'clay-pill-active' : 'clay-pill text-[#4E6659]'
                }`}
              >
                {lang === 'ar' ? 'الكل' : 'All'}
              </button>
              {brands.map((b) => {
                const slug = (b.slug || b.name.toLowerCase()) as BrandId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, brand: slug }))}
                    className={`h-9 px-3.5 rounded-full text-xs font-semibold ${
                      draft.brand === slug ? 'clay-pill-active' : 'clay-pill text-[#4E6659]'
                    }`}
                  >
                    {lang === 'ar' && b.name_ar ? b.name_ar : b.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Storage */}
          <div>
            <label className="block text-xs font-bold text-[#4E6659] mb-2">
              {lang === 'ar' ? 'السعة التخزينية' : 'Storage'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['all', 128, 256, 512] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, storageGb: sz }))}
                  className={`h-9 rounded-full text-xs font-bold font-mono-num ${
                    draft.storageGb === sz ? 'clay-pill-active' : 'clay-pill text-[#4E6659]'
                  }`}
                >
                  {sz === 'all' ? (lang === 'ar' ? 'الكل' : 'Any') : `${sz} GB`}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range SDG */}
          <div>
            <label className="block text-xs font-bold text-[#4E6659] mb-2">
              {lang === 'ar' ? 'نطاق السعر (جنيه سوداني)' : 'Price Range (SDG)'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="number"
                inputMode="numeric"
                value={draft.minPrice}
                onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))}
                placeholder={lang === 'ar' ? 'الأدنى (مثلاً 500000)' : 'Min SDG'}
                className="h-11 px-3.5 rounded-[18px] clay-inset text-xs font-mono-num text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
              />
              <input
                type="number"
                inputMode="numeric"
                value={draft.maxPrice}
                onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))}
                placeholder={lang === 'ar' ? 'الأعلى (مثلاً 2500000)' : 'Max SDG'}
                className="h-11 px-3.5 rounded-[18px] clay-inset text-xs font-mono-num text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
              />
            </div>
          </div>

          {/* Accepts Trade-In Filter */}
          <div className="p-3.5 rounded-[20px] clay-inset flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#172B20]">
                {lang === 'ar' ? 'يقبل الاستبدال فقط (Trade-In)' : 'Accepts Trade-In Only'}
              </p>
              <p className="text-[11px] text-[#5D7568]">
                {lang === 'ar' ? 'عرض الهواتف التي تقبل استبدال جهازك القديم' : 'Show phones eligible for trade-in'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.acceptsTradeIn}
              onClick={() => setDraft((d) => ({ ...d, acceptsTradeIn: !d.acceptsTradeIn }))}
              className={`h-9 px-3.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                draft.acceptsTradeIn ? 'clay-pill-active' : 'clay-pill text-[#5D7568]'
              }`}
            >
              {draft.acceptsTradeIn
                ? lang === 'ar'
                  ? 'مفعّل'
                  : 'On'
                : lang === 'ar'
                  ? 'الكل'
                  : 'Off'}
            </button>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-[#172B20]/[0.06] bg-[#EDF3EF]/90 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="clay-pill clay-focus-ring h-12 px-5 rounded-full text-xs font-bold text-[#3D574A] whitespace-nowrap"
          >
            {lang === 'ar' ? 'مسح الكل' : 'Reset'}
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="clay-primary-btn clay-focus-ring flex-1 h-12 rounded-full text-sm font-bold"
          >
            {lang === 'ar' ? 'تطبيق الفلاتر' : 'Apply Filters'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * C-05: Contact Seller Minimalist Claymorphism Bottom Action Sheet
 */
export function ContactSellerSheet({
  listing,
  store,
  onClose,
  onOpenInAppChat,
}: {
  listing: Listing | null;
  store: Store | null;
  onClose: () => void;
  onOpenInAppChat?: (listing: Listing | null, store: Store) => void;
}) {
  const { lang, recordContactClick, fetchContactMethods, pushToast, sim } = usePrototype();
  const [handoff, setHandoff] = useState<'none' | 'whatsapp' | 'call' | 'cancelled' | 'unavailable'>('none');
  const [liveContact, setLiveContact] = useState<{ phone_url: string; whatsapp_url: string } | null>(null);
  const hasCountedRef = React.useRef(false);

  React.useEffect(() => {
    setHandoff('none');
    setLiveContact(null);
    hasCountedRef.current = false;
    if (listing?.id) {
      fetchContactMethods(listing.id)
        .then((res) => setLiveContact(res))
        .catch(() => setLiveContact(null));
    }
  }, [listing?.id, store?.id, fetchContactMethods]);

  React.useEffect(() => {
    if (!store) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, onClose]);

  if (!store) return null;

  const title = listing
    ? `${formatListingTitle(listing.arabicBrandPrefix, listing.model, lang)} — ${listing.storageGb} GB`
    : tText(store.name, lang);

  const prefilledInquiry = listing
    ? lang === 'ar'
      ? `السلام عليكم ${store.name.ar}، أستفسر عن هاتف ${listing.arabicBrandPrefix} ${listing.model} (${listing.storageGb}GB${listing.ramGb ? ` / ${listing.ramGb}GB RAM` : ''}، اللون: ${listing.color.ar}، الحالة: ${formatCondition(listing.condition, 'ar')}${listing.usedUnitCode ? `، كود: ${listing.usedUnitCode}` : ''}) بسعر ${formatSdg(listing.priceSdg, 'ar')} المعروض في تطبيق سودان فونز.${listing.acceptsTradeIn || store.acceptsTradeIn ? ' هل الاستبدال (Trade-In) متاح؟' : ''} هل الجهاز متوفر حالياً؟`
      : `Hello ${store.name.en}, I am inquiring about ${listing.model} (${listing.storageGb}GB${listing.ramGb ? ` / ${listing.ramGb}GB RAM` : ''}, Color: ${listing.color.en}, Condition: ${formatCondition(listing.condition, 'en')}${listing.usedUnitCode ? `, Code: ${listing.usedUnitCode}` : ''}) listed at ${formatSdg(listing.priceSdg, 'en')} on Sudan Phones.${listing.acceptsTradeIn || store.acceptsTradeIn ? ' Is trade-in available?' : ''} Is it still available?`
    : lang === 'ar'
      ? `السلام عليكم ${store.name.ar}، أرغب بالاستفسار عن الهواتف المتوفرة لديكم حالياً عبر تطبيق سودان فونز.`
      : `Hello ${store.name.en}, I saw your verified store on Sudan Phones and would like to ask about available phones.`;

  const DEFAULT_TEST_PHONE = '+249100090181';
  const resolvedPhone = (store.phone || DEFAULT_TEST_PHONE).replace(/\s+/g, '');
  const resolvedWhatsapp = (store.whatsapp || store.phone || DEFAULT_TEST_PHONE).replace(/[^\d]/g, '');

  const triggerContact = async (channel: 'whatsapp' | 'call') => {
    if (store.contactAvailable === false || (channel === 'whatsapp' && sim.submissionOutcome === 'failure')) {
      setHandoff('unavailable');
      return;
    }
    if (listing && !hasCountedRef.current) {
      recordContactClick(listing.id, store.id);
      hasCountedRef.current = true;
    }
    setHandoff(channel);
    let contact = liveContact;
    if (!contact && listing?.id) {
      try {
        contact = await fetchContactMethods(listing.id);
        setLiveContact(contact);
      } catch {
        contact = null;
      }
    }
    if (channel === 'whatsapp') {
      const baseWa = contact?.whatsapp_url?.split('?')[0] || `https://wa.me/${resolvedWhatsapp}`;
      const waUrl = `${baseWa}?text=${encodeURIComponent(prefilledInquiry)}`;
      const opened = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.href = waUrl;
      }
    } else if (channel === 'call') {
      const telUrl = contact?.phone_url || `tel:${resolvedPhone}`;
      window.location.href = telUrl;
    }
  };

  const handleCopyNumber = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(resolvedPhone).catch(() => {});
    }
    pushToast('info', {
      ar: `تم نسخ رقم المتجر: ${resolvedPhone}`,
      en: `Copied store number: ${resolvedPhone}`,
    });
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-[#15281E]/35 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'التواصل مع المتجر' : 'Contact verified store'}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 36, opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="clay-sheet text-[#172B20] rounded-t-[32px] max-h-[88%] flex flex-col overflow-hidden"
      >
        <div className="w-10 h-1.5 bg-[#C5D5CC] rounded-full mx-auto mt-3 mb-1 shrink-0" />
        <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-[#172B20]/[0.06]">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-[#172B20]">{tText(store.name, lang)}</h3>
              <ShieldCheck className="w-4 h-4 text-[#2D6145] shrink-0" />
            </div>
            <p className="text-xs text-[#60776B] mt-0.5">
              {formatCity(store.city, lang)} ·{' '}
              {lang === 'ar' ? 'تواصل مباشر بدون تسجيل دخول' : 'Direct store contact · No sign-in needed'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="clay-pill clay-focus-ring w-10 h-10 rounded-full flex items-center justify-center text-[#3D574A]"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto thin-scroll space-y-4">
          {/* Prefilled WhatsApp message preview */}
          <div className="rounded-[22px] clay-inset p-3.5">
            <p className="text-[11px] font-bold text-[#245A3D] mb-1.5">
              {lang === 'ar'
                ? 'معاينة رسالة الاستفسار الجاهزة لواتساب'
                : 'Prefilled WhatsApp inquiry preview'}
            </p>
            <p className="text-xs text-[#2B4336] leading-relaxed">{prefilledInquiry}</p>
          </div>

          {/* Handoff Feedback States */}
          {handoff === 'whatsapp' && (
            <div className="rounded-[22px] clay-card-tint p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 text-[#1E5236] shrink-0 mt-0.5" />
                <div className="text-xs text-[#163926] space-y-1">
                  <p className="font-bold">
                    {lang === 'ar'
                      ? 'جاري فتح محادثة واتساب مع المتجر'
                      : 'Opening WhatsApp chat with store'}
                  </p>
                  <p className="leading-relaxed text-[#2D543E]">
                    {lang === 'ar'
                      ? `سيتم فتح محادثة مع الرقم ${store.whatsapp} مع الرسالة الجاهزة. تم تسجيل نقرة تواصل إجمالية واحدة للمتجر دون مشاركة هويتك.`
                      : `Opens WhatsApp chat with ${store.whatsapp} using the prefilled message. Recorded once as an anonymous aggregate inquiry for the merchant.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setHandoff('cancelled')}
                  className="clay-pill h-8 px-3 rounded-full text-[11px] font-semibold text-[#172B20]"
                >
                  {lang === 'ar' ? 'إلغاء التحويل' : 'Cancel handoff'}
                </button>
                <button
                  type="button"
                  onClick={() => setHandoff('unavailable')}
                  className="h-8 px-3 rounded-full text-[11px] font-semibold text-[#2E543F] hover:text-[#172B20]"
                >
                  {lang === 'ar' ? 'واتساب غير مثبت؟' : 'App unavailable?'}
                </button>
              </div>
            </div>
          )}

          {handoff === 'call' && (
            <div className="rounded-[22px] clay-card p-3.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#2D6145] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-[#172B20]">
                    {lang === 'ar'
                      ? 'جاري فتح تطبيق الاتصال'
                      : 'Opening phone dialer'}
                  </p>
                  <p className="text-[#5A7265]">
                    {lang === 'ar' ? 'رقم المتجر: ' : 'Store number: '}
                    <LtrValue className="text-[#172B20] font-bold">{store.phone}</LtrValue>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHandoff('cancelled')}
                className="clay-pill h-8 px-3 rounded-full text-[11px] font-semibold text-[#172B20]"
              >
                {lang === 'ar' ? 'إلغاء المكالمة' : 'Cancel call handoff'}
              </button>
            </div>
          )}

          {handoff === 'cancelled' && (
            <div className="rounded-[22px] clay-card p-3.5 text-xs text-[#4E6659]">
              <p className="font-bold text-[#172B20]">
                {lang === 'ar' ? 'تم إلغاء التحويل الخارجي' : 'External handoff cancelled'}
              </p>
              <p className="mt-0.5 text-[#60776B]">
                {lang === 'ar'
                  ? 'لم يتم إرسال أي رسالة. يمكنك المحاولة مرة أخرى أو اختيار الاتصال المباشر.'
                  : 'No message was sent or call placed. You can try again or choose another option below.'}
              </p>
            </div>
          )}

          {handoff === 'unavailable' && (
            <div className="rounded-[22px] bg-[#FDF6E8] border border-white/85 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9)] p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#B36B12] shrink-0 mt-0.5" />
                <div className="text-xs text-[#7A4A10]">
                  <p className="font-bold">
                    {lang === 'ar' ? 'التطبيق الخارجي غير متاح حالياً' : 'External app unavailable'}
                  </p>
                  <p className="mt-0.5 text-[#8A5B22] leading-relaxed">
                    {lang === 'ar'
                      ? 'تعذّر فتح تطبيق واتساب على هذا الجهاز. يمكنك نسخ رقم المتجر أو إجراء مكالمة هاتفية مباشرة أو زيارة العنوان الفعلي.'
                      : 'Could not launch WhatsApp on this device. Copy the store number, place a direct phone call, or visit the physical shop.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="clay-pill h-8 px-3.5 rounded-full text-[#172B20] text-[11px] font-bold"
              >
                {lang === 'ar' ? `نسخ الرقم (${store.phone})` : `Copy number (${store.phone})`}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {onOpenInAppChat && (
              <button
                type="button"
                onClick={() => onOpenInAppChat(listing, store)}
                className="clay-primary-btn clay-focus-ring w-full h-13 rounded-full font-bold text-sm flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4.5 h-4.5" />
                <span>{lang === 'ar' ? 'تواصل عبر التطبيق' : 'Message in App'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => triggerContact('whatsapp')}
              className="clay-whatsapp-btn clay-focus-ring w-full h-13 rounded-full font-bold text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4.5 h-4.5" />
              <span>{lang === 'ar' ? 'محادثة عبر واتساب' : 'Chat on WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={() => triggerContact('call')}
              className="clay-pill clay-focus-ring w-full h-13 rounded-full text-[#172B20] font-bold text-sm flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4 text-[#2D6145]" />
              <span>{lang === 'ar' ? 'اتصال بالمتجر' : 'Call Store'}</span>
              <LtrValue className="text-xs text-[#5E7669]">{store.phone}</LtrValue>
            </button>
          </div>

          <p className="text-[11px] text-[#6B8276] text-center leading-relaxed">
            {lang === 'ar'
              ? `الاستفسار حول: ${title} · سودان فونز لا يفرض رسوماً ولا يتيح الدفع داخل التطبيق — عاين الجهاز في المتجر قبل الشراء.`
              : `Inquiring about: ${title} · No in-app payments — always inspect the phone in person at the verified store.`}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
