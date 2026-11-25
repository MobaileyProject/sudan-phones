import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Battery,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  GitCompareArrows,
  Globe,
  Heart,
  Info,
  LogOut,
  MapPin,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Store as StoreIcon,
  TrendingDown,
  User,
  Wifi,
  X,
} from 'lucide-react';
import { BrandId, Listing, Store } from '../../types';
import {
  formatCity,
  formatCondition,
  formatListingTitle,
  formatSdg,
  formatUsedAvailability,
  formatUsedGrade,
  tText,
} from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import { LtrValue, SafeImage } from '../../components/DesignSystem';
import {
  ColorSwatchBead,
  FullSpecificationsSheet,
  PhoneQuickHighlightsBar,
} from './PhoneSpecsAndCompare';
import {
  CompactStarRating,
  RateTargetSheet,
  RatingSummaryAndReviewsCard,
} from './RatingsComponents';
import { ReportTargetSheet } from './ReportTargetSheet';

/**
 * C-03: Listing Details Screen (Minimalist Claymorphism + Unavailable/Removed state + Lightbox)
 */
export function CustomerListingDetails({
  listingId,
  onBack,
  onOpenStore,
  onCompareOffers,
  onCompareDetailed,
  onOpenListing,
  onContactSeller,
}: {
  listingId: string;
  onBack: () => void;
  onOpenStore: (storeId: string) => void;
  onCompareOffers: (variantKey: string) => void;
  onCompareDetailed: (listingId: string) => void;
  onOpenListing: (id: string) => void;
  onContactSeller: (listing: Listing, store: Store) => void;
}) {
  const {
    lang,
    listings,
    publicListings,
    cachedPublicListings,
    cachedAtLabel,
    getStoreById,
    getPhoneModelRatingSummary,
    getStoreRatingSummary,
    submitPhoneModelRating,
    customerReports,
    submitCustomerReport,
    favoriteIds,
    toggleFavorite,
    sim,
    reconnectAndRefresh,
  } = usePrototype();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [specsSheetOpen, setSpecsSheetOpen] = useState(false);
  const [ratePhoneModelOpen, setRatePhoneModelOpen] = useState(false);
  const [reportListingOpen, setReportListingOpen] = useState(false);
  const [galleryUnlocked, setGalleryUnlocked] = useState(false);

  const hasReportedListing = customerReports.some(
    (r) => r.targetType === 'listing' && r.targetId === listingId && r.status === 'open'
  );

  const isOfflineCached = sim.offlineMode === 'offline_cached';
  const activePool = isOfflineCached ? cachedPublicListings : publicListings;
  const listing = (isOfflineCached ? cachedPublicListings : listings).find((l) => l.id === listingId);
  const store = listing ? getStoreById(listing.storeId) : undefined;
  const isAvailablePublicly = isOfflineCached
    ? Boolean(listing && store)
    : Boolean(listing && store) &&
      store!.verificationStatus === 'verified' &&
      listing!.publicationStatus === 'published' &&
      (listing!.condition === 'new' || listing!.usedAvailability !== 'sold');

  const sameVariantOffers = useMemo(() => {
    if (!listing) return [];
    return activePool.filter((l) => l.variantKey === listing.variantKey);
  }, [listing, activePool]);

  const relatedListings = useMemo(() => {
    if (!listing) return [];
    return activePool
      .filter((l) => l.id !== listing.id && (l.brand === listing.brand || l.condition === listing.condition))
      .slice(0, 4);
  }, [listing, activePool]);

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;
  const ForwardChevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  // Unavailable / Removed Listing State
  if (!listing || !store || !isAvailablePublicly) {
    return (
      <div className="store-clay flex flex-col h-full">
        <div className="sticky top-0 z-20 flex items-center gap-3 h-[60px] px-4 clay-topbar">
          <button
            type="button"
            onClick={onBack}
            aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
            className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20]"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-[#172B20]">
            {lang === 'ar' ? 'تفاصيل الإعلان' : 'Listing Details'}
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="flex-1 flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-16 h-16 rounded-[24px] bg-[#FDF4E2] border border-white/85 shadow-[0_12px_24px_-10px_rgba(168,101,18,0.22),inset_0_2px_4px_rgba(255,255,255,0.92),inset_0_-4px_8px_rgba(168,101,18,0.08)] flex items-center justify-center text-[#B36B12] mb-5">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#172B20] mb-2">
            {lang === 'ar' ? 'هذا الإعلان غير متاح حالياً' : 'This listing is no longer available'}
          </h2>
          <p className="text-xs text-[#5E7669] max-w-[280px] leading-relaxed mb-6">
            {lang === 'ar'
              ? 'قد يكون تم بيع الهاتف أو إزالة الإعلان أو تعليق المتجر مؤقتاً. يمكنك تصفح عروض أخرى موثقة.'
              : 'This unit may have been sold, removed during moderation, or hidden due to store suspension.'}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="clay-primary-btn clay-focus-ring h-12 px-7 rounded-full text-sm font-bold"
          >
            {lang === 'ar' ? 'العودة إلى العروض المتاحة' : 'Browse available offers'}
          </button>
        </motion.div>
      </div>
    );
  }

  const activePhoto = listing.photos[photoIdx] ?? listing.photos[0];
  const title = formatListingTitle(listing.arabicBrandPrefix, listing.model, lang);

  return (
    <div className="store-clay flex flex-col h-full relative">
      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto thin-scroll pb-28">
        {/* Sculpted Clay Framed Hero Photo Gallery */}
        <div className="px-3.5 pt-2.5">
          <div className="clay-card rounded-[28px] p-2 relative">
            <div
              onClick={() => setLightboxOpen(true)}
              className="relative overflow-hidden rounded-[21px] cursor-zoom-in bg-[#E5EDE8]"
            >
              <SafeImage
                clay
                src={activePhoto?.url}
                alt={activePhoto ? tText(activePhoto.caption, lang) : title}
                aspectClass="aspect-[4/3]"
                label={title}
              />

              {/* Subtle bottom contrast scrim only for photo counter legibility */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#13241B]/35 to-transparent" />

              {/* Floating Clay Back, Report & Expand buttons */}
              <div
                className="absolute top-2.5 inset-x-2.5 z-10 flex items-center justify-between"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
                  className="clay-pill clay-focus-ring w-8 h-8 rounded-full flex items-center justify-center text-[#172B20]"
                >
                  <BackIcon className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(listing.id)}
                    aria-label={lang === 'ar' ? 'حفظ في المفضلة' : 'Save to favorites'}
                    title={lang === 'ar' ? 'حفظ في المفضلة' : 'Save to favorites'}
                    className={`clay-pill clay-focus-ring w-8 h-8 rounded-full flex items-center justify-center ${
                      favoriteIds.includes(listing.id) ? 'text-[#C81E3A]' : 'text-[#5A7265] hover:text-[#C81E3A]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favoriteIds.includes(listing.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportListingOpen(true)}
                    aria-label={lang === 'ar' ? 'الإبلاغ عن الإعلان' : 'Report listing'}
                    title={lang === 'ar' ? 'الإبلاغ عن الإعلان' : 'Report listing'}
                    className={`clay-pill clay-focus-ring w-8 h-8 rounded-full flex items-center justify-center ${
                      hasReportedListing ? 'text-[#B4232C]' : 'text-[#5A7265] hover:text-[#B4232C]'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={lang === 'ar' ? 'تكبير الصور' : 'Expand gallery'}
                    className="clay-pill clay-focus-ring w-8 h-8 rounded-full flex items-center justify-center text-[#172B20]"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Left/Right Gallery Arrows */}
              {listing.photos.length > 1 && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setPhotoIdx((i) => (i - 1 + listing.photos.length) % listing.photos.length)}
                    aria-label="Previous photo"
                    className="clay-pill clay-focus-ring absolute start-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-[#172B20] flex items-center justify-center"
                  >
                    {lang === 'ar' ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoIdx((i) => (i + 1) % listing.photos.length)}
                    aria-label="Next photo"
                    className="clay-pill clay-focus-ring absolute end-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-[#172B20] flex items-center justify-center"
                  >
                    {lang === 'ar' ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* Photo Counter & Caption */}
              <div className="absolute bottom-2.5 start-2.5 px-2 py-0.5 rounded-full bg-white/88 backdrop-blur-md text-[#172B20] text-[9.5px] font-bold font-mono-num leading-tight shadow-sm">
                {photoIdx + 1} / {listing.photos.length}
              </div>
              {activePhoto && (
                <div className="absolute bottom-2.5 end-2.5 max-w-[56%] truncate px-2 py-0.5 rounded-full bg-white/88 backdrop-blur-md text-[#172B20] text-[9.5px] font-medium leading-tight shadow-sm">
                  {tText(activePhoto.caption, lang)}
                </div>
              )}
            </div>

            {/* Thumbnails Row — inside the gallery clay frame */}
            {listing.photos.length > 1 && (
              <div className="px-1.5 pt-2.5 pb-0.5">
                {sim.lowDataMode && !galleryUnlocked ? (
                  <div className="flex items-center justify-between gap-2 text-xs px-1">
                    <span className="text-[#5D7568]">
                      {lang === 'ar'
                        ? `وضع توفير البيانات: الصورة الرئيسية فقط (+${listing.photos.length - 1} صور)`
                        : `Data Saver: Cover only (+${listing.photos.length - 1} photos)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGalleryUnlocked(true)}
                      className="clay-pill-active h-8 px-3 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0"
                    >
                      {lang === 'ar' ? 'تحميل باقي الصور' : 'Load gallery'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto thin-scroll py-0.5">
                    {listing.photos.map((p, idx) => {
                      const isSlowDeferred = sim.offlineMode === 'slow' && idx > 1 && !galleryUnlocked;
                      if (isSlowDeferred) {
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setGalleryUnlocked(true);
                              setPhotoIdx(idx);
                            }}
                            className="w-14 h-11 rounded-[13px] clay-inset text-[9.5px] font-semibold text-[#5B7366] flex items-center justify-center shrink-0 animate-pulse"
                          >
                            {lang === 'ar' ? 'تحميل' : 'Load'}
                          </button>
                        );
                      }
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPhotoIdx(idx)}
                          className={`w-14 h-11 rounded-[13px] overflow-hidden shrink-0 transition-all ${
                            idx === photoIdx
                              ? 'ring-2 ring-[#2D6145] ring-offset-2 ring-offset-[#F5F9F6] opacity-100 scale-[1.02]'
                              : 'opacity-60 hover:opacity-90'
                          }`}
                        >
                          <SafeImage clay src={p.url} alt={tText(p.caption, lang)} aspectClass="w-full h-full" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Distinct Offline Cached Availability Notice */}
        {isOfflineCached && (
          <div className="mx-4 mt-3.5 p-3.5 rounded-[22px] bg-[#FDF6E8] border border-white/85 shadow-[0_10px_22px_-10px_rgba(122,74,16,0.16),inset_0_2px_4px_rgba(255,255,255,0.9)] text-[11px] text-[#7A4A10] flex items-center justify-between gap-2">
            <span className="leading-relaxed">
              {lang === 'ar'
                ? `بيانات محفوظة مؤقتاً (${cachedAtLabel.slice(11)}) — قد يتغير السعر أو التوفر عند إعادة الاتصال.`
                : `Cached snapshot (${cachedAtLabel.slice(11)}) — price & availability unconfirmed offline.`}
            </span>
            <button
              type="button"
              onClick={reconnectAndRefresh}
              className="clay-pill px-3 py-1.5 rounded-full text-[#172B20] font-bold shrink-0"
            >
              {lang === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        )}

        {/* Core Identity & Price Block (Minimalist Open Typography on Clay Canvas) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="px-5 pt-5 pb-3 space-y-2"
        >
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#647C6F]">
            <span
              className={
                listing.condition === 'new'
                  ? 'font-bold text-[#245A3D]'
                  : 'font-bold text-[#354E41]'
              }
            >
              {formatCondition(listing.condition, lang)}
            </span>
            <span aria-hidden="true">·</span>
            <span dir="ltr" className="font-mono-num text-[#3D574A] font-medium">
              {listing.storageGb} GB
            </span>
            {listing.ramGb && (
              <>
                <span aria-hidden="true">·</span>
                <span dir="ltr" className="font-mono-num text-[#3D574A] font-medium">
                  {listing.ramGb} GB RAM
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#233B2E]">
              <ColorSwatchBead color={listing.color} size={14} />
              <span>{tText(listing.color, lang)}</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <h1 className="text-[21px] font-bold text-[#172B20] leading-snug tracking-tight">
              {title}
            </h1>
            {(() => {
              const modelSummary = getPhoneModelRatingSummary(listing.brand, listing.model);
              return (
                <button
                  type="button"
                  onClick={() => setRatePhoneModelOpen(true)}
                  className="clay-pill clay-focus-ring px-2.5 py-1 rounded-full shrink-0"
                  title={
                    lang === 'ar'
                      ? `تقييم هاتف ${title} (مشترك في جميع المتاجر)`
                      : `${title} rating (shared across all stores)`
                  }
                >
                  <CompactStarRating
                    average={modelSummary.average}
                    count={modelSummary.count}
                    size="xs"
                  />
                </button>
              );
            })()}
          </div>

          <div className="flex items-baseline justify-between gap-3 pt-1">
            <div>
              <p className="text-[23px] font-bold text-[#1F5337] font-mono-num tracking-tight">
                {formatSdg(listing.priceSdg, lang)}
              </p>
              {listing.priceDropped && listing.previousPriceSdg && listing.previousPriceSdg > listing.priceSdg && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#7D9186] line-through font-mono-num">
                    {formatSdg(listing.previousPriceSdg, lang)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    <TrendingDown className="w-3 h-3" />
                    {lang === 'ar' ? 'انخفض السعر' : 'Price Drop'}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs font-semibold text-[#546E60]">
              {listing.condition === 'new'
                ? (listing.stockQty ?? 0) > 0
                  ? lang === 'ar'
                    ? `متوفر (${listing.stockQty} قطع)`
                    : `In stock (${listing.stockQty} units)`
                  : lang === 'ar'
                    ? 'نفذت الكمية مؤقتاً'
                    : 'Currently out of stock'
                : formatUsedAvailability(listing.usedAvailability, lang)}
            </span>
          </div>

          {(listing.acceptsTradeIn || store.acceptsTradeIn) && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-[#0F6B5D] text-[11px] font-bold">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'يقبل الاستبدال (Trade-In)' : 'Accepts Trade-In'}
              </span>
            </div>
          )}
        </motion.div>

        {/* Quick Highlights Bar + View All Specs & Detailed Comparison Triggers */}
        <PhoneQuickHighlightsBar
          listing={listing}
          onOpenFullSpecs={() => setSpecsSheetOpen(true)}
          onOpenDetailedCompare={() => onCompareDetailed(listing.id)}
        />

        {/* Compare Offers Banner (C-06 Entry Point) */}
        {sameVariantOffers.length > 1 && (
          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={() => onCompareOffers(listing.variantKey)}
              className="w-full clay-card-tint clay-focus-ring flex items-center justify-between gap-3 p-3.5 rounded-[24px] text-start"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-[15px] clay-pill text-[#23573A] flex items-center justify-center shrink-0">
                  <GitCompareArrows className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#163926]">
                    {lang === 'ar'
                      ? `قارن ${sameVariantOffers.length} عروض لنفس الجهاز (${listing.storageGb} GB)`
                      : `Compare ${sameVariantOffers.length} verified offers (${listing.storageGb} GB)`}
                  </p>
                  <p className="text-[11px] text-[#3B624C] truncate mt-0.5">
                    {lang === 'ar'
                      ? 'شاهد الفروقات في السعر والضمان والمدينة'
                      : 'Compare price, condition, warranty & city'}
                  </p>
                </div>
              </div>
              <ForwardChevron className="w-4 h-4 text-[#23573A] shrink-0" />
            </button>
          </div>
        )}

        {/* Condition-Specific Specifications */}
        <div className="px-4 pt-4">
          <div className="clay-card rounded-[26px] p-4 space-y-3.5">
            <h2 className="text-xs font-bold text-[#172B20] px-0.5">
              {listing.condition === 'new'
                ? lang === 'ar'
                  ? 'تفاصيل الهاتف الجديد والضمان'
                  : 'New Phone Seal & Warranty'
                : lang === 'ar'
                  ? 'تقرير حالة الجهاز المستعمل (قطعة فردية)'
                  : 'Used Physical Unit Inspection Report'}
            </h2>

            {listing.condition === 'new' ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-[18px] clay-inset">
                  <p className="text-[10.5px] text-[#667D71] mb-1">
                    {lang === 'ar' ? 'حالة التغليف' : 'Box Seal'}
                  </p>
                  <p className="font-bold text-[#172B20] flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-[#2D6145] shrink-0" />
                    <span className="truncate">
                      {listing.sealedBox
                        ? lang === 'ar'
                          ? 'مختوم من المصنع'
                          : 'Factory Sealed'
                        : lang === 'ar'
                          ? 'مفتوح للفحص'
                          : 'Opened for check'}
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-[18px] clay-inset">
                  <p className="text-[10.5px] text-[#667D71] mb-1">
                    {lang === 'ar' ? 'مدة الضمان' : 'Warranty Duration'}
                  </p>
                  <p className="font-bold text-[#172B20] font-mono-num">
                    {listing.warrantyMonths} {lang === 'ar' ? 'شهراً' : 'months'}
                  </p>
                </div>
                {listing.warrantyType && (
                  <div className="col-span-2 p-3 rounded-[18px] clay-inset">
                    <p className="text-[10.5px] text-[#667D71] mb-1">
                      {lang === 'ar' ? 'نوع الضمان' : 'Warranty Coverage'}
                    </p>
                    <p className="font-bold text-[#172B20]">{tText(listing.warrantyType, lang)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-[18px] clay-inset">
                    <p className="text-[10.5px] text-[#667D71] mb-1">
                      {lang === 'ar' ? 'درجة النظافة' : 'Condition Grade'}
                    </p>
                    <p className="font-bold text-[#172B20]">
                      {formatUsedGrade(listing.usedGrade, lang)}
                    </p>
                  </div>
                  <div className="p-3 rounded-[18px] clay-inset">
                    <p className="text-[10.5px] text-[#667D71] mb-1">
                      {lang === 'ar' ? 'صحة البطارية' : 'Battery Health'}
                    </p>
                    <p className="font-bold text-[#225439] flex items-center gap-1.5 font-mono-num">
                      <Battery className="w-3.5 h-3.5 text-[#2D6145] shrink-0" />
                      {listing.batteryHealthPct !== null
                        ? `${listing.batteryHealthPct}%`
                        : lang === 'ar'
                          ? 'غير موثق'
                          : 'Not verified'}
                    </p>
                  </div>
                  <div className="p-3 rounded-[18px] clay-inset">
                    <p className="text-[10.5px] text-[#667D71] mb-1">
                      {lang === 'ar' ? 'الكرتونة الأصلية' : 'Original Box'}
                    </p>
                    <p className="font-bold text-[#172B20]">
                      {listing.originalBox
                        ? lang === 'ar'
                          ? 'متوفرة'
                          : 'Included'
                        : lang === 'ar'
                          ? 'غير متوفرة'
                          : 'Not included'}
                    </p>
                  </div>
                  <div className="p-3 rounded-[18px] clay-inset">
                    <p className="text-[10.5px] text-[#667D71] mb-1">
                      {lang === 'ar' ? 'ضمان الفحص والاسترجاع' : 'Inspection Warranty'}
                    </p>
                    <p className="font-bold text-[#172B20] font-mono-num">
                      {listing.inspectionWarrantyDays} {lang === 'ar' ? 'أيام' : 'days'}
                    </p>
                  </div>
                </div>

                {listing.defectsDescription && (
                  <div className="p-3.5 rounded-[18px] clay-inset">
                    <p className="text-[11px] font-semibold text-[#60776B] mb-1">
                      {lang === 'ar' ? 'الإفصاح عن الخدوش والملاحظات' : 'Disclosed Scratches & Notes'}
                    </p>
                    <p className="text-xs text-[#1D3528] leading-relaxed">
                      {tText(listing.defectsDescription, lang)}
                    </p>
                  </div>
                )}

                {listing.replacedParts && (
                  <div className="p-3.5 rounded-[18px] clay-inset">
                    <p className="text-[11px] font-semibold text-[#60776B] mb-1">
                      {lang === 'ar' ? 'القطع المستبدلة' : 'Replaced Parts Disclosure'}
                    </p>
                    <p className="text-xs text-[#1D3528] leading-relaxed">
                      {tText(listing.replacedParts, lang)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Model-Wide Phone Rating Card (Shared Across All Stores Carrying This Exact Phone Model) */}
        {(() => {
          const modelSummary = getPhoneModelRatingSummary(listing.brand, listing.model);
          return (
            <div className="px-4 pt-4">
              <RatingSummaryAndReviewsCard
                title={lang === 'ar' ? `تقييم ${title}` : `${title} Rating`}
                subtitle={
                  lang === 'ar'
                    ? 'تقييم خاص بهذا الموديل وليس بإعلان متجر واحد'
                    : 'Model rating (not tied to a single store listing)'
                }
                scopeNotice={
                  lang === 'ar'
                    ? `هذا التقييم خاص بهاتف ${title} ويظهر تلقائياً في جميع المتاجر التي تبيع هذا الموديل.`
                    : `Shared rating for ${title} — every store selling this exact phone model automatically displays this rating.`
                }
                summary={modelSummary}
                rateButtonLabel={lang === 'ar' ? 'قيّم الهاتف' : 'Rate Phone'}
                onOpenRateSheet={() => setRatePhoneModelOpen(true)}
              />
            </div>
          );
        })()}

        {/* Verified Store Card (links to C-04) */}
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => onOpenStore(store.id)}
            className="w-full clay-card-interactive clay-focus-ring rounded-[26px] p-4 text-start"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-[16px] clay-pill-active flex items-center justify-center text-[#1F5337] shrink-0">
                  <StoreIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-[#172B20] truncate">
                      {tText(store.name, lang)}
                    </p>
                    <ShieldCheck className="w-4 h-4 text-[#2D6145] shrink-0" />
                    {(() => {
                      const stSummary = getStoreRatingSummary(store.id);
                      return (
                        <CompactStarRating
                          average={stSummary.average}
                          count={stSummary.count}
                          size="xs"
                        />
                      );
                    })()}
                  </div>
                  <p className="text-xs text-[#265B3E] font-medium mt-0.5">
                    {formatCity(store.city, lang)} ·{' '}
                    {lang === 'ar' ? 'متجر فعلي موثّق' : 'Verified physical store'}
                  </p>
                  <p className="text-[11px] text-[#667D71] mt-1 line-clamp-1">
                    {tText(store.address, lang)}
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full clay-inset flex items-center justify-center text-[#5A7265] shrink-0 mt-1">
                <ForwardChevron className="w-4 h-4" />
              </div>
            </div>
          </button>
        </div>

        {/* Report Listing Action Row */}
        <div className="px-4 pt-3.5">
          <button
            type="button"
            onClick={() => setReportListingOpen(true)}
            className="w-full clay-pill clay-focus-ring h-11 px-4 rounded-full flex items-center justify-between gap-2 text-xs font-bold text-[#9E222A] hover:text-[#7E181F]"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <Flag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {hasReportedListing
                  ? lang === 'ar'
                    ? 'تم الإبلاغ عن هذا الإعلان · إرسال بلاغ إضافي'
                    : 'Listing reported · Submit another report'
                  : lang === 'ar'
                    ? 'الإبلاغ عن مشكلة في هذا الإعلان'
                    : 'Report an issue with this listing'}
              </span>
            </span>
            <ForwardChevron className="w-3.5 h-3.5 opacity-75 shrink-0" />
          </button>
        </div>

        {/* Related Listings */}
        {relatedListings.length > 0 && (
          <div className="px-4 pt-6">
            <h3 className="text-[13px] font-bold text-[#172B20] mb-3 px-0.5">
              {lang === 'ar' ? 'هواتف مشابهة من متاجر موثقة' : 'Related Verified Listings'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {relatedListings.map((rel) => {
                const relStore = getStoreById(rel.storeId);
                const relModelSummary = getPhoneModelRatingSummary(rel.brand, rel.model);
                return (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => {
                      setPhotoIdx(0);
                      onOpenListing(rel.id);
                    }}
                    className="clay-card-interactive clay-focus-ring rounded-[24px] p-2 text-start"
                  >
                    <div className="overflow-hidden rounded-[17px]">
                      <SafeImage
                        clay
                        src={rel.photos[0]?.url}
                        alt={rel.model}
                        aspectClass="aspect-[4/3]"
                        label={rel.model}
                      />
                    </div>
                    <div className="px-1.5 pt-2.5 pb-1">
                      <p className="text-[10.5px] text-[#6B8276] truncate">
                        {formatCondition(rel.condition, lang)} ·{' '}
                        <span dir="ltr" className="font-mono-num">
                          {rel.storageGb} GB
                        </span>
                      </p>
                      <p className="text-xs font-bold text-[#172B20] truncate mt-0.5">
                        {formatListingTitle(rel.arabicBrandPrefix, rel.model, lang)}
                      </p>
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <p className="text-xs font-bold text-[#225439] font-mono-num truncate">
                          {formatSdg(rel.priceSdg, lang)}
                        </p>
                        <CompactStarRating
                          average={relModelSummary.average}
                          count={relModelSummary.count}
                          size="xs"
                        />
                      </div>
                      {relStore && (
                        <p className="text-[10px] text-[#72887C] truncate mt-0.5">
                          {tText(relStore.name, lang)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Sculpted Clay Bottom Contact CTA Dock */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 px-3 pb-2.5 pt-3 bg-gradient-to-t from-[#EEF3F0] via-[#EEF3F0]/85 to-transparent">
        <div className="pointer-events-auto clay-dock rounded-[26px] px-3.5 py-2.5 flex items-center gap-3">
          <div className="min-w-0 shrink-0 px-1">
            <p className="text-[10px] text-[#6B8276] font-medium">
              {lang === 'ar' ? 'السعر المباشر' : 'Direct price'}
            </p>
            <p className="text-sm font-bold text-[#1E5035] font-mono-num leading-tight">
              {formatSdg(listing.priceSdg, lang)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onContactSeller(listing, store)}
            className="clay-primary-btn clay-focus-ring flex-1 h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تواصل مع المتجر' : 'Contact Store'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Fullscreen Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-50 bg-[#101C16]/95 backdrop-blur-xl flex flex-col justify-between p-4"
          >
            <div className="flex items-center justify-between text-white">
              <span className="text-xs font-mono-num text-white/80">
                {photoIdx + 1} / {listing.photos.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="my-auto">
              <SafeImage
                clay
                src={activePhoto?.url}
                alt={title}
                aspectClass="aspect-[4/3]"
                className="rounded-[24px] shadow-2xl"
              />
              {activePhoto && (
                <p className="text-xs text-white/80 text-center mt-3.5">
                  {tText(activePhoto.caption, lang)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 pb-2">
              {listing.photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPhotoIdx(idx)}
                  aria-label={`Photo ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === photoIdx ? 'w-7 bg-[#73C998]' : 'w-2 bg-white/35'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Specifications Sheet ("View All Specs" / "عرض كل المواصفات") */}
      <FullSpecificationsSheet
        open={specsSheetOpen}
        listing={listing}
        onClose={() => setSpecsSheetOpen(false)}
        onOpenDetailedCompare={() => onCompareDetailed(listing.id)}
      />

      {/* Interactive Rate Specific Phone Model Sheet */}
      <RateTargetSheet
        open={ratePhoneModelOpen}
        title={lang === 'ar' ? `تقييم ${title}` : `Rate ${title}`}
        subtitle={
          lang === 'ar'
            ? 'قيّم أداء وجودة هذا الموديل بشكل عام'
            : 'Rate the overall quality & performance of this phone model'
        }
        helperNote={
          lang === 'ar'
            ? `تقييمك يرتبط بموديل ${title} نفسه ويظهر تلقائياً في جميع المتاجر التي تبيع هذا الهاتف.`
            : `This rating is linked to the ${title} model itself and automatically applies across every store carrying it.`
        }
        onClose={() => setRatePhoneModelOpen(false)}
        onSubmit={({ rating, authorName, comment }) =>
          submitPhoneModelRating(
            listing.brand,
            listing.model,
            listing.arabicBrandPrefix,
            rating,
            authorName,
            comment
          )
        }
      />

      {/* Interactive Report Listing Sheet */}
      <ReportTargetSheet
        open={reportListingOpen}
        targetType="listing"
        targetName={`${title} · ${tText(store.name, lang)}`}
        onClose={() => setReportListingOpen(false)}
        onSubmit={({ reasonId, details, reporterContact }) =>
          submitCustomerReport({
            targetType: 'listing',
            targetId: listing.id,
            targetTitle: {
              ar: `${formatListingTitle(listing.arabicBrandPrefix, listing.model, 'ar')} (${store.name.ar})`,
              en: `${formatListingTitle(listing.arabicBrandPrefix, listing.model, 'en')} (${store.name.en})`,
            },
            storeId: store.id,
            reasonId,
            details,
            reporterContact,
          })
        }
      />
    </div>
  );
}

/**
 * C-04: Public Store Profile (Minimalist Claymorphism — strictly ZERO private verification documents)
 */
export function CustomerStoreProfile({
  storeId,
  onBack,
  onOpenListing,
  onContactStore,
  onChatInApp,
}: {
  storeId: string;
  onBack: () => void;
  onOpenListing: (listingId: string) => void;
  onContactStore: (store: Store) => void;
  onChatInApp?: (store: Store) => void;
}) {
  const {
    lang,
    getStoreById,
    publicListings,
    getStoreRatingSummary,
    getPhoneModelRatingSummary,
    submitStoreRating,
    submitPhoneModelRating,
    customerReports,
    submitCustomerReport,
  } = usePrototype();
  const [query, setQuery] = useState('');
  const [condFilter, setCondFilter] = useState<'all' | 'new' | 'used'>('all');
  const [rateStoreOpen, setRateStoreOpen] = useState(false);
  const [reportStoreOpen, setReportStoreOpen] = useState(false);
  const [rateModelTarget, setRateModelTarget] = useState<{
    brand: BrandId;
    model: string;
    arabicBrandPrefix: string;
  } | null>(null);

  const hasReportedStore = customerReports.some(
    (r) => r.targetType === 'store' && r.targetId === storeId && r.status === 'open'
  );

  const store = getStoreById(storeId);
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const storeAllListings = useMemo(
    () => publicListings.filter((l) => l.storeId === storeId),
    [publicListings, storeId]
  );

  const storeModels = useMemo(() => {
    const seen = new Map<string, { brand: BrandId; model: string; arabicBrandPrefix: string }>();
    for (const l of storeAllListings) {
      const k = `${l.brand}::${l.model.toLowerCase()}`;
      if (!seen.has(k)) {
        seen.set(k, {
          brand: l.brand,
          model: l.model,
          arabicBrandPrefix: l.arabicBrandPrefix,
        });
      }
    }
    return Array.from(seen.values());
  }, [storeAllListings]);

  const storeListings = useMemo(() => {
    return storeAllListings.filter((l) => {
      if (condFilter !== 'all' && l.condition !== condFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          l.model.toLowerCase().includes(q) ||
          l.arabicBrandPrefix.toLowerCase().includes(q) ||
          String(l.storageGb).includes(q)
        );
      }
      return true;
    });
  }, [storeAllListings, condFilter, query]);

  const storeRatingSummary = getStoreRatingSummary(storeId);

  if (!store || store.verificationStatus !== 'verified') {
    return (
      <div className="store-clay flex flex-col h-full">
        <div className="flex items-center gap-3 h-[60px] px-4 clay-topbar">
          <button
            type="button"
            onClick={onBack}
            className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20]"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-[#172B20]">
            {lang === 'ar' ? 'ملف المتجر' : 'Store Profile'}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#172B20]">
            {lang === 'ar' ? 'هذا المتجر غير متاح في الدليل العام حالياً' : 'Store not available publicly'}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="clay-primary-btn mt-5 h-11 px-6 rounded-full text-xs font-bold"
          >
            {lang === 'ar' ? 'رجوع' : 'Go back'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="store-clay flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto thin-scroll pb-10">
        {/* Framed Soft Clay Storefront Hero Banner */}
        <div className="px-3.5 pt-2.5">
          <div className="clay-card rounded-[28px] p-2 relative">
            <div className="relative overflow-hidden rounded-[21px]">
              <SafeImage
                clay
                src={store.bannerImage}
                alt={tText(store.name, lang)}
                aspectClass="aspect-[16/9]"
                label={tText(store.name, lang)}
              />
              <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
                  className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20]"
                >
                  <BackIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setReportStoreOpen(true)}
                  aria-label={lang === 'ar' ? 'الإبلاغ عن المتجر' : 'Report store'}
                  title={lang === 'ar' ? 'الإبلاغ عن المتجر' : 'Report store'}
                  className={`clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center ${
                    hasReportedStore ? 'text-[#B4232C]' : 'text-[#5A7265] hover:text-[#B4232C]'
                  }`}
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Store Header Identity & Direct Actions */}
        <div className="px-4 pt-5 pb-4 space-y-4">
          <div className="px-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xl font-bold text-[#172B20] tracking-tight truncate">
                  {tText(store.name, lang)}
                </h1>
                <ShieldCheck className="w-5 h-5 text-[#2D6145] shrink-0" />
              </div>
              <button
                type="button"
                onClick={() => setRateStoreOpen(true)}
                className="clay-pill clay-focus-ring px-2.5 py-1 rounded-full shrink-0"
              >
                <CompactStarRating
                  average={storeRatingSummary.average}
                  count={storeRatingSummary.count}
                  size="xs"
                />
              </button>
            </div>
            <p className="text-xs text-[#265B3E] font-semibold mt-1">
              {lang === 'ar' ? 'متجر فعلي موثّق' : 'Verified physical retail store'} ·{' '}
              {formatCity(store.city, lang)}
            </p>
            <p className="text-xs text-[#5A7265] leading-relaxed mt-2">
              {tText(store.description, lang)}
            </p>
          </div>

          <div className="clay-card rounded-[24px] p-4 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full clay-pill-active flex items-center justify-center text-[#23573A] shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-[#172B20]">{tText(store.address, lang)}</p>
                <p className="text-[11px] text-[#60776B] mt-0.5">
                  {tText(store.locationGuidance, lang)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pt-2.5 border-t border-[#172B20]/[0.06] text-[#4E6659]">
              <Clock className="w-4 h-4 text-[#6B8276] shrink-0" />
              <span className="font-medium">{tText(store.openingHours, lang)}</span>
            </div>
            {store.acceptsTradeIn && (
              <div className="flex items-center gap-2 pt-2.5 border-t border-[#172B20]/[0.06] text-[#0F6B5D] font-bold">
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                <span>{lang === 'ar' ? 'المتجر يقبل استبدال الهواتف (Trade-In)' : 'Store accepts phone Trade-In'}</span>
              </div>
            )}
            {store.latitude != null && store.longitude != null && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full h-10 px-4 rounded-full bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'فتح موقع المتجر على خرائط قوقل' : 'Open Store Pin in Google Maps'}</span>
              </a>
            )}
          </div>

          <div className="space-y-2.5">
            {onChatInApp && (
              <button
                type="button"
                onClick={() => onChatInApp(store)}
                className="clay-primary-btn clay-focus-ring w-full h-12 rounded-full text-xs font-bold flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  {lang === 'ar' ? 'تواصل مع المتجر عبر التطبيق' : 'Message Store in App'}
                </span>
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onContactStore(store)}
                className="clay-whatsapp-btn clay-focus-ring h-12 rounded-full text-xs font-bold flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                {lang === 'ar' ? 'واتساب المتجر' : 'WhatsApp'}
              </button>
              <button
                type="button"
                onClick={() => onContactStore(store)}
                className="clay-pill clay-focus-ring h-12 rounded-full text-[#172B20] text-xs font-bold flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-[#2D6145]" />
                {lang === 'ar' ? 'اتصال مباشر' : 'Call Store'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setReportStoreOpen(true)}
            className="w-full clay-pill clay-focus-ring h-11 px-4 rounded-full text-xs font-bold text-[#9E222A] hover:text-[#7E181F] flex items-center justify-center gap-2"
          >
            <Flag className="w-3.5 h-3.5 shrink-0" />
            <span>
              {hasReportedStore
                ? lang === 'ar'
                  ? 'تم الإبلاغ عن هذا المتجر · إرسال بلاغ إضافي'
                  : 'Store reported · Submit another report'
                : lang === 'ar'
                  ? 'الإبلاغ عن هذا المتجر'
                  : 'Report this Store'}
            </span>
          </button>

          {/* Store Rating & Customer Reviews */}
          <RatingSummaryAndReviewsCard
            title={lang === 'ar' ? 'تقييم المتجر وآراء العملاء' : 'Store Rating & Reviews'}
            subtitle={
              lang === 'ar'
                ? 'تقييم الخدمة والمصداقية والضمان في هذا المتجر'
                : 'Customer feedback on service, transparency & warranty'
            }
            summary={storeRatingSummary}
            rateButtonLabel={lang === 'ar' ? 'قيّم المتجر' : 'Rate Store'}
            onOpenRateSheet={() => setRateStoreOpen(true)}
          />

          {/* Carried Phone Models — Shared Model-Wide Ratings */}
          {storeModels.length > 0 && (
            <div className="clay-card rounded-[24px] p-3.5 space-y-2.5">
              <div className="px-0.5">
                <h2 className="text-xs font-bold text-[#172B20]">
                  {lang === 'ar'
                    ? 'تقييم الموديلات المتوفرة في المتجر'
                    : 'Phone Model Ratings in Stock'}
                </h2>
                <p className="text-[10.5px] text-[#60786B] mt-0.5">
                  {lang === 'ar'
                    ? 'تقييم كل موديل مشترك تلقائياً مع جميع المتاجر التي تبيعه'
                    : 'Each phone model rating is shared automatically across every store selling it'}
                </p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto py-0.5 thin-scroll">
                {storeModels.map((m) => {
                  const mSummary = getPhoneModelRatingSummary(m.brand, m.model);
                  return (
                    <button
                      key={`${m.brand}-${m.model}`}
                      type="button"
                      onClick={() => setRateModelTarget(m)}
                      className="clay-pill clay-focus-ring h-9 px-3 rounded-full inline-flex items-center gap-2 shrink-0"
                    >
                      <span className="text-[11px] font-bold text-[#172B20] whitespace-nowrap">
                        {m.model}
                      </span>
                      <CompactStarRating
                        average={mSummary.average}
                        count={mSummary.count}
                        size="xs"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Store Active Inventory */}
        <div className="px-4 pt-2 space-y-3.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm font-bold text-[#172B20]">
              {lang === 'ar'
                ? `الهواتف المتوفرة في المتجر (${storeListings.length})`
                : `Active Store Inventory (${storeListings.length})`}
            </h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#6B8276] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث داخل المتجر...' : 'Search store inventory...'}
              className="w-full h-11 ps-10 pe-4 rounded-[20px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 p-1 clay-inset rounded-full">
            {(
              [
                { id: 'all', ar: 'الكل', en: 'All' },
                { id: 'new', ar: 'جديد', en: 'New' },
                { id: 'used', ar: 'مستعمل', en: 'Used' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCondFilter(tab.id)}
                className={`flex-1 h-9 rounded-full text-xs font-bold transition-all ${
                  condFilter === tab.id
                    ? 'clay-pill text-[#172B20]'
                    : 'text-[#60776B] hover:text-[#172B20]'
                }`}
              >
                {lang === 'ar' ? tab.ar : tab.en}
              </button>
            ))}
          </div>

          {storeListings.length === 0 ? (
            <div className="clay-card rounded-[24px] p-7 text-center text-xs text-[#60776B]">
              {lang === 'ar'
                ? 'لا توجد هواتف مطابقة لبحثك في هذا المتجر.'
                : 'No matching phones in this store.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {storeListings.map((item) => {
                const itemModelRating = getPhoneModelRatingSummary(item.brand, item.model);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenListing(item.id)}
                    className="clay-card-interactive clay-focus-ring rounded-[24px] p-2 text-start"
                  >
                    <div className="overflow-hidden rounded-[17px]">
                      <SafeImage
                        clay
                        src={item.photos[0]?.url}
                        alt={item.model}
                        aspectClass="aspect-[4/3]"
                        label={item.model}
                      />
                    </div>
                    <div className="px-1.5 pt-2.5 pb-1">
                      <p className="text-[10.5px] text-[#6B8276] truncate">
                        <span
                          className={
                            item.condition === 'new'
                              ? 'text-[#245A3D] font-semibold'
                              : 'text-[#3B5246] font-semibold'
                          }
                        >
                          {formatCondition(item.condition, lang)}
                        </span>
                        {' · '}
                        <span dir="ltr" className="font-mono-num">
                          {item.storageGb} GB
                        </span>
                      </p>
                      <p className="text-xs font-bold text-[#172B20] truncate mt-0.5">
                        {formatListingTitle(item.arabicBrandPrefix, item.model, lang)}
                      </p>
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <p className="text-xs font-bold text-[#225439] font-mono-num truncate">
                          {formatSdg(item.priceSdg, lang)}
                        </p>
                        <CompactStarRating
                          average={itemModelRating.average}
                          count={itemModelRating.count}
                          size="xs"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rate Store Sheet */}
      <RateTargetSheet
        open={rateStoreOpen}
        title={
          lang === 'ar'
            ? `تقييم ${tText(store.name, 'ar')}`
            : `Rate ${tText(store.name, 'en')}`
        }
        subtitle={
          lang === 'ar'
            ? 'قيّم تجربتك مع هذا المتجر في الخدمة والشفافية'
            : 'Rate your experience with this store’s service & reliability'
        }
        onClose={() => setRateStoreOpen(false)}
        onSubmit={({ rating, authorName, comment }) =>
          submitStoreRating(store.id, rating, authorName, comment)
        }
      />

      {/* Rate Specific Phone Model Sheet */}
      {(() => {
        const modelTitle = rateModelTarget
          ? formatListingTitle(rateModelTarget.arabicBrandPrefix, rateModelTarget.model, lang)
          : '';
        return (
          <RateTargetSheet
            open={rateModelTarget !== null}
            title={lang === 'ar' ? `تقييم ${modelTitle}` : `Rate ${modelTitle}`}
            subtitle={
              lang === 'ar'
                ? 'تقييم عام لهذا الموديل من الهواتف'
                : 'Overall rating for this specific phone model'
            }
            helperNote={
              lang === 'ar'
                ? `يتم تطبيق هذا التقييم تلقائياً على جميع عروض ${modelTitle} في هذا المتجر وكافة المتاجر الأخرى.`
                : `This rating applies automatically to all ${modelTitle} listings in this store and every other store.`
            }
            onClose={() => setRateModelTarget(null)}
            onSubmit={({ rating, authorName, comment }) => {
              if (rateModelTarget) {
                submitPhoneModelRating(
                  rateModelTarget.brand,
                  rateModelTarget.model,
                  rateModelTarget.arabicBrandPrefix,
                  rating,
                  authorName,
                  comment
                );
              }
            }}
          />
        );
      })()}

      {/* Report Store Sheet */}
      <ReportTargetSheet
        open={reportStoreOpen}
        targetType="store"
        targetName={tText(store.name, lang)}
        onClose={() => setReportStoreOpen(false)}
        onSubmit={({ reasonId, details, reporterContact }) =>
          submitCustomerReport({
            targetType: 'store',
            targetId: store.id,
            targetTitle: store.name,
            storeId: store.id,
            reasonId,
            details,
            reporterContact,
          })
        }
      />
    </div>
  );
}

/**
 * C-06: Compare Offers for the Exact Same Device Variant (Minimalist Claymorphism)
 */
export function CustomerCompareOffers({
  variantKey,
  onBack,
  onOpenListing,
  onCompareDetailed,
  onContactSeller,
}: {
  variantKey: string;
  onBack: () => void;
  onOpenListing: (listingId: string) => void;
  onCompareDetailed?: (listingId: string) => void;
  onContactSeller: (listing: Listing, store: Store) => void;
}) {
  const { lang, publicListings, getStoreById, getStoreRatingSummary } = usePrototype();
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const offers = useMemo(() => {
    return publicListings
      .filter((l) => l.variantKey === variantKey)
      .sort((a, b) => a.priceSdg - b.priceSdg);
  }, [publicListings, variantKey]);

  const ref = offers[0];
  const hasBothConditions =
    offers.some((o) => o.condition === 'new') && offers.some((o) => o.condition === 'used');

  return (
    <div className="store-clay flex flex-col h-full">
      {/* Minimalist Sticky Clay Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 h-[60px] px-4 clay-topbar shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
          className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20] shrink-0"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-[#172B20] truncate">
            {lang === 'ar' ? 'مقارنة عروض المتاجر' : 'Compare Verified Offers'}
          </h1>
          {ref && (
            <p className="text-[11px] text-[#637B6E] truncate">
              {formatListingTitle(ref.arabicBrandPrefix, ref.model, lang)} ·{' '}
              <span dir="ltr" className="font-mono-num">
                {ref.storageGb} GB
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-8 space-y-3.5">
        {ref && (
          <div className="clay-card rounded-[24px] p-3.5 space-y-3">
            <div className="flex items-center gap-3.5">
              <SafeImage
                clay
                src={ref.photos[0]?.url}
                alt={ref.model}
                aspectClass="w-16 h-16 shrink-0 rounded-[16px]"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#172B20] truncate">
                  {formatListingTitle(ref.arabicBrandPrefix, ref.model, lang)}
                </p>
                <p className="text-xs text-[#5D7568] font-mono-num mt-0.5" dir="ltr">
                  {ref.storageGb} GB{ref.ramGb ? ` · ${ref.ramGb} GB RAM` : ''}
                </p>
                <p className="text-[11px] text-[#245A3D] font-semibold mt-1">
                  {lang === 'ar'
                    ? `${offers.length} متاجر موثقة توفر نفس السعة والموديل`
                    : `${offers.length} verified stores offering exact variant`}
                </p>
              </div>
            </div>

            {onCompareDetailed && (
              <button
                type="button"
                onClick={() => onCompareDetailed(ref.id)}
                className="clay-pill-active clay-focus-ring w-full h-10 rounded-full text-xs font-bold text-[#17462C] flex items-center justify-center gap-2"
              >
                <GitCompareArrows className="w-3.5 h-3.5" />
                <span>
                  {lang === 'ar'
                    ? 'قارن المواصفات التفصيلية مع هاتف آخر'
                    : 'Compare Full Specs vs Another Phone'}
                </span>
              </button>
            )}
          </div>
        )}

        {hasBothConditions && (
          <div className="rounded-[22px] clay-inset p-3.5 flex items-start gap-2.5 text-xs text-[#4C6457]">
            <Info className="w-4 h-4 text-[#2D6145] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {lang === 'ar'
                ? 'تشمل المقارنة عروضاً جديدة (مختومة بضمان أطول) ومستعملة (قطعة فردية بسعر أقل). راجع درجة النظافة وصحة البطارية لكل عرض.'
                : 'Comparing both New (factory sealed, longer warranty) and Used (individual physical unit, lower price) offers. Check grade and battery health per unit.'}
            </p>
          </div>
        )}

        {offers.map((offer, idx) => {
          const store = getStoreById(offer.storeId);
          if (!store) return null;
          const isBestPrice = idx === 0;
          const storeRating = getStoreRatingSummary(store.id);
          return (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className={`rounded-[26px] p-4 space-y-3.5 ${
                isBestPrice ? 'clay-card-tint' : 'clay-card'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-[#172B20] truncate">
                      {tText(store.name, lang)}
                    </p>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2D6145] shrink-0" />
                    <CompactStarRating
                      average={storeRating.average}
                      count={storeRating.count}
                      size="xs"
                    />
                  </div>
                  <p className="text-[11px] text-[#5D7568] mt-0.5">
                    {formatCity(store.city, lang)} · {tText(offer.color, lang)}
                  </p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-sm font-bold text-[#1E5236] font-mono-num">
                    {formatSdg(offer.priceSdg, lang)}
                  </p>
                  {isBestPrice && (
                    <p className="text-[10.5px] font-bold text-[#245A3D] mt-0.5">
                      {lang === 'ar' ? 'أقل سعر متاح' : 'Lowest price'}
                    </p>
                  )}
                </div>
              </div>

              {/* Clean unboxed spec comparison grid */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#172B20]/[0.07] text-[11px]">
                <div>
                  <span className="text-[#667D71]">{lang === 'ar' ? 'الحالة: ' : 'Condition: '}</span>
                  <span className="font-bold text-[#172B20]">
                    {offer.condition === 'new'
                      ? lang === 'ar'
                        ? 'جديد مختوم'
                        : 'New Sealed'
                      : `${formatCondition('used', lang)} (${formatUsedGrade(offer.usedGrade, lang)})`}
                  </span>
                </div>
                <div>
                  <span className="text-[#667D71]">{lang === 'ar' ? 'الضمان: ' : 'Warranty: '}</span>
                  <span className="font-bold text-[#172B20] font-mono-num">
                    {offer.condition === 'new'
                      ? `${offer.warrantyMonths ?? 0} ${lang === 'ar' ? 'شهراً' : 'mo'}`
                      : `${offer.inspectionWarrantyDays ?? 0} ${lang === 'ar' ? 'أيام فحص' : 'days'}`}
                  </span>
                </div>
                {offer.condition === 'used' && (
                  <div>
                    <span className="text-[#667D71]">{lang === 'ar' ? 'البطارية: ' : 'Battery: '}</span>
                    <span className="font-bold text-[#225439] font-mono-num">
                      {offer.batteryHealthPct !== null
                        ? `${offer.batteryHealthPct}%`
                        : lang === 'ar'
                          ? 'غير موثق'
                          : 'Not verified'}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[#667D71]">{lang === 'ar' ? 'التوفر: ' : 'Stock: '}</span>
                  <span className="font-bold text-[#172B20]">
                    {offer.condition === 'new'
                      ? `${offer.stockQty ?? 0} ${lang === 'ar' ? 'قطع' : 'units'}`
                      : formatUsedAvailability(offer.usedAvailability, lang)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenListing(offer.id)}
                  className="clay-pill clay-focus-ring h-10 rounded-full text-xs font-bold text-[#172B20]"
                >
                  {lang === 'ar' ? 'عرض التفاصيل' : 'View Listing'}
                </button>
                <button
                  type="button"
                  onClick={() => onContactSeller(offer, store)}
                  className="clay-primary-btn clay-focus-ring h-10 rounded-full text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تواصل' : 'Contact'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * C-07: Optional Deferred Customer Account Concept (Minimalist Claymorphism)
 */
export function OptionalCustomerAccountConcept({ onClose }: { onClose: () => void }) {
  const { lang, pushToast } = usePrototype();
  const [view, setView] = useState<'signin' | 'register' | 'recovery' | 'profile'>('signin');
  const [phone, setPhone] = useState('91 440 2299');
  const [name, setName] = useState('وليد الصادق');

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="store-clay flex flex-col h-full">
      <div className="sticky top-0 z-20 flex items-center justify-between h-[60px] px-4 clay-topbar shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20]"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold text-[#172B20]">
          {lang === 'ar' ? 'مسار اختياري: حساب العميل (C-07)' : 'Optional Concept: Account (C-07)'}
        </span>
        <div className="w-11" />
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-8 space-y-4">
        <div className="rounded-[24px] clay-card-tint p-4 text-xs text-[#2B4E3B] leading-relaxed">
          <p className="font-bold text-[#163926] mb-1">
            {lang === 'ar' ? 'مفهوم اختياري مؤجّل — التصفح متاح للضيوف' : 'Deferred Optional Concept — Guest First'}
          </p>
          <p>
            {lang === 'ar'
              ? 'لا يلزم تسجيل الدخول لتصفح الهواتف أو مقارنة العروض أو التواصل مع المتاجر. تم إبقاء هذه الشاشات في مسار منفصل بدون ميزة المفضلة.'
              : 'Sign-in is never required to browse, compare offers, or contact stores. Kept separate with no saved favorites in core browsing.'}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 clay-inset rounded-full text-[11px]">
          {(
            [
              { id: 'signin', ar: 'دخول', en: 'Sign In' },
              { id: 'register', ar: 'تسجيل', en: 'Register' },
              { id: 'recovery', ar: 'استعادة', en: 'Recover' },
              { id: 'profile', ar: 'الملف', en: 'Profile' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`h-9 rounded-full font-bold transition-all ${
                view === t.id ? 'clay-pill text-[#172B20]' : 'text-[#5E7669] hover:text-[#172B20]'
              }`}
            >
              {lang === 'ar' ? t.ar : t.en}
            </button>
          ))}
        </div>

        {view === 'signin' && (
          <div className="clay-card rounded-[26px] p-4 space-y-4">
            <h2 className="text-sm font-bold text-[#172B20]">
              {lang === 'ar' ? 'تسجيل دخول العميل (اختياري)' : 'Customer Sign In (Optional)'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-[#4E6659] mb-1.5">
                {lang === 'ar' ? 'رقم الهاتف السوداني' : 'Sudan Phone Number'}
              </label>
              <div
                className="flex items-center clay-inset rounded-[18px] overflow-hidden"
                dir="ltr"
              >
                <span className="px-3.5 py-3 text-xs font-mono-num font-bold text-[#245A3D] border-r border-[#172B20]/[0.08]">
                  +249
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-3 py-3 bg-transparent text-xs text-[#172B20] font-mono-num focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setView('profile');
                pushToast('info', {
                  ar: 'معاينة ملف العميل الاختياري',
                  en: 'Previewing optional customer profile',
                });
              }}
              className="clay-primary-btn clay-focus-ring w-full h-12 rounded-full text-xs font-bold"
            >
              {lang === 'ar' ? 'متابعة برمز التحقق' : 'Continue with OTP'}
            </button>
          </div>
        )}

        {view === 'register' && (
          <div className="clay-card rounded-[26px] p-4 space-y-4">
            <h2 className="text-sm font-bold text-[#172B20]">
              {lang === 'ar' ? 'إنشاء حساب عميل اختياري' : 'Create Optional Account'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-[#4E6659] mb-1.5">
                {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-[18px] clay-inset text-xs text-[#172B20] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6659] mb-1.5">
                {lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              </label>
              <div
                className="flex items-center clay-inset rounded-[18px] overflow-hidden"
                dir="ltr"
              >
                <span className="px-3.5 py-3 text-xs font-mono-num font-bold text-[#245A3D] border-r border-[#172B20]/[0.08]">
                  +249
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-3 py-3 bg-transparent text-xs text-[#172B20] font-mono-num focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView('profile')}
              className="clay-primary-btn clay-focus-ring w-full h-12 rounded-full text-xs font-bold"
            >
              {lang === 'ar' ? 'إنشاء الحساب الاختياري' : 'Create Optional Account'}
            </button>
          </div>
        )}

        {view === 'recovery' && (
          <div className="clay-card rounded-[26px] p-4 space-y-4">
            <h2 className="text-sm font-bold text-[#172B20]">
              {lang === 'ar' ? 'استعادة الحساب' : 'Account Recovery'}
            </h2>
            <p className="text-xs text-[#5E7669] leading-relaxed">
              {lang === 'ar'
                ? 'أدخل رقم هاتفك المسجل لإرسال رمز استعادة لمرة واحدة.'
                : 'Enter your registered phone number to receive a one-time recovery code.'}
            </p>
            <div
              className="flex items-center clay-inset rounded-[18px] overflow-hidden"
              dir="ltr"
            >
              <span className="px-3.5 py-3 text-xs font-mono-num font-bold text-[#245A3D] border-r border-[#172B20]/[0.08]">
                +249
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-3 py-3 bg-transparent text-xs text-[#172B20] font-mono-num focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                pushToast('success', {
                  ar: 'تم إرسال رمز الاستعادة (محاكاة).',
                  en: 'Recovery code sent (Simulated).',
                })
              }
              className="clay-primary-btn clay-focus-ring w-full h-12 rounded-full text-xs font-bold"
            >
              {lang === 'ar' ? 'إرسال رمز الاستعادة' : 'Send Recovery Code'}
            </button>
          </div>
        )}

        {view === 'profile' && (
          <div className="clay-card rounded-[26px] p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full clay-pill-active flex items-center justify-center text-[#1F5337]">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#172B20]">{name}</p>
                <LtrValue className="text-xs text-[#5E7669]">+249 {phone}</LtrValue>
              </div>
            </div>
            <div className="pt-3 border-t border-[#172B20]/[0.06] text-xs text-[#4E6659] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D6145] shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'حساب مستقبلي اختياري — بدون مفضلة أو سلة مشتريات'
                  : 'Optional future profile — no favorites or cart'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="clay-pill clay-focus-ring w-full h-11 rounded-full text-xs font-bold text-[#172B20]"
            >
              {lang === 'ar' ? 'العودة لتصفح الضيوف' : 'Return to Guest Browsing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Logged-In Customer Account Settings Screen (Minimalist Claymorphism)
 */
export function CustomerAccountSettings({
  user,
  onUpdateUser,
  onOpenCitySheet,
  onSignOut,
  onSignIn,
  onBack,
}: {
  user: { name: string; phone: string } | null;
  onUpdateUser: (next: { name: string; phone: string }) => void;
  onOpenCitySheet: () => void;
  onSignOut: () => void;
  onSignIn?: () => void;
  onBack: () => void;
}) {
  const {
    lang,
    setLang,
    selectedCity,
    sim,
    updateSim,
    pushToast,
    session,
    setPortal,
    updateMeProfile,
  } = usePrototype();
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [phoneInput, setPhoneInput] = useState((user?.phone || '').replace(/^\+249\s*/, ''));

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;
  const ForwardChevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  const trimmedName = nameInput.trim();
  const trimmedPhone = phoneInput.trim();
  const formattedPhone = trimmedPhone.startsWith('+249') ? trimmedPhone : `+249 ${trimmedPhone}`;
  const isDirty = Boolean(user && (trimmedName !== user.name || formattedPhone !== user.phone));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName) {
      pushToast('warning', {
        ar: 'يرجى إدخال الاسم الكامل أولاً',
        en: 'Please enter your full name first',
      });
      return;
    }
    try {
      await updateMeProfile({
        name: trimmedName,
        preferred_city: selectedCity === 'all' ? '' : selectedCity,
        preferred_locale: lang,
      });
      onUpdateUser({ name: trimmedName, phone: formattedPhone });
      pushToast('success', {
        ar: 'تم حفظ إعدادات الحساب على الخادم بنجاح',
        en: 'Account settings saved to server',
      });
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'تعذر حفظ التغييرات',
        en: err?.message || 'Could not save changes',
      });
    }
  };

  return (
    <div className="store-clay flex flex-col h-full">
      {/* Minimalist Clay Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between h-[60px] px-4 clay-topbar shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
          className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20]"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-[#172B20]">
          {lang === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
        </h1>
        <div className="w-11" />
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-10 space-y-4">
        {/* Account Identity Summary Card */}
        {user ? (
          <div className="clay-card-tint rounded-[26px] p-4 flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-[20px] clay-primary-btn flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-[#163926] truncate">{user.name}</p>
              <LtrValue className="text-xs text-[#376049] font-medium mt-0.5">{user.phone}</LtrValue>
              <p className="text-[11px] text-[#245A3D] font-semibold mt-1">
                {lang === 'ar' ? 'حساب مسجّل · دخول نشط' : 'Signed-in account · Active session'}
              </p>
            </div>
          </div>
        ) : (
          <div className="clay-card-tint rounded-[26px] p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#163926]">
                {lang === 'ar' ? 'تتصفح الآن كضيف' : 'Browsing as Guest'}
              </p>
              <p className="text-[11px] text-[#376049] mt-0.5">
                {lang === 'ar'
                  ? 'سجّل الدخول لمزامنة المفضلة والتقييمات بين أجهزتك'
                  : 'Sign in to sync saved favorites and ratings across devices'}
              </p>
            </div>
            {onSignIn && (
              <button
                type="button"
                onClick={onSignIn}
                className="clay-primary-btn h-9 px-4 rounded-full text-xs font-bold shrink-0"
              >
                {lang === 'ar' ? 'دخول' : 'Sign In'}
              </button>
            )}
          </div>
        )}

        {/* Store Owner -> Direct Access to Merchant Portal */}
        {(session.merchant || session.role === 'merchant') && (
          <div className="clay-card rounded-[26px] p-4 border-2 border-[#0F6B5D]/25 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[16px] bg-[#0F6B5D] text-white flex items-center justify-center shrink-0">
                <StoreIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#172B20]">
                  {lang === 'ar' ? 'بوابة التاجر وإدارة المتجر' : 'Merchant Portal & Store Management'}
                </p>
                <p className="text-[11px] text-[#566E61] mt-0.5">
                  {lang === 'ar'
                    ? 'إدارة إعلاناتك، تحديث الأسعار والمخزون، متابعة المشاهدات، وفريق العمل.'
                    : 'Manage your listings, update prices & stock, track views, and manage store staff.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPortal('merchant')}
              className="clay-primary-btn clay-focus-ring w-full h-11 rounded-full text-xs font-bold flex items-center justify-center gap-2"
            >
              <StoreIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'فتح بوابة التاجر' : 'Open Merchant Portal'}</span>
            </button>
          </div>
        )}

        {/* Admin / Founder -> Direct Access to Admin Portal */}
        {session.role === 'admin' && (
          <div className="clay-card rounded-[26px] p-4 border-2 border-blue-600/25 space-y-3">
            <button
              type="button"
              onClick={() => setPortal('admin')}
              className="w-full h-11 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'ar' ? 'فتح بوابة الإدارة' : 'Open Admin Portal'}</span>
            </button>
          </div>
        )}

        {/* Profile Information Form */}
        {user && (
        <form onSubmit={handleSave} className="clay-card rounded-[26px] p-4 space-y-3.5">
          <h2 className="text-xs font-bold text-[#172B20]">
            {lang === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
          </h2>

          <div>
            <label
              htmlFor="account-settings-name"
              className="block text-[11.5px] font-semibold text-[#566E61] mb-1.5"
            >
              {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
            </label>
            <input
              id="account-settings-name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[18px] clay-inset text-xs font-medium text-[#172B20] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="account-settings-phone"
              className="block text-[11.5px] font-semibold text-[#566E61] mb-1.5"
            >
              {lang === 'ar' ? 'رقم الهاتف السوداني' : 'Sudan Phone Number'}
            </label>
            <div
              className="flex items-center clay-inset rounded-[18px] overflow-hidden"
              dir="ltr"
            >
              <span className="px-3.5 py-3 text-xs font-mono-num font-bold text-[#245A3D] border-r border-[#172B20]/[0.08]">
                +249
              </span>
              <input
                id="account-settings-phone"
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="flex-1 px-3 py-3 bg-transparent text-xs text-[#172B20] font-mono-num focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isDirty}
            className="clay-primary-btn clay-focus-ring w-full h-11 rounded-full text-xs font-bold disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
          </button>
        </form>
        )}

        {/* Store Preferences Card */}
        <div className="clay-card rounded-[26px] p-4 space-y-3">
          <h2 className="text-xs font-bold text-[#172B20]">
            {lang === 'ar' ? 'تفضيلات التطبيق' : 'App Preferences'}
          </h2>

          {/* Default City */}
          <button
            type="button"
            onClick={onOpenCitySheet}
            className="w-full p-3 rounded-[20px] clay-inset flex items-center justify-between gap-3 text-start hover:bg-[#EDF3EF] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full clay-pill flex items-center justify-center text-[#2D6145] shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#172B20]">
                  {lang === 'ar' ? 'الولاية الافتراضية' : 'Default State'}
                </p>
                <p className="text-[11px] text-[#5D7568] truncate">{formatCity(selectedCity, lang)}</p>
              </div>
            </div>
            <ForwardChevron className="w-4 h-4 text-[#637B6E] shrink-0" />
          </button>

          {/* Language Switcher */}
          <div className="p-3 rounded-[20px] clay-inset flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full clay-pill flex items-center justify-center text-[#2D6145] shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#172B20]">
                  {lang === 'ar' ? 'لغة التطبيق' : 'App Language'}
                </p>
                <p className="text-[11px] text-[#5D7568]">
                  {lang === 'ar' ? 'العربية (RTL)' : 'English (LTR)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="clay-pill clay-focus-ring h-9 px-3.5 rounded-full text-[11px] font-bold text-[#172B20] whitespace-nowrap"
            >
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>

          {/* Data Saver Toggle */}
          <div className="p-3 rounded-[20px] clay-inset flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full clay-pill flex items-center justify-center text-[#2D6145] shrink-0">
                <Wifi className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#172B20]">
                  {lang === 'ar' ? 'وضع توفير البيانات' : 'Data Saver Mode'}
                </p>
                <p className="text-[11px] text-[#5D7568] truncate">
                  {lang === 'ar' ? 'تقليل استهلاك صور العروض' : 'Reduce gallery image usage'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sim.lowDataMode}
              onClick={() => updateSim({ lowDataMode: !sim.lowDataMode })}
              className={`h-9 px-3.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                sim.lowDataMode ? 'clay-pill-active' : 'clay-pill text-[#5D7568]'
              }`}
            >
              {sim.lowDataMode
                ? lang === 'ar'
                  ? 'مفعّل'
                  : 'On'
                : lang === 'ar'
                  ? 'متوقف'
                  : 'Off'}
            </button>
          </div>
        </div>

        {/* Sign Out Action */}
        {user && (
          <button
            type="button"
            onClick={onSignOut}
            className="clay-pill clay-focus-ring w-full h-12 rounded-full text-xs font-bold text-[#B4232C] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

