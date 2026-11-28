import React, { useState } from 'react';
import { Megaphone, RefreshCw, X } from 'lucide-react';
import { CityId, Listing } from '../../types';
import { CITIES, formatListingTitle, formatSdg } from '../../i18n/translations';
import { api } from '../../api/client';
import { usePrototype } from '../../store/PrototypeContext';

const DURATION_PACKAGES = [
  { days: 3, priceSdg: 75000, ar: '3 أيام', en: '3 Days' },
  { days: 7, priceSdg: 150000, ar: '7 أيام (الأكثر طلباً)', en: '7 Days (Popular)' },
  { days: 14, priceSdg: 260000, ar: '14 يوماً', en: '14 Days' },
  { days: 30, priceSdg: 480000, ar: '30 يوماً', en: '30 Days' },
];

export function MerchantAdRequestModal({
  storeListings,
  defaultCity,
  onClose,
}: {
  storeListings: Listing[];
  defaultCity: CityId;
  onClose: () => void;
}) {
  const { lang, refreshMerchantData, pushToast } = usePrototype();
  const [listingId, setListingId] = useState<string>(storeListings[0]?.id || '');
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [subtitleAr, setSubtitleAr] = useState('');
  const [targetCity, setTargetCity] = useState<string>(defaultCity || 'all');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPkg =
    DURATION_PACKAGES.find((p) => p.days === durationDays) || DURATION_PACKAGES[1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim() && !titleEn.trim()) {
      pushToast('error', {
        ar: 'يرجى إدخال عنوان الإعلان.',
        en: 'Please enter an ad headline.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const selectedListing = storeListings.find((l) => l.id === listingId);
      await api.requestStoreAd({
        listing_id: listingId ? Number(listingId) : null,
        title_ar: titleAr.trim() || titleEn.trim(),
        title_en: titleEn.trim() || titleAr.trim(),
        subtitle_ar: subtitleAr.trim(),
        subtitle_en: subtitleAr.trim(),
        target_city: targetCity,
        duration_days: durationDays,
        paid_amount_sdg: selectedPkg.priceSdg,
        payment_ref: paymentRef.trim() || `BNK-${Date.now().toString().slice(-6)}`,
        image_url: selectedListing?.photos[0]?.url || undefined,
      });
      await refreshMerchantData();
      pushToast('success', {
        ar: 'تم إرسال طلب الحملة الإعلانية للمراجعة والتفعيل.',
        en: 'Sponsored ad request submitted for admin review.',
      });
      onClose();
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'تعذر إرسال طلب الإعلان.',
        en: err?.message || 'Failed to submit ad request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#0F6B5D]" />
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'طلب حملة إعلان مموّل' : 'Request Sponsored Ad Campaign'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto thin-scroll p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'ar' ? 'ربط الإعلان بهاتف محدد (اختياري)' : 'Link to Specific Phone (Optional)'}
            </label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs"
            >
              <option value="">
                {lang === 'ar' ? 'ترويج صفحة المتجر بالكامل' : 'Promote Entire Store Profile'}
              </option>
              {storeListings.map((l) => (
                <option key={l.id} value={l.id}>
                  {formatListingTitle(l.arabicBrandPrefix, l.model, lang)} ({l.storageGb}GB — {formatSdg(l.priceSdg, lang)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'عنوان الإعلان (بالعربية) *' : 'Headline (Arabic) *'}
              </label>
              <input
                type="text"
                required
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder={lang === 'ar' ? 'عروض الأسبوع على الآيفون' : 'Weekly iPhone Offers'}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'عنوان الإعلان (بالإنجليزية)' : 'Headline (English)'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Weekly iPhone Offers"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'ar' ? 'وصف مختصر للعرض' : 'Short Offer Subtitle'}
            </label>
            <input
              type="text"
              value={subtitleAr}
              onChange={(e) => setSubtitleAr(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'ضمان 12 شهر وإمكانية الاستبدال الفوري'
                  : '12-month warranty and instant trade-in available'
              }
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {lang === 'ar' ? 'الباقة والمدة' : 'Campaign Package & Duration'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {DURATION_PACKAGES.map((pkg) => {
                const active = durationDays === pkg.days;
                return (
                  <button
                    key={pkg.days}
                    type="button"
                    onClick={() => setDurationDays(pkg.days)}
                    className={`p-3 rounded-xl border text-start transition-colors ${
                      active
                        ? 'border-[#0F6B5D] bg-teal-50/70 ring-1 ring-[#0F6B5D]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">
                      {lang === 'ar' ? pkg.ar : pkg.en}
                    </p>
                    <p className="text-xs font-semibold text-[#0F6B5D] mt-0.5 tabular-nums">
                      {formatSdg(pkg.priceSdg, lang)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'الولاية المستهدفة' : 'Target State / City'}
              </label>
              <select
                value={targetCity}
                onChange={(e) => setTargetCity(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="all">{lang === 'ar' ? 'كل السودان' : 'All Sudan'}</option>
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'ar' ? c.name.ar : c.name.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'رقم إشعار تحويل بنكك (Bankak)' : 'Bankak Transfer Ref #'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="BNK-2026-4812"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs tabular-nums focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-slate-500">{lang === 'ar' ? 'الإجمالي: ' : 'Total: '}</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {formatSdg(selectedPkg.priceSdg, lang)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {lang === 'ar' ? 'إرسال الطلب للإدارة' : 'Submit Ad Request'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
