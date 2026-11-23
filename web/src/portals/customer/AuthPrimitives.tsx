import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Phone,
  RefreshCw,
  X,
} from 'lucide-react';
import { AnimatePresence, MotionValue, motion, useReducedMotion } from 'motion/react';
import { Language } from '../../types';
import { AUTH_COPY, BRANDS, COUNTRY_DIAL_CODES, tText } from '../../i18n/translations';
import forestPhonesHeroBg from '../../assets/images/forest_phones_hero_bg_1795363834985.jpg';

/** Scroll focused input into view above mobile keyboard + sticky footer */
export function scrollFieldIntoView(el: HTMLElement | null) {
  if (!el) return;
  window.setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 120);
}

/** Geometric Sudan Phones brand emblem */
export function BrandMark({
  animated = false,
  className = 'w-12 h-12',
}: {
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <motion.rect
        x="14"
        y="6"
        width="36"
        height="52"
        rx="10"
        stroke="currentColor"
        strokeWidth="3.2"
        initial={animated ? { pathLength: 0, opacity: 0.2 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.line
        x1="27"
        y1="13"
        x2="37"
        y2="13"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        initial={animated ? { opacity: 0 } : false}
        animate={{ opacity: 0.65 }}
        transition={{ delay: 0.32, duration: 0.28 }}
      />
      <motion.path
        d="M24 33L29.5 38.5L41 26.5"
        stroke="var(--brand, #2DD4A0)"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animated ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.42, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.line
        x1="26"
        y1="51"
        x2="38"
        y2="51"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        initial={animated ? { opacity: 0 } : false}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.38, duration: 0.28 }}
      />
    </svg>
  );
}

/** Signature 72px Rounded-Square Logo Tile (22px radius, gradient border, soft green glow) */
export function AuthLogoTile({
  onClick,
  ariaLabel,
  animated = false,
}: {
  onClick?: () => void;
  ariaLabel?: string;
  animated?: boolean;
}) {
  const inner = (
    <span
      className="relative w-[72px] h-[72px] rounded-[22px] p-[1.5px] flex items-center justify-center shrink-0"
      style={{
        backgroundImage:
          'linear-gradient(145deg, rgba(52, 224, 171, 0.75) 0%, rgba(19, 165, 127, 0.22) 55%, rgba(255, 255, 255, 0.1) 100%)',
        boxShadow: '0 10px 30px -6px rgba(45, 212, 160, 0.28)',
      }}
    >
      <span
        className="w-full h-full rounded-[20.5px] flex items-center justify-center"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(45, 212, 160, 0.2) 0%, #121B18 68%)',
        }}
      >
        <BrandMark animated={animated} className="w-10 h-10 text-[var(--text)]" />
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="auth-focus-ring rounded-[22px] shrink-0 active:scale-95 transition-transform"
      >
        {inner}
      </button>
    );
  }
  return inner;
}

/** Crisp vector Sudan flag icon */
export function SudanFlagIcon({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      fill="none"
      aria-hidden="true"
      className={`${className} rounded-[3px] shrink-0 ring-1 ring-white/20`}
    >
      <rect width="24" height="5.33" fill="#D21034" />
      <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
      <rect y="10.67" width="24" height="5.33" fill="#111827" />
      <path d="M0 0L9.5 8L0 16V0Z" fill="#007229" />
    </svg>
  );
}

/** Authentic 4-color Google mark */
export function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

/** Crisp WhatsApp brand icon */
export function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="11" fill="#25D366" />
      <path
        d="M16.95 14.37c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.18-1.35-.81-.72-1.35-1.61-1.51-1.88-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.97 2.63 1.11 2.81.14.18 1.92 2.93 4.64 4.11.65.28 1.15.45 1.55.57.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Crisp Apple monochrome icon (adapts to light & dark theme via currentColor) */
