import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cpu,
  HardDrive,
  Lock,
  Palette,
  RefreshCw,
  Search,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { DeviceCondition, UsedGrade } from '../../types';
import { formatSdg } from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import {
  api,
  ApiBrand,
  ApiCatalogModel,
  ApiCatalogVariant,
  ApiError,
  newUuid,
  uploadMediaFile,
} from '../../api/client';

type PhotoKind = 'seal' | 'front' | 'back' | 'screen_on' | 'defect' | 'other';

interface UploadedPhoto {
  localId: string;
  assetId?: string;
  previewUrl: string;
  kind: PhotoKind;
  fileName: string;
  state: 'uploading' | 'done' | 'failed';
  error?: string;
  file?: File;
}

interface GroupedVariant {
  key: string;
  storageGb: number;
  ramGb: number;
  representativeVariantId: number;
  colors: string[];
}

const STORAGE_PRESETS = [32, 64, 128, 256, 512, 1024];
const RAM_PRESETS = [2, 3, 4, 6, 8, 12, 16, 24];
const DEFAULT_COLORS = ['Black', 'White', 'Blue', 'Silver', 'Gold', 'Green', 'Titanium', 'Purple'];

export function MerchantListingWizard({
  onComplete,
  onGoToVerification,
}: {
  onComplete: () => void;
  onGoToVerification: () => void;
}) {
  const { lang, activeMerchantStore } = usePrototype();

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
          {lang === 'ar' ? 'فتح متابعة التوثيق' : 'Open Verification Status'}
        </button>
      </div>
    );
  }

  return <VerifiedListingWizardInner onComplete={onComplete} />;
}

