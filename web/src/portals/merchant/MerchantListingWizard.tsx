import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  Lock,
  Package,
  Palette,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { DeviceCondition, UsedChecklist, UsedGrade } from '../../types';
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

type WizardStepId = 'condition' | 'brand' | 'model' | 'specs' | 'pricing' | 'photos';

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

const WIZARD_STEPS: { id: WizardStepId; ar: string; en: string }[] = [
  { id: 'condition', ar: 'الحالة', en: 'Condition' },
  { id: 'brand', ar: 'الماركة', en: 'Brand' },
  { id: 'model', ar: 'الموديل', en: 'Model' },
  { id: 'specs', ar: 'المواصفات', en: 'Specs' },
  { id: 'pricing', ar: 'السعر والتفاصيل', en: 'Price & Details' },
  { id: 'photos', ar: 'الصور والنشر', en: 'Photos & Publish' },
];

const STORAGE_PRESETS = [32, 64, 128, 256, 512, 1024];
const RAM_PRESETS = [2, 3, 4, 6, 8, 12, 16, 24];
const DEFAULT_COLORS = ['Black', 'White', 'Blue', 'Silver', 'Gold', 'Green', 'Titanium', 'Purple'];

const USED_GRADES: { id: UsedGrade; ar: string; en: string; descAr: string; descEn: string }[] = [
  {
    id: 'like_new',
    ar: 'شبه جديد',
    en: 'Like New',
    descAr: 'بدون خدوش ظاهرة',
    descEn: 'No visible scratches',
  },
  {
    id: 'excellent',
    ar: 'ممتاز',
    en: 'Excellent',
    descAr: 'استخدام خفيف جداً',
    descEn: 'Very light signs of use',
  },
  {
    id: 'good',
    ar: 'جيد',
    en: 'Good',
    descAr: 'خدوش بسيطة عادية',
    descEn: 'Minor everyday marks',
  },
  {
    id: 'fair',
    ar: 'مقبول',
    en: 'Fair',
    descAr: 'آثار استخدام واضحة',
    descEn: 'Visible wear, fully working',
  },
];

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
          className="h-11 px-5 rounded-xl bg-[#0F6B5D] text-white text-xs font-semibold hover:bg-[#0B5348]"
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

  const [step, setStep] = useState<WizardStepId>('condition');
  const [condition, setCondition] = useState<DeviceCondition | null>(null);

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
  const [showCustomSpecs, setShowCustomSpecs] = useState(false);

  // Spec values (filled by 1-click variant OR configured manually)
  const [storageGb, setStorageGb] = useState<string>('128');
  const [ramGb, setRamGb] = useState<string>('8');
  const [color, setColor] = useState<string>('');

  // Pricing & New phone fields
  const [priceSdg, setPriceSdg] = useState('');
  const [usdPrice, setUsdPrice] = useState('');
  const [acceptsTradeIn, setAcceptsTradeIn] = useState(false);
  const [stockQty, setStockQty] = useState('1');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [warrantyType, setWarrantyType] = useState('');
  const [sealedBox, setSealedBox] = useState(true);

  // Used physical unit fields
  const [usedGrade, setUsedGrade] = useState<UsedGrade>('excellent');
  const [batteryVerified, setBatteryVerified] = useState(true);
  const [batteryPct, setBatteryPct] = useState('90');
  const [defects, setDefects] = useState('');
  const [replacedParts, setReplacedParts] = useState('');
  const [usedUnitCode, setUsedUnitCode] = useState('');
  const [originalBox, setOriginalBox] = useState(true);
  const [inspectionDays, setInspectionDays] = useState('7');
  const [usedChecklist, setUsedChecklist] = useState<UsedChecklist>({
    biometricsWorking: true,
    originalScreen: true,
    networkUnlocked: true,
    cleanImei: true,
    accessoriesIncluded: false,
  });

  // Real Photos
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const idempotencyKeyRef = useRef<string>(newUuid());
  const topAnchorRef = useRef<HTMLDivElement | null>(null);

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

  const goToStep = (next: WizardStepId) => {
    setValidationError('');
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Load all brands from live DB catalog
  useEffect(() => {
    let active = true;
    setBrandsLoading(true);
    api
      .getCatalogBrands()
      .then((res) => {
        if (!active) return;
        setBrands(res.data || []);
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
          setModels(res.data || []);
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
          setShowCustomSpecs(false);
          if (list[0].color && list[0].color !== 'Standard') {
            setColor(list[0].color);
          } else {
            setColor('');
          }
        } else {
          setSelectedVariantId(null);
          setShowCustomSpecs(true);
        }
      })
      .catch(() => {
        if (active) {
          setRawVariants([]);
          setSelectedVariantId(null);
          setShowCustomSpecs(true);
        }
      })
      .finally(() => {
        if (active) setVariantsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedModel]);

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

  const handleSelectCondition = (nextCondition: DeviceCondition) => {
    if (condition && condition !== nextCondition) {
      setPhotos([]);
    }
    setCondition(nextCondition);
    goToStep('brand');
  };

  const handleSelectBrand = (brand: ApiBrand) => {
    if (selectedBrand?.id !== brand.id) {
      setSelectedBrand(brand);
      setSelectedModel(null);
      setModelSearch('');
    }
    goToStep('model');
  };

  const handleSelectModel = (model: ApiCatalogModel) => {
    setSelectedModel(model);
    if (!selectedBrand) {
      const matched = brands.find((b) => b.id === model.brand_id) || null;
      if (matched) setSelectedBrand(matched);
    }
    goToStep('specs');
  };

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

  const canContinueSpecs = Boolean(
    selectedModel &&
      Number(storageGb) >= 4 &&
      Number(storageGb) <= 4096 &&
      Number(ramGb) >= 1 &&
      Number(ramGb) <= 64
  );

  const handleContinueFromPricing = () => {
    const numPrice = Number(priceSdg);
    if (!numPrice || numPrice <= 0) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى إدخال سعر صحيح بالجنيه السوداني.'
          : 'Please enter a valid price in SDG.'
      );
      return;
    }
    if (condition === 'new') {
      if (Number(stockQty) < 1) {
        setValidationError(
          lang === 'ar'
            ? 'أدخل كمية المخزون المتوفرة (1 أو أكثر).'
            : 'Enter available stock quantity (1 or more).'
        );
        return;
      }
    } else if (!defects.trim()) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى كتابة وصف واضح لحالة الجهاز أو أي خدوش.'
          : 'Please enter a clear condition and defects description.'
      );
      return;
    }
    goToStep('photos');
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

  const donePhotos = photos.filter((p) => p.state === 'done' && p.assetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condition || !selectedModel) {
      setValidationError(
        lang === 'ar' ? 'يرجى إكمال اختيار الهاتف أولاً.' : 'Please complete device selection first.'
      );
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
        payload.used_checklist = {
          biometrics_working: usedChecklist.biometricsWorking,
          original_screen: usedChecklist.originalScreen,
          network_unlocked: usedChecklist.networkUnlocked,
          clean_imei: usedChecklist.cleanImei,
          accessories_included: usedChecklist.accessoriesIncluded,
        };
      }

      await api.createListing(payload, idempotencyKeyRef.current);
      idempotencyKeyRef.current = newUuid();
      await Promise.all([refreshMerchantData(), refreshPublicData()]);
      pushToast('success', {
        ar: 'تم نشر الإعلان وحفظه بنجاح.',
        en: 'Listing published and saved.',
      });
      onComplete();
    } catch (err: any) {
      const msg =
        err?.message || (lang === 'ar' ? 'تعذر حفظ الإعلان.' : 'Failed to create listing.');
      setValidationError(msg);
      pushToast('error', { ar: msg, en: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const canJumpToStep = (targetIndex: number): boolean => {
    if (targetIndex < currentStepIndex) return true;
    if (targetIndex === currentStepIndex) return true;
    const targetId = WIZARD_STEPS[targetIndex].id;
    if (targetId === 'brand') return Boolean(condition);
    if (targetId === 'model') return Boolean(condition && selectedBrand);
    if (targetId === 'specs') return Boolean(condition && selectedModel);
    if (targetId === 'pricing') return Boolean(condition && canContinueSpecs);
    if (targetId === 'photos') {
      const numPrice = Number(priceSdg);
      const validPrice = numPrice > 0 && (condition === 'new' ? Number(stockQty) >= 1 : Boolean(defects.trim()));
      return Boolean(condition && canContinueSpecs && validPrice);
    }
    return false;
  };

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const NextArrow = lang === 'ar' ? ArrowLeft : ArrowRight;
  const CardChevron = lang === 'ar' ? ChevronLeft : ChevronRight;
  const specs = selectedModel?.specifications || {};
  const progressPct = ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100;

  const photoSlots: { kind: PhotoKind; ar: string; en: string; required: boolean }[] =
    condition === 'new'
      ? [
          {
            kind: 'seal',
            ar: 'صورة العلبة المختومة / ختم المتجر *',
            en: 'Sealed Box / Store Seal *',
            required: true,
          },
          {
            kind: 'front',
            ar: 'صورة إضافية (اختياري)',
            en: 'Additional Photo (Optional)',
            required: false,
          },
        ]
      : [
          { kind: 'front', ar: 'الجهة الأمامية للجهاز *', en: 'Front of Device *', required: true },
          { kind: 'back', ar: 'الجهة الخلفية للجهاز *', en: 'Back of Device *', required: true },
          { kind: 'screen_on', ar: 'الشاشة وهي تعمل *', en: 'Powered-on Screen *', required: true },
          {
            kind: 'defect',
            ar: 'صورة أي خدش أو ملاحظة (اختياري)',
            en: 'Defect / Close-up (Optional)',
            required: false,
          },
        ];

  // Quiet unboxed breadcrumb trail of what has been selected so far
  const selectionTrail = useMemo(() => {
    const parts: string[] = [];
    if (condition) {
      parts.push(
        condition === 'new'
          ? lang === 'ar'
            ? 'جديد'
            : 'New'
          : lang === 'ar'
            ? 'مستعمل'
            : 'Used'
      );
    }
    if (selectedBrand) {
      parts.push(lang === 'ar' && selectedBrand.name_ar ? selectedBrand.name_ar : selectedBrand.name);
    }
    if (selectedModel) {
      parts.push(selectedModel.name);
    }
    if (currentStepIndex >= 4 && Number(storageGb) > 0) {
      const storageLabel = Number(storageGb) >= 1024 ? `${Number(storageGb) / 1024}TB` : `${storageGb}GB`;
      parts.push(`${storageLabel} / ${ramGb}GB`);
    }
    return parts;
  }, [condition, selectedBrand, selectedModel, currentStepIndex, storageGb, ramGb, lang]);

  return (
    <div ref={topAnchorRef} className="max-w-3xl mx-auto space-y-5 pb-8">
      {/* Compact Wizard Progress Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 tabular-nums">
              {lang === 'ar'
                ? `الخطوة ${currentStepIndex + 1} من ${WIZARD_STEPS.length}`
                : `Step ${currentStepIndex + 1} of ${WIZARD_STEPS.length}`}
            </p>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 truncate">
              {lang === 'ar'
                ? WIZARD_STEPS[currentStepIndex].ar
                : WIZARD_STEPS[currentStepIndex].en}
            </h1>
          </div>
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={() => goToStep(WIZARD_STEPS[currentStepIndex - 1].id)}
              className="h-10 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <BackArrow className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
          )}
        </div>

        {/* Continuous Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0F6B5D] rounded-full transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step Navigation Track (clickable for completed/reachable steps) */}
        <div className="flex items-center gap-1 overflow-x-auto thin-scroll pt-0.5 -mx-1 px-1">
          {WIZARD_STEPS.map((s, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            const reachable = canJumpToStep(idx);
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && goToStep(s.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-teal-50 text-[#0F6B5D]'
                      : isCompleted
                        ? 'text-slate-700 hover:bg-slate-100'
                        : reachable
                          ? 'text-slate-600 hover:bg-slate-100'
                          : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center tabular-nums ${
                      isCurrent
                        ? 'bg-[#0F6B5D] text-white'
                        : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                  </span>
                  <span>{lang === 'ar' ? s.ar : s.en}</span>
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <span className="text-slate-300 text-xs shrink-0" aria-hidden="true">
                    /
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Quiet Selection Trail */}
        {selectionTrail.length > 0 && currentStepIndex > 0 && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {selectionTrail.map((item, idx) => (
              <React.Fragment key={`${item}-${idx}`}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span className={idx === selectionTrail.length - 1 ? 'font-semibold text-slate-800' : ''}>
                  {item}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {validationError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ================================================================
          PAGE 1: CONDITION (Tap a card -> advances immediately to Brand)
         ================================================================ */}
      {step === 'condition' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'ar'
                ? 'ما نوع الهاتف الذي تريد إضافته؟'
                : 'What type of phone are you adding?'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'اضغط على الخيار المناسب للانتقال تلقائياً للخطوة التالية.'
                : 'Tap an option to move directly to the next step.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={() => handleSelectCondition('new')}
              className={`group min-h-[120px] p-5 rounded-2xl border text-start transition-all flex flex-col justify-between gap-4 ${
                condition === 'new'
                  ? 'border-[#0F6B5D] bg-teal-50/70 ring-1 ring-[#0F6B5D]'
                  : 'border-slate-200 bg-white hover:border-[#0F6B5D] hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#0F6B5D] flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <CardChevron className="w-5 h-5 text-slate-400 group-hover:text-[#0F6B5D] transition-colors shrink-0 mt-1" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {lang === 'ar' ? 'هاتف جديد (بالمخزون)' : 'Brand New Phone'}
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {lang === 'ar'
                    ? 'علبة مختومة، كمية مخزون، وضمان بالأشهر.'
                    : 'Factory sealed box, stock quantity, and warranty in months.'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectCondition('used')}
              className={`group min-h-[120px] p-5 rounded-2xl border text-start transition-all flex flex-col justify-between gap-4 ${
                condition === 'used'
                  ? 'border-[#0F6B5D] bg-teal-50/70 ring-1 ring-[#0F6B5D]'
                  : 'border-slate-200 bg-white hover:border-[#0F6B5D] hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <CardChevron className="w-5 h-5 text-slate-400 group-hover:text-[#0F6B5D] transition-colors shrink-0 mt-1" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {lang === 'ar' ? 'هاتف مستعمل (قطعة فردية)' : 'Used Phone (Single Unit)'}
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {lang === 'ar'
                    ? 'جهاز فعلي واحد مع درجة النظافة والبطارية و3 صور حقيقية.'
                    : 'Single inspected unit with grade, battery health, and 3 real photos.'}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          PAGE 2: BRAND (Tap a brand -> advances immediately to Model)
         ================================================================ */}
      {step === 'brand' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'ar' ? 'اختر ماركة الهاتف' : 'Choose the phone brand'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'اضغط على الماركة لعرض الموديلات المتوفرة في الكتالوج.'
                : 'Select a brand to browse its models.'}
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث عن الماركة (مثال: آبل، سامسونج)...' : 'Search brands (e.g. Apple, Samsung)...'}
              className="w-full h-11 ps-10 pe-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
            />
          </div>

          {brandsLoading ? (
            <div className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0F6B5D]" />
              {lang === 'ar' ? 'جاري تحميل الماركات...' : 'Loading brands...'}
            </div>
          ) : filteredBrands.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              {lang === 'ar' ? 'لا توجد ماركة مطابقة للبحث.' : 'No matching brands found.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredBrands.map((b) => {
                const isSelected = selectedBrand?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBrand(b)}
                    className={`group min-h-[68px] p-4 rounded-xl border text-start transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-[#0F6B5D] bg-teal-50/70 ring-1 ring-[#0F6B5D]'
                        : 'border-slate-200 bg-white hover:border-[#0F6B5D] hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {lang === 'ar' && b.name_ar ? b.name_ar : b.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {lang === 'ar' && b.name_ar ? b.name : `${b.model_count || 0} models`}
                      </p>
                    </div>
                    <CardChevron className="w-4 h-4 text-slate-400 group-hover:text-[#0F6B5D] shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          PAGE 3: MODEL (Tap a model -> advances immediately to Specs)
         ================================================================ */}
      {step === 'model' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'ar'
                  ? `اختر موديل ${selectedBrand?.name_ar || selectedBrand?.name || 'الهاتف'}`
                  : `Choose ${selectedBrand?.name || 'Phone'} Model`}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'اضغط على الموديل المطلوب أو ابحث بالاسم مباشرة.'
                  : 'Tap a model to continue, or search by model name.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => goToStep('brand')}
              className="text-xs font-semibold text-[#0F6B5D] hover:underline whitespace-nowrap shrink-0"
            >
              {lang === 'ar' ? 'تغيير الماركة' : 'Change brand'}
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'ابحث عن الموديل (مثال: iPhone 15، Galaxy S24، Redmi Note 13)...'
                  : 'Search model (e.g. iPhone 15, Galaxy S24, Redmi Note 13)...'
              }
              className="w-full h-11 ps-10 pe-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
            />
          </div>

          {modelsLoading ? (
            <div className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0F6B5D]" />
              {lang === 'ar' ? 'جاري تحميل الموديلات...' : 'Loading models...'}
            </div>
          ) : models.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              {lang === 'ar'
                ? 'لا توجد موديلات مطابقة للبحث الحالي.'
                : 'No matching models found.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto thin-scroll pe-1">
              {models.map((m) => {
                const isSelected = selectedModel?.id === m.id;
                const yr = m.specifications?.release_year;
                const bat = m.specifications?.battery?.capacity_mah;
                const meta = [yr ? String(yr) : '', bat ? `${bat}mAh` : ''].filter(Boolean).join(' · ');
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m)}
                    className={`group min-h-[64px] p-4 rounded-xl border text-start transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-[#0F6B5D] bg-teal-50/70 ring-1 ring-[#0F6B5D]'
                        : 'border-slate-200 bg-white hover:border-[#0F6B5D] hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate" dir="ltr">
                        {m.name}
                      </p>
                      {meta && (
                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums" dir="ltr">
                          {meta}
                        </p>
                      )}
                    </div>
                    <CardChevron className="w-4 h-4 text-slate-400 group-hover:text-[#0F6B5D] shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          PAGE 4: SPECS (Storage, RAM & Color)
         ================================================================ */}
      {step === 'specs' && selectedModel && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900" dir="ltr">
                {selectedModel.name}
              </h2>
              {specs?.display?.size_inches && (
                <p className="text-xs text-slate-500" dir="ltr">
                  {[
                    `${specs.display.size_inches}" ${specs.display.type || ''}`.trim(),
                    specs?.battery?.capacity_mah ? `${specs.battery.capacity_mah}mAh` : '',
                    specs?.performance?.chipset || '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => goToStep('model')}
              className="text-xs font-semibold text-[#0F6B5D] hover:underline whitespace-nowrap shrink-0"
            >
              {lang === 'ar' ? 'تغيير الموديل' : 'Change model'}
            </button>
          </div>

          {/* A. Pre-configured Variants (1-Click Selection) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#0F6B5D]" />
                {lang === 'ar' ? 'المساحة التخزينية والرام' : 'Storage & RAM'}
              </h3>
              {groupedVariants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCustomSpecs((v) => !v)}
                  className="text-xs font-semibold text-[#0F6B5D] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {showCustomSpecs
                    ? lang === 'ar'
                      ? 'إخفاء التخصيص اليدوي'
                      : 'Hide custom'
                    : lang === 'ar'
                      ? 'تخصيص يدوي'
                      : 'Custom specs'}
                </button>
              )}
            </div>

            {variantsLoading ? (
              <div className="py-4 text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0F6B5D]" />
                {lang === 'ar' ? 'جاري تحميل النسخ المتوفرة...' : 'Loading available configs...'}
              </div>
            ) : groupedVariants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {groupedVariants.map((gv) => {
                  const active =
                    selectedVariantId === gv.representativeVariantId ||
                    (Number(storageGb) === gv.storageGb && Number(ramGb) === gv.ramGb);
                  return (
                    <button
                      key={gv.key}
                      type="button"
                      onClick={() => handleSelectGroupedVariant(gv)}
                      className={`min-h-[64px] p-3.5 rounded-xl border text-start transition-all ${
                        active
                          ? 'border-[#0F6B5D] bg-[#0F6B5D] text-white'
                          : 'border-slate-200 bg-slate-50 hover:border-[#0F6B5D] text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold tabular-nums" dir="ltr">
                          {gv.storageGb >= 1024 ? `${gv.storageGb / 1024}TB` : `${gv.storageGb}GB`}
                        </span>
                        {active && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </div>
                      <p
                        className={`text-xs font-medium mt-0.5 tabular-nums ${
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
            ) : null}

            {/* B. Manual / Custom Spec Configuration */}
            {(showCustomSpecs || groupedVariants.length === 0) && (
              <div className="pt-4 mt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className={`h-9 px-3 rounded-lg border text-xs tabular-nums font-semibold ${
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
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>

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
                        className={`h-9 px-3 rounded-lg border text-xs tabular-nums font-semibold ${
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
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* C. Color Selection */}
          <div className="pt-5 border-t border-slate-100 space-y-3">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#0F6B5D]" />
              {lang === 'ar' ? 'اللون' : 'Color'}
            </label>
            <div className="flex flex-wrap gap-2">
              {suggestedColors.map((c) => {
                const active = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-10 px-3.5 rounded-xl border text-xs font-semibold transition-colors ${
                      active
                        ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'أو اكتب أي لون آخر (مثال: أسود تيتانيوم، أزرق...)'
                  : 'Or type any custom color (e.g. Titanium Black, Midnight Blue...)'
              }
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
            />
          </div>

          {/* Page 4 Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToStep('model')}
              className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50 whitespace-nowrap"
            >
              <BackArrow className="w-4 h-4" />
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
            <button
              type="button"
              disabled={!canContinueSpecs}
              onClick={() => goToStep('pricing')}
              className="h-11 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-45 whitespace-nowrap"
            >
              {lang === 'ar' ? 'التالي: السعر والتفاصيل' : 'Next: Price & Details'}
              <NextArrow className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          PAGE 5: PRICE & CONDITION DETAILS
         ================================================================ */}
      {step === 'pricing' && selectedModel && condition && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              {condition === 'new'
                ? lang === 'ar'
                  ? 'السعر والمخزون والضمان'
                  : 'Price, Stock & Warranty'
                : lang === 'ar'
                  ? 'السعر وحالة الجهاز المستعمل'
                  : 'Price & Used Unit Inspection'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'أدخل السعر بالجنيه السوداني وتفاصيل الضمان أو الفحص.'
                : 'Enter the SDG price and warranty or inspection details.'}
            </p>
          </div>

          {/* Pricing Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
              />
              {Number(priceSdg) > 0 && (
                <p className="text-xs text-[#0F6B5D] font-semibold mt-1.5 tabular-nums">
                  {formatSdg(Number(priceSdg), lang)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'السعر المرجعي بالدولار (اختياري)' : 'Reference USD Price (Optional)'}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={usdPrice}
                onChange={(e) => setUsdPrice(e.target.value)}
                placeholder="350"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={acceptsTradeIn}
                  onChange={(e) => setAcceptsTradeIn(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0F6B5D]"
                />
                {lang === 'ar'
                  ? 'يقبل الاستبدال (Trade-In) — يمكن للعميل استبدال هاتفه القديم بهذا الجهاز'
                  : 'Accepts Trade-In — buyers can trade in their old phone'}
              </label>
            </div>
          </div>

          {/* Condition-Specific Fields */}
          <div className="pt-5 border-t border-slate-100">
            {condition === 'new' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'الكمية المتوفرة في المخزون *' : 'Available Stock Quantity *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    dir="ltr"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'مدة الضمان (بالأشهر)' : 'Warranty Duration (Months)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    dir="ltr"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'نوع الضمان (اختياري)' : 'Warranty Type (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={warrantyType}
                    onChange={(e) => setWarrantyType(e.target.value)}
                    placeholder={
                      lang === 'ar'
                        ? 'مثال: ضمان الوكيل أو ضمان المتجر'
                        : 'e.g. Store or Manufacturer Warranty'
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={sealedBox}
                      onChange={(e) => setSealedBox(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0F6B5D]"
                    />
                    {lang === 'ar'
                      ? 'الجهاز جديد ومختوم بعلبته الأصلية'
                      : 'Factory sealed in original box'}
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Cosmetic Grade Buttons */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    {lang === 'ar' ? 'درجة نظافة الجهاز *' : 'Cosmetic Grade *'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {USED_GRADES.map((g) => {
                      const active = usedGrade === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setUsedGrade(g.id)}
                          className={`p-3 rounded-xl border text-start transition-colors ${
                            active
                              ? 'border-[#0F6B5D] bg-teal-50/70 ring-1 ring-[#0F6B5D]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <p className="text-xs font-bold text-slate-900">
                            {lang === 'ar' ? g.ar : g.en}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {lang === 'ar' ? g.descAr : g.descEn}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'نسبة صحة البطارية (%)' : 'Battery Health (%)'}
                    </label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={batteryVerified}
                        onChange={(e) => setBatteryVerified(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#0F6B5D]"
                        aria-label="Battery health verified"
                      />
                      <input
                        type="number"
                        disabled={!batteryVerified}
                        min={50}
                        max={100}
                        dir="ltr"
                        value={batteryPct}
                        onChange={(e) => setBatteryPct(e.target.value)}
                        className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums disabled:bg-slate-100 focus:outline-none focus:border-[#0F6B5D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'ضمان الفحص (أيام)' : 'Inspection Warranty (Days)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      dir="ltr"
                      value={inspectionDays}
                      onChange={(e) => setInspectionDays(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'القطع المستبدلة (إن وجدت)' : 'Replaced Parts (if any)'}
                    </label>
                    <input
                      type="text"
                      value={replacedParts}
                      onChange={(e) => setReplacedParts(e.target.value)}
                      placeholder={
                        lang === 'ar' ? 'مثال: لا توجد قطع مستبدلة' : 'e.g. None / Original parts'
                      }
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'ar' ? 'كود القطعة (اختياري)' : 'Unit Code (Optional)'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={usedUnitCode}
                      onChange={(e) => setUsedUnitCode(e.target.value)}
                      placeholder="U-101"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'ar'
                        ? 'وصف الحالة والعيوب أو الخدوش *'
                        : 'Condition & Defects Disclosure *'}
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
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={originalBox}
                        onChange={(e) => setOriginalBox(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#0F6B5D]"
                      />
                      {lang === 'ar' ? 'العلبة الأصلية متوفرة مع الجهاز' : 'Original box included'}
                    </label>
                  </div>

                  {/* Structured 5-Item Used Phone Verification Checklist */}
                  <div className="sm:col-span-2 p-4 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-2.5">
                    <p className="text-xs font-bold text-[#0F6B5D] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      {lang === 'ar'
                        ? 'قائمة فحص الجهاز المستعمل (تظهر للمشترين لزيادة الثقة)'
                        : 'Used Phone Verification Checklist (Shown to Buyers)'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(
                        [
                          {
                            key: 'biometricsWorking',
                            ar: 'البصمة / Face ID تعمل بكفاءة',
                            en: 'Face ID / Fingerprint working',
                          },
                          {
                            key: 'originalScreen',
                            ar: 'الشاشة أصلية (غير مستبدلة)',
                            en: 'Original factory screen',
                          },
                          {
                            key: 'networkUnlocked',
                            ar: 'مفتوح لجميع شبكات السودان (زين / سوداني / MTN)',
                            en: 'Network unlocked (Zain / Sudani / MTN)',
                          },
                          {
                            key: 'cleanImei',
                            ar: 'رقم IMEI سليم وغير مبلّغ عنه',
                            en: 'Clean IMEI / not blacklisted',
                          },
                          {
                            key: 'accessoriesIncluded',
                            ar: 'الشاحن أو الملحقات الأساسية مرفقة',
                            en: 'Charger / accessories included',
                          },
                        ] as const
                      ).map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer py-1"
                        >
                          <input
                            type="checkbox"
                            checked={usedChecklist[item.key]}
                            onChange={(e) =>
                              setUsedChecklist((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 rounded border-slate-300 accent-[#0F6B5D]"
                          />
                          <span>{lang === 'ar' ? item.ar : item.en}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Page 5 Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToStep('specs')}
              className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50 whitespace-nowrap"
            >
              <BackArrow className="w-4 h-4" />
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
            <button
              type="button"
              onClick={handleContinueFromPricing}
              className="h-11 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
            >
              {lang === 'ar' ? 'التالي: صور الجهاز' : 'Next: Device Photos'}
              <NextArrow className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          PAGE 6: REAL PHOTOS & FINAL REVIEW / PUBLISH
         ================================================================ */}
      {step === 'photos' && selectedModel && condition && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Compact Listing Summary Review */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-slate-500">
                {lang === 'ar' ? 'ملخص الإعلان قبل النشر' : 'Listing Summary'}
              </p>
              <p className="text-sm font-bold text-slate-900 truncate" dir="ltr">
                {selectedModel.name}
              </p>
              <p className="text-xs text-slate-600">
                {condition === 'new'
                  ? lang === 'ar'
                    ? 'جديد'
                    : 'New'
                  : lang === 'ar'
                    ? 'مستعمل'
                    : 'Used'}{' '}
                ·{' '}
                <span dir="ltr" className="tabular-nums">
                  {Number(storageGb) >= 1024 ? `${Number(storageGb) / 1024}TB` : `${storageGb}GB`} / {ramGb}GB RAM
                </span>
                {color.trim() ? ` · ${color.trim()}` : ''}
                {Number(priceSdg) > 0 ? ` · ${formatSdg(Number(priceSdg), lang)}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => goToStep('pricing')}
              className="text-xs font-semibold text-[#0F6B5D] hover:underline whitespace-nowrap shrink-0"
            >
              {lang === 'ar' ? 'تعديل السعر أو التفاصيل' : 'Edit price or details'}
            </button>
          </div>

          {/* Photo Upload Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#0F6B5D]" />
                {lang === 'ar' ? 'ارفع صور الهاتف الفعلية' : 'Upload Real Device Photos'}
              </h2>
              <p className="text-xs text-slate-500">
                {condition === 'new'
                  ? lang === 'ar'
                    ? 'ارفع صورة واضحة للعلبة المختومة أو ختم المتجر لنشر الإعلان.'
                    : 'Upload a clear photo of the sealed box or store seal to publish.'
                  : lang === 'ar'
                    ? 'ارفع 3 صور حقيقية للجهاز: الأمام، الخلف، والشاشة وهي تعمل.'
                    : 'Upload 3 real photos of the unit: Front, Back, and Powered-on Screen.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {photoSlots.map((slot) => {
                const slotPhotos = photos.filter((p) => p.kind === slot.kind);
                return (
                  <div
                    key={slot.kind}
                    className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 space-y-3"
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
                          className="p-2 text-slate-400 hover:text-red-600"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <label className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-slate-300 hover:border-[#0F6B5D] text-xs font-semibold text-slate-800 cursor-pointer">
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

            {/* Final Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToStep('pricing')}
                className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50 whitespace-nowrap"
              >
                <BackArrow className="w-4 h-4" />
                {lang === 'ar' ? 'السابق' : 'Back'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {lang === 'ar' ? 'نشر الإعلان الآن' : 'Publish Listing'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
