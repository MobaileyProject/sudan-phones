import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, MessageSquarePlus, Star, X } from 'lucide-react';
import { Language, RatingSummary } from '../../types';
import { usePrototype } from '../../store/PrototypeContext';

const STAR_LABELS: Record<number, { ar: string; en: string }> = {
  1: { ar: 'ضعيف', en: 'Poor' },
  2: { ar: 'مقبول', en: 'Fair' },
  3: { ar: 'جيد', en: 'Good' },
  4: { ar: 'جيد جداً', en: 'Very Good' },
  5: { ar: 'ممتاز', en: 'Excellent' },
};

/**
 * Compact inline star rating indicator used on cards, headers, and directory items.
 */
export function CompactStarRating({
  average,
  count,
  label,
  size = 'sm',
}: {
  average: number;
  count: number;
  label?: string;
  size?: 'xs' | 'sm';
}) {
  const starClass = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textClass = size === 'xs' ? 'text-[10px]' : 'text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1 font-mono-num ${textClass}`}>
      <Star className={`${starClass} fill-[#E59A1A] text-[#E59A1A] shrink-0`} />
      <span className="font-bold text-[#172B20]">{count > 0 ? average.toFixed(1) : '—'}</span>
      {count > 0 && <span className="text-[#6B8276]">({count})</span>}
      {label && <span className="text-[#5E7669] font-sans truncate">{label}</span>}
    </span>
  );
}

/**
 * Minimalist Claymorphism Rating Summary + Distribution + Reviews + optional "Rate" trigger card.
 * Supports Store Ratings, Product Ratings, and read-only Aggregated Model Ratings.
 */
