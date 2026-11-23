import React, { useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { motion, useReducedMotion } from 'motion/react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  Grid2x2,
  Home,
  KeyRound,
  LogIn,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store as StoreIcon,
  UserRound,
  WifiOff,
  X,
} from 'lucide-react';
import { BrandId, Listing, Store } from '../../types';
import {
  BRANDS,
  formatCity,
  formatCondition,
  formatListingTitle,
  formatSdg,
  formatUsedGrade,
  tText,
} from '../../i18n/translations';
import { CATALOG_MODELS } from '../../data/mockData';
import { usePrototype } from '../../store/PrototypeContext';
import {
  BrandLogo,
  OfflineBanner,
  OfflineEmptyScreen,
  PhoneCardSkeleton,
  SafeImage,
} from '../../components/DesignSystem';
import {
  CitySelectorSheet,
  ContactSellerSheet,
  CustomerFilterState,
  CustomerStartupOverlay,
  FilterBottomSheet,
} from './CustomerSheets';
import {
  CustomerAccountSettings,
  CustomerCompareOffers,
  CustomerListingDetails,
  CustomerStoreProfile,
  OptionalCustomerAccountConcept,
} from './CustomerDetailScreens';
import { CustomerDetailedPhoneCompare } from './PhoneSpecsAndCompare';
import {
  CompactStarRating,
  RateTargetSheet,
} from './RatingsComponents';
import {
  AuthThemeMode,
  MobileAppAuthScreens,
  MobileEntryScreen,
} from './MobileAppAuthScreens';

type CustomerTab = 'home' | 'search' | 'brands' | 'stores';

type CustomerSubScreen =
  | { kind: 'none' }
  | { kind: 'listing'; listingId: string }
  | { kind: 'store'; storeId: string }
  | { kind: 'compare'; variantKey: string }
  | { kind: 'compare_phones'; primaryListingId: string; secondaryListingId?: string }
  | { kind: 'brand_models'; brandId: BrandId }
  | { kind: 'optional_account' }
  | { kind: 'account_settings' };

const DEFAULT_FILTERS: CustomerFilterState = {
  brand: 'all',
  condition: 'all',
  storageGb: 'all',
  city: 'all',
  minPrice: '',
  maxPrice: '',
  sortBy: 'newest',
};

