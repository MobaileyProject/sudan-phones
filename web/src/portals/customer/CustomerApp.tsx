import React, { useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { motion, useReducedMotion } from 'motion/react';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  GitCompareArrows,
  Grid2x2,
  Heart,
  Home,
  KeyRound,
  List,
  LogIn,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store as StoreIcon,
  TrendingDown,
  UserRound,
  WifiOff,
  X,
} from 'lucide-react';
import { BrandId, CustomerNotification, Listing, PriceAlert, SponsoredAd, Store } from '../../types';
import {
  formatCity,
  formatCondition,
  formatListingTitle,
  formatSdg,
  tText,
} from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import { api, hasStoredSessionToken } from '../../api/client';
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
} from './CustomerDetailScreens';
import { StoreInAppChatSheet } from './StoreInAppChatSheet';
import { AppOpenAdOverlay } from './AppOpenAdOverlay';
import { DiscountsOffersScreen, HomeStorefrontSections } from './HomeStorefrontSections';
import { CustomerDetailedPhoneCompare } from './PhoneSpecsAndCompare';
import { CompactStarRating } from './RatingsComponents';
import {
  AuthThemeMode,
  MobileAppAuthScreens,
  MobileEntryScreen,
} from './MobileAppAuthScreens';
import { StoreMapExplorer } from './StoreMapExplorer';
import { CustomerNotificationsSheet } from './CustomerNotificationsSheet';
import { UnifiedMessagesView } from '../../components/UnifiedMessagesView';
import { mergeRecentSearches } from '../../utils/marketplaceHelpers';

type CustomerTab = 'home' | 'search' | 'messages' | 'brands' | 'stores';

type CustomerSubScreen =
  | { kind: 'none' }
  | { kind: 'listing'; listingId: string }
  | { kind: 'store'; storeId: string }
  | { kind: 'compare'; variantKey: string }
  | { kind: 'compare_phones'; primaryListingId: string; secondaryListingId?: string }
  | { kind: 'brand_models'; brandId: BrandId }
  | { kind: 'discounts' }
  | { kind: 'favorites' }
  | { kind: 'account_settings' };

const DEFAULT_FILTERS: CustomerFilterState = {
  brand: 'all',
  condition: 'all',
  storageGb: 'all',
  city: 'all',
  minPrice: '',
  maxPrice: '',
  acceptsTradeIn: false,
  sortBy: 'newest',
};