export function AppleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.365 1.43c0 1.14-.465 2.21-1.23 3.015-.825.87-2.16 1.545-3.33 1.455-.15-1.11.39-2.265 1.155-3.045.825-.855 2.205-1.485 3.405-1.425zm4.53 16.05c-.36.825-.795 1.59-1.32 2.295-.69.93-1.56 2.085-2.715 2.1-1.02.015-1.29-.66-2.67-.66-1.38 0-1.695.645-2.715.675-1.14.03-2.01-1.02-2.7-1.95-1.845-2.52-3.255-7.125-1.365-10.23.945-1.545 2.625-2.52 4.455-2.55 1.05-.015 2.04.705 2.685.705.63 0 1.815-.87 3.06-.75.525.03 1.98.21 2.91 1.575-.075.045-1.74 1.02-1.725 3.045.015 2.415 2.115 3.225 2.145 3.24-.015.06-.33 1.14-1.045 2.505z" />
    </svg>
  );
}

/**
 * Studio macro matte forest-green flagship smartphones backdrop
 * Renders the bespoke studio photograph with the vector smartphone grid as a resilient fallback.
 */
export function ForestPhonesBackdrop({
  className = '',
  variant = 'full',
  ambientMotion,
  parallaxX,
  parallaxY,
}: {
  className?: string;
  variant?: 'full' | 'banner';
  ambientMotion?: boolean;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
}) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();
  const enableAmbient = (ambientMotion ?? variant === 'full') && !prefersReducedMotion;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#08100C] ${className}`}
    >
      {/* Resilient vector fallback layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 75% 22%, rgba(56, 107, 78, 0.42) 0%, rgba(16, 33, 24, 0.92) 55%, #070E0A 100%)',
        }}
      />

      {/* High-resolution studio macro photograph with living Ken Burns drift & optional pointer parallax */}
      {!imgFailed && (
        <motion.div
          style={enableAmbient && (parallaxX || parallaxY) ? { x: parallaxX, y: parallaxY } : undefined}
          className="absolute -inset-4 will-change-transform"
        >
          <motion.img
            src={forestPhonesHeroBg}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            initial={
              variant === 'full'
                ? { scale: 1.11, opacity: 0.82 }
                : false
            }
            animate={
              enableAmbient
                ? {
                    scale: [1.04, 1.09, 1.05, 1.04],
                    x: [0, -8, 6, 0],
                    y: [0, -6, 5, 0],
                    opacity: 1,
                  }
                : variant === 'full'
                  ? { scale: 1.02, opacity: 1 }
                  : undefined
            }
            transition={
              enableAmbient
                ? {
                    opacity: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
                    scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
                    x: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
                    y: { duration: 16, repeat: Infinity, ease: 'easeInOut' },
                  }
                : { duration: 0.85, ease: [0.16, 1, 0.3, 1] }
            }
            className={`w-full h-full object-cover will-change-transform ${
              variant === 'banner' ? 'object-[center_36%] scale-[1.06]' : 'object-[center_30%]'
            }`}
          />
        </motion.div>
      )}

      {/* Ambient breathing studio emerald key-light on the upper phones */}
      {enableAmbient && (
        <motion.div
          initial={{ opacity: 0.18, scale: 0.96 }}
          animate={{ opacity: [0.18, 0.4, 0.18], scale: [0.96, 1.08, 0.96] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-14 -end-12 w-[300px] h-[300px] rounded-full mix-blend-screen will-change-transform"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(114, 214, 162, 0.28) 0%, rgba(45, 212, 160, 0.08) 45%, transparent 72%)',
          }}
        />
      )}

      {/* Diagonal studio specular light reflection gliding across the matte lenses */}
      {enableAmbient && (
        <motion.div
          initial={{ x: '-120%', opacity: 0 }}
          animate={{
            x: ['-120%', '350%'],
            opacity: [0, 0.36, 0.36, 0],
          }}
          transition={{
            duration: 3.4,
            repeat: Infinity,
            repeatDelay: 4.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute -inset-y-12 left-0 w-[44%] -skew-x-[22deg] mix-blend-screen will-change-transform"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent 0%, rgba(184, 223, 198, 0.08) 32%, rgba(235, 250, 240, 0.2) 50%, rgba(184, 223, 198, 0.07) 68%, transparent 100%)',
          }}
        />
      )}

      {/* Subtle emerald studio color-grade glaze */}
      <div
        className="absolute inset-0 mix-blend-multiply opacity-35"
        style={{
          backgroundImage: 'linear-gradient(155deg, #10281B 0%, #091810 100%)',
        }}
      />

      {/* Calibrated contrast scrim so upper macro phones gleam while lower typography achieves AAA legibility */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            variant === 'banner'
              ? 'linear-gradient(180deg, rgba(6, 14, 10, 0.56) 0%, rgba(6, 14, 10, 0.14) 52%, rgba(6, 14, 10, 0.38) 100%)'
              : 'linear-gradient(180deg, rgba(6, 14, 10, 0.58) 0%, rgba(6, 14, 10, 0.1) 26%, rgba(6, 14, 10, 0.24) 46%, rgba(6, 14, 10, 0.78) 68%, rgba(5, 11, 8, 0.96) 100%)',
        }}
      />
    </div>
  );
}

