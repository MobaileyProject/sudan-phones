import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { CityId } from '../../types';
import { CITIES, formatCity, tText } from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import { LtrValue, VerificationStatusLabel } from '../../components/DesignSystem';
import { api, normalizeSudanPhone, uploadMediaFile } from '../../api/client';

/**
 * Live Merchant Authentication: Sign-In (Phone or Email), Merchant Registration + OTP, Password Recovery.
 */
export function MerchantAuthView({
  onAuthenticated,
}: {
  onAuthenticated: (mode: 'signin' | 'register') => void;
}) {
  const { lang, pushToast, loginWithBackend, refreshMerchantData } = usePrototype();
  const [authTab, setAuthTab] = useState<'signin' | 'register' | 'recovery'>('signin');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'email'>('whatsapp');

  const [identifier, setIdentifier] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (authTab === 'signin') {
      const id = identifier.trim();
      if (!id || !password) {
        setErrorMsg(
          lang === 'ar'
            ? 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني وكلمة المرور.'
            : 'Please enter your phone/email and password.'
        );
        return;
      }
      setLoading(true);
      try {
        const isEmail = id.includes('@');
        await loginWithBackend(
          isEmail ? { email: id, password } : { phone: normalizeSudanPhone(id), password }
        );
        await refreshMerchantData();
        pushToast('success', {
          ar: 'تم تسجيل الدخول إلى بوابة المتجر بنجاح.',
          en: 'Signed into Store Portal.',
        });
        onAuthenticated('signin');
      } catch (err: any) {
        setErrorMsg(err?.message || (lang === 'ar' ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    const cleanedDigits = phoneDigits.replace(/\D/g, '');
    if (cleanedDigits.length !== 9 && !(cleanedDigits.startsWith('249') && cleanedDigits.length === 12)) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال رقم هاتف سوداني صحيح (+249 متبوعاً بـ 9 أرقام).'
          : 'Please enter a valid Sudan mobile number (+249 followed by 9 digits).'
      );
      return;
    }

    if (authTab === 'register') {
      if (!ownerName.trim()) {
        setErrorMsg(lang === 'ar' ? 'يرجى إدخال اسم مالك المتجر.' : 'Please enter store owner name.');
        return;
      }
      if (password.length < 8) {
        setErrorMsg(
          lang === 'ar'
            ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'
            : 'Password must be at least 8 characters.'
        );
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(
          lang === 'ar' ? 'تأكيد كلمة المرور غير مطابق.' : 'Confirm password does not match.'
        );
        return;
      }
      setLoading(true);
      try {
        await api.registerMerchant({
          name: ownerName.trim(),
          phone: normalizeSudanPhone(phoneDigits),
          email: email.trim() || undefined,
          password,
          channel: otpChannel,
        });
        setStep('otp');
        setOtp('');
        pushToast('info', {
          ar: 'تم إنشاء الحساب وإرسال رمز التحقق.',
          en: 'Account created and verification code sent.',
        });
      } catch (err: any) {
        setErrorMsg(err?.message || (lang === 'ar' ? 'تعذر إنشاء الحساب.' : 'Registration failed.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Password recovery request
    setLoading(true);
    try {
      await api.recoverPassword({
        phone: normalizeSudanPhone(phoneDigits),
        channel: otpChannel,
      });
      setStep('otp');
      setOtp('');
      pushToast('info', {
        ar: 'تم إرسال رمز استعادة الحساب.',
        en: 'Recovery verification code sent.',
      });
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'ar' ? 'تعذر إرسال رمز الاستعادة.' : 'Recovery failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (otp.trim().length < 4) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال رمز التحقق.' : 'Please enter the verification code.');
      return;
    }
    setLoading(true);
    try {
      if (authTab === 'recovery') {
        if (newPassword.length < 8) {
          setErrorMsg(
            lang === 'ar'
              ? 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.'
              : 'New password must be at least 8 characters.'
          );
          setLoading(false);
          return;
        }
        await api.recoverPassword({
          phone: normalizeSudanPhone(phoneDigits),
          channel: otpChannel,
          code: otp.trim(),
          password: newPassword,
        });
        pushToast('success', {
          ar: 'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.',
          en: 'Password updated. You can now sign in.',
        });
        setAuthTab('signin');
        setStep('credentials');
      } else {
        await api.verifyOtp({ code: otp.trim(), channel: otpChannel });
        await refreshMerchantData();
        pushToast('success', {
          ar: 'تم توثيق الحساب بنجاح.',
          en: 'Account verified successfully.',
        });
        onAuthenticated('register');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'ar' ? 'رمز التحقق غير صحيح.' : 'Invalid verification code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#0F6B5D]">
          {lang === 'ar'
            ? 'بوابة المتجر — المتاجر الفعلية الموثّقة في السودان'
            : 'Store Portal — Verified Physical Stores in Sudan'}
        </p>
        <h2 className="text-xl font-bold text-slate-900">
          {authTab === 'signin'
            ? lang === 'ar'
              ? 'تسجيل دخول المتجر'
              : 'Store Sign In'
            : authTab === 'register'
              ? lang === 'ar'
                ? 'تسجيل حساب تاجر جديد'
                : 'Register Store Account'
              : lang === 'ar'
                ? 'استعادة كلمة المرور'
                : 'Recover Account'}
        </h2>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
        {(
          [
            { id: 'signin', ar: 'دخول', en: 'Sign In' },
            { id: 'register', ar: 'حساب جديد', en: 'Register' },
            { id: 'recovery', ar: 'استعادة', en: 'Recover' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setAuthTab(t.id);
              setStep('credentials');
              setErrorMsg('');
            }}
            className={`h-9 rounded-lg transition-colors ${
              authTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {lang === 'ar' ? t.ar : t.en}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {step === 'credentials' ? (
        <form onSubmit={handleSubmitCredentials} className="space-y-4">
          {authTab === 'signin' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'رقم الهاتف السوداني أو البريد الإلكتروني' : 'Sudan Phone or Email'}
              </label>
              <input
                type="text"
                dir="ltr"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+249912345678 / store@example.com"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
          ) : (
            <>
              {authTab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'اسم مالك المتجر *' : 'Store Owner Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full name'}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'رقم الهاتف السوداني (+249) *' : 'Sudan Phone (+249) *'}
                </label>
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="h-11 px-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center text-xs font-mono-num font-bold text-slate-700">
                    +249
                  </span>
                  <input
                    type="tel"
                    required
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value)}
                    placeholder="912345678"
                    className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
              </div>

              {authTab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="store@example.com"
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'قناة استلام رمز التحقق' : 'OTP Delivery Channel'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['whatsapp', 'email'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setOtpChannel(ch)}
                      className={`h-9 rounded-xl border text-xs font-semibold ${
                        otpChannel === ch
                          ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {ch === 'whatsapp'
                        ? lang === 'ar'
                          ? 'واتساب'
                          : 'WhatsApp'
                        : lang === 'ar'
                          ? 'البريد الإلكتروني'
                          : 'Email'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {authTab !== 'recovery' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3 pe-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {authTab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {authTab === 'signin'
              ? lang === 'ar'
                ? 'تسجيل الدخول'
                : 'Sign In'
              : authTab === 'register'
                ? lang === 'ar'
                  ? 'إنشاء الحساب وإرسال الرمز'
                  : 'Create Account & Send OTP'
                : lang === 'ar'
                  ? 'إرسال رمز الاستعادة'
                  : 'Send Recovery Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'ar' ? 'رمز التحقق (OTP)' : 'Verification Code (OTP)'}
            </label>
            <input
              type="text"
              dir="ltr"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              className="w-full h-11 px-3 rounded-xl border border-slate-200 text-center text-base font-mono-num tracking-widest focus:outline-none focus:border-[#0F6B5D]"
            />
          </div>
          {authTab === 'recovery' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
            >
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {lang === 'ar' ? 'تأكيد الرمز' : 'Verify Code'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * Live Store Onboarding & Private Verification Document Submission.
 */
export function MerchantOnboardingFlow({ onFinished }: { onFinished: () => void }) {
  const { lang, activeMerchantStore, refreshMerchantData, pushToast } = usePrototype();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [storeName, setStoreName] = useState(
    activeMerchantStore.id !== '0' ? activeMerchantStore.name.ar || activeMerchantStore.name.en : ''
  );
  const [city, setCity] = useState<CityId>(activeMerchantStore.city || 'khartoum');
  const [address, setAddress] = useState(
    activeMerchantStore.id !== '0' ? activeMerchantStore.address.ar || '' : ''
  );
  const [phone, setPhone] = useState(activeMerchantStore.phone || '');
  const [whatsapp, setWhatsapp] = useState(activeMerchantStore.whatsapp || '');
  const [description, setDescription] = useState(activeMerchantStore.description.ar || '');
  const [openingHours, setOpeningHours] = useState(activeMerchantStore.openingHours.ar || '');

  const [businessProofType, setBusinessProofType] = useState<'storefront_photo' | 'commercial_reg'>(
    'storefront_photo'
  );
  const [docs, setDocs] = useState<
    Record<
      'national_id_front' | 'national_id_back' | 'business_proof',
      { status: 'missing' | 'uploading' | 'uploaded' | 'failed'; assetId?: string; fileName?: string; error?: string }
    >
  >({
    national_id_front: { status: 'missing' },
    national_id_back: { status: 'missing' },
    business_proof: { status: 'missing' },
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSaveBusinessInfo = async () => {
    if (!storeName.trim() || !address.trim() || phone.replace(/\D/g, '').length < 9) {
      setFormError(
        lang === 'ar'
          ? 'يرجى إدخال اسم المتجر، العنوان، ورقم هاتف سوداني صحيح.'
          : 'Please enter store name, address, and a valid Sudan phone number.'
      );
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await api.updateStoreProfile({
        name: storeName.trim(),
        city,
        address: address.trim(),
        phone: normalizeSudanPhone(phone),
        whatsapp: normalizeSudanPhone(whatsapp || phone),
        description: description.trim(),
        opening_hours: openingHours.trim(),
      });
      await refreshMerchantData();
      setStep(3);
    } catch (err: any) {
      setFormError(err?.message || (lang === 'ar' ? 'تعذر حفظ بيانات المتجر.' : 'Failed to save store info.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (
    slot: 'national_id_front' | 'national_id_back' | 'business_proof',
    file: File
  ) => {
    const rawKind = slot === 'business_proof' ? businessProofType : slot;
    const KIND_MAP: Record<string, string> = {
      national_id_front: 'id_front',
      national_id_back: 'id_back',
      commercial_reg: 'commercial',
      storefront_photo: 'signboard',
    };
    const kind = KIND_MAP[rawKind] || rawKind;
    setDocs((prev) => ({ ...prev, [slot]: { status: 'uploading', fileName: file.name } }));
    try {
      const assetId = await uploadMediaFile(file, kind, 'verification');
      setDocs((prev) => ({
        ...prev,
        [slot]: { status: 'uploaded', assetId, fileName: file.name },
      }));
    } catch (err: any) {
      setDocs((prev) => ({
        ...prev,
        [slot]: { status: 'failed', fileName: file.name, error: err?.message || 'Upload failed' },
      }));
    }
  };

  const handleSubmitVerification = async () => {
    const assetIds = [
      docs.national_id_front.assetId,
      docs.national_id_back.assetId,
      docs.business_proof.assetId,
    ].filter(Boolean) as string[];
    if (assetIds.length < 3) {
      setFormError(
        lang === 'ar'
          ? 'يرجى رفع المستندات الثلاثة المطلوبة قبل الإرسال.'
          : 'Please upload all 3 required documents before submitting.'
      );
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await api.submitVerification(assetIds);
      await refreshMerchantData();
      pushToast('success', {
        ar: 'تم إرسال طلب توثيق المتجر بنجاح.',
        en: 'Store verification submitted successfully.',
      });
      setStep(4);
    } catch (err: any) {
      setFormError(err?.message || (lang === 'ar' ? 'تعذر إرسال طلب التوثيق.' : 'Submission failed.'));
    } finally {
      setSaving(false);
    }
  };

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            { n: 1, ar: '1. المتطلبات', en: '1. Requirements' },
            { n: 2, ar: '2. بيانات المتجر', en: '2. Store Info' },
            { n: 3, ar: '3. مستندات التوثيق', en: '3. Documents' },
            { n: 4, ar: '4. تم الإرسال', en: '4. Submitted' },
          ].map((s) => (
            <div key={s.n} className="space-y-1.5">
              <div className={`h-1.5 rounded-full ${step >= s.n ? 'bg-[#0F6B5D]' : 'bg-slate-200'}`} />
              <p className={`text-[11px] font-semibold truncate ${step >= s.n ? 'text-slate-900' : 'text-slate-400'}`}>
                {lang === 'ar' ? s.ar : s.en}
              </p>
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {lang === 'ar' ? 'توثيق متجرك على سودان فونز' : 'Verify Your Store on Sudan Phones'}
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {lang === 'ar'
                ? 'نقبل المتاجر الفعلية في جميع ولايات السودان لضمان ثقة المشترين. بعد التوثيق يمكنك نشر هواتفك الجديدة والمستعملة فوراً.'
                : 'We onboard verified physical phone stores across all Sudan states. Once verified, your listings publish directly to customer discovery.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <Building2 className="w-5 h-5 text-[#0F6B5D]" />
              <p className="font-bold text-slate-900">{lang === 'ar' ? 'عنوان فعلي واضح' : 'Physical Storefront'}</p>
              <p className="text-slate-600">
                {lang === 'ar' ? 'الولاية، السوق، والشارع ليتمكن العملاء من زيارة متجرك.' : 'State, market, and street address for buyers.'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <FileText className="w-5 h-5 text-[#0F6B5D]" />
              <p className="font-bold text-slate-900">{lang === 'ar' ? 'الهوية وإثبات المتجر' : 'ID & Store Proof'}</p>
              <p className="text-slate-600">
                {lang === 'ar' ? 'البطاقة القومية (الوجهين) + السجل التجاري أو صورة واجهة المتجر (صورة أو PDF).' : 'National ID (front & back) + Commercial Reg or Storefront photo (Image or PDF).'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <Lock className="w-5 h-5 text-[#0F6B5D]" />
              <p className="font-bold text-slate-900">{lang === 'ar' ? 'خصوصية تامة' : 'Strictly Private'}</p>
              <p className="text-slate-600">
                {lang === 'ar' ? 'تُستخدم المستندات للمراجعة الداخلية فقط ولا تظهر للعملاء أبداً.' : 'Used for internal verification only and never shown publicly.'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onFinished} className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              {lang === 'ar' ? 'العودة لحالة التوثيق' : 'Back to Status'}
            </button>
            <button type="button" onClick={() => setStep(2)} className="h-10 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold">
              {lang === 'ar' ? 'إدخال بيانات المتجر' : 'Enter Store Info'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'ar' ? 'بيانات المتجر الفعلي' : 'Physical Store Information'}
          </h2>
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'اسم المتجر *' : 'Store Name *'}
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'الولاية *' : 'State *'}
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as CityId)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>{tText(c.name, lang)}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'العنوان التفصيلي (السوق / الشارع / رقم المحل) *' : 'Market / Street Address *'}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'رقم هاتف المتجر *' : 'Store Phone *'}
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+249912345678"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'رقم واتساب المتجر *' : 'Store WhatsApp *'}
              </label>
              <input
                type="tel"
                dir="ltr"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+249912345678"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'ساعات العمل' : 'Opening Hours'}
              </label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: السبت - الخميس 9ص - 9م' : 'e.g., Sat - Thu 9am - 9pm'}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'نبذة عن المتجر' : 'Store Description'}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setStep(1)} className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <BackArrow className="w-4 h-4" />
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
            <button type="button" disabled={saving} onClick={handleSaveBusinessInfo} className="h-10 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {lang === 'ar' ? 'حفظ والمتابعة للمستندات' : 'Save & Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'ar' ? 'رفع مستندات التوثيق السرية' : 'Upload Private Verification Documents'}
          </h2>
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setBusinessProofType('storefront_photo')}
              className={`p-3 rounded-xl border text-start text-xs font-semibold ${
                businessProofType === 'storefront_photo' ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]' : 'border-slate-200 text-slate-700'
              }`}
            >
              {lang === 'ar' ? 'صورة واجهة المتجر واللافتة' : 'Storefront & Signboard Photo'}
            </button>
            <button
              type="button"
              onClick={() => setBusinessProofType('commercial_reg')}
              className={`p-3 rounded-xl border text-start text-xs font-semibold ${
                businessProofType === 'commercial_reg' ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]' : 'border-slate-200 text-slate-700'
              }`}
            >
              {lang === 'ar' ? 'السجل التجاري (صورة أو PDF)' : 'Commercial Registration (Image or PDF)'}
            </button>
          </div>

          <div className="space-y-3">
            {(
              [
                { key: 'national_id_front', title: lang === 'ar' ? 'البطاقة القومية — الوجه الأمامي *' : 'National ID — Front *' },
                { key: 'national_id_back', title: lang === 'ar' ? 'البطاقة القومية — الوجه الخلفي *' : 'National ID — Back *' },
                {
                  key: 'business_proof',
                  title:
                    businessProofType === 'commercial_reg'
                      ? lang === 'ar' ? 'السجل التجاري الساري *' : 'Commercial Registration *'
                      : lang === 'ar' ? 'صورة واجهة المتجر واللافتة *' : 'Storefront & Signboard Photo *',
                },
              ] as const
            ).map((slot) => {
              const doc = docs[slot.key];
              return (
                <div key={slot.key} className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">{slot.title}</p>
                    {doc.status === 'uploaded' && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {doc.fileName}
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        {doc.error || (lang === 'ar' ? 'فشل الرفع' : 'Upload failed')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-300 hover:border-[#0F6B5D] text-xs font-semibold text-slate-800 cursor-pointer">
                      {doc.status === 'uploading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0F6B5D]" /> : <Upload className="w-3.5 h-3.5 text-[#0F6B5D]" />}
                      {doc.status === 'uploading'
                        ? lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'
                        : lang === 'ar' ? 'اختيار ملف (صورة أو PDF)' : 'Choose File (Image or PDF)'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocUpload(slot.key, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {doc.status === 'uploaded' && (
                      <button
                        type="button"
                        onClick={() => setDocs((prev) => ({ ...prev, [slot.key]: { status: 'missing' } }))}
                        className="p-2 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setStep(2)} className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <BackArrow className="w-4 h-4" />
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
            <button type="button" disabled={saving} onClick={handleSubmitVerification} className="h-10 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {lang === 'ar' ? 'إرسال طلب التوثيق' : 'Submit for Verification'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">
            {lang === 'ar' ? 'تم استلام طلب توثيق متجرك' : 'Verification Application Submitted'}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {lang === 'ar'
              ? 'سيقوم فريق المراجعة بفحص المستندات قريباً. يمكنك متابعة حالة الطلب من صفحة التوثيق.'
              : 'Our review team will inspect your submitted documents shortly. Track your status anytime.'}
          </p>
          <button type="button" onClick={onFinished} className="h-10 px-6 rounded-xl bg-[#0F6B5D] text-white text-xs font-semibold">
            {lang === 'ar' ? 'متابعة حالة التوثيق' : 'Track Verification Status'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Live Verification Status Tracker synced with GET /api/v1/stores/me/verification.
 */
export function MerchantVerificationTracker({
  onStartOnboarding,
  onGoToAddListing,
}: {
  onStartOnboarding: () => void;
  onGoToAddListing: () => void;
}) {
  const { lang, activeMerchantStore, refreshMerchantData, pushToast } = usePrototype();
  const [liveVerif, setLiveVerif] = useState<any>(null);
  const [reuploading, setReuploading] = useState(false);
  const [uploadedAssetIds, setUploadedAssetIds] = useState<string[]>([]);

  useEffect(() => {
    api
      .getMyVerification()
      .then((res) => setLiveVerif(res.data || null))
      .catch(() => setLiveVerif(null));
  }, [activeMerchantStore.id, activeMerchantStore.verificationStatus]);

  const st = activeMerchantStore;
  const status = st.verificationStatus;
  const feedbackText = liveVerif?.reason || (st.reviewerFeedback ? tText(st.reviewerFeedback, lang) : '');

  const handleReuploadDoc = async (file: File) => {
    setReuploading(true);
    try {
      const assetId = await uploadMediaFile(file, 'storefront_photo', 'verification');
      setUploadedAssetIds((prev) => [...prev, assetId]);
      pushToast('success', { ar: 'تم رفع المستند بنجاح.', en: 'Document uploaded.' });
    } catch (err: any) {
      pushToast('error', { ar: err?.message || 'فشل رفع المستند.', en: err?.message || 'Upload failed.' });
    } finally {
      setReuploading(false);
    }
  };

  const handleResubmit = async () => {
    if (uploadedAssetIds.length === 0) return;
    setReuploading(true);
    try {
      await api.submitVerification(uploadedAssetIds);
      await refreshMerchantData();
      setUploadedAssetIds([]);
      pushToast('success', { ar: 'تمت إعادة إرسال الطلب للمراجعة.', en: 'Resubmitted for review.' });
    } catch (err: any) {
      pushToast('error', { ar: err?.message || 'تعذرت إعادة الإرسال.', en: err?.message || 'Resubmission failed.' });
    } finally {
      setReuploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900">{tText(st.name, lang)}</h1>
            <VerificationStatusLabel status={status} lang={lang} />
          </div>
          <p className="text-xs text-slate-600">
            {formatCity(st.city, lang)} · {tText(st.address, lang)}
          </p>
        </div>

        {status === 'verified' ? (
          <button
            type="button"
            onClick={onGoToAddListing}
            className="h-10 px-4 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold whitespace-nowrap"
          >
            {lang === 'ar' ? '+ إضافة هاتف جديد للمخزون' : '+ Add Phone Listing'}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'نشر الإعلانات مقفل حتى يتم توثيق المتجر'
                : 'Listing creation locked until store is verified'}
            </span>
          </div>
        )}
      </div>

      {status === 'verified' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-emerald-950">
                {lang === 'ar' ? 'متجرك موثّق بالكامل وعمليات النشر مفعّلة' : 'Your Store Is Verified — Operations Unlocked'}
              </h2>
              <p className="text-xs text-emerald-900/90 mt-1">
                {lang === 'ar'
                  ? 'يمكنك الآن إضافة الهواتف الجديدة والمستعملة وإدارة الأسعار والمخزون.'
                  : 'You can now publish new and used phones and manage prices and stock.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onGoToAddListing} className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold">
            {lang === 'ar' ? 'إنشاء إعلان الآن' : 'Create Listing Now'}
          </button>
        </div>
      )}

      {status === 'draft' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'طلب التوثيق في حالة مسودة' : 'Verification Application Is in Draft'}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {lang === 'ar'
                ? 'أكمل بيانات المتجر وارفع المستندات المطلوبة لتقديم طلبك للمراجعة.'
                : 'Complete store info and upload required documents to submit.'}
            </p>
          </div>
          <button type="button" onClick={onStartOnboarding} className="h-10 px-5 rounded-xl bg-[#0F6B5D] text-white text-xs font-semibold">
            {lang === 'ar' ? 'إكمال طلب التوثيق' : 'Complete Onboarding'}
          </button>
        </div>
      )}

      {status === 'submitted' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-amber-950">
              {lang === 'ar' ? 'طلبك قيد المراجعة لدى فريق التوثيق' : 'Application Awaiting Review'}
            </h2>
            <p className="text-xs text-amber-900/90 mt-1">
              {lang === 'ar'
                ? 'تم استلام مستنداتك بنجاح وسيتم إشعارك فور اعتماد المتجر.'
                : 'Your documents have been received and are awaiting reviewer approval.'}
            </p>
          </div>
        </div>
      )}

      {status === 'changes_requested' && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-orange-950">
                {lang === 'ar' ? 'مطلوب تعديلات لإكمال التوثيق' : 'Reviewer Requested Changes'}
              </h2>
              {feedbackText && (
                <p className="text-xs text-orange-950 bg-white/80 border border-orange-200 rounded-xl p-3 mt-2">
                  {feedbackText}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white border border-orange-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-300 bg-slate-50 hover:border-[#0F6B5D] text-xs font-semibold text-slate-800 cursor-pointer">
              {reuploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#0F6B5D]" />}
              {lang === 'ar' ? 'رفع مستند محدّث (صورة أو PDF)' : 'Upload Updated Document'}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleReuploadDoc(f);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              disabled={uploadedAssetIds.length === 0 || reuploading}
              onClick={handleResubmit}
              className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold disabled:opacity-45"
            >
              {lang === 'ar' ? 'إعادة الإرسال للمراجعة' : 'Resubmit for Review'}
            </button>
          </div>
        </div>
      )}

      {(status === 'suspended' || status === 'rejected') && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-red-950">
              {status === 'suspended'
                ? lang === 'ar' ? 'تم تعليق المتجر مؤقتاً' : 'Store Temporarily Suspended'
                : lang === 'ar' ? 'تم رفض طلب التوثيق' : 'Verification Rejected'}
            </h2>
            {feedbackText && (
              <p className="text-xs text-red-900 bg-white/80 border border-red-200 rounded-xl p-3">{feedbackText}</p>
            )}
            <p className="text-xs text-red-900/90">
              {lang === 'ar' ? 'للمساعدة تواصل مع فريق الدعم على ' : 'Contact support at '}
              <LtrValue className="font-semibold">merchants@sudanphones.sd</LtrValue>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
