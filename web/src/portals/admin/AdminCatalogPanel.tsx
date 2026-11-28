import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Smartphone, Trash2 } from 'lucide-react';
import { api, ApiBrand, ApiCatalogModel } from '../../api/client';
import { usePrototype } from '../../store/PrototypeContext';

export function AdminCatalogPanel() {
  const { lang, refreshPublicData, pushToast } = usePrototype();
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [models, setModels] = useState<ApiCatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<number | 'all'>('all');

  // Add Brand state
  const [newBrandEn, setNewBrandEn] = useState('');
  const [newBrandAr, setNewBrandAr] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);

  // Add Model state
  const [modelBrandId, setModelBrandId] = useState<string>('');
  const [modelName, setModelName] = useState('');
  const [releaseYear, setReleaseYear] = useState('2025');
  const [chipset, setChipset] = useState('Snapdragon 8 Gen 3');
  const [cameraMp, setCameraMp] = useState('50');
  const [batteryMah, setBatteryMah] = useState('5000');
  const [savingModel, setSavingModel] = useState(false);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [bRes, mRes] = await Promise.all([
        api.getCatalogBrands(),
        api.getCatalogModels({ limit: 200 }),
      ]);
      const bList = bRes.data || [];
      setBrands(bList);
      setModels(mRes.data || []);
      if (!modelBrandId && bList.length > 0) {
        setModelBrandId(String(bList[0].id));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const brandNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of brands) {
      map.set(b.id, b.name);
    }
    return map;
  }, [brands]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((m) => {
      if (selectedBrandId !== 'all' && m.brand_id !== selectedBrandId) return false;
      if (q) {
        const bName = brandNameById.get(m.brand_id) || '';
        return (
          m.name.toLowerCase().includes(q) ||
          bName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [models, search, selectedBrandId, brandNameById]);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandEn.trim()) return;
    setSavingBrand(true);
    try {
      await api.createAdminBrand({
        name: newBrandEn.trim(),
        name_ar: newBrandAr.trim() || newBrandEn.trim(),
      });
      setNewBrandEn('');
      setNewBrandAr('');
      await Promise.all([loadCatalog(), refreshPublicData()]);
      pushToast('success', {
        ar: 'تمت إضافة الماركة للكتالوج.',
        en: 'Brand added to catalog.',
      });
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'تعذر إضافة الماركة.',
        en: err?.message || 'Failed to add brand.',
      });
    } finally {
      setSavingBrand(false);
    }
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelBrandId || !modelName.trim()) return;
    setSavingModel(true);
    try {
      await api.createAdminModel({
        brand_id: Number(modelBrandId),
        name: modelName.trim(),
        release_year: Number(releaseYear) || 2025,
        chipset: chipset.trim(),
        camera_mp: Number(cameraMp) || 50,
        battery_mah: Number(batteryMah) || 5000,
      });
      setModelName('');
      await Promise.all([loadCatalog(), refreshPublicData()]);
      pushToast('success', {
        ar: 'تمت إضافة موديل الهاتف ونسخه الافتراضية.',
        en: 'Phone model & default variants added to catalog.',
      });
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'تعذر إضافة الموديل.',
        en: err?.message || 'Failed to add phone model.',
      });
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteModel = async (model: ApiCatalogModel) => {
    try {
      await api.deleteAdminModel(model.id);
      await Promise.all([loadCatalog(), refreshPublicData()]);
      pushToast('info', {
        ar: `تم حذف ${model.name} من الكتالوج.`,
        en: `Removed ${model.name} from catalog.`,
      });
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'تعذر حذف الموديل.',
        en: err?.message || 'Failed to delete model.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'ar' ? 'إدارة كتالوج الهواتف (الماركات والموديلات)' : 'Phone Catalog Manager (Brands & Models)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'ar'
              ? 'أضف الماركات والموديلات الجديدة ليتمكن التجار من إدراجها فوراً في السوق.'
              : 'Add new brands and phone releases so merchants can list them immediately.'}
          </p>
        </div>
        <button
          type="button"
          onClick={loadCatalog}
          className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Add Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <form
          onSubmit={handleCreateBrand}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
        >
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#0F6B5D]" />
            {lang === 'ar' ? 'إضافة ماركة جديدة' : 'Add New Brand'}
          </h3>
          <input
            type="text"
            required
            dir="ltr"
            value={newBrandEn}
            onChange={(e) => setNewBrandEn(e.target.value)}
            placeholder="Honor, Oppo, Google..."
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
          />
          <input
            type="text"
            value={newBrandAr}
            onChange={(e) => setNewBrandAr(e.target.value)}
            placeholder={lang === 'ar' ? 'الاسم بالعربية (مثال: هونر)' : 'Arabic name (e.g. هونر)'}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
          />
          <button
            type="submit"
            disabled={savingBrand}
            className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50"
          >
            {lang === 'ar' ? 'حفظ الماركة' : 'Save Brand'}
          </button>
        </form>

        <form
          onSubmit={handleCreateModel}
          className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
        >
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-[#0F6B5D]" />
            {lang === 'ar' ? 'إضافة موديل هاتف جديد للكتالوج' : 'Add New Phone Model'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'ar' ? 'الماركة' : 'Brand'}
              </label>
              <select
                value={modelBrandId}
                onChange={(e) => setModelBrandId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {lang === 'ar' && b.name_ar ? `${b.name_ar} (${b.name})` : b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'ar' ? 'اسم الموديل' : 'Model Name'}
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. iPhone 16 Pro Max"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'ar' ? 'سنة الإصدار' : 'Release Year'}
              </label>
              <input
                type="number"
                dir="ltr"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="2025"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'ar' ? 'المعالج' : 'Chipset'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={chipset}
                onChange={(e) => setChipset(e.target.value)}
                placeholder="Snapdragon 8 Gen 3"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'ar' ? 'الكاميرا (MP)' : 'Camera (MP)'}
                </label>
                <input
                  type="number"
                  dir="ltr"
                  value={cameraMp}
                  onChange={(e) => setCameraMp(e.target.value)}
                  placeholder="50"
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-200 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'ar' ? 'البطارية (mAh)' : 'Battery (mAh)'}
                </label>
                <input
                  type="number"
                  dir="ltr"
                  value={batteryMah}
                  onChange={(e) => setBatteryMah(e.target.value)}
                  placeholder="5000"
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-200 text-xs tabular-nums"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingModel}
              className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold disabled:opacity-50"
            >
              {lang === 'ar' ? 'إضافة الموديل للكتالوج' : 'Add Phone Model'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Models Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث في الموديلات...' : 'Search catalog models...'}
              className="w-full h-10 ps-9 pe-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
            />
          </div>
          <select
            value={String(selectedBrandId)}
            onChange={(e) =>
              setSelectedBrandId(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs"
          >
            <option value="all">{lang === 'ar' ? 'كل الماركات' : 'All Brands'}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {lang === 'ar' && b.name_ar ? `${b.name_ar} (${b.name})` : b.name} ({b.model_count})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الموديل' : 'Model'}</th>
                <th className="py-3 px-3 text-start">{lang === 'ar' ? 'الماركة' : 'Brand'}</th>
                <th className="py-3 px-3 text-start">{lang === 'ar' ? 'المواصفات' : 'Specs'}</th>
                <th className="py-3 px-4 text-end">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModels.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 text-start font-bold text-slate-900">
                    <span dir="ltr" className="inline-block">{m.name}</span>
                  </td>
                  <td className="py-3 px-3 text-start text-slate-700">
                    {brandNameById.get(m.brand_id) || `#${m.brand_id}`}
                  </td>
                  <td className="py-3 px-3 text-start text-slate-500 tabular-nums">
                    <span dir="ltr" className="inline-block">
                      {[
                        m.specifications?.release_year,
                        m.specifications?.performance?.chipset,
                        m.specifications?.battery?.capacity_mah
                          ? `${m.specifications.battery.capacity_mah}mAh`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteModel(m)}
                      aria-label={`Delete ${m.name}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