/**
 * Floating matte forest-green smartphone corner accent peeking from the end edge
 * Matches the tilted dark-green phone motif on the Login and Create Account screens.
 */
export function FloatingCornerPhone({
  lang,
  className = '',
}: {
  lang: Language;
  className?: string;
}) {
  const isRtl = lang === 'ar';
  const prefersReducedMotion = useReducedMotion();
  const baseRotate = isRtl ? 11 : -11;
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 8, rotate: isRtl ? 14 : -14 }}
      animate={
        prefersReducedMotion
          ? { opacity: 1, y: 0, rotate: baseRotate }
          : {
              opacity: 1,
              y: [0, -5, 0],
              rotate: [baseRotate, baseRotate + (isRtl ? -1.4 : 1.4), baseRotate],
            }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
          : {
              opacity: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 6.4, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 7.2, repeat: Infinity, ease: 'easeInOut' },
            }
      }
      className={`pointer-events-none select-none will-change-transform ${className}`}
    >
      <svg
        viewBox="0 0 92 128"
        fill="none"
        className="w-[74px] h-[104px] drop-shadow-[0_14px_18px_rgba(14,42,26,0.34)]"
      >
        <defs>
          <linearGradient id="fcp-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F7F60" />
            <stop offset="45%" stopColor="#2F5941" />
            <stop offset="100%" stopColor="#1B3928" />
          </linearGradient>
          <linearGradient id="fcp-island" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B684D" />
            <stop offset="100%" stopColor="#1C3929" />
          </linearGradient>
        </defs>
        {/* Main phone body */}
        <rect
          x="6"
          y="6"
          width="80"
          height="116"
          rx="20"
          fill="url(#fcp-body)"
          stroke="rgba(182, 224, 198, 0.35)"
          strokeWidth="1.5"
        />
        {/* Camera module */}
        <rect
          x="15"
          y="15"
          width="40"
          height="42"
          rx="12"
          fill="url(#fcp-island)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        {/* 3 crisp lenses */}
        <circle cx="26" cy="26" r="7.5" fill="#112319" stroke="#6E9E80" strokeWidth="1.2" />
        <circle cx="26" cy="26" r="3.4" fill="#07110C" />
        <circle cx="24.5" cy="24.5" r="1.4" fill="rgba(220,250,235,0.55)" />

        <circle cx="26" cy="46" r="7.5" fill="#112319" stroke="#6E9E80" strokeWidth="1.2" />
        <circle cx="26" cy="46" r="3.4" fill="#07110C" />
        <circle cx="24.5" cy="44.5" r="1.4" fill="rgba(220,250,235,0.5)" />

        <circle cx="44" cy="36" r="7.5" fill="#112319" stroke="#6E9E80" strokeWidth="1.2" />
        <circle cx="44" cy="36" r="3.4" fill="#07110C" />
        <circle cx="42.5" cy="34.5" r="1.4" fill="rgba(220,250,235,0.55)" />

        {/* Flash & LiDAR */}
        <circle cx="44" cy="21" r="2.7" fill="#E3E0CB" fillOpacity="0.72" />
        <circle cx="44" cy="50" r="2.6" fill="#0D1913" />
      </svg>
    </motion.div>
  );
}

/** Reusable Field Error row with smooth entrance and icon */
export function AuthFieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <motion.p
      id={id}
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-1.5 text-[13px] leading-[18px] font-medium text-[var(--danger)] pt-1.5"
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-[1px]" aria-hidden="true" />
      <span>{message}</span>
    </motion.p>
  );
}

