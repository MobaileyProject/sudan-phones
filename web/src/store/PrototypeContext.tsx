import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AdAnalyticsMetadata,
  AdminPermission,
  AdminRole,
  AdminUser,
  AuditLogEntry,
  BilingualText,
  BrandId,
  CityId,
  CustomerReport,
  DualApprovalRequest,
  Language,
  Listing,
  PortalMode,
  RatingReview,
  RatingSummary,
  ReportReasonId,
  ReportTargetType,
  SimulationState,
  SponsoredAd,
  SponsoredAdPaymentStatus,
  SponsoredAdStatus,
  Store,
  StoreStaffMember,
  UsedAvailability,
  VerificationDocument,
} from '../types';
import {
  computeAggregatedModelRatingSummary,
  computeRatingSummary,
  getPhoneModelRatingKey,
} from '../data/ratingsData';
import {
  api,
  ApiBrand,
  ApiError,
  ApiMe,
  ApiSession,
  getCachedAuth,
  initSessionStorage,
  normalizeSudanPhone,
  setCachedAuth,
} from '../api/client';
import {
  bi,
  mapAdminRole,
  mapAdminUser,
  mapAuditLog,
  mapDualApproval,
  mapListing,
  mapReport,
  mapSponsoredAd,
  mapStore,
} from '../api/mappers';

export interface ToastMessage {
  id: string;
  tone: 'success' | 'warning' | 'error' | 'info';
  text: BilingualText;
}

const FALLBACK_STORE: Store = {
  id: '0',
  name: bi('متجري'),
  city: 'khartoum',
  address: bi(''),
  locationGuidance: bi(''),
  description: bi(''),
  openingHours: bi(''),
  phone: '',
  whatsapp: '',
  contactAvailable: true,
  verificationStatus: 'draft',
  bannerImage: '',
  applicantName: bi(''),
  applicantPhone: '',
  documents: [],
  reviewHistory: [],
  staff: [],
  stats: {
    views7d: 0,
    contactClicks7d: 0,
    dailyViews: ['1', '2', '3', '4', '5', '6', '7'].map((d) => ({
      day: bi(d),
      views: 0,
      contacts: 0,
    })),
  },
};

const FOUNDER_ROLE: AdminRole = {
  id: 'founder',
  name: { ar: 'المؤسس (صلاحيات كاملة)', en: 'Founder (Full Access)' },
  description: { ar: 'صلاحيات كاملة للتوثيق والإشراف والحوكمة', en: 'Full verification, moderation and governance access' },
  permissions: [
    'review_stores',
    'view_private_evidence',
    'moderate_listings',
    'suspend_stores',
    'manage_roles',
    'view_audit_logs',
    'approve_sensitive',
  ],
};

const FALLBACK_ADMIN: AdminUser = {
  id: '0',
  name: bi('Admin'),
  email: '',
  roleId: 'founder',
  city: 'khartoum',
  lastActive: 'Now',
};

