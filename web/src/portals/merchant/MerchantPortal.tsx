import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  History,
  KeyRound,
  LayoutDashboard,
  Lock,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  MousePointerClick,
  Package,
  Percent,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Store as StoreIcon,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { api } from '../../api/client';
import {
  CityId,
  DeviceCondition,
  Listing,
  PublicationStatus,
  StoreStaffRole,
  UsedAvailability,
} from '../../types';
import {
  CITIES,
  formatCity,
  formatCondition,
  formatListingTitle,
  formatPublicationStatus,
  formatSdg,
  formatStaffRole,
  formatUsedAvailability,
  formatUsedGrade,
  tText,
} from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import {
  ConfirmDialog,
  LtrValue,
  OfflineBanner,
  PublicationStatusLabel,
  SafeImage,
  TableRowsSkeleton,
  VerificationStatusLabel,
} from '../../components/DesignSystem';
import {
  MerchantAuthView,
  MerchantOnboardingFlow,
  MerchantVerificationTracker,
} from './MerchantOnboarding';
import { MerchantListingWizard } from './MerchantListingWizard';

type MerchantSection =
  | 'dashboard'
  | 'inventory'
  | 'create_listing'
  | 'verification'
  | 'onboarding'
  | 'settings'
  | 'auth';

export function MerchantPortal() {
  const {
    lang,
    listings,
    session,
    me,
    logoutSession,
    activeMerchantStore,
    activeMerchantRoleView,
    merchantSponsoredAds,
    updateListingQuick,
    archiveListing,
    refreshMerchantData,
    refreshPublicData,
    fixAndRepublishListing,
    updateStoreProfile,
    requestStoreReverification,
    addStoreStaff,
    removeStoreStaff,
    setPortal,
    setCustomerDeepLinkListingId,
    pushToast,
  } = usePrototype();

  const [section, setSection] = useState<MerchantSection>(() =>
    session.authenticated ? 'dashboard' : 'auth'
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Inventory Filters
  const [invSearch, setInvSearch] = useState('');
  const [invCondition, setInvCondition] = useState<'all' | DeviceCondition>('all');
  const [invStatus, setInvStatus] = useState<'all' | PublicationStatus>('all');
  const [invStockFilter, setInvStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // Quick Price & Stock Modal
  const [quickEditListing, setQuickEditListing] = useState<Listing | null>(null);
  const [qePrice, setQePrice] = useState('');
  const [qeUsdPrice, setQeUsdPrice] = useState('');
  const [qeTradeIn, setQeTradeIn] = useState(false);
  const [qeStock, setQeStock] = useState('');
  const [qeUsedAv, setQeUsedAv] = useState<UsedAvailability>('available');
  const [qeState, setQeState] = useState<'idle' | 'saving' | 'conflict' | 'uncertain' | 'failed'>('idle');
  const [listingToArchive, setListingToArchive] = useState<Listing | null>(null);

  // Bulk Price Adjustment Modal
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'percent' | 'usd_rate'>('percent');
  const [bulkPercent, setBulkPercent] = useState('5');
  const [bulkUsdRate, setBulkUsdRate] = useState('2700');
  const [bulkRoundTo, setBulkRoundTo] = useState('1000');
  const [bulkCondition, setBulkCondition] = useState<'all' | 'new' | 'used'>('all');
  const [bulkBusy, setBulkBusy] = useState(false);

  // Excel Import ref
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [excelImporting, setExcelImporting] = useState(false);

  // Printable Store QR Code Poster Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Protected verified identity re-verification modal state
  const [reverifyOpen, setReverifyOpen] = useState(false);
  const [reverifyNote, setReverifyNote] = useState('');

  // Settings & Staff State
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [sCity, setSCity] = useState<CityId>(activeMerchantStore.city);
  const [sAddressAr, setSAddressAr] = useState(activeMerchantStore.address.ar);
  const [sHoursAr, setSHoursAr] = useState(activeMerchantStore.openingHours.ar);
  const [sPhone, setSPhone] = useState(activeMerchantStore.phone);
  const [sWhatsapp, setSWhatsapp] = useState(activeMerchantStore.whatsapp);
  const [sDescAr, setSDescAr] = useState(activeMerchantStore.description.ar);
  const [sLat, setSLat] = useState<string>(activeMerchantStore.latitude != null ? String(activeMerchantStore.latitude) : '');
  const [sLng, setSLng] = useState<string>(activeMerchantStore.longitude != null ? String(activeMerchantStore.longitude) : '');
  const [sAcceptsTradeIn, setSAcceptsTradeIn] = useState<boolean>(Boolean(activeMerchantStore.acceptsTradeIn));

  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StoreStaffRole>('clerk');
  const [staffToRemove, setStaffToRemove] = useState<string | null>(null);

  React.useEffect(() => {
    if (!session.authenticated) {
      setSection('auth');
    } else if (section === 'auth') {
      setSection('dashboard');
    }
  }, [session.authenticated]);

  React.useEffect(() => {
    setSCity(activeMerchantStore.city);
    setSAddressAr(activeMerchantStore.address.ar);
    setSHoursAr(activeMerchantStore.openingHours.ar);
    setSPhone(activeMerchantStore.phone);
    setSWhatsapp(activeMerchantStore.whatsapp);
    setSDescAr(activeMerchantStore.description.ar);
    setSLat(activeMerchantStore.latitude != null ? String(activeMerchantStore.latitude) : '');
    setSLng(activeMerchantStore.longitude != null ? String(activeMerchantStore.longitude) : '');
    setSAcceptsTradeIn(Boolean(activeMerchantStore.acceptsTradeIn));
    setSettingsDirty(false);
  }, [activeMerchantStore.id, activeMerchantStore.latitude, activeMerchantStore.longitude, activeMerchantStore.acceptsTradeIn]);

  const storeListings = useMemo(
    () => listings.filter((l) => l.storeId === activeMerchantStore.id),
    [listings, activeMerchantStore.id]
  );

  const activePublishedCount = storeListings.filter((l) => l.publicationStatus === 'published').length;
  const outOfStockListings = storeListings.filter(
    (l) =>
      (l.condition === 'new' && (l.stockQty ?? 0) === 0) ||
      (l.condition === 'used' && l.usedAvailability === 'sold')
  );
  const needsAttentionCount = storeListings.filter(
    (l) => l.publicationStatus === 'needs_correction' || l.publicationStatus === 'flagged'
  ).length;

  const filteredInventory = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return storeListings.filter((l) => {
      if (invCondition !== 'all' && l.condition !== invCondition) return false;
      if (invStatus !== 'all' && l.publicationStatus !== invStatus) return false;
      if (invStockFilter === 'out_of_stock') {
        const isOut =
          (l.condition === 'new' && (l.stockQty ?? 0) === 0) ||
          (l.condition === 'used' && l.usedAvailability === 'sold');
        if (!isOut) return false;
      }
      if (invStockFilter === 'in_stock') {
        const isIn =
          (l.condition === 'new' && (l.stockQty ?? 0) > 0) ||
          (l.condition === 'used' && l.usedAvailability === 'available');
        if (!isIn) return false;
      }
      if (q) {
        return (
          l.model.toLowerCase().includes(q) ||
          l.arabicBrandPrefix.toLowerCase().includes(q) ||
          (l.usedUnitCode ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [storeListings, invSearch, invCondition, invStatus, invStockFilter]);

  const openQuickEdit = (item: Listing) => {
    setQuickEditListing(item);
    setQePrice(String(item.priceSdg));
    setQeUsdPrice(item.usdPrice != null ? String(item.usdPrice) : '');
    setQeTradeIn(Boolean(item.acceptsTradeIn));
    setQeStock(String(item.stockQty ?? 1));
    setQeUsedAv(item.usedAvailability ?? 'available');
    setQeState('idle');
  };

  const commitQuickEdit = async () => {
    if (!quickEditListing) return;
    setQeState('saving');
    try {
      const currentRaw = quickEditListing as any;
      const usdVal = qeUsdPrice.trim() ? Number(qeUsdPrice) : null;
      const tradeInChanged = qeTradeIn !== Boolean(quickEditListing.acceptsTradeIn);
      const usdChanged = usdVal !== (quickEditListing.usdPrice ?? null);
      if (tradeInChanged || usdChanged) {
        await api.editListing(quickEditListing.id, {
          version: currentRaw._version || quickEditListing.version || 1,
          accepts_trade_in: qeTradeIn,
          usd_price: usdVal != null && usdVal > 0 ? usdVal.toFixed(2) : null,
        });
      }
      await updateListingQuick(
        quickEditListing.id,
        {
          priceSdg: Number(qePrice) || quickEditListing.priceSdg,
          stockQty: quickEditListing.condition === 'new' ? Math.max(0, Number(qeStock) || 0) : undefined,
          usedAvailability: quickEditListing.condition === 'used' ? qeUsedAv : undefined,
        },
        { ar: me?.name || activeMerchantStore.name.ar, en: me?.name || activeMerchantStore.name.en }
      );
      setQuickEditListing(null);
      setQeState('idle');
    } catch {
      setQeState('failed');
    }
  };

  const handleExportExcel = () => {
    const rows = storeListings.map((l) => ({
      listing_id: Number(l.id),
      brand: l.brand,
      model: l.model,
      storage_gb: l.storageGb,
      ram_gb: l.ramGb ?? 8,
      color: l.color.en || l.color.ar,
      condition: l.condition,
      price_sdg: l.priceSdg,
      usd_price: l.usdPrice ?? '',
      stock_qty: l.condition === 'new' ? l.stockQty ?? 0 : l.usedAvailability === 'available' ? 1 : 0,
      accepts_trade_in: l.acceptsTradeIn ? 'yes' : 'no',
      status: l.publicationStatus,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const safeName = (activeMerchantStore.name.en || activeMerchantStore.name.ar || 'store')
      .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]+/g, '_')
      .slice(0, 32);
    XLSX.writeFile(wb, `sudan-phones-${safeName}-inventory.xlsx`);
    pushToast('success', {
      ar: `تم تصدير ${rows.length} إعلان إلى ملف Excel بنجاح.`,
      en: `Exported ${rows.length} listings to Excel (.xlsx).`,
    });
  };

  const handleImportExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setExcelImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
      const payloadRows = rawRows
        .filter((r) => r.listing_id != null && Number(r.listing_id) > 0)
        .map((r) => {
          const item: {
            listing_id: number;
            price?: number;
            quantity?: number;
            usd_price?: number | null;
            accepts_trade_in?: boolean;
          } = { listing_id: Number(r.listing_id) };
          const p = r.price_sdg ?? r.price;
          if (p !== undefined && p !== '' && !Number.isNaN(Number(p))) item.price = Number(p);
          const q = r.stock_qty ?? r.quantity;
          if (q !== undefined && q !== '' && !Number.isNaN(Number(q))) item.quantity = Number(q);
          if (r.usd_price !== undefined && r.usd_price !== '' && !Number.isNaN(Number(r.usd_price))) {
            item.usd_price = Number(r.usd_price);
          }
          if (r.accepts_trade_in !== undefined && r.accepts_trade_in !== '') {
            const v = String(r.accepts_trade_in).toLowerCase().trim();
            item.accepts_trade_in = v === 'true' || v === 'yes' || v === '1' || v === 'نعم';
          }
          return item;
        });
      if (payloadRows.length === 0) {
        pushToast('warning', {
          ar: 'لم يتم العثور على صفوف صالحة تحتوي على عمود listing_id. قم بتصدير ملف المخزون أولاً كقالب.',
          en: 'No valid rows with listing_id found. Export your inventory first to get the exact template.',
        });
        return;
      }
      const res = await api.bulkImportListings(payloadRows);
      await Promise.all([refreshMerchantData(), refreshPublicData()]);
      pushToast('success', {
        ar: `تم تحديث ${res.data.updated_count} إعلان من ملف Excel (تم تخطي ${res.data.skipped_count}).`,
        en: `Updated ${res.data.updated_count} listings from Excel (${res.data.skipped_count} skipped).`,
      });
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'فشل استيراد ملف Excel.',
        en: err?.message || 'Failed to import Excel file.',
      });
    } finally {
      setExcelImporting(false);
    }
  };

  const handleBulkPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkBusy(true);
    try {
      const payload =
        bulkMode === 'percent'
          ? {
              mode: 'percent' as const,
              percent: Number(bulkPercent),
              round_to: Number(bulkRoundTo) || 1000,
              condition: bulkCondition,
            }
          : {
              mode: 'usd_rate' as const,
              usd_rate: Number(bulkUsdRate),
              round_to: Number(bulkRoundTo) || 1000,
              condition: bulkCondition,
            };
      const res = await api.bulkUpdatePrices(payload);
      await Promise.all([refreshMerchantData(), refreshPublicData()]);
      setBulkPriceOpen(false);
      pushToast('success', {
        ar: `تم تحديث أسعار ${res.data.updated_count} إعلان دفعة واحدة.`,
        en: `Bulk-updated prices for ${res.data.updated_count} listings.`,
      });
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'فشل التحديث الجماعي للأسعار.',
        en: err?.message || 'Bulk price update failed.',
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const storePublicUrl = `http://13.53.46.243/sudan-phones/?store=${activeMerchantStore.id}`;

  const openQrPoster = async () => {
    try {
      const url = await QRCode.toDataURL(storePublicUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      setQrDataUrl(url);
      setQrModalOpen(true);
    } catch {
      pushToast('error', { ar: 'تعذر توليد رمز QR.', en: 'Failed to generate QR code.' });
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      pushToast('warning', {
        ar: 'متصفحك لا يدعم تحديد الموقع الجغرافي (GPS). أدخل الإحداثيات يدوياً.',
        en: 'Geolocation is not supported in this browser. Enter coordinates manually.',
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSLat(pos.coords.latitude.toFixed(6));
        setSLng(pos.coords.longitude.toFixed(6));
        setSettingsDirty(true);
        pushToast('success', {
          ar: 'تم التقاط موقع المتجر بنجاح. اضغط "حفظ التغييرات" لتثبيته.',
          en: 'Store GPS coordinates captured. Click Save Settings to persist.',
        });
      },
      () => {
        pushToast('error', {
          ar: 'تعذر الوصول للموقع الجغرافي. تأكد من منح إذن الموقع أو أدخل الإحداثيات يدوياً.',
          en: 'Could not read GPS location. Allow location permission or enter coordinates manually.',
        });
      }
    );
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sAddressAr.trim() || sPhone.replace(/\D/g, '').length < 9) {
      pushToast('error', {
        ar: 'يرجى التحقق من العنوان ورقم الهاتف قبل الحفظ.',
        en: 'Please verify store address and phone number before saving.',
      });
      return;
    }
    updateStoreProfile(activeMerchantStore.id, {
      city: activeMerchantStore.verificationStatus === 'verified' ? activeMerchantStore.city : sCity,
      address: { ar: sAddressAr.trim(), en: sAddressAr.trim() },
      openingHours: { ar: sHoursAr.trim(), en: sHoursAr.trim() },
      phone: sPhone.trim(),
      whatsapp: sWhatsapp.trim(),
      description: { ar: sDescAr.trim(), en: sDescAr.trim() },
      latitude: sLat.trim() ? Number(sLat) : null,
      longitude: sLng.trim() ? Number(sLng) : null,
      acceptsTradeIn: sAcceptsTradeIn,
    });
    setSettingsDirty(false);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    addStoreStaff(activeMerchantStore.id, {
      name: { ar: newStaffName.trim(), en: newStaffName.trim() },
      phone: newStaffPhone.trim(),
      role: newStaffRole,
    });
    setNewStaffName('');
    setNewStaffPhone('');
    setAddStaffOpen(false);
  };

  const navItems: { id: MerchantSection; ar: string; en: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', ar: 'لوحة المتجر', en: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', ar: 'المخزون والإعلانات', en: 'Inventory', icon: Package, badge: storeListings.length },
    { id: 'create_listing', ar: 'إضافة هاتف', en: 'Add Phone', icon: Plus },
    { id: 'verification', ar: 'حالة التوثيق', en: 'Verification', icon: ShieldCheck },
    { id: 'onboarding', ar: 'بيانات وتوثيق المتجر', en: 'Store Onboarding', icon: StoreIcon },
    { id: 'settings', ar: 'الإعدادات والفريق', en: 'Settings & Staff', icon: Settings },
    { id: 'auth', ar: 'الحساب والدخول', en: 'Account & Sign In', icon: KeyRound },
  ];

  const isOwner = activeMerchantRoleView === 'owner';

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Store Identity Block */}
      <div className="p-4 border-b border-slate-200 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0F6B5D] text-white flex items-center justify-center shrink-0">
            <StoreIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {lang === 'ar' ? 'بوابة التاجر' : 'Merchant Portal'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {tText(activeMerchantStore.name, lang)}
            </p>
          </div>
        </div>
        <VerificationStatusLabel status={activeMerchantStore.verificationStatus} lang={lang} />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto thin-scroll">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                setMobileNavOpen(false);
              }}
              className={`w-full h-10 px-3 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-teal-50 text-[#0F6B5D] border border-teal-200/80'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{lang === 'ar' ? item.ar : item.en}</span>
              </span>
              {item.badge !== undefined && (
                <span className="text-[11px] font-mono-num text-slate-500">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Store Scope Summary Footer */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-2">
        <div>
          <p className="font-semibold text-slate-800 truncate">{tText(activeMerchantStore.name, lang)}</p>
          <p className="truncate">
            {formatCity(activeMerchantStore.city, lang)} ·{' '}
            {isOwner
              ? lang === 'ar'
                ? 'مالك المتجر'
                : 'Store Owner'
              : lang === 'ar'
                ? 'موظف مبيعات'
                : 'Sales Clerk'}
          </p>
        </div>
        {session.authenticated && (
          <button
            type="button"
            onClick={() => logoutSession()}
            className="w-full h-8 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 font-semibold transition-colors"
          >
            {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-52px)] flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-e border-slate-200 flex-col shrink-0 sticky top-[52px] h-[calc(100vh-52px)]">
        {SidebarContent}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">
                {lang === 'ar' ? 'قائمة التاجر' : 'Merchant Menu'}
              </span>
              <button type="button" onClick={() => setMobileNavOpen(false)} className="p-2 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{SidebarContent}</div>
          </div>
          <div className="flex-1 bg-slate-950/40" onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

      {/* Main Content Canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        <OfflineBanner />

        {/* Merchant Top Context Bar */}
        <header className="h-14 px-4 lg:px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 sticky top-[52px] z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">
                {tText(activeMerchantStore.name, lang)}
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {formatCity(activeMerchantStore.city, lang)} ·{' '}
                {isOwner
                  ? lang === 'ar'
                    ? 'صلاحية: مالك المتجر'
                    : 'Role: Store Owner'
                  : lang === 'ar'
                    ? 'صلاحية: موظف مبيعات (وصول محدود)'
                    : 'Role: Sales Clerk (Restricted)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSection('create_listing')}
              className="h-9 px-3.5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">
                {lang === 'ar' ? 'إضافة هاتف' : 'Add Phone'}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto">
          {section === 'auth' && (
            <MerchantAuthView
              onAuthenticated={(mode) => {
                setSection(mode === 'register' ? 'onboarding' : 'dashboard');
              }}
            />
          )}

          {section === 'onboarding' && (
            <MerchantOnboardingFlow onFinished={() => setSection('verification')} />
          )}

          {section === 'verification' && (
            <MerchantVerificationTracker
              onStartOnboarding={() => setSection('onboarding')}
              onGoToAddListing={() => setSection('create_listing')}
            />
          )}

          {section === 'create_listing' && (
            <MerchantListingWizard
              onComplete={() => setSection('inventory')}
              onGoToVerification={() => setSection('verification')}
            />
          )}

          {/* M-05: MERCHANT DASHBOARD */}
          {section === 'dashboard' && (
            <div className="space-y-6">
              {/* Verification Gate Notice if not verified */}
              {activeMerchantStore.verificationStatus !== 'verified' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                    <p className="text-xs font-medium text-amber-950">
                      {lang === 'ar'
                        ? 'هذا المتجر ليس في حالة "موثّق" حالياً — نشر الإعلانات مقفل حتى اكتمال التوثيق.'
                        : 'This store is not yet verified — listing publication is locked until verification completes.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('verification')}
                    className="h-9 px-4 rounded-xl bg-amber-800 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    {lang === 'ar' ? 'مراجعة حالة التوثيق' : 'View Verification Status'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lang === 'ar' ? 'ملخص نشاط المتجر' : 'Store Activity Overview'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'إحصائيات التصفح ونقرات التواصل الإجمالية خلال آخر 7 أيام.'
                      : 'Aggregate listing views and contact clicks over the last 7 days.'}
                  </p>
                </div>
              </div>

              {storeListings.length === 0 && activeMerchantStore.stats.views7d === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F6B5D] mx-auto">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === 'ar' ? 'لا توجد إعلانات في مخزون متجرك بعد' : 'Your store inventory is empty'}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    {lang === 'ar'
                      ? 'أضف أول هاتف جديد أو مستعمل ليبدأ العملاء في جميع ولايات السودان بمشاهدة عروضك والتواصل معك.'
                      : 'Publish your first new or inspected used phone so customers across Sudan can discover your store and reach you.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSection('create_listing')}
                    className="h-10 px-5 rounded-xl bg-[#0F6B5D] text-white text-xs font-semibold hover:bg-[#0B5348]"
                  >
                    {lang === 'ar' ? '+ إضافة أول هاتف' : '+ Create First Listing'}
                  </button>
                </div>
              ) : (
                <>
                  {/* 4-Column KPI Strip (Strictly Discovery & Stock Metrics — NO revenue/orders!) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                      <p className="text-xs text-slate-500">
                        {lang === 'ar' ? 'الإعلانات المنشورة' : 'Active Live Listings'}
                      </p>
                      <p className="text-2xl font-bold text-slate-900 font-mono-num">
                        {activePublishedCount}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'ar'
                          ? `من أصل ${storeListings.length} إعلان في المخزون`
                          : `of ${storeListings.length} total items`}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                      <p className="text-xs text-slate-500">
                        {lang === 'ar' ? 'تنبيهات نفاد المخزون' : 'Out-of-Stock Alerts'}
                      </p>
                      <p
                        className={`text-2xl font-bold font-mono-num ${
                          outOfStockListings.length > 0 ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {outOfStockListings.length}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {needsAttentionCount > 0
                          ? lang === 'ar'
                            ? `+ ${needsAttentionCount} يحتاج تصحيح`
                            : `+ ${needsAttentionCount} needs attention`
                          : lang === 'ar'
                            ? 'المخزون محدّث'
                            : 'Inventory up to date'}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                      <p className="text-xs text-slate-500">
                        {lang === 'ar' ? 'مشاهدات المتجر والإعلانات (7 أيام)' : 'Store & Listing Views (7d)'}
                      </p>
                      <p className="text-2xl font-bold text-slate-900 font-mono-num">
                        {activeMerchantStore.stats.views7d.toLocaleString('en-US')}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        {lang === 'ar' ? 'تصفح طبيعي من تطبيق العملاء' : 'Organic customer discovery'}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                      <p className="text-xs text-slate-500">
                        {lang === 'ar' ? 'نقرات واتساب والاتصال (إجمالي)' : 'Aggregate Contact Clicks (7d)'}
                      </p>
                      <p className="text-2xl font-bold text-[#0F6B5D] font-mono-num">
                        {activeMerchantStore.stats.contactClicks7d.toLocaleString('en-US')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'ar' ? 'مجمّعة بدون كشف هوية العميل' : 'Anonymized aggregate leads'}
                      </p>
                    </div>
                  </div>

                  {/* Chart + Quick Actions Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
                    {/* Clean Readable 7-Day Bar Chart */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {lang === 'ar'
                              ? 'المشاهدات مقابل نقرات التواصل خلال 7 أيام'
                              : '7-Day Views vs. Contact Clicks'}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {lang === 'ar'
                              ? 'إجمالي التفاعل اليومي على أجهزة متجرك'
                              : 'Daily aggregate discovery & WhatsApp/call handoffs'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" />
                            {lang === 'ar' ? 'مشاهدات' : 'Views'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-[#0F6B5D]" />
                            {lang === 'ar' ? 'نقرات تواصل' : 'Contact clicks'}
                          </span>
                        </div>
                      </div>

                      {activeMerchantStore.stats.dailyViews.length > 0 ? (
                        <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4">
                          {activeMerchantStore.stats.dailyViews.map((d, idx) => {
                            const maxV = Math.max(
                              ...activeMerchantStore.stats.dailyViews.map((x) => x.views),
                              1
                            );
                            const vHeight = Math.max(12, Math.round((d.views / maxV) * 115));
                            const cHeight = Math.max(8, Math.round((d.contacts / maxV) * 260));
                            return (
                              <div key={idx} className="flex flex-col items-center gap-1.5">
                                <div className="flex items-end gap-1 h-32">
                                  <div
                                    title={`${d.views} views`}
                                    style={{ height: `${vHeight}px` }}
                                    className="w-3.5 sm:w-4 rounded-t bg-slate-200"
                                  />
                                  <div
                                    title={`${d.contacts} contact clicks`}
                                    style={{ height: `${Math.min(115, cHeight)}px` }}
                                    className="w-3.5 sm:w-4 rounded-t bg-[#0F6B5D]"
                                  />
                                </div>
                                <span className="text-[10px] font-medium text-slate-600">
                                  {tText(d.day, lang)}
                                </span>
                                <span className="text-[10px] font-mono-num text-slate-400">
                                  {d.contacts}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          {lang === 'ar' ? 'ستظهر البيانات اليومية بعد نشر الإعلانات.' : 'Daily trend appears once listings receive views.'}
                        </p>
                      )}
                    </div>

                    {/* Quick Actions & Out-of-Stock Alerts */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-slate-900">
                        {lang === 'ar' ? 'إجراءات سريعة وتنبيهات' : 'Quick Actions & Alerts'}
                      </h3>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setSection('create_listing')}
                          className="w-full h-10 px-4 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          {lang === 'ar' ? 'إضافة هاتف جديد أو مستعمل' : 'Add New or Used Listing'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSection('inventory')}
                          className="w-full h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4 text-[#0F6B5D]" />
                          {lang === 'ar' ? 'تحديث الأسعار والمخزون بسرعة' : 'Quick Update Price & Stock'}
                        </button>
                        <button
                          type="button"
                          onClick={openQrPoster}
                          className="w-full h-10 px-4 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-50 text-[#0F6B5D] text-xs font-semibold flex items-center justify-center gap-2"
                        >
                          <QrCode className="w-4 h-4" />
                          {lang === 'ar' ? 'ملصق QR قابل للطباعة للمتجر' : 'Printable Store QR Poster'}
                        </button>
                      </div>

                      {outOfStockListings.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'هواتف نفذت كميتها' : 'Out-of-Stock Items'}
                          </p>
                          {outOfStockListings.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-semibold text-slate-900 truncate">
                                {formatListingTitle(item.arabicBrandPrefix, item.model, lang)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openQuickEdit(item)}
                                className="text-[11px] font-bold text-[#0F6B5D] hover:underline whitespace-nowrap"
                              >
                                {lang === 'ar' ? 'تحديث المخزون' : 'Restock'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sponsored App-Open Ads Performance & Click-Through Rates (Store Owner View) */}
                  {(() => {
                    const totalAdViews = merchantSponsoredAds.reduce((sum, a) => sum + a.impressions, 0);
                    const totalAdClicks = merchantSponsoredAds.reduce((sum, a) => sum + a.clicks, 0);
                    const storeAdCtr =
                      totalAdViews > 0 ? ((totalAdClicks / totalAdViews) * 100).toFixed(1) : '0.0';

                    return (
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Megaphone className="w-4 h-4 text-[#0F6B5D]" />
                              {lang === 'ar'
                                ? 'أداء الإعلانات المموّلة عند فتح التطبيق ومعدل النقر (CTR)'
                                : 'Sponsored App-Open Ads & Click-Through Rates (CTR)'}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {lang === 'ar'
                                ? 'متابعة مباشرة لمرات ظهور صورة إعلانك ونقرات العملاء للانتقال إلى منتجك.'
                                : 'Live tracking of app-open ad impressions, product clicks, and click-through rate for your store.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => refreshMerchantData()}
                            className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'تحديث' : 'Refresh'}
                          </button>
                        </div>

                        {merchantSponsoredAds.length === 0 ? (
                          <div className="p-5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                            <p className="text-xs font-semibold text-slate-700">
                              {lang === 'ar'
                                ? 'لا توجد حملات إعلانية مموّلة نشطة لمتجرك حالياً.'
                                : 'No sponsored app-open ad campaigns for your store yet.'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {lang === 'ar'
                                ? 'عند تفعيل إعلان مموّل عبر إدارة سودان فونز، ستظهر هنا إحصائيات المشاهدات والنقرات ومعدل النقر (CTR) تلقائياً.'
                                : 'Once an app-open ad is activated by Sudan Phones Admin, impressions, clicks, and CTR will appear here automatically.'}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  {lang === 'ar' ? 'مرات الظهور' : 'Ad Impressions'}
                                </p>
                                <p className="text-lg font-bold text-slate-900 font-mono-num mt-0.5">
                                  {totalAdViews.toLocaleString('en-US')}
                                </p>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <MousePointerClick className="w-3.5 h-3.5 text-[#0F6B5D]" />
                                  {lang === 'ar' ? 'نقرات الإعلان' : 'Ad Clicks'}
                                </p>
                                <p className="text-lg font-bold text-[#0F6B5D] font-mono-num mt-0.5">
                                  {totalAdClicks.toLocaleString('en-US')}
                                </p>
                              </div>
                              <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80">
                                <p className="text-[11px] text-teal-900 flex items-center gap-1 font-medium">
                                  <TrendingUp className="w-3.5 h-3.5 text-[#0F6B5D]" />
                                  {lang === 'ar' ? 'معدل النقر (CTR)' : 'Click-Through Rate'}
                                </p>
                                <p className="text-lg font-extrabold text-[#0F6B5D] font-mono-num mt-0.5">
                                  {storeAdCtr}%
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {merchantSponsoredAds.map((ad) => {
                                const adCtr =
                                  ad.impressions > 0
                                    ? ((ad.clicks / ad.impressions) * 100).toFixed(1)
                                    : '0.0';
                                const linkedListing = ad.listingId
                                  ? listings.find((l) => l.id === ad.listingId)
                                  : undefined;

                                return (
                                  <div
                                    key={ad.id}
                                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row gap-3.5 items-start sm:items-center"
                                  >
                                    <div className="w-16 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                                      <SafeImage
                                        src={ad.imageUrl}
                                        alt={tText(ad.title, lang)}
                                        aspectClass="w-16 h-20"
                                      />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                            ad.status === 'active'
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              : 'bg-slate-100 text-slate-600 border-slate-200'
                                          }`}
                                        >
                                          {ad.status === 'active'
                                            ? lang === 'ar'
                                              ? 'نشط الآن'
                                              : 'Live Now'
                                            : ad.status}
                                        </span>
                                        <span className="text-[11px] text-slate-500 font-mono-num" dir="ltr">
                                          {ad.startsAt} → {ad.endsAt}
                                        </span>
                                      </div>

                                      <p className="text-xs font-bold text-slate-900 truncate">
                                        {linkedListing
                                          ? formatListingTitle(
                                              linkedListing.arabicBrandPrefix,
                                              linkedListing.model,
                                              lang
                                            )
                                          : tText(ad.title, lang)}
                                      </p>

                                      <div className="h-1.5 w-full max-w-xs rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                          style={{
                                            width: `${Math.min(100, Math.max(4, Number(adCtr) * 3))}%`,
                                          }}
                                          className="h-full rounded-full bg-[#0F6B5D]"
                                        />
                                      </div>

                                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-mono-num">
                                        <span>
                                          {ad.impressions.toLocaleString('en-US')}{' '}
                                          {lang === 'ar' ? 'ظهور' : 'views'}
                                        </span>
                                        <span>·</span>
                                        <span className="font-semibold text-slate-900">
                                          {ad.clicks.toLocaleString('en-US')}{' '}
                                          {lang === 'ar' ? 'نقرة' : 'clicks'}
                                        </span>
                                        {ad.avgTimeToClickMs != null && ad.avgTimeToClickMs > 0 && (
                                          <>
                                            <span>·</span>
                                            <span>
                                              {lang === 'ar' ? 'متوسط النقر ' : 'Avg tap '}
                                              {(ad.avgTimeToClickMs / 1000).toFixed(1)}s
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div className="sm:text-end shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                                      <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs font-extrabold text-[#0F6B5D] font-mono-num">
                                        {adCtr}% CTR
                                      </span>
                                      {ad.dailyStats.length > 0 && (
                                        <div
                                          className="flex items-end gap-1 h-8"
                                          title={
                                            lang === 'ar'
                                              ? 'النقرات اليومية الأخيرة'
                                              : 'Recent daily clicks'
                                          }
                                        >
                                          {ad.dailyStats.slice(-7).map((d) => {
                                            const maxC = Math.max(
                                              ...ad.dailyStats.map((x) => x.clicks),
                                              1
                                            );
                                            const h = Math.max(4, Math.round((d.clicks / maxC) * 28));
                                            return (
                                              <div
                                                key={d.date}
                                                title={`${d.date}: ${d.clicks} clicks / ${d.impressions} views`}
                                                style={{ height: `${h}px` }}
                                                className="w-2 rounded-t bg-[#0F6B5D]/80"
                                              />
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* M-09, M-10, M-13: INVENTORY MANAGEMENT & QUICK UPDATES */}
          {section === 'inventory' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lang === 'ar' ? 'إدارة المخزون والإعلانات' : 'Inventory & Publication Status'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'الإعلانات المستوفية تنشر تلقائياً بعد معالجة الصور. اضغط "تحديث سريع" لتعديل السعر أو الكمية فوراً.'
                      : 'Valid listings publish automatically after automated photo checks. Use Quick Update for instant SDG price & stock edits.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkPriceOpen(true)}
                    disabled={storeListings.length === 0}
                    className="h-10 px-3.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#0F6B5D] text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45"
                  >
                    <Percent className="w-4 h-4" />
                    {lang === 'ar' ? 'تعديل جماعي للأسعار' : 'Bulk Price Adjust'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={storeListings.length === 0}
                    className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => excelInputRef.current?.click()}
                    disabled={excelImporting}
                    className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45"
                  >
                    <Upload className="w-4 h-4 text-blue-700" />
                    {excelImporting
                      ? lang === 'ar'
                        ? 'جاري الاستيراد...'
                        : 'Importing...'
                      : lang === 'ar'
                        ? 'استيراد Excel'
                        : 'Import Excel'}
                  </button>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportExcelFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setSection('create_listing')}
                    className="h-10 px-4 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    {lang === 'ar' ? 'إضافة هاتف' : 'Add Listing'}
                  </button>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder={lang === 'ar' ? 'ابحث بالموديل أو كود القطعة...' : 'Search model or unit code...'}
                    className="w-full h-10 ps-9 pe-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
                <select
                  value={invCondition}
                  onChange={(e) => setInvCondition(e.target.value as 'all' | DeviceCondition)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                >
                  <option value="all">{lang === 'ar' ? 'كل الحالات (جديد ومستعمل)' : 'All Conditions'}</option>
                  <option value="new">{lang === 'ar' ? 'جديد (بالمخزون)' : 'New (Stock Qty)'}</option>
                  <option value="used">{lang === 'ar' ? 'مستعمل (قطعة فردية)' : 'Used (Single Unit)'}</option>
                </select>
                <select
                  value={invStockFilter}
                  onChange={(e) => setInvStockFilter(e.target.value as 'all' | 'in_stock' | 'out_of_stock')}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                >
                  <option value="all">{lang === 'ar' ? 'كل حالات التوفر' : 'All Availability'}</option>
                  <option value="in_stock">{lang === 'ar' ? 'متوفر حالياً' : 'Available / In Stock'}</option>
                  <option value="out_of_stock">{lang === 'ar' ? 'نفد المخزون / مباع' : 'Out of Stock / Sold'}</option>
                </select>
                <select
                  value={invStatus}
                  onChange={(e) => setInvStatus(e.target.value as 'all' | PublicationStatus)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                >
                  <option value="all">{lang === 'ar' ? 'كل حالات النشر' : 'All Publication Statuses'}</option>
                  <option value="published">{formatPublicationStatus('published', lang)}</option>
                  <option value="processing">{formatPublicationStatus('processing', lang)}</option>
                  <option value="draft">{formatPublicationStatus('draft', lang)}</option>
                  <option value="needs_correction">{formatPublicationStatus('needs_correction', lang)}</option>
                  <option value="flagged">{formatPublicationStatus('flagged', lang)}</option>
                  <option value="removed_suspended">{formatPublicationStatus('removed_suspended', lang)}</option>
                </select>
              </div>

              {/* Inventory List / Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {storeListings.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm font-bold text-slate-900">
                      {lang === 'ar' ? 'لا توجد هواتف مسجلة لهذا المتجر بعد' : 'No listings in this store yet'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSection('create_listing')}
                      className="h-10 px-5 rounded-xl bg-[#0F6B5D] text-white text-xs font-semibold"
                    >
                      {lang === 'ar' ? '+ إنشاء أول إعلان' : '+ Create First Listing'}
                    </button>
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm font-bold text-slate-900">
                      {lang === 'ar' ? 'لا توجد نتائج مطابقة للفلاتر الحالية' : 'No matching inventory items'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setInvSearch('');
                        setInvCondition('all');
                        setInvStatus('all');
                        setInvStockFilter('all');
                      }}
                      className="h-9 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Desktop Dense Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-start border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                            <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الهاتف والمواصفات' : 'Device & Variant'}</th>
                            <th className="py-3 px-3 text-start">{lang === 'ar' ? 'النوع' : 'Condition'}</th>
                            <th className="py-3 px-3 text-end">{lang === 'ar' ? 'السعر (ج.س)' : 'Price (SDG)'}</th>
                            <th className="py-3 px-3 text-start">{lang === 'ar' ? 'المخزون / القطعة' : 'Stock / Unit'}</th>
                            <th className="py-3 px-3 text-start">{lang === 'ar' ? 'حالة النشر' : 'Status'}</th>
                            <th className="py-3 px-4 text-end">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredInventory.map((item) => (
                            <React.Fragment key={item.id}>
                              <tr className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <SafeImage
                                      src={item.photos[0]?.url}
                                      alt={item.model}
                                      aspectClass="w-12 h-10 rounded-lg shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">
                                        {formatListingTitle(item.arabicBrandPrefix, item.model, lang)}
                                      </p>
                                      <p className="text-[11px] text-slate-500">
                                        <span dir="ltr" className="font-mono-num">{item.storageGb} GB</span> · {tText(item.color, lang)}
                                        {item.usedUnitCode ? ` · #${item.usedUnitCode}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                                  {formatCondition(item.condition, lang)}
                                  {item.condition === 'used' && item.usedGrade && (
                                    <span className="block text-[10px] text-slate-500">
                                      {formatUsedGrade(item.usedGrade, lang)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-end font-mono-num font-bold text-slate-900 whitespace-nowrap">
                                  {formatSdg(item.priceSdg, lang)}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  {item.condition === 'new' ? (
                                    <span
                                      className={`font-semibold font-mono-num ${
                                        (item.stockQty ?? 0) === 0 ? 'text-red-700' : 'text-slate-800'
                                      }`}
                                    >
                                      {item.stockQty ?? 0}{' '}
                                      {lang === 'ar' ? 'قطعة (مخزون)' : 'in stock'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-700 font-medium">
                                      {formatUsedAvailability(item.usedAvailability, lang)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <PublicationStatusLabel status={item.publicationStatus} lang={lang} />
                                </td>
                                <td className="py-3 px-4 text-end whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openQuickEdit(item)}
                                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#0F6B5D] text-slate-800 font-semibold"
                                      >
                                        {lang === 'ar' ? 'تحديث سريع' : 'Quick Edit'}
                                      </button>
                                      {item.publicationStatus === 'published' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCustomerDeepLinkListingId(item.id);
                                            setPortal('customer');
                                          }}
                                          title={lang === 'ar' ? 'عرض في تطبيق العملاء' : 'View in Customer App'}
                                          className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:text-[#0F6B5D] inline-flex items-center justify-center"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setListingToArchive(item)}
                                        title={lang === 'ar' ? 'حذف / أرشفة الإعلان' : 'Archive / Delete Listing'}
                                        className="h-8 w-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center justify-center"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                  </div>
                                </td>
                              </tr>
                              {item.statusReason && (
                                <tr className="bg-amber-50/40">
                                  <td colSpan={6} className="px-4 py-2.5 text-[11px] text-slate-700">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span>
                                        <strong className="text-slate-900">
                                          {lang === 'ar' ? 'تفاصيل الحالة: ' : 'Status note: '}
                                        </strong>
                                        {tText(item.statusReason, lang)}
                                      </span>
                                      {(item.publicationStatus === 'needs_correction' ||
                                        item.publicationStatus === 'draft' ||
                                        item.publicationStatus === 'flagged') && (
                                        <button
                                          type="button"
                                          onClick={() => fixAndRepublishListing(item.id)}
                                          className="h-7 px-3 rounded-lg bg-[#0F6B5D] text-white font-semibold hover:bg-[#0B5348]"
                                        >
                                          {lang === 'ar'
                                            ? 'تصحيح وإعادة النشر التلقائي'
                                            : 'Fix & Auto-Republish'}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile / Tablet Card Adaptation */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filteredInventory.map((item) => (
                        <div key={item.id} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <SafeImage
                              src={item.photos[0]?.url}
                              alt={item.model}
                              aspectClass="w-16 h-14 rounded-xl shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {formatListingTitle(item.arabicBrandPrefix, item.model, lang)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatCondition(item.condition, lang)} · {item.storageGb} GB
                              </p>
                              <p className="text-sm font-bold text-[#0F6B5D] font-mono-num mt-1">
                                {formatSdg(item.priceSdg, lang)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <PublicationStatusLabel status={item.publicationStatus} lang={lang} />
                            <button
                              type="button"
                              onClick={() => openQuickEdit(item)}
                              className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800"
                            >
                              {lang === 'ar' ? 'تحديث سريع' : 'Quick Edit'}
                            </button>
                          </div>
                          {item.statusReason && (
                            <div className="p-2.5 rounded-lg bg-amber-50 text-[11px] text-amber-950 flex flex-wrap items-center justify-between gap-2">
                              <span>{tText(item.statusReason, lang)}</span>
                              {(item.publicationStatus === 'needs_correction' ||
                                item.publicationStatus === 'draft' ||
                                item.publicationStatus === 'flagged') && (
                                <button
                                  type="button"
                                  onClick={() => fixAndRepublishListing(item.id)}
                                  className="px-2.5 py-1 rounded bg-[#0F6B5D] text-white font-semibold"
                                >
                                  {lang === 'ar' ? 'تصحيح وإعادة المراجعة' : 'Correct & Resubmit'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* M-11: STORE SETTINGS & STAFF MANAGEMENT */}
          {section === 'settings' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lang === 'ar' ? 'إعدادات المتجر وفريق العمل' : 'Store Settings & Staff'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'تحكم في العنوان وساعات العمل وأرقام التواصل وصلاحيات الموظفين.'
                      : 'Manage store profile, hours, WhatsApp/phone contacts, and staff roles.'}
                  </p>
                </div>
              </div>

              {!isOwner && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    {lang === 'ar'
                      ? 'صلاحية موظف مبيعات: تعديل أرقام التواصل الأساسية، الهوية الموثّقة، وإدارة فريق العمل مقتصرة على مالك المتجر فقط.'
                      : 'Sales Clerk Permissions: Editing primary store contacts, verified business identity, and staff access are restricted to the Store Owner.'}
                  </span>
                </div>
              )}

              {/* Step 7E: Protected Verified Business Identity Card */}
              {activeMerchantStore.verificationStatus === 'verified' && (
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>
                        {lang === 'ar'
                          ? 'هوية المتجر الموثّق محمية ضد التعديل المباشر'
                          : 'Verified Business Identity Is Locked Against Direct Edits'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {tText(activeMerchantStore.name, lang)} · {formatCity(activeMerchantStore.city, lang)}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {lang === 'ar'
                        ? 'لحماية ثقة المشترين، لا يمكن تغيير اسم المتجر القانوني أو الولاية الموثّقة مباشرة بعد الاعتماد. لتحديث الهوية أو نقل الموقع إلى ولاية أخرى، أرسل طلب إعادة توثيق لفريق المؤسس.'
                        : 'To protect buyer trust, the approved store name and verified state cannot be edited freely after verification. Submit a re-verification request to update protected business identity.'}
                    </p>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setReverifyNote('');
                        setReverifyOpen(true);
                      }}
                      className="h-10 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      {lang === 'ar' ? 'طلب إعادة توثيق الهوية' : 'Request Identity Re-verification'}
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Store Profile Form */}
                <form
                  onSubmit={handleSaveSettings}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      {lang === 'ar' ? 'الملف العام وأرقام التواصل' : 'Public Profile & Contact Numbers'}
                    </h3>
                    {settingsDirty && (
                      <span className="text-[11px] font-semibold text-amber-700">
                        {lang === 'ar' ? 'توجد تغييرات غير محفوظة' : 'Unsaved changes'}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'الولاية الموثّقة' : 'Verified State'}
                    </label>
                    <select
                      disabled={!isOwner || activeMerchantStore.verificationStatus === 'verified'}
                      value={sCity}
                      onChange={(e) => {
                        setSCity(e.target.value as CityId);
                        setSettingsDirty(true);
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {CITIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {tText(c.name, lang)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'العنوان الفعلي' : 'Physical Address'}
                    </label>
                    <input
                      type="text"
                      disabled={!isOwner}
                      value={sAddressAr}
                      onChange={(e) => {
                        setSAddressAr(e.target.value);
                        setSettingsDirty(true);
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'ساعات العمل' : 'Opening Hours'}
                    </label>
                    <input
                      type="text"
                      value={sHoursAr}
                      onChange={(e) => {
                        setSHoursAr(e.target.value);
                        setSettingsDirty(true);
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {lang === 'ar' ? 'رقم الهاتف الرئيسي' : 'Primary Phone'}
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        disabled={!isOwner}
                        value={sPhone}
                        onChange={(e) => {
                          setSPhone(e.target.value);
                          setSettingsDirty(true);
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono-num disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {lang === 'ar' ? 'رقم واتساب الاستفسارات' : 'Primary WhatsApp'}
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        disabled={!isOwner}
                        value={sWhatsapp}
                        onChange={(e) => {
                          setSWhatsapp(e.target.value);
                          setSettingsDirty(true);
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono-num disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'وصف المتجر' : 'Store Description'}
                    </label>
                    <textarea
                      rows={3}
                      value={sDescAr}
                      onChange={(e) => {
                        setSDescAr(e.target.value);
                        setSettingsDirty(true);
                      }}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  {/* Verified Store GPS Map Pin */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#0F6B5D]" />
                        {lang === 'ar' ? 'دبوس موقع المتجر على خرائط قوقل (GPS)' : 'Verified Store Map Pin (GPS)'}
                      </span>
                      <button
                        type="button"
                        onClick={handleDetectGps}
                        className="h-8 px-3 rounded-lg bg-white border border-teal-200 text-[#0F6B5D] hover:bg-teal-50 text-[11px] font-semibold"
                      >
                        {lang === 'ar' ? 'تحديد موقعي الحالي' : 'Use Current GPS'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {lang === 'ar' ? 'خط العرض (Latitude)' : 'Latitude'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          dir="ltr"
                          value={sLat}
                          onChange={(e) => {
                            setSLat(e.target.value);
                            setSettingsDirty(true);
                          }}
                          placeholder="15.5007"
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {lang === 'ar' ? 'خط الطول (Longitude)' : 'Longitude'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          dir="ltr"
                          value={sLng}
                          onChange={(e) => {
                            setSLng(e.target.value);
                            setSettingsDirty(true);
                          }}
                          placeholder="32.5599"
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono-num"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Store-Wide Trade-In Toggle */}
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={sAcceptsTradeIn}
                      onChange={(e) => {
                        setSAcceptsTradeIn(e.target.checked);
                        setSettingsDirty(true);
                      }}
                      className="w-4 h-4 accent-[#0F6B5D]"
                    />
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[#0F6B5D]" />
                      {lang === 'ar' ? 'المتجر يقبل استبدال الهواتف (Trade-In)' : 'Store accepts phone Trade-In'}
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={openQrPoster}
                      className="h-10 px-4 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-50 text-[#0F6B5D] text-xs font-semibold flex items-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4" />
                      {lang === 'ar' ? 'طباعة ملصق QR للمتجر' : 'Store QR Poster'}
                    </button>
                    <button
                      type="submit"
                      disabled={!settingsDirty}
                      className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold disabled:opacity-45"
                    >
                      {lang === 'ar' ? 'حفظ التغييرات' : 'Save Settings'}
                    </button>
                  </div>
                </form>

                {/* Staff List & Management */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#0F6B5D]" />
                      <h3 className="text-sm font-bold text-slate-900">
                        {lang === 'ar'
                          ? `فريق المتجر (${activeMerchantStore.staff.length})`
                          : `Store Staff (${activeMerchantStore.staff.length})`}
                      </h3>
                    </div>
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setAddStaffOpen(true)}
                      className="h-9 px-3 rounded-xl bg-[#0F6B5D] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'إضافة موظف' : 'Add Staff'}
                    </button>
                  </div>

                  {addStaffOpen && isOwner && (
                    <form
                      onSubmit={handleAddStaff}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <p className="text-xs font-bold text-slate-900">
                        {lang === 'ar' ? 'دعوة عضو جديد لفريق المتجر' : 'Add New Staff Member'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          required
                          value={newStaffName}
                          onChange={(e) => setNewStaffName(e.target.value)}
                          placeholder={lang === 'ar' ? 'اسم الموظف' : 'Staff full name'}
                          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                        <input
                          type="tel"
                          dir="ltr"
                          required
                          value={newStaffPhone}
                          onChange={(e) => setNewStaffPhone(e.target.value)}
                          placeholder="+249 91 ..."
                          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono-num"
                        />
                      </div>
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as StoreStaffRole)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <option value="manager">{formatStaffRole('manager', lang)}</option>
                        <option value="clerk">{formatStaffRole('clerk', lang)}</option>
                      </select>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAddStaffOpen(false)}
                          className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-600"
                        >
                          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          className="h-8 px-4 rounded-lg bg-[#0F6B5D] text-white text-xs font-semibold"
                        >
                          {lang === 'ar' ? 'إضافة' : 'Add'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="divide-y divide-slate-100">
                    {activeMerchantStore.staff.map((m) => (
                      <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {tText(m.name, lang)}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatStaffRole(m.role, lang)} · <LtrValue>{m.phone}</LtrValue>
                          </p>
                        </div>
                        {m.role !== 'owner' && isOwner && (
                          <button
                            type="button"
                            onClick={() => setStaffToRemove(m.id)}
                            aria-label="Remove staff"
                            className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-red-700 hover:bg-red-50 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'إزالة' : 'Remove'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* M-10: Quick Price & Stock Update Modal (with History, Conflict & Uncertain Save States) */}
      {quickEditListing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ar' ? 'تحديث سريع للسعر والمخزون' : 'Quick Price & Stock Update'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatListingTitle(quickEditListing.arabicBrandPrefix, quickEditListing.model, lang)} ·{' '}
                  {quickEditListing.storageGb} GB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditListing(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current vs Proposed */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] text-slate-500 mb-1">
                  {lang === 'ar' ? 'القيمة الحالية' : 'Current Value'}
                </p>
                <p className="text-sm font-bold text-slate-900 font-mono-num">
                  {formatSdg(quickEditListing.priceSdg, lang)}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {quickEditListing.condition === 'new'
                    ? `${quickEditListing.stockQty ?? 0} ${lang === 'ar' ? 'قطع' : 'units'}`
                    : formatUsedAvailability(quickEditListing.usedAvailability, lang)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200">
                <p className="text-[11px] text-[#0F6B5D] font-semibold mb-1">
                  {lang === 'ar' ? 'القيمة المقترحة' : 'Proposed Value'}
                </p>
                <p className="text-sm font-bold text-[#0F6B5D] font-mono-num">
                  {formatSdg(Number(qePrice) || 0, lang)}
                </p>
                <p className="text-[11px] text-slate-700 mt-0.5">
                  {quickEditListing.condition === 'new'
                    ? `${Number(qeStock) || 0} ${lang === 'ar' ? 'قطع' : 'units'}`
                    : formatUsedAvailability(qeUsedAv, lang)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'السعر الجديد (ج.س)' : 'New Price (SDG)'}
                </label>
                <input
                  type="number"
                  value={qePrice}
                  onChange={(e) => setQePrice(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                />
              </div>

              {quickEditListing.condition === 'new' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الكمية الجديدة' : 'New Stock Quantity'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={qeStock}
                    onChange={(e) => setQeStock(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'حالة القطعة الفردية' : 'Used Unit Availability'}
                  </label>
                  <select
                    value={qeUsedAv}
                    onChange={(e) => setQeUsedAv(e.target.value as UsedAvailability)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value="available">{formatUsedAvailability('available', lang)}</option>
                    <option value="reserved">{formatUsedAvailability('reserved', lang)}</option>
                    <option value="sold">{formatUsedAvailability('sold', lang)}</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'السعر المرجعي بالدولار (اختياري)' : 'Reference USD Price (Optional)'}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  dir="ltr"
                  value={qeUsdPrice}
                  onChange={(e) => setQeUsdPrice(e.target.value)}
                  placeholder="350"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                />
              </div>

              <div className="flex items-end pb-1.5">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qeTradeIn}
                    onChange={(e) => setQeTradeIn(e.target.checked)}
                    className="w-4 h-4 accent-[#0F6B5D]"
                  />
                  {lang === 'ar' ? 'يقبل الاستبدال (Trade-In)' : 'Accepts Trade-In'}
                </label>
              </div>
            </div>

            {/* Connection Lost / Save Failure State */}
            {qeState === 'failed' && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <WifiOff className="w-4 h-4 text-red-700" />
                  {lang === 'ar'
                    ? 'تعذر حفظ التحديث بسبب انقطاع الشبكة'
                    : 'Could not save update right now'}
                </p>
                <p className="leading-relaxed">
                  {lang === 'ar'
                    ? 'القيم الجديدة التي أدخلتها محفوظة في هذه النافذة ولم تُفقد. أعد المحاولة عند عودة الاتصال.'
                    : 'Your entered price and stock values are still preserved in this dialog. Retry once connection stabilizes.'}
                </p>
                <button
                  type="button"
                  onClick={() => commitQuickEdit()}
                  className="h-8 px-3 rounded-lg bg-red-700 text-white font-semibold"
                >
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Retry Save'}
                </button>
              </div>
            )}

            {/* Staff Edit Conflict Banner (Plain User-Facing Language — No Technical Jargon) */}
            {qeState === 'conflict' && (
              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-orange-700" />
                  {lang === 'ar'
                    ? 'تعارض في التعديل: قام "مصعب الحسن" بتحديث هذا الإعلان للتو'
                    : 'Update conflict: "Musab Al-Hassan" just updated this listing'}
                </p>
                <p className="leading-relaxed">
                  {lang === 'ar'
                    ? 'تغيّر السعر أو المخزون أثناء قيامك بالتعديل. يمكنك اعتماد القيمة الجديدة التي أدخلتها أو إلغاء التعديل لمراجعة أحدث حالة.'
                    : 'Another team member updated this listing while you were editing. Review the latest values or confirm your update.'}
                </p>
                <button
                  type="button"
                  onClick={() => commitQuickEdit()}
                  className="h-8 px-3 rounded-lg bg-orange-700 text-white font-semibold"
                >
                  {lang === 'ar' ? 'اعتماد قيمتي الجديدة واستبدالها' : 'Confirm My Update'}
                </button>
              </div>
            )}

            {/* Uncertain / Pending Save State (C-09 & M-10) */}
            {qeState === 'uncertain' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" />
                  {lang === 'ar'
                    ? 'حالة الحفظ غير مؤكدة بسبب بطء الشبكة'
                    : 'Save status uncertain due to slow connection'}
                </p>
                <p className="leading-relaxed">
                  {lang === 'ar'
                    ? 'لم نتلق تأكيداً نهائياً بعد — تجنّب الضغط المتكرر على الحفظ، واضغط "التحقق من الحالة" لمعرفة آخر سعر محفوظ.'
                    : 'We have not received final confirmation yet — avoid duplicate clicks and check current status first.'}
                </p>
                <button
                  type="button"
                  onClick={() => commitQuickEdit()}
                  className="h-8 px-3 rounded-lg bg-amber-800 text-white font-semibold"
                >
                  {lang === 'ar' ? 'التحقق من الحالة وإكمال الحفظ' : 'Check Status & Finalize'}
                </button>
              </div>
            )}

            {/* Price-Change History */}
            {quickEditListing.priceHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'سجل تغييرات السعر السابقة' : 'Price Change History'}
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto thin-scroll">
                  {quickEditListing.priceHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>
                        <span className="line-through text-slate-400 font-mono-num">
                          {formatSdg(h.oldPriceSdg, lang)}
                        </span>{' '}
                        ← <strong className="text-slate-900 font-mono-num">{formatSdg(h.newPriceSdg, lang)}</strong>
                      </span>
                      <span className="text-slate-400">{tText(h.changedBy, lang)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickEditListing(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={qeState === 'saving' || qeState === 'uncertain'}
                onClick={() => commitQuickEdit()}
                className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {qeState === 'saving' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {lang === 'ar' ? 'حفظ التحديث الفوري' : 'Save Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protected Identity Re-verification Dialog */}
      <ConfirmDialog
        open={reverifyOpen}
        title={lang === 'ar' ? 'طلب إعادة توثيق هوية المتجر' : 'Request Verified Identity Re-verification'}
        description={
          lang === 'ar'
            ? 'اذكر التغيير المطلوب (مثل الاسم القانوني الجديد أو الانتقال إلى ولاية أخرى). ستبقى إعلاناتك الحالية نشطة حتى يراجع فريق التوثيق المستندات الجديدة.'
            : 'Describe the identity update needed (such as a new legal store name or relocating to another state). Our verification team will review your updated proof.'
        }
        confirmLabel={lang === 'ar' ? 'إرسال طلب إعادة التوثيق' : 'Submit Re-verification Request'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        confirmDisabled={!reverifyNote.trim()}
        onConfirm={() => {
          requestStoreReverification(activeMerchantStore.id, {
            ar: reverifyNote.trim(),
            en: reverifyNote.trim(),
          });
          setReverifyOpen(false);
          setReverifyNote('');
        }}
        onCancel={() => setReverifyOpen(false)}
      >
        <textarea
          rows={3}
          value={reverifyNote}
          onChange={(e) => setReverifyNote(e.target.value)}
          placeholder={
            lang === 'ar'
              ? 'مثال: تحديث اسم المتجر التجاري وفق السجل الجديد...'
              : 'Example: Updating store trade name to match our commercial registration...'
          }
          className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
        />
      </ConfirmDialog>

      {/* Bulk Price Adjustment Modal */}
      {bulkPriceOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[1px]">
          <form
            onSubmit={handleBulkPriceSubmit}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#0F6B5D]" />
                {lang === 'ar' ? 'تعديل جماعي لأسعار المخزون' : 'Bulk Price Adjustment'}
              </h3>
              <button type="button" onClick={() => setBulkPriceOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setBulkMode('percent')}
                className={`h-9 rounded-lg font-semibold ${
                  bulkMode === 'percent' ? 'bg-white text-[#0F6B5D] shadow-sm' : 'text-slate-600'
                }`}
              >
                {lang === 'ar' ? 'نسبة مئوية (+/- %)' : 'Percentage (+/- %)'}
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('usd_rate')}
                className={`h-9 rounded-lg font-semibold ${
                  bulkMode === 'usd_rate' ? 'bg-white text-[#0F6B5D] shadow-sm' : 'text-slate-600'
                }`}
              >
                {lang === 'ar' ? 'سعر صرف الدولار (USD)' : 'USD → SDG Rate'}
              </button>
            </div>

            {bulkMode === 'percent' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'نسبة التغيير (% — سالب للتخفيض، موجب للزيادة)' : 'Change Percentage (% — negative to discount)'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={-90}
                  max={500}
                  required
                  dir="ltr"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'سعر صرف الدولار اليوم (ج.س / 1$)' : 'Exchange Rate (SDG per 1 USD)'}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  dir="ltr"
                  value={bulkUsdRate}
                  onChange={(e) => setBulkUsdRate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {lang === 'ar'
                    ? 'سيتم تحديث الإعلانات التي تحتوي على "سعر مرجعي بالدولار" تلقائياً.'
                    : 'Applies to all listings that have a Reference USD Price set.'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'تقريب لأقرب (ج.س)' : 'Round To (SDG)'}
                </label>
                <select
                  value={bulkRoundTo}
                  onChange={(e) => setBulkRoundTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-mono-num"
                >
                  <option value="1">1 SDG</option>
                  <option value="1000">1,000 SDG</option>
                  <option value="5000">5,000 SDG</option>
                  <option value="10000">10,000 SDG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'نطاق التحديث' : 'Condition Scope'}
                </label>
                <select
                  value={bulkCondition}
                  onChange={(e) => setBulkCondition(e.target.value as 'all' | 'new' | 'used')}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="all">{lang === 'ar' ? 'الكل (جديد ومستعمل)' : 'All Listings'}</option>
                  <option value="new">{lang === 'ar' ? 'الجديد فقط' : 'New Only'}</option>
                  <option value="used">{lang === 'ar' ? 'المستعمل فقط' : 'Used Only'}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkPriceOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={bulkBusy}
                className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold disabled:opacity-50"
              >
                {bulkBusy
                  ? lang === 'ar'
                    ? 'جاري التحديث...'
                    : 'Updating...'
                  : lang === 'ar'
                    ? 'تطبيق التعديل الجماعي'
                    : 'Apply Bulk Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable Store QR Code Poster Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-[1px]">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F6B5D]">
                {lang === 'ar' ? 'ملصق متجرك الموثّق' : 'Verified Store Poster'}
              </span>
              <button type="button" onClick={() => setQrModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 rounded-2xl border-2 border-[#0F6B5D] bg-gradient-to-b from-teal-50/50 to-white space-y-3">
              <p className="text-xs font-bold text-[#0F6B5D] tracking-wide">
                {lang === 'ar' ? 'سودان فونز · Sudan Phones' : 'Sudan Phones · سودان فونز'}
              </p>
              <h3 className="text-lg font-extrabold text-slate-900">
                {tText(activeMerchantStore.name, lang)}
              </h3>
              <p className="text-xs text-slate-600">
                {formatCity(activeMerchantStore.city, lang)} · {tText(activeMerchantStore.address, lang)}
              </p>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Store QR Code"
                  className="w-52 h-52 mx-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                />
              )}
              <p className="text-xs font-semibold text-slate-800">
                {lang === 'ar'
                  ? 'امسح الكود لمشاهدة جميع هواتفنا وأسعار اليوم المحدّثة'
                  : "Scan to browse our live phone inventory & today's SDG prices"}
              </p>
              <p dir="ltr" className="text-[10px] font-mono-num text-slate-400 break-all">
                {storePublicUrl}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5">
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`store-${activeMerchantStore.id}-qr.png`}
                  className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  {lang === 'ar' ? 'تحميل PNG' : 'Download PNG'}
                </a>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                {lang === 'ar' ? 'طباعة الملصق' : 'Print Poster'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive / Delete Listing Confirmation */}
      <ConfirmDialog
        open={Boolean(listingToArchive)}
        title={lang === 'ar' ? 'حذف / أرشفة الإعلان؟' : 'Archive / Delete Listing?'}
        description={
          lang === 'ar'
            ? `سيتم إخفاء "${listingToArchive?.model}" فوراً من تطبيق العملاء وإزالته من المخزون النشط.`
            : `This will immediately hide "${listingToArchive?.model}" from customers and archive it.`
        }
        confirmLabel={lang === 'ar' ? 'نعم، حذف الإعلان' : 'Yes, Archive'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="danger"
        onConfirm={async () => {
          if (listingToArchive) {
            await archiveListing(listingToArchive.id);
          }
          setListingToArchive(null);
        }}
        onCancel={() => setListingToArchive(null)}
      />

      {/* Remove Staff Confirmation */}
      <ConfirmDialog
        open={Boolean(staffToRemove)}
        title={lang === 'ar' ? 'إزالة عضو من فريق المتجر؟' : 'Remove staff member?'}
        description={
          lang === 'ar'
            ? 'سيفقد هذا العضو صلاحية الدخول وتحديث الأسعار أو المخزون فوراً.'
            : 'This staff member will immediately lose access to manage store inventory.'
        }
        confirmLabel={lang === 'ar' ? 'نعم، إزالة الموظف' : 'Yes, Remove'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="danger"
        onConfirm={() => {
          if (staffToRemove) removeStoreStaff(activeMerchantStore.id, staffToRemove);
          setStaffToRemove(null);
        }}
        onCancel={() => setStaffToRemove(null)}
      />
    </div>
  );
}
