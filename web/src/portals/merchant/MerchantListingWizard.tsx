import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import {
  BrandId,
  CatalogModel,
  DeviceCondition,
  ListingPhoto,
  UsedGrade,
} from '../../types';
import {
  BRANDS,
  formatCondition,
  formatListingTitle,
  formatSdg,
  formatUsedGrade,
  tText,
} from '../../i18n/translations';
import { CATALOG_MODELS, IMAGES } from '../../data/mockData';
import { usePrototype } from '../../store/PrototypeContext';
import { ConfirmDialog, SafeImage } from '../../components/DesignSystem';

/**
 * M-06 (Device & Type Selector) + M-07 (New Phone Listing) + M-08 (Used Physical Unit Listing)
 */
export function MerchantListingWizard({
  onComplete,
  onGoToVerification,
}: {
  onComplete: () => void;
  onGoToVerification: () => void;
}) {
  const { lang, activeMerchantStore, createOrPublishListing } = usePrototype();

  // Lock listing creation when store is not verified (M-04 requirement)
  if (activeMerchantStore.verificationStatus !== 'verified') {
    return (
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">
          {lang === 'ar'
            ? 'إنشاء الإعلانات مقفل حتى يتم توثيق المتجر'
            : 'Listing Creation Locked Until Verified'}
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          {lang === 'ar'
            ? 'فقط المتاجر الفعلية الموثّقة يمكنها نشر هواتف جديدة أو مستعملة على سودان فونز. راجع حالة توثيق متجرك لمعرفة الخطوة التالية.'
            : 'Only verified physical stores can publish phone listings on Sudan Phones. Open your verification tracker to complete the next step.'}
        </p>
        <button
          type="button"
          onClick={onGoToVerification}
          className="h-10 px-5 rounded-xl bg-[#0F6B5D] text-white text-xs font-semibold hover:bg-[#0B5348]"
        >
          {lang === 'ar' ? 'فتح متابعة التوثيق (M-04)' : 'Open Verification Status (M-04)'}
        </button>
      </div>
    );
  }

  return <VerifiedListingWizardInner onComplete={onComplete} />;
}

