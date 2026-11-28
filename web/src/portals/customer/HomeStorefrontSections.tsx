import React, { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Heart, ShieldCheck, Tag } from 'lucide-react';
import {
  CityId,
  Language,
  Listing,
  SponsoredAd,
  Store,
} from '../../types';
import {
  formatCity,
  formatCondition,
  formatListingTitle,
  formatSdg,
  tText,
} from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import { PhoneCardSkeleton, SafeImage } from '../../components/DesignSystem';
import { CustomerFilterState } from './CustomerSheets';
import { CompactStarRating } from './RatingsComponents';
import discountsBannerImg from '../../assets/images/discounts_offers_banner_1795623949855.jpg';

export function isDiscountedListing(l: Listing): boolean {
  return Boolean(l.priceDropped && l.previousPriceSdg && l.previousPriceSdg > l.priceSdg);
}

interface HomeStorefrontSectionsProps {
  lang: Language;
  selectedCity: CityId | 'all';
  homeListings: Listing[];
  activeOpenAds: SponsoredAd[];
  skeletonLoading: boolean;
  favoriteIds: string[];
  toggleFavorite: (listingId: string) => void;
  getStoreById: (id: string) => Store | undefined;
  renderPhoneCard: (listing: Listing) => React.ReactNode;
  onOpenListing: (listingId: string) => void;
  onOpenStore: (storeId: string) => void;
  onOpenDiscounts: () => void;
  onOpenSearchWith: (patch: Partial<CustomerFilterState>, q?: string) => void;
}

