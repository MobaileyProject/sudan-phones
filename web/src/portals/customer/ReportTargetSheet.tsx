import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Flag, ShieldAlert, X } from 'lucide-react';
import { BilingualText, Language, ReportReasonId, ReportTargetType } from '../../types';
import { usePrototype } from '../../store/PrototypeContext';

export interface ReportReasonOption {
  id: ReportReasonId;
  label: BilingualText;
  description: BilingualText;
}

export const LISTING_REPORT_REASONS: ReportReasonOption[] = [
  {
    id: 'misleading_price',
    label: { ar: 'السعر غير مطابق للواقع', en: 'Price differs from store price' },
    description: {
      ar: 'المتجر يطلب سعراً مختلفاً عن السعر المعروض هنا',
      en: 'Store asks for a different price than listed',
    },
  },
  {
    id: 'fake_or_counterfeit',
    label: { ar: 'اشتباه في جهاز مقلّد أو غير أصلي', en: 'Suspected counterfeit or replica' },
    description: {
      ar: 'الجهاز يبدو غير أصلي أو مجدداً بدون توضيح',
      en: 'Device appears non-genuine or undisclosed refurbished',
    },
  },
  {
    id: 'wrong_condition_specs',
    label: { ar: 'وصف الحالة أو المواصفات غير دقيق', en: 'Inaccurate condition or specs' },
    description: {
      ar: 'اختلاف في السعة أو صحة البطارية أو الخدوش المعلنة',
      en: 'Storage, battery health, or defects do not match',
    },
  },
  {
    id: 'already_sold',
    label: { ar: 'الهاتف مباع أو غير متوفر حالياً', en: 'Already sold or unavailable' },
    description: {
      ar: 'الإعلان ما زال ظاهراً رغم نفاد القطعة أو بيعها',
      en: 'Listing is still live even though the phone is gone',
    },
  },
  {
    id: 'suspicious_photos',
    label: { ar: 'صور غير حقيقية أو مضللة', en: 'Misleading or stock photos' },
    description: {
      ar: 'الصور لا تطابق الجهاز الفعلي المعروض للبيع',
      en: 'Photos do not match the actual unit being sold',
    },
  },
  {
    id: 'other',
    label: { ar: 'سبب آخر', en: 'Other issue' },
    description: {
      ar: 'ملاحظة أخرى تريد إبلاغ فريق الإشراف بها',
      en: 'Another concern for our moderation team',
    },
  },
];

export const STORE_REPORT_REASONS: ReportReasonOption[] = [
  {
    id: 'fraud_or_scam',
    label: { ar: 'اشتباه في احتيال أو تعامل غير صادق', en: 'Suspected fraud or dishonest conduct' },
    description: {
      ar: 'طلب تحويل مسبق مشبوه أو ممارسات بيع مضللة',
      en: 'Suspicious advance payment request or deceptive practice',
    },
  },
  {
    id: 'wrong_location_hours',
    label: { ar: 'العنوان أو بيانات التواصل غير صحيحة', en: 'Incorrect location or contact info' },
    description: {
      ar: 'الموقع الفعلي أو رقم الهاتف غير مطابق للواقع',
      en: 'Physical address or phone number is wrong',
    },
  },
  {
    id: 'unresponsive',
    label: { ar: 'المتجر لا يستجيب للاتصال أو واتساب', en: 'Store does not respond' },
    description: {
      ar: 'محاولات تواصل متكررة بدون رد أو رقم مغلق',
      en: 'Repeated unanswered calls or WhatsApp messages',
    },
  },
  {
    id: 'refused_warranty',
    label: { ar: 'رفض الالتزام بالضمان المعلن', en: 'Refused advertised warranty' },
    description: {
      ar: 'المتجر لم يلتزم بضمان الفحص أو الضمان المذكور',
      en: 'Store did not honor the stated inspection or warranty terms',
    },
  },
  {
    id: 'other',
    label: { ar: 'سبب آخر', en: 'Other issue' },
    description: {
      ar: 'ملاحظة أخرى حول هذا المتجر',
      en: 'Another concern about this store',
    },
  },
];

export function getReportReasonLabel(reasonId: ReportReasonId, lang: Language): string {
  const all = [...LISTING_REPORT_REASONS, ...STORE_REPORT_REASONS];
  const match = all.find((r) => r.id === reasonId);
  return match ? match.label[lang] : reasonId;
}

/**
 * Interactive Minimalist Claymorphism Bottom Sheet for reporting a phone listing or a store.
 */