export function RatingSummaryAndReviewsCard({
  title,
  subtitle,
  scopeNotice,
  summary,
  rateButtonLabel,
  onOpenRateSheet,
  showSourceStore = false,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  scopeNotice?: string;
  summary: RatingSummary;
  rateButtonLabel?: string;
  onOpenRateSheet?: () => void;
  showSourceStore?: boolean;
  emptyMessage?: string;
}) {
  const { lang } = usePrototype();
  const [expanded, setExpanded] = useState(false);

  const visibleReviews = expanded ? summary.reviews : summary.reviews.slice(0, 2);

  return (
    <div className="clay-card rounded-[26px] p-4 space-y-3.5">
      {/* Header + Optional Rate Action Button */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-[#172B20]">{title}</h2>
          {subtitle && (
            <p className="text-[10.5px] text-[#5F776A] mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {onOpenRateSheet && rateButtonLabel && (
          <button
            type="button"
            onClick={onOpenRateSheet}
            className="clay-pill-active clay-focus-ring h-8 px-3 rounded-full text-[11px] font-bold text-[#17462C] inline-flex items-center gap-1.5 shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{rateButtonLabel}</span>
          </button>
        )}
      </div>

      {/* Score Overview + Star Distribution Bars */}
      <div className="clay-inset rounded-[20px] p-3 flex items-center gap-3.5">
        <div className="text-center shrink-0 min-w-[74px] px-1">
          <p className="text-[26px] font-extrabold text-[#172B20] font-mono-num leading-none">
            {summary.count > 0 ? summary.average.toFixed(1) : '—'}
          </p>
          <div className="flex items-center justify-center gap-0.5 mt-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= Math.round(summary.average)
                    ? 'fill-[#E59A1A] text-[#E59A1A]'
                    : 'text-[#B5C6BC]'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-[#647C6F] font-medium mt-1 font-mono-num">
            {summary.count}{' '}
            {lang === 'ar' ? (summary.count === 1 ? 'تقييم' : 'تقييمات') : summary.count === 1 ? 'rating' : 'ratings'}
          </p>
        </div>

        <div className="flex-1 space-y-1 min-w-0">
          {[5, 4, 3, 2, 1].map((starNum, idx) => {
            const countForStar = summary.breakdown[idx] ?? 0;
            const pct = summary.count > 0 ? Math.round((countForStar / summary.count) * 100) : 0;
            return (
              <div key={starNum} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-3 text-[#5A7265] font-mono-num font-bold text-center shrink-0">
                  {starNum}
                </span>
                <Star className="w-2.5 h-2.5 fill-[#E59A1A] text-[#E59A1A] shrink-0" />
                <div className="flex-1 h-1.5 rounded-full bg-[#D5E1DA] overflow-hidden">
                  <svg
                    viewBox="0 0 100 6"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="w-full h-full block"
                  >
                    <rect x="0" y="0" width={pct} height="6" rx="3" fill="#2D6145" />
                  </svg>
                </div>
                <span className="w-5 text-end text-[#6C8377] font-mono-num shrink-0">
                  {countForStar}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scope Clarification Notice */}
      {scopeNotice && (
        <p className="text-[10.5px] text-[#2B5D42] bg-[#E3F2E9]/75 border border-[#2D6145]/10 rounded-[14px] px-3 py-2 leading-relaxed">
          {scopeNotice}
        </p>
      )}

      {/* Recent Reviews List */}
      {visibleReviews.length > 0 ? (
        <div className="space-y-2">
          {visibleReviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-[16px] bg-[#F6FAF7] border border-[#172B20]/[0.05] px-3 py-2.5 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-bold text-[#172B20] truncate">
                  {rev.authorName}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-2.5 h-2.5 ${
                          s <= rev.rating
                            ? 'fill-[#E59A1A] text-[#E59A1A]'
                            : 'text-[#C2D1C8]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[9.5px] text-[#7A9084] font-mono-num ms-1">
                    {rev.createdAt}
                  </span>
                </div>
              </div>
              {showSourceStore && rev.storeName && (
                <p className="text-[10px] font-semibold text-[#2B5D42] truncate">
                  {rev.storeName}
                </p>
              )}
              {rev.comment && (
                <p className="text-[11px] text-[#4C6457] leading-relaxed">{rev.comment}</p>
              )}
            </div>
          ))}

          {summary.reviews.length > 2 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full py-1.5 text-[11px] font-semibold text-[#265B3E] hover:text-[#172B20] inline-flex items-center justify-center gap-1 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'عرض أقل' : 'Show less'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'ar'
                      ? `عرض كل التقييمات (${summary.reviews.length})`
                      : `View all ${summary.reviews.length} reviews`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        emptyMessage && (
          <p className="text-[11px] text-[#667D71] text-center py-1.5">{emptyMessage}</p>
        )
      )}
    </div>
  );
}

/**
 * Interactive Claymorphism Bottom Sheet for Submitting a Store or Phone Brand Rating.
 */
export function RateTargetSheet({
  open,
  title,
  subtitle,
  helperNote,
  defaultAuthorName = '',
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  helperNote?: string;
  defaultAuthorName?: string;
  onClose: () => void;
  onSubmit: (payload: { rating: number; authorName: string; comment: string }) => void;
}) {
  const { lang } = usePrototype();
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [authorName, setAuthorName] = useState<string>(defaultAuthorName);
  const [comment, setComment] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      rating: selectedStars,
      authorName,
      comment,
    });
    setComment('');
    setSelectedStars(5);
    onClose();
  };

  const starText = (langKey: Language) =>
    STAR_LABELS[selectedStars]?.[langKey] ?? '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="absolute inset-0 z-50 bg-[#102018]/45 backdrop-blur-[4px] flex flex-col justify-end"
          onClick={onClose}
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="store-clay clay-sheet rounded-t-[30px] p-5 space-y-4"
          >
            <div className="w-10 h-1 rounded-full bg-[#172B20]/15 mx-auto" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#172B20] truncate">{title}</h3>
                <p className="text-[11px] text-[#5F776A] mt-0.5">{subtitle}</p>
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

            {helperNote && (
              <p className="text-[11px] text-[#245A3D] bg-[#E3F2E9]/85 rounded-[14px] px-3 py-2 leading-relaxed">
                {helperNote}
              </p>
            )}

            {/* Interactive 5-Star Selector */}
            <div className="clay-inset rounded-[22px] py-4 px-3 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= selectedStars;
                  return (
                    <motion.button
                      key={star}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedStars(star)}
                      aria-label={`${star} stars`}
                      className="w-10 h-10 rounded-full clay-pill clay-focus-ring flex items-center justify-center"
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          active
                            ? 'fill-[#E59A1A] text-[#E59A1A]'
                            : 'text-[#B2C4BA]'
                        }`}
                      />
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-xs font-bold text-[#172B20]">
                <span className="font-mono-num text-[#245A3D]">{selectedStars}/5</span> ·{' '}
                {starText(lang)}
              </p>
            </div>

            {/* Reviewer Name */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#4E6659] px-1">
                {lang === 'ar' ? 'الاسم (اختياري)' : 'Your Name (optional)'}
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: أحمد علي' : 'e.g. Ahmed Ali'}
                className="w-full h-11 px-3.5 rounded-[16px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
              />
            </div>

            {/* Review Comment */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#4E6659] px-1">
                {lang === 'ar' ? 'رأيك وتجربتك (اختياري)' : 'Your Review (optional)'}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'شارك تجربتك باختصار لمساعدة الآخرين...'
                    : 'Share your short experience to help other buyers...'
                }
                className="w-full p-3.5 rounded-[16px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="clay-primary-btn clay-focus-ring w-full h-12 rounded-full text-xs font-bold"
            >
              {lang === 'ar' ? 'إرسال التقييم' : 'Submit Rating'}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
