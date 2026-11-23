import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { CityId, VerificationDocument } from '../../types';
import { CITIES, formatCity, tText } from '../../i18n/translations';
import { IMAGES } from '../../data/mockData';
import { usePrototype } from '../../store/PrototypeContext';
import { LtrValue, SafeImage, VerificationStatusLabel } from '../../components/DesignSystem';

/**
 * Merchant Access: Sign-In, Registration, +249 Phone, OTP Verification with Countdown & Error, Recovery
 */
export function MerchantAuthView({
  onAuthenticated,
}: {
  onAuthenticated: (mode: 'signin' | 'register') => void;
}) {
  const { lang, pushToast, sim } = usePrototype();
  const [authTab, setAuthTab] = useState<'signin' | 'register' | 'recovery'>('signin');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [recoveryEmail, setRecoveryEmail] = useState('owner@nilephones.sd');
  const [phoneDigits, setPhoneDigits] = useState('91 234 5678');
  const [ownerName, setOwnerName] = useState('أحمد عوض الكريم');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const isOffline = sim.offlineMode === 'offline_cached' || sim.offlineMode === 'offline_empty';

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [countdown]);

  const cleanedDigits = phoneDigits.replace(/\D/g, '');

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      setPhoneError(
        lang === 'ar'
          ? 'الاتصال بالإنترنت منقطع حالياً. تم الاحتفاظ ببياناتك — أعد المحاولة فور عودة الشبكة.'
          : 'You are currently offline. Your entered details are preserved — retry once connected.'
      );
      return;
    }
    if (authTab !== 'recovery' || otpChannel === 'whatsapp') {
      if (cleanedDigits.length !== 9) {
        setPhoneError(
          lang === 'ar'
            ? 'تسجيل ودخول المتاجر يقبل رقم هاتف سوداني صحيح (9 أرقام بعد +249) فقط.'
            : 'Merchant accounts require a valid 9-digit Sudan mobile number after +249.'
        );
        return;
      }
    } else if (!recoveryEmail.includes('@')) {
      setPhoneError(
        lang === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح لاستلام رمز التحقق.'
          : 'Please enter a valid email address to receive your verification code.'
      );
      return;
    }
    if (authTab !== 'recovery') {
      if (!password || password.length < 6) {
        setPhoneError(
          lang === 'ar'
            ? 'يرجى إدخال كلمة مرور لا تقل عن 6 أحرف.'
            : 'Please enter a password of at least 6 characters.'
        );
        return;
      }
      if (authTab === 'register' && password !== confirmPassword) {
        setPhoneError(
          lang === 'ar'
            ? 'تأكيد كلمة المرور غير مطابق لكلمة المرور.'
            : 'Confirm password does not match password.'
        );
        return;
      }
    }
    setPhoneError('');
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      if (authTab === 'signin') {
        pushToast('success', {
          ar: 'تم تسجيل الدخول إلى بوابة التاجر بنجاح.',
          en: 'Signed into Merchant Portal.',
        });
        onAuthenticated('signin');
        return;
      }
      setStep('otp');
      setCountdown(45);
      setOtp('');
      setOtpError('');
      pushToast('info', {
        ar:
          otpChannel === 'whatsapp'
            ? 'تم إرسال رمز التحقق عبر واتساب (استخدم 123456 للنجاح أو 000000 لاختبار الخطأ).'
            : 'تم إرسال رمز التحقق عبر البريد الإلكتروني (استخدم 123456 للنجاح أو 000000 لاختبار الخطأ).',
        en:
          otpChannel === 'whatsapp'
            ? 'Verification code sent via WhatsApp (use 123456 to succeed or 000000 to test invalid code).'
            : 'Verification code sent via Email (use 123456 to succeed or 000000 to test invalid code).',
      });
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      setOtpError(
        lang === 'ar'
          ? 'انقطع الاتصال بالشبكة أثناء التحقق من الرمز. أعد المحاولة عند استقرار الاتصال.'
          : 'Connection lost while verifying code. Please retry when online.'
      );
      return;
    }
    if (otp.trim().length !== 6) {
      setOtpError(
        lang === 'ar' ? 'أدخل رمز التحقق المكون من 6 أرقام.' : 'Enter the 6-digit verification code.'
      );
      return;
    }
    if (otp.trim() === '000000') {
      setOtpError(
        lang === 'ar'
          ? otpChannel === 'whatsapp'
            ? 'رمز التحقق غير صحيح أو منتهي الصلاحية. تحقق من رسالة واتساب أو أعد الإرسال.'
            : 'رمز التحقق غير صحيح أو منتهي الصلاحية. تحقق من البريد الإلكتروني أو أعد الإرسال.'
          : otpChannel === 'whatsapp'
            ? 'Invalid or expired verification code. Check your WhatsApp message or request a new code.'
            : 'Invalid or expired verification code. Check your Email inbox or request a new code.'
      );
      return;
    }
    setOtpError('');
    if (authTab === 'recovery') {
      pushToast('success', {
        ar: 'تم التحقق من هويتك واستعادة الوصول لحساب المتجر.',
        en: 'Identity confirmed and merchant account access recovered.',
      });
      onAuthenticated('signin');
    } else {
      pushToast('success', {
        ar: 'تم تسجيل الدخول إلى بوابة التاجر بنجاح.',
        en: 'Signed into Merchant Portal.',
      });
      onAuthenticated(authTab);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#0F6B5D]">
          {lang === 'ar' ? 'بوابة التجار — المتاجر الفعلية الموثقة فقط' : 'Merchant Portal — Verified Physical Stores Only'}
        </p>
        <h2 className="text-xl font-bold text-slate-900">
          {authTab === 'signin'
            ? lang === 'ar'
              ? 'تسجيل دخول المتجر'
              : 'Merchant Sign In'
            : authTab === 'register'
              ? lang === 'ar'
                ? 'تسجيل متجر جديد'
                : 'Register a Physical Store'
              : lang === 'ar'
                ? 'استعادة حساب التاجر'
                : 'Recover Merchant Account'}
        </h2>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs">
        {(
          [
            { id: 'signin', ar: 'تسجيل الدخول', en: 'Sign In' },
            { id: 'register', ar: 'متجر جديد', en: 'Register' },
            { id: 'recovery', ar: 'استعادة الحساب', en: 'Recovery' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setAuthTab(t.id);
              setStep('phone');
              setPhoneError('');
              setOtpError('');
            }}
            className={`h-9 rounded-lg font-semibold transition-colors ${
              authTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {lang === 'ar' ? t.ar : t.en}
          </button>
        ))}
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          {authTab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'اسم مالك المتجر أو المفوّض' : 'Store Owner / Representative Name'}
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
          )}

          {(authTab === 'register' || authTab === 'recovery') && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'ar' ? 'قناة رمز التحقق (واتساب أو بريد إلكتروني فقط)' : 'OTP Channel (WhatsApp or Email only)'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOtpChannel('whatsapp')}
                  className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    otpChannel === 'whatsapp'
                      ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'واتساب' : 'WhatsApp'}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpChannel('email')}
                  className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    otpChannel === 'email'
                      ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </button>
              </div>
              {otpChannel === 'email' && (
                <div className="space-y-2">
                  <input
                    type="email"
                    dir="ltr"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="store@domain.sd"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono-num focus:outline-none focus:border-[#0F6B5D]"
                  />
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                    {lang === 'ar'
                      ? 'ملاحظة مهمة: التحقق عبر البريد الإلكتروني يثبت ملكية البريد فقط، ولا يثبت ملكية رقم واتساب المتجر.'
                      : 'Note: Email verification confirms your email address only — it does not verify ownership of a WhatsApp number.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {(authTab !== 'recovery' || otpChannel === 'whatsapp') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ar' ? 'رقم الهاتف المسجل (السودان +249 فقط)' : 'Sudan Mobile Number (+249 only)'}
              </label>
              <div
                dir="ltr"
                className={`flex items-center rounded-xl border overflow-hidden transition-colors ${
                  phoneError ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus-within:border-[#0F6B5D]'
                }`}
              >
                <span className="h-11 px-3.5 bg-slate-100 border-r border-slate-200 flex items-center gap-1.5 text-sm font-mono-num font-semibold text-slate-700 shrink-0">
                  <span>+249</span>
                  <Lock className="w-3 h-3 text-slate-500" />
                </span>
                <input
                  type="tel"
                  value={phoneDigits}
                  onChange={(e) => {
                    setPhoneDigits(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder="91 234 5678"
                  className="flex-1 min-w-0 h-11 px-3 text-sm font-mono-num focus:outline-none bg-transparent"
                />
              </div>
            </div>
          )}

          {authTab !== 'recovery' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'كلمة المرور *' : 'Password *'}
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-[#0F6B5D] px-3">
                  <KeyRound className="w-4 h-4 text-slate-400 me-2 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder={lang === 'ar' ? '6 أحرف على الأقل' : 'At least 6 characters'}
                    className="flex-1 h-11 text-sm focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="p-1.5 text-slate-500 hover:text-slate-800"
                    aria-label={lang === 'ar' ? 'إظهار/إخفاء كلمة المرور' : 'Toggle password visibility'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authTab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-[#0F6B5D] px-3">
                    <KeyRound className="w-4 h-4 text-slate-400 me-2 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (phoneError) setPhoneError('');
                      }}
                      placeholder={lang === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                      className="flex-1 h-11 text-sm focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {phoneError && (
            <p className="text-xs text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {phoneError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : authTab === 'signin' ? (
              <KeyRound className="w-4 h-4" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
            <span>
              {authTab === 'signin'
                ? lang === 'ar'
                  ? 'تسجيل الدخول'
                  : 'Sign In'
                : lang === 'ar'
                  ? 'متابعة والتحقق من الرقم'
                  : 'Continue & Verify Number'}
            </span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">
                {otpChannel === 'whatsapp'
                  ? lang === 'ar'
                    ? 'أُرسل عبر واتساب إلى: '
                    : 'Sent via WhatsApp to: '
                  : lang === 'ar'
                    ? 'أُرسل عبر البريد الإلكتروني إلى: '
                    : 'Sent via Email to: '}
                <LtrValue className="font-semibold text-slate-900">
                  {otpChannel === 'whatsapp' ? `+249 ${phoneDigits}` : recoveryEmail}
                </LtrValue>
              </span>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-[#0F6B5D] font-semibold hover:underline shrink-0"
              >
                {lang === 'ar' ? 'تغيير' : 'Change'}
              </button>
            </div>
            {otpChannel === 'email' && (
              <p className="text-[11px] text-amber-800">
                {lang === 'ar'
                  ? 'التحقق بالبريد لا يثبت ملكية رقم واتساب.'
                  : 'Email verification does not confirm WhatsApp number ownership.'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'رمز التحقق (6 أرقام)' : '6-Digit Verification Code'}
            </label>
            <input
              type="text"
              dir="ltr"
              maxLength={6}
              inputMode="numeric"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                if (otpError) setOtpError('');
              }}
              placeholder="123456"
              className={`w-full h-12 px-4 rounded-xl border text-center tracking-[0.45em] text-lg font-mono-num font-bold focus:outline-none ${
                otpError ? 'border-red-400 bg-red-50/40' : 'border-slate-200 focus:border-[#0F6B5D]'
              }`}
            />
            {otpError ? (
              <p className="text-xs text-red-700 mt-1.5 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {otpError}
              </p>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>
                  {lang === 'ar' ? 'للتجربة: 123456 صحيح · 000000 خطأ' : 'Demo: 123456 valid · 000000 invalid'}
                </span>
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={() => {
                    setCountdown(45);
                    pushToast('info', { ar: 'تمت إعادة إرسال رمز التحقق.', en: 'Verification code resent.' });
                  }}
                  className="font-semibold text-[#0F6B5D] disabled:text-slate-400"
                >
                  {countdown > 0
                    ? lang === 'ar'
                      ? `إعادة الإرسال (${countdown}ث)`
                      : `Resend in ${countdown}s`
                    : lang === 'ar'
                      ? 'إعادة إرسال الرمز'
                      : 'Resend code'}
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تأكيد والمتابعة' : 'Verify & Continue'}</span>
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * M-01, M-02, M-03: Guided Merchant Onboarding, Business Info & Private Evidence Upload
 */
export function MerchantOnboardingFlow({
  onFinished,
}: {
  onFinished: () => void;
}) {
  const { lang, activeMerchantStore, registerOrUpdateStore, sim, pushToast } = usePrototype();
  const isOffline = sim.offlineMode === 'offline_cached' || sim.offlineMode === 'offline_empty';
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'failed' | 'uncertain'>('idle');

  const isEditingExisting = activeMerchantStore.verificationStatus === 'draft' || activeMerchantStore.verificationStatus === 'changes_requested';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [storeNameAr, setStoreNameAr] = useState(
    isEditingExisting ? activeMerchantStore.name.ar : 'متجر بورتسودان الذكي'
  );
  const [storeNameEn, setStoreNameEn] = useState(
    isEditingExisting ? activeMerchantStore.name.en : 'Port Sudan Smart Mobile'
  );
  const [city, setCity] = useState<CityId>(isEditingExisting ? activeMerchantStore.city : 'port_sudan');
  const [addressAr, setAddressAr] = useState(
    isEditingExisting ? activeMerchantStore.address.ar : 'السوق الكبير، شارع الميناء، محل 22'
  );
  const [locationNote, setLocationNote] = useState(
    isEditingExisting ? activeMerchantStore.locationGuidance.ar : 'مقابل عمارة الخليج — الدور الأرضي'
  );
  const [phone, setPhone] = useState(
    isEditingExisting ? activeMerchantStore.phone : '+249 91 702 3344'
  );
  const [whatsapp, setWhatsapp] = useState(
    isEditingExisting ? activeMerchantStore.whatsapp : '+249 91 702 3344'
  );
  const [descAr, setDescAr] = useState(
    isEditingExisting
      ? activeMerchantStore.description.ar
      : 'متجر فعلي متخصص في الهواتف الجديدة والمستعملة المفحوصة مع ضمان استبدال.'
  );
  const [applicantName, setApplicantName] = useState(
    isEditingExisting ? activeMerchantStore.applicantName.ar : 'عوض محمد الحسن'
  );
  const [businessProofType, setBusinessProofType] = useState<'storefront_photo' | 'commercial_reg'>(
    'storefront_photo'
  );
  const [formError, setFormError] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  // M-03 Verification documents state
  const [docs, setDocs] = useState<Record<string, VerificationDocument>>(() => {
    const initial: Record<string, VerificationDocument> = {
      national_id_front: {
        id: 'd-front',
        type: 'national_id_front',
        label: { ar: 'البطاقة القومية — الوجه الأمامي', en: 'National ID — Front' },
        fileName: '',
        uploadedAt: '',
        status: 'missing',
        imageUrl: IMAGES.storefront,
      },
      national_id_back: {
        id: 'd-back',
        type: 'national_id_back',
        label: { ar: 'البطاقة القومية — الوجه الخلفي', en: 'National ID — Back' },
        fileName: '',
        uploadedAt: '',
        status: 'missing',
        imageUrl: IMAGES.storefront,
      },
      business_proof: {
        id: 'd-proof',
        type: 'storefront_photo',
        label: { ar: 'صورة واجهة المتجر واللافتة', en: 'Storefront & Signboard Photo' },
        fileName: '',
        uploadedAt: '',
        status: 'missing',
        imageUrl: IMAGES.storefront,
      },
    };
    if (isEditingExisting) {
      for (const d of activeMerchantStore.documents) {
        if (d.type === 'national_id_front') initial.national_id_front = d;
        if (d.type === 'national_id_back') initial.national_id_back = d;
        if (d.type === 'storefront_photo' || d.type === 'commercial_reg') initial.business_proof = d;
      }
    }
    return initial;
  });

  const simulateUpload = (slot: 'national_id_front' | 'national_id_back' | 'business_proof', forceFail = false) => {
    const shouldFail = forceFail || isOffline || sim.submissionOutcome === 'failure';
    setDocs((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], status: 'uploading' },
    }));
    window.setTimeout(() => {
      setDocs((prev) => ({
        ...prev,
        [slot]: {
          ...prev[slot],
          type: slot === 'business_proof' ? businessProofType : prev[slot].type,
          status: shouldFail ? 'failed' : 'uploaded',
          fileName:
            slot === 'national_id_front'
              ? 'national_id_front_scan.jpg'
              : slot === 'national_id_back'
                ? 'national_id_back_scan.jpg'
                : businessProofType === 'commercial_reg'
                  ? 'commercial_registration_2026.pdf'
                  : 'storefront_daylight_sign.jpg',
          uploadedAt: '2026-11-20 01:15',
          imageUrl: IMAGES.storefront,
        },
      }));
    }, sim.offlineMode === 'slow' ? 1100 : 550);
  };

  const removeDoc = (slot: 'national_id_front' | 'national_id_back' | 'business_proof') => {
    setDocs((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], status: 'missing', fileName: '' },
    }));
  };

  const allDocsUploaded =
    docs.national_id_front.status === 'uploaded' &&
    docs.national_id_back.status === 'uploaded' &&
    docs.business_proof.status === 'uploaded';

  const handleContinueFromStep2 = () => {
    if (!storeNameAr.trim() || !addressAr.trim() || phone.replace(/\D/g, '').length < 9) {
      setFormError(
        lang === 'ar'
          ? 'يرجى إكمال اسم المتجر، العنوان التفصيلي، ورقم التواصل الصحيح قبل المتابعة.'
          : 'Please complete store name, physical address, and valid contact phone before continuing.'
      );
      return;
    }
    setFormError('');
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 2000);
    setStep(3);
  };

  const handleFinalSubmit = (bypassUncertain = false) => {
    if (isOffline) {
      setSubmitState('failed');
      pushToast('error', {
        ar: 'انقطع الاتصال بالإنترنت. تم حفظ جميع بياناتك ومستنداتك محلياً — أعد المحاولة فور عودة الاتصال.',
        en: 'Connection lost. Your details and uploads are preserved — retry once back online.',
      });
      return;
    }
    setSubmitState('submitting');
    window.setTimeout(() => {
      if (!bypassUncertain && sim.submissionOutcome === 'failure') {
        setSubmitState('failed');
        return;
      }
      if (!bypassUncertain && sim.submissionOutcome === 'uncertain') {
        setSubmitState('uncertain');
        return;
      }
      registerOrUpdateStore(
        isEditingExisting ? activeMerchantStore.id : null,
        {
          name: { ar: storeNameAr.trim(), en: storeNameEn.trim() || storeNameAr.trim() },
          city,
          address: { ar: addressAr.trim(), en: addressAr.trim() },
          locationGuidance: { ar: locationNote.trim(), en: locationNote.trim() },
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          description: { ar: descAr.trim(), en: descAr.trim() },
          applicantName: { ar: applicantName.trim(), en: applicantName.trim() },
          applicantPhone: phone.trim(),
          documents: Object.values(docs),
        },
        true
      );
      setSubmitState('idle');
      setStep(4);
    }, sim.offlineMode === 'slow' ? 900 : 400);
  };

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Progress Stepper (M-01) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            { n: 1, ar: '1. متطلبات التوثيق', en: '1. Requirements' },
            { n: 2, ar: '2. بيانات المتجر', en: '2. Business Info' },
            { n: 3, ar: '3. مستندات التحقق', en: '3. Verification Docs' },
            { n: 4, ar: '4. تأكيد الإرسال', en: '4. Submitted' },
          ].map((s) => (
            <div key={s.n} className="space-y-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  step >= s.n ? 'bg-[#0F6B5D]' : 'bg-slate-200'
                }`}
              />
              <p
                className={`text-[11px] font-semibold truncate ${
                  step >= s.n ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {lang === 'ar' ? s.ar : s.en}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: M-01 Onboarding Requirements */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {lang === 'ar'
                ? 'مرحباً بك في توثيق متاجر سودان فونز'
                : 'Become a Verified Store on Sudan Phones'}
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {lang === 'ar'
                ? 'نقبل المتاجر الفعلية فقط في المدن التجريبية (بورتسودان، الخرطوم، أم درمان) لضمان ثقة المشترين. بعد التوثيق يمكنك نشر هواتفك الجديدة والمستعملة لتظهر للعملاء تلقائياً.'
                : 'We onboard verified physical phone stores across Port Sudan, Khartoum, and Omdurman. Once verified, your valid listings go live automatically after photo checks.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <Building2 className="w-5 h-5 text-[#0F6B5D]" />
              <p className="font-bold text-slate-900">
                {lang === 'ar' ? 'عنوان فعلي واضح' : 'Physical Storefront'}
              </p>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? 'اسم السوق، الشارع، ومعلم قريب يساعد العميل على زيارة المتجر ومعاينة الهاتف.'
                  : 'Market name, street address, and clear landmarks for in-person inspection.'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <FileText className="w-5 h-5 text-[#0F6B5D]" />
              <p className="font-bold text-slate-900">
                {lang === 'ar' ? 'الهوية وإثبات المتجر' : 'ID & Store Proof'}
              </p>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? 'البطاقة القومية (الوجهين) + السجل التجاري أو صورة واضحة للافتة المتجر.'
                  : 'National ID (front & back) + Commercial Registration or storefront signboard photo.'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <Lock className="w-5 h-5 text-[#0F6B5D]" />
              <p className="font-bold text-slate-900">
                {lang === 'ar' ? 'خصوصية تامة للمستندات' : 'Strictly Private Docs'}
              </p>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? 'تُستخدم المستندات للمراجعة الداخلية فقط ولا تظهر أبداً في ملف المتجر العام.'
                  : 'Documents are visible only to authorized reviewers and never appear publicly.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onFinished}
              className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {lang === 'ar' ? 'العودة لحالة التوثيق' : 'Back to Status'}
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-10 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold"
            >
              {lang === 'ar' ? 'ابدأ إدخال بيانات المتجر' : 'Start Business Information'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: M-02 Business Information */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'ar' ? 'بيانات المتجر الفعلي (M-02)' : 'Physical Store Information (M-02)'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ar'
                  ? 'ستظهر هذه البيانات للعملاء في ملف المتجر العام بعد التوثيق.'
                  : 'This information will appear on your public verified store profile.'}
              </p>
            </div>
            {savedFeedback && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {lang === 'ar' ? 'تم حفظ التقدم' : 'Progress saved'}
              </span>
            )}
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'اسم المتجر (بالعربية) *' : 'Store Name (Arabic) *'}
              </label>
              <input
                type="text"
                value={storeNameAr}
                onChange={(e) => setStoreNameAr(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'اسم المتجر (بالإنجليزية)' : 'Store Name (English)'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={storeNameEn}
                onChange={(e) => setStoreNameEn(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'الولاية (جميع ولايات السودان) *' : 'State (All Sudan States) *'}
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as CityId)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#0F6B5D]"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {tText(c.name, lang)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'اسم مقدم الطلب (مالك المتجر) *' : 'Applicant / Owner Name *'}
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'العنوان التفصيلي (السوق / الشارع / رقم المحل) *' : 'Market / Street Address *'}
              </label>
              <input
                type="text"
                value={addressAr}
                onChange={(e) => setAddressAr(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'وصف الموقع ومعلم قريب' : 'Location Guidance / Nearby Landmark'}
              </label>
              <input
                type="text"
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'رقم اتصال المتجر *' : 'Store Contact Phone *'}
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'رقم واتساب المتجر *' : 'Store WhatsApp Number *'}
              </label>
              <input
                type="tel"
                dir="ltr"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'نبذة عن المتجر' : 'Store Description'}
              </label>
              <textarea
                rows={3}
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50"
            >
              <BackArrow className="w-4 h-4" />
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
            <button
              type="button"
              onClick={handleContinueFromStep2}
              className="h-10 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold"
            >
              {lang === 'ar' ? 'حفظ والمتابعة للمستندات' : 'Save & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: M-03 Verification Evidence Upload */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'ar' ? 'رفع مستندات التوثيق السرية (M-03)' : 'Upload Private Verification Evidence (M-03)'}
            </h2>
            <div className="mt-2 p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {lang === 'ar'
                  ? 'مستندات خاصة ومحمية: لا تُعرض هذه الملفات للمشترين أو في ملف المتجر العام أبداً، ويطلع عليها فريق التوثيق المخوّل في سودان فونز فقط.'
                  : 'Private & confidential: These documents are visible strictly to authorized Sudan Phones reviewers and will never appear on your public store profile.'}
              </p>
            </div>
          </div>

          {/* Proof Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {lang === 'ar' ? 'اختر إثبات المتجر الفعلي' : 'Choose Business Proof Document'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBusinessProofType('storefront_photo')}
                className={`p-3 rounded-xl border text-start text-xs font-semibold transition-colors ${
                  businessProofType === 'storefront_photo'
                    ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'صورة واجهة المتجر واللافتة الخارجية' : 'Storefront & Signboard Photo'}
              </button>
              <button
                type="button"
                onClick={() => setBusinessProofType('commercial_reg')}
                className={`p-3 rounded-xl border text-start text-xs font-semibold transition-colors ${
                  businessProofType === 'commercial_reg'
                    ? 'border-[#0F6B5D] bg-teal-50 text-[#0F6B5D]'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'نسخة السجل التجاري الساري' : 'Valid Commercial Registration'}
              </button>
            </div>
          </div>

          {/* 3 Upload Slots */}
          <div className="space-y-3">
            {(
              [
                {
                  key: 'national_id_front',
                  title: lang === 'ar' ? 'البطاقة القومية — الوجه الأمامي *' : 'National ID — Front *',
                },
                {
                  key: 'national_id_back',
                  title: lang === 'ar' ? 'البطاقة القومية — الوجه الخلفي *' : 'National ID — Back *',
                },
                {
                  key: 'business_proof',
                  title:
                    businessProofType === 'commercial_reg'
                      ? lang === 'ar'
                        ? 'السجل التجاري الساري *'
                        : 'Commercial Registration *'
                      : lang === 'ar'
                        ? 'صورة نهارية واضحة لواجهة المتجر واللافتة *'
                        : 'Clear Daytime Storefront & Signboard Photo *',
                },
              ] as const
            ).map((slot) => {
              const doc = docs[slot.key];
              return (
                <div
                  key={slot.key}
                  className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">{slot.title}</p>
                    {doc.status === 'uploaded' && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'مرفوع وجاهز' : 'Uploaded'}
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'فشل الرفع' : 'Upload failed'}
                      </span>
                    )}
                  </div>

                  {doc.status === 'missing' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => simulateUpload(slot.key, false)}
                        className="h-9 px-3.5 rounded-lg bg-white border border-slate-300 hover:border-[#0F6B5D] text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#0F6B5D]" />
                        {lang === 'ar' ? 'اسحب الملف أو اختر صورة' : 'Drag & drop or choose file'}
                      </button>
                    </div>
                  )}

                  {doc.status === 'uploading' && (
                    <div className="space-y-1.5">
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full w-2/3 bg-[#0F6B5D] animate-pulse rounded-full" />
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {lang === 'ar' ? 'جاري رفع الملف وتشفيره...' : 'Uploading and encrypting document...'}
                      </p>
                    </div>
                  )}

                  {doc.status === 'failed' && (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                      <span>
                        {lang === 'ar'
                          ? 'انقطع الاتصال أثناء رفع الملف. أعد المحاولة.'
                          : 'Connection interrupted during upload. Please retry.'}
                      </span>
                      <button
                        type="button"
                        onClick={() => simulateUpload(slot.key, false)}
                        className="h-8 px-3 rounded-lg bg-red-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                      </button>
                    </div>
                  )}

                  {doc.status === 'uploaded' && (
                    <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SafeImage src={doc.imageUrl} alt={doc.fileName} aspectClass="w-12 h-9 rounded shrink-0" />
                        <div className="min-w-0">
                          <p dir="ltr" className="text-xs font-mono-num font-medium text-slate-800 truncate">
                            {doc.fileName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {lang === 'ar' ? 'وثيقة خاصة للمراجعة فقط' : 'Private reviewer-only file'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => simulateUpload(slot.key, false)}
                          className="h-8 px-2.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {lang === 'ar' ? 'استبدال' : 'Replace'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDoc(slot.key)}
                          aria-label="Remove document"
                          className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pre-Submission Checklist */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <p className="font-bold text-slate-900">
              {lang === 'ar' ? 'قائمة التحقق قبل الإرسال' : 'Pre-Submission Completion Checklist'}
            </p>
            {[
              { ok: Boolean(storeNameAr.trim() && addressAr.trim()), ar: 'بيانات المتجر والعنوان الفعلي مكتملة', en: 'Store info & physical address complete' },
              { ok: docs.national_id_front.status === 'uploaded' && docs.national_id_back.status === 'uploaded', ar: 'صورتا البطاقة القومية (الأمام والخلف) مرفوعتان', en: 'National ID front & back uploaded' },
              { ok: docs.business_proof.status === 'uploaded', ar: 'إثبات المتجر (اللافتة أو السجل التجاري) مرفوع', en: 'Storefront photo or commercial registration uploaded' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${item.ok ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Check className="w-3 h-3" />
                </span>
                <span className={item.ok ? 'text-slate-800' : 'text-slate-500'}>
                  {lang === 'ar' ? item.ar : item.en}
                </span>
              </div>
            ))}
          </div>

          {isOffline && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {lang === 'ar'
                  ? 'انقطع الاتصال بالشبكة أثناء تعبئة النموذج. جميع بيانات المتجر والمستندات المرفوعة محفوظة في الصفحة ولن تُفقد.'
                  : 'Connection lost while completing onboarding. All entered store details and uploaded files remain intact on this screen.'}
              </p>
            </div>
          )}

          {submitState === 'failed' && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex flex-wrap items-center justify-between gap-2">
              <span>
                {lang === 'ar'
                  ? 'تعذر إرسال طلب التوثيق حالياً. بياناتك محفوظة — أعد المحاولة بعد التحقق من الاتصال.'
                  : 'Could not submit verification application right now. Your details are preserved — retry once connected.'}
              </span>
              <button
                type="button"
                onClick={() => handleFinalSubmit(true)}
                className="h-8 px-3 rounded-lg bg-red-700 text-white font-semibold"
              >
                {lang === 'ar' ? 'إعادة الإرسال' : 'Retry Submit'}
              </button>
            </div>
          )}

          {submitState === 'uncertain' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                {lang === 'ar'
                  ? 'حالة إرسال الطلب غير مؤكدة بسبب بطء الاتصال'
                  : 'Submission status uncertain due to slow network'}
              </p>
              <p className="leading-relaxed">
                {lang === 'ar'
                  ? 'لم نتلق تأكيداً نهائياً بعد — تجنّب الإرسال المتكرر وتحقق من حالة الطلب أولاً.'
                  : 'We have not received final confirmation yet — avoid duplicate submissions and check status first.'}
              </p>
              <button
                type="button"
                onClick={() => handleFinalSubmit(true)}
                className="h-8 px-3.5 rounded-lg bg-amber-800 text-white font-semibold"
              >
                {lang === 'ar' ? 'التحقق من حالة الطلب وإكمال المتابعة' : 'Check Request Status & Continue'}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50"
            >
              <BackArrow className="w-4 h-4" />
              {lang === 'ar' ? 'السابق' : 'Back'}
            </button>
            <button
              type="button"
              disabled={!allDocsUploaded || submitState === 'submitting' || submitState === 'uncertain'}
              onClick={() => handleFinalSubmit(false)}
              className="h-11 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {submitState === 'submitting' && <RefreshCw className="w-4 h-4 animate-spin" />}
              {lang === 'ar' ? 'إرسال طلب التوثيق للمراجعة' : 'Submit Application for Review'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Submission Confirmation */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {lang === 'ar' ? 'تم استلام طلب توثيق متجرك بنجاح!' : 'Verification Application Submitted!'}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'يقوم فريق التوثيق بمراجعة المستندات عادة خلال 24 ساعة. يمكنك الآن التبديل إلى بوابة المؤسس (A-02) لفحص هذا الطلب واعتماده أو طلب تعديلات.'
              : 'Our verification team typically reviews applications within 24 hours. You can switch to the Founder Portal (A-02) right now to review and approve this exact store.'}
          </p>
          <button
            type="button"
            onClick={onFinished}
            className="h-11 px-6 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-sm font-semibold"
          >
            {lang === 'ar' ? 'متابعة حالة التوثيق (M-04)' : 'Track Verification Status (M-04)'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * M-04: Verification Status Tracker (All 6 States + Correct & Resubmit + Locked Operations)
 */
export function MerchantVerificationTracker({
  onStartOnboarding,
  onGoToAddListing,
}: {
  onStartOnboarding: () => void;
  onGoToAddListing: () => void;
}) {
  const { lang, activeMerchantStore, submitStoreResubmission, updateStoreDocuments } = usePrototype();
  const [resubmitNote, setResubmitNote] = useState(
    'تم رفع صورة نهارية واضحة لواجهة المتجر واللافتة الخارجية بالكامل.'
  );
  const [reuploading, setReuploading] = useState(false);
  const [hasReuploaded, setHasReuploaded] = useState(false);

  const st = activeMerchantStore;
  const status = st.verificationStatus;

  const handleReuploadAndResubmit = () => {
    const updatedDocs: VerificationDocument[] = st.documents.map((d) =>
      d.type === 'storefront_photo'
        ? { ...d, fileName: 'suakin_storefront_daylight_clear.jpg', uploadedAt: '2026-11-20 01:20', notes: undefined }
        : d
    );
    updateStoreDocuments(st.id, updatedDocs);
    submitStoreResubmission(st.id, {
      ar: resubmitNote.trim() || 'تمت معالجة ملاحظات المراجع وإعادة الإرسال.',
      en: resubmitNote.trim() || 'Addressed reviewer feedback and resubmitted.',
    });
    setHasReuploaded(false);
  };

  return (
    <div className="space-y-5">
      {/* Header Summary */}
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

      {/* State-Specific Action Card */}
      {status === 'verified' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-emerald-950">
                {lang === 'ar' ? 'متجرك موثّق بالكامل وعمليات النشر مفعّلة' : 'Your Store Is Verified — Operations Unlocked'}
              </h2>
              <p className="text-xs text-emerald-900/90 mt-1 leading-relaxed">
                {lang === 'ar'
                  ? 'كل إعلان مكتمل تنشره يمر بالتحقق التلقائي ومعالجة الصور ثم يظهر للعملاء مباشرة دون انتظار موافقة يدوية مسبقة.'
                  : 'Valid new and used listings pass automated photo checks and publish directly to customer discovery without manual pre-approval.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToAddListing}
            className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap"
          >
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
                ? 'أكمل بيانات المتجر وارفع البطاقة القومية وإثبات المحل الفعلي لتقديم طلبك للمراجعة.'
                : 'Complete your business information and upload required private documents to submit.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onStartOnboarding}
            className="h-10 px-5 rounded-xl bg-[#0F6B5D] text-white text-xs font-semibold hover:bg-[#0B5348]"
          >
            {lang === 'ar' ? 'إكمال طلب التوثيق' : 'Complete Onboarding'}
          </button>
        </div>
      )}

      {status === 'submitted' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-amber-950">
              {lang === 'ar' ? 'طلبك قيد المراجعة لدى فريق التوثيق' : 'Application Awaiting Verification Review'}
            </h2>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              {lang === 'ar'
                ? 'تم استلام مستنداتك الخاصة بنجاح. ستتلقى إشعاراً فور اتخاذ القرار، وبمجرد الاعتماد سيُفتح لك نشر الهواتف وإدارة المخزون فوراً.'
                : 'Your private documents have been received. Once approved, inventory management and automatic listing publication will unlock immediately.'}
            </p>
          </div>
        </div>
      )}

      {status === 'changes_requested' && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-orange-950">
                {lang === 'ar' ? 'مطلوب تعديلات لإكمال توثيق المتجر' : 'Reviewer Requested Changes'}
              </h2>
              {st.reviewerFeedback && (
                <p className="text-xs text-orange-950 bg-white/80 border border-orange-200 rounded-xl p-3 mt-2 leading-relaxed">
                  <strong className="block mb-0.5">
                    {lang === 'ar' ? 'ملاحظة المراجع:' : 'Reviewer feedback:'}
                  </strong>
                  {tText(st.reviewerFeedback, lang)}
                </p>
              )}
            </div>
          </div>

          {/* Interactive Correct & Resubmit Flow */}
          <div className="bg-white border border-orange-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-900">
              {lang === 'ar' ? 'تصحيح المستند وإعادة الإرسال' : 'Correct Document & Resubmit'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setReuploading(true);
                  window.setTimeout(() => {
                    setReuploading(false);
                    setHasReuploaded(true);
                  }, 500);
                }}
                className="h-9 px-3.5 rounded-lg border border-slate-300 bg-slate-50 hover:border-[#0F6B5D] text-xs font-semibold text-slate-800 flex items-center gap-1.5"
              >
                {reuploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#0F6B5D]" />}
                {hasReuploaded
                  ? lang === 'ar'
                    ? 'تم رفع صورة نهارية واضحة ✓'
                    : 'Clear daytime photo uploaded ✓'
                  : lang === 'ar'
                    ? 'رفع صورة واجهة نهارية جديدة'
                    : 'Upload new daytime storefront photo'}
              </button>
              <span className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'يُستبدل الملف السابق تلقائياً' : 'Replaces previous storefront file'}
              </span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'ar' ? 'ملاحظة للمراجع (اختياري)' : 'Note to reviewer (optional)'}
              </label>
              <input
                type="text"
                value={resubmitNote}
                onChange={(e) => setResubmitNote(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F6B5D]"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!hasReuploaded}
                onClick={handleReuploadAndResubmit}
                className="h-10 px-5 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-semibold disabled:opacity-45"
              >
                {lang === 'ar' ? 'إعادة إرسال الطلب للمراجعة' : 'Resubmit for Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(status === 'suspended' || status === 'rejected') && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h2 className="text-sm font-bold text-red-950">
                {status === 'suspended'
                  ? lang === 'ar'
                    ? 'تم تعليق المتجر مؤقتاً وإخفاء جميع الإعلانات'
                    : 'Store Suspended — All Public Listings Hidden'
                  : lang === 'ar'
                    ? 'تم رفض طلب توثيق المتجر'
                    : 'Store Verification Application Rejected'}
              </h2>
              {st.reviewerFeedback && (
                <p className="text-xs text-red-900 bg-white/80 border border-red-200 rounded-xl p-3 leading-relaxed">
                  {tText(st.reviewerFeedback, lang)}
                </p>
              )}
              <p className="text-xs text-red-900/90 leading-relaxed">
                {lang === 'ar'
                  ? 'للاستئناف أو الاستفسار، تواصل مع فريق دعم المتاجر على الرقم '
                  : 'To appeal or resolve compliance notes, contact Merchant Support at '}
                <LtrValue className="font-semibold">+249 18 300 4400</LtrValue>
                {lang === 'ar' ? ' أو البريد merchants@sudanphones.sd.' : ' or merchants@sudanphones.sd.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          {lang === 'ar' ? 'سجل مراحل التوثيق والمراجعة' : 'Verification Timeline & Review History'}
        </h3>
        {st.reviewHistory.length === 0 ? (
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'لم يتم إرسال الطلب للمراجعة بعد.' : 'Application has not been submitted yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {st.reviewHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs"
              >
                <div className="w-2 h-2 rounded-full bg-[#0F6B5D] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{tText(entry.reviewerName, lang)}</span>
                    <LtrValue className="text-[11px] text-slate-500">{entry.timestamp}</LtrValue>
                  </div>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">{tText(entry.note, lang)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