interface PrototypeContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  portal: PortalMode;
  setPortal: (portal: PortalMode) => void;
  selectedCity: CityId | 'all';
  setSelectedCity: (city: CityId | 'all') => void;
  hasCompletedCitySelection: boolean;
  setHasCompletedCitySelection: (v: boolean) => void;

  // Live Auth Session & Profile
  session: ApiSession;
  me: ApiMe | null;
  isLoadingLive: boolean;
  loginWithBackend: (payload: { phone?: string; email?: string; password: string }) => Promise<ApiSession>;
  loginWithGoogle: (idToken: string) => Promise<ApiSession>;
  logoutSession: () => Promise<void>;
  updateMeProfile: (payload: { name?: string; preferred_city?: string; preferred_locale?: 'ar' | 'en' }) => Promise<ApiMe>;
  refreshPublicData: () => Promise<void>;
  refreshMerchantData: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
  fetchContactMethods: (listingId: string) => Promise<{ phone_url: string; whatsapp_url: string }>;

  // Entities
  brands: ApiBrand[];
  stores: Store[];
  listings: Listing[];
  adminOverview: {
    stores: number;
    verified_stores: number;
    pending_verifications: number;
    published_listings: number;
    flagged_listings: number;
    open_reports: number;
    pending_approvals: number;
    contact_leads_7d: number;
    active_sponsored_ads?: number;
    ad_revenue_sdg?: number;
  } | null;
  adminRoles: AdminRole[];
  adminUsers: AdminUser[];
  auditLogs: AuditLogEntry[];
  dualApprovals: DualApprovalRequest[];
  sponsoredAds: SponsoredAd[];
  activeOpenAds: SponsoredAd[];
  merchantSponsoredAds: SponsoredAd[];
  saveSponsoredAd: (
    payload: {
      id?: string;
      storeId: string;
      listingId?: string | null;
      titleAr: string;
      titleEn: string;
      subtitleAr: string;
      subtitleEn: string;
      ctaLabelAr: string;
      ctaLabelEn: string;
      badgeAr?: string;
      badgeEn?: string;
      imageUrl: string;
      targetCity: CityId | 'all';
      status: SponsoredAdStatus;
      priority: number;
      skipDelaySec: number;
      paidAmountSdg: number;
      paymentStatus: SponsoredAdPaymentStatus;
      paymentRef?: string;
      startsAt: string;
      endsAt: string;
    }
  ) => Promise<SponsoredAd>;
  toggleSponsoredAdStatus: (adId: string, nextStatus: SponsoredAdStatus) => Promise<void>;
  deleteSponsoredAd: (adId: string) => Promise<void>;
  trackAdImpression: (adId: string, meta?: AdAnalyticsMetadata) => void;
  trackAdClick: (adId: string, meta?: AdAnalyticsMetadata) => void;
  favoriteIds: string[];
  toggleFavorite: (listingId: string) => void;
  archiveListing: (listingId: string) => Promise<void>;
  deleteAdminRole: (roleId: string) => Promise<void>;

  activeMerchantStoreId: string;
  setActiveMerchantStoreId: (id: string) => void;
  activeAdminUserId: string;
  setActiveAdminUserId: (id: string) => void;
  activeMerchantRoleView: 'owner' | 'clerk';
  setActiveMerchantRoleView: (role: 'owner' | 'clerk') => void;

  activeMerchantStore: Store;
  activeAdminUser: AdminUser;
  activeAdminRole: AdminRole;
  hasAdminPermission: (perm: AdminPermission) => boolean;
  publicListings: Listing[];
  cachedPublicListings: Listing[];
  cachedAtLabel: string;
  getStoreById: (id: string) => Store | undefined;

  reviews: RatingReview[];
  getStoreRatingSummary: (storeId: string) => RatingSummary;
  getProductRatingSummary: (listingId: string) => RatingSummary;
  getModelRatingFromProducts: (brand: BrandId, model: string) => RatingSummary;
  submitStoreRating: (storeId: string, rating: number, authorName: string, comment?: string) => void;
  submitProductRating: (
    listingId: string,
    rating: number,
    authorName: string,
    comment?: string
  ) => void;

  customerReports: CustomerReport[];
  submitCustomerReport: (payload: {
    targetType: ReportTargetType;
    targetId: string;
    targetTitle: BilingualText;
    storeId?: string;
    reasonId: ReportReasonId;
    details?: string;
    reporterContact?: string;
  }) => void;
  resolveCustomerReport: (reportId: string, status: 'reviewed' | 'dismissed') => void;

  sim: SimulationState;
  updateSim: (patch: Partial<SimulationState>) => void;
  reconnectAndRefresh: () => void;

  toasts: ToastMessage[];
  pushToast: (tone: ToastMessage['tone'], text: BilingualText) => void;
  dismissToast: (id: string) => void;

  registerOrUpdateStore: (storeId: string | null, data: Partial<Store>, submitForReview?: boolean) => string;
  updateStoreDocuments: (storeId: string, docs: VerificationDocument[]) => void;
  submitStoreResubmission: (storeId: string, note: BilingualText) => void;
  reviewStoreApplication: (storeId: string, decision: 'approved' | 'changes_requested' | 'rejected', note: BilingualText) => void;

  createOrPublishListing: (
    listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'contactClicks' | 'priceHistory' | 'version'>,
    mode: 'draft' | 'publish'
  ) => string;
  updateListingQuick: (
    listingId: string,
    updates: {
      priceSdg?: number;
      stockQty?: number;
      usedAvailability?: UsedAvailability;
      publicationStatus?: Listing['publicationStatus'];
      statusReason?: BilingualText;
    },
    actorName: BilingualText
  ) => void;
  fixAndRepublishListing: (listingId: string) => void;
  recordContactClick: (listingId: string, storeId: string) => void;

  updateStoreProfile: (storeId: string, patch: Partial<Store>) => void;
  requestStoreReverification: (storeId: string, note: BilingualText) => void;
  addStoreStaff: (storeId: string, member: Omit<StoreStaffMember, 'id' | 'addedAt' | 'active'>) => void;
  removeStoreStaff: (storeId: string, staffId: string) => void;

  moderateListing: (listingId: string, action: 'clear' | 'flag' | 'remove', reason: BilingualText) => void;
  suspendStoreDirectOrRequest: (storeId: string, reason: BilingualText, viaDualApproval: boolean) => void;
  saveAdminRole: (role: AdminRole) => void;
  assignAdminRole: (userId: string, roleId: string) => void;
  createDualApprovalRequest: (
    req: Omit<DualApprovalRequest, 'id' | 'createdAt' | 'requesterId' | 'requesterName' | 'status'>
  ) => void;
  resolveDualApproval: (requestId: string, decision: 'approved' | 'rejected', note: BilingualText) => boolean;

  customerDeepLinkListingId: string | null;
  setCustomerDeepLinkListingId: (id: string | null) => void;
  customerDeepLinkStoreId: string | null;
  setCustomerDeepLinkStoreId: (id: string | null) => void;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

function detectInitialPortal(): PortalMode {
  if (typeof window === 'undefined') return 'customer';
  if (import.meta.env.VITE_APP_MODE === 'mobile') return 'customer';
  const p = window.location.pathname.toLowerCase();
  if (p.endsWith('/merchant') || p.includes('/merchant/')) return 'merchant';
  if (p.endsWith('/admin') || p.includes('/admin/')) return 'admin';
  const h = window.location.hash.replace('#', '').toLowerCase();
  if (h === 'merchant' || h === 'admin' || h === 'customer') return h;
  return 'customer';
}

