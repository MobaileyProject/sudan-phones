import React, { useState } from 'react';
import { RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Listing, UsedAvailability, UsedChecklist, UsedGrade } from '../../types';
import { formatListingTitle, formatSdg } from '../../i18n/translations';
import { api } from '../../api/client';
import { usePrototype } from '../../store/PrototypeContext';

const DEFAULT_CHECKLIST: UsedChecklist = {
  biometricsWorking: true,
  originalScreen: true,
  networkUnlocked: true,
  cleanImei: true,
  accessoriesIncluded: false,
};

export function MerchantListingEditModal({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const { lang, refreshMerchantData, refreshPublicData, pushToast } = usePrototype();

  const [price, setPrice] = useState(String(listing.priceSdg));
  const [usdPrice, setUsdPrice] = useState(listing.usdPrice != null ? String(listing.usdPrice) : '');
  const [storageGb, setStorageGb] = useState(String(listing.storageGb));
  const [ramGb, setRamGb] = useState(String(listing.ramGb || 8));
  const [color, setColor] = useState(listing.color.ar || listing.color.en);
  const [acceptsTradeIn, setAcceptsTradeIn] = useState(Boolean(listing.acceptsTradeIn));

  // New fields
  const [stockQty, setStockQty] = useState(String(listing.stockQty ?? 1));
  const [warrantyMonths, setWarrantyMonths] = useState(String(listing.warrantyMonths ?? 12));
  const [warrantyType, setWarrantyType] = useState(listing.warrantyType?.ar || '');
  const [sealedBox, setSealedBox] = useState(Boolean(listing.sealedBox));

  // Used fields
  const [usedGrade, setUsedGrade] = useState<UsedGrade>(listing.usedGrade || 'excellent');
  const [usedAvailability, setUsedAvailability] = useState<UsedAvailability>(
    listing.usedAvailability || 'available'
  );
  const [batteryPct, setBatteryPct] = useState(
    listing.batteryHealthPct != null ? String(listing.batteryHealthPct) : '88'
  );
  const [inspectionDays, setInspectionDays] = useState(String(listing.inspectionWarrantyDays ?? 7));
  const [defects, setDefects] = useState(listing.defectsDescription?.ar || '');
  const [replacedParts, setReplacedParts] = useState(listing.replacedParts?.ar || '');
  const [originalBox, setOriginalBox] = useState(Boolean(listing.originalBox));
  const [checklist, setChecklist] = useState<UsedChecklist>(
    listing.usedChecklist || DEFAULT_CHECKLIST
  );

  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      pushToast('error', {
        ar: 'يرجى إدخال سعر صحيح.',
        en: 'Please enter a valid SDG price.',
      });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        version: (listing as any)._version || listing.version || 1,
        price: numPrice,
        usd_price: usdPrice.trim() ? Number(usdPrice) : null,
        storage_gb: Number(storageGb) || listing.storageGb,
        ram_gb: Number(ramGb) || listing.ramGb || 8,
        color: color.trim() || 'Standard',
        accepts_trade_in: acceptsTradeIn,
      };
      if (listing.condition === 'new') {
        payload.quantity = Math.max(0, Number(stockQty) || 0);
        payload.warranty_months = Math.max(0, Number(warrantyMonths) || 0);
        payload.warranty_type = warrantyType.trim();
        payload.is_sealed = sealedBox;
      } else {
        payload.grade = usedGrade;
        payload.used_availability = usedAvailability;
        payload.quantity = usedAvailability === 'sold' ? 0 : 1;
        payload.battery_health = Math.min(100, Math.max(50, Number(batteryPct) || 85));
        payload.warranty_days = Math.max(0, Number(inspectionDays) || 0);
        payload.defects = defects.trim();
        payload.replaced_parts = replacedParts.trim();
        payload.has_original_box = originalBox;
        payload.used_checklist = {
          biometrics_working: checklist.biometricsWorking,
          original_screen: checklist.originalScreen,
          network_unlocked: checklist.networkUnlocked,
          clean_imei: checklist.cleanImei,
          accessories_included: checklist.accessoriesIncluded,
        };
      }

      await api.editListing(listing.id, payload);
      await Promise.all([refreshMerchantData(), refreshPublicData()]);
      pushToast('success', {
        ar: 'تم حفظ تعديلات الإعلان بنجاح.',
        en: 'Listing changes saved.',
      });
      onClose();
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'تعذر حفظ التعديلات.',
        en: err?.message || 'Failed to update listing.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {lang === 'ar' ? 'تعديل تفاصيل الإعلان الكاملة' : 'Edit Full Listing Details'}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {formatListingTitle(listing.arabicBrandPrefix, listing.model, lang)}
            </p>
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

        <div className="flex-1 overflow-y-auto thin-scroll p-5 space-y-5">
          {/* Core Price & Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'السعر بالجنيه السوداني (SDG) *' : 'Price (SDG) *'}
              </label>
              <input
                type="number"
                required
                min={1}
                dir="ltr"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
              />
              {Number(price) > 0 && (
                <p className="text-[11px] text-[#0F6B5D] font-semibold mt-1">
                  {formatSdg(Number(price), lang)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'السعر المرجعي بالدولار (اختياري)' : 'Reference USD Price (Optional)'}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={usdPrice}
                onChange={(e) => setUsdPrice(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'المساحة التخزينية (GB)' : 'Storage (GB)'}
              </label>
              <input
                type="number"
                min={16}
                max={4096}
                dir="ltr"
                value={storageGb}
                onChange={(e) => setStorageGb(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'الرام (GB)' : 'RAM (GB)'}
              </label>
              <input
                type="number"
                min={2}
                max={64}
                dir="ltr"
                value={ramGb}
                onChange={(e) => setRamGb(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'اللون' : 'Color'}
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptsTradeIn}
                  onChange={(e) => setAcceptsTradeIn(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0F6B5D]"
                />
                {lang === 'ar' ? 'يقبل الاستبدال (Trade-In)' : 'Accepts Trade-In'}
              </label>
            </div>
          </div>

          {listing.condition === 'new' ? (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'الكمية المتوفرة' : 'Stock Quantity'}
                </label>
                <input
                  type="number"
                  min={0}
                  dir="ltr"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'مدة الضمان (أشهر)' : 'Warranty (Months)'}
                </label>
                <input
                  type="number"
                  min={0}
                  dir="ltr"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm tabular-nums"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'نوع الضمان' : 'Warranty Type'}
                </label>
                <input
                  type="text"
                  value={warrantyType}
                  onChange={(e) => setWarrantyType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sealedBox}
                    onChange={(e) => setSealedBox(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0F6B5D]"
                  />
                  {lang === 'ar' ? 'مختوم بعلبته الأصلية' : 'Factory sealed box'}
                </label>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'درجة النظافة' : 'Cosmetic Grade'}
                  </label>
                  <select
                    value={usedGrade}
                    onChange={(e) => setUsedGrade(e.target.value as UsedGrade)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="like_new">{lang === 'ar' ? 'شبه جديد' : 'Like New'}</option>
                    <option value="excellent">{lang === 'ar' ? 'ممتاز' : 'Excellent'}</option>
                    <option value="good">{lang === 'ar' ? 'جيد' : 'Good'}</option>
                    <option value="fair">{lang === 'ar' ? 'مقبول' : 'Fair'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'حالة التوفر' : 'Unit Availability'}
                  </label>
                  <select
                    value={usedAvailability}
                    onChange={(e) => setUsedAvailability(e.target.value as UsedAvailability)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="available">{lang === 'ar' ? 'متوفر' : 'Available'}</option>
                    <option value="reserved">{lang === 'ar' ? 'محجوز' : 'Reserved'}</option>
                    <option value="sold">{lang === 'ar' ? 'مباع' : 'Sold'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'صحة البطارية (%)' : 'Battery Health (%)'}
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    dir="ltr"
                    value={batteryPct}
                    onChange={(e) => setBatteryPct(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm tabular-nums"
                  />
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
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'وصف الحالة والعيوب' : 'Condition & Defects'}
                  </label>
                  <textarea
                    rows={2}
                    value={defects}
                    onChange={(e) => setDefects(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'القطع المستبدلة' : 'Replaced Parts'}
                  </label>
                  <input
                    type="text"
                    value={replacedParts}
                    onChange={(e) => setReplacedParts(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              {/* Used Phone Verification Checklist */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0F6B5D]" />
                  {lang === 'ar' ? 'قائمة فحص الجهاز المستعمل' : 'Used Device Verification Checklist'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-800">
                  {(
                    [
                      ['biometricsWorking', 'البصمة / Face ID تعمل بنجاح', 'Face ID / Fingerprint working'],
                      ['originalScreen', 'الشاشة أصلية (True Tone / OLED)', 'Original screen (no knockoff)'],
                      ['networkUnlocked', 'مفتوح الشبكة (زين / MTN / سوداني)', 'Unlocked for all Sudan SIMs'],
                      ['cleanImei', 'IMEI سليم بدون قفل iCloud / FRP', 'Clean IMEI / No account lock'],
                      ['accessoriesIncluded', 'الشاحن والملحقات الأصلية متوفرة', 'Original charger & accessories'],
                    ] as const
                  ).map(([key, ar, en]) => (
                    <label key={key} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist[key]}
                        onChange={(e) =>
                          setChecklist((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-slate-300 text-[#0F6B5D]"
                      />
                      <span>{lang === 'ar' ? ar : en}</span>
                    </label>
                  ))}
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={originalBox}
                      onChange={(e) => setOriginalBox(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0F6B5D]"
                    />
                    <span>{lang === 'ar' ? 'العلبة الأصلية متوفرة' : 'Original box included'}</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
