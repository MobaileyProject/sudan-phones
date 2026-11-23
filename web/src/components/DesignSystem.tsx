import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ImageOff,
  Info,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { BrandId, Language, PublicationStatus, VerificationStatus } from '../types';
import { formatPublicationStatus, formatVerificationStatus, tText } from '../i18n/translations';
import { usePrototype } from '../store/PrototypeContext';

/**
 * Minimalist Studio Vector Brand Logos for Sudan Phones Catalog
 */
export function BrandLogo({
  brandId,
  className = 'w-6 h-6',
}: {
  brandId: BrandId;
  className?: string;
}) {
  switch (brandId) {
    case 'apple':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M16.65 12.71c-.02-2.08 1.7-3.09 1.78-3.14-.97-1.42-2.48-1.61-3.01-1.63-1.27-.13-2.5.76-3.15.76-.66 0-1.65-.74-2.72-.72-1.39.02-2.68.82-3.4 2.06-1.46 2.53-.37 6.27 1.04 8.32.69 1 1.51 2.12 2.59 2.08 1.04-.04 1.44-.67 2.7-.67 1.25 0 1.61.67 2.7.65 1.12-.02 1.83-1.01 2.51-2.02.8-1.16 1.12-2.3 1.14-2.36-.03-.01-2.16-.83-2.18-3.33z" />
          <path d="M14.59 6.62c.57-.7.96-1.66.85-2.62-.83.03-1.85.56-2.44 1.25-.52.61-.99 1.59-.86 2.53.93.07 1.88-.47 2.45-1.16z" />
        </svg>
      );

    case 'google':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.41-1.43 4.13-5.51 4.13-3.32 0-6.02-2.75-6.02-6.13s2.7-6.13 6.02-6.13c1.89 0 3.15.81 3.88 1.5l2.64-2.55C16.99 3.06 14.8 2 12.17 2 6.65 2 2.17 6.48 2.17 12s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.77 0-.66-.07-1.16-.17-1.63z" />
        </svg>
      );

    case 'xiaomi':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
          <rect
            x="2.2"
            y="2.2"
            width="19.6"
            height="19.6"
            rx="5.6"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            fill="currentColor"
            d="M6.4 16.4V8.8h5.1c1.3 0 2.25.9 2.25 2.2v5.4h-1.85v-4.95c0-.5-.32-.85-.85-.85H8.25v5.8H6.4z"
          />
          <rect x="9.35" y="12.1" width="1.7" height="4.3" rx="0.3" fill="currentColor" />
          <rect x="15.75" y="8.8" width="1.85" height="7.6" rx="0.3" fill="currentColor" />
        </svg>
      );

    case 'oneplus':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
          <path
            d="M13.8 4.2H6a1.8 1.8 0 0 0-1.8 1.8v12A1.8 1.8 0 0 0 6 19.8h12a1.8 1.8 0 0 0 1.8-1.8v-7.8"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.8 3.6v4.8M15.4 6h4.8"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M10.1 10.1h1.9v6.1M10.1 16.2h3.8"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'samsung':
      return (
        <svg viewBox="0 0 46 24" fill="none" aria-hidden="true" className={className}>
          <ellipse
            cx="23"
            cy="12"
            rx="20.5"
            ry="8.8"
            transform="rotate(-10 23 12)"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.32"
          />
          <text
            x="23"
            y="14.7"
            textAnchor="middle"
            fill="currentColor"
            fontSize="8.2"
            fontWeight="800"
            letterSpacing="0.55"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          >
            SAMSUNG
          </text>
        </svg>
      );

    case 'tecno':
      return (
        <svg viewBox="0 0 44 24" fill="none" aria-hidden="true" className={className}>
          <text
            x="22"
            y="15.2"
            textAnchor="middle"
            fill="currentColor"
            fontSize="10"
            fontWeight="800"
            letterSpacing="0.7"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          >
            TECNO
          </text>
          <path
            d="M6.5 18.2h31"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.32"
          />
        </svg>
      );

    case 'infinix':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M4.2 5.2h4.1l3.7 6.8-3.7 6.8H4.2L7.9 12 4.2 5.2z" />
          <path d="M19.8 5.2h-4.1L12 12l3.7 6.8h4.1L16.1 12l3.7-6.8z" opacity="0.82" />
        </svg>
      );

    default: {
      const initials = (brandId || '?').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?';
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
          <rect
            x="2.2"
            y="2.2"
            width="19.6"
            height="19.6"
            rx="6"
            stroke="currentColor"
            strokeWidth="1.6"
            opacity="0.35"
          />
          <text
            x="12"
            y="15.3"
            textAnchor="middle"
            fill="currentColor"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          >
            {initials}
          </text>
        </svg>
      );
    }
  }
}