export function CustomerApp() {
  const {
    lang,
    selectedCity,
    stores,
    publicListings,
    cachedPublicListings,
    getStoreById,
    getStoreRatingSummary,
    getPhoneModelRatingSummary,
    submitPhoneModelRating,
    sim,
    updateSim,
    reconnectAndRefresh,
    pushToast,
    customerDeepLinkListingId,
    setCustomerDeepLinkListingId,
    session,
    me,
    logoutSession,
  } = usePrototype();

  const discoveryListings =
    sim.offlineMode === 'offline_cached' ? cachedPublicListings : publicListings;

  const prefersReducedMotion = useReducedMotion();

  const heroContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.07,
        delayChildren: prefersReducedMotion ? 0 : 0.04,
      },
    },
  };

  const heroItemVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 18,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.01 : 0.48,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const [entryScreen, setEntryScreen] = useState<MobileEntryScreen | null>('welcome');
  const [authTheme, setAuthTheme] = useState<AuthThemeMode>('light');
  const [signedInUser, setSignedInUser] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    if (session.authenticated && me) {
      setSignedInUser({
        name: me.name || me.email || me.phone,
        phone: me.phone || me.email || '',
      });
    } else if (!session.authenticated) {
      setSignedInUser(null);
    }
  }, [session.authenticated, me]);
  const [tab, setTab] = useState<CustomerTab>('home');
  const [subScreen, setSubScreen] = useState<CustomerSubScreen>({ kind: 'none' });
  const [historyStack, setHistoryStack] = useState<CustomerSubScreen[]>([]);

  // Search & Filters (preserved when navigating into C-03 and back)
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CustomerFilterState>(DEFAULT_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [rateModelTarget, setRateModelTarget] = useState<{
    brand: BrandId;
    model: string;
    arabicBrandPrefix: string;
  } | null>(null);

  // Progressive pagination (respects Low-Data mode — loads 8 vs 12 at a time)
  const pageSize = sim.lowDataMode ? 8 : 12;
  const [visibleSearchCount, setVisibleSearchCount] = useState(pageSize);
  const [slowRefreshing, setSlowRefreshing] = useState(false);

  useEffect(() => {
    setVisibleSearchCount(sim.lowDataMode ? 8 : 12);
  }, [searchQuery, filters, sim.lowDataMode]);

  useEffect(() => {
    if (sim.offlineMode !== 'slow') {
      setSlowRefreshing(false);
      return;
    }
    setSlowRefreshing(true);
    const t = window.setTimeout(() => setSlowRefreshing(false), 750);
    return () => window.clearTimeout(t);
  }, [searchQuery, filters, selectedCity, sim.offlineMode]);

  // Contact Seller Sheet (C-05)
  const [contactTarget, setContactTarget] = useState<{
    listing: Listing | null;
    store: Store | null;
  }>({ listing: null, store: null });

  // Scroll context preservation for C-02 Search
  const searchScrollRef = useRef<HTMLDivElement | null>(null);
  const savedSearchScrollTop = useRef<number>(0);
  const lastBackPressRef = useRef<number>(0);

  // Native Android back button & gesture handler (never closes app unexpectedly)
  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    const handleBack = () => {
      if (contactTarget.store) {
        setContactTarget({ listing: null, store: null });
        return;
      }
      if (filterSheetOpen) {
        setFilterSheetOpen(false);
        return;
      }
      if (citySheetOpen) {
        setCitySheetOpen(false);
        return;
      }
      if (rateModelTarget) {
        setRateModelTarget(null);
        return;
      }
      if (entryScreen !== null) {
        if (entryScreen === 'signin' || entryScreen === 'register') {
          setEntryScreen(null);
        } else if (entryScreen === 'otp' || entryScreen === 'recovery') {
          setEntryScreen('signin');
        } else {
          setEntryScreen(null);
        }
        return;
      }
      if (subScreen.kind !== 'none') {
        goBack();
        return;
      }
      if (tab !== 'home') {
        setTab('home');
        return;
      }
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        CapApp.exitApp().catch(() => {});
      } else {
        lastBackPressRef.current = now;
        pushToast('info', {
          ar: 'اضغط رجوع مرة أخرى للخروج من التطبيق',
          en: 'Press back again to exit',
        });
      }
    };

    CapApp.addListener('backButton', handleBack)
      .then((h) => {
        listenerHandle = h;
      })
      .catch(() => {});

    return () => {
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, [
    contactTarget.store,
    filterSheetOpen,
    citySheetOpen,
    rateModelTarget,
    entryScreen,
    subScreen.kind,
    tab,
    pushToast,
  ]);

  // Deep link handler from Merchant / Admin portals
  useEffect(() => {
    if (customerDeepLinkListingId) {
      setEntryScreen(null);
      setHistoryStack([]);
      setSubScreen({ kind: 'listing', listingId: customerDeepLinkListingId });
      setCustomerDeepLinkListingId(null);
    }
  }, [customerDeepLinkListingId, setCustomerDeepLinkListingId]);

  // Restore scroll when returning to search tab
  useEffect(() => {
    if (subScreen.kind === 'none' && tab === 'search' && searchScrollRef.current) {
      searchScrollRef.current.scrollTop = savedSearchScrollTop.current;
    }
  }, [subScreen.kind, tab]);

  const navigateTo = (next: CustomerSubScreen) => {
    if (subScreen.kind === 'none' && tab === 'search' && searchScrollRef.current) {
      savedSearchScrollTop.current = searchScrollRef.current.scrollTop;
    }
    setHistoryStack((prev) => [...prev, subScreen]);
    setSubScreen(next);
  };

  const goBack = () => {
    setHistoryStack((prev) => {
      if (prev.length === 0) {
        setSubScreen({ kind: 'none' });
        return [];
      }
      const last = prev[prev.length - 1];
      setSubScreen(last);
      return prev.slice(0, -1);
    });
  };

  const verifiedStores = useMemo(
    () =>
      stores.filter(
        (s) =>
          s.verificationStatus === 'verified' &&
          (selectedCity === 'all' || s.city === selectedCity)
      ),
    [stores, selectedCity]
  );

  // City-scoped public listings for Home
  const cityPublicListings = useMemo(() => {
    if (selectedCity === 'all') return discoveryListings;
    return discoveryListings.filter((l) => getStoreById(l.storeId)?.city === selectedCity);
  }, [discoveryListings, selectedCity, getStoreById]);

  const homeListings = cityPublicListings.length > 0 ? cityPublicListings : discoveryListings;

  // Filtered Search Results (C-02)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const minP = filters.minPrice ? Number(filters.minPrice) : null;
    const maxP = filters.maxPrice ? Number(filters.maxPrice) : null;

    const list = discoveryListings.filter((l) => {
      const st = getStoreById(l.storeId);
      if (filters.brand !== 'all' && l.brand !== filters.brand) return false;
      if (filters.condition !== 'all' && l.condition !== filters.condition) return false;
      if (filters.storageGb !== 'all' && l.storageGb !== filters.storageGb) return false;
      if (filters.city !== 'all' && st?.city !== filters.city) return false;
      if (minP !== null && !Number.isNaN(minP) && l.priceSdg < minP) return false;
      if (maxP !== null && !Number.isNaN(maxP) && l.priceSdg > maxP) return false;
      if (q) {
        const hay = `${l.model} ${l.arabicBrandPrefix} ${l.brand} ${l.storageGb}gb ${st?.name.ar ?? ''} ${st?.name.en ?? ''}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });

    if (filters.sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.priceSdg - b.priceSdg);
    }
    if (filters.sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.priceSdg - a.priceSdg);
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [discoveryListings, searchQuery, filters, getStoreById]);

  const searchResultsAnimationKey = useMemo(
    () =>
      searchResults.length === 0
        ? `empty:${searchQuery.trim()}:${filters.sortBy}`
        : `${filters.sortBy}:${searchResults.length}:${searchQuery.trim()}`,
    [searchResults.length, searchQuery, filters.sortBy]
  );

  const activeFilterCount = [
    filters.brand !== 'all',
    filters.condition !== 'all',
    filters.storageGb !== 'all',
    filters.city !== 'all',
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
  ].filter(Boolean).length;

  // Group counts of offers per variantKey so cards can show "Compare 3 offers"
  const variantOfferCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of discoveryListings) {
      counts[l.variantKey] = (counts[l.variantKey] ?? 0) + 1;
    }
    return counts;
  }, [discoveryListings]);

  const openSearchWith = (patch: Partial<CustomerFilterState>, q = '') => {
    setSearchQuery(q);
    setFilters({ ...DEFAULT_FILTERS, city: selectedCity, ...patch });
    setSubScreen({ kind: 'none' });
    setHistoryStack([]);
    setTab('search');
  };

  const ForwardChevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  // Reusable Minimalist Claymorphism Phone Listing Card
  const renderPhoneCard = (listing: Listing) => {
    const store = getStoreById(listing.storeId);
    const offerCount = variantOfferCounts[listing.variantKey] ?? 1;
    const isNew = listing.condition === 'new';
    const modelRating = getPhoneModelRatingSummary(listing.brand, listing.model);

    return (
      <div
        key={listing.id}
        onClick={() => navigateTo({ kind: 'listing', listingId: listing.id })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateTo({ kind: 'listing', listingId: listing.id });
          }
        }}
        className="group clay-card-interactive clay-focus-ring rounded-[26px] p-2.5 text-start cursor-pointer flex flex-col"
      >
        {/* Recessed Soft Clay Photo Stage */}
        <div className="relative overflow-hidden rounded-[19px] bg-[#E5EDE8] ring-1 ring-[#172B20]/[0.05]">
          <SafeImage
            clay
            src={listing.photos[0]?.url}
            alt={listing.model}
            aspectClass="aspect-[1/0.88]"
            label={listing.model}
            className="group-hover:scale-[1.035] transition-transform duration-300 ease-out"
          />
        </div>

        {/* Sculpted Content Hierarchy */}
        <div className="px-1 pt-2.5 pb-0.5 flex-1 flex flex-col justify-between gap-2.5">
          <div>
            {/* Model Title */}
            <h3 className="text-[13px] font-bold text-[#14281E] leading-[1.3] line-clamp-2 min-h-[2.6em]">
              {formatListingTitle(listing.arabicBrandPrefix, listing.model, lang)}
            </h3>

            {/* Minimalist Condition & Storage Spec Line */}
            <p className="mt-1 flex items-center gap-1.5 text-[10.5px] font-medium text-[#60786B] truncate">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isNew ? 'bg-[#2D6145]' : 'bg-[#8AA093]'
                }`}
              />
              <span className={isNew ? 'text-[#245A3D] font-semibold' : 'text-[#445C50] font-semibold'}>
                {formatCondition(listing.condition, lang)}
                {!isNew && listing.usedGrade ? ` (${formatUsedGrade(listing.usedGrade, lang)})` : ''}
              </span>
              <span className="text-[#A4B7AD]">·</span>
              <span dir="ltr" className="font-mono-num text-[#4E6659] shrink-0">
                {listing.storageGb} GB
              </span>
            </p>

            {/* Primary Price Anchor + Shared Phone Model Rating */}
            <div className="mt-2 flex items-center justify-between gap-1.5">
              <p className="text-[13.5px] font-extrabold text-[#1E5637] font-mono-num tracking-tight truncate">
                {formatSdg(listing.priceSdg, lang)}
              </p>
              <CompactStarRating
                average={modelRating.average}
                count={modelRating.count}
                size="xs"
              />
            </div>
          </div>

          {/* Debossed Store Name Footer (Store Name Only) + Optional Compare Action */}
          <div className="space-y-1.5">
            {store && (
              <div className="clay-inset rounded-[14px] px-2.5 py-1.5 flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D6145] shrink-0" />
                <span className="text-[11px] font-semibold text-[#213B2D] truncate">
                  {tText(store.name, lang)}
                </span>
              </div>
            )}

            {offerCount > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateTo({ kind: 'compare', variantKey: listing.variantKey });
                }}
                className="w-full flex items-center justify-between px-1.5 pt-0.5 text-[10.5px] font-semibold text-[#265B3E] hover:text-[#14281E] transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <GitCompareArrows className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {lang === 'ar' ? `قارن ${offerCount} عروض` : `Compare ${offerCount} offers`}
                  </span>
                </span>
                <ForwardChevron className="w-3 h-3 text-[#658072] shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // === Screen Render inside the Mobile Frame ===
  const renderMobileScreenBody = () => {
    if (sim.offlineMode === 'offline_empty') {
      return (
        <OfflineEmptyScreen
          clay
          onRetry={reconnectAndRefresh}
        />
      );
    }

    if (entryScreen !== null) {
      return (
        <MobileAppAuthScreens
          screen={entryScreen}
          authTheme={authTheme}
          onToggleTheme={() => setAuthTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          onNavigate={(next) => setEntryScreen(next)}
          onEnterAppAsGuest={() => {
            setSignedInUser(null);
            setEntryScreen(null);
            setSubScreen({ kind: 'none' });
            setTab('home');
          }}
          onEnterAppSignedIn={(profile) => {
            setSignedInUser({ name: profile.name, phone: profile.phone });
            setEntryScreen(null);
            setSubScreen({ kind: 'none' });
            setTab('home');
          }}
          onOpenCitySheet={() => setCitySheetOpen(true)}
        />
      );
    }

    if (subScreen.kind === 'listing') {
      return (
        <CustomerListingDetails
          listingId={subScreen.listingId}
          onBack={goBack}
          onOpenStore={(storeId) => navigateTo({ kind: 'store', storeId })}
          onCompareOffers={(variantKey) => navigateTo({ kind: 'compare', variantKey })}
          onCompareDetailed={(listingId) =>
            navigateTo({ kind: 'compare_phones', primaryListingId: listingId })
          }
          onOpenListing={(id) => navigateTo({ kind: 'listing', listingId: id })}
          onContactSeller={(listing, store) => setContactTarget({ listing, store })}
        />
      );
    }

    if (subScreen.kind === 'store') {
      return (
        <CustomerStoreProfile
          storeId={subScreen.storeId}
          onBack={goBack}
          onOpenListing={(id) => navigateTo({ kind: 'listing', listingId: id })}
          onContactStore={(store) => setContactTarget({ listing: null, store })}
        />
      );
    }

    if (subScreen.kind === 'compare') {
      return (
        <CustomerCompareOffers
          variantKey={subScreen.variantKey}
          onBack={goBack}
          onOpenListing={(id) => navigateTo({ kind: 'listing', listingId: id })}
          onCompareDetailed={(listingId) =>
            navigateTo({ kind: 'compare_phones', primaryListingId: listingId })
          }
          onContactSeller={(listing, store) => setContactTarget({ listing, store })}
        />
      );
    }

    if (subScreen.kind === 'compare_phones') {
      return (
        <CustomerDetailedPhoneCompare
          primaryListingId={subScreen.primaryListingId}
          initialSecondaryListingId={subScreen.secondaryListingId}
          onBack={goBack}
          onOpenListing={(id) => navigateTo({ kind: 'listing', listingId: id })}
          onContactSeller={(listing, store) => setContactTarget({ listing, store })}
        />
      );
    }

    if (subScreen.kind === 'optional_account') {
      return <OptionalCustomerAccountConcept onClose={goBack} />;
    }

    if (subScreen.kind === 'account_settings' && signedInUser) {
      return (
        <CustomerAccountSettings
          user={signedInUser}
          onUpdateUser={(next) => setSignedInUser(next)}
          onOpenCitySheet={() => setCitySheetOpen(true)}
          onSignOut={() => {
            logoutSession();
            setSignedInUser(null);
            setHistoryStack([]);
            setSubScreen({ kind: 'none' });
            setTab('home');
            pushToast('info', {
              ar: 'تم تسجيل الخروج — تتصفح الآن كضيف',
              en: 'Signed out — now browsing as guest',
            });
          }}
          onBack={goBack}
        />
      );
    }

    if (subScreen.kind === 'brand_models') {
      const brandObj = BRANDS.find((b) => b.id === subScreen.brandId)!;
      const models = CATALOG_MODELS.filter((m) => m.brand === subScreen.brandId);
      const brandLabel = lang === 'ar' ? brandObj.arLabel : brandObj.label;

      return (
        <div className="store-clay flex flex-col h-full relative">
          <div className="sticky top-0 z-20 flex items-center gap-3 h-[60px] px-4 clay-topbar shrink-0">
            <button
              type="button"
              onClick={goBack}
              aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
              className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20] shrink-0"
            >
              {lang === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-[14px] clay-pill-active flex items-center justify-center text-[#1E4F34] shrink-0 px-1.5">
                <BrandLogo
                  brandId={brandObj.id}
                  className={brandObj.id === 'samsung' || brandObj.id === 'tecno' ? 'w-8 h-5' : 'w-5 h-5'}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#172B20] truncate">
                  {brandLabel}
                </h2>
                <p className="text-[11px] text-[#667D71] truncate">
                  {lang === 'ar'
                    ? 'اختر الموديل لعرض المتاجر المتوفرة وتقييم الهاتف'
                    : 'Select a phone model to view ratings & store offers'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-8 space-y-3">
            {models.map((m) => {
              const matching = publicListings.filter(
                (l) => l.brand === m.brand && l.model === m.model
              );
              const lowest = matching.length > 0 ? Math.min(...matching.map((x) => x.priceSdg)) : null;
              const modelRating = getPhoneModelRatingSummary(m.brand, m.model);
              return (
                <div
                  key={m.model}
                  onClick={() => openSearchWith({ brand: m.brand }, m.model)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openSearchWith({ brand: m.brand }, m.model);
                    }
                  }}
                  className="w-full clay-card-interactive clay-focus-ring rounded-[24px] p-3 flex items-center justify-between gap-3 text-start cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <SafeImage
                      clay
                      src={m.defaultImage}
                      alt={m.model}
                      aspectClass="w-14 h-14 rounded-[16px] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[#172B20] truncate">
                        {formatListingTitle(m.arabicBrandPrefix, m.model, lang)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <CompactStarRating
                          average={modelRating.average}
                          count={modelRating.count}
                          size="xs"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRateModelTarget({
                              brand: m.brand,
                              model: m.model,
                              arabicBrandPrefix: m.arabicBrandPrefix,
                            });
                          }}
                          className="clay-pill-active px-2 py-0.5 rounded-full text-[10px] font-bold text-[#17462C]"
                        >
                          {lang === 'ar' ? 'قيّم' : 'Rate'}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#5D7568] mt-1">
                        {matching.length > 0 ? (
                          <>
                            <span className="font-mono-num text-[#245A3D] font-bold">
                              {matching.length}
                            </span>{' '}
                            {lang === 'ar' ? 'عروض · يبدأ من ' : 'available · from '}
                            <span className="font-mono-num text-[#172B20] font-semibold">
                              {formatSdg(lowest!, lang)}
                            </span>
                          </>
                        ) : lang === 'ar' ? (
                          'لا توجد عروض متاحة حالياً'
                        ) : (
                          'No active listings currently'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full clay-inset flex items-center justify-center text-[#5A7265] shrink-0">
                    <ForwardChevron className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>

          {(() => {
            const targetTitle = rateModelTarget
              ? formatListingTitle(rateModelTarget.arabicBrandPrefix, rateModelTarget.model, lang)
              : '';
            return (
              <RateTargetSheet
                open={rateModelTarget !== null}
                title={lang === 'ar' ? `تقييم ${targetTitle}` : `Rate ${targetTitle}`}
                subtitle={
                  lang === 'ar'
                    ? 'قيّم هذا الموديل بناءً على تجربتك'
                    : 'Rate this specific phone model based on your experience'
                }
                helperNote={
                  lang === 'ar'
                    ? `تقييمك يرتبط بموديل ${targetTitle} نفسه ويظهر تلقائياً في جميع المتاجر التي تبيعه.`
                    : `This rating applies to ${targetTitle} and automatically syncs across every store selling it.`
                }
                defaultAuthorName={signedInUser?.name ?? ''}
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
        </div>
      );
    }

    // === Primary 4 Tabs (Minimalist Claymorphism) ===
    return (
      <div className="store-clay relative flex flex-col h-full">
        <OfflineBanner compact clay />

        {/* TAB 1: C-01 CUSTOMER HOMEPAGE */}
        {tab === 'home' && (
          <div className="flex-1 overflow-y-auto thin-scroll pb-24">
            {/* Minimalist Soft Clay Top App Bar */}
            <div className="sticky top-0 z-20 clay-topbar px-4 py-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setEntryScreen('welcome')}
                className="clay-focus-ring flex items-center gap-2.5 min-w-0 rounded-2xl"
              >
                <div className="clay-primary-btn w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0">
                  <Smartphone className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="text-start min-w-0">
                  <span className="block text-[14.5px] font-bold text-[#172B20] leading-none whitespace-nowrap">
                    {lang === 'ar' ? 'سودان فونز' : 'Sudan Phones'}
                  </span>
                  <span className="block text-[10.5px] text-[#5B7366] mt-1 truncate">
                    {signedInUser
                      ? signedInUser.name
                      : lang === 'ar'
                        ? 'متاجر فعلية موثّقة'
                        : 'Verified stores'}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCitySheetOpen(true)}
                  className="clay-pill clay-focus-ring inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-xs font-semibold text-[#172B20] whitespace-nowrap shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#2D6145]" />
                  <span>{formatCity(selectedCity, lang)}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6D8478]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (signedInUser) {
                      navigateTo({ kind: 'account_settings' });
                    } else {
                      setEntryScreen('register');
                    }
                  }}
                  aria-label={
                    signedInUser
                      ? lang === 'ar'
                        ? 'إعدادات الحساب'
                        : 'Account Settings'
                      : lang === 'ar'
                        ? 'إنشاء حساب'
                        : 'Register'
                  }
                  title={
                    signedInUser
                      ? lang === 'ar'
                        ? `إعدادات الحساب (${signedInUser.name})`
                        : `Account Settings (${signedInUser.name})`
                      : lang === 'ar'
                        ? 'إنشاء حساب'
                        : 'Create Account'
                  }
                  className={`clay-focus-ring w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    signedInUser ? 'clay-pill-active text-[#18432C]' : 'clay-pill text-[#2D6145]'
                  }`}
                >
                  <UserRound className="w-4 h-4" />
                </button>
              </div>
            </div>

            <motion.div
              key={`home-hero-${selectedCity}`}
              variants={heroContainerVariants}
              initial="hidden"
              animate="visible"
              className="px-4 pt-2 pb-4 space-y-6"
            >
              {/* Main Hero Section: Sculpted Debossed Search Well */}
              <motion.section
                variants={heroItemVariants}
                aria-label={lang === 'ar' ? 'القسم الرئيسي للتسوق' : 'Main shopping hero'}
                className="will-change-transform"
              >
                {/* Carved Clay Search Trigger */}
                <motion.button
                  type="button"
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                  onClick={() => setTab('search')}
                  className="w-full h-[50px] px-4 rounded-[22px] clay-inset clay-focus-ring flex items-center gap-3 text-[#657D70] text-xs"
                >
                  <div className="w-8 h-8 rounded-full clay-pill flex items-center justify-center text-[#2D6145] shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-medium">
                    {lang === 'ar'
                      ? 'ابحث عن موديل: Galaxy S24 Ultra أو iPhone 13 Pro...'
                      : 'Search phone: Galaxy S24 Ultra, iPhone 13 Pro...'}
                  </span>
                </motion.button>
              </motion.section>

              {/* Brand Shortcuts — Tactile Matte Clay Pills */}
              <motion.div variants={heroItemVariants} className="will-change-transform">
                <div className="flex items-center justify-between mb-3 px-0.5">
                  <h2 className="text-[13px] font-bold text-[#172B20]">
                    {lang === 'ar' ? 'تصفح حسب الماركة' : 'Browse by Brand'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('brands')}
                    className="text-[11.5px] font-semibold text-[#2A6043] hover:text-[#172B20] transition-colors"
                  >
                    {lang === 'ar' ? 'الكل' : 'See all'}
                  </button>
                </div>
                <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 thin-scroll">
                  {BRANDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => navigateTo({ kind: 'brand_models', brandId: b.id })}
                      className="clay-pill clay-focus-ring h-10 px-3.5 rounded-full text-xs font-semibold text-[#1E3629] inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <BrandLogo
                        brandId={b.id}
                        className={
                          b.id === 'samsung' || b.id === 'tecno'
                            ? 'w-7 h-4 text-[#23573A] shrink-0'
                            : 'w-4 h-4 text-[#23573A] shrink-0'
                        }
                      />
                      <span>{lang === 'ar' ? b.arLabel : b.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Featured & Latest Arrivals */}
              <motion.div variants={heroItemVariants} className="will-change-transform">
                <div className="flex items-end justify-between mb-3.5 px-0.5">
                  <div>
                    <h2 className="text-[15px] font-bold text-[#172B20]">
                      {lang === 'ar' ? 'أحدث العروض الموثقة' : 'Latest Verified Phones'}
                    </h2>
                    <p className="text-[11px] text-[#657D70] mt-0.5">
                      {selectedCity === 'all'
                        ? lang === 'ar'
                          ? 'جميع المدن · بدون إعلانات ممولة'
                          : 'All cities · Organic verified listings'
                        : lang === 'ar'
                          ? `عروض متاجر ${formatCity(selectedCity, 'ar')} الموثقة`
                          : `Verified stores in ${formatCity(selectedCity, 'en')}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSearchWith({})}
                    className="text-[11.5px] font-semibold text-[#2A6043] hover:text-[#172B20] whitespace-nowrap transition-colors"
                  >
                    {lang === 'ar' ? 'عرض الكل' : 'View all'}
                  </button>
                </div>

                {sim.skeletonLoading ? (
                  <div className="grid grid-cols-2 gap-3.5">
                    <PhoneCardSkeleton clay />
                    <PhoneCardSkeleton clay />
                    <PhoneCardSkeleton clay />
                    <PhoneCardSkeleton clay />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5">
                    {homeListings.slice(0, 6).map(renderPhoneCard)}
                  </div>
                )}
              </motion.div>

              {/* Verified Store Spotlights */}
              <motion.div variants={heroItemVariants} className="will-change-transform">
                <div className="flex items-center justify-between mb-3 px-0.5">
                  <h2 className="text-[15px] font-bold text-[#172B20]">
                    {lang === 'ar' ? 'متاجر فعلية موثّقة' : 'Verified Physical Stores'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('stores')}
                    className="text-[11.5px] font-semibold text-[#2A6043] hover:text-[#172B20] transition-colors"
                  >
                    {lang === 'ar' ? 'دليل المتاجر' : 'Directory'}
                  </button>
                </div>
                <div className="space-y-3">
                  {verifiedStores.slice(0, 3).map((st) => {
                    const count = publicListings.filter((l) => l.storeId === st.id).length;
                    const stRating = getStoreRatingSummary(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => navigateTo({ kind: 'store', storeId: st.id })}
                        className="w-full clay-card-interactive clay-focus-ring rounded-[24px] p-3 flex items-center justify-between gap-3 text-start"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <SafeImage
                            clay
                            src={st.bannerImage}
                            alt={tText(st.name, lang)}
                            aspectClass="w-12 h-12 rounded-[16px] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[13px] font-bold text-[#172B20] truncate">
                                {tText(st.name, lang)}
                              </p>
                              <ShieldCheck className="w-3.5 h-3.5 text-[#2D6145] shrink-0" />
                              <CompactStarRating
                                average={stRating.average}
                                count={stRating.count}
                                size="xs"
                              />
                            </div>
                            <p className="text-[11px] text-[#60776B] truncate mt-0.5">
                              {formatCity(st.city, lang)} ·{' '}
                              <span className="font-mono-num text-[#245A3D] font-bold">
                                {count}
                              </span>{' '}
                              {lang === 'ar' ? 'هواتف متاحة' : 'active phones'}
                            </p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full clay-inset flex items-center justify-center text-[#5A7265] shrink-0">
                          <ForwardChevron className="w-4 h-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* TAB 2: C-02 SEARCH AND FILTERS */}
        {tab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="clay-topbar px-4 pt-3.5 pb-3 space-y-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#6B8276] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      lang === 'ar' ? 'ابحث باسم الهاتف أو الماركة...' : 'Search model, brand, store...'
                    }
                    className="w-full h-11 ps-10 pe-9 rounded-[20px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6B8276] hover:text-[#172B20]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(true)}
                  className={`h-11 px-3.5 rounded-[20px] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 clay-focus-ring ${
                    activeFilterCount > 0 ? 'clay-pill-active' : 'clay-pill text-[#172B20]'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تصفية' : 'Filter'}</span>
                  {activeFilterCount > 0 && (
                    <span className="font-mono-num">({activeFilterCount})</span>
                  )}
                </button>
              </div>

              {/* Active Filter Chips (Interactive removal controls) */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto py-0.5 thin-scroll">
                  {filters.condition !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, condition: 'all' }))}
                      className="clay-pill-active inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap"
                    >
                      {formatCondition(filters.condition, lang)}
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {filters.brand !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, brand: 'all' }))}
                      className="clay-pill-active inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap"
                    >
                      {filters.brand}
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {filters.city !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, city: 'all' }))}
                      className="clay-pill-active inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap"
                    >
                      {formatCity(filters.city, lang)}
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {filters.storageGb !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, storageGb: 'all' }))}
                      className="clay-pill-active inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold font-mono-num whitespace-nowrap"
                    >
                      {filters.storageGb} GB
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {(filters.minPrice || filters.maxPrice) && (
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, minPrice: '', maxPrice: '' }))}
                      className="clay-pill-active inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap"
                    >
                      {lang === 'ar' ? 'نطاق السعر' : 'Price range'}
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="text-[11px] font-semibold text-[#5E7669] hover:text-[#172B20] px-2 whitespace-nowrap"
                  >
                    {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#637B6E] px-0.5">
                <span className="font-mono-num flex items-center gap-1.5">
                  {slowRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-[#2D6145]" />}
                  {lang === 'ar'
                    ? `${searchResults.length} نتيجة من المتاجر الموثقة${sim.lowDataMode ? ' · توفير البيانات' : ''}`
                    : `${searchResults.length} verified results${sim.lowDataMode ? ' · Data Saver' : ''}`}
                </span>
                <span>
                  {filters.sortBy === 'newest'
                    ? lang === 'ar'
                      ? 'الترتيب: الأحدث'
                      : 'Sort: Newest'
                    : filters.sortBy === 'price_asc'
                      ? lang === 'ar'
                        ? 'الترتيب: الأقل سعراً'
                        : 'Sort: Lowest price'
                      : lang === 'ar'
                        ? 'الترتيب: الأعلى سعراً'
                        : 'Sort: Highest price'}
                </span>
              </div>
            </div>

            <div
              ref={searchScrollRef}
              className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-24"
            >
              {sim.skeletonLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  <PhoneCardSkeleton clay />
                  <PhoneCardSkeleton clay />
                  <PhoneCardSkeleton clay />
                  <PhoneCardSkeleton clay />
                </div>
              ) : searchResults.length === 0 ? (
                /* C-09 No Search Results Recovery */
                <motion.div
                  key={searchResultsAnimationKey}
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0.01 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="clay-card rounded-[28px] p-7 text-center mt-4"
                >
                  <div className="w-14 h-14 rounded-[20px] clay-inset flex items-center justify-center text-[#5A7265] mx-auto mb-4">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#172B20] mb-1.5">
                    {lang === 'ar' ? 'لا توجد هواتف مطابقة لبحثك' : 'No matching phones found'}
                  </h3>
                  <p className="text-xs text-[#5E7669] leading-relaxed mb-5">
                    {lang === 'ar'
                      ? 'جرّب توسيع نطاق السعر أو البحث في جميع الولايات.'
                      : 'Try clearing active filters or searching across all states.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilters(DEFAULT_FILTERS);
                    }}
                    className="clay-primary-btn clay-focus-ring h-11 px-6 rounded-full text-xs font-bold"
                  >
                    {lang === 'ar' ? 'إعادة ضبط البحث والفلاتر' : 'Reset Search & Filters'}
                  </button>
                </motion.div>
              ) : (
                <div className={`space-y-3.5 transition-opacity ${slowRefreshing ? 'opacity-70' : 'opacity-100'}`}>
                  <div className="grid grid-cols-2 gap-3">
                    {searchResults.slice(0, visibleSearchCount).map(renderPhoneCard)}
                  </div>
                  {searchResults.length > visibleSearchCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleSearchCount((c) => c + pageSize)}
                      className="w-full h-11 rounded-full clay-pill clay-focus-ring text-xs font-bold text-[#245A3D]"
                    >
                      {lang === 'ar'
                        ? `عرض المزيد (${searchResults.length - visibleSearchCount} متبقية)`
                        : `Load more (${searchResults.length - visibleSearchCount} remaining)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: C-10 BRANDS AND CATEGORIES */}
        {tab === 'brands' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="clay-topbar px-4 pt-3.5 pb-3 space-y-3 shrink-0">
              <div>
                <h1 className="text-base font-bold text-[#172B20]">
                  {lang === 'ar' ? 'الماركات والموديلات' : 'Brands & Models'}
                </h1>
                <p className="text-xs text-[#637B6E] mt-0.5">
                  {lang === 'ar'
                    ? 'تصفح الماركات المعتمدة ← الموديل ← العروض المتاحة'
                    : 'Browse Brand → Model → Available verified offers'}
                </p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-[#6B8276] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث عن ماركة...' : 'Filter brands...'}
                  className="w-full h-11 ps-10 pe-4 rounded-[20px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-24">
              {(() => {
                const filteredBrands = BRANDS.filter((b) => {
                  if (!brandSearch.trim()) return true;
                  const q = brandSearch.toLowerCase();
                  return b.label.toLowerCase().includes(q) || b.arLabel.includes(brandSearch.trim());
                }).sort((a, b) => a.label.localeCompare(b.label));

                if (filteredBrands.length === 0) {
                  return (
                    <div className="clay-card rounded-[26px] p-6 text-center mt-2">
                      <p className="text-xs font-semibold text-[#5E7669]">
                        {lang === 'ar' ? 'لا توجد ماركة مطابقة لبحثك' : 'No matching brands found'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-3.5">
                    {filteredBrands.map((brand) => {
                      const brandListings = publicListings.filter((l) => l.brand === brand.id);
                      const modelCount = CATALOG_MODELS.filter((m) => m.brand === brand.id).length;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => navigateTo({ kind: 'brand_models', brandId: brand.id })}
                          className="clay-card-interactive clay-focus-ring rounded-[26px] p-4 min-h-[148px] flex flex-col justify-between text-start"
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div className="w-13 h-13 rounded-[18px] clay-pill-active flex items-center justify-center text-[#1E4F34] shrink-0 px-1.5">
                              <BrandLogo
                                brandId={brand.id}
                                className={
                                  brand.id === 'samsung' || brand.id === 'tecno'
                                    ? 'w-10 h-6'
                                    : 'w-6 h-6'
                                }
                              />
                            </div>
                            <div className="w-7 h-7 rounded-full clay-inset flex items-center justify-center text-[#5A7265] shrink-0">
                              <ForwardChevron className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <div className="pt-3 w-full">
                            <p className="text-[15px] font-bold text-[#172B20] leading-snug truncate">
                              {lang === 'ar' ? brand.arLabel : brand.label}
                            </p>
                            {lang === 'ar' && (
                              <p className="text-[11px] font-medium text-[#70877B] truncate mt-0.5" dir="ltr">
                                {brand.label}
                              </p>
                            )}
                            <p className="text-[11px] text-[#637B6E] mt-2 truncate">
                              <span className="font-mono-num">{modelCount}</span>{' '}
                              {lang === 'ar' ? 'موديلات' : 'models'} ·{' '}
                              <span className="font-mono-num text-[#245A3D] font-bold">
                                {brandListings.length} {lang === 'ar' ? 'عروض' : 'live'}
                              </span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 4: VERIFIED STORES DIRECTORY */}
        {tab === 'stores' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="clay-topbar px-4 pt-3.5 pb-3 flex items-center justify-between gap-2 shrink-0">
              <div>
                <h1 className="text-base font-bold text-[#172B20]">
                  {lang === 'ar' ? 'المتاجر الموثّقة' : 'Verified Stores'}
                </h1>
                <p className="text-xs text-[#637B6E] mt-0.5">
                  {lang === 'ar'
                    ? 'متاجر فعلية تم التحقق من هويتها وعناوينها'
                    : 'Physical retail stores verified by Sudan Phones'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCitySheetOpen(true)}
                className="clay-pill clay-focus-ring h-9 px-3.5 rounded-full text-[11px] font-semibold text-[#172B20] whitespace-nowrap"
              >
                {formatCity(selectedCity, lang)}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-24 space-y-4">
              {verifiedStores.map((st) => {
                const count = publicListings.filter((l) => l.storeId === st.id).length;
                const stRating = getStoreRatingSummary(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => navigateTo({ kind: 'store', storeId: st.id })}
                    className="w-full clay-card-interactive clay-focus-ring rounded-[26px] p-2.5 text-start"
                  >
                    <div className="relative overflow-hidden rounded-[18px]">
                      <SafeImage
                        clay
                        src={st.bannerImage}
                        alt={tText(st.name, lang)}
                        aspectClass="aspect-[16/7]"
                      />
                    </div>
                    <div className="px-2 pt-3 pb-1.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-sm font-bold text-[#172B20] truncate">
                            {tText(st.name, lang)}
                          </h3>
                          <ShieldCheck className="w-4 h-4 text-[#2D6145] shrink-0" />
                        </div>
                        <CompactStarRating
                          average={stRating.average}
                          count={stRating.count}
                          size="xs"
                        />
                      </div>
                      <p className="text-xs text-[#546B5F] line-clamp-1">
                        {formatCity(st.city, lang)} · {tText(st.address, lang)}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <p className="text-[#758C80] truncate">{tText(st.openingHours, lang)}</p>
                        <span className="font-bold text-[#245A3D] font-mono-num whitespace-nowrap shrink-0">
                          {count} {lang === 'ar' ? 'جهاز' : 'phones'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Floating Sculpted Clay 4-Tab Mobile Navigation Dock (Natural Thumb Zone) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-2.5 pt-2 bg-gradient-to-t from-[#EEF3F0] via-[#EEF3F0]/80 to-transparent">
          <nav
            aria-label={lang === 'ar' ? 'تنقل تطبيق العملاء' : 'Customer app navigation'}
            className="pointer-events-auto h-[62px] rounded-[26px] clay-dock px-1.5 grid grid-cols-4 items-center gap-1"
          >
            {(
              [
                { id: 'home', ar: 'الرئيسية', en: 'Home', icon: Home },
                { id: 'search', ar: 'بحث', en: 'Search', icon: Search },
                { id: 'brands', ar: 'الماركات', en: 'Brands', icon: Grid2x2 },
                { id: 'stores', ar: 'المتاجر', en: 'Stores', icon: StoreIcon },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSubScreen({ kind: 'none' });
                    setHistoryStack([]);
                    setTab(item.id);
                  }}
                  className={`relative h-[48px] rounded-[20px] flex flex-col items-center justify-center gap-0.5 transition-colors clay-focus-ring ${
                    active ? 'text-[#18432C]' : 'text-[#6A8175] hover:text-[#172B20]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="clay-bottom-tab-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-[20px] clay-pill-active"
                    />
                  )}
                  <Icon className={`relative z-10 w-[19px] h-[19px] ${active ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
                  <span className="relative z-10 text-[10px] font-bold whitespace-nowrap">
                    {lang === 'ar' ? item.ar : item.en}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    );
  };

  const isAuthDarkTop =
    entryScreen !== null &&
    (entryScreen === 'launch' ||
      entryScreen === 'welcome' ||
      entryScreen === 'signin' ||
      authTheme === 'dark');
  const isAuthDarkBottom =
    entryScreen !== null &&
    (entryScreen === 'launch' ||
      entryScreen === 'welcome' ||
      authTheme === 'dark');

  const topBarBgClass =
    entryScreen === null
      ? 'bg-[#EEF3F0]'
      : isAuthDarkTop
        ? entryScreen === 'welcome' || entryScreen === 'signin' || entryScreen === 'launch'
          ? 'bg-[#0A130E]'
          : 'bg-[#0C1511]'
        : 'bg-white';

  const bottomBarBgClass =
    entryScreen === null
      ? 'bg-[#EEF3F0]'
      : isAuthDarkBottom
        ? entryScreen === 'welcome' || entryScreen === 'launch'
          ? 'bg-[#0A130E]'
          : 'bg-[#0C1511]'
        : 'bg-white';

  return (
    <div className={`fixed inset-0 w-full h-[100dvh] overflow-hidden flex flex-col ${bottomBarBgClass}`}>
      {/* Full-Screen Native App Viewport */}
      <div className={`relative flex-1 min-h-0 w-full flex flex-col overflow-hidden ${bottomBarBgClass}`}>
        {renderMobileScreenBody()}
        <CustomerStartupOverlay />
        <CitySelectorSheet open={citySheetOpen} onClose={() => setCitySheetOpen(false)} />
        <FilterBottomSheet
          open={filterSheetOpen}
          filters={filters}
          onApply={(next) => setFilters(next)}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          onClose={() => setFilterSheetOpen(false)}
        />
        <ContactSellerSheet
          listing={contactTarget.listing}
          store={contactTarget.store}
          onClose={() => setContactTarget({ listing: null, store: null })}
        />
      </div>
    </div>
  );
}