function VerifiedListingWizardInner({ onComplete }: { onComplete: () => void }) {
  const { lang, refreshMerchantData, refreshPublicData, pushToast } = usePrototype();

  const [step, setStep] = useState<1 | 2>(1);
  const [condition, setCondition] = useState<DeviceCondition>('new');

  // Live Catalog State (Brands -> Models -> Grouped Variants -> Custom Specs + Free Color)
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<ApiBrand | null>(null);

  const [models, setModels] = useState<ApiCatalogModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<ApiCatalogModel | null>(null);

  const [rawVariants, setRawVariants] = useState<ApiCatalogVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  // Spec values (filled by 1-click variant OR configured manually below)
  const [storageGb, setStorageGb] = useState<string>('128');
  const [ramGb, setRamGb] = useState<string>('8');
  const [color, setColor] = useState<string>('');

  // Step 2: New phone fields
  const [priceSdg, setPriceSdg] = useState('');
  const [usdPrice, setUsdPrice] = useState('');
  const [acceptsTradeIn, setAcceptsTradeIn] = useState(false);
  const [stockQty, setStockQty] = useState('1');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [warrantyType, setWarrantyType] = useState('');
  const [sealedBox, setSealedBox] = useState(true);

  // Step 2: Used physical unit fields
  const [usedGrade, setUsedGrade] = useState<UsedGrade>('excellent');
  const [batteryVerified, setBatteryVerified] = useState(true);
  const [batteryPct, setBatteryPct] = useState('90');
  const [defects, setDefects] = useState('');
  const [replacedParts, setReplacedParts] = useState('');
  const [usedUnitCode, setUsedUnitCode] = useState('');
  const [originalBox, setOriginalBox] = useState(true);
  const [inspectionDays, setInspectionDays] = useState('7');

  // Real Photos
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const idempotencyKeyRef = useRef<string>(newUuid());

  // 1. Load all brands from live DB catalog
  useEffect(() => {
    let active = true;
    setBrandsLoading(true);
    api
      .getCatalogBrands()
      .then((res) => {
        if (!active) return;
        const list = res.data || [];
        setBrands(list);
        if (list.length > 0) {
          const preferred =
            list.find((b) => b.name.toLowerCase() === 'samsung') || list[0];
          setSelectedBrand(preferred);
        }
      })
      .catch((err: ApiError) => {
        if (active) {
          pushToast('error', {
            ar: err.message || 'تعذر تحميل قائمة الماركات من الخادم.',
            en: err.message || 'Failed to load catalog brands.',
          });
        }
      })
      .finally(() => {
        if (active) setBrandsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pushToast]);

  // 2. Load models from live DB catalog when brand or search query changes
  useEffect(() => {
    if (!selectedBrand && !modelSearch.trim()) {
      setModels([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setModelsLoading(true);
      api
        .getCatalogModels({
          brand_id: modelSearch.trim() ? undefined : selectedBrand?.id,
          q: modelSearch.trim() || undefined,
          limit: 100,
        })
        .then((res) => {
          if (!active) return;
          const list = res.data || [];
          setModels(list);
        })
        .catch(() => {
          if (active) setModels([]);
        })
        .finally(() => {
          if (active) setModelsLoading(false);
        });
    }, modelSearch.trim() ? 220 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedBrand, modelSearch]);

  // 3. Load pre-configured variants when a phone model is selected
  useEffect(() => {
    if (!selectedModel) {
      setRawVariants([]);
      setSelectedVariantId(null);
      return;
    }
    let active = true;
    setVariantsLoading(true);
    api
      .getCatalogVariants(selectedModel.id)
      .then((res) => {
        if (!active) return;
        const list = res.data || [];
        setRawVariants(list);
        if (list.length > 0) {
          setSelectedVariantId(list[0].id);
          setStorageGb(String(list[0].storage_gb));
          setRamGb(String(list[0].ram_gb));
          if (!color.trim() && list[0].color && list[0].color !== 'Standard') {
            setColor(list[0].color);
          }
        } else {
          setSelectedVariantId(null);
        }
      })
      .catch(() => {
        if (active) {
          setRawVariants([]);
          setSelectedVariantId(null);
        }
      })
      .finally(() => {
        if (active) setVariantsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedModel]);

  // Group pre-configured variants by (storage_gb, ram_gb) so merchant picks in 1 click!
  const groupedVariants = useMemo<GroupedVariant[]>(() => {
    const byConfig = new Map<string, GroupedVariant>();
    for (const v of rawVariants) {
      const key = `${v.storage_gb}-${v.ram_gb}`;
      const existing = byConfig.get(key);
      if (!existing) {
        byConfig.set(key, {
          key,
          storageGb: v.storage_gb,
          ramGb: v.ram_gb,
          representativeVariantId: v.id,
          colors: v.color && v.color !== 'Standard' ? [v.color] : [],
        });
      } else if (v.color && v.color !== 'Standard' && !existing.colors.includes(v.color)) {
        existing.colors.push(v.color);
      }
    }
    return Array.from(byConfig.values()).sort(
      (a, b) => a.storageGb - b.storageGb || a.ramGb - b.ramGb
    );
  }, [rawVariants]);

  // Suggested colors from the selected model's DB variants (or sensible defaults)
  const suggestedColors = useMemo(() => {
    const set = new Set<string>();
    for (const v of rawVariants) {
      if (v.color && v.color !== 'Standard') set.add(v.color);
    }
    return set.size > 0 ? Array.from(set).slice(0, 12) : DEFAULT_COLORS;
  }, [rawVariants]);

  const filteredBrands = useMemo(() => {
    const q = brandFilter.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.name_ar || '').toLowerCase().includes(q)
    );
  }, [brands, brandFilter]);

  const handleSelectGroupedVariant = (gv: GroupedVariant) => {
    setSelectedVariantId(gv.representativeVariantId);
    setStorageGb(String(gv.storageGb));
    setRamGb(String(gv.ramGb));
  };

  const handleManualStorageChange = (val: string) => {
    setStorageGb(val);
    setSelectedVariantId(null);
  };

  const handleManualRamChange = (val: string) => {
    setRamGb(val);
    setSelectedVariantId(null);
  };

  const handleFileUpload = async (file: File, kind: PhotoKind) => {
    const localId = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const previewUrl = URL.createObjectURL(file);
    setPhotos((prev) => [
      ...prev,
      { localId, previewUrl, kind, fileName: file.name, state: 'uploading', file },
    ]);
    try {
      const assetId = await uploadMediaFile(file, kind, 'listing');
      setPhotos((prev) =>
        prev.map((p) =>
          p.localId === localId ? { ...p, assetId, state: 'done', error: undefined } : p
        )
      );
    } catch (err: any) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.localId === localId
            ? { ...p, state: 'failed', error: err?.message || 'Upload failed' }
            : p
        )
      );
    }
  };

  const retryPhoto = async (photo: UploadedPhoto) => {
    if (!photo.file) return;
    setPhotos((prev) =>
      prev.map((p) =>
        p.localId === photo.localId ? { ...p, state: 'uploading', error: undefined } : p
      )
    );
    try {
      const assetId = await uploadMediaFile(photo.file, photo.kind, 'listing');
      setPhotos((prev) =>
        prev.map((p) =>
          p.localId === photo.localId ? { ...p, assetId, state: 'done', error: undefined } : p
        )
      );
    } catch (err: any) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.localId === photo.localId
            ? { ...p, state: 'failed', error: err?.message || 'Upload failed' }
            : p
        )
      );
    }
  };

  const removePhoto = (localId: string) => {
    setPhotos((prev) => prev.filter((p) => p.localId !== localId));
  };

  const canContinueStep1 = Boolean(
    selectedModel &&
      Number(storageGb) >= 4 &&
      Number(storageGb) <= 4096 &&
      Number(ramGb) >= 1 &&
      Number(ramGb) <= 64
  );

  const donePhotos = photos.filter((p) => p.state === 'done' && p.assetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) {
      setValidationError(lang === 'ar' ? 'يرجى اختيار موديل الهاتف أولاً.' : 'Please select a phone model first.');
      return;
    }
    const numPrice = Number(priceSdg);
    if (!numPrice || numPrice <= 0) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى إدخال سعر صحيح بالجنيه السوداني.'
          : 'Please enter a valid price in SDG.'
      );
      return;
    }
    if (photos.some((p) => p.state === 'uploading')) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى الانتظار حتى يكتمل رفع الصور.'
          : 'Please wait for photos to finish uploading.'
      );
      return;
    }
    if (condition === 'new') {
      if (Number(stockQty) < 1) {
        setValidationError(
          lang === 'ar' ? 'أدخل كمية المخزون المتوفرة (1 أو أكثر).' : 'Enter available stock quantity (1 or more).'
        );
        return;
      }
      if (!donePhotos.some((p) => p.kind === 'seal')) {
        setValidationError(
          lang === 'ar'
            ? 'الهواتف الجديدة تتطلب صورة واحدة على الأقل للعلبة المختومة / ختم المتجر.'
            : 'New phones require at least one sealed box / store seal photo.'
        );
        return;
      }
    } else {
      const hasFront = donePhotos.some((p) => p.kind === 'front');
      const hasBack = donePhotos.some((p) => p.kind === 'back');
      const hasScreen = donePhotos.some((p) => p.kind === 'screen_on');
      if (!hasFront || !hasBack || !hasScreen) {
        setValidationError(
          lang === 'ar'
            ? 'الهواتف المستعملة تتطلب 3 صور فعلية: الأمام، الخلف، والشاشة وهي تعمل.'
            : 'Used phones require 3 real photos: Front, Back, and Powered-on Screen.'
        );
        return;
      }
      if (!defects.trim()) {
        setValidationError(
          lang === 'ar'
            ? 'يرجى كتابة وصف واضح للحالة أو الخدوش.'
            : 'Please enter a clear condition/defects description.'
        );
        return;
      }
    }

    setValidationError('');
    setSubmitting(true);
    try {
      const mediaIds = donePhotos.map((p) => p.assetId!);
      const payload: Record<string, unknown> = {
        condition,
        price: numPrice.toFixed(2),
        quantity: condition === 'new' ? Number(stockQty) : 1,
        media: mediaIds,
        color: color.trim() || 'Standard',
        accepts_trade_in: acceptsTradeIn,
      };
      if (usdPrice.trim() && Number(usdPrice) > 0) {
        payload.usd_price = Number(usdPrice).toFixed(2);
      }

      if (selectedVariantId) {
        payload.variant_id = selectedVariantId;
      } else {
        payload.model_id = selectedModel.id;
        payload.storage_gb = Number(storageGb);
        payload.ram_gb = Number(ramGb);
      }

      if (condition === 'new') {
        payload.is_sealed = sealedBox;
        payload.warranty_months = Math.max(0, Number(warrantyMonths) || 0);
        if (warrantyType.trim()) payload.warranty_type = warrantyType.trim();
        payload.has_original_box = true;
      } else {
        payload.is_sealed = false;
        payload.grade = usedGrade;
        payload.battery_health = batteryVerified
          ? Math.min(100, Math.max(50, Number(batteryPct) || 85))
          : null;
        payload.defects = defects.trim();
        payload.replaced_parts = replacedParts.trim();
        payload.used_unit_code = usedUnitCode.trim();
        payload.used_availability = 'available';
        payload.has_original_box = originalBox;
        payload.warranty_days = Math.max(0, Number(inspectionDays) || 0);
      }

      await api.createListing(payload, idempotencyKeyRef.current);
      idempotencyKeyRef.current = newUuid();
      await Promise.all([refreshMerchantData(), refreshPublicData()]);
      pushToast('success', {
        ar: 'تم نشر الإعلان وحفظه في قاعدة البيانات بنجاح.',
        en: 'Listing published and saved to database.',
      });
      onComplete();
    } catch (err: any) {
      const msg = err?.message || (lang === 'ar' ? 'تعذر حفظ الإعلان.' : 'Failed to create listing.');
      setValidationError(msg);
      pushToast('error', { ar: msg, en: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const specs = selectedModel?.specifications || {};

  const photoSlots: { kind: PhotoKind; ar: string; en: string; required: boolean }[] =
    condition === 'new'
      ? [
          { kind: 'seal', ar: 'صورة العلبة المختومة / ختم المتجر *', en: 'Sealed Box / Store Seal *', required: true },
          { kind: 'front', ar: 'صورة إضافية (اختياري)', en: 'Additional Photo (Optional)', required: false },
        ]
      : [
          { kind: 'front', ar: 'الجهة الأمامية للجهاز *', en: 'Front of Device *', required: true },
          { kind: 'back', ar: 'الجهة الخلفية للجهاز *', en: 'Back of Device *', required: true },
          { kind: 'screen_on', ar: 'الشاشة وهي تعمل *', en: 'Powered-on Screen *', required: true },
          { kind: 'defect', ar: 'صورة أي خدش أو ملاحظة (اختياري)', en: 'Defect / Close-up (Optional)', required: false },
        ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Step Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                step === 1 ? 'bg-[#0F6B5D] text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              1
            </span>
            <span className="text-xs font-bold text-slate-900">
              {lang === 'ar' ? 'اختيار الهاتف والمواصفات' : 'Select Device & Specs'}
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
            <span className="text-xs font-bold text-slate-900">
              {condition === 'new'
                ? lang === 'ar'
                  ? 'السعر والمخزون والصور'
                  : 'Price, Stock & Photos'
                : lang === 'ar'
                  ? 'حالة الجهاز المستعمل والصور'
                  : 'Used Unit Details & Photos'}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          {brands.length > 0
            ? lang === 'ar'
              ? `${brands.length} ماركة في الكتالوج`
              : `${brands.length} catalog brands`
            : ''}
        </span>
      </div>

      {/* STEP 1: Condition, Brand, Model, Grouped Variants (1-Click) + Custom Specs + Color */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Condition Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? '1. نوع الإعلان (جديد أو مستعمل)' : '1. Listing Condition'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCondition('new');
                  setPhotos([]);
                }}
                className={`p-4 rounded-xl border text-start transition-colors ${
                  condition === 'new'
                    ? 'border-[#0F6B5D] bg-teal-50/70'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-bold text-slate-900">
                  {lang === 'ar' ? 'هاتف جديد (بالمخزون)' : 'Brand New Phone (Stock)'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {lang === 'ar'
                    ? 'علبة مختومة، كمية مخزون، وضمان بالأشهر.'
                    : 'Sealed box, stock quantity, and warranty in months.'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCondition('used');
                  setPhotos([]);
                }}
                className={`p-4 rounded-xl border text-start transition-colors ${
                  condition === 'used'
                    ? 'border-[#0F6B5D] bg-teal-50/70'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-bold text-slate-900">
                  {lang === 'ar' ? 'هاتف مستعمل (قطعة فردية)' : 'Used Phone (Single Unit)'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {lang === 'ar'
                    ? 'جهاز فعلي واحد مع درجة النظافة والبطارية و3 صور حقيقية.'
                    : 'Single inspected unit with grade, battery health, and 3 real photos.'}
                </p>
              </button>
            </div>
          </div>

          {/* Brand & Model Picker (Live Collected Catalog) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#0F6B5D]" />
                {lang === 'ar' ? '2. اختر الماركة والموديل من الكتالوج' : '2. Select Brand & Phone Model'}
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  placeholder={lang === 'ar' ? 'تصفية الماركات...' : 'Filter brands...'}
                  className="w-full h-9 ps-8 pe-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
                />
              </div>
            </div>

            {/* Brands Grid */}
            {brandsLoading ? (
              <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0F6B5D]" />
                {lang === 'ar' ? 'جاري تحميل الماركات...' : 'Loading brands...'}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {filteredBrands.map((b) => {
                  const active = selectedBrand?.id === b.id && !modelSearch.trim();
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBrand(b);
                        setModelSearch('');
                        setSelectedModel(null);
                      }}
                      className={`h-9 px-3.5 rounded-xl border text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#0F6B5D] border-[#0F6B5D] text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-[#0F6B5D]'
                      }`}
                    >
                      {lang === 'ar' && b.name_ar ? `${b.name_ar} (${b.name})` : b.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Model Search & Scrollable Selector */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? `ابحث عن موديل الهاتف (مثال: Galaxy S24، iPhone 15، Redmi Note 13، Camon 30)...`
                      : `Search phone model (e.g. Galaxy S24, iPhone 15, Redmi Note 13, Camon 30)...`
                  }
                  className="w-full h-11 ps-9 pe-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                />
              </div>

              {modelsLoading ? (
                <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0F6B5D]" />
                  {lang === 'ar' ? 'جاري تحميل الموديلات...' : 'Loading models...'}
                </div>
              ) : models.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  {lang === 'ar'
                    ? 'لا توجد موديلات مطابقة للبحث الحالي.'
                    : 'No matching models found.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                  {models.map((m) => {
                    const isSelected = selectedModel?.id === m.id;
                    const yr = m.specifications?.release_year;
                    const bat = m.specifications?.battery?.capacity_mah;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModel(m)}
                        className={`p-3 rounded-xl border text-start transition-colors ${
                          isSelected
                            ? 'border-[#0F6B5D] bg-teal-50 ring-1 ring-[#0F6B5D]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 leading-snug" dir="ltr">
                            {m.name}
                          </p>
                          {isSelected && <Check className="w-4 h-4 text-[#0F6B5D] shrink-0" />}
                        </div>
                        {(yr || bat) && (
                          <p className="text-[10px] text-slate-500 mt-1" dir="ltr">
                            {[yr ? String(yr) : '', bat ? `${bat}mAh` : ''].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. Grouped Pre-Configured Variants (1-Click) + Custom Spec Configuration + Color */}
          {selectedModel && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              {/* Selected Phone Summary */}
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-teal-800 font-semibold">
                    {lang === 'ar' ? 'الهاتف المختار' : 'Selected Phone'}
                  </p>
                  <p className="text-sm font-bold text-slate-900" dir="ltr">
                    {selectedModel.name}
                  </p>
                </div>
                {specs?.display?.size_inches && (
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-700" dir="ltr">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-teal-200">
                      {specs.display.size_inches}" {specs.display.type || ''}
                    </span>
                    {specs?.battery?.capacity_mah && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-teal-200">
                        {specs.battery.capacity_mah}mAh
                      </span>
                    )}
                    {specs?.performance?.chipset && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-teal-200 truncate max-w-[180px]">
                        {specs.performance.chipset}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* A. Pre-configured Variants (1-Click Selection) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0F6B5D]" />
                    {lang === 'ar'
                      ? 'النسخ الجاهزة لهذا الهاتف (اختيار بنقرة واحدة)'
                      : 'Pre-configured Variants (1-Click Select)'}
                  </h3>
                  {groupedVariants.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      {lang === 'ar'
                        ? `${groupedVariants.length} نسخة متوفرة`
                        : `${groupedVariants.length} preset(s)`}
                    </span>
                  )}
                </div>

                {variantsLoading ? (
                  <div className="py-3 text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0F6B5D]" />
                    {lang === 'ar' ? 'جاري تحميل النسخ الجاهزة...' : 'Loading pre-configured variants...'}
                  </div>
                ) : groupedVariants.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {groupedVariants.map((gv) => {
                      const active =
                        selectedVariantId === gv.representativeVariantId ||
                        (Number(storageGb) === gv.storageGb && Number(ramGb) === gv.ramGb);
                      return (
                        <button
                          key={gv.key}
                          type="button"
                          onClick={() => handleSelectGroupedVariant(gv)}
                          className={`p-3 rounded-xl border text-start transition-all ${
                            active
                              ? 'border-[#0F6B5D] bg-[#0F6B5D] text-white shadow-xs'
                              : 'border-slate-200 bg-slate-50 hover:border-[#0F6B5D] text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-bold font-mono-num" dir="ltr">
                              {gv.storageGb >= 1024 ? `${gv.storageGb / 1024}TB` : `${gv.storageGb}GB`}
                            </span>
                            {active && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          </div>
                          <p
                            className={`text-[11px] font-semibold mt-0.5 font-mono-num ${
                              active ? 'text-teal-100' : 'text-slate-600'
                            }`}
                            dir="ltr"
                          >
                            {gv.ramGb}GB RAM
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'لا توجد نسخ مسبقة لهذا الموديل — يمكنك تحديد المساحة والرام يدوياً أدناه.'
                      : 'No preset variants stored for this model — configure Storage & RAM below.'}
                  </p>
                )}
              </div>

              {/* B. Manual / Custom Spec Configuration (Below Pre-configured Variants) */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-slate-600" />
                    {lang === 'ar'
                      ? 'أو خصص المواصفات يدوياً (المساحة والرام)'
                      : 'Or Configure Specs Manually (Storage & RAM)'}
                  </h3>
                  {!selectedVariantId && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {lang === 'ar' ? 'تخصيص يدوي' : 'Custom Specs'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Storage GB */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                      {lang === 'ar' ? 'المساحة التخزينية (GB) *' : 'Storage Capacity (GB) *'}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {STORAGE_PRESETS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleManualStorageChange(String(s))}
                          className={`h-8 px-2.5 rounded-lg border text-xs font-mono-num font-semibold ${
                            Number(storageGb) === s
                              ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                              : 'border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {s >= 1024 ? '1TB' : `${s}GB`}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={4}
                      max={4096}
                      value={storageGb}
                      onChange={(e) => handleManualStorageChange(e.target.value)}
                      placeholder="128"
                      dir="ltr"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>

                  {/* RAM GB */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      {lang === 'ar' ? 'الذاكرة العشوائية / الرام (GB) *' : 'RAM (GB) *'}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {RAM_PRESETS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleManualRamChange(String(r))}
                          className={`h-8 px-2.5 rounded-lg border text-xs font-mono-num font-semibold ${
                            Number(ramGb) === r
                              ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                              : 'border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {r}GB
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      value={ramGb}
                      onChange={(e) => handleManualRamChange(e.target.value)}
                      placeholder="8"
                      dir="ltr"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>
                </div>
              </div>

              {/* C. Color (Always Writable Regardless of Preset or Custom) */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#0F6B5D]" />
                  {lang === 'ar'
                    ? 'اللون (يمكن كتابة أي لون بحرية)'
                    : 'Color (Write any color freely)'}
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'اكتب اللون (مثال: أسود تيتانيوم، أزرق، فضي...)'
                      : 'Type color (e.g., Titanium Black, Midnight Blue, Silver...)'
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                />
                <div className="flex flex-wrap gap-1.5">
                  {suggestedColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 px-2.5 rounded-lg border text-[11px] font-medium ${
                        color.toLowerCase() === c.toLowerCase()
                          ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
              className="h-11 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold disabled:opacity-45"
            >
              {lang === 'ar' ? 'المتابعة للسعر والصور' : 'Continue to Price & Photos'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Price, Condition Details & Real Photo Uploads */}
      {step === 2 && selectedModel && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Selected Device Recap */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900" dir="ltr">
                {selectedModel.name}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {condition === 'new'
                  ? lang === 'ar'
                    ? 'جديد'
                    : 'New'
                  : lang === 'ar'
                    ? 'مستعمل'
                    : 'Used'}{' '}
                · <span dir="ltr">{storageGb}GB / {ramGb}GB RAM</span>
                {color.trim() ? ` · ${color.trim()}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-9 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50"
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

          {/* Price & Condition-Specific Fields */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              {condition === 'new'
                ? lang === 'ar'
                  ? 'تفاصيل السعر والمخزون والضمان'
                  : 'Price, Stock & Warranty'
                : lang === 'ar'
                  ? 'تفاصيل السعر وحالة القطعة المستعملة'
                  : 'Price & Used Unit Inspection'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'السعر بالجنيه السوداني (SDG) *' : 'Price (SDG) *'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  dir="ltr"
                  value={priceSdg}
                  onChange={(e) => setPriceSdg(e.target.value)}
                  placeholder="850000"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                />
                {Number(priceSdg) > 0 && (
                  <p className="text-[11px] text-[#0F6B5D] font-semibold mt-1">
                    {formatSdg(Number(priceSdg), lang)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'السعر المرجعي بالدولار (اختياري — للتحديث الجماعي)' : 'Reference USD Price (Optional — for bulk updates)'}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  dir="ltr"
                  value={usdPrice}
                  onChange={(e) => setUsdPrice(e.target.value)}
                  placeholder="350"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptsTradeIn}
                    onChange={(e) => setAcceptsTradeIn(e.target.checked)}
                    className="rounded border-slate-300 text-[#0F6B5D]"
                  />
                  {lang === 'ar'
                    ? 'يقبل الاستبدال (Trade-In) — يمكن للعميل استبدال هاتفه القديم بهذا الجهاز'
                    : 'Accepts Trade-In — buyers can trade in their old phone for this device'}
                </label>
              </div>

              {condition === 'new' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'الكمية المتوفرة في المخزون *' : 'Available Stock Quantity *'}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      dir="ltr"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'مدة الضمان (بالأشهر)' : 'Warranty Duration (Months)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      dir="ltr"
                      value={warrantyMonths}
                      onChange={(e) => setWarrantyMonths(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'نوع الضمان' : 'Warranty Type'}
                    </label>
                    <input
                      type="text"
                      value={warrantyType}
                      onChange={(e) => setWarrantyType(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: ضمان الوكيل أو ضمان المتجر' : 'e.g., Store or Manufacturer Warranty'}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sealedBox}
                        onChange={(e) => setSealedBox(e.target.checked)}
                        className="rounded border-slate-300 text-[#0F6B5D]"
                      />
                      {lang === 'ar' ? 'الجهاز جديد ومختوم بعلبته الأصلية' : 'Factory sealed in original box'}
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'درجة نظافة الجهاز *' : 'Cosmetic Grade *'}
                    </label>
                    <select
                      value={usedGrade}
                      onChange={(e) => setUsedGrade(e.target.value as UsedGrade)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                    >
                      <option value="like_new">{lang === 'ar' ? 'شبه جديد (Like New)' : 'Like New'}</option>
                      <option value="excellent">{lang === 'ar' ? 'ممتاز (Excellent)' : 'Excellent'}</option>
                      <option value="good">{lang === 'ar' ? 'جيد (Good)' : 'Good'}</option>
                      <option value="fair">{lang === 'ar' ? 'مقبول (Fair)' : 'Fair'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'ضمان الفحص (أيام)' : 'Inspection Warranty (Days)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      dir="ltr"
                      value={inspectionDays}
                      onChange={(e) => setInspectionDays(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'نسبة صحة البطارية (%)' : 'Battery Health (%)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={batteryVerified}
                        onChange={(e) => setBatteryVerified(e.target.checked)}
                      />
                      <input
                        type="number"
                        disabled={!batteryVerified}
                        min={50}
                        max={100}
                        dir="ltr"
                        value={batteryPct}
                        onChange={(e) => setBatteryPct(e.target.value)}
                        className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono-num disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'كود القطعة (اختياري)' : 'Unit Code (Optional)'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={usedUnitCode}
                      onChange={(e) => setUsedUnitCode(e.target.value)}
                      placeholder="U-101"
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'وصف الحالة والعيوب أو الخدوش *' : 'Condition & Defects Disclosure *'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={defects}
                      onChange={(e) => setDefects(e.target.value)}
                      placeholder={
                        lang === 'ar'
                          ? 'اذكر حالة الشاشة والهيكل وأي خدوش أو أكد خلو الجهاز من العيوب...'
                          : 'Describe screen, frame condition, scratches, or confirm no defects...'
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'القطع المستبدلة (إن وجدت)' : 'Replaced Parts (if any)'}
                    </label>
                    <input
                      type="text"
                      value={replacedParts}
                      onChange={(e) => setReplacedParts(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: لا توجد قطع مستبدلة' : 'e.g., None / Original parts'}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={originalBox}
                        onChange={(e) => setOriginalBox(e.target.checked)}
                      />
                      {lang === 'ar' ? 'العلبة الأصلية متوفرة مع الجهاز' : 'Original box included'}
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Real Photo Uploads */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'ar' ? 'صور الهاتف الفعلية' : 'Real Device Photos'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {condition === 'new'
                  ? lang === 'ar'
                    ? 'ارفع صورة واضحة للعلبة المختومة أو ختم المتجر.'
                    : 'Upload a clear photo of the sealed box or store seal.'
                  : lang === 'ar'
                    ? 'ارفع 3 صور حقيقية للجهاز: الأمام، الخلف، والشاشة وهي تعمل.'
                    : 'Upload 3 real photos of the unit: Front, Back, and Powered-on Screen.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {photoSlots.map((slot) => {
                const slotPhotos = photos.filter((p) => p.kind === slot.kind);
                return (
                  <div
                    key={slot.kind}
                    className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {lang === 'ar' ? slot.ar : slot.en}
                      </span>
                      {slotPhotos.some((p) => p.state === 'done') && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>

                    {slotPhotos.map((p) => (
                      <div
                        key={p.localId}
                        className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-slate-200"
                      >
                        <img
                          src={p.previewUrl}
                          alt={p.fileName}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{p.fileName}</p>
                          {p.state === 'uploading' && (
                            <p className="text-[11px] text-[#0F6B5D] flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              {lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                            </p>
                          )}
                          {p.state === 'done' && (
                            <p className="text-[11px] text-emerald-700 font-semibold">
                              {lang === 'ar' ? 'تم الرفع ✓' : 'Uploaded ✓'}
                            </p>
                          )}
                          {p.state === 'failed' && (
                            <button
                              type="button"
                              onClick={() => retryPhoto(p)}
                              className="text-[11px] text-red-700 font-semibold underline"
                            >
                              {lang === 'ar' ? 'فشل الرفع — إعادة المحاولة' : 'Failed — Retry'}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(p.localId)}
                          className="p-1.5 text-slate-400 hover:text-red-600"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-300 hover:border-[#0F6B5D] text-xs font-semibold text-slate-800 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#0F6B5D]" />
                      {lang === 'ar' ? 'اختيار صورة من الجهاز' : 'Choose Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, slot.kind);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50"
            >
              <BackArrow className="w-4 h-4" />
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              {lang === 'ar' ? 'نشر الإعلان الآن' : 'Publish Listing'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