/**
 * Resilient Product / Store Image with Zero-Broken-Image fallback & C-09 failure simulation
 */
export function SafeImage({
  src,
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
  label,
  dark = false,
  clay = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  aspectClass?: string;
  label?: string;
  dark?: boolean;
  clay?: boolean;
}) {
  const { sim, lang } = usePrototype();
  const [failed, setFailed] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);

  const showFallback = !src || failed || sim.brokenImages;

  if (showFallback) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden ${
          clay
            ? 'bg-[#E6EFEA] text-[#5B7266] shadow-[inset_0_2px_6px_rgba(28,56,41,0.08)]'
            : dark
              ? 'bg-white/[0.04] text-white/55 border border-white/[0.08]'
              : 'bg-slate-100 text-slate-500 border border-slate-200/80'
        } ${aspectClass} ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="flex flex-col items-center gap-1.5 px-3 text-center">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              clay
                ? 'clay-pill text-[#2D6145]'
                : dark
                  ? 'bg-white/[0.08] text-white/60'
                  : 'bg-slate-200/80 text-slate-500'
            }`}
          >
            {sim.brokenImages || failed ? <ImageOff className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </div>
          <span
            className={`text-[11px] font-medium line-clamp-1 ${
              clay ? 'text-[#4E6659]' : dark ? 'text-white/65' : 'text-slate-600'
            }`}
          >
            {label || (lang === 'ar' ? 'تعذّر تحميل الصورة' : 'Image unavailable')}
          </span>
          {failed && !sim.brokenImages && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFailed(false);
                setRetrySeed((n) => n + 1);
              }}
              className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline ${
                clay ? 'text-[#2D6145]' : dark ? 'text-emerald-300' : 'text-teal-700'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${
        clay ? 'bg-[#E8F0EC]' : dark ? 'bg-[#0F1715]' : 'bg-slate-100'
      } ${aspectClass} ${className}`}
    >
      <img
        key={`${src}-${retrySeed}`}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover ${sim.lowDataMode ? 'contrast-[0.96] saturate-[0.9]' : ''}`}
      />
    </div>
  );
}

/**
 * Accessible Semantic Status Label — ALWAYS pairs color with icon + explicit text (never color-only)
 */
export function VerificationStatusLabel({
  status,
  lang,
}: {
  status: VerificationStatus;
  lang: Language;
}) {
  const styles: Record<VerificationStatus, { text: string; icon: React.ReactNode }> = {
    verified: {
      text: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0" />,
    },
    submitted: {
      text: 'text-amber-800 bg-amber-50 border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    changes_requested: {
      text: 'text-orange-800 bg-orange-50 border-orange-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    draft: {
      text: 'text-slate-700 bg-slate-100 border-slate-200',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    suspended: {
      text: 'text-red-800 bg-red-50 border-red-200',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
    rejected: {
      text: 'text-red-900 bg-red-50 border-red-200',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
  };
  const cfg = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${cfg.text}`}
    >
      {cfg.icon}
      <span>{formatVerificationStatus(status, lang)}</span>
    </span>
  );
}

