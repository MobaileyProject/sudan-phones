import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { SponsoredAd } from '../../types';
import { tText } from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';

interface AppOpenAdOverlayProps {
  ad: SponsoredAd | null;
  previewMode?: boolean;
  onDismiss: () => void;
  onAction: (ad: SponsoredAd) => void;
}

export function AppOpenAdOverlay({
  ad,
  previewMode = false,
  onDismiss,
  onAction,
}: AppOpenAdOverlayProps) {
  const { lang, selectedCity, getStoreById, trackAdImpression, trackAdClick } = usePrototype();
  const prefersReducedMotion = useReducedMotion();
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const openedAtRef = useRef<number>(Date.now());
  const trackedImpressionKeyRef = useRef<string | null>(null);
  const hasTrackedClickRef = useRef<boolean>(false);

  // Countdown timer & impression analytics tracking (skipped in admin previewMode)
  useEffect(() => {
    if (!ad) return;
    openedAtRef.current = Date.now();
    hasTrackedClickRef.current = false;

    if (!previewMode && trackedImpressionKeyRef.current !== ad.id) {
      trackedImpressionKeyRef.current = ad.id;
      trackAdImpression(ad.id, {
        city: selectedCity,
        locale: lang,
        source: 'app_open_overlay',
      });
    }

    const initialDelay = previewMode ? 0 : Math.max(0, Math.min(10, ad.skipDelaySec ?? 3));
    setSecondsLeft(initialDelay);
    if (initialDelay <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [ad?.id, ad?.skipDelaySec, previewMode, selectedCity, lang, trackAdImpression]);

  if (!ad) return null;

  const store = getStoreById(ad.storeId);
  const canSkip = previewMode || secondsLeft <= 0;
  const photoSrc = ad.imageUrl || store?.bannerImage || '';
  const altText = tText(ad.title, lang) || tText(ad.storeName, lang);

  const handlePhotoClick = () => {
    if (!previewMode && !hasTrackedClickRef.current) {
      hasTrackedClickRef.current = true;
      const timeToClickMs = Math.max(1, Date.now() - openedAtRef.current);
      trackAdClick(ad.id, {
        city: selectedCity,
        locale: lang,
        listingId: ad.listingId,
        timeToClickMs,
        source: 'app_open_overlay',
      });
    }
    onAction(ad);
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'إعلان مموّل' : 'Sponsored advertisement'}
      onClick={() => {
        if (canSkip) onDismiss();
      }}
      className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-lg flex items-center justify-center p-5"
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[360px] flex flex-col items-center gap-3"
      >
        {/* Minimal top bar above the ad photo: subtle Sponsored tag + Skip/Close */}
        <div className="w-full flex items-center justify-between px-1">
          <span className="px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90">
            {lang === 'ar' ? 'إعلان مموّل' : 'Ad'}
            {previewMode ? (lang === 'ar' ? ' · معاينة' : ' · Preview') : ''}
          </span>

          <button
            type="button"
            disabled={!canSkip}
            onClick={onDismiss}
            aria-label={lang === 'ar' ? 'إغلاق الإعلان' : 'Close ad'}
            className={`h-9 min-w-[36px] px-3 rounded-full backdrop-blur-md border flex items-center justify-center gap-1 text-xs font-bold transition-all ${
              canSkip
                ? 'bg-white/90 text-[#14281E] border-white hover:bg-white cursor-pointer shadow-md'
                : 'bg-black/45 text-white/90 border-white/20 cursor-default'
            }`}
          >
            {canSkip ? (
              <X className="w-4 h-4" />
            ) : (
              <span className="font-mono-num">{secondsLeft}</span>
            )}
          </button>
        </div>

        {/* Store-Submitted Ad Photo Only — tapping anywhere tracks click analytics and opens the original product listing */}
        <button
          type="button"
          onClick={handlePhotoClick}
          aria-label={
            lang === 'ar'
              ? `فتح عرض ${altText}`
              : `Open promoted listing: ${altText}`
          }
          className="group relative w-full rounded-[26px] overflow-hidden bg-black/30 shadow-[0_28px_70px_-14px_rgba(0,0,0,0.75)] ring-1 ring-white/25 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.985] transition-transform"
        >
          <img
            src={photoSrc}
            alt={altText}
            referrerPolicy="no-referrer"
            className="w-full max-h-[76dvh] h-auto object-contain block group-hover:scale-[1.015] transition-transform duration-300"
          />
        </button>
      </motion.div>
    </div>
  );
}
