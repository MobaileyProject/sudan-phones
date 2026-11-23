import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Battery,
  Camera,
  Check,
  Cpu,
  GitCompareArrows,
  HardDrive,
  MessageCircle,
  Search,
  Shield,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';
import { BrandId, Language, Listing, Store } from '../../types';
import {
  BRANDS,
  formatCity,
  formatCondition,
  formatListingTitle,
  formatSdg,
  tText,
} from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import { SafeImage } from '../../components/DesignSystem';
import {
  CompareVerdict,
  evaluateNumericVerdict,
  getPhoneSpecifications,
  parseFrontCameraMp,
  parseResolutionPixels,
  resolvePhoneColorHex,
  scoreChipsetTier,
  scoreIpRating,
  scoreNetwork,
  scoreUsb,
  scoreVideo,
  scoreWarrantyDays,
} from '../../data/phoneSpecs';

function getBrandDisplayName(brandId: BrandId, lang: Language): string {
  const found = BRANDS.find((b) => b.id === brandId);
  if (!found) return brandId;
  return lang === 'ar' ? found.arLabel : found.label;
}

function yesNo(value: boolean, lang: Language): string {
  if (lang === 'ar') return value ? 'نعم' : 'لا';
  return value ? 'Yes' : 'No';
}

/**
 * Reusable realistic color swatch bead (no inline styles; pure SVG).
 */
export function ColorSwatchBead({
  color,
  size = 14,
}: {
  color: { ar: string; en: string };
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="shrink-0 rounded-full ring-[1.5px] ring-white shadow-[0_1.5px_4px_rgba(23,43,32,0.22)]"
    >
      <circle
        cx="7"
        cy="7"
        r="6.5"
        fill={resolvePhoneColorHex(color)}
        stroke="rgba(23,43,32,0.18)"
        strokeWidth="0.9"
      />
      <ellipse
        cx="5.2"
        cy="4.6"
        rx="2.4"
        ry="1.35"
        fill="rgba(255,255,255,0.34)"
        transform="rotate(-24 5.2 4.6)"
      />
    </svg>
  );
}

/**
 * 1. Quick Highlights Bar (Always visible near the top of Phone Details)
 * Includes primary buttons to open the Full Specifications Sheet and Detailed Spec Comparison.
 */
