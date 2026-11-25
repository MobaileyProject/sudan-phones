import React, { useMemo, useState } from 'react';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Image as ImageIcon,
  MapPin,
  Megaphone,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Store as StoreIcon,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import {
  CityId,
  SponsoredAd,
  SponsoredAdPaymentStatus,
  SponsoredAdStatus,
} from '../../types';
import {
  CITIES,
  formatCity,
  formatListingTitle,
  formatSdg,
  tText,
} from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import { ConfirmDialog, SafeImage } from '../../components/DesignSystem';
import { AppOpenAdOverlay } from '../customer/AppOpenAdOverlay';

const PRESET_AD_IMAGES = [
  {
    id: 'nile_iphone_poster',
    labelAr: 'بوستر آيفون 15 برو',
    labelEn: 'iPhone 15 Pro Poster',
    url: '/src/assets/images/nile_iphone_ad_1795533298478.jpg',
  },
  {
    id: 'galaxy_poster',
    labelAr: 'بوستر جالكسي S24',
    labelEn: 'Galaxy S24 Poster',
    url: '/src/assets/images/galaxy_store_ad_1795533259928.jpg',
  },
  {
    id: 'iphone',
    labelAr: 'آيفون 15 برو',
    labelEn: 'iPhone 15 Pro',
    url: '/src/assets/images/phone_iphone_15_pro_1795165420234.jpg',
  },
  {
    id: 'xiaomi',
    labelAr: 'شاومي / فئة اقتصادية',
    labelEn: 'Xiaomi / Value',
    url: '/src/assets/images/phone_xiaomi_midrange_1795165422645.jpg',
  },
  {
    id: 'storefront',
    labelAr: 'واجهة متجر هواتف',
    labelEn: 'Phone Storefront',
    url: '/src/assets/images/storefront_sudan_mobile_shop_1795165421628.jpg',
  },
];

interface AdFormState {
  id?: string;
  storeId: string;
  listingId: string;
  campaignLabel: string;
  imageUrl: string;
  targetCity: CityId | 'all';
  status: SponsoredAdStatus;
  priority: number;
  skipDelaySec: number;
  paidAmountSdg: string;
  paymentStatus: SponsoredAdPaymentStatus;
  paymentRef: string;
  startsAt: string;
  endsAt: string;
}