export function HomeStorefrontSections({
  lang,
  selectedCity,
  homeListings,
  activeOpenAds,
  skeletonLoading,
  getStoreById,
  renderPhoneCard,
  onOpenListing,
  onOpenStore,
  onOpenDiscounts,
  onOpenSearchWith,
}: HomeStorefrontSectionsProps) {
  const { getProductRatingSummary, trackAdImpression, trackAdClick } = usePrototype();
  const ForwardChevron = lang === 'ar' ? ChevronLeft : ChevronRight;
  const trackedFeedAdIdsRef = useRef<Set<string>>(new Set());

  // 1. Discounted / Price-Drop listings count & max savings for the rectangular banner
  const discountedListings = useMemo(
    () => homeListings.filter(isDiscountedListing),
    [homeListings]
  );

  const maxDiscountPct = useMemo(() => {
    let maxPct = 0;
    for (const l of discountedListings) {
      if (l.previousPriceSdg && l.previousPriceSdg > l.priceSdg) {
        const pct = Math.round(((l.previousPriceSdg - l.priceSdg) / l.previousPriceSdg) * 100);
        if (pct > maxPct) maxPct = pct;
      }
    }
    return maxPct;
  }, [discountedListings]);

  // 2. New Phones in the Market (factory-sealed arrivals)
  const newMarketPhones = useMemo(() => {
    return [...homeListings]
      .filter((l) => l.condition === 'new')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4);
  }, [homeListings]);

  // 3. Certified Used & Trade-In Ready
  const usedAndTradeInPhones = useMemo(() => {
    return homeListings
      .filter((l) => {
        const st = getStoreById(l.storeId);
        return l.condition === 'used' || l.acceptsTradeIn || Boolean(st?.acceptsTradeIn);
      })
      .sort((a, b) => {
        if (a.condition === 'used' && b.condition !== 'used') return -1;
        if (a.condition !== 'used' && b.condition === 'used') return 1;
        return a.priceSdg - b.priceSdg;
      })
      .slice(0, 6);
  }, [homeListings, getStoreById]);

  // 4. Best Value & Everyday Picks
  const valuePicks = useMemo(() => {
    const shownIds = new Set(newMarketPhones.map((l) => l.id));
    const remaining = homeListings.filter((l) => !shownIds.has(l.id));
    const pool = remaining.length >= 2 ? remaining : homeListings;
    return [...pool].sort((a, b) => a.priceSdg - b.priceSdg).slice(0, 4);
  }, [homeListings, newMarketPhones]);

  // Prioritize active sponsored ads for mid-feed placements
  const feedAds = useMemo(() => {
    if (activeOpenAds.length === 0) return [];
    return [...activeOpenAds].sort((a, b) => {
      const aMatch = selectedCity !== 'all' && a.targetCity === selectedCity ? 1 : 0;
      const bMatch = selectedCity !== 'all' && b.targetCity === selectedCity ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.priority - a.priority;
    });
  }, [activeOpenAds, selectedCity]);

  const primaryFeedAd = feedAds[0] ?? null;
  const secondaryFeedAd = feedAds[1] ?? null;

  // Record in-feed sponsored ad impressions once per session per ad
  useEffect(() => {
    for (const ad of [primaryFeedAd, secondaryFeedAd]) {
      if (!ad) continue;
      if (trackedFeedAdIdsRef.current.has(ad.id)) continue;
      trackedFeedAdIdsRef.current.add(ad.id);
      trackAdImpression(ad.id, {
        city: selectedCity,
        locale: lang,
        listingId: ad.listingId ?? null,
        source: 'home_feed_banner',
      });
    }
  }, [primaryFeedAd, secondaryFeedAd, selectedCity, lang, trackAdImpression]);

  const handleOpenFeedAd = (ad: SponsoredAd) => {
    trackAdClick(ad.id, {
      city: selectedCity,
      locale: lang,
      listingId: ad.listingId ?? null,
      source: 'home_feed_banner',
    });
    if (ad.listingId) {
      onOpenListing(ad.listingId);
    } else if (ad.storeId) {
      onOpenStore(ad.storeId);
    }
  };

  if (skeletonLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3.5">
          <PhoneCardSkeleton clay />
          <PhoneCardSkeleton clay />
          <PhoneCardSkeleton clay />
          <PhoneCardSkeleton clay />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* SECTION 1: Rectangular "Discounts & Offers" Campaign Banner (taps into discounted phones) */}
      <section aria-label={lang === 'ar' ? 'عروض وتخفيضات' : 'Discounts and offers'}>
        <button
          type="button"
          onClick={onOpenDiscounts}
          className="group relative w-full overflow-hidden rounded-[26px] clay-focus-ring text-start block aspect-[16/9] md:aspect-[21/7] md:max-h-[280px] bg-[#0F2419] shadow-md active:scale-[0.99] transition-transform"
        >
          <img
            src={discountsBannerImg}
            alt={lang === 'ar' ? 'عروض خاصة وتخفيضات على الهواتف' : 'Special phone discounts and offers'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08170F]/92 via-[#0A1E14]/50 to-[#08170F]/20" />

          <div className="absolute inset-0 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-semibold text-[#B9F2D0] tracking-wide">
                {discountedListings.length > 0
                  ? lang === 'ar'
                    ? `${discountedListings.length} عروض مخفّضة الآن`
                    : `${discountedListings.length} active price drops`
                  : lang === 'ar'
                    ? 'عروض المتاجر الموثقة'
                    : 'Verified store deals'}
              </span>
              {maxDiscountPct > 0 && (
                <span
                  dir="ltr"
                  className="text-[11px] font-extrabold text-[#0B2316] bg-[#B9F2D0] px-2.5 py-0.5 rounded-full font-mono-num shadow-sm"
                >
                  {lang === 'ar' ? `حتى -${maxDiscountPct}%` : `UP TO -${maxDiscountPct}%`}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-[18px] font-extrabold text-white leading-tight tracking-tight">
                {lang === 'ar' ? 'تخفيضات وعروض خاصة' : 'Discounts & Special Offers'}
              </h2>
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <p className="text-[11px] text-white/85 line-clamp-1 flex-1">
                  {lang === 'ar'
                    ? 'اضغط لعرض جميع الهواتف المخفّضة من المتاجر الموثقة'
                    : 'Tap to browse all phones with active discounts'}
                </p>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#B9F2D0] shrink-0">
                  <span>{lang === 'ar' ? 'تصفح العروض' : 'View deals'}</span>
                  <ForwardChevron className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* SECTION 2: New Phones in the Market (2-Column Grid) */}
      {newMarketPhones.length > 0 && (
        <section aria-label={lang === 'ar' ? 'أحدث الهواتف في السوق' : 'New in the Market'}>
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <h2 className="text-[15px] font-bold text-[#172B20]">
                {lang === 'ar' ? 'أحدث الهواتف في السوق' : 'New in the Market'}
              </h2>
              <p className="text-[11px] text-[#60786B] mt-0.5">
                {selectedCity === 'all'
                  ? lang === 'ar'
                    ? 'أجهزة جديدة مختومة بضمان الوكيل'
                    : 'Factory-sealed arrivals with warranty'
                  : lang === 'ar'
                    ? `أحدث الأجهزة الجديدة في ${formatCity(selectedCity, 'ar')}`
                    : `Newest factory-sealed phones in ${formatCity(selectedCity, 'en')}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSearchWith({ condition: 'new', sortBy: 'newest' })}
              className="text-[11.5px] font-semibold text-[#2A6043] hover:text-[#172B20] whitespace-nowrap transition-colors"
            >
              {lang === 'ar' ? 'عرض الكل' : 'View all'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {newMarketPhones.map(renderPhoneCard)}
          </div>
        </section>
      )}

      {/* MID-FEED SPONSORED AD BANNER #1 (Full-Bleed Editorial Store Ad) */}
      {primaryFeedAd && (
        <section aria-label={lang === 'ar' ? 'إعلان ممول' : 'Sponsored advertisement'}>
          <button
            type="button"
            onClick={() => handleOpenFeedAd(primaryFeedAd)}
            className="group relative w-full overflow-hidden rounded-[26px] clay-focus-ring text-start block aspect-[16/10] md:aspect-[21/7] md:max-h-[260px] bg-[#14281E] shadow-md"
          >
            <SafeImage
              src={primaryFeedAd.imageUrl}
              alt={tText(primaryFeedAd.title, lang)}
              aspectClass="w-full h-full"
              label={tText(primaryFeedAd.title, lang)}
              className="object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A12]/90 via-[#0B1A12]/35 to-black/15" />

            <span className="absolute top-3 end-3 text-[10px] font-semibold tracking-wide text-white/90 bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-full">
              {lang === 'ar' ? 'إعلان ممول' : 'Sponsored'}
            </span>

            <div className="absolute inset-x-0 bottom-0 p-4 space-y-1">
              <p className="text-[10.5px] font-semibold text-[#A7E3C1] truncate">
                {tText(primaryFeedAd.storeName, lang)}
              </p>
              <h3 className="text-[15px] font-extrabold text-white leading-snug line-clamp-2">
                {tText(primaryFeedAd.title, lang)}
              </h3>
              <div className="pt-1 flex items-center justify-between gap-2">
                <p className="text-[11px] text-white/80 line-clamp-1 flex-1">
                  {tText(primaryFeedAd.subtitle, lang)}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white shrink-0">
                  <span>{tText(primaryFeedAd.ctaLabel, lang)}</span>
                  <ForwardChevron className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </button>
        </section>
      )}

      {/* SECTION 3: Certified Used & Trade-In Ready (Horizontal Shelf) */}
      {usedAndTradeInPhones.length > 0 && (
        <section
          aria-label={lang === 'ar' ? 'مستعمل نظيف وخيارات الاستبدال' : 'Certified Used & Trade-In'}
        >
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <h2 className="text-[15px] font-bold text-[#172B20]">
                {lang === 'ar' ? 'مستعمل نظيف وخيارات الاستبدال' : 'Certified Used & Trade-In'}
              </h2>
              <p className="text-[11px] text-[#60786B] mt-0.5">
                {lang === 'ar'
                  ? 'أجهزة مفحوصة بنسبة بطارية واضحة أو متاحة للاستبدال'
                  : 'Inspected units with verified battery health & trade-in options'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSearchWith({ condition: 'used' })}
              className="text-[11.5px] font-semibold text-[#2A6043] hover:text-[#172B20] whitespace-nowrap transition-colors"
            >
              {lang === 'ar' ? 'عرض الكل' : 'See all'}
            </button>
          </div>

          <div className="flex items-stretch gap-3 overflow-x-auto pb-1.5 px-0.5 snap-x snap-mandatory thin-scroll">
            {usedAndTradeInPhones.map((item) => {
              const store = getStoreById(item.storeId);
              const productRating = getProductRatingSummary(item.id);
              const metaHighlight =
                item.condition === 'used' && item.batteryHealthPct
                  ? lang === 'ar'
                    ? `بطارية ${item.batteryHealthPct}%`
                    : `${item.batteryHealthPct}% battery`
                  : lang === 'ar'
                    ? 'يقبل الاستبدال'
                    : 'Trade-in ready';

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenListing(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenListing(item.id);
                    }
                  }}
                  className="group w-[204px] shrink-0 snap-start clay-card-interactive clay-focus-ring rounded-[24px] p-2.5 text-start cursor-pointer flex flex-col"
                >
                  <div className="relative overflow-hidden rounded-[18px] bg-[#E5EDE8] ring-1 ring-[#172B20]/[0.05]">
                    <SafeImage
                      clay
                      src={item.photos[0]?.url}
                      alt={item.model}
                      aspectClass="aspect-[4/3]"
                      label={item.model}
                      className="group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                    />
                  </div>

                  <div className="px-1.5 pt-3 pb-1 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[13px] font-bold text-[#14281E] leading-snug truncate">
                        {formatListingTitle(item.arabicBrandPrefix, item.model, lang)}
                      </h3>
                      <div className="mt-1 flex items-center justify-between gap-1 text-[10.5px] text-[#60786B]">
                        <p className="truncate">
                          <span className="font-medium text-[#245A3D]">{metaHighlight}</span>
                          <span className="mx-1 text-[#A4B7AD]" aria-hidden="true">
                            ·
                          </span>
                          <span dir="ltr" className="font-mono-num">
                            {item.storageGb} GB
                          </span>
                        </p>
                        {productRating.count > 0 && (
                          <CompactStarRating
                            average={productRating.average}
                            count={productRating.count}
                            size="xs"
                          />
                        )}
                      </div>
                      <p className="mt-2 text-[14px] font-extrabold text-[#1E5637] font-mono-num tracking-tight truncate">
                        {formatSdg(item.priceSdg, lang)}
                      </p>
                    </div>

                    {store && (
                      <div className="mt-2.5 pt-2 border-t border-[#172B20]/[0.06] flex items-center gap-1.5 min-w-0">
                        <ShieldCheck className="w-3 h-3 text-[#2D6145] shrink-0" />
                        <span className="text-[10.5px] font-medium text-[#526B5E] truncate">
                          {tText(store.name, lang)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MID-FEED SPOTLIGHT #2 (Second Sponsored Ad or Budget Filter Banner) */}
      {secondaryFeedAd ? (
        <section aria-label={lang === 'ar' ? 'عرض متجر مميز' : 'Featured store promotion'}>
          <button
            type="button"
            onClick={() => handleOpenFeedAd(secondaryFeedAd)}
            className="w-full clay-card-tint clay-focus-ring rounded-[24px] p-3 flex items-center gap-3.5 text-start transition-transform active:scale-[0.99]"
          >
            <div className="w-20 h-24 rounded-[16px] overflow-hidden shrink-0 bg-[#14281E]">
              <SafeImage
                src={secondaryFeedAd.imageUrl}
                alt={tText(secondaryFeedAd.title, lang)}
                aspectClass="w-full h-full"
                label={tText(secondaryFeedAd.title, lang)}
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-bold text-[#245A3D] truncate">
                  {tText(secondaryFeedAd.storeName, lang)}
                </span>
                <span className="text-[#667D71] font-medium shrink-0">
                  {lang === 'ar' ? 'إعلان' : 'Ad'}
                </span>
              </div>
              <h3 className="text-[13px] font-bold text-[#14281E] leading-snug line-clamp-2">
                {tText(secondaryFeedAd.title, lang)}
              </h3>
              <p className="text-[11px] text-[#536D5F] line-clamp-1">
                {tText(secondaryFeedAd.subtitle, lang)}
              </p>
              <span className="inline-flex items-center gap-1 pt-0.5 text-[11px] font-bold text-[#1E5637]">
                <span>{tText(secondaryFeedAd.ctaLabel, lang)}</span>
                <ForwardChevron className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        </section>
      ) : (
        <section aria-label={lang === 'ar' ? 'عروض اقتصادية' : 'Budget deals'}>
          <button
            type="button"
            onClick={() => onOpenSearchWith({ maxPrice: '1000000', sortBy: 'price_asc' })}
            className="w-full clay-card-tint clay-focus-ring rounded-[24px] p-4 flex items-center justify-between gap-3 text-start"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-[16px] clay-pill-active flex items-center justify-center text-[#1E5637] shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-bold text-[#14281E] truncate">
                  {lang === 'ar' ? 'هواتف اقتصادية بأقل من 1,000,000 ج.س' : 'Best Value Under 1,000,000 SDG'}
                </h3>
                <p className="text-[11px] text-[#536D5F] mt-0.5 truncate">
                  {lang === 'ar'
                    ? 'تصفح أفضل الهواتف المتوسطة والاقتصادية بضمان موثق'
                    : 'Explore budget & mid-range phones from verified stores'}
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full clay-pill flex items-center justify-center text-[#245A3D] shrink-0">
              <ForwardChevron className="w-4 h-4" />
            </div>
          </button>
        </section>
      )}

      {/* SECTION 4: Best Value & Popular Picks (2-Column Grid) */}
      {valuePicks.length > 0 && (
        <section aria-label={lang === 'ar' ? 'أفضل قيمة مقابل السعر' : 'Best Value Picks'}>
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <h2 className="text-[15px] font-bold text-[#172B20]">
                {lang === 'ar' ? 'أفضل قيمة مقابل السعر' : 'Best Value Picks'}
              </h2>
              <p className="text-[11px] text-[#60786B] mt-0.5">
                {lang === 'ar'
                  ? 'خيارات اقتصادية ومتوسطة بأسعار منافسة'
                  : 'Smart everyday & budget-friendly phones'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSearchWith({ maxPrice: '1000000', sortBy: 'price_asc' })}
              className="text-[11.5px] font-semibold text-[#2A6043] hover:text-[#172B20] whitespace-nowrap transition-colors"
            >
              {lang === 'ar' ? 'أقل من مليون' : 'Under 1M'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {valuePicks.map(renderPhoneCard)}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Dedicated screen showing ONLY phones with active discounts/price drops.
 * Opened by tapping the rectangular "Discounts & Offers" banner on Home.
 */
export function DiscountsOffersScreen({
  lang,
  listings,
  favoriteIds,
  toggleFavorite,
  getStoreById,
  onBack,
  onOpenListing,
}: {
  lang: Language;
  listings: Listing[];
  favoriteIds: string[];
  toggleFavorite: (listingId: string) => void;
  getStoreById: (id: string) => Store | undefined;
  onBack: () => void;
  onOpenListing: (listingId: string) => void;
}) {
  const { getProductRatingSummary } = usePrototype();
  const discounted = useMemo(
    () =>
      listings
        .filter(isDiscountedListing)
        .sort((a, b) => {
          const pctA = a.previousPriceSdg ? (a.previousPriceSdg - a.priceSdg) / a.previousPriceSdg : 0;
          const pctB = b.previousPriceSdg ? (b.previousPriceSdg - b.priceSdg) / b.previousPriceSdg : 0;
          return pctB - pctA;
        }),
    [listings]
  );

  return (
    <div className="store-clay flex flex-col h-full">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 h-[60px] px-4 clay-topbar shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
          className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20] shrink-0"
        >
          {lang === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-[#172B20] truncate">
            {lang === 'ar' ? 'تخفيضات وعروض خاصة' : 'Discounts & Special Offers'}
          </h1>
          <p className="text-[11px] text-[#60786B] truncate font-mono-num">
            {lang === 'ar'
              ? `${discounted.length} هواتف مخفّضة الأسعار`
              : `${discounted.length} discounted phones`}
          </p>
        </div>
      </div>

      {/* Discounted Listings Feed */}
      <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-3 pb-8 space-y-4">
        {discounted.length === 0 ? (
          <div className="clay-card rounded-[26px] p-8 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-full clay-inset mx-auto flex items-center justify-center text-[#2D6145]">
              <Tag className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-[#172B20]">
              {lang === 'ar' ? 'لا توجد تخفيضات حالياً' : 'No active discounts right now'}
            </p>
            <p className="text-xs text-[#60786B] leading-relaxed">
              {lang === 'ar'
                ? 'عندما يخفض أي متجر موثق سعر هاتف سيظهر هنا تلقائياً.'
                : 'Whenever a verified store lowers a phone price, it appears here automatically.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {discounted.map((item) => {
              const store = getStoreById(item.storeId);
              const productRating = getProductRatingSummary(item.id);
              const prevPrice = item.previousPriceSdg ?? item.priceSdg;
              const savingsSdg = Math.max(0, prevPrice - item.priceSdg);
              const discountPct =
                prevPrice > 0 ? Math.max(1, Math.round((savingsSdg / prevPrice) * 100)) : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenListing(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenListing(item.id);
                    }
                  }}
                  className="group clay-card-interactive clay-focus-ring rounded-[24px] p-2.5 text-start cursor-pointer flex flex-col"
                >
                  <div className="relative overflow-hidden rounded-[18px] bg-[#E5EDE8] ring-1 ring-[#172B20]/[0.05]">
                    <SafeImage
                      clay
                      src={item.photos[0]?.url}
                      alt={item.model}
                      aspectClass="aspect-[4/3]"
                      label={item.model}
                      className="group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      aria-label={lang === 'ar' ? 'المفضلة' : 'Favorite'}
                      className={`absolute top-2 end-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors ${
                        favoriteIds.includes(item.id)
                          ? 'text-[#C81E3A]'
                          : 'text-[#5A7265] hover:text-[#C81E3A]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${favoriteIds.includes(item.id) ? 'fill-current' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="px-1.5 pt-3 pb-1 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[13px] font-bold text-[#14281E] leading-snug truncate">
                        {formatListingTitle(item.arabicBrandPrefix, item.model, lang)}
                      </h3>

                      <div className="mt-1 flex items-center justify-between gap-1 text-[10.5px] text-[#60786B]">
                        <p className="truncate">
                          <span>{formatCondition(item.condition, lang)}</span>
                          <span className="mx-1 text-[#A4B7AD]" aria-hidden="true">
                            ·
                          </span>
                          <span dir="ltr" className="font-mono-num">
                            {item.storageGb} GB
                          </span>
                        </p>
                        {productRating.count > 0 && (
                          <CompactStarRating
                            average={productRating.average}
                            count={productRating.count}
                            size="xs"
                          />
                        )}
                      </div>

                      <div className="mt-2 space-y-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-[14px] font-extrabold text-[#1E5637] font-mono-num tracking-tight truncate">
                            {formatSdg(item.priceSdg, lang)}
                          </p>
                          <span
                            dir="ltr"
                            className="text-[10.5px] font-bold text-[#157A4A] font-mono-num shrink-0"
                          >
                            -{discountPct}%
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[#7D9186] line-through font-mono-num truncate">
                          {formatSdg(prevPrice, lang)}
                        </p>
                      </div>
                    </div>

                    {store && (
                      <div className="mt-2.5 pt-2 border-t border-[#172B20]/[0.06] flex items-center gap-1.5 min-w-0">
                        <ShieldCheck className="w-3 h-3 text-[#2D6145] shrink-0" />
                        <span className="text-[10.5px] font-medium text-[#526B5E] truncate">
                          {tText(store.name, lang)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