export function ReportTargetSheet({
  open,
  targetType,
  targetName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  targetType: ReportTargetType;
  targetName: string;
  onClose: () => void;
  onSubmit: (payload: {
    reasonId: ReportReasonId;
    details: string;
    reporterContact: string;
  }) => void;
}) {
  const { lang } = usePrototype();
  const reasons = targetType === 'listing' ? LISTING_REPORT_REASONS : STORE_REPORT_REASONS;
  const [selectedReason, setSelectedReason] = useState<ReportReasonId | null>(null);
  const [details, setDetails] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedReason(null);
      setDetails('');
      setValidationError(null);
    }
  }, [open, targetType, targetName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setValidationError(
        lang === 'ar' ? 'يرجى اختيار سبب البلاغ أولاً' : 'Please select a reason for your report'
      );
      return;
    }
    if (selectedReason === 'other' && details.trim().length < 4) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى كتابة توضيح مختصر للسبب'
          : 'Please add a short explanation for "Other issue"'
      );
      return;
    }
    onSubmit({
      reasonId: selectedReason,
      details: details.trim(),
      reporterContact: reporterContact.trim(),
    });
    setDetails('');
    setSelectedReason(null);
    setValidationError(null);
    onClose();
  };

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
            className="store-clay clay-sheet rounded-t-[30px] max-h-[86%] flex flex-col overflow-hidden"
          >
            {/* Drag Handle + Header */}
            <div className="px-5 pt-3.5 pb-3 shrink-0 space-y-3">
              <div className="w-10 h-1 rounded-full bg-[#172B20]/15 mx-auto" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-[15px] bg-[#FCEBEC] border border-[#E5B8BC]/60 text-[#B4232C] flex items-center justify-center shrink-0">
                    <Flag className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#172B20] truncate">
                      {targetType === 'listing'
                        ? lang === 'ar'
                          ? 'الإبلاغ عن هذا الإعلان'
                          : 'Report this Listing'
                        : lang === 'ar'
                          ? 'الإبلاغ عن هذا المتجر'
                          : 'Report this Store'}
                    </h3>
                    <p className="text-[11px] text-[#5F776A] truncate mt-0.5">{targetName}</p>
                  </div>
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

            {/* Scrollable Reason Picker + Details */}
            <div className="flex-1 overflow-y-auto thin-scroll px-5 pb-4 space-y-3.5">
              <div className="rounded-[16px] bg-[#FDF3F3] border border-[#B4232C]/15 px-3 py-2.5 flex items-start gap-2 text-[11px] text-[#7D1D24] leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-[#B4232C] shrink-0 mt-0.5" />
                <span>
                  {lang === 'ar'
                    ? 'بلاغك سري بالكامل ويصل مباشرة إلى فريق الإشراف لحماية المشترين في السوق.'
                    : 'Your report is confidential and sent directly to our moderation team to keep the marketplace safe.'}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#4E6659] px-1">
                  {lang === 'ar' ? 'اختر سبب البلاغ' : 'Select a reason'}
                </p>
                {reasons.map((option) => {
                  const isSelected = selectedReason === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedReason(option.id);
                        setValidationError(null);
                      }}
                      className={`w-full rounded-[18px] p-3 text-start flex items-start justify-between gap-2.5 transition-all clay-focus-ring ${
                        isSelected
                          ? 'bg-[#FCEBEC] border border-[#B4232C]/35 shadow-sm'
                          : 'clay-card'
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold leading-snug ${
                            isSelected ? 'text-[#8F1B22]' : 'text-[#172B20]'
                          }`}
                        >
                          {option.label[lang]}
                        </p>
                        <p className="text-[10.5px] text-[#5F776A] mt-0.5 leading-snug">
                          {option.description[lang]}
                        </p>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'bg-[#B4232C] text-white'
                            : 'clay-inset text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Additional Details */}
              <div className="space-y-1.5">
                <label
                  htmlFor="report-details-input"
                  className="block text-[11px] font-semibold text-[#4E6659] px-1"
                >
                  {selectedReason === 'other'
                    ? lang === 'ar'
                      ? 'تفاصيل المشكلة (مطلوب)'
                      : 'Details (required)'
                    : lang === 'ar'
                      ? 'تفاصيل إضافية (اختياري)'
                      : 'Additional details (optional)'}
                </label>
                <textarea
                  id="report-details-input"
                  rows={3}
                  value={details}
                  onChange={(e) => {
                    setDetails(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={
                    lang === 'ar'
                      ? 'اكتب أي تفاصيل تساعد فريق الإشراف على التحقق بسرعة...'
                      : 'Add any helpful context for our moderation team...'
                  }
                  className="w-full p-3 rounded-[16px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none resize-none"
                />
              </div>

              {/* Optional Reporter Contact */}
              <div className="space-y-1.5">
                <label
                  htmlFor="report-contact-input"
                  className="block text-[11px] font-semibold text-[#4E6659] px-1"
                >
                  {lang === 'ar'
                    ? 'رقم هاتفك للمتابعة (اختياري)'
                    : 'Your phone for follow-up (optional)'}
                </label>
                <input
                  id="report-contact-input"
                  type="text"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: +249 91 000 0000' : 'e.g. +249 91 000 0000'}
                  className="w-full h-11 px-3.5 rounded-[16px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
                />
              </div>

              {validationError && (
                <p
                  role="alert"
                  className="text-[11px] font-bold text-[#B4232C] bg-[#FCEBEC] border border-[#B4232C]/25 rounded-[14px] px-3 py-2"
                >
                  {validationError}
                </p>
              )}
            </div>

            {/* Pinned Submit Footer */}
            <div className="px-5 py-3.5 border-t border-[#172B20]/[0.07] bg-[#F2F7F4]/95 shrink-0 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="clay-pill clay-focus-ring h-11 px-4 rounded-full text-xs font-bold text-[#4E6659] shrink-0"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-full bg-[#B4232C] hover:bg-[#961B23] active:scale-[0.98] text-white text-xs font-bold shadow-[0_10px_22px_-8px_rgba(180,35,44,0.48)] transition-all flex items-center justify-center gap-1.5 clay-focus-ring"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'إرسال البلاغ' : 'Submit Report'}</span>
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