function VerifiedListingWizardInner({ onComplete }: { onComplete: () => void }) {
  const { lang, activeMerchantStore, createOrPublishListing, sim, pushToast } = usePrototype();
  const isOffline = sim.offlineMode === 'offline_cached' || sim.offlineMode === 'offline_empty';
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'uncertain'>('idle');
  const [pendingSubmitMode, setPendingSubmitMode] = useState<'draft' | 'publish'>('publish');

  const [step, setStep] = useState<1 | 2>(1);
  const [condition, setCondition] = useState<DeviceCondition>('new');
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<BrandId>('samsung');
  const [selectedModel, setSelectedModel] = useState<CatalogModel>(CATALOG_MODELS[0]);
  const [storageGb, setStorageGb] = useState<number>(256);
  const [ramGb, setRamGb] = useState<number>(12);
  const [colorIdx, setColorIdx] = useState<number>(0);

  // M-07 New phone fields
  const [priceSdg, setPriceSdg] = useState('2420000');
  const [stockQty, setStockQty] = useState('3');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [warrantyTypeAr, setWarrantyTypeAr] = useState('ضمان المتجر ضد عيوب المصنع');
  const [sealedBox, setSealedBox] = useState(true);

  // M-08 Used physical unit fields (NO stock quantity!)
  const [usedGrade, setUsedGrade] = useState<UsedGrade>('excellent');
  const [batteryVerified, setBatteryVerified] = useState(true);
  const [batteryPct, setBatteryPct] = useState('88');
  const [defectsAr, setDefectsAr] = useState('خدش سطحي طفيف قرب منفذ الشحن، الشاشة أصلية بدون ملاحظات.');
  const [replacedPartsAr, setReplacedPartsAr] = useState('لا توجد قطع مستبدلة');
  const [originalBox, setOriginalBox] = useState(true);
  const [inspectionDays, setInspectionDays] = useState('10');

  // Photos state with progress / failed upload simulation
  const [photos, setPhotos] = useState<
    (ListingPhoto & { uploadState?: 'done' | 'uploading' | 'failed' })[]
  >([
    {
      id: 'init-1',
      url: IMAGES.s24Ultra,
      caption: { ar: 'صورة الهاتف (الأمام)', en: 'Front view' },
      kind: 'front',
      uploadState: 'done',
    },
  ]);

  const [validationError, setValidationError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);

  const filteredModels = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    return CATALOG_MODELS.filter((m) => {
      if (!q && m.brand !== selectedBrand) return false;
      if (!q) return true;
      return (
        m.model.toLowerCase().includes(q) ||
        m.arabicBrandPrefix.includes(q) ||
        m.brand.includes(q)
      );
    });
  }, [brandSearch, selectedBrand]);

  const handleSelectModel = (m: CatalogModel) => {
    setSelectedModel(m);
    setSelectedBrand(m.brand);
    setStorageGb(m.storages[0]);
    setRamGb(m.ramOptions[0]);
    setColorIdx(0);
    setPhotos([
      {
        id: `m-img-${Date.now()}`,
        url: condition === 'used' ? IMAGES.usedInspection : m.defaultImage,
        caption: {
          ar: condition === 'used' ? 'صورة الجهة الأمامية للجهاز' : 'صورة الجهاز الأساسية',
          en: condition === 'used' ? 'Front physical unit photo' : 'Primary device photo',
        },
        kind: 'front',
        uploadState: 'done',
      },
    ]);
  };

  const addSimulatedPhoto = (
    kind: ListingPhoto['kind'],
    caption: { ar: string; en: string }
  ) => {
    const id = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const url =
      kind === 'seal'
        ? IMAGES.storefront
        : kind === 'screen_on'
          ? IMAGES.usedInspection
          : selectedModel.defaultImage;

    const shouldFail = isOffline || sim.submissionOutcome === 'failure';
    setPhotos((prev) => [...prev, { id, url, caption, kind, uploadState: 'uploading' }]);
    window.setTimeout(() => {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, uploadState: shouldFail ? 'failed' : 'done' } : p))
      );
    }, sim.offlineMode === 'slow' ? 1050 : 500);
  };

  const retryPhoto = (id: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, uploadState: 'uploading' } : p)));
    window.setTimeout(() => {
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, uploadState: isOffline ? 'failed' : 'done' } : p)));
    }, 450);
  };

  const movePhoto = (idx: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const donePhotos = photos.filter((p) => p.uploadState !== 'failed' && p.uploadState !== 'uploading');

  const validateAndSubmit = (mode: 'draft' | 'publish', bypassUncertain = false) => {
    if (isOffline) {
      setValidationError(
        lang === 'ar'
          ? 'انقطع الاتصال بالشبكة أثناء تجهيز الإعلان. تم حفظ جميع البيانات في النموذج — أعد المحاولة فور عودة الاتصال.'
          : 'Connection lost while submitting. All entered details remain intact — retry once back online.'
      );
      pushToast('error', {
        ar: 'لا يمكن إرسال الإعلان بدون اتصال بالإنترنت. لم تُفقد بياناتك.',
        en: 'Cannot submit while offline. Your form inputs are preserved.',
      });
      return;
    }

    const numPrice = Number(priceSdg);
    if (!numPrice || numPrice < 50000) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى إدخال سعر صحيح بالجنيه السوداني (مثلاً 850000).'
          : 'Please enter a valid price in SDG (e.g., 850000).'
      );
      return;
    }

    if (mode === 'publish' && condition === 'new') {
      if (Number(stockQty) < 1) {
        setValidationError(
          lang === 'ar' ? 'أدخل كمية المخزون المتوفرة (1 أو أكثر).' : 'Enter available stock quantity (1 or more).'
        );
        return;
      }
      if (!donePhotos.some((p) => p.kind === 'seal') && donePhotos.length < 2) {
        setValidationError(
          lang === 'ar'
            ? 'يرجى إضافة صورة ختم المتجر أو صورتين على الأقل قبل النشر.'
            : 'Please add a store seal photo (at least 2 photos) before publishing.'
        );
        return;
      }
    }

    if (mode === 'publish' && condition === 'used') {
      const hasFront = donePhotos.some((p) => p.kind === 'front');
      const hasBack = donePhotos.some((p) => p.kind === 'back');
      const hasScreen = donePhotos.some((p) => p.kind === 'screen_on');
      if (donePhotos.length < 3 || !hasFront || !hasBack || !hasScreen) {
        setValidationError(
          lang === 'ar'
            ? 'الهواتف المستعملة تتطلب 3 صور فعلية على الأقل: الأمام، الخلف، والشاشة وهي تعمل.'
            : 'Used phones require at least 3 real-unit photos: Front, Back, and Powered-on Screen.'
        );
        return;
      }
      if (!defectsAr.trim()) {
        setValidationError(
          lang === 'ar'
            ? 'يرجى كتابة وصف واضح للحالة والخدوش أو التأكيد على خلو الجهاز من العيوب.'
            : 'Please enter an explicit defects/scratches disclosure.'
        );
        return;
      }
    }

    setValidationError('');
    setPendingSubmitMode(mode);

    if (!bypassUncertain && sim.submissionOutcome === 'uncertain') {
      setSubmitState('submitting');
      window.setTimeout(() => {
        setSubmitState('uncertain');
      }, 450);
      return;
    }

    const colorObj = selectedModel.colors[colorIdx] ?? selectedModel.colors[0];
    const slugModel = selectedModel.model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const variantKey = `${selectedModel.brand}-${slugModel}-${storageGb}`;

    createOrPublishListing(
      {
        storeId: activeMerchantStore.id,
        brand: selectedModel.brand,
        model: selectedModel.model,
        arabicBrandPrefix: selectedModel.arabicBrandPrefix,
        variantKey,
        storageGb,
        ramGb,
        color: colorObj,
        condition,
        priceSdg: numPrice,
        stockQty: condition === 'new' ? Number(stockQty) : undefined,
        sealedBox: condition === 'new' ? sealedBox : undefined,
        warrantyType:
          condition === 'new'
            ? { ar: warrantyTypeAr, en: warrantyTypeAr }
            : undefined,
        warrantyMonths: condition === 'new' ? Number(warrantyMonths) : undefined,
        usedUnitCode: condition === 'used' ? `U-${String(Date.now()).slice(-4)}` : undefined,
        usedGrade: condition === 'used' ? usedGrade : undefined,
        usedAvailability: condition === 'used' ? 'available' : undefined,
        batteryHealthPct:
          condition === 'used'
            ? batteryVerified
              ? Math.min(100, Math.max(50, Number(batteryPct) || 85))
              : null
            : null,
        defectsDescription:
          condition === 'used' ? { ar: defectsAr, en: defectsAr } : undefined,
        replacedParts:
          condition === 'used' ? { ar: replacedPartsAr, en: replacedPartsAr } : undefined,
        originalBox: condition === 'used' ? originalBox : undefined,
        inspectionWarrantyDays: condition === 'used' ? Number(inspectionDays) : undefined,
        photos: donePhotos.map(({ uploadState: _u, ...rest }) => rest),
        publicationStatus: 'draft',
      },
      mode
    );
    setSubmitState('idle');
    onComplete();
  };

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const selectedColor = selectedModel.colors[colorIdx] ?? selectedModel.colors[0];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Step Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                step === 1 ? 'bg-[#0F6B5D] text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              1
            </span>
            <span className="text-xs font-bold text-slate-900">
              {lang === 'ar' ? 'M-06: اختيار النوع والجهاز' : 'M-06: Listing Type & Device'}
            </span>
          </div>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                step === 2 ? 'bg-[#0F6B5D] text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={`text-xs font-bold ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}>
              {condition === 'new'
                ? lang === 'ar'
                  ? 'M-07: تفاصيل الهاتف الجديد'
                  : 'M-07: New Phone Listing'
                : lang === 'ar'
                  ? 'M-08: تفاصيل القطعة المستعملة'
                  : 'M-08: Used Unit Listing'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setUnsavedDialogOpen(true)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
      </div>

      {/* STEP 1: M-06 Select Listing Type & Device */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            {/* New vs Used */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-2">
                {lang === 'ar' ? '1. اختر حالة الهاتف' : '1. Choose Condition Type'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCondition('new')}
                  className={`p-4 rounded-xl border text-start transition-colors ${
                    condition === 'new'
                      ? 'border-[#0F6B5D] bg-teal-50/70'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">
                    {lang === 'ar' ? 'هاتف جديد (بالمخزون)' : 'New Phone (Stock Qty)'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {lang === 'ar'
                      ? 'إدخال كمية المخزون والضمان بالأشهر وحالة الختم.'
                      : 'Specify stock quantity, warranty months, and factory seal.'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('used')}
                  className={`p-4 rounded-xl border text-start transition-colors ${
                    condition === 'used'
                      ? 'border-[#0F6B5D] bg-teal-50/70'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">
                    {lang === 'ar' ? 'هاتف مستعمل (قطعة فردية)' : 'Used Phone (Single Unit)'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {lang === 'ar'
                      ? 'كل هاتف مستعمل يُعرض كقطعة فردية بصور حقيقية وإفصاح واضح.'
                      : 'Listed as one physical unit with 3+ real photos and full disclosure.'}
                  </p>
                </button>
              </div>
            </div>

            {/* Searchable Brand & Model */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-900">
                {lang === 'ar' ? '2. اختر الماركة والموديل' : '2. Select Brand & Model'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث سريعاً: iPhone 15، Galaxy S24، Redmi...' : 'Quick search: iPhone 15, Galaxy S24...'}
                  className="w-full h-10 ps-9 pe-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BRANDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBrandSearch('');
                      setSelectedBrand(b.id);
                      const first = CATALOG_MODELS.find((m) => m.brand === b.id);
                      if (first) handleSelectModel(first);
                    }}
                    className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                      selectedBrand === b.id && !brandSearch
                        ? 'border-[#0F6B5D] bg-[#0F6B5D] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {lang === 'ar' ? b.arLabel : b.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredModels.map((m) => {
                  const active = selectedModel.model === m.model;
                  return (
                    <button
                      key={m.model}
                      type="button"
                      onClick={() => handleSelectModel(m)}
                      className={`p-3 rounded-xl border text-start flex items-center gap-3 transition-colors ${
                        active ? 'border-[#0F6B5D] bg-teal-50/70' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <SafeImage src={m.defaultImage} alt={m.model} aspectClass="w-11 h-11 rounded-lg shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {formatListingTitle(m.arabicBrandPrefix, m.model, lang)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono-num">
                          {m.storages.join(' / ')} GB
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Variant Specs: Storage, RAM, Color */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'السعة التخزينية' : 'Storage'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedModel.storages.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStorageGb(s)}
                      className={`h-9 px-3 rounded-lg border text-xs font-mono-num font-semibold ${
                        storageGb === s
                          ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {s} GB
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'الذاكرة العشوائية (RAM)' : 'RAM'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedModel.ramOptions.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRamGb(r)}
                      className={`h-9 px-3 rounded-lg border text-xs font-mono-num font-semibold ${
                        ramGb === r
                          ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {r} GB
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'اللون' : 'Color'}
                </label>
                <select
                  value={colorIdx}
                  onChange={(e) => setColorIdx(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  {selectedModel.colors.map((c, idx) => (
                    <option key={c.en} value={idx}>
                      {tText(c, lang)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Selected Device Summary Sidebar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 sticky top-20">
            <p className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'ملخص الجهاز المختار' : 'Selected Device Summary'}
            </p>
            <SafeImage
              src={selectedModel.defaultImage}
              alt={selectedModel.model}
              aspectClass="aspect-[4/3]"
              className="rounded-xl"
            />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-900 text-sm">
                {formatListingTitle(selectedModel.arabicBrandPrefix, selectedModel.model, lang)}
              </p>
              <p className="text-slate-600">
                {formatCondition(condition, lang)} · <span dir="ltr" className="font-mono-num">{storageGb} GB / {ramGb} GB RAM</span>
              </p>
              <p className="text-slate-500">{tText(selectedColor, lang)}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-11 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold"
            >
              {lang === 'ar' ? 'متابعة لإدخال التفاصيل والصور' : 'Continue to Details & Photos'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: M-07 (New) or M-08 (Used) Details & Photos */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          {/* Selected Device Recap Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <SafeImage src={selectedModel.defaultImage} alt={selectedModel.model} aspectClass="w-12 h-10 rounded-lg shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {formatListingTitle(selectedModel.arabicBrandPrefix, selectedModel.model, lang)}
                </p>
                <p className="text-xs text-slate-600">
                  {formatCondition(condition, lang)} · <span dir="ltr" className="font-mono-num">{storageGb} GB · {ramGb} GB RAM</span> · {tText(selectedColor, lang)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-[#0F6B5D] hover:underline flex items-center gap-1"
            >
              <BackArrow className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'تغيير الجهاز' : 'Change Device'}
            </button>
          </div>

          {validationError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* M-07 NEW PHONE FORM */}
          {condition === 'new' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'السعر بالجنيه السوداني (ج.س) *' : 'Price in SDG *'}
                </label>
                <input
                  type="number"
                  value={priceSdg}
                  onChange={(e) => setPriceSdg(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'الكمية المتوفرة في المخزون *' : 'Stock Quantity *'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'نوع الضمان' : 'Warranty Type'}
                </label>
                <input
                  type="text"
                  value={warrantyTypeAr}
                  onChange={(e) => setWarrantyTypeAr(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'مدة الضمان (بالأشهر)' : 'Warranty Duration (Months)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sealedBox}
                    onChange={(e) => setSealedBox(e.target.checked)}
                    className="w-4 h-4 accent-[#0F6B5D]"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    {lang === 'ar'
                      ? 'الكرتونة مختومة بختم المصنع الأصلي (لم تُفتح)'
                      : 'Factory sealed box (unopened)'}
                  </span>
                </label>
              </div>
            </div>
          ) : (
            /* M-08 USED PHYSICAL UNIT FORM */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950">
                {lang === 'ar'
                  ? 'كل هاتف مستعمل يُنشر كقطعة فعلية واحدة (بدون كمية مخزون) لضمان تطابق الصور وحالة البطارية مع الجهاز الفعلي.'
                  : 'Each used phone is listed as one individual physical unit (no stock count) so photos and battery health match the exact device.'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'السعر بالجنيه السوداني (ج.س) *' : 'Unit Price in SDG *'}
                  </label>
                  <input
                    type="number"
                    value={priceSdg}
                    onChange={(e) => setPriceSdg(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'درجة النظافة *' : 'Condition Grade *'}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['like_new', 'excellent', 'good', 'fair'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setUsedGrade(g)}
                        className={`h-10 rounded-lg border text-xs font-semibold ${
                          usedGrade === g
                            ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {formatUsedGrade(g, lang)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Battery Health or Explicitly Not Verified */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      {lang === 'ar' ? 'صحة البطارية (%)' : 'Battery Health (%)'}
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!batteryVerified}
                        onChange={(e) => setBatteryVerified(!e.target.checked)}
                        className="accent-[#0F6B5D]"
                      />
                      {lang === 'ar' ? 'غير موثق' : 'Not verified'}
                    </label>
                  </div>
                  {batteryVerified ? (
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={batteryPct}
                      onChange={(e) => setBatteryPct(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-num"
                    />
                  ) : (
                    <p className="text-[11px] text-slate-600">
                      {lang === 'ar'
                        ? 'سيظهر للعملاء كـ "غير موثق" بوضوح دون افتراض نسبة.'
                        : 'Will display clearly as "Not verified" — never guessed.'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'ضمان الفحص والاسترجاع (بالأيام)' : 'Store Inspection Warranty (Days)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={inspectionDays}
                    onChange={(e) => setInspectionDays(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                  />
                  <label className="flex items-center gap-2 mt-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={originalBox}
                      onChange={(e) => setOriginalBox(e.target.checked)}
                      className="accent-[#0F6B5D]"
                    />
                    {lang === 'ar' ? 'الكرتونة الأصلية متوفرة مع الجهاز' : 'Original retail box included'}
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الإفصاح الصريح عن العيوب والخدوش *' : 'Explicit Defects & Scratches Disclosure *'}
                  </label>
                  <textarea
                    rows={2}
                    value={defectsAr}
                    onChange={(e) => setDefectsAr(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'القطع المستبدلة (شاشة / بطارية / إلخ)' : 'Replaced Parts Disclosure'}
                  </label>
                  <input
                    type="text"
                    value={replacedPartsAr}
                    onChange={(e) => setReplacedPartsAr(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Photo Uploader (M-07 Seal photo / M-08 Required 3+ Real-Unit Photos) */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {condition === 'new'
                    ? lang === 'ar'
                      ? 'صور الجهاز وصورة ختم المتجر'
                      : 'Product Photos & Store Seal Photo'
                    : lang === 'ar'
                      ? 'الصور الفعلية للقطعة (مطلوب 3 على الأقل: أمام، خلف، شاشة تعمل)'
                      : 'Real Physical Unit Photos (Min 3: Front, Back, Screen On)'}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {condition === 'new' ? (
                  <button
                    type="button"
                    onClick={() =>
                      addSimulatedPhoto('seal', { ar: 'صورة ختم المتجر والكرتونة', en: 'Store seal & box photo' })
                    }
                    className="h-8 px-3 rounded-lg bg-teal-50 border border-teal-200 text-[#0F6B5D] text-xs font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {lang === 'ar' ? '+ صورة ختم المتجر' : '+ Store Seal Photo'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => addSimulatedPhoto('back', { ar: 'الجهة الخلفية والعدسات', en: 'Back panel & lenses' })}
                      className="h-8 px-2.5 rounded-lg bg-teal-50 border border-teal-200 text-[#0F6B5D] text-xs font-semibold"
                    >
                      {lang === 'ar' ? '+ صورة الخلف' : '+ Back Photo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => addSimulatedPhoto('screen_on', { ar: 'الشاشة وهي تعمل', en: 'Powered-on screen' })}
                      className="h-8 px-2.5 rounded-lg bg-teal-50 border border-teal-200 text-[#0F6B5D] text-xs font-semibold"
                    >
                      {lang === 'ar' ? '+ الشاشة تعمل' : '+ Screen-On Photo'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {photos.map((p, idx) => (
                <div key={p.id} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 space-y-2">
                  {p.uploadState === 'uploading' ? (
                    <div className="aspect-[4/3] rounded-lg bg-slate-200 flex flex-col items-center justify-center gap-2 text-xs text-slate-600">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#0F6B5D]" />
                      <span>{lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span>
                    </div>
                  ) : p.uploadState === 'failed' ? (
                    <div className="aspect-[4/3] rounded-lg bg-red-50 border border-red-200 flex flex-col items-center justify-center gap-2 p-2 text-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-[11px] font-semibold text-red-800">
                        {lang === 'ar' ? 'فشل رفع الصورة' : 'Photo upload failed'}
                      </span>
                      <button
                        type="button"
                        onClick={() => retryPhoto(p.id)}
                        className="h-7 px-2.5 rounded-md bg-red-700 text-white text-[11px] font-semibold"
                      >
                        {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                      </button>
                    </div>
                  ) : (
                    <SafeImage src={p.url} alt={tText(p.caption, lang)} aspectClass="aspect-[4/3]" className="rounded-lg" />
                  )}

                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="font-medium text-slate-700 truncate">{tText(p.caption, lang)}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePhoto(idx, -1)}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === photos.length - 1}
                        onClick={() => movePhoto(idx, 1)}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((item) => item.id !== p.id))}
                        className="p-1 rounded text-slate-500 hover:text-red-700"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Step 8B: Universal Listing Completion Checklist (New & Used) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <p className="font-bold text-slate-900">
                {lang === 'ar' ? 'قائمة اكتمال الإعلان قبل النشر التلقائي' : 'Listing Completion Checklist'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {(condition === 'new'
                  ? [
                      { ok: Number(priceSdg) >= 50000, ar: 'سعر واضح بـ ج.س', en: 'Valid SDG price' },
                      { ok: Number(stockQty) >= 1, ar: 'كمية المخزون محددة', en: 'Stock quantity set' },
                      { ok: Boolean(warrantyTypeAr.trim()), ar: 'بيانات الضمان والختم', en: 'Warranty & seal info' },
                      {
                        ok: donePhotos.some((p) => p.kind === 'seal') || donePhotos.length >= 2,
                        ar: 'صورة الختم أو صورتان',
                        en: 'Store seal / 2+ photos',
                      },
                    ]
                  : [
                      { ok: Number(priceSdg) >= 50000, ar: 'سعر القطعة بـ ج.س', en: 'Valid SDG price' },
                      { ok: Boolean(defectsAr.trim()), ar: 'إفصاح الحالة والعيوب', en: 'Defects disclosed' },
                      {
                        ok: donePhotos.some((p) => p.kind === 'front') && donePhotos.some((p) => p.kind === 'back'),
                        ar: 'صورتا الأمام والخلف',
                        en: 'Front & back photos',
                      },
                      {
                        ok: donePhotos.some((p) => p.kind === 'screen_on'),
                        ar: 'صورة الشاشة تعمل',
                        en: 'Powered-on screen photo',
                      },
                    ]
                ).map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        c.ok ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </span>
                    <span className={c.ok ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                      {lang === 'ar' ? c.ar : c.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isOffline && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {lang === 'ar'
                  ? 'انقطع الاتصال بالشبكة. جميع تفاصيل الهاتف والصور المضافة محفوظة في الصفحة حتى يعود الاتصال.'
                  : 'You are currently offline. All entered phone details and photos stay preserved until connection returns.'}
              </p>
            </div>
          )}

          {submitState === 'uncertain' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                {lang === 'ar'
                  ? 'حالة النشر غير مؤكدة بسبب انقطاع مؤقت'
                  : 'Publication status uncertain due to slow connection'}
              </p>
              <p className="leading-relaxed">
                {lang === 'ar'
                  ? 'لم نؤكد استلام الإعلان بعد — لا تضغط نشر مجدداً لتفادي التكرار. تحقق من حالة الإعلان أولاً.'
                  : 'Final confirmation has not arrived yet — avoid duplicate clicks and check listing status first.'}
              </p>
              <button
                type="button"
                onClick={() => validateAndSubmit(pendingSubmitMode, true)}
                className="h-8 px-3.5 rounded-lg bg-amber-800 text-white font-semibold"
              >
                {lang === 'ar' ? 'التحقق من الحالة وإكمال النشر' : 'Check Status & Finalize'}
              </button>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              {lang === 'ar' ? 'معاينة كما يراها العميل' : 'Customer Preview'}
            </button>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={submitState !== 'idle'}
                onClick={() => validateAndSubmit('draft')}
                className="h-10 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 disabled:opacity-50"
              >
                {lang === 'ar' ? 'حفظ كمسودة' : 'Save Draft'}
              </button>
              <button
                type="button"
                disabled={submitState !== 'idle'}
                onClick={() => validateAndSubmit('publish')}
                className="h-10 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitState === 'submitting' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {lang === 'ar' ? 'نشر تلقائي الآن' : 'Publish Automatically'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Customer Listing Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">
                {lang === 'ar' ? 'معاينة الإعلان في تطبيق العملاء' : 'Customer App Listing Preview'}
              </span>
              <button type="button" onClick={() => setPreviewOpen(false)} className="p-1 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <SafeImage src={donePhotos[0]?.url} alt={selectedModel.model} aspectClass="aspect-[4/3]" />
            <div className="p-4 space-y-2 text-xs">
              <p className="text-slate-500">
                {formatCondition(condition, lang)} · {storageGb} GB · {tText(selectedColor, lang)}
              </p>
              <p className="text-base font-bold text-slate-900">
                {formatListingTitle(selectedModel.arabicBrandPrefix, selectedModel.model, lang)}
              </p>
              <p className="text-lg font-bold text-[#0F6B5D] font-mono-num">
                {formatSdg(Number(priceSdg) || 0, lang)}
              </p>
              <p className="text-slate-600 pt-2 border-t border-slate-100">
                {tText(activeMerchantStore.name, lang)} · {donePhotos.length}{' '}
                {lang === 'ar' ? 'صور' : 'photos'}
              </p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={unsavedDialogOpen}
        title={lang === 'ar' ? 'مغادرة نموذج الإعلان؟' : 'Discard unsaved listing changes?'}
        description={
          lang === 'ar'
            ? 'سيتم فقدان البيانات التي أدخلتها إذا لم تحفظها كمسودة.'
            : 'Entered details will be discarded unless you save as draft first.'
        }
        confirmLabel={lang === 'ar' ? 'مغادرة بدون حفظ' : 'Discard'}
        cancelLabel={lang === 'ar' ? 'البقاء والمتابعة' : 'Stay'}
        tone="warning"
        onConfirm={onComplete}
        onCancel={() => setUnsavedDialogOpen(false)}
      />
    </div>
  );
}