export function PublicationStatusLabel({
  status,
  lang,
}: {
  status: PublicationStatus;
  lang: Language;
}) {
  const styles: Record<PublicationStatus, { text: string; icon: React.ReactNode }> = {
    published: {
      text: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    processing: {
      text: 'text-blue-800 bg-blue-50 border-blue-200',
      icon: <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />,
    },
    draft: {
      text: 'text-slate-700 bg-slate-100 border-slate-200',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    needs_correction: {
      text: 'text-amber-900 bg-amber-50 border-amber-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    flagged: {
      text: 'text-orange-800 bg-orange-50 border-orange-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    removed_suspended: {
      text: 'text-red-800 bg-red-50 border-red-200',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
  };
  const cfg = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${cfg.text}`}
    >
      {cfg.icon}
      <span>{formatPublicationStatus(status, lang)}</span>
    </span>
  );
}

/**
 * C-09 Offline, Slow-Network, and Reconnecting Banner with Reconnect Refresh Action
 */
export function OfflineBanner({
  compact = false,
  dark = false,
  clay = false,
}: {
  compact?: boolean;
  dark?: boolean;
  clay?: boolean;
}) {
  const { sim, reconnectAndRefresh, cachedAtLabel, lang } = usePrototype();

  if (sim.offlineMode === 'online' || sim.offlineMode === 'offline_empty') return null;

  if (sim.offlineMode === 'reconnecting') {
    return (
      <div
        className={`flex items-center justify-between gap-2 ${
          clay
            ? 'mx-3.5 mt-2.5 px-3.5 py-2.5 rounded-2xl clay-card-tint text-[#1B432D] text-xs'
            : dark
              ? 'border-b bg-emerald-500/15 border-emerald-400/25 text-emerald-100'
              : 'border-b bg-teal-50 border-teal-200 text-teal-950'
        } ${!clay ? (compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm') : ''}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 min-w-0">
          <RefreshCw
            className={`w-4 h-4 shrink-0 animate-spin ${
              clay ? 'text-[#2D6145]' : dark ? 'text-emerald-300' : 'text-[#0F6B5D]'
            }`}
          />
          <span className="truncate font-medium">
            {lang === 'ar'
              ? 'جاري إعادة الاتصال وتحديث الأسعار والتوفر...'
              : 'Reconnecting and refreshing latest availability...'}
          </span>
        </div>
      </div>
    );
  }

  if (sim.offlineMode === 'slow') {
    return (
      <div
        className={`flex items-center justify-between gap-2 ${
          clay
            ? 'mx-3.5 mt-2.5 px-3.5 py-2.5 rounded-2xl clay-card text-[#2D4A68] text-xs'
            : dark
              ? 'border-b bg-blue-500/15 border-blue-400/25 text-blue-100'
              : 'border-b bg-blue-50 border-blue-200 text-blue-950'
        } ${!clay ? (compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm') : ''}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock
            className={`w-4 h-4 shrink-0 ${
              clay ? 'text-[#3A6898]' : dark ? 'text-blue-300' : 'text-blue-700'
            }`}
          />
          <span className="truncate font-medium">
            {lang === 'ar'
              ? 'شبكة بطيئة — يتم تحميل المحتوى تدريجياً مع حفظ التصفح الحالي'
              : 'Slow network — loading progressively while preserving current view'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-2 ${
        clay
          ? 'mx-3.5 mt-2.5 px-3.5 py-2.5 rounded-2xl bg-[#FDF6E8] border border-white/85 text-[#7A4A10] shadow-[0_10px_22px_-10px_rgba(122,74,16,0.18),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-4px_8px_rgba(122,74,16,0.07)] text-xs'
          : dark
            ? 'border-b bg-amber-500/15 border-amber-400/25 text-amber-100'
            : 'border-b bg-amber-50 border-amber-200 text-amber-950'
      } ${!clay ? (compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm') : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff
          className={`w-4 h-4 shrink-0 ${
            clay ? 'text-[#A86512]' : dark ? 'text-amber-300' : 'text-amber-700'
          }`}
        />
        <span className="truncate font-medium">
          {lang === 'ar'
            ? `أوفلاين — نسخة محفوظة (${cachedAtLabel.slice(11)}) · التوفر غير مؤكد`
            : `Offline — cached snapshot (${cachedAtLabel.slice(11)}) · Availability unconfirmed`}
        </span>
      </div>
      <button
        type="button"
        onClick={reconnectAndRefresh}
        className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-[#2D6145] ${
          clay
            ? 'clay-pill text-[#172B20]'
            : dark
              ? 'bg-white text-[#080D0C] hover:bg-amber-50'
              : 'text-amber-900 bg-white border border-amber-300 hover:bg-amber-100'
        }`}
      >
        {lang === 'ar' ? 'إعادة الاتصال' : 'Reconnect'}
      </button>
    </div>
  );
}

/**
 * C-09 First Launch Offline (No Cached Content)
 */
export function OfflineEmptyScreen({
  onRetry,
  dark = false,
  clay = false,
}: {
  onRetry: () => void;
  dark?: boolean;
  clay?: boolean;
}) {
  const { lang } = usePrototype();
  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[420px] ${
        clay ? 'store-clay' : dark ? 'bg-[#080D0C] text-white' : 'bg-white text-slate-900'
      }`}
    >
      <div
        className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-5 ${
          clay
            ? 'clay-card text-[#2D6145]'
            : dark
              ? 'bg-white/[0.07] border border-white/[0.12] text-white/75'
              : 'bg-slate-100 text-slate-600'
        }`}
      >
        <WifiOff className="w-7 h-7" />
      </div>
      <h3
        className={`text-base font-bold mb-1.5 ${
          clay ? 'text-[#172B20]' : dark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {lang === 'ar' ? 'تعذّر الاتصال بالإنترنت' : 'No internet connection'}
      </h3>
      <p
        className={`text-xs max-w-xs mb-6 leading-relaxed ${
          clay ? 'text-[#5A7265]' : dark ? 'text-white/60' : 'text-slate-600'
        }`}
      >
        {lang === 'ar'
          ? 'هذا هو التشغيل الأول ولا توجد بيانات مخزنة محلياً بعد. تحقق من بيانات الجوال أو الشبكة ثم أعد المحاولة.'
          : 'This is your first launch and no cached listings are available yet. Check your mobile data or Wi-Fi and try again.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={`inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full text-sm font-bold transition-all active:scale-[0.98] whitespace-nowrap ${
          clay
            ? 'clay-primary-btn'
            : dark
              ? 'bg-white text-[#061512] hover:bg-emerald-50'
              : 'bg-[#0F6B5D] hover:bg-[#0B5348] text-white'
        }`}
      >
        <RefreshCw className="w-4 h-4" />
        {lang === 'ar' ? 'إعادة المحاولة' : 'Try again'}
      </button>
    </div>
  );
}

/**
 * C-09 Skeleton Cards & Table Rows
 */
export function PhoneCardSkeleton({ dark = false, clay = false }: { dark?: boolean; clay?: boolean }) {
  return (
    <div
      className={`overflow-hidden animate-pulse ${
        clay
          ? 'clay-card rounded-[24px] p-2'
          : dark
            ? 'rounded-2xl bg-[#101816] border border-white/[0.08]'
            : 'rounded-2xl bg-white border border-slate-200'
      }`}
    >
      <div
        className={`aspect-[4/3] ${
          clay ? 'rounded-[18px] bg-[#DCE7E1]' : dark ? 'bg-white/[0.06]' : 'bg-slate-200/75'
        }`}
      />
      <div className="p-2.5 space-y-2">
        <div className={`h-2.5 w-20 rounded-full ${clay ? 'bg-[#DCE7E1]' : dark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />
        <div className={`h-3.5 w-3/4 rounded-full ${clay ? 'bg-[#D3E2DA]' : dark ? 'bg-white/[0.1]' : 'bg-slate-200'}`} />
        <div className={`h-3.5 w-1/2 rounded-full ${clay ? 'bg-[#C6DFD1]' : dark ? 'bg-emerald-400/20' : 'bg-slate-200'}`} />
        <div className={`h-2.5 w-2/3 rounded-full ${clay ? 'bg-[#E3ECE7]' : dark ? 'bg-white/[0.05]' : 'bg-slate-100'}`} />
      </div>
    </div>
  );
}

export function TableRowsSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 px-4 py-3.5 animate-pulse" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="h-4 bg-slate-200/80 rounded w-4/5" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * LTR-safe wrapper for Sudanese phone numbers (+249), IPs, and model codes inside RTL text
 */
export function LtrValue({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span dir="ltr" className={`inline-block font-mono-num ${className}`}>
      {children}
    </span>
  );
}

/**
 * Global Toast Stack
 */
export function ToastContainer() {
  const { toasts, dismissToast, lang } = usePrototype();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 start-4 z-[80] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((toast) => {
        const toneStyles = {
          success: 'bg-emerald-950 text-white border-emerald-800',
          warning: 'bg-amber-950 text-white border-amber-800',
          error: 'bg-red-950 text-white border-red-800',
          info: 'bg-slate-900 text-white border-slate-700',
        }[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm ${toneStyles}`}
          >
            <p className="leading-snug">{tText(toast.text, lang)}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={lang === 'ar' ? 'إغلاق الإشعار' : 'Dismiss'}
              className="text-white/70 hover:text-white shrink-0 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Reusable Accessible Confirmation Modal
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
  children,
  confirmDisabled = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'primary' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const btnStyle = {
    primary: 'bg-[#0F6B5D] hover:bg-[#0B5348] text-white',
    danger: 'bg-red-700 hover:bg-red-800 text-white',
    warning: 'bg-amber-700 hover:bg-amber-800 text-white',
  }[tone];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label={cancelLabel}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg focus-visible:outline-2 focus-visible:outline-[#0F6B5D]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">{description}</p>
        {children && <div className="mb-4">{children}</div>}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#0F6B5D]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B5D] ${btnStyle}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