function todayPlus(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export function AdminSponsoredAdsPanel() {
  const {
    lang,
    stores,
    listings,
    sponsoredAds,
    saveSponsoredAd,
    toggleSponsoredAdStatus,
    deleteSponsoredAd,
    refreshAdminData,
    pushToast,
  } = usePrototype();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SponsoredAdStatus>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewAd, setPreviewAd] = useState<SponsoredAd | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SponsoredAd | null>(null);

  const verifiedStores = useMemo(
    () => stores.filter((s) => s.verificationStatus === 'verified'),
    [stores]
  );
  const selectableStores = verifiedStores.length > 0 ? verifiedStores : stores;

  const createBlankForm = (): AdFormState => {
    const defaultStore = selectableStores[0];
    const defaultStoreId = defaultStore?.id || '1';
    const firstListing = listings.find(
      (l) => l.storeId === defaultStoreId && l.publicationStatus === 'published'
    );
    return {
      storeId: defaultStoreId,
      listingId: firstListing?.id || '',
      campaignLabel: '',
      imageUrl: firstListing?.photos[0]?.url || defaultStore?.bannerImage || PRESET_AD_IMAGES[0].url,
      targetCity: 'all',
      status: 'active',
      priority: 80,
      skipDelaySec: 3,
      paidAmountSdg: '350000',
      paymentStatus: 'paid',
      paymentRef: '',
      startsAt: todayPlus(0),
      endsAt: todayPlus(14),
    };
  };

  const [form, setForm] = useState<AdFormState>(createBlankForm);

  const openCreateModal = () => {
    setForm(createBlankForm());
    setFormError('');
    setEditorOpen(true);
  };

  const openEditModal = (ad: SponsoredAd) => {
    setForm({
      id: ad.id,
      storeId: ad.storeId,
      listingId: ad.listingId || '',
      campaignLabel: tText(ad.title, lang),
      imageUrl: ad.imageUrl,
      targetCity: ad.targetCity,
      status: ad.status,
      priority: ad.priority,
      skipDelaySec: ad.skipDelaySec,
      paidAmountSdg: String(ad.paidAmountSdg),
      paymentStatus: ad.paymentStatus,
      paymentRef: ad.paymentRef || '',
      startsAt: ad.startsAt || todayPlus(0),
      endsAt: ad.endsAt || todayPlus(14),
    });
    setFormError('');
    setEditorOpen(true);
  };

  const storeListingsForForm = useMemo(
    () =>
      listings.filter(
        (l) => l.storeId === form.storeId && l.publicationStatus === 'published'
      ),
    [listings, form.storeId]
  );

  // KPI aggregations
  const activeCount = sponsoredAds.filter((a) => a.status === 'active').length;
  const paidRevenueSdg = sponsoredAds
    .filter((a) => a.paymentStatus === 'paid')
    .reduce((sum, a) => sum + a.paidAmountSdg, 0);
  const pendingRevenueSdg = sponsoredAds
    .filter((a) => a.paymentStatus !== 'paid')
    .reduce((sum, a) => sum + a.paidAmountSdg, 0);
  const totalImpressions = sponsoredAds.reduce((sum, a) => sum + a.impressions, 0);
  const totalClicks = sponsoredAds.reduce((sum, a) => sum + a.clicks, 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  const storeCtrSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        storeId: string;
        storeName: SponsoredAd['storeName'];
        campaigns: number;
        activeCampaigns: number;
        impressions: number;
        clicks: number;
      }
    >();
    for (const ad of sponsoredAds) {
      const existing = map.get(ad.storeId) || {
        storeId: ad.storeId,
        storeName: ad.storeName,
        campaigns: 0,
        activeCampaigns: 0,
        impressions: 0,
        clicks: 0,
      };
      existing.campaigns += 1;
      if (ad.status === 'active') existing.activeCampaigns += 1;
      existing.impressions += ad.impressions;
      existing.clicks += ad.clicks;
      map.set(ad.storeId, existing);
    }
    return Array.from(map.values())
      .map((s) => ({
        ...s,
        ctrPct: s.impressions > 0 ? Number(((s.clicks / s.impressions) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.ctrPct - a.ctrPct || b.clicks - a.clicks);
  }, [sponsoredAds]);

  const handleRefreshAnalytics = async () => {
    setRefreshingStats(true);
    try {
      await refreshAdminData();
    } finally {
      setRefreshingStats(false);
    }
  };

  const filteredAds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sponsoredAds.filter((ad) => {
      if (statusFilter !== 'all' && ad.status !== statusFilter) return false;
      if (q) {
        const hay = `${ad.title.ar} ${ad.title.en} ${ad.storeName.ar} ${ad.storeName.en} ${ad.paymentRef || ''}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [sponsoredAds, search, statusFilter]);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setFormError(
        lang === 'ar'
          ? 'حجم الصورة يتجاوز 3 ميجابايت. يرجى اختيار صورة أصغر.'
          : 'Image exceeds 3 MB. Please choose a smaller image.'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.storeId) {
      setFormError(lang === 'ar' ? 'يرجى اختيار المتجر المعلن.' : 'Please select a sponsoring store.');
      return;
    }
    if (!form.listingId) {
      setFormError(
        lang === 'ar'
          ? 'يرجى اختيار المنتج الأصلي الذي سينتقل إليه المستخدم عند النقر على صورة الإعلان.'
          : 'Please select the original product listing to open when tapping the ad photo.'
      );
      return;
    }
    if (!form.imageUrl.trim()) {
      setFormError(
        lang === 'ar'
          ? 'يرجى رفع أو اختيار صورة الإعلان المقدّمة من المتجر.'
          : 'Please upload or select the store-submitted ad photo.'
      );
      return;
    }

    const chosenStore = stores.find((s) => s.id === form.storeId);
    const chosenListing = listings.find((l) => l.id === form.listingId);
    const defaultLabelAr = chosenListing
      ? `${chosenListing.arabicBrandPrefix} ${chosenListing.model} — ${chosenStore?.name.ar || ''}`
      : chosenStore?.name.ar || 'إعلان متجر';
    const defaultLabelEn = chosenListing
      ? `${chosenListing.model} — ${chosenStore?.name.en || ''}`
      : chosenStore?.name.en || 'Store Ad';
    const label = form.campaignLabel.trim();

    setSaving(true);
    try {
      await saveSponsoredAd({
        id: form.id,
        storeId: form.storeId,
        listingId: form.listingId,
        titleAr: label || defaultLabelAr,
        titleEn: label || defaultLabelEn,
        subtitleAr: '',
        subtitleEn: '',
        ctaLabelAr: 'عرض المنتج',
        ctaLabelEn: 'View Product',
        badgeAr: '',
        badgeEn: '',
        imageUrl: form.imageUrl.trim(),
        targetCity: form.targetCity,
        status: form.status,
        priority: Number(form.priority) || 50,
        skipDelaySec: Math.max(0, Math.min(10, Number(form.skipDelaySec) || 0)),
        paidAmountSdg: Math.max(0, Math.round(Number(form.paidAmountSdg) || 0)),
        paymentStatus: form.paymentStatus,
        paymentRef: form.paymentRef.trim(),
        startsAt: form.startsAt,
        endsAt: form.endsAt,
      });
      setEditorOpen(false);
    } catch (err: any) {
      setFormError(err?.message || (lang === 'ar' ? 'تعذر حفظ الحملة الإعلانية.' : 'Failed to save ad campaign.'));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: SponsoredAdStatus) => {
    switch (status) {
      case 'active':
        return {
          cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: lang === 'ar' ? 'نشط عند فتح التطبيق' : 'Live on App Open',
        };
      case 'scheduled':
        return {
          cls: 'bg-blue-50 text-blue-800 border-blue-200',
          label: lang === 'ar' ? 'مجدول' : 'Scheduled',
        };
      case 'paused':
        return {
          cls: 'bg-amber-50 text-amber-800 border-amber-200',
          label: lang === 'ar' ? 'متوقف مؤقتاً' : 'Paused',
        };
      default:
        return {
          cls: 'bg-slate-100 text-slate-600 border-slate-200',
          label: lang === 'ar' ? 'منتهي' : 'Ended',
        };
    }
  };

  const paymentBadge = (status: SponsoredAdPaymentStatus) => {
    switch (status) {
      case 'paid':
        return {
          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: lang === 'ar' ? 'مدفوع' : 'Paid',
        };
      case 'invoiced':
        return {
          cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: lang === 'ar' ? 'مُفوتر' : 'Invoiced',
        };
      default:
        return {
          cls: 'bg-amber-50 text-amber-700 border-amber-200',
          label: lang === 'ar' ? 'بانتظار الدفع' : 'Payment Pending',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            {lang === 'ar' ? 'الإعلانات المموّلة عند فتح التطبيق' : 'App-Open Sponsored Ads'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'ar'
              ? 'إدارة صور الإعلانات المدفوعة من المتاجر؛ تظهر الصورة فوق خلفية ضبابية عند دخول التطبيق وتنقل العميل مباشرة لصفحة المنتج.'
              : 'Manage store-submitted ad photos shown over a blurred backdrop when entering the app, linking directly to the product listing.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={refreshingStats}
            onClick={handleRefreshAnalytics}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
            {lang === 'ar' ? 'تحديث الإحصائيات' : 'Refresh Analytics'}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            {lang === 'ar' ? 'إضافة إعلان مموّل جديد' : 'New Sponsored Ad'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'ar' ? 'الحملات النشطة حالياً' : 'Active Campaigns'}</span>
            <Megaphone className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-num">{activeCount}</p>
          <p className="text-[11px] text-slate-500">
            {lang === 'ar'
              ? `من إجمالي ${sponsoredAds.length} حملات مسجّلة`
              : `out of ${sponsoredAds.length} total campaigns`}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'ar' ? 'إيرادات الإعلانات المدفوعة' : 'Paid Ad Revenue'}</span>
            <Banknote className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-blue-700 font-mono-num truncate">
            {formatSdg(paidRevenueSdg, lang)}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {pendingRevenueSdg > 0
              ? lang === 'ar'
                ? `+ ${formatSdg(pendingRevenueSdg, lang)} بانتظار التحصيل`
                : `+ ${formatSdg(pendingRevenueSdg, lang)} pending`
              : lang === 'ar'
                ? 'تم تحصيل جميع الفواتير'
                : 'All invoices collected'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'ar' ? 'مرات الظهور عند الفتح' : 'App-Open Impressions'}</span>
            <Eye className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-num">
            {totalImpressions.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500">
            {lang === 'ar' ? 'إجمالي المشاهدات الفعلية' : 'Total verified app opens'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'ar' ? 'النقرات على الصور' : 'Photo Clicks & CTR'}</span>
            <MousePointerClick className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-num">
            {totalClicks.toLocaleString()}{' '}
            <span className="text-sm font-semibold text-emerald-700">({overallCtr}%)</span>
          </p>
          <p className="text-[11px] text-slate-500">
            {lang === 'ar' ? 'زيارات مباشرة للمنتجات' : 'Direct visits to product listings'}
          </p>
        </div>
      </div>

      {/* Store-Level Click-Through Rates (CTR) Breakdown */}
      {storeCtrSummary.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              {lang === 'ar'
                ? 'معدل النقر (CTR) حسب المتجر المعلن'
                : 'Click-Through Rate (CTR) by Sponsoring Store'}
            </h3>
            <span className="text-[11px] text-slate-500">
              {lang === 'ar'
                ? 'مُحدّث تلقائياً من نقرات إعلانات فتح التطبيق'
                : 'Live analytics synced from app-open ad clicks'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {storeCtrSummary.map((st) => (
              <div
                key={st.storeId}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {tText(st.storeName, lang)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-extrabold font-mono-num shrink-0">
                    {st.ctrPct.toFixed(1)}% CTR
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(4, st.ctrPct * 3))}%` }}
                    className="h-full rounded-full bg-emerald-600 transition-all"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono-num">
                  <span>
                    {st.impressions.toLocaleString()} {lang === 'ar' ? 'ظهور' : 'views'}
                  </span>
                  <span>
                    {st.clicks.toLocaleString()} {lang === 'ar' ? 'نقرة' : 'clicks'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'ابحث باسم المتجر أو الحملة أو رقم الحوالة...'
                : 'Search by store, campaign, or payment ref...'
            }
            className="w-full h-9 ps-9 pe-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', ar: 'الكل', en: 'All' },
              { id: 'active', ar: 'نشط', en: 'Active' },
              { id: 'scheduled', ar: 'مجدول', en: 'Scheduled' },
              { id: 'paused', ar: 'متوقف', en: 'Paused' },
              { id: 'ended', ar: 'منتهي', en: 'Ended' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === f.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'ar' ? f.ar : f.en}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3">
        {filteredAds.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Megaphone className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'لا توجد حملات إعلانية مطابقة' : 'No matching ad campaigns'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {lang === 'ar'
                ? 'ارفع صورة الإعلان المقدّمة من المتجر واربطها بالمنتج الأصلي لتظهر عند فتح تطبيق العملاء.'
                : 'Upload a store-submitted ad photo and link it to its product listing to run when the customer app opens.'}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'إنشاء أول حملة' : 'Create Campaign'}
            </button>
          </div>
        ) : (
          filteredAds.map((ad) => {
            const st = statusBadge(ad.status);
            const pay = paymentBadge(ad.paymentStatus);
            const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
            const linkedListing = ad.listingId
              ? listings.find((l) => l.id === ad.listingId)
              : undefined;

            return (
              <div
                key={ad.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row gap-4 hover:border-slate-300 transition-colors"
              >
                {/* Store-Submitted Ad Photo Preview */}
                <button
                  type="button"
                  onClick={() => setPreviewAd(ad)}
                  title={lang === 'ar' ? 'اضغط لمعاينة الإعلان' : 'Click to preview ad'}
                  className="w-full lg:w-44 shrink-0 text-start group"
                >
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <SafeImage
                      src={ad.imageUrl}
                      alt={tText(ad.title, lang)}
                      aspectClass="aspect-[4/3]"
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 start-2 px-2 py-0.5 rounded-md bg-slate-950/75 text-white text-[10px] font-mono-num font-bold">
                      P{ad.priority}
                    </span>
                  </div>
                </button>

                {/* Campaign Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${st.cls}`}
                      >
                        {st.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${pay.cls}`}
                      >
                        <Banknote className="w-3 h-3" />
                        <span className="font-mono-num">{formatSdg(ad.paidAmountSdg, lang)}</span>
                        <span>· {pay.label}</span>
                      </span>
                      {ad.paymentRef && (
                        <span className="text-[11px] text-slate-500 font-mono-num" dir="ltr">
                          #{ad.paymentRef}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {tText(ad.title, lang)}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 pt-0.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <StoreIcon className="w-3.5 h-3.5 text-blue-600" />
                        {tText(ad.storeName, lang)}
                      </span>
                      {linkedListing && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          {formatListingTitle(linkedListing.arabicBrandPrefix, linkedListing.model, lang)} ·{' '}
                          <span className="font-mono-num">{formatSdg(linkedListing.priceSdg, lang)}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {ad.targetCity === 'all'
                          ? lang === 'ar'
                            ? 'كل السودان'
                            : 'All Sudan'
                          : formatCity(ad.targetCity, lang)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono-num" dir="ltr">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {ad.startsAt} → {ad.endsAt}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono-num">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {lang === 'ar'
                          ? `إغلاق بعد ${ad.skipDelaySec} ث`
                          : `${ad.skipDelaySec}s delay`}
                      </span>
                    </div>
                  </div>

                  {/* Performance + Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-500">{lang === 'ar' ? 'الظهور: ' : 'Views: '}</span>
                        <span className="font-bold font-mono-num text-slate-900">
                          {ad.impressions.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">{lang === 'ar' ? 'النقرات: ' : 'Clicks: '}</span>
                        <span className="font-bold font-mono-num text-slate-900">
                          {ad.clicks.toLocaleString()}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-slate-500">CTR:</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-extrabold font-mono-num text-emerald-800">
                          {ctr}%
                        </span>
                      </div>
                      {ad.avgTimeToClickMs != null && ad.avgTimeToClickMs > 0 && (
                        <div className="text-[11px] text-slate-500 font-mono-num">
                          {lang === 'ar' ? 'متوسط النقر: ' : 'Avg tap: '}
                          <span className="font-semibold text-slate-700">
                            {(ad.avgTimeToClickMs / 1000).toFixed(1)}s
                          </span>
                        </div>
                      )}
                      {ad.lastClickedAt && (
                        <div className="text-[11px] text-slate-500">
                          {lang === 'ar' ? 'آخر نقرة: ' : 'Last click: '}
                          <span className="font-mono-num text-slate-700" dir="ltr">
                            {new Date(ad.lastClickedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewAd(ad)}
                        className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'معاينة' : 'Preview'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleSponsoredAdStatus(ad.id, ad.status === 'active' ? 'paused' : 'active')
                        }
                        className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border ${
                          ad.status === 'active'
                            ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {ad.status === 'active' ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'إيقاف مؤقت' : 'Pause'}
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'تفعيل' : 'Activate'}
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(ad)}
                        className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'تعديل' : 'Edit'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(ad)}
                        aria-label={lang === 'ar' ? 'حذف الحملة' : 'Delete campaign'}
                        className="h-8 w-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Campaign Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-[75] bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {form.id
                    ? lang === 'ar'
                      ? 'تعديل إعلان المتجر عند فتح التطبيق'
                      : 'Edit App-Open Ad Photo'
                    : lang === 'ar'
                      ? 'إضافة صورة إعلان مموّل من المتجر'
                      : 'Add Store-Submitted App-Open Ad'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'ar'
                    ? 'ستظهر صورة الإعلان فقط فوق خلفية ضبابية عند فتح التطبيق، والضغط عليها ينقل العميل مباشرة لصفحة المنتج.'
                    : 'Only the store-submitted ad photo displays over a blurred background on app open; tapping it opens the product listing.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-5 overflow-y-auto thin-scroll flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              {/* 1. Store-Submitted Ad Photo (Primary Creative) */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    {lang === 'ar' ? 'صورة الإعلان المقدّمة من المتجر *' : 'Store-Submitted Ad Photo *'}
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {lang === 'ar' ? 'رفع صورة من الجهاز' : 'Upload Store Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {form.imageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 max-h-48 flex items-center justify-center">
                    <img
                      src={form.imageUrl}
                      alt="Ad preview"
                      className="w-full max-h-48 object-contain"
                    />
                  </div>
                )}

                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AD_IMAGES.map((img) => {
                    const selected = form.imageUrl === img.url;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: img.url })}
                        className={`rounded-xl overflow-hidden border-2 transition-all text-start ${
                          selected
                            ? 'border-blue-600 ring-2 ring-blue-100'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <SafeImage src={img.url} alt={img.labelEn} aspectClass="aspect-[4/3]" />
                        <span className="block px-1.5 py-1 text-[10px] font-semibold text-slate-700 truncate bg-white">
                          {lang === 'ar' ? img.labelAr : img.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  dir="ltr"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://... or /src/assets/images/..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono-num"
                />
              </div>

              {/* 2. Sponsoring Store & Target Original Product Listing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'المتجر المعلن *' : 'Sponsoring Store *'}
                  </label>
                  <select
                    required
                    value={form.storeId}
                    onChange={(e) => {
                      const nextStoreId = e.target.value;
                      const firstListing = listings.find(
                        (l) => l.storeId === nextStoreId && l.publicationStatus === 'published'
                      );
                      setForm((prev) => ({
                        ...prev,
                        storeId: nextStoreId,
                        listingId: firstListing?.id || '',
                      }));
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    {selectableStores.map((st) => (
                      <option key={st.id} value={st.id}>
                        {tText(st.name, lang)} ({formatCity(st.city, lang)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'المنتج الأصلي المرتبط (عند النقر) *' : 'Original Product Listing (on tap) *'}
                  </label>
                  <select
                    required
                    value={form.listingId}
                    onChange={(e) => setForm({ ...form, listingId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value="">
                      {lang === 'ar' ? 'اختر إعلان المنتج...' : 'Select product listing...'}
                    </option>
                    {storeListingsForForm.map((l) => (
                      <option key={l.id} value={l.id}>
                        {formatListingTitle(l.arabicBrandPrefix, l.model, lang)} ({l.storageGb}GB — {formatSdg(l.priceSdg, lang)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin-only Internal Campaign Label */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar'
                    ? 'اسم الحملة في لوحة الإدارة (اختياري — لا يظهر فوق الصورة)'
                    : 'Internal Campaign Label (optional — not shown on the ad photo)'}
                </label>
                <input
                  type="text"
                  value={form.campaignLabel}
                  onChange={(e) => setForm({ ...form, campaignLabel: e.target.value })}
                  placeholder={
                    lang === 'ar'
                      ? 'مثال: حملة آيفون 15 برو — متجر النيل'
                      : 'e.g. iPhone 15 Pro Launch Poster — Nile Mobile Hub'
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>

              {/* 3. Targeting, Schedule & Display Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الولاية المستهدفة' : 'Target State / City'}
                  </label>
                  <select
                    value={form.targetCity}
                    onChange={(e) => setForm({ ...form, targetCity: e.target.value as CityId | 'all' })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <option value="all">{lang === 'ar' ? 'كل ولايات السودان' : 'All Sudan'}</option>
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {tText(c.name, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'حالة الحملة' : 'Campaign Status'}
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as SponsoredAdStatus })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <option value="active">{lang === 'ar' ? 'نشط (يعمل عند الفتح)' : 'Active (Live)'}</option>
                    <option value="scheduled">{lang === 'ar' ? 'مجدول' : 'Scheduled'}</option>
                    <option value="paused">{lang === 'ar' ? 'متوقف مؤقتاً' : 'Paused'}</option>
                    <option value="ended">{lang === 'ar' ? 'منتهي' : 'Ended'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'مدة الانتظار قبل الإغلاق' : 'Close Delay'}
                  </label>
                  <select
                    value={form.skipDelaySec}
                    onChange={(e) => setForm({ ...form, skipDelaySec: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono-num"
                  >
                    <option value={0}>{lang === 'ar' ? 'فوري (0 ث)' : 'Instant (0s)'}</option>
                    <option value={2}>{lang === 'ar' ? '2 ثانية' : '2 seconds'}</option>
                    <option value={3}>{lang === 'ar' ? '3 ثوانٍ (موصى به)' : '3 seconds (Recommended)'}</option>
                    <option value={5}>{lang === 'ar' ? '5 ثوانٍ' : '5 seconds'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'أولوية الظهور (1-100)' : 'Display Priority (1-100)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    dir="ltr"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono-num"
                  />
                </div>
              </div>

              {/* 4. Store Payment & Billing */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-3">
                <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-blue-700" />
                  {lang === 'ar' ? 'رسوم الإعلان المدفوعة من المتجر' : 'Store Sponsorship Billing'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'المبلغ (ج.س)' : 'Fee Amount (SDG)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      dir="ltr"
                      value={form.paidAmountSdg}
                      onChange={(e) => setForm({ ...form, paidAmountSdg: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'حالة الدفع' : 'Payment Status'}
                    </label>
                    <select
                      value={form.paymentStatus}
                      onChange={(e) =>
                        setForm({ ...form, paymentStatus: e.target.value as SponsoredAdPaymentStatus })
                      }
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="paid">{lang === 'ar' ? 'مدفوع ومؤكد' : 'Paid & Confirmed'}</option>
                      <option value="invoiced">{lang === 'ar' ? 'تم إصدار الفاتورة' : 'Invoiced'}</option>
                      <option value="pending">{lang === 'ar' ? 'بانتظار السداد' : 'Pending Payment'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'مرجع التحويل / بنكك' : 'Payment Ref / Receipt'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={form.paymentRef}
                      onChange={(e) => setForm({ ...form, paymentRef: e.target.value })}
                      placeholder="BNK-2026-..."
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono-num"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {saving
                    ? lang === 'ar'
                      ? 'جاري الحفظ...'
                      : 'Saving...'
                    : form.id
                      ? lang === 'ar'
                        ? 'حفظ التعديلات'
                        : 'Save Changes'
                      : lang === 'ar'
                        ? 'نشر الإعلان'
                        : 'Publish Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live App-Open Preview Modal */}
      <AppOpenAdOverlay
        ad={previewAd}
        previewMode
        onDismiss={() => setPreviewAd(null)}
        onAction={(ad) => {
          setPreviewAd(null);
          pushToast('info', {
            ar: `في تطبيق العملاء سينقلك الضغط على الصورة مباشرة إلى ${ad.listingId ? 'صفحة المنتج الأصلي' : `متجر ${ad.storeName.ar}`}.`,
            en: `In the customer app, tapping this photo navigates straight to ${ad.listingId ? 'the original product listing' : ad.storeName.en}.`,
          });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={lang === 'ar' ? 'حذف الحملة الإعلانية' : 'Delete Sponsored Ad Campaign'}
        description={
          deleteTarget
            ? lang === 'ar'
              ? `هل أنت متأكد من حذف إعلان "${tText(deleteTarget.title, lang)}" الخاص بمتجر ${tText(deleteTarget.storeName, lang)}؟ سيتوقف ظهوره في التطبيق فوراً.`
              : `Delete "${tText(deleteTarget.title, lang)}" for ${tText(deleteTarget.storeName, lang)}? It will immediately stop running on app open.`
            : ''
        }
        confirmLabel={lang === 'ar' ? 'تأكيد الحذف' : 'Delete Campaign'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deleteSponsoredAd(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
