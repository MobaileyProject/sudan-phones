import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
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
  Store,
  StoreStaffMember,
  UsedAvailability,
  VerificationDocument,
} from '../types';
import { computeRatingSummary, getPhoneModelRatingKey } from '../data/ratingsData';
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
  adminRoles: AdminRole[];
  adminUsers: AdminUser[];
  auditLogs: AuditLogEntry[];
  dualApprovals: DualApprovalRequest[];

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
  getPhoneModelRatingSummary: (brand: BrandId, model: string) => RatingSummary;
  submitStoreRating: (storeId: string, rating: number, authorName: string, comment?: string) => void;
  submitPhoneModelRating: (
    brand: BrandId,
    model: string,
    arabicBrandPrefix: string,
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
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([FOUNDER_ROLE]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([FALLBACK_ADMIN]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [dualApprovals, setDualApprovals] = useState<DualApprovalRequest[]>([]);
  const [reviews, setReviews] = useState<RatingReview[]>([]);
  const [customerReports, setCustomerReports] = useState<CustomerReport[]>([]);
  const [modelIdByKey, setModelIdByKey] = useState<Record<string, number>>({});

  const [activeMerchantStoreId, setActiveMerchantStoreId] = useState<string>('0');
  const [activeAdminUserId, setActiveAdminUserId] = useState<string>('0');
  const [activeMerchantRoleView, setActiveMerchantRoleView] = useState<'owner' | 'clerk'>('owner');
  const [customerDeepLinkListingId, setCustomerDeepLinkListingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cachedAtLabel, setCachedAtLabel] = useState<string>('Live');

  const [sim, setSim] = useState<SimulationState>({
    startupMode: 'ready',
    offlineMode: 'online',
    lowDataMode: false,
    brokenImages: false,
    skeletonLoading: false,
    submissionOutcome: 'normal',
    merchantSessionExpired: false,
    staffPermissionRevoked: false,
    mobileFrameStyle: 'expanded',
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
    setSim((prev) => ({ ...prev, ...patch }));
  }, []);

  const setPortal = useCallback((next: PortalMode) => {
    setPortalState(next);
  }, []);

  const refreshPublicData = useCallback(async () => {
    try {
      const [listingsRes, storesRes, modelsRes, brandsRes] = await Promise.all([
        api.searchListings({ limit: 100 }),
        api.getFeaturedStores(),
        api.getPublicModels({ limit: 100 }),
        api.getBrands(),
      ]);
      const mappedListings = (listingsRes.data || []).map(mapListing);
      const mappedStores = (storesRes.data || []).map((s: any) => mapStore(s));
      const loadedBrands = brandsRes.data || [];
      setListings(mappedListings);
      setStores(mappedStores);
      setBrands(loadedBrands);
      try {
        window.localStorage.setItem('sp_cached_brands', JSON.stringify(loadedBrands));
      } catch {
        // ignore storage quota
      }

      const mMap: Record<string, number> = {};
      for (const m of modelsRes.data || []) {
        const key = getPhoneModelRatingKey(
          (m.brand || '').toLowerCase() as BrandId,
          m.name || ''
        );
        mMap[key] = m.id;
      }
      setModelIdByKey(mMap);

      // Load live ratings for visible stores and models
      const loadedReviews: RatingReview[] = [];
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
                createdAt: item.created_at || '',
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
      const [storeRes, staffRes, listingsRes] = await Promise.all([
        api.getMyStore(),
        api.getMyStaff().catch(() => ({ data: [] })),
        api.getMyListings().catch(() => ({ data: [] })),
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
      const [verifRes, modRes, repRes, rolesRes, usersRes, apprRes, auditRes] = await Promise.all([
        api.getAdminVerifications().catch(() => ({ data: [] })),
        api.getModerationQueue().catch(() => ({ data: [] })),
        api.getAdminReports('all').catch(() => ({ data: [] })),
        api.getAdminRoles().catch(() => ({ data: [] })),
        api.getAdminUsers().catch(() => ({ data: [] })),
        api.getDualApprovals('all').catch(() => ({ data: [] })),
        api.getAuditEvents().catch(() => ({ data: [] })),
      ]);
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

  const getPhoneModelRatingSummary = useCallback(
    (brand: BrandId, model: string) => {
      const key = getPhoneModelRatingKey(brand, model);
      return computeRatingSummary(reviews, 'phone_model', key);
    },
    [reviews]
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
      api
        .submitStoreRating(storeId, rating, comment || '')
        .then(() => {
          setReviews((prev) => [
            {
              id: `sr-${Date.now()}`,
              targetType: 'store',
              targetId: storeId,
              rating,
              authorName: me?.name || authorName || 'Customer',
              comment: comment?.trim() || undefined,
              createdAt: new Date().toISOString(),
            },
            ...prev.filter((r) => !(r.targetType === 'store' && r.targetId === storeId && r.authorName === (me?.name || authorName))),
          ]);
          pushToast('success', { ar: 'تم حفظ تقييم المتجر في قاعدة البيانات.', en: 'Store rating saved to database.' });
        })
        .catch((err: ApiError) => {
          pushToast('error', { ar: err.message, en: err.message });
        });
    },
    [session.authenticated, me, pushToast]
  );

  const submitPhoneModelRating = useCallback(
    (brand: BrandId, model: string, _arabicBrandPrefix: string, rating: number, authorName: string, comment?: string) => {
      if (!session.authenticated) {
        pushToast('warning', {
          ar: 'يرجى تسجيل الدخول بحسابك أولاً لإضافة تقييم للهاتف.',
          en: 'Please sign in with your account first to rate this phone.',
        });
        return;
      }
      const key = getPhoneModelRatingKey(brand, model);
      const modelId = modelIdByKey[key];
      if (!modelId) {
        pushToast('error', { ar: 'تعذر تحديد معرف الموديل في الخادم.', en: 'Could not resolve phone model ID.' });
        return;
      }
      api
        .submitModelRating(modelId, rating, comment || '')
        .then(() => {
          setReviews((prev) => [
            {
              id: `mr-${Date.now()}`,
              targetType: 'phone_model',
              targetId: key,
              rating,
              authorName: me?.name || authorName || 'Customer',
              comment: comment?.trim() || undefined,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          pushToast('success', { ar: 'تم حفظ تقييم الهاتف في قاعدة البيانات.', en: 'Phone rating saved to database.' });
        })
        .catch((err: ApiError) => {
          pushToast('error', { ar: err.message, en: err.message });
        });
    },
    [session.authenticated, me, modelIdByKey, pushToast]
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
      api
        .updateStoreSettings(body)
        .then(() => {
          refreshMerchantData();
          pushToast('success', { ar: 'تم حفظ إعدادات المتجر.', en: 'Store settings saved.' });
        })
        .catch((err: ApiError) => pushToast('error', { ar: err.message, en: err.message }));
    },
    [refreshMerchantData, pushToast]
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
          phone: normalizeSudanPhone(member.phone),
          role: member.role === 'manager' ? 'manager' : 'clerk',
        })
        .then(() => {
          refreshMerchantData();
          pushToast('success', { ar: 'تمت إضافة الموظف لفريق المتجر.', en: 'Staff member added.' });
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

  const assignAdminRole = useCallback(() => {
    pushToast('info', { ar: 'يمكن تعديل التعيين عبر حفظ الدور.', en: 'Role assignments updated via role save.' });
  }, [pushToast]);

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
  const createDualApprovalRequest = useCallback(() => {}, []);

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
        adminRoles,
        adminUsers,
        auditLogs,
        dualApprovals,
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
        getPhoneModelRatingSummary,
        submitStoreRating,
        submitPhoneModelRating,
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