/** Reusable Field Label with optional required indicator & end action */
export function AuthFieldLabel({
  htmlFor,
  label,
  required,
  lang,
  endAction,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
  lang: Language;
  endAction?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <label
        htmlFor={htmlFor}
        className="text-[14px] leading-[20px] font-medium text-[var(--text)] text-start"
      >
        <span>{label}</span>
        {required && (
          <>
            <span aria-hidden="true" className="text-[var(--brand)] ms-1">
              *
            </span>
            <span className="sr-only"> ({tText(AUTH_COPY.required, lang)})</span>
          </>
        )}
      </label>
      {endAction}
    </div>
  );
}

/** Standard 52px Text / Password Input with leading icon and 44x44 eye toggle */
export function AuthInputField({
  id,
  label,
  hideLabel = false,
  required,
  lang,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  dir,
  leadingIcon,
  endAction,
  helperText,
  error,
  passwordToggle,
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
  required?: boolean;
  lang: Language;
  type?: 'text' | 'password' | 'email';
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: string;
  dir?: 'ltr' | 'rtl';
  leadingIcon?: React.ReactNode;
  endAction?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  passwordToggle?: {
    shown: boolean;
    onToggle: () => void;
    showLabel: string;
    hideLabel: string;
  };
}) {
  const errId = error ? `${id}-error` : undefined;
  const helperId = !error && helperText ? `${id}-helper` : undefined;

  return (
    <div className="w-full">
      {!hideLabel && (
        <AuthFieldLabel
          htmlFor={id}
          label={label}
          required={required}
          lang={lang}
          endAction={endAction}
        />
      )}
      <div
        className="auth-field-box min-h-[54px] flex items-center"
        data-invalid={error ? 'true' : undefined}
      >
        {leadingIcon && (
          <span
            aria-hidden="true"
            className="auth-leading-icon ps-4 flex items-center shrink-0"
          >
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          type={passwordToggle ? (passwordToggle.shown ? 'text' : 'password') : type}
          dir={dir}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={hideLabel ? label : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId ?? helperId}
          className={`flex-1 min-w-0 min-h-[52px] bg-transparent text-[16px] leading-[24px] font-medium text-[var(--text)] placeholder:font-normal placeholder:text-[var(--placeholder)] focus:outline-none text-start ${
            leadingIcon ? 'ps-3' : 'ps-4'
          } ${passwordToggle ? 'pe-1' : 'pe-4'}`}
        />
        {passwordToggle && (
          <button
            type="button"
            onClick={passwordToggle.onToggle}
            aria-label={passwordToggle.shown ? passwordToggle.hideLabel : passwordToggle.showLabel}
            aria-pressed={passwordToggle.shown}
            className="auth-focus-ring min-w-[44px] min-h-[44px] me-1.5 rounded-[12px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--heading)] active:scale-95 transition-colors shrink-0"
          >
            {passwordToggle.shown ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>

      {error ? (
        <AuthFieldError id={errId} message={error} />
      ) : helperText ? (
        <div
          id={helperId}
          className="text-[13px] leading-[18px] text-[var(--text-secondary)] pt-1.5 text-start"
        >
          {helperText}
        </div>
      ) : null}
    </div>
  );
}

/** Unified 52px Phone Input: start-side country segment (flag + +249) + number input + animated carrier */
export function AuthPhoneField({
  id,
  label,
  hideLabel = false,
  required,
  lang,
  dialCode,
  lockedSudanOnly = false,
  onDialCodeChange,
  value,
  onChange,
  onClear,
  placeholder,
  carrierLabel,
  helperText,
  error,
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
  required?: boolean;
  lang: Language;
  dialCode: string;
  lockedSudanOnly?: boolean;
  onDialCodeChange: (code: string) => void;
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
  placeholder: string;
  carrierLabel: string | null;
  helperText?: string;
  error?: string;
}) {
  const errId = error ? `${id}-error` : undefined;
  const helperId = !error ? `${id}-helper` : undefined;

  return (
    <div className="w-full">
      {!hideLabel && <AuthFieldLabel htmlFor={id} label={label} required={required} lang={lang} />}
      <div
        dir="ltr"
        className="auth-field-box min-h-[54px] flex items-center overflow-hidden"
        data-invalid={error ? 'true' : undefined}
      >
        {/* Left-anchored Country Code Segment (always LTR even in Arabic so +249 precedes digits naturally) */}
        {lockedSudanOnly ? (
          <div className="min-h-[52px] px-3.5 bg-[var(--field-segment)] border-e border-[var(--border)] flex items-center gap-2 shrink-0 select-none">
            <SudanFlagIcon />
            <span
              dir="ltr"
              className="text-[15px] leading-[22px] font-bold tabular-nums text-[var(--heading)]"
            >
              +249
            </span>
            <Lock className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" aria-hidden="true" />
          </div>
        ) : (
          <div className="relative min-h-[52px] min-w-[44px] px-3.5 bg-[var(--field-segment)] border-e border-[var(--border)] flex items-center gap-1.5 shrink-0 select-none hover:bg-[var(--field-hover)] transition-colors">
            {dialCode === '+249' ? (
              <SudanFlagIcon />
            ) : (
              <Globe className="w-4 h-4 text-[var(--brand)] shrink-0" aria-hidden="true" />
            )}
            <span
              dir="ltr"
              className="text-[15px] leading-[22px] font-bold tabular-nums text-[var(--heading)] whitespace-nowrap"
            >
              {dialCode}
            </span>
            <ChevronDown
              className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0"
              aria-hidden="true"
            />
            <select
              aria-label={tText(AUTH_COPY.dialCodeAria, lang)}
              value={dialCode}
              onChange={(e) => onDialCodeChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {COUNTRY_DIAL_CODES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[var(--bg)] text-[var(--text)]">
                  {lang === 'ar'
                    ? `${c.code} · ${c.name.ar}`
                    : `${c.code} · ${c.name.en} (${c.iso})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {!hideLabel && (
          <span
            aria-hidden="true"
            className="auth-leading-icon ps-3 flex items-center shrink-0"
          >
            <Phone className="w-4 h-4" />
          </span>
        )}

        {/* Number Input — always left-aligned next to +249 (16px prevents iOS zoom) */}
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          dir="ltr"
          value={value}
          onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={hideLabel ? label : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId ?? helperId}
          className={`flex-1 min-w-0 min-h-[52px] bg-transparent text-[16px] leading-[24px] font-medium tabular-nums text-[var(--text)] placeholder:font-normal placeholder:text-[var(--placeholder)] focus:outline-none text-start ${
            hideLabel ? 'px-3.5' : 'px-2.5'
          }`}
        />

        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label={tText(AUTH_COPY.clear, lang)}
            className="auth-focus-ring min-w-[44px] min-h-[44px] me-1 rounded-[12px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--heading)] active:scale-95 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Below-field feedback: Error OR Animated Detected Carrier + Optional Helper */}
      {error ? (
        <AuthFieldError id={errId} message={error} />
      ) : (
        <AnimatePresence initial={false}>
          {(carrierLabel || helperText) && (
            <motion.div
              key="phone-meta"
              id={helperId}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-2 pt-1.5"
            >
              {carrierLabel && (
                <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] font-medium text-[var(--success)]">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shrink-0"
                  />
                  <span>{carrierLabel}</span>
                </span>
              )}
              {helperText && (
                <span className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
                  {helperText}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/** 52px Accessible Select Field with optional leading icon & placeholder option */
export function AuthSelectField({
  id,
  label,
  hideLabel = false,
  required,
  lang,
  value,
  onChange,
  options,
  placeholder,
  leadingIcon,
  helperText,
  error,
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
  required?: boolean;
  lang: Language;
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  leadingIcon?: React.ReactNode;
  helperText?: string;
  error?: string;
}) {
  const errId = error ? `${id}-error` : undefined;
  return (
    <div className="w-full">
      {!hideLabel && <AuthFieldLabel htmlFor={id} label={label} required={required} lang={lang} />}
      <div
        className="auth-field-box relative min-h-[52px] flex items-center"
        data-invalid={error ? 'true' : undefined}
      >
        {leadingIcon && (
          <span
            aria-hidden="true"
            className="auth-leading-icon ps-3.5 flex items-center shrink-0 pointer-events-none"
          >
            {leadingIcon}
          </span>
        )}
        <select
          id={id}
          value={value}
          onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={hideLabel ? label : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          className={`w-full min-h-[50px] pe-11 bg-transparent text-[16px] leading-[24px] font-medium appearance-none focus:outline-none cursor-pointer text-start ${
            !value ? 'text-[var(--placeholder)]' : 'text-[var(--text)]'
          } ${leadingIcon ? 'ps-2.5' : 'ps-4'}`}
        >
          {placeholder && (
            <option value="" disabled className="bg-[var(--bg)] text-[var(--placeholder)]">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--bg)] text-[var(--text)]">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]"
        />
      </div>
      {error ? (
        <AuthFieldError id={errId} message={error} />
      ) : helperText ? (
        <p className="text-[13px] leading-[18px] text-[var(--text-secondary)] pt-1.5 text-start">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

/** Accessible Multi-Line Textarea Field with optional leading icon (turns --brand on focus) */
export function AuthTextAreaField({
  id,
  label,
  required,
  lang,
  value,
  onChange,
  placeholder,
  rows = 2,
  leadingIcon,
  helperText,
  error,
}: {
  id: string;
  label: string;
  required?: boolean;
  lang: Language;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  leadingIcon?: React.ReactNode;
  helperText?: string;
  error?: string;
}) {
  const errId = error ? `${id}-error` : undefined;
  return (
    <div className="w-full">
      <AuthFieldLabel htmlFor={id} label={label} required={required} lang={lang} />
      <div className="auth-field-box flex items-start" data-invalid={error ? 'true' : undefined}>
        {leadingIcon && (
          <span
            aria-hidden="true"
            className="auth-leading-icon ps-3.5 pt-3.5 flex items-center shrink-0"
          >
            {leadingIcon}
          </span>
        )}
        <textarea
          id={id}
          rows={rows}
          value={value}
          onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          className={`flex-1 min-w-0 py-3 pe-4 bg-transparent text-[16px] leading-[24px] font-normal text-[var(--text)] placeholder:text-[var(--placeholder)] focus:outline-none resize-none text-start ${
            leadingIcon ? 'ps-2.5' : 'ps-4'
          }`}
        />
      </div>
      {error ? (
        <AuthFieldError id={errId} message={error} />
      ) : helperText ? (
        <p className="text-[13px] leading-[18px] text-[var(--text-secondary)] pt-1.5 text-start">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

/** Password Strength Hint (Non-color-only: 3 segments + explicit label) */
export function PasswordStrengthMeter({
  password,
  lang,
}: {
  password: string;
  lang: Language;
}) {
  if (!password) {
    return <span>{tText(AUTH_COPY.passwordHelper, lang)}</span>;
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8 && (/\d/.test(password) || /[^A-Za-z0-9]/.test(password))) score += 1;
  if (password.length >= 10 && /[A-Z]/.test(password) && /\d/.test(password)) score += 1;
  if (score === 0) score = 1;

  const meta =
    score === 1
      ? {
          label: tText(AUTH_COPY.passwordStrengthWeak, lang),
          color: 'var(--danger)',
          segments: 1,
        }
      : score === 2
        ? {
            label: tText(AUTH_COPY.passwordStrengthMedium, lang),
            color: 'var(--warning)',
            segments: 2,
          }
        : {
            label: tText(AUTH_COPY.passwordStrengthStrong, lang),
            color: 'var(--success)',
            segments: 3,
          };

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: idx <= meta.segments ? meta.color : 'var(--border)',
            }}
          />
        ))}
      </div>
      <span className="block text-[13px] leading-[18px] font-medium" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}

/** Primary Brand CTA Button: 54px, --brand-gradient, silky shadow, spring press & RTL-mirrored arrow */
export function AuthPrimaryButton({
  type = 'button',
  onClick,
  disabled,
  loading,
  lang,
  showArrow = false,
  children,
}: {
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  lang?: Language;
  showArrow?: boolean;
  children: React.ReactNode;
}) {
  const ForwardArrow = lang === 'ar' ? ArrowLeft : ArrowRight;
  const isDisabled = Boolean(disabled || loading);
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileTap={isDisabled ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 520, damping: 32 }}
      className="group auth-primary-btn auth-focus-ring w-full min-h-[54px] px-5 text-[16px] leading-[24px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
      ) : (
        <>
          {children}
          {showArrow && (
            <ForwardArrow
              className={`w-4 h-4 shrink-0 stroke-[2.4] transition-transform duration-200 ${
                lang === 'ar' ? 'group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'
              }`}
              aria-hidden="true"
            />
          )}
        </>
      )}
    </motion.button>
  );
}

/** Secondary Button (52px field height, supports standard and quiet minimal surface) */
export function AuthSecondaryButton({
  onClick,
  disabled,
  loading,
  icon,
  label,
  iconOnly = false,
  variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  label: string;
  iconOnly?: boolean;
  variant?: 'default' | 'minimal';
}) {
  const isDisabled = Boolean(disabled || loading);
  const surfaceClasses =
    variant === 'minimal'
      ? 'bg-white/[0.035] hover:bg-white/[0.075] border-[var(--border-subtle)] hover:border-[var(--border)]'
      : 'bg-[var(--field)] hover:bg-[var(--field-hover)] border-[var(--border)]';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={iconOnly ? label : undefined}
      aria-busy={loading || undefined}
      whileTap={isDisabled ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 520, damping: 32 }}
      className={`auth-focus-ring w-full min-h-[52px] px-4 rounded-[16px] border text-[var(--text)] text-[14px] leading-[20px] font-medium flex items-center justify-center gap-2.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${surfaceClasses}`}
    >
      {loading ? (
        <RefreshCw className="w-5 h-5 animate-spin text-[var(--brand)]" aria-hidden="true" />
      ) : (
        icon
      )}
      {!iconOnly && <span className="truncate">{label}</span>}
    </motion.button>
  );
}

/** Adaptive Social Providers Row: 2 providers -> equal 2-col with label; 3+ -> equal icon-only square tiles */
export interface SocialProviderItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AuthSocialRow({
  providers,
  variant = 'default',
}: {
  providers: SocialProviderItem[];
  variant?: 'default' | 'minimal';
}) {
  const isIconOnly = providers.length >= 3;
  return (
    <div
      className={`grid gap-3 ${isIconOnly ? 'grid-cols-3' : 'grid-cols-2'}`}
    >
      {providers.map((provider) => (
        <AuthSecondaryButton
          key={provider.id}
          onClick={provider.onClick}
          disabled={provider.disabled}
          loading={provider.loading}
          icon={provider.icon}
          label={provider.label}
          iconOnly={isIconOnly}
          variant={variant}
        />
      ))}
    </div>
  );
}

/** Accessible 52x30 Toggle Switch with checkmark + explicit text status (never color-only) */
export function AuthToggleSwitch({
  checked,
  lang,
}: {
  checked: boolean;
  lang: Language;
}) {
  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <span
        aria-hidden="true"
        className={`w-[52px] h-[30px] rounded-full p-[3px] flex items-center transition-colors border-[1.5px] ${
          checked
            ? 'bg-[var(--brand)] border-[var(--brand)] justify-end'
            : 'bg-[var(--toggle-off-track)] border-[var(--toggle-off-border)] justify-start'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          className="w-[22px] h-[22px] rounded-full bg-[var(--toggle-thumb)] shadow-sm flex items-center justify-center"
        >
          {checked && <Check className="w-3.5 h-3.5 text-[var(--on-brand)] stroke-[3]" />}
        </motion.span>
      </span>
      <span
        className={`text-[12px] leading-[16px] font-semibold ${
          checked ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]'
        }`}
      >
        {checked ? tText(AUTH_COPY.toggleOn, lang) : tText(AUTH_COPY.toggleOff, lang)}
      </span>
    </div>
  );
}

/**
 * Kinetic vertical letter-scrolling brand showcase for the middle of the first screen.
 * Displays smartphone brands one after another with individual letters scrolling smoothly
 * from top-to-bottom and bottom-to-top (alternating per letter & reversing each brand switch).
 */
export function HeroBrandRoller({ lang }: { lang: Language }) {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = React.useState(0);

  const showcaseBrands = React.useMemo(
    () =>
      BRANDS.map((b) => ({
        id: b.id,
        wordmark: b.label.toUpperCase(),
        arLabel: b.arLabel,
        enLabel: b.label,
        origin: b.origin,
      })),
    []
  );

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = window.setInterval(() => {
      setStep((prev) => prev + 1);
    }, 2600);
    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  const activeIdx = step % showcaseBrands.length;
  const activeBrand = showcaseBrands[activeIdx];
  const letters = activeBrand.wordmark.split('');

  const handleAdvance = () => {
    setStep((prev) => prev + 1);
  };

  return (
    <div
      className="relative w-full max-w-[320px] mx-auto flex flex-col items-center select-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Subtle dark emerald radial halo behind the wordmark so letters stay crisp over the studio photo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-6 -inset-y-5 rounded-full opacity-75"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(6, 15, 11, 0.72) 0%, rgba(6, 15, 11, 0.32) 52%, transparent 78%)',
        }}
      />

      {/* Interactive kinetic reel button (tap to advance immediately) */}
      <button
        type="button"
        onClick={handleAdvance}
        aria-label={
          lang === 'ar'
            ? `ماركة ${activeBrand.arLabel} — اضغط لعرض الماركة التالية`
            : `${activeBrand.enLabel} — tap for next brand`
        }
        className="auth-focus-ring relative z-10 w-full py-3.5 px-2 flex flex-col items-center justify-center rounded-2xl cursor-pointer group"
      >
        {/* Top architectural hairline */}
        <div
          aria-hidden="true"
          className="w-40 h-px mb-3 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent 0%, rgba(184, 223, 198, 0.45) 50%, transparent 100%)',
          }}
        />

        {/* Fixed-height vertical scroll window for per-letter up-to-down / down-to-up reel */}
        <div
          dir="ltr"
          className="relative h-[44px] w-full overflow-hidden"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={`${activeBrand.id}-${step}`}
              variants={{ enter: {}, center: {}, exit: {} }}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex items-center justify-center tracking-[0.22em] ps-[0.22em] text-[28px] sm:text-[30px] leading-[40px] font-bold text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.65)]"
            >
              {letters.map((char, charIdx) => {
                const enterDir = (charIdx + step) % 2 === 0 ? 1 : -1;
                const exitDir = (charIdx + step + 1) % 2 === 0 ? 1 : -1;
                return (
                  <span
                    key={`${activeBrand.id}-${charIdx}`}
                    className="inline-block overflow-hidden h-[42px] leading-[42px]"
                  >
                    <motion.span
                      variants={{
                        enter: {
                          y: prefersReducedMotion ? '0%' : enterDir === 1 ? '-118%' : '118%',
                          opacity: 0,
                        },
                        center: {
                          y: '0%',
                          opacity: 1,
                          transition: {
                            duration: prefersReducedMotion ? 0.18 : 0.58,
                            delay: prefersReducedMotion ? 0 : charIdx * 0.038,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                        exit: {
                          y: prefersReducedMotion ? '0%' : exitDir === 1 ? '118%' : '-118%',
                          opacity: 0,
                          transition: {
                            duration: prefersReducedMotion ? 0.14 : 0.46,
                            delay: prefersReducedMotion ? 0 : charIdx * 0.032,
                            ease: [0.4, 0, 0.2, 1],
                          },
                        },
                      }}
                      className="inline-block will-change-transform"
                    >
                      {char}
                    </motion.span>
                  </span>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom architectural hairline */}
        <div
          aria-hidden="true"
          className="w-40 h-px mt-3 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent 0%, rgba(184, 223, 198, 0.45) 50%, transparent 100%)',
          }}
        />
      </button>

      {/* Quiet hairline brand step ticks */}
      <div
        className="relative z-10 flex items-center justify-center gap-1.5 mt-1"
        aria-hidden="true"
      >
        {showcaseBrands.map((b, idx) => {
          const isCurrent = idx === activeIdx;
          return (
            <span
              key={b.id}
              className={`h-[2px] rounded-full transition-all duration-300 ${
                isCurrent ? 'w-5 bg-[#B8DFC6]' : 'w-1.5 bg-white/25'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