export function CustomerApp() {
  const {
    lang,
    selectedCity,
    brands,
    stores,
    publicListings,
    cachedPublicListings,
    getStoreById,
    getStoreRatingSummary,
    getProductRatingSummary,
    getModelRatingFromProducts,
    sim,
    updateSim,
    reconnectAndRefresh,
    pushToast,
    customerDeepLinkListingId,
    setCustomerDeepLinkListingId,
    customerDeepLinkStoreId,
    setCustomerDeepLinkStoreId,
    favoriteIds,
    toggleFavorite,
    session,
    me,
    logoutSession,
    isLoadingLive,
    activeOpenAds,
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

  // Guest-first instant browsing (sign-in remains accessible in top bar & settings)
  const [entryScreen, setEntryScreen] = useState<MobileEntryScreen | null>(null);
  const authTheme: AuthThemeMode = 'light';
  const [signedInUser, setSignedInUser] = useState<{ name: string; phone: string } | null>(() =>
    session.authenticated && me
      ? {
          name: me.name || me.email || me.phone,
          phone: me.phone || me.email || '',
        }
      : null
  );

  useEffect(() => {
    if (session.authenticated) {
      setEntryScreen(null);
      if (me) {
        setSignedInUser({
          name: me.name || me.email || me.phone,
          phone: me.phone || me.email || '',
        });
      }
    } else {
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
  const [brandModelSearch, setBrandModelSearch] = useState('');
  const [liveBrandModels, setLiveBrandModels] = useState<any[]>([]);
  const [loadingBrandModels, setLoadingBrandModels] = useState(false);

  // Recent searches, Quick Compare Tray, Stores Map/List mode, Notifications & Price Alerts
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem('sp_recent_searches_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [compareTrayIds, setCompareTrayIds] = useState<string[]>([]);
  const [storesViewMode, setStoresViewMode] = useState<'list' | 'map'>('list');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState<number>(0);
  const [pendingMessageThreadKey, setPendingMessageThreadKey] = useState<string | null>(null);

  const isMerchantAccount = Boolean(
    session.authenticated && (session.merchant || session.role === 'merchant')
  );

  const refreshNotificationsAndMessages = async () => {
    try {
      const [notifsRes, alertsRes, chatsRes] = await Promise.all([
        api.getNotifications().catch(() => ({ data: [] })),
        api.getPriceAlerts().catch(() => ({ data: [] })),
        isMerchantAccount
          ? api.getMyStoreChats().catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      const mappedNotifs: CustomerNotification[] = (notifsRes.data || []).map((n: any) => ({
        id: String(n.id),
        type: n.type || 'system',
        titleAr: n.title_ar || n.titleAr || '',
        titleEn: n.title_en || n.titleEn || '',
        bodyAr: n.body_ar || n.bodyAr || '',
        bodyEn: n.body_en || n.bodyEn || '',
        listingId: n.listing_id != null ? String(n.listing_id) : undefined,
        storeId: n.store_id != null ? String(n.store_id) : undefined,
        threadKey: n.thread_key ? String(n.thread_key) : undefined,
        read: Boolean(n.read),
        createdAt: n.created_at || new Date().toISOString(),
      }));
      const mappedAlerts: PriceAlert[] = (alertsRes.data || []).map((a: any) => ({
        id: String(a.id),
        listingId: String(a.listing_id),
        model: a.model || a.model_title || '',
        targetPriceSdg: a.target_price_sdg != null ? Number(a.target_price_sdg) : null,
        initialPriceSdg: Number(a.initial_price_sdg ?? a.current_price_sdg ?? 0),
        createdAt: a.created_at || new Date().toISOString(),
      }));
      setNotifications(mappedNotifs);
      setPriceAlerts(mappedAlerts);
      if (isMerchantAccount) {
        const unread = (chatsRes.data || []).reduce(
          (sum: number, t: any) => sum + Number(t.unread_count || 0),
          0
        );
        setMessagesUnreadCount(unread);
      } else {
        const unreadChatNotifs = mappedNotifs.filter(
          (n) => !n.read && n.type === 'chat_reply'
        ).length;
        setMessagesUnreadCount(unreadChatNotifs);
      }
    } catch {
      // ignore transient refresh failure
    }
  };

  useEffect(() => {
    refreshNotificationsAndMessages();
  }, [session.authenticated, session.user_id, isMerchantAccount]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const recordRecentSearch = (query: string) => {
    setRecentSearches((prev) => {
      const next = mergeRecentSearches(prev, query, 6);
      try {
        window.localStorage.setItem('sp_recent_searches_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleCompareTray = (listingId: string) => {
    if (compareTrayIds.includes(listingId)) {
      setCompareTrayIds(compareTrayIds.filter((id) => id !== listingId));
      return;
    }
    if (compareTrayIds.length >= 2) {
      setCompareTrayIds([compareTrayIds[0], listingId]);
      pushToast('info', {
        ar: 'تم استبدال الهاتف الثاني في قائمة المقارنة.',
        en: 'Replaced the second phone in your compare tray.',
      });
      return;
    }
    const nextLength = compareTrayIds.length;
    setCompareTrayIds([...compareTrayIds, listingId]);
    pushToast('success', {
      ar:
        nextLength === 0
          ? 'تمت الإضافة لقائمة المقارنة — اختر هاتفاً ثانياً للمقارنة.'
          : 'جاهز للمقارنة! اضغط "قارن الآن" بالأسفل.',
      en:
        nextLength === 0
          ? 'Added to compare tray — pick one more phone to compare.'
          : 'Ready to compare! Tap "Compare Now" below.',
    });
  };

  const handleTogglePriceAlert = async (listing: Listing) => {
    const existing = priceAlerts.find((a) => a.listingId === listing.id);
    if (existing) {
      try {
        await api.deletePriceAlert(existing.id);
      } catch {
        // ignore
      }
      setPriceAlerts((prev) => prev.filter((a) => a.id !== existing.id));
      pushToast('info', {
        ar: 'تم إيقاف تنبيه انخفاض السعر لهذا الهاتف.',
        en: 'Price drop alert removed.',
      });
      return;
    }
    const targetPrice = Math.max(1000, Math.round((listing.priceSdg * 0.95) / 1000) * 1000);
    try {
      const res = await api.createPriceAlert({
        listing_id: Number(listing.id),
        target_price_sdg: targetPrice,
      });
      const a = res.data;
      setPriceAlerts((prev) => [
        {
          id: String(a.id),
          listingId: String(a.listing_id),
          model: a.model || a.model_title || listing.model,
          targetPriceSdg: Number(a.target_price_sdg || targetPrice),
          initialPriceSdg: Number(a.initial_price_sdg ?? listing.priceSdg),
          createdAt: a.created_at || new Date().toISOString(),
        },
        ...prev,
      ]);
      pushToast('success', {
        ar: 'تم تفعيل تنبيه انخفاض السعر! سنخبرك فوراً عند تخفيض هذا الهاتف.',
        en: 'Price drop alert active! You will be notified if the store lowers the price.',
      });
    } catch {
      pushToast('error', {
        ar: 'تعذر حفظ تنبيه السعر حالياً.',
        en: 'Could not save price alert right now.',
      });
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markNotificationsRead();
    } catch {
      // ignore
    }
  };

  const handleDeletePriceAlert = async (alertId: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== alertId));
    try {
      await api.deletePriceAlert(alertId);
    } catch {
      // ignore
    }
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const l of discoveryListings) {
      const label = l.model;
      const key = label.toLowerCase();
      if (key.includes(q) && !seen.has(key) && key !== q) {
        seen.add(key);
        out.push(label);
        if (out.length >= 4) break;
      }
    }
    return out;
  }, [searchQuery, discoveryListings]);

  useEffect(() => {
    if (subScreen.kind !== 'brand_models') return;
    let active = true;
    const matchedBrand = brands.find(
      (b) => (b.slug || b.name.toLowerCase()) === subScreen.brandId
    );
    const timer = window.setTimeout(() => {
      setLoadingBrandModels(true);
      api
        .getPublicModels({
          brand_id: matchedBrand?.id,
          brand: matchedBrand ? undefined : subScreen.brandId,
          q: brandModelSearch.trim() || undefined,
          limit: 100,
        })
        .then((res) => {
          if (active) setLiveBrandModels(res.data || []);
        })
        .catch(() => {
          if (active) setLiveBrandModels([]);
        })
        .finally(() => {
          if (active) setLoadingBrandModels(false);
        });
    }, brandModelSearch.trim() ? 220 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [subScreen, brands, brandModelSearch]);

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

  // In-App Direct Store Chat Sheet
  const [chatTarget, setChatTarget] = useState<{
    listing: Listing | null;
    store: Store | null;
  }>({ listing: null, store: null });

  // App-Open Sponsored Ad Overlay (runs only when the main app opens, never on the welcome/auth first screen)
  const [openAd, setOpenAd] = useState<SponsoredAd | null>(null);
  const hasShownOpenAdRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasShownOpenAdRef.current) return;
    if (entryScreen !== null) return;
    if (isLoadingLive || sim.startupMode !== 'ready' || sim.offlineMode === 'offline_empty') return;
    if (customerDeepLinkListingId || customerDeepLinkStoreId) return;
    if (activeOpenAds.length === 0) return;

    const cityMatched =
      selectedCity !== 'all'
        ? activeOpenAds.find((a) => a.targetCity === selectedCity)
        : undefined;
    const chosen =
      cityMatched ||
      activeOpenAds.find((a) => a.targetCity === 'all') ||
      activeOpenAds[0];
    if (!chosen) return;

    hasShownOpenAdRef.current = true;
    setOpenAd(chosen);
  }, [
    entryScreen,
    isLoadingLive,
    sim.startupMode,
    sim.offlineMode,
    activeOpenAds,
    selectedCity,
    customerDeepLinkListingId,
    customerDeepLinkStoreId,
  ]);

  // Scroll context preservation for C-02 Search
  const searchScrollRef = useRef<HTMLDivElement | null>(null);
  const savedSearchScrollTop = useRef<number>(0);
  const lastBackPressRef = useRef<number>(0);

  // Native Android back button & gesture handler (never closes app unexpectedly)
  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    const handleBack = () => {
      if (openAd) {
        setOpenAd(null);
        return;
      }
      if (chatTarget.store) {
        setChatTarget({ listing: null, store: null });
        return;
      }
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
    openAd,
    chatTarget.store,
    contactTarget.store,
    filterSheetOpen,
    citySheetOpen,
    entryScreen,
    subScreen.kind,
    tab,
    pushToast,
  ]);

  // Deep link handlers (Listing & QR Code Store Poster ?store=<id>)
  useEffect(() => {
    if (customerDeepLinkListingId) {
      setEntryScreen(null);
      setHistoryStack([]);
      setSubScreen({ kind: 'listing', listingId: customerDeepLinkListingId });
      setCustomerDeepLinkListingId(null);
    }
  }, [customerDeepLinkListingId, setCustomerDeepLinkListingId]);

  useEffect(() => {
    if (customerDeepLinkStoreId) {
      setEntryScreen(null);
      setHistoryStack([]);
      setSubScreen({ kind: 'store', storeId: customerDeepLinkStoreId });
      setCustomerDeepLinkStoreId(null);
    }
  }, [customerDeepLinkStoreId, setCustomerDeepLinkStoreId]);

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
      if (filters.acceptsTradeIn && !(l.acceptsTradeIn || st?.acceptsTradeIn)) return false;
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
    filters.acceptsTradeIn,
  ].filter(Boolean).length;

  const openSearchWith = (patch: Partial<CustomerFilterState>, q = '') => {
    setSearchQuery(q);
    setFilters({ ...DEFAULT_FILTERS, city: selectedCity, ...patch });
    setSubScreen({ kind: 'none' });
    setHistoryStack([]);
    setTab('search');
  };

  const ForwardChevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  // Clean, Uncluttered Product Card
  const renderPhoneCard = (listing: Listing) => {
    const store = getStoreById(listing.storeId);
    const productRating = getProductRatingSummary(listing.id);

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
        className="group clay-card-interactive clay-focus-ring rounded-[24px] p-2.5 text-start cursor-pointer flex flex-col"
      >
        {/* Clean Product Photo Stage */}
        <div className="relative overflow-hidden rounded-[18px] bg-[#E5EDE8] ring-1 ring-[#172B20]/[0.05]">
          <SafeImage
            clay
            src={listing.photos[0]?.url}
            alt={listing.model}
            aspectClass="aspect-[4/3]"
            label={listing.model}
            className="group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(listing.id);
            }}
            aria-label={lang === 'ar' ? 'المفضلة' : 'Favorite'}
            className={`absolute top-2 end-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors ${
              favoriteIds.includes(listing.id) ? 'text-[#C81E3A]' : 'text-[#5A7265] hover:text-[#C81E3A]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${favoriteIds.includes(listing.id) ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Clean Typographic Hierarchy */}
        <div className="px-1.5 pt-3 pb-1 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-[#14281E] leading-snug truncate">
              {formatListingTitle(listing.arabicBrandPrefix, listing.model, lang)}
            </h3>

            <div className="mt-1 flex items-center justify-between gap-1.5 text-[10.5px] text-[#60786B]">
              <p className="truncate">
                <span className="font-medium text-[#4A6457]">
                  {formatCondition(listing.condition, lang)}
                </span>
                <span className="mx-1 text-[#A4B7AD]" aria-hidden="true">·</span>
                <span dir="ltr" className="font-mono-num">
                  {listing.storageGb} GB
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
              {formatSdg(listing.priceSdg, lang)}
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
          authTheme="light"
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
          hasPriceAlert={priceAlerts.some((a) => a.listingId === subScreen.listingId)}
          onTogglePriceAlert={handleTogglePriceAlert}
          inCompareTray={compareTrayIds.includes(subScreen.listingId)}
          onToggleCompareTray={handleToggleCompareTray}
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
          onChatInApp={(store) => setChatTarget({ listing: null, store })}
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

    if (subScreen.kind === 'favorites') {
      const savedListings = discoveryListings.filter((l) => favoriteIds.includes(l.id));
      return (
        <div className="store-clay flex flex-col h-full">
          <div className="sticky top-0 z-20 flex items-center justify-between h-[60px] px-4 clay-topbar shrink-0">
            <button
              type="button"
              onClick={goBack}
              aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
              className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20]"
            >
              {lang === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <h1 className="text-sm font-bold text-[#172B20] flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#C81E3A] fill-current" />
              {lang === 'ar' ? `المفضلة (${savedListings.length})` : `Saved Favorites (${savedListings.length})`}
            </h1>
            <div className="w-11" />
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-3 pb-10">
            {savedListings.length === 0 ? (
              <div className="clay-card rounded-[26px] p-8 text-center space-y-3 mt-4">
                <div className="w-12 h-12 rounded-2xl clay-inset mx-auto flex items-center justify-center text-[#8AA093]">
                  <Heart className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#172B20]">
                  {lang === 'ar' ? 'قائمة المفضلة فارغة' : 'No saved phones yet'}
                </p>
                <p className="text-xs text-[#60776B] leading-relaxed">
                  {lang === 'ar'
                    ? 'اضغط على أيقونة القلب على أي هاتف لحفظه هنا ومراقبة سعره لاحقاً.'
                    : 'Tap the heart icon on any phone to save it here and track price drops.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {savedListings.map(renderPhoneCard)}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (subScreen.kind === 'discounts') {
      return (
        <DiscountsOffersScreen
          lang={lang}
          listings={discoveryListings}
          favoriteIds={favoriteIds}
          toggleFavorite={toggleFavorite}
          getStoreById={getStoreById}
          onBack={goBack}
          onOpenListing={(listingId) => navigateTo({ kind: 'listing', listingId })}
        />
      );
    }

    if (subScreen.kind === 'account_settings') {
      return (
        <CustomerAccountSettings
          user={signedInUser}
          onUpdateUser={(next) => setSignedInUser(next)}
          onOpenCitySheet={() => setCitySheetOpen(true)}
          onSignIn={() => setEntryScreen('signin')}
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
      const brandObj = brands.find(
        (b) => (b.slug || b.name.toLowerCase()) === subScreen.brandId
      );
      const brandSlug = brandObj?.slug || subScreen.brandId;
      const brandLabel = brandObj
        ? lang === 'ar' && brandObj.name_ar
          ? brandObj.name_ar
          : brandObj.name
        : subScreen.brandId;
      const arPrefix = brandObj?.name_ar || brandObj?.name || subScreen.brandId;

      return (
        <div className="store-clay flex flex-col h-full relative">
          <div className="sticky top-0 z-20 flex items-center gap-3 h-[60px] px-4 clay-topbar shrink-0">
            <button
              type="button"
              onClick={() => {
                setBrandModelSearch('');
                goBack();
              }}
              aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
              className="clay-pill clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center text-[#172B20] shrink-0"
            >
              {lang === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-[14px] clay-pill-active flex items-center justify-center text-[#1E4F34] shrink-0 px-1.5">
                <BrandLogo
                  brandId={brandSlug}
                  className={brandSlug === 'samsung' || brandSlug === 'tecno' ? 'w-8 h-5' : 'w-5 h-5'}
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

          <div className="px-4 pt-2 pb-1 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-[#6B8276] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={brandModelSearch}
                onChange={(e) => setBrandModelSearch(e.target.value)}
                placeholder={lang === 'ar' ? `ابحث في موديلات ${brandLabel}...` : `Search ${brandLabel} models...`}
                className="w-full h-10 ps-10 pe-4 rounded-[18px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-8 space-y-3">
            {loadingBrandModels ? (
              <div className="clay-card rounded-[24px] p-6 text-center text-xs text-[#5E7669] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#1E4F34]" />
                {lang === 'ar' ? 'جاري تحميل الموديلات...' : 'Loading models...'}
              </div>
            ) : liveBrandModels.length === 0 ? (
              <div className="clay-card rounded-[24px] p-6 text-center text-xs text-[#5E7669]">
                {lang === 'ar' ? 'لا توجد موديلات مطابقة للبحث.' : 'No matching models found.'}
              </div>
            ) : (
              liveBrandModels.map((m) => {
                const matching = publicListings.filter(
                  (l) =>
                    l.brand.toLowerCase() === brandSlug.toLowerCase() &&
                    l.model.toLowerCase() === String(m.name).toLowerCase()
                );
                const liveCount = Number(m.listing_count || matching.length || 0);
                const lowest = m.min_price
                  ? Number(m.min_price)
                  : matching.length > 0
                    ? Math.min(...matching.map((x) => x.priceSdg))
                    : null;
                const liveAggModelRating = getModelRatingFromProducts(brandSlug, m.name);
                const modelRating =
                  liveAggModelRating.count > 0
                    ? { average: liveAggModelRating.average, count: liveAggModelRating.count }
                    : m.rating_count > 0
                      ? { average: Number(m.rating_average || 0), count: Number(m.rating_count || 0) }
                      : { average: 0, count: 0 };
                const yr = m.specifications?.release_year;
                const bat = m.specifications?.battery?.capacity_mah;
                const photoUrl = matching[0]?.photos?.[0]?.url || '';
                return (
                  <div
                    key={m.id}
                    onClick={() => openSearchWith({ brand: brandSlug }, m.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openSearchWith({ brand: brandSlug }, m.name);
                      }
                    }}
                    className="w-full clay-card-interactive clay-focus-ring rounded-[24px] p-3 flex items-center justify-between gap-3 text-start cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {photoUrl ? (
                        <SafeImage
                          clay
                          src={photoUrl}
                          alt={m.name}
                          aspectClass="w-14 h-14 rounded-[16px] shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-[16px] clay-pill-active flex items-center justify-center text-[#1E4F34] shrink-0">
                          <Smartphone className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#172B20] truncate" dir="ltr">
                          {m.name}
                        </p>
                        {(yr || bat) && (
                          <p className="text-[10px] text-[#667D71] mt-0.5" dir="ltr">
                            {[yr ? String(yr) : '', bat ? `${bat}mAh` : ''].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <CompactStarRating
                            average={modelRating.average}
                            count={modelRating.count}
                            size="xs"
                          />
                          <span className="text-[10px] text-[#5F776A]">
                            {modelRating.count > 0
                              ? lang === 'ar'
                                ? 'من تقييمات المنتجات'
                                : 'from product ratings'
                              : lang === 'ar'
                                ? 'لا توجد تقييمات منتجات بعد'
                                : 'no product ratings yet'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5D7568] mt-1">
                          {liveCount > 0 && lowest ? (
                            <>
                              <span className="font-mono-num text-[#245A3D] font-bold">
                                {liveCount}
                              </span>{' '}
                              {lang === 'ar' ? 'عروض · يبدأ من ' : 'available · from '}
                              <span className="font-mono-num text-[#172B20] font-semibold">
                                {formatSdg(lowest, lang)}
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
              })
            )}
          </div>
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
            {/* Clean, Uncluttered Sticky Top App Bar */}
            <header className="sticky top-0 z-20 clay-topbar border-b border-[#1E3B2B]/[0.07] px-4 py-2.5 flex items-center justify-between gap-3">
              {/* Start: Brand mark + Wordmark & Inline City Selector */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setEntryScreen('welcome')}
                  aria-label={lang === 'ar' ? 'سودان فونز' : 'Sudan Phones'}
                  className="clay-primary-btn clay-focus-ring w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                >
                  <Smartphone className="w-4 h-4 stroke-[2.2]" />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setEntryScreen('welcome')}
                    className="block text-[14px] font-bold text-[#172B20] leading-tight truncate text-start hover:text-[#0F6B5D] transition-colors"
                  >
                    {lang === 'ar' ? 'سودان فونز' : 'Sudan Phones'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCitySheetOpen(true)}
                    className="clay-focus-ring -mx-1 px-1 py-0.5 mt-0.5 rounded-md inline-flex items-center gap-1 max-w-full text-[11.5px] font-medium text-[#2D6145] hover:text-[#0F6B5D] transition-colors whitespace-nowrap"
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{formatCity(selectedCity, lang)}</span>
                    <ChevronDown className="w-3 h-3 text-[#6D8478] shrink-0" />
                  </button>
                </div>
              </div>

              {/* End: Quiet Icon Actions (No Heavy Pill Clutter) */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(true)}
                  aria-label={lang === 'ar' ? 'الإشعارات وتنبيهات الأسعار' : 'Notifications & Price Alerts'}
                  title={lang === 'ar' ? 'الإشعارات وتنبيهات الأسعار' : 'Notifications & Price Alerts'}
                  className="relative clay-focus-ring w-10 h-10 rounded-xl flex items-center justify-center text-[#1E3B2B] hover:bg-[#1E3B2B]/[0.06] active:bg-[#1E3B2B]/[0.1] transition-colors shrink-0"
                >
                  <Bell className="w-[19px] h-[19px] stroke-[1.9]" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 end-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#0F6B5D] text-white text-[9px] font-bold font-mono-num flex items-center justify-center ring-2 ring-[#EEF3F0]">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo({ kind: 'favorites' })}
                  aria-label={lang === 'ar' ? 'المفضلة' : 'Saved Favorites'}
                  title={lang === 'ar' ? 'المفضلة' : 'Saved Favorites'}
                  className="relative clay-focus-ring w-10 h-10 rounded-xl flex items-center justify-center text-[#1E3B2B] hover:bg-[#1E3B2B]/[0.06] active:bg-[#1E3B2B]/[0.1] transition-colors shrink-0"
                >
                  <Heart
                    className={`w-[19px] h-[19px] stroke-[1.9] ${
                      favoriteIds.length > 0 ? 'text-[#C81E3A] fill-current' : ''
                    }`}
                  />
                  {favoriteIds.length > 0 && (
                    <span className="absolute top-1.5 end-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#C81E3A] text-white text-[9px] font-bold font-mono-num flex items-center justify-center ring-2 ring-[#EEF3F0]">
                      {favoriteIds.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo({ kind: 'account_settings' })}
                  aria-label={lang === 'ar' ? 'الإعدادات والحساب' : 'Settings & Account'}
                  title={
                    signedInUser
                      ? lang === 'ar'
                        ? `إعدادات الحساب (${signedInUser.name})`
                        : `Account Settings (${signedInUser.name})`
                      : lang === 'ar'
                        ? 'الإعدادات والحساب'
                        : 'Settings & Account'
                  }
                  className={`clay-focus-ring w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    signedInUser
                      ? 'bg-[#0F6B5D]/12 text-[#0F6B5D] hover:bg-[#0F6B5D]/18'
                      : 'text-[#1E3B2B] hover:bg-[#1E3B2B]/[0.06] active:bg-[#1E3B2B]/[0.1]'
                  }`}
                >
                  {signedInUser ? (
                    <UserRound className="w-[19px] h-[19px] stroke-[1.9]" />
                  ) : (
                    <Settings className="w-[19px] h-[19px] stroke-[1.9]" />
                  )}
                </button>
              </div>
            </header>

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
                  {brands.map((b) => {
                    const slug = (b.slug || b.name.toLowerCase()) as BrandId;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => navigateTo({ kind: 'brand_models', brandId: slug })}
                        className="clay-pill clay-focus-ring h-10 px-3.5 rounded-full text-xs font-semibold text-[#1E3629] inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                      >
                        <BrandLogo
                          brandId={slug}
                          className={
                            slug === 'samsung' || slug === 'tecno'
                              ? 'w-7 h-4 text-[#23573A] shrink-0'
                              : 'w-4 h-4 text-[#23573A] shrink-0'
                          }
                        />
                        <span>{lang === 'ar' && b.name_ar ? b.name_ar : b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Curated Storefront Merchandising Sections + Mid-Feed Ads */}
              <motion.div variants={heroItemVariants} className="will-change-transform">
                <HomeStorefrontSections
                  lang={lang}
                  selectedCity={selectedCity}
                  homeListings={homeListings}
                  activeOpenAds={activeOpenAds}
                  skeletonLoading={sim.skeletonLoading}
                  favoriteIds={favoriteIds}
                  toggleFavorite={toggleFavorite}
                  getStoreById={getStoreById}
                  renderPhoneCard={renderPhoneCard}
                  onOpenListing={(listingId) => navigateTo({ kind: 'listing', listingId })}
                  onOpenStore={(storeId) => navigateTo({ kind: 'store', storeId })}
                  onOpenDiscounts={() => navigateTo({ kind: 'discounts' })}
                  onOpenSearchWith={openSearchWith}
                />
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                        recordRecentSearch(searchQuery);
                      }
                    }}
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

              {/* Instant Model Suggestions while Typing */}
              {searchSuggestions.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll py-0.5">
                  {searchSuggestions.map((modelName) => (
                    <button
                      key={modelName}
                      type="button"
                      onClick={() => {
                        setSearchQuery(modelName);
                        recordRecentSearch(modelName);
                      }}
                      className="h-7 px-3 rounded-full bg-white border border-[#172B20]/10 text-[11px] font-semibold text-[#172B20] hover:border-[#0F6B5D] whitespace-nowrap shrink-0"
                    >
                      {modelName}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick 1-Tap Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto thin-scroll py-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      maxPrice: f.maxPrice === '1000000' ? '' : '1000000',
                    }))
                  }
                  className={`h-8 px-3 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                    filters.maxPrice === '1000000' ? 'clay-pill-active' : 'clay-pill text-[#2C4739]'
                  }`}
                >
                  {lang === 'ar' ? 'تحت 1 مليون ج.س' : 'Under 1M SDG'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      condition: f.condition === 'new' ? 'all' : 'new',
                    }))
                  }
                  className={`h-8 px-3 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                    filters.condition === 'new' ? 'clay-pill-active' : 'clay-pill text-[#2C4739]'
                  }`}
                >
                  {lang === 'ar' ? 'جديد مختوم' : 'New Sealed'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      condition: f.condition === 'used' ? 'all' : 'used',
                    }))
                  }
                  className={`h-8 px-3 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                    filters.condition === 'used' ? 'clay-pill-active' : 'clay-pill text-[#2C4739]'
                  }`}
                >
                  {lang === 'ar' ? 'مستعمل مفحوص' : 'Used Inspected'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      acceptsTradeIn: !f.acceptsTradeIn,
                    }))
                  }
                  className={`h-8 px-3 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                    filters.acceptsTradeIn ? 'clay-pill-active' : 'clay-pill text-[#2C4739]'
                  }`}
                >
                  {lang === 'ar' ? 'يقبل الاستبدال' : 'Trade-In'}
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo({ kind: 'discounts' })}
                  className="clay-pill h-8 px-3 rounded-full text-[11px] font-bold text-[#1E5637] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <TrendingDown className="w-3 h-3" />
                  {lang === 'ar' ? 'عروض وتخفيضات' : 'Price Drops'}
                </button>
              </div>

              {/* Recent Searches Strip */}
              {!searchQuery.trim() && recentSearches.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll py-0.5">
                  <span className="text-[10.5px] font-semibold text-[#637B6E] inline-flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {lang === 'ar' ? 'الأخيرة:' : 'Recent:'}
                  </span>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setSearchQuery(term)}
                      className="h-7 px-2.5 rounded-full bg-white/80 border border-[#172B20]/10 text-[11px] font-medium text-[#2C4739] hover:border-[#0F6B5D] whitespace-nowrap shrink-0"
                    >
                      {term}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setRecentSearches([]);
                      try {
                        window.localStorage.removeItem('sp_recent_searches_v1');
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-[10.5px] font-semibold text-[#7A9084] hover:text-[#172B20] px-1.5 whitespace-nowrap shrink-0"
                  >
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                </div>
              )}

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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
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
                const filteredBrands = brands.filter((b) => {
                  if (!brandSearch.trim()) return true;
                  const q = brandSearch.toLowerCase();
                  return (
                    b.name.toLowerCase().includes(q) ||
                    (b.name_ar || '').includes(brandSearch.trim())
                  );
                }).sort((a, b) => a.name.localeCompare(b.name));

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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {filteredBrands.map((brand) => {
                      const slug = (brand.slug || brand.name.toLowerCase()) as BrandId;
                      const brandListings = publicListings.filter(
                        (l) => l.brand.toLowerCase() === slug.toLowerCase()
                      );
                      const modelCount = brand.model_count ?? 0;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => navigateTo({ kind: 'brand_models', brandId: slug })}
                          className="clay-card-interactive clay-focus-ring rounded-[26px] p-4 min-h-[148px] flex flex-col justify-between text-start"
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div className="w-13 h-13 rounded-[18px] clay-pill-active flex items-center justify-center text-[#1E4F34] shrink-0 px-1.5">
                              <BrandLogo
                                brandId={slug}
                                className={
                                  slug === 'samsung' || slug === 'tecno'
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
                              {lang === 'ar' && brand.name_ar ? brand.name_ar : brand.name}
                            </p>
                            {lang === 'ar' && (
                              <p className="text-[11px] font-medium text-[#70877B] truncate mt-0.5" dir="ltr">
                                {brand.name}
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

        {/* TAB 4: VERIFIED STORES DIRECTORY (LIST + INTERACTIVE MAP) */}
        {tab === 'stores' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="clay-topbar px-4 pt-3.5 pb-3 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
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

              {/* List / Map Segmented Switch */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-full clay-inset text-xs">
                <button
                  type="button"
                  onClick={() => setStoresViewMode('list')}
                  className={`h-9 rounded-full font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    storesViewMode === 'list' ? 'clay-pill text-[#172B20]' : 'text-[#5E7669]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'قائمة المتاجر' : 'List View'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStoresViewMode('map')}
                  className={`h-9 rounded-full font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    storesViewMode === 'map' ? 'clay-pill text-[#172B20]' : 'text-[#5E7669]'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'الخريطة والأقرب إليك' : 'Map & Near Me'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-2 pb-24">
              {storesViewMode === 'map' ? (
                <StoreMapExplorer
                  stores={verifiedStores}
                  listings={publicListings}
                  selectedCity={selectedCity}
                  onOpenStore={(storeId) => navigateTo({ kind: 'store', storeId })}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MESSAGES (OUTSIDE STORE PORTAL — PEOPLE LIST FIRST, FULL-SCREEN CHAT ON CLICK) */}
        {tab === 'messages' && (
          <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-4 pb-24">
            <UnifiedMessagesView
              mode={isMerchantAccount ? 'merchant' : 'buyer'}
              initialThreadKey={pendingMessageThreadKey}
              onInitialThreadConsumed={() => setPendingMessageThreadKey(null)}
              onUnreadCountChange={(count) => setMessagesUnreadCount(count)}
              onNotificationsChanged={refreshNotificationsAndMessages}
              embeddedInCustomerApp
            />
          </div>
        )}

        {/* Floating Quick Compare Tray (when 1-2 phones are queued) */}
        {compareTrayIds.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[78px] z-30 px-3">
            <div className="pointer-events-auto max-w-md mx-auto bg-[#172B20] text-white rounded-2xl px-3.5 py-2.5 shadow-xl flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <GitCompareArrows className="w-4 h-4 text-emerald-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold truncate">
                    {compareTrayIds
                      .map((id) => discoveryListings.find((l) => l.id === id)?.model || `#${id}`)
                      .join(' vs ')}
                  </p>
                  <p className="text-[10px] text-emerald-200/90">
                    {compareTrayIds.length === 1
                      ? lang === 'ar'
                        ? 'اختر هاتفاً ثانياً أو قارن مباشرة'
                        : 'Pick a 2nd phone or compare now'
                      : lang === 'ar'
                        ? 'جاهز للمقارنة التفصيلية'
                        : 'Ready for side-by-side compare'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    navigateTo({
                      kind: 'compare_phones',
                      primaryListingId: compareTrayIds[0],
                      secondaryListingId: compareTrayIds[1],
                    })
                  }
                  className="h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0B1E14] text-[11px] font-extrabold whitespace-nowrap"
                >
                  {lang === 'ar' ? 'قارن الآن' : 'Compare'}
                </button>
                <button
                  type="button"
                  onClick={() => setCompareTrayIds([])}
                  aria-label={lang === 'ar' ? 'مسح المقارنة' : 'Clear compare tray'}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Sculpted Clay 5-Tab Mobile Navigation Dock (Natural Thumb Zone) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-2.5 pt-2 bg-gradient-to-t from-[#EEF3F0] via-[#EEF3F0]/80 to-transparent">
          <nav
            aria-label={lang === 'ar' ? 'تنقل تطبيق العملاء' : 'Customer app navigation'}
            className="pointer-events-auto max-w-md mx-auto h-[62px] rounded-[26px] clay-dock px-1.5 grid grid-cols-5 items-center gap-0.5"
          >
            {(
              [
                { id: 'home', ar: 'الرئيسية', en: 'Home', icon: Home },
                { id: 'search', ar: 'بحث', en: 'Search', icon: Search },
                { id: 'messages', ar: 'الرسائل', en: 'Messages', icon: MessageSquare },
                { id: 'brands', ar: 'الماركات', en: 'Brands', icon: Grid2x2 },
                { id: 'stores', ar: 'المتاجر', en: 'Stores', icon: StoreIcon },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              const showBadge = item.id === 'messages' && messagesUnreadCount > 0;
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
                  <span className="relative z-10">
                    <Icon className={`w-[19px] h-[19px] ${active ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
                    {showBadge && (
                      <span className="absolute -top-1.5 -end-2 min-w-[16px] h-4 px-1 rounded-full bg-[#0F6B5D] text-white text-[9px] font-bold font-mono-num flex items-center justify-center ring-2 ring-[#EEF3F0]">
                        {messagesUnreadCount}
                      </span>
                    )}
                  </span>
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

  const isAuthDarkBottom =
    entryScreen !== null &&
    (entryScreen === 'launch' ||
      entryScreen === 'welcome');

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
      {/* Desktop-Responsive Centered App Container (full-bleed on mobile, max-w-5xl centered on desktop) */}
      <div
        className={`relative flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col overflow-hidden ${bottomBarBgClass} lg:shadow-xl lg:border-x lg:border-[#172B20]/[0.06]`}
      >
        {renderMobileScreenBody()}
        <CustomerStartupOverlay />
        <AppOpenAdOverlay
          ad={openAd}
          onDismiss={() => setOpenAd(null)}
          onAction={(ad) => {
            setOpenAd(null);
            setEntryScreen(null);
            if (ad.listingId) {
              navigateTo({ kind: 'listing', listingId: ad.listingId });
            } else {
              navigateTo({ kind: 'store', storeId: ad.storeId });
            }
          }}
        />
        <CitySelectorSheet open={citySheetOpen} onClose={() => setCitySheetOpen(false)} />
        <FilterBottomSheet
          open={filterSheetOpen}
          filters={filters}
          onApply={(next) => setFilters(next)}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          onClose={() => setFilterSheetOpen(false)}
        />
        <CustomerNotificationsSheet
          open={notificationsOpen}
          notifications={notifications}
          alerts={priceAlerts}
          onClose={() => setNotificationsOpen(false)}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onDeleteAlert={handleDeletePriceAlert}
          onOpenListing={(listingId) => {
            setNotificationsOpen(false);
            navigateTo({ kind: 'listing', listingId });
          }}
          onOpenStore={(storeId) => {
            setNotificationsOpen(false);
            navigateTo({ kind: 'store', storeId });
          }}
          onOpenMessageThread={(threadKey) => {
            setNotificationsOpen(false);
            setSubScreen({ kind: 'none' });
            setHistoryStack([]);
            setTab('messages');
            if (threadKey) setPendingMessageThreadKey(threadKey);
          }}
        />
        <ContactSellerSheet
          listing={contactTarget.listing}
          store={contactTarget.store}
          onClose={() => setContactTarget({ listing: null, store: null })}
          onOpenInAppChat={(listing, store) => {
            setContactTarget({ listing: null, store: null });
            setChatTarget({ listing, store });
          }}
        />
        <StoreInAppChatSheet
          listing={chatTarget.listing}
          store={chatTarget.store}
          onClose={() => setChatTarget({ listing: null, store: null })}
          onSwitchToExternalContact={(listing, store) => setContactTarget({ listing, store })}
        />
      </div>
    </div>
  );
}