export function PhoneQuickHighlightsBar({
  listing,
  onOpenFullSpecs,
  onOpenDetailedCompare,
}: {
  listing: Listing;
  onOpenFullSpecs: () => void;
  onOpenDetailedCompare: () => void;
}) {
  const { lang } = usePrototype();
  const specs = useMemo(() => getPhoneSpecifications(listing), [listing]);

  const memoryLabel = listing.ramGb
    ? `${listing.ramGb} GB / ${listing.storageGb} GB`
    : `${listing.storageGb} GB`;

  const displayLabel = `${specs.display.size_inches}" • ${specs.display.refresh_rate_hz}Hz`;
  const cameraLabel = `${specs.camera.rear_main_mp} MP`;
  const batteryLabel =
    specs.battery.charging_wired_w > 0
      ? `${specs.battery.capacity_mah} mAh • ${specs.battery.charging_wired_w}W`
      : `${specs.battery.capacity_mah} mAh`;

  return (
    <div className="px-4 pt-3">
      <div className="clay-card rounded-[26px] p-3.5 space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-bold text-[#172B20]">
            {lang === 'ar' ? 'أبرز المواصفات' : 'Quick Highlights'}
          </h2>
          <span className="text-[10.5px] font-semibold text-[#5E7669]" dir="ltr">
            {specs.release_year} · {specs.series}
          </span>
        </div>

        {/* 6 Always-Visible Highlight Tiles */}
        <div className="grid grid-cols-2 gap-2">
          {/* 1. Memory & Storage */}
          <div className="clay-inset rounded-[16px] px-3 py-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-[#647C6F] mb-1">
              <HardDrive className="w-3 h-3 text-[#2D6145] shrink-0" />
              <span className="truncate">
                {lang === 'ar' ? 'الذاكرة والتخزين' : 'Memory & Storage'}
              </span>
            </div>
            <p className="text-[11.5px] font-bold text-[#172B20] font-mono-num truncate" dir="ltr">
              {memoryLabel}
            </p>
          </div>

          {/* 2. Color */}
          <div className="clay-inset rounded-[16px] px-3 py-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-[#647C6F] mb-1">
              <span className="truncate">{lang === 'ar' ? 'اللون' : 'Color'}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <ColorSwatchBead color={listing.color} size={13} />
              <p className="text-[11.5px] font-bold text-[#172B20] truncate">
                {tText(listing.color, lang)}
              </p>
            </div>
          </div>

          {/* 3. Display */}
          <div className="clay-inset rounded-[16px] px-3 py-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-[#647C6F] mb-1">
              <Smartphone className="w-3 h-3 text-[#2D6145] shrink-0" />
              <span className="truncate">{lang === 'ar' ? 'الشاشة' : 'Display'}</span>
            </div>
            <p className="text-[11.5px] font-bold text-[#172B20] font-mono-num truncate" dir="ltr">
              {displayLabel}
            </p>
          </div>

          {/* 4. Main Camera */}
          <div className="clay-inset rounded-[16px] px-3 py-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-[#647C6F] mb-1">
              <Camera className="w-3 h-3 text-[#2D6145] shrink-0" />
              <span className="truncate">
                {lang === 'ar' ? 'الكاميرا الرئيسية' : 'Main Camera'}
              </span>
            </div>
            <p className="text-[11.5px] font-bold text-[#172B20] font-mono-num truncate" dir="ltr">
              {cameraLabel}
            </p>
          </div>

          {/* 5. Battery */}
          <div className="clay-inset rounded-[16px] px-3 py-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-[#647C6F] mb-1">
              <Battery className="w-3 h-3 text-[#2D6145] shrink-0" />
              <span className="truncate">{lang === 'ar' ? 'البطارية' : 'Battery'}</span>
            </div>
            <p className="text-[11.5px] font-bold text-[#172B20] font-mono-num truncate" dir="ltr">
              {batteryLabel}
            </p>
          </div>

          {/* 6. Network */}
          <div className="clay-inset rounded-[16px] px-3 py-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-[#647C6F] mb-1">
              <Signal className="w-3 h-3 text-[#2D6145] shrink-0" />
              <span className="truncate">{lang === 'ar' ? 'الشبكة' : 'Network'}</span>
            </div>
            <p className="text-[11.5px] font-bold text-[#172B20] font-mono-num truncate" dir="ltr">
              {specs.connectivity.network}
            </p>
          </div>
        </div>

        {/* Dual Action Row: View All Specs + Detailed Spec Comparison */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          <button
            type="button"
            onClick={onOpenFullSpecs}
            className="clay-pill clay-focus-ring h-11 px-3 rounded-[18px] text-[11.5px] font-bold text-[#172B20] flex items-center justify-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#2D6145] shrink-0" />
            <span className="truncate">
              {lang === 'ar' ? 'عرض كل المواصفات' : 'View All Specs'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenDetailedCompare}
            className="clay-pill-active clay-focus-ring h-11 px-3 rounded-[18px] text-[11.5px] font-bold text-[#17462C] flex items-center justify-center gap-1.5"
          >
            <GitCompareArrows className="w-3.5 h-3.5 text-[#1F5C3B] shrink-0" />
            <span className="truncate">
              {lang === 'ar' ? 'مقارنة تفصيلية' : 'Compare Specs'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface SpecRowItem {
  labelAr: string;
  labelEn: string;
  value: string;
  ltr?: boolean;
}

interface SpecSectionGroup {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: React.ReactNode;
  rows: SpecRowItem[];
}

/**
 * 2. Full Specifications Sheet ("View All Specs" / "عرض كل المواصفات")
 * Strictly excludes internal `specifications.source` metadata.
 */
export function FullSpecificationsSheet({
  open,
  listing,
  onClose,
  onOpenDetailedCompare,
}: {
  open: boolean;
  listing: Listing;
  onClose: () => void;
  onOpenDetailedCompare: () => void;
}) {
  const { lang } = usePrototype();
  const specs = useMemo(() => getPhoneSpecifications(listing), [listing]);

  const sections: SpecSectionGroup[] = useMemo(() => {
    const batteryRows: SpecRowItem[] = [
      {
        labelAr: 'سعة البطارية',
        labelEn: 'Battery Capacity',
        value: `${specs.battery.capacity_mah} mAh`,
        ltr: true,
      },
    ];
    if (specs.battery.charging_wired_w > 0) {
      batteryRows.push({
        labelAr: 'الشحن السريع السلكي',
        labelEn: 'Fast Charging (Wired)',
        value: `${specs.battery.charging_wired_w} W`,
        ltr: true,
      });
    }
    if (specs.battery.charging_wireless_w > 0) {
      batteryRows.push({
        labelAr: 'الشحن اللاسلكي',
        labelEn: 'Wireless Charging',
        value: `${specs.battery.charging_wireless_w} W`,
        ltr: true,
      });
    }

    const buildRows: SpecRowItem[] = [
      {
        labelAr: 'البصمة / الأمان',
        labelEn: 'Biometrics',
        value: specs.build.fingerprint,
      },
    ];
    if (specs.build.ip_rating && specs.build.ip_rating.trim().toLowerCase() !== 'none') {
      buildRows.push({
        labelAr: 'مقاومة الماء والغبار',
        labelEn: 'Water & Dust Resistance',
        value: specs.build.ip_rating,
        ltr: true,
      });
    }

    return [
      {
        id: 'general',
        titleAr: 'عام',
        titleEn: 'General',
        icon: <Smartphone className="w-3.5 h-3.5 text-[#2D6145]" />,
        rows: [
          {
            labelAr: 'الشركة المصنعة',
            labelEn: 'Brand',
            value: getBrandDisplayName(listing.brand, lang),
          },
          {
            labelAr: 'الموديل',
            labelEn: 'Model',
            value: listing.model,
            ltr: true,
          },
          {
            labelAr: 'سنة الإصدار',
            labelEn: 'Release Year',
            value: String(specs.release_year),
            ltr: true,
          },
          {
            labelAr: 'السلسلة',
            labelEn: 'Series',
            value: specs.series,
          },
        ],
      },
      {
        id: 'display',
        titleAr: 'الشاشة',
        titleEn: 'Display',
        icon: <Smartphone className="w-3.5 h-3.5 text-[#2D6145]" />,
        rows: [
          {
            labelAr: 'مقاس الشاشة',
            labelEn: 'Screen Size',
            value: `${specs.display.size_inches}"`,
            ltr: true,
          },
          {
            labelAr: 'نوع الشاشة',
            labelEn: 'Panel Type',
            value: specs.display.type,
            ltr: true,
          },
          {
            labelAr: 'الدقة',
            labelEn: 'Resolution',
            value: specs.display.resolution,
            ltr: true,
          },
          {
            labelAr: 'معدل التحديث',
            labelEn: 'Refresh Rate',
            value: `${specs.display.refresh_rate_hz} Hz`,
            ltr: true,
          },
        ],
      },
      {
        id: 'performance',
        titleAr: 'الأداء',
        titleEn: 'Performance',
        icon: <Cpu className="w-3.5 h-3.5 text-[#2D6145]" />,
        rows: [
          {
            labelAr: 'المعالج',
            labelEn: 'Chipset',
            value: specs.performance.chipset,
            ltr: true,
          },
          {
            labelAr: 'نظام التشغيل',
            labelEn: 'Operating System',
            value: specs.performance.os,
            ltr: true,
          },
          {
            labelAr: 'الذاكرة العشوائية (رام)',
            labelEn: 'RAM',
            value: `${listing.ramGb ?? 8} GB`,
            ltr: true,
          },
          {
            labelAr: 'مساحة التخزين',
            labelEn: 'Internal Storage',
            value: `${listing.storageGb} GB`,
            ltr: true,
          },
        ],
      },
      {
        id: 'cameras',
        titleAr: 'الكاميرات',
        titleEn: 'Cameras',
        icon: <Camera className="w-3.5 h-3.5 text-[#2D6145]" />,
        rows: [
          {
            labelAr: 'الكاميرا الخلفية',
            labelEn: 'Rear Camera',
            value: specs.camera.rear,
            ltr: true,
          },
          {
            labelAr: 'المثبت البصري',
            labelEn: 'Optical Stabilization (OIS)',
            value: yesNo(specs.camera.rear_ois, lang),
          },
          {
            labelAr: 'الكاميرا الأمامية',
            labelEn: 'Front Camera',
            value: specs.camera.front,
            ltr: true,
          },
          {
            labelAr: 'تصوير الفيديو',
            labelEn: 'Video Recording',
            value: specs.camera.video,
            ltr: true,
          },
        ],
      },
      {
        id: 'battery',
        titleAr: 'البطارية والشحن',
        titleEn: 'Battery & Charging',
        icon: <Battery className="w-3.5 h-3.5 text-[#2D6145]" />,
        rows: batteryRows,
      },
      {
        id: 'connectivity',
        titleAr: 'الاتصال والمنافذ',
        titleEn: 'Connectivity & Ports',
        icon: <Wifi className="w-3.5 h-3.5 text-[#2D6145]" />,
        rows: [
          {
            labelAr: 'الشبكة',
            labelEn: 'Network',
            value: specs.connectivity.network,
            ltr: true,
          },
          {
            labelAr: 'الشرائح',
            labelEn: 'SIM Card',
            value: specs.connectivity.sim,
            ltr: true,
          },
          {
            labelAr: 'تقنية NFC',
            labelEn: 'NFC',
            value: yesNo(specs.connectivity.nfc, lang),
          },
          {
            labelAr: 'منفذ الشحن',
            labelEn: 'USB Port',
            value: specs.connectivity.usb,
            ltr: true,
          },
          {
            labelAr: 'منفذ السماعات',
            labelEn: '3.5mm Headphone Jack',
            value: yesNo(specs.connectivity.headphone_jack, lang),
          },
          {
            labelAr: 'كرت الذاكرة',
            labelEn: 'Memory Card (microSD)',
            value: yesNo(specs.connectivity.microsd, lang),
          },
        ],
      },
      {
        id: 'build',
        titleAr: 'الأمان والحماية',
        titleEn: 'Security & Build',
        icon: <Shield className="w-3.5 h-3.5 text-[#2D6145]" />,
        rows: buildRows,
      },
    ];
  }, [listing, specs, lang]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-50 bg-[#102018]/45 backdrop-blur-[4px] flex flex-col justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="store-clay clay-sheet rounded-t-[30px] h-[88%] flex flex-col overflow-hidden"
          >
            {/* Drag Handle + Header */}
            <div className="pt-2.5 pb-3 px-4 border-b border-[#172B20]/[0.06] shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#172B20]/15 mx-auto mb-3" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#172B20] truncate">
                    {lang === 'ar' ? 'المواصفات الكاملة للجهاز' : 'Full Specifications'}
                  </h2>
                  <p className="text-[11px] text-[#5F776A] truncate mt-0.5">
                    {formatListingTitle(listing.arabicBrandPrefix, listing.model, lang)} ·{' '}
                    <span dir="ltr" className="font-mono-num">
                      {listing.ramGb ? `${listing.ramGb} GB / ` : ''}
                      {listing.storageGb} GB
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                  className="clay-pill clay-focus-ring w-9 h-9 rounded-full flex items-center justify-center text-[#172B20] shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Categorized Specification Cards */}
            <div className="flex-1 overflow-y-auto thin-scroll px-4 py-3.5 space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="clay-card rounded-[24px] p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 px-0.5">
                    <div className="w-7 h-7 rounded-[11px] clay-inset flex items-center justify-center shrink-0">
                      {section.icon}
                    </div>
                    <h3 className="text-xs font-bold text-[#172B20]">
                      {lang === 'ar' ? section.titleAr : section.titleEn}
                    </h3>
                  </div>

                  <div className="divide-y divide-[#172B20]/[0.06] rounded-[18px] clay-inset px-3">
                    {section.rows.map((row) => (
                      <div
                        key={row.labelEn}
                        className="py-2.5 flex items-start justify-between gap-3 text-[11.5px]"
                      >
                        <span className="text-[#5E7669] font-medium shrink-0 max-w-[46%]">
                          {lang === 'ar' ? row.labelAr : row.labelEn}
                        </span>
                        <span
                          dir={row.ltr ? 'ltr' : undefined}
                          className={`font-bold text-[#172B20] text-end leading-snug ${
                            row.ltr ? 'font-mono-num' : ''
                          }`}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Sticky CTA to launch Detailed Comparison */}
            <div className="p-3.5 border-t border-[#172B20]/[0.06] bg-[#EEF3F0]/90 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDetailedCompare();
                }}
                className="clay-primary-btn clay-focus-ring w-full h-11 rounded-full text-xs font-bold flex items-center justify-center gap-2"
              >
                <GitCompareArrows className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? 'قارن هذه المواصفات مع هاتف آخر'
                    : 'Compare Specs With Another Phone'}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ComparisonSpecRow {
  id: string;
  labelAr: string;
  labelEn: string;
  valA: string;
  valB: string;
  verdictA: CompareVerdict;
  verdictB: CompareVerdict;
  /** When true (e.g. Price), lower numeric value is better — so better gets a green downward arrow and worse gets a red upward arrow */
  lowerIsBetter?: boolean;
  ltr?: boolean;
}

interface ComparisonSection {
  id: string;
  titleAr: string;
  titleEn: string;
  rows: ComparisonSpecRow[];
}

/**
 * 3. Detailed Spec-by-Spec Phone Comparison Screen (Beyond Price)
 * Highlights winning values in emerald green with arrows and weaker values in red with arrows.
 */
export function CustomerDetailedPhoneCompare({
  primaryListingId,
  initialSecondaryListingId,
  onBack,
  onOpenListing,
  onContactSeller,
}: {
  primaryListingId: string;
  initialSecondaryListingId?: string;
  onBack: () => void;
  onOpenListing: (listingId: string) => void;
  onContactSeller: (listing: Listing, store: Store) => void;
}) {
  const {
    lang,
    publicListings,
    listings,
    reviews,
    getStoreById,
    getPhoneModelRatingSummary,
    getStoreRatingSummary,
  } = usePrototype();
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const pool = publicListings.length > 0 ? publicListings : listings;

  const [phoneAId, setPhoneAId] = useState<string>(primaryListingId);
  const [phoneBId, setPhoneBId] = useState<string>(() => {
    if (initialSecondaryListingId && initialSecondaryListingId !== primaryListingId) {
      return initialSecondaryListingId;
    }
    const primary = pool.find((l) => l.id === primaryListingId);
    // Pick a compelling different model from the catalog by default so hardware differences shine immediately
    const differentModel = pool.find(
      (l) => l.id !== primaryListingId && (!primary || l.model !== primary.model)
    );
    return differentModel?.id ?? pool.find((l) => l.id !== primaryListingId)?.id ?? primaryListingId;
  });

  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<'A' | 'B' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const phoneA = pool.find((l) => l.id === phoneAId) ?? pool[0];
  const phoneB = pool.find((l) => l.id === phoneBId) ?? pool[1] ?? pool[0];
  const storeA = phoneA ? getStoreById(phoneA.storeId) : undefined;
  const storeB = phoneB ? getStoreById(phoneB.storeId) : undefined;

  // Deduplicate picker options neatly by variant+condition+store so the picker is easy to browse
  const pickerOptions = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return pool.filter((l) => {
      if (!q) return true;
      const st = getStoreById(l.storeId);
      const hay = `${l.model} ${l.arabicBrandPrefix} ${l.brand} ${l.storageGb}gb ${st?.name.ar ?? ''} ${st?.name.en ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [pool, pickerQuery, getStoreById]);

  const { sections, winsA, winsB, lossesA, lossesB } = useMemo(() => {
    if (!phoneA || !phoneB) {
      return { sections: [] as ComparisonSection[], winsA: 0, winsB: 0, lossesA: 0, lossesB: 0 };
    }
    const specA = getPhoneSpecifications(phoneA);
    const specB = getPhoneSpecifications(phoneB);

    const makeRow = (
      id: string,
      labelAr: string,
      labelEn: string,
      valA: string,
      valB: string,
      verdicts: [CompareVerdict, CompareVerdict],
      opts?: { lowerIsBetter?: boolean; ltr?: boolean }
    ): ComparisonSpecRow => ({
      id,
      labelAr,
      labelEn,
      valA,
      valB,
      verdictA: verdicts[0],
      verdictB: verdicts[1],
      lowerIsBetter: opts?.lowerIsBetter,
      ltr: opts?.ltr,
    });

    const ramA = phoneA.ramGb ?? 8;
    const ramB = phoneB.ramGb ?? 8;

    const batteryRows: ComparisonSpecRow[] = [
      makeRow(
        'battery_mah',
        'سعة البطارية',
        'Battery Capacity',
        `${specA.battery.capacity_mah} mAh`,
        `${specB.battery.capacity_mah} mAh`,
        evaluateNumericVerdict(specA.battery.capacity_mah, specB.battery.capacity_mah, 'higher'),
        { ltr: true }
      ),
    ];

    if (specA.battery.charging_wired_w > 0 || specB.battery.charging_wired_w > 0) {
      batteryRows.push(
        makeRow(
          'wired_w',
          'الشحن السريع السلكي',
          'Fast Charging (Wired)',
          specA.battery.charging_wired_w > 0
            ? `${specA.battery.charging_wired_w} W`
            : lang === 'ar'
              ? 'غير متوفر'
              : '—',
          specB.battery.charging_wired_w > 0
            ? `${specB.battery.charging_wired_w} W`
            : lang === 'ar'
              ? 'غير متوفر'
              : '—',
          evaluateNumericVerdict(
            specA.battery.charging_wired_w,
            specB.battery.charging_wired_w,
            'higher'
          ),
          { ltr: true }
        )
      );
    }

    if (specA.battery.charging_wireless_w > 0 || specB.battery.charging_wireless_w > 0) {
      batteryRows.push(
        makeRow(
          'wireless_w',
          'الشحن اللاسلكي',
          'Wireless Charging',
          specA.battery.charging_wireless_w > 0
            ? `${specA.battery.charging_wireless_w} W`
            : lang === 'ar'
              ? 'لا يدعم'
              : 'No',
          specB.battery.charging_wireless_w > 0
            ? `${specB.battery.charging_wireless_w} W`
            : lang === 'ar'
              ? 'لا يدعم'
              : 'No',
          evaluateNumericVerdict(
            specA.battery.charging_wireless_w,
            specB.battery.charging_wireless_w,
            'higher'
          ),
          { ltr: specA.battery.charging_wireless_w > 0 && specB.battery.charging_wireless_w > 0 }
        )
      );
    }

    const buildRows: ComparisonSpecRow[] = [
      makeRow(
        'biometrics',
        'البصمة / الأمان',
        'Biometrics',
        specA.build.fingerprint,
        specB.build.fingerprint,
        ['equal', 'equal']
      ),
    ];

    const ipScoreA = scoreIpRating(specA.build.ip_rating);
    const ipScoreB = scoreIpRating(specB.build.ip_rating);
    if (ipScoreA > 0 || ipScoreB > 0) {
      buildRows.push(
        makeRow(
          'ip_rating',
          'مقاومة الماء والغبار',
          'Water & Dust Resistance',
          ipScoreA > 0 ? specA.build.ip_rating : lang === 'ar' ? 'بدون تصنيف' : 'None',
          ipScoreB > 0 ? specB.build.ip_rating : lang === 'ar' ? 'بدون تصنيف' : 'None',
          evaluateNumericVerdict(ipScoreA, ipScoreB, 'higher'),
          { ltr: ipScoreA > 0 && ipScoreB > 0 }
        )
      );
    }

    const warrantyA =
      phoneA.condition === 'new'
        ? `${phoneA.warrantyMonths ?? 0} ${lang === 'ar' ? 'شهراً' : 'mo'}`
        : `${phoneA.inspectionWarrantyDays ?? 0} ${lang === 'ar' ? 'أيام' : 'days'}`;
    const warrantyB =
      phoneB.condition === 'new'
        ? `${phoneB.warrantyMonths ?? 0} ${lang === 'ar' ? 'شهراً' : 'mo'}`
        : `${phoneB.inspectionWarrantyDays ?? 0} ${lang === 'ar' ? 'أيام' : 'days'}`;

    const phoneRatingA = getPhoneModelRatingSummary(phoneA.brand, phoneA.model);
    const phoneRatingB = getPhoneModelRatingSummary(phoneB.brand, phoneB.model);
    const storeRatingA = getStoreRatingSummary(phoneA.storeId);
    const storeRatingB = getStoreRatingSummary(phoneB.storeId);

    const allSections: ComparisonSection[] = [
      {
        id: 'value',
        titleAr: 'السعر والتقييم',
        titleEn: 'Price & Ratings',
        rows: [
          makeRow(
            'price',
            'السعر',
            'Price',
            formatSdg(phoneA.priceSdg, lang),
            formatSdg(phoneB.priceSdg, lang),
            evaluateNumericVerdict(phoneA.priceSdg, phoneB.priceSdg, 'lower'),
            { lowerIsBetter: true, ltr: true }
          ),
          makeRow(
            'phone_rating',
            'تقييم الهاتف',
            'Phone Rating',
            `★ ${phoneRatingA.average.toFixed(1)} (${phoneRatingA.count})`,
            `★ ${phoneRatingB.average.toFixed(1)} (${phoneRatingB.count})`,
            evaluateNumericVerdict(phoneRatingA.average, phoneRatingB.average, 'higher'),
            { ltr: true }
          ),
          makeRow(
            'store_rating',
            'تقييم المتجر',
            'Store Rating',
            `★ ${storeRatingA.average.toFixed(1)} (${storeRatingA.count})`,
            `★ ${storeRatingB.average.toFixed(1)} (${storeRatingB.count})`,
            evaluateNumericVerdict(storeRatingA.average, storeRatingB.average, 'higher'),
            { ltr: true }
          ),
          makeRow(
            'condition',
            'الحالة',
            'Condition',
            formatCondition(phoneA.condition, lang),
            formatCondition(phoneB.condition, lang),
            evaluateNumericVerdict(
              phoneA.condition === 'new' ? 2 : 1,
              phoneB.condition === 'new' ? 2 : 1,
              'higher'
            )
          ),
          makeRow(
            'warranty',
            'الضمان',
            'Warranty',
            warrantyA,
            warrantyB,
            evaluateNumericVerdict(scoreWarrantyDays(phoneA), scoreWarrantyDays(phoneB), 'higher')
          ),
        ],
      },
      {
        id: 'display',
        titleAr: 'الشاشة',
        titleEn: 'Display',
        rows: [
          makeRow(
            'screen_size',
            'مقاس الشاشة',
            'Screen Size',
            `${specA.display.size_inches}"`,
            `${specB.display.size_inches}"`,
            evaluateNumericVerdict(specA.display.size_inches, specB.display.size_inches, 'higher'),
            { ltr: true }
          ),
          makeRow(
            'refresh_rate',
            'معدل التحديث',
            'Refresh Rate',
            `${specA.display.refresh_rate_hz} Hz`,
            `${specB.display.refresh_rate_hz} Hz`,
            evaluateNumericVerdict(
              specA.display.refresh_rate_hz,
              specB.display.refresh_rate_hz,
              'higher'
            ),
            { ltr: true }
          ),
          makeRow(
            'resolution',
            'الدقة',
            'Resolution',
            specA.display.resolution,
            specB.display.resolution,
            evaluateNumericVerdict(
              parseResolutionPixels(specA.display.resolution),
              parseResolutionPixels(specB.display.resolution),
              'higher'
            ),
            { ltr: true }
          ),
          makeRow(
            'panel_type',
            'نوع الشاشة',
            'Panel Type',
            specA.display.type,
            specB.display.type,
            ['equal', 'equal'],
            { ltr: true }
          ),
        ],
      },
      {
        id: 'performance',
        titleAr: 'الأداء والذاكرة',
        titleEn: 'Performance & Memory',
        rows: [
          makeRow(
            'chipset',
            'المعالج',
            'Chipset',
            specA.performance.chipset,
            specB.performance.chipset,
            evaluateNumericVerdict(
              scoreChipsetTier(specA.performance.chipset),
              scoreChipsetTier(specB.performance.chipset),
              'higher'
            ),
            { ltr: true }
          ),
          makeRow(
            'ram',
            'الذاكرة العشوائية (رام)',
            'RAM',
            `${ramA} GB`,
            `${ramB} GB`,
            evaluateNumericVerdict(ramA, ramB, 'higher'),
            { ltr: true }
          ),
          makeRow(
            'storage',
            'مساحة التخزين',
            'Internal Storage',
            `${phoneA.storageGb} GB`,
            `${phoneB.storageGb} GB`,
            evaluateNumericVerdict(phoneA.storageGb, phoneB.storageGb, 'higher'),
            { ltr: true }
          ),
          makeRow(
            'release_year',
            'سنة الإصدار',
            'Release Year',
            String(specA.release_year),
            String(specB.release_year),
            evaluateNumericVerdict(specA.release_year, specB.release_year, 'higher'),
            { ltr: true }
          ),
          makeRow(
            'os',
            'نظام التشغيل',
            'Operating System',
            specA.performance.os,
            specB.performance.os,
            ['equal', 'equal'],
            { ltr: true }
          ),
        ],
      },
      {
        id: 'cameras',
        titleAr: 'الكاميرات',
        titleEn: 'Cameras',
        rows: [
          makeRow(
            'rear_main_mp',
            'الكاميرا الرئيسية',
            'Main Camera',
            `${specA.camera.rear_main_mp} MP`,
            `${specB.camera.rear_main_mp} MP`,
            evaluateNumericVerdict(specA.camera.rear_main_mp, specB.camera.rear_main_mp, 'higher'),
            { ltr: true }
          ),
          makeRow(
            'rear_ois',
            'المثبت البصري (OIS)',
            'Optical Stabilization',
            yesNo(specA.camera.rear_ois, lang),
            yesNo(specB.camera.rear_ois, lang),
            evaluateNumericVerdict(
              specA.camera.rear_ois ? 1 : 0,
              specB.camera.rear_ois ? 1 : 0,
              'higher'
            )
          ),
          makeRow(
            'front_cam',
            'الكاميرا الأمامية',
            'Front Camera',
            specA.camera.front,
            specB.camera.front,
            evaluateNumericVerdict(
              parseFrontCameraMp(specA.camera.front),
              parseFrontCameraMp(specB.camera.front),
              'higher'
            ),
            { ltr: true }
          ),
          makeRow(
            'video',
            'تصوير الفيديو',
            'Video Recording',
            specA.camera.video,
            specB.camera.video,
            evaluateNumericVerdict(
              scoreVideo(specA.camera.video),
              scoreVideo(specB.camera.video),
              'higher'
            ),
            { ltr: true }
          ),
          makeRow(
            'rear_full',
            'تفاصيل العدسات الخلفية',
            'Rear Camera Setup',
            specA.camera.rear,
            specB.camera.rear,
            ['equal', 'equal'],
            { ltr: true }
          ),
        ],
      },
      {
        id: 'battery',
        titleAr: 'البطارية والشحن',
        titleEn: 'Battery & Charging',
        rows: batteryRows,
      },
      {
        id: 'connectivity',
        titleAr: 'الاتصال والمنافذ',
        titleEn: 'Connectivity & Ports',
        rows: [
          makeRow(
            'network',
            'الشبكة',
            'Network',
            specA.connectivity.network,
            specB.connectivity.network,
            evaluateNumericVerdict(
              scoreNetwork(specA.connectivity.network),
              scoreNetwork(specB.connectivity.network),
              'higher'
            ),
            { ltr: true }
          ),
          makeRow(
            'nfc',
            'تقنية NFC',
            'NFC',
            yesNo(specA.connectivity.nfc, lang),
            yesNo(specB.connectivity.nfc, lang),
            evaluateNumericVerdict(
              specA.connectivity.nfc ? 1 : 0,
              specB.connectivity.nfc ? 1 : 0,
              'higher'
            )
          ),
          makeRow(
            'usb',
            'منفذ الشحن',
            'USB Port',
            specA.connectivity.usb,
            specB.connectivity.usb,
            evaluateNumericVerdict(
              scoreUsb(specA.connectivity.usb),
              scoreUsb(specB.connectivity.usb),
              'higher'
            ),
            { ltr: true }
          ),
          makeRow(
            'headphone_jack',
            'منفذ السماعات 3.5mm',
            '3.5mm Jack',
            yesNo(specA.connectivity.headphone_jack, lang),
            yesNo(specB.connectivity.headphone_jack, lang),
            evaluateNumericVerdict(
              specA.connectivity.headphone_jack ? 1 : 0,
              specB.connectivity.headphone_jack ? 1 : 0,
              'higher'
            )
          ),
          makeRow(
            'microsd',
            'كرت الذاكرة (microSD)',
            'microSD Card',
            yesNo(specA.connectivity.microsd, lang),
            yesNo(specB.connectivity.microsd, lang),
            evaluateNumericVerdict(
              specA.connectivity.microsd ? 1 : 0,
              specB.connectivity.microsd ? 1 : 0,
              'higher'
            )
          ),
          makeRow(
            'sim',
            'الشرائح',
            'SIM Card',
            specA.connectivity.sim,
            specB.connectivity.sim,
            ['equal', 'equal'],
            { ltr: true }
          ),
        ],
      },
      {
        id: 'build',
        titleAr: 'الأمان والحماية',
        titleEn: 'Security & Build',
        rows: buildRows,
      },
    ];

    let wA = 0;
    let wB = 0;
    let lA = 0;
    let lB = 0;
    for (const sec of allSections) {
      for (const r of sec.rows) {
        if (r.verdictA === 'better') wA += 1;
        if (r.verdictA === 'worse') lA += 1;
        if (r.verdictB === 'better') wB += 1;
        if (r.verdictB === 'worse') lB += 1;
      }
    }

    return { sections: allSections, winsA: wA, winsB: wB, lossesA: lA, lossesB: lB };
  }, [phoneA, phoneB, lang, reviews]);

  const visibleSections = useMemo(() => {
    if (!onlyDifferences) return sections;
    return sections
      .map((s) => ({
        ...s,
        rows: s.rows.filter((r) => r.verdictA !== 'equal' || r.valA !== r.valB),
      }))
      .filter((s) => s.rows.length > 0);
  }, [sections, onlyDifferences]);

  if (!phoneA || !phoneB) return null;

  const renderVerdictCell = (
    value: string,
    verdict: CompareVerdict,
    opts?: { lowerIsBetter?: boolean; ltr?: boolean }
  ) => {
    const isBetter = verdict === 'better';
    const isWorse = verdict === 'worse';

    const containerClass = isBetter
      ? 'bg-[#E2F5E9] border border-[#1E8A4C]/25 text-[#135B33]'
      : isWorse
        ? 'bg-[#FDECEC] border border-[#C92A38]/22 text-[#A61C2B]'
        : 'bg-[#E9EFEA]/75 border border-transparent text-[#385043]';

    // Arrow direction matches reality AND color signals better (green) vs worse (red)
    const ArrowIcon = isBetter
      ? opts?.lowerIsBetter
        ? ArrowDown
        : ArrowUp
      : isWorse
        ? opts?.lowerIsBetter
          ? ArrowUp
          : ArrowDown
        : null;

    const arrowBadgeClass = isBetter
      ? 'bg-[#1A8449] text-white'
      : 'bg-[#C92A38] text-white';

    return (
      <div
        className={`rounded-[14px] px-2.5 py-2 flex items-start justify-between gap-1.5 min-w-0 transition-colors ${containerClass}`}
      >
        <span
          dir={opts?.ltr ? 'ltr' : undefined}
          className={`text-[11px] font-bold leading-snug break-words min-w-0 ${
            opts?.ltr ? 'font-mono-num' : ''
          }`}
        >
          {value}
        </span>
        {ArrowIcon && (
          <span
            aria-label={isBetter ? (lang === 'ar' ? 'أفضل' : 'Better') : lang === 'ar' ? 'أقل' : 'Worse'}
            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${arrowBadgeClass}`}
          >
            <ArrowIcon className="w-2.5 h-2.5 stroke-[2.8]" />
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="store-clay flex flex-col h-full relative">
      {/* Top Sticky Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 h-[58px] px-4 clay-topbar shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
            className="clay-pill clay-focus-ring w-10 h-10 rounded-full flex items-center justify-center text-[#172B20] shrink-0"
          >
            <BackIcon className="w-4.5 h-4.5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#172B20] truncate">
              {lang === 'ar' ? 'مقارنة المواصفات التفصيلية' : 'Detailed Specs Compare'}
            </h1>
            <p className="text-[10.5px] text-[#60786B] truncate">
              {lang === 'ar'
                ? 'مقارنة شاملة للمواصفات والأداء والسعر'
                : 'Hardware, camera, battery & price side-by-side'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setPhoneAId(phoneB.id);
            setPhoneBId(phoneA.id);
          }}
          aria-label={lang === 'ar' ? 'تبديل الجهازين' : 'Swap phones'}
          title={lang === 'ar' ? 'تبديل الجهازين' : 'Swap phones'}
          className="clay-pill clay-focus-ring w-9 h-9 rounded-full flex items-center justify-center text-[#245A3D] shrink-0"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Comparison Body */}
      <div className="flex-1 overflow-y-auto thin-scroll px-3.5 pt-2.5 pb-8 space-y-3.5">
        {/* Dual Phone Selector Cards + Win/Loss Summary */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { slot: 'A' as const, item: phoneA, store: storeA, wins: winsA, losses: lossesA },
            { slot: 'B' as const, item: phoneB, store: storeB, wins: winsB, losses: lossesB },
          ].map(({ slot, item, store, wins, losses }) => (
            <div
              key={slot}
              className="clay-card rounded-[24px] p-2.5 flex flex-col justify-between gap-2"
            >
              <div className="flex items-start gap-2 min-w-0">
                <SafeImage
                  clay
                  src={item.photos[0]?.url}
                  alt={item.model}
                  aspectClass="w-12 h-12 rounded-[13px] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-bold text-[#15281E] leading-tight line-clamp-2">
                    {formatListingTitle(item.arabicBrandPrefix, item.model, lang)}
                  </p>
                  <p className="text-[11px] font-extrabold text-[#1E5637] font-mono-num mt-0.5 truncate">
                    {formatSdg(item.priceSdg, lang)}
                  </p>
                </div>
              </div>

              {/* Green Better / Red Worse Score Tally */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#E2F5E9] text-[#146036] font-mono-num">
                  <ArrowUp className="w-2.5 h-2.5 stroke-[2.8]" />
                  {wins} {lang === 'ar' ? 'أفضل' : 'better'}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FDECEC] text-[#A81E2D] font-mono-num">
                  <ArrowDown className="w-2.5 h-2.5 stroke-[2.8]" />
                  {losses} {lang === 'ar' ? 'أقل' : 'worse'}
                </span>
              </div>

              {store && (
                <p className="text-[10px] text-[#60786B] truncate flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#2D6145] shrink-0" />
                  <span className="truncate">{tText(store.name, lang)}</span>
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setPickerQuery('');
                  setPickerSlot(slot);
                }}
                className="clay-pill clay-focus-ring w-full h-8 rounded-full text-[10.5px] font-bold text-[#1E4530]"
              >
                {lang === 'ar' ? 'تغيير الهاتف' : 'Change Phone'}
              </button>
            </div>
          ))}
        </div>

        {/* Legend + Differences-Only Filter Switch */}
        <div className="clay-card rounded-[20px] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[10.5px] font-semibold">
            <span className="inline-flex items-center gap-1 text-[#146036]">
              <span className="w-4 h-4 rounded-full bg-[#1A8449] text-white inline-flex items-center justify-center">
                <ArrowUp className="w-2.5 h-2.5 stroke-[2.8]" />
              </span>
              {lang === 'ar' ? 'أفضل' : 'Better'}
            </span>
            <span className="inline-flex items-center gap-1 text-[#A81E2D]">
              <span className="w-4 h-4 rounded-full bg-[#C92A38] text-white inline-flex items-center justify-center">
                <ArrowDown className="w-2.5 h-2.5 stroke-[2.8]" />
              </span>
              {lang === 'ar' ? 'أقل' : 'Worse'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOnlyDifferences((v) => !v)}
            className={`h-7 px-3 rounded-full text-[10.5px] font-bold transition-all ${
              onlyDifferences
                ? 'clay-pill-active text-[#16452B]'
                : 'clay-inset text-[#546E60]'
            }`}
          >
            {onlyDifferences
              ? lang === 'ar'
                ? 'عرض الاختلافات فقط'
                : 'Differences only'
              : lang === 'ar'
                ? 'كل المواصفات'
                : 'All specs'}
          </button>
        </div>

        {/* Side-by-Side Detailed Spec Sections */}
        {visibleSections.length === 0 ? (
          <div className="clay-card rounded-[24px] p-6 text-center text-xs text-[#5E7669]">
            {lang === 'ar'
              ? 'الهاتفان متطابقان تماماً في جميع المواصفات المختارة.'
              : 'Both phones have identical specifications across all categories.'}
          </div>
        ) : (
          visibleSections.map((section) => (
            <div key={section.id} className="clay-card rounded-[24px] p-3.5 space-y-2.5">
              <h2 className="text-xs font-bold text-[#172B20] px-0.5">
                {lang === 'ar' ? section.titleAr : section.titleEn}
              </h2>

              <div className="space-y-2">
                {section.rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-[18px] bg-[#F5F9F6]/85 border border-[#172B20]/[0.05] p-2 space-y-1.5"
                  >
                    <p className="text-[10px] font-semibold text-[#5E7669] px-1">
                      {lang === 'ar' ? row.labelAr : row.labelEn}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {renderVerdictCell(row.valA, row.verdictA, {
                        lowerIsBetter: row.lowerIsBetter,
                        ltr: row.ltr,
                      })}
                      {renderVerdictCell(row.valB, row.verdictB, {
                        lowerIsBetter: row.lowerIsBetter,
                        ltr: row.ltr,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Quick Actions Footer for Both Phones */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {[
            { item: phoneA, store: storeA },
            { item: phoneB, store: storeB },
          ].map(({ item, store }, idx) => (
            <div key={`${item.id}-${idx}`} className="clay-card rounded-[22px] p-2.5 space-y-2">
              <p className="text-[11px] font-bold text-[#172B20] truncate px-0.5">
                {item.model}
              </p>
              <button
                type="button"
                onClick={() => onOpenListing(item.id)}
                className="clay-pill clay-focus-ring w-full h-9 rounded-full text-[11px] font-bold text-[#172B20]"
              >
                {lang === 'ar' ? 'فتح الإعلان' : 'View Listing'}
              </button>
              {store && (
                <button
                  type="button"
                  onClick={() => onContactSeller(item, store)}
                  className="clay-primary-btn clay-focus-ring w-full h-9 rounded-full text-[11px] font-bold flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تواصل' : 'Contact'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Searchable Phone Picker Modal Sheet */}
      <AnimatePresence>
        {pickerSlot !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 z-50 bg-[#102018]/45 backdrop-blur-[4px] flex flex-col justify-end"
            onClick={() => setPickerSlot(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="store-clay clay-sheet rounded-t-[30px] h-[78%] flex flex-col overflow-hidden"
            >
              <div className="pt-2.5 pb-3 px-4 border-b border-[#172B20]/[0.06] space-y-2.5 shrink-0">
                <div className="w-10 h-1 rounded-full bg-[#172B20]/15 mx-auto" />
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#172B20]">
                    {lang === 'ar'
                      ? pickerSlot === 'A'
                        ? 'اختر الهاتف الأول للمقارنة'
                        : 'اختر الهاتف الثاني للمقارنة'
                      : pickerSlot === 'A'
                        ? 'Select First Phone'
                        : 'Select Second Phone'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPickerSlot(null)}
                    aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                    className="clay-pill clay-focus-ring w-9 h-9 rounded-full flex items-center justify-center text-[#172B20]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-[#6B8276] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder={
                      lang === 'ar' ? 'ابحث باسم الموديل أو الماركة...' : 'Search model or brand...'
                    }
                    className="w-full h-10 ps-10 pe-4 rounded-[18px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto thin-scroll p-3.5 space-y-2">
                {pickerOptions.map((item) => {
                  const st = getStoreById(item.storeId);
                  const isSelected =
                    (pickerSlot === 'A' && item.id === phoneA.id) ||
                    (pickerSlot === 'B' && item.id === phoneB.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (pickerSlot === 'A') {
                          setPhoneAId(item.id);
                        } else {
                          setPhoneBId(item.id);
                        }
                        setPickerSlot(null);
                      }}
                      className={`w-full rounded-[20px] p-2.5 flex items-center justify-between gap-2.5 text-start transition-all ${
                        isSelected ? 'clay-card-tint' : 'clay-card-interactive'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SafeImage
                          clay
                          src={item.photos[0]?.url}
                          alt={item.model}
                          aspectClass="w-11 h-11 rounded-[12px] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#172B20] truncate">
                            {formatListingTitle(item.arabicBrandPrefix, item.model, lang)}
                          </p>
                          <p className="text-[10.5px] text-[#5E7669] truncate mt-0.5">
                            {formatCondition(item.condition, lang)} ·{' '}
                            <span dir="ltr" className="font-mono-num">
                              {item.storageGb} GB
                            </span>
                            {st ? ` · ${formatCity(st.city, lang)}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-[#1E5637] font-mono-num">
                          {formatSdg(item.priceSdg, lang)}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#245A3D] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