export function PrototypeProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('ar');
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.theme;
    try {
      window.localStorage.removeItem('sp_theme_v1');
    } catch {
      // ignore
    }
  }, []);
  const [portal, setPortalState] = useState<PortalMode>(detectInitialPortal);
  const [selectedCity, setSelectedCity] = useState<CityId | 'all'>('all');
  const [hasCompletedCitySelection, setHasCompletedCitySelection] = useState<boolean>(true);

  const initialCachedAuth = getCachedAuth();
  const [session, setSession] = useState<ApiSession>(
    () =>
      initialCachedAuth?.session ?? {
        authenticated: false,
        role: 'guest',
        permissions: [],
        user_id: null,
        merchant: false,
        phone_verified: false,
        email_verified: false,
      }
  );
  const [me, setMe] = useState<ApiMe | null>(() => initialCachedAuth?.me ?? null);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);

  const [brands, setBrands] = useState<ApiBrand[]>(() => {
    try {
      const raw = window.localStorage.getItem('sp_cached_brands');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [stores, setStores] = useState<Store[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [merchantStore, setMerchantStore] = useState<Store>(FALLBACK_STORE);
  const [merchantListings, setMerchantListings] = useState<Listing[]>([]);
  const [adminVerifications, setAdminVerifications] = useState<any[]>([]);
  const [adminOverview, setAdminOverview] = useState<PrototypeContextValue['adminOverview']>(null);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([FOUNDER_ROLE]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([FALLBACK_ADMIN]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [dualApprovals, setDualApprovals] = useState<DualApprovalRequest[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAd[]>([]);
  const [activeOpenAds, setActiveOpenAds] = useState<SponsoredAd[]>([]);
  const [merchantSponsoredAds, setMerchantSponsoredAds] = useState<SponsoredAd[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem('sp_favorites_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [reviews, setReviews] = useState<RatingReview[]>([]);
  const [customerReports, setCustomerReports] = useState<CustomerReport[]>([]);

  const [activeMerchantStoreId, setActiveMerchantStoreId] = useState<string>('0');
  const [activeAdminUserId, setActiveAdminUserId] = useState<string>('0');
  const [activeMerchantRoleView, setActiveMerchantRoleView] = useState<'owner' | 'clerk'>('owner');
  const [customerDeepLinkListingId, setCustomerDeepLinkListingId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('listing');
    } catch {
      return null;
    }
  });
  const [customerDeepLinkStoreId, setCustomerDeepLinkStoreId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('store');
    } catch {
      return null;
    }
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cachedAtLabel, setCachedAtLabel] = useState<string>('Live');

  const [sim, setSim] = useState<SimulationState>(() => {
    let savedLowData = false;
    try {
      savedLowData = window.localStorage.getItem('sp_low_data_v1') === '1';
    } catch {
      // ignore
    }
    return {
      startupMode: 'ready',
      offlineMode: 'online',
      lowDataMode: savedLowData,
      brokenImages: false,
      skeletonLoading: false,
      submissionOutcome: 'normal',
      merchantSessionExpired: false,
      staffPermissionRevoked: false,
      mobileFrameStyle: 'expanded',
    };
  });

  const pushToast = useCallback((tone: ToastMessage['tone'], text: BilingualText) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateSim = useCallback((patch: Partial<SimulationState>) => {
    setSim((prev) => {
      const next = { ...prev, ...patch };
      if (patch.lowDataMode !== undefined) {
        try {
          window.localStorage.setItem('sp_low_data_v1', patch.lowDataMode ? '1' : '0');
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const setPortal = useCallback((next: PortalMode) => {
    setPortalState(next);
  }, []);

  const refreshPublicData = useCallback(async () => {
    try {
      const [listingsRes, storesRes, brandsRes, adsRes, productRatingsRes] = await Promise.all([
        api.searchListings({ limit: 100 }),
        api.getFeaturedStores(),
        api.getBrands(),
        api.getActiveAds().catch(() => ({ data: [] })),
        api.getAllProductRatings().catch(() => ({ data: [] })),
      ]);
      const mappedListings = (listingsRes.data || []).map(mapListing);
      const mappedStores = (storesRes.data || []).map((s: any) => mapStore(s));
      const loadedBrands = brandsRes.data || [];
      setListings(mappedListings);
      setStores(mappedStores);
      setBrands(loadedBrands);
      setActiveOpenAds((adsRes.data || []).map(mapSponsoredAd));
      try {
        window.localStorage.setItem('sp_cached_brands', JSON.stringify(loadedBrands));
      } catch {
        // ignore storage quota
      }

      // Load live ratings for stores and all individual products (aggregated per model in UI)
      const loadedReviews: RatingReview[] = [];
      for (const item of productRatingsRes.data || []) {
        const listingIdStr = String(item.listing_id);
        const brandSlug = String(item.brand_slug || '').toLowerCase();
        const modelName = String(item.model_name || '');
        loadedReviews.push({
          id: `pr-${item.id}`,
          targetType: 'product',
          targetId: listingIdStr,
          listingId: listingIdStr,
          modelKey: brandSlug && modelName ? getPhoneModelRatingKey(brandSlug, modelName) : undefined,
          storeId: item.store_id ? String(item.store_id) : undefined,
          storeName: item.store_name || undefined,
          rating: Number(item.stars || 5),
          authorName: item.author_name || 'Customer',
          comment: item.comment || undefined,
          createdAt: String(item.created_at || '').slice(0, 10),
        });
      }

      await Promise.all(
        mappedStores.slice(0, 10).map(async (st: Store) => {
          try {
            const r = await api.getStoreRatings(st.id);
            for (const item of r.data || []) {
              loadedReviews.push({
                id: `sr-${item.id}`,
                targetType: 'store',
                targetId: st.id,
                rating: item.stars,
                authorName: item.author_name || 'Customer',
                comment: item.comment || undefined,
                createdAt: String(item.created_at || '').slice(0, 10),
              });
            }
          } catch {
            // ignore individual rating fetch errors
          }
        })
      );
      setReviews(loadedReviews);
      setCachedAtLabel(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      try {
        window.localStorage.setItem('sp_cached_listings', JSON.stringify(mappedListings));
      } catch {
        // ignore storage quota
      }
    } catch {
      try {
        const cached = window.localStorage.getItem('sp_cached_listings');
        if (cached) setListings(JSON.parse(cached));
      } catch {
        // ignore
      }
    }
  }, []);

  const refreshMerchantData = useCallback(async () => {
    try {
      const [storeRes, staffRes, listingsRes, adsRes] = await Promise.all([
        api.getMyStore(),
        api.getMyStaff().catch(() => ({ data: [] })),
        api.getMyListings().catch(() => ({ data: [] })),
        api.getMyStoreAds().catch(() => ({ data: { campaigns: [] } })),
      ]);
      let dailyViews: { day: BilingualText; views: number; contacts: number }[] = [];
      let dashStats = { views: 0, contact_leads: 0 };
      try {
        const dash = await api.getMyDashboard();
        if (dash.data) {
          dailyViews = (dash.data.daily_views || []).map((d: any) => ({
            day: bi(String(d.day || '').slice(5)),
            views: Number(d.count || 0),
            contacts: 0,
          }));
          dashStats = { views: dash.data.views || 0, contact_leads: dash.data.contact_leads || 0 };
        }
      } catch {
        // unverified store won't have dashboard yet
      }
      const staffList: StoreStaffMember[] = (staffRes.data || []).map((m: any) => ({
        id: String(m.id),
        name: bi(m.name),
        phone: m.phone || '',
        role: m.role === 'owner' ? 'owner' : m.role === 'manager' ? 'manager' : 'clerk',
        active: true,
        addedAt: (m.created_at || '').slice(0, 10),
      }));
      const mapped = mapStore(storeRes.data, staffList, dailyViews);
      mapped.stats.views7d = dashStats.views;
      mapped.stats.contactClicks7d = dashStats.contact_leads;
      setMerchantStore(mapped);
      setActiveMerchantStoreId(mapped.id);
      setMerchantListings((listingsRes.data || []).map(mapListing));
      setMerchantSponsoredAds((adsRes.data?.campaigns || []).map(mapSponsoredAd));
      // Merge merchant store into stores list
      setStores((prev) => {
        const exists = prev.some((s) => s.id === mapped.id);
        return exists ? prev.map((s) => (s.id === mapped.id ? mapped : s)) : [mapped, ...prev];
      });
    } catch {
      // not a merchant or unauthenticated
    }
  }, []);

  const refreshAdminData = useCallback(async () => {
    try {
      const [overviewRes, verifRes, modRes, repRes, rolesRes, usersRes, apprRes, auditRes, adminAdsRes] = await Promise.all([
        api.getAdminOverview().catch(() => ({ data: null })),
        api.getAdminVerifications().catch(() => ({ data: [] })),
        api.getModerationQueue().catch(() => ({ data: [] })),
        api.getAdminReports('all').catch(() => ({ data: [] })),
        api.getAdminRoles().catch(() => ({ data: [] })),
        api.getAdminUsers().catch(() => ({ data: [] })),
        api.getDualApprovals('all').catch(() => ({ data: [] })),
        api.getAuditEvents().catch(() => ({ data: [] })),
        api.getAdminAds().catch(() => ({ data: [] })),
      ]);
      if (overviewRes.data) setAdminOverview(overviewRes.data);
      const verifs = verifRes.data || [];
      setAdminVerifications(verifs);
      // Merge pending verification stores into stores list for A-03/A-04
      if (verifs.length > 0) {
        setStores((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          for (const v of verifs) {
            const p = v.profile || {};
            const sid = String(v.store_id);
            byId.set(sid, {
              ...(byId.get(sid) || FALLBACK_STORE),
              id: sid,
              name: bi(p.name || `Store #${sid}`),
              city: (p.city || 'khartoum') as CityId,
              address: bi(p.address || ''),
              phone: p.phone || '',
              whatsapp: p.whatsapp || '',
              verificationStatus: v.status === 'pending_verification' ? 'submitted' : 'verified',
              submittedAt: v.submitted_at,
              ...({ _verificationId: v.id, _verificationVersion: v.version } as any),
            });
          }
          return Array.from(byId.values());
        });
      }
      if ((modRes.data || []).length > 0) {
        setListings((prev) => {
          const byId = new Map(prev.map((l) => [l.id, l]));
          for (const raw of modRes.data) {
            const mapped = mapListing(raw);
            byId.set(mapped.id, mapped);
          }
          return Array.from(byId.values());
        });
      }
      setCustomerReports((repRes.data || []).map(mapReport));
      const mappedRoles = [FOUNDER_ROLE, ...(rolesRes.data || []).map(mapAdminRole)];
      setAdminRoles(mappedRoles);
      const mappedUsers = (usersRes.data || []).map(mapAdminUser);
      if (mappedUsers.length > 0) {
        setAdminUsers(mappedUsers);
        setActiveAdminUserId(mappedUsers[0].id);
      }
      setDualApprovals((apprRes.data || []).map(mapDualApproval));
      setAuditLogs((auditRes.data || []).map(mapAuditLog));
      setSponsoredAds((adminAdsRes.data || []).map(mapSponsoredAd));
    } catch {
      // ignore if not admin
    }
  }, []);

  const hydrateSession = useCallback(async () => {
    setIsLoadingLive(true);
    try {
      await initSessionStorage();
      const nativeCached = getCachedAuth();
      if (nativeCached) {
        setSession(nativeCached.session);
        if (nativeCached.me) setMe(nativeCached.me);
      }
      const sess = await api.getSession();
      setSession(sess);
      if (sess.authenticated) {
        let fetchedMe: ApiMe | null = nativeCached?.me ?? null;
        try {
          const meRes = await api.getMe();
          fetchedMe = meRes.data;
          setMe(fetchedMe);
        } catch {
          setMe(fetchedMe);
        }
        setCachedAuth({ session: sess, me: fetchedMe });
        api
          .getFavorites()
          .then((favRes) => {
            const ids = (favRes.data || []).map((l: any) => String(l.id));
            setFavoriteIds(ids);
            try {
              window.localStorage.setItem('sp_favorites_v1', JSON.stringify(ids));
            } catch {
              // ignore
            }
          })
          .catch(() => {});
        if (sess.merchant || sess.role === 'merchant') {
          await refreshMerchantData();
        }
        if (sess.role === 'admin') {
          await refreshAdminData();
        }
      } else {
        setMe(null);
        setCachedAuth(null);
      }
    } catch {
      // offline or unreachable — preserve cached session/me so user isn't kicked out
    } finally {
      await refreshPublicData();
      setIsLoadingLive(false);
    }
  }, [refreshPublicData, refreshMerchantData, refreshAdminData]);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (portal === 'merchant' && session.authenticated && (session.merchant || session.role === 'merchant')) {
      refreshMerchantData();
    } else if (portal === 'admin' && session.authenticated && session.role === 'admin') {
      refreshAdminData();
    }
  }, [portal, session, refreshMerchantData, refreshAdminData]);

  const loginWithBackend = useCallback(
    async (payload: { phone?: string; email?: string; password: string }) => {
      const clean = payload.phone
        ? { phone: normalizeSudanPhone(payload.phone), password: payload.password }
        : { email: payload.email?.trim(), password: payload.password };
      const sess = await api.login(clean);
      setSession(sess);
      let fetchedMe: ApiMe | null = null;
      try {
        const meRes = await api.getMe();
        fetchedMe = meRes.data;
        setMe(fetchedMe);
      } catch {
        setMe(null);
      }
      setCachedAuth({ session: sess, me: fetchedMe });
      if (sess.merchant || sess.role === 'merchant') await refreshMerchantData();
      if (sess.role === 'admin') await refreshAdminData();
      return sess;
    },
    [refreshMerchantData, refreshAdminData]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const sess = await api.loginGoogle(idToken);
      setSession(sess);
      const meRes = await api.getMe().catch(() => null);
      const fetchedMe = meRes ? meRes.data : null;
      if (fetchedMe) setMe(fetchedMe);
      setCachedAuth({ session: sess, me: fetchedMe });
      return sess;
    },
    []
  );

  const logoutSession = useCallback(async () => {
    await api.logout().catch(() => {});
    setCachedAuth(null);
    setSession({
      authenticated: false,
      role: 'guest',
      permissions: [],
      user_id: null,
      merchant: false,
      phone_verified: false,
      email_verified: false,
    });
    setMe(null);
  }, []);

  const updateMeProfile = useCallback(
    async (payload: { name?: string; preferred_city?: string; preferred_locale?: 'ar' | 'en' }) => {
      const res = await api.updateMe(payload);
      setMe(res.data);
      setCachedAuth({ session, me: res.data });
      return res.data;
    },
    [session]
  );

  const fetchContactMethods = useCallback(async (listingId: string) => {
    const res = await api.getContactMethods(listingId);
    return res.data;
  }, []);

  const allListings = useMemo(() => {
    if (portal === 'merchant' && merchantListings.length > 0) {
      const byId = new Map(listings.map((l) => [l.id, l]));
      for (const ml of merchantListings) byId.set(ml.id, ml);
      return Array.from(byId.values());
    }
    return listings;
  }, [portal, listings, merchantListings]);

  const publicListings = useMemo(() => {
    const verifiedIds = new Set(stores.filter((s) => s.verificationStatus === 'verified').map((s) => s.id));
    return listings.filter((l) => {
      if (verifiedIds.size > 0 && !verifiedIds.has(l.storeId)) return false;
      if (l.publicationStatus !== 'published') return false;
      if (l.condition === 'new' && (l.stockQty ?? 0) <= 0) return false;
      if (l.condition === 'used' && l.usedAvailability && l.usedAvailability !== 'available') return false;
      return true;
    });
  }, [listings, stores]);

  const activeMerchantStore = useMemo(() => {
    if (merchantStore.id !== '0') return merchantStore;
    return stores.find((s) => s.id === activeMerchantStoreId) || stores[0] || FALLBACK_STORE;
  }, [merchantStore, stores, activeMerchantStoreId]);

  const activeAdminUser = useMemo(
    () => adminUsers.find((u) => u.id === activeAdminUserId) || adminUsers[0] || FALLBACK_ADMIN,
    [adminUsers, activeAdminUserId]
  );

  const activeAdminRole = useMemo(
    () => adminRoles.find((r) => r.id === activeAdminUser.roleId) || FOUNDER_ROLE,
    [adminRoles, activeAdminUser]
  );

  const hasAdminPermission = useCallback(
    (perm: AdminPermission) => {
      if (session.role === 'admin') return true;
      return activeAdminRole.id === 'founder' || activeAdminRole.permissions.includes(perm);
    },
    [session.role, activeAdminRole]
  );

  const getStoreById = useCallback((id: string) => stores.find((s) => s.id === id), [stores]);

  const getStoreRatingSummary = useCallback(
    (storeId: string) => computeRatingSummary(reviews, 'store', storeId),
    [reviews]
  );

  const getProductRatingSummary = useCallback(
    (listingId: string) => computeRatingSummary(reviews, 'product', listingId),
    [reviews]
  );

  const getModelRatingFromProducts = useCallback(
    (brand: BrandId, model: string) =>
      computeAggregatedModelRatingSummary(reviews, listings, brand, model),
    [reviews, listings]
  );

  const submitStoreRating = useCallback(
    (storeId: string, rating: number, authorName: string, comment?: string) => {
      if (!session.authenticated) {
        pushToast('warning', {
          ar: 'يرجى تسجيل الدخول بحسابك أولاً لإضافة تقييم.',
          en: 'Please sign in with your account first to submit a rating.',
        });
        return;
      }
      const resolvedAuthor = authorName.trim() || me?.name || 'Customer';
      api
        .submitStoreRating(storeId, rating, comment || '', resolvedAuthor)
        .then(() => {
          setReviews((prev) => [
            {
              id: `sr-${Date.now()}`,
              targetType: 'store',
              targetId: storeId,
              rating,
              authorName: resolvedAuthor,
              comment: comment?.trim() || undefined,
              createdAt: new Date().toISOString().slice(0, 10),
            },
            ...prev.filter((r) => !(r.targetType === 'store' && r.targetId === storeId && r.authorName === resolvedAuthor)),
          ]);
          pushToast('success', { ar: 'تم حفظ تقييم المتجر في قاعدة البيانات.', en: 'Store rating saved to database.' });
        })
        .catch((err: ApiError) => {
          pushToast('error', { ar: err.message, en: err.message });
        });
    },
    [session.authenticated, me, pushToast]
  );

  const submitProductRating = useCallback(
    (listingId: string, rating: number, authorName: string, comment?: string) => {
      const targetListing = listings.find((l) => l.id === listingId);
      const targetStore = targetListing ? stores.find((s) => s.id === targetListing.storeId) : undefined;
      const resolvedAuthor = authorName.trim() || me?.name || 'Customer';

      api
        .submitProductRating(listingId, rating, comment || '', resolvedAuthor)
        .then((res) => {
          const saved = res?.data;
          const modelKey =
            saved?.brand_slug && saved?.model_name
              ? getPhoneModelRatingKey(saved.brand_slug, saved.model_name)
              : targetListing
                ? getPhoneModelRatingKey(targetListing.brand, targetListing.model)
                : undefined;

          setReviews((prev) => [
            {
              id: saved?.id ? `pr-${saved.id}` : `pr-${Date.now()}`,
              targetType: 'product',
              targetId: listingId,
              listingId,
              modelKey,
              storeId: targetListing?.storeId,
              storeName: saved?.store_name || (targetStore ? `${targetStore.name.ar} — ${targetStore.name.en}` : undefined),
              rating: saved?.stars ?? rating,
              authorName: saved?.author_name || resolvedAuthor,
              comment: comment?.trim() || undefined,
              createdAt: String(saved?.created_at || new Date().toISOString()).slice(0, 10),
            },
            ...prev,
          ]);
          pushToast('success', {
            ar: 'تم حفظ تقييم المنتج وتحديث تقييم الموديل تلقائياً.',
            en: 'Product rating saved and linked model rating updated automatically.',
          });
        })
        .catch((err: ApiError) => {
          pushToast('error', { ar: err.message, en: err.message });
        });
    },
    [listings, stores, me, pushToast]
  );

  const submitCustomerReport = useCallback(
    (payload: {
      targetType: ReportTargetType;
      targetId: string;
      targetTitle: BilingualText;
      storeId?: string;
      reasonId: ReportReasonId;
      details?: string;
      reporterContact?: string;
    }) => {
      api
        .submitReport({
          target_type: payload.targetType,
          target_id: Number(payload.targetId),
          reason: payload.reasonId,
          details: payload.details?.trim() || payload.reasonId,
          reporter_contact: payload.reporterContact?.trim() || '',
        })
        .then(() => {
          pushToast('success', {
            ar: 'تم إرسال البلاغ بنجاح إلى فريق المراجعة.',
            en: 'Report submitted to the moderation team.',
          });
        })
        .catch((err: ApiError) => {
          pushToast('error', { ar: err.message, en: err.message });
        });
    },
    [pushToast]
  );

  const resolveCustomerReport = useCallback(
    (reportId: string, status: 'reviewed' | 'dismissed') => {
      api
        .resolveReport(reportId, status, status === 'reviewed' ? 'Reviewed by admin' : 'Dismissed')
        .then(() => {
          setCustomerReports((prev) =>
            prev.map((r) => (r.id === reportId ? { ...r, status } : r))
          );
          pushToast('success', { ar: 'تم تحديث حالة البلاغ.', en: 'Report status updated.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [pushToast]
  );

  const recordContactClick = useCallback((listingId: string) => {
    api.recordContactEvent(listingId, 'whatsapp').catch(() => {});
  }, []);

  const updateListingQuick = useCallback(
    async (
      listingId: string,
      updates: {
        priceSdg?: number;
        stockQty?: number;
        usedAvailability?: UsedAvailability;
        publicationStatus?: Listing['publicationStatus'];
        statusReason?: BilingualText;
      }
    ) => {
      const current = allListings.find((l) => l.id === listingId) as any;
      if (!current) return;
      let version = current._version || 1;
      try {
        if (updates.priceSdg !== undefined && updates.priceSdg !== current.priceSdg) {
          const res = await api.updateListingPrice(listingId, version, updates.priceSdg);
          version = res.data.version;
        }
        if (updates.stockQty !== undefined || updates.usedAvailability !== undefined) {
          const qty =
            current.condition === 'used'
              ? updates.usedAvailability === 'available'
                ? 1
                : 0
              : updates.stockQty ?? current.stockQty ?? 0;
          await api.updateListingStock(listingId, version, qty, updates.usedAvailability);
        }
        await Promise.all([refreshMerchantData(), refreshPublicData()]);
        pushToast('success', { ar: 'تم حفظ تحديث السعر والمخزون على الخادم.', en: 'Price & stock saved to server.' });
      } catch (err: any) {
        pushToast('error', { ar: err?.message || 'فشل الحفظ', en: err?.message || 'Save failed' });
      }
    },
    [allListings, refreshMerchantData, refreshPublicData, pushToast]
  );

  const updateStoreProfile = useCallback(
    (_storeId: string, patch: Partial<Store>) => {
      const body: Record<string, unknown> = {};
      if (patch.openingHours) body.opening_hours = patch.openingHours.ar || patch.openingHours.en;
      if (patch.address) body.address = patch.address.ar || patch.address.en;
      if (patch.description) body.description = patch.description.ar || patch.description.en;
      if (patch.phone) body.phone = normalizeSudanPhone(patch.phone);
      if (patch.whatsapp) body.whatsapp = normalizeSudanPhone(patch.whatsapp);
      if (patch.latitude !== undefined) body.latitude = patch.latitude;
      if (patch.longitude !== undefined) body.longitude = patch.longitude;
      if (patch.acceptsTradeIn !== undefined) body.accepts_trade_in = patch.acceptsTradeIn;
      api
        .updateStoreSettings(body)
        .then(() => {
          refreshMerchantData();
          refreshPublicData();
          pushToast('success', { ar: 'تم حفظ إعدادات المتجر.', en: 'Store settings saved.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [refreshMerchantData, refreshPublicData, pushToast]
  );

  const toggleFavorite = useCallback(
    (listingId: string) => {
      const exists = favoriteIds.includes(listingId);
      const next = exists ? favoriteIds.filter((id) => id !== listingId) : [listingId, ...favoriteIds];
      setFavoriteIds(next);
      try {
        window.localStorage.setItem('sp_favorites_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      if (session.authenticated) {
        const req = exists ? api.removeFavorite(listingId) : api.addFavorite(listingId);
        req.catch(() => {});
      }
      pushToast('info', {
        ar: exists ? 'تمت الإزالة من المفضلة.' : 'تم الحفظ في المفضلة.',
        en: exists ? 'Removed from saved favorites.' : 'Saved to favorites.',
      });
    },
    [favoriteIds, session.authenticated, pushToast]
  );

  const archiveListing = useCallback(
    async (listingId: string) => {
      await api.archiveListing(listingId);
      await Promise.all([refreshMerchantData(), refreshPublicData()]);
      pushToast('info', { ar: 'تم أرشفة/إزالة الإعلان بنجاح.', en: 'Listing archived successfully.' });
    },
    [refreshMerchantData, refreshPublicData, pushToast]
  );

  const deleteAdminRole = useCallback(
    async (roleId: string) => {
      await api.deleteAdminRole(roleId);
      await refreshAdminData();
      pushToast('warning', {
        ar: 'تم إرسال طلب حذف الدور للموافقة المزدوجة.',
        en: 'Role deletion submitted for dual approval.',
      });
    },
    [refreshAdminData, pushToast]
  );

  const requestStoreReverification = useCallback(
    (_storeId: string, note: BilingualText) => {
      api
        .requestReverification({ note: note.ar || note.en })
        .then(() => {
          pushToast('success', {
            ar: 'تم إرسال طلب إعادة التوثيق لفريق المؤسس.',
            en: 'Re-verification request submitted to founders.',
          });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [pushToast]
  );

  const addStoreStaff = useCallback(
    (_storeId: string, member: Omit<StoreStaffMember, 'id' | 'addedAt' | 'active'>) => {
      api
        .addStaff({
          name: member.name.ar || member.name.en,
          phone: normalizeSudanPhone(member.phone),
          role: member.role === 'manager' ? 'manager' : 'clerk',
        })
        .then((res: any) => {
          refreshMerchantData();
          const code = res?.data?.invite_code;
          pushToast('success', {
            ar: code
              ? `تمت إضافة الموظف لفريق المتجر. رمز الدعوة: ${code}`
              : 'تمت إضافة الموظف لفريق المتجر.',
            en: code
              ? `Staff member added. Invite code: ${code}`
              : 'Staff member added.',
          });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [refreshMerchantData, pushToast]
  );

  const removeStoreStaff = useCallback(
    (_storeId: string, staffId: string) => {
      api
        .removeStaff(staffId)
        .then(() => {
          refreshMerchantData();
          pushToast('info', { ar: 'تمت إزالة الموظف من المتجر.', en: 'Staff member removed.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [refreshMerchantData, pushToast]
  );

  const reviewStoreApplication = useCallback(
    (storeId: string, decision: 'approved' | 'changes_requested' | 'rejected', note: BilingualText) => {
      const verif = adminVerifications.find((v) => String(v.store_id) === storeId);
      if (!verif) {
        pushToast('error', { ar: 'لم يتم العثور على طلب التوثيق.', en: 'Verification application not found.' });
        return;
      }
      api
        .decideVerification(verif.id, decision, verif.version || 1, note.ar || note.en || '')
        .then(() => {
          refreshAdminData();
          refreshPublicData();
          pushToast('success', { ar: 'تم تسجيل قرار التوثيق بنجاح.', en: 'Verification decision saved.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [adminVerifications, refreshAdminData, refreshPublicData, pushToast]
  );

  const moderateListing = useCallback(
    (listingId: string, action: 'clear' | 'flag' | 'remove', reason: BilingualText) => {
      const item = allListings.find((l) => l.id === listingId) as any;
      api
        .moderateListing(listingId, action, item?._version || 1, reason.ar || reason.en || 'Moderated')
        .then(() => {
          refreshAdminData();
          refreshPublicData();
          pushToast('success', { ar: 'تم تنفيذ إجراء الإشراف.', en: 'Moderation action applied.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [allListings, refreshAdminData, refreshPublicData, pushToast]
  );

  const suspendStoreDirectOrRequest = useCallback(
    (storeId: string, reason: BilingualText) => {
      api
        .suspendStore(storeId, reason.ar || reason.en || 'Policy violation')
        .then(() => {
          refreshAdminData();
          pushToast('warning', {
            ar: 'تم إرسال طلب تعليق المتجر للموافقة المزدوجة.',
            en: 'Store suspension submitted for dual approval.',
          });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [refreshAdminData, pushToast]
  );

  const resolveDualApproval = useCallback(
    (requestId: string, decision: 'approved' | 'rejected') => {
      const req = dualApprovals.find((d) => d.id === requestId) as any;
      api
        .decideDualApproval(requestId, decision === 'approved' ? 'approve' : 'reject', req?._version || 1)
        .then(() => {
          refreshAdminData();
          refreshPublicData();
          pushToast('success', { ar: 'تم حسم طلب الموافقة المزدوجة.', en: 'Dual approval decided.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
      return true;
    },
    [dualApprovals, refreshAdminData, refreshPublicData, pushToast]
  );

  const saveAdminRole = useCallback(
    (role: AdminRole) => {
      const raw = role as any;
      api
        .saveAdminRole({
          ...(Number(role.id) ? { id: Number(role.id), version: raw._version || 1 } : {}),
          name: role.name.en || role.name.ar,
          description: role.description.en || role.description.ar,
          permissions: role.permissions.filter((p) =>
            ['verify_stores', 'moderate_listings', 'view_audit', 'view_metrics'].includes(p)
          ),
        })
        .then(() => {
          refreshAdminData();
          pushToast('success', { ar: 'تم حفظ الدور الإداري.', en: 'Admin role saved.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [refreshAdminData, pushToast]
  );

  const assignAdminRole = useCallback(
    (userId: string, roleId: string) => {
      const targetRole = adminRoles.find((r) => r.id === roleId) as any;
      if (!targetRole || roleId === 'founder') {
        pushToast('info', {
          ar: 'أدوار المؤسسين تُدار من إعدادات النظام العليا.',
          en: 'Founder roles are managed at the superuser level.',
        });
        return;
      }
      const existingUsers: number[] = Array.isArray(targetRole._userIds) ? targetRole._userIds : [];
      const uid = Number(userId);
      const nextUsers = existingUsers.includes(uid) ? existingUsers : [...existingUsers, uid];
      api
        .saveAdminRole({
          id: Number(targetRole.id),
          version: targetRole._version || 1,
          name: targetRole.name.en || targetRole.name.ar,
          description: targetRole.description.en || targetRole.description.ar,
          permissions: targetRole.permissions.filter((p: string) =>
            ['verify_stores', 'moderate_listings', 'view_audit', 'view_metrics'].includes(p)
          ),
          user_ids: nextUsers,
        })
        .then(() => {
          refreshAdminData();
          pushToast('success', { ar: 'تم تحديث تعيين الدور بنجاح.', en: 'Role assignment saved.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [adminRoles, refreshAdminData, pushToast]
  );

  const registerOrUpdateStore = useCallback(
    (_storeId: string | null, data: Partial<Store>) => {
      api
        .updateStoreProfile({
          name: data.name?.ar || data.name?.en || 'My Store',
          city: data.city || 'khartoum',
          address: data.address?.ar || data.address?.en || '',
          phone: normalizeSudanPhone(data.phone || ''),
          whatsapp: normalizeSudanPhone(data.whatsapp || data.phone || ''),
          description: data.description?.ar || '',
        })
        .then(() => refreshMerchantData())
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
      return activeMerchantStore.id;
    },
    [activeMerchantStore.id, refreshMerchantData, pushToast]
  );

  const updateStoreDocuments = useCallback(() => {}, []);
  const submitStoreResubmission = useCallback(() => {}, []);
  const createOrPublishListing = useCallback(() => '0', []);
  const fixAndRepublishListing = useCallback(() => {
    refreshMerchantData();
  }, [refreshMerchantData]);
  const createDualApprovalRequest = useCallback(
    (req: Omit<DualApprovalRequest, 'id' | 'createdAt' | 'requesterId' | 'requesterName' | 'status'>) => {
      if (req.actionType === 'suspend_store') {
        api
          .suspendStore(req.targetId, req.reason.ar || req.reason.en || 'Policy violation')
          .then(() => {
            refreshAdminData();
            pushToast('warning', {
              ar: 'تم إنشاء طلب تعليق المتجر بانتظار موافقة مؤسس ثانٍ.',
              en: 'Store suspension request created awaiting second founder approval.',
            });
          })
          .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
      }
    },
    [refreshAdminData, pushToast]
  );

  const saveSponsoredAd = useCallback(
    async (payload: {
      id?: string;
      storeId: string;
      listingId?: string | null;
      titleAr: string;
      titleEn: string;
      subtitleAr: string;
      subtitleEn: string;
      ctaLabelAr: string;
      ctaLabelEn: string;
      badgeAr?: string;
      badgeEn?: string;
      imageUrl: string;
      targetCity: CityId | 'all';
      status: SponsoredAdStatus;
      priority: number;
      skipDelaySec: number;
      paidAmountSdg: number;
      paymentStatus: SponsoredAdPaymentStatus;
      paymentRef?: string;
      startsAt: string;
      endsAt: string;
    }) => {
      const apiBody = {
        store_id: Number(payload.storeId),
        listing_id: payload.listingId ? Number(payload.listingId) : null,
        title_ar: payload.titleAr,
        title_en: payload.titleEn,
        subtitle_ar: payload.subtitleAr,
        subtitle_en: payload.subtitleEn,
        cta_label_ar: payload.ctaLabelAr,
        cta_label_en: payload.ctaLabelEn,
        badge_ar: payload.badgeAr ?? '',
        badge_en: payload.badgeEn ?? '',
        image_url: payload.imageUrl,
        target_city: payload.targetCity,
        status: payload.status,
        priority: payload.priority,
        skip_delay_sec: payload.skipDelaySec,
        paid_amount_sdg: payload.paidAmountSdg,
        payment_status: payload.paymentStatus,
        payment_ref: payload.paymentRef ?? '',
        starts_at: payload.startsAt,
        ends_at: payload.endsAt,
      };
      const res = payload.id
        ? await api.updateAdminAd(payload.id, apiBody)
        : await api.createAdminAd(apiBody);
      const mapped = mapSponsoredAd(res.data);
      await Promise.all([refreshAdminData(), refreshPublicData()]);
      pushToast('success', {
        ar: payload.id ? 'تم تحديث الحملة الإعلانية بنجاح.' : 'تم إنشاء وتشغيل الحملة الإعلانية.',
        en: payload.id ? 'Sponsored ad campaign updated.' : 'Sponsored ad campaign created.',
      });
      return mapped;
    },
    [refreshAdminData, refreshPublicData, pushToast]
  );

  const toggleSponsoredAdStatus = useCallback(
    async (adId: string, nextStatus: SponsoredAdStatus) => {
      await api.updateAdminAd(adId, { status: nextStatus });
      await Promise.all([refreshAdminData(), refreshPublicData()]);
      pushToast('info', {
        ar: nextStatus === 'active' ? 'تم تفعيل الإعلان عند فتح التطبيق.' : 'تم إيقاف الحملة مؤقتاً.',
        en: nextStatus === 'active' ? 'App-open ad activated.' : 'Ad campaign paused.',
      });
    },
    [refreshAdminData, refreshPublicData, pushToast]
  );

  const deleteSponsoredAd = useCallback(
    async (adId: string) => {
      await api.deleteAdminAd(adId);
      await Promise.all([refreshAdminData(), refreshPublicData()]);
      pushToast('info', {
        ar: 'تم حذف الحملة الإعلانية.',
        en: 'Sponsored ad campaign deleted.',
      });
    },
    [refreshAdminData, refreshPublicData, pushToast]
  );

  const syncUpdatedAd = useCallback((updated: SponsoredAd) => {
    setActiveOpenAds((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSponsoredAds((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setMerchantSponsoredAds((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const trackAdImpression = useCallback(
    (adId: string, meta?: AdAnalyticsMetadata) => {
      api
        .recordAdImpression(adId, {
          city: meta?.city,
          locale: meta?.locale,
          source: meta?.source || 'app_open_overlay',
        })
        .then((res) => {
          syncUpdatedAd(mapSponsoredAd(res.data));
        })
        .catch(() => {});
    },
    [syncUpdatedAd]
  );

  const trackAdClick = useCallback(
    (adId: string, meta?: AdAnalyticsMetadata) => {
      api
        .recordAdClick(adId, {
          city: meta?.city,
          locale: meta?.locale,
          listing_id: meta?.listingId ? Number(meta.listingId) : null,
          time_to_click_ms: meta?.timeToClickMs,
          source: meta?.source || 'app_open_overlay',
        })
        .then((res) => {
          syncUpdatedAd(mapSponsoredAd(res.data));
        })
        .catch(() => {});
    },
    [syncUpdatedAd]
  );

  const reconnectAndRefresh = useCallback(() => {
    updateSim({ offlineMode: 'online' });
    hydrateSession();
  }, [updateSim, hydrateSession]);

  return (
    <PrototypeContext.Provider
      value={{
        lang,
        setLang,
        portal,
        setPortal,
        selectedCity,
        setSelectedCity,
        hasCompletedCitySelection,
        setHasCompletedCitySelection,
        session,
        me,
        isLoadingLive,
        loginWithBackend,
        loginWithGoogle,
        logoutSession,
        updateMeProfile,
        refreshPublicData,
        refreshMerchantData,
        refreshAdminData,
        fetchContactMethods,
        brands,
        stores,
        listings: allListings,
        adminOverview,
        adminRoles,
        adminUsers,
        auditLogs,
        dualApprovals,
        sponsoredAds,
        activeOpenAds,
        merchantSponsoredAds,
        saveSponsoredAd,
        toggleSponsoredAdStatus,
        deleteSponsoredAd,
        trackAdImpression,
        trackAdClick,
        favoriteIds,
        toggleFavorite,
        archiveListing,
        deleteAdminRole,
        activeMerchantStoreId,
        setActiveMerchantStoreId,
        activeAdminUserId,
        setActiveAdminUserId,
        activeMerchantRoleView,
        setActiveMerchantRoleView,
        activeMerchantStore,
        activeAdminUser,
        activeAdminRole,
        hasAdminPermission,
        publicListings,
        cachedPublicListings: publicListings,
        cachedAtLabel,
        getStoreById,
        reviews,
        getStoreRatingSummary,
        getProductRatingSummary,
        getModelRatingFromProducts,
        submitStoreRating,
        submitProductRating,
        customerReports,
        submitCustomerReport,
        resolveCustomerReport,
        sim,
        updateSim,
        reconnectAndRefresh,
        toasts,
        pushToast,
        dismissToast,
        registerOrUpdateStore,
        updateStoreDocuments,
        submitStoreResubmission,
        reviewStoreApplication,
        createOrPublishListing,
        updateListingQuick,
        fixAndRepublishListing,
        recordContactClick,
        updateStoreProfile,
        requestStoreReverification,
        addStoreStaff,
        removeStoreStaff,
        moderateListing,
        suspendStoreDirectOrRequest,
        saveAdminRole,
        assignAdminRole,
        createDualApprovalRequest,
        resolveDualApproval,
        customerDeepLinkListingId,
        setCustomerDeepLinkListingId,
        customerDeepLinkStoreId,
        setCustomerDeepLinkStoreId,
      }}
    >
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype(): PrototypeContextValue {
  const ctx = useContext(PrototypeContext);
  if (!ctx) throw new Error('usePrototype must be used inside PrototypeProvider');
  return ctx;
}
