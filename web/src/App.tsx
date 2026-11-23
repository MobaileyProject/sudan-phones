import React, { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { ArrowLeft, ArrowRight, Globe, Lock, Shield, Store } from 'lucide-react';
import { PrototypeProvider, usePrototype } from './store/PrototypeContext';
import { CustomerApp } from './portals/customer/CustomerApp';
import { MerchantPortal } from './portals/merchant/MerchantPortal';
import { AdminPortal } from './portals/admin/AdminPortal';
import { ToastContainer } from './components/DesignSystem';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#EEF3F0] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <h2 className="text-base font-bold text-[#172B20]">حدث خطأ غير متوقع / Something went wrong</h2>
          <p className="text-xs text-[#5E7669] max-w-xs">{this.state.message}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              window.location.reload();
            }}
            className="h-11 px-6 rounded-full bg-[#0F6B5D] text-white text-xs font-bold"
          >
            إعادة التحميل / Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PortalLoginGate({ target }: { target: 'merchant' | 'admin' }) {
  const { lang, setLang, loginWithBackend, setPortal, pushToast } = usePrototype();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const isMerchant = target === 'merchant';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg('');
    if (!identifier.trim() || !password) {
      setErrMsg(lang === 'ar' ? 'يرجى إدخال البريد أو رقم الهاتف وكلمة المرور.' : 'Please enter email or phone and password.');
      return;
    }
    setBusy(true);
    try {
      const payload = identifier.includes('@')
        ? { email: identifier.trim(), password }
        : { phone: identifier.trim(), password };
      const sess = await loginWithBackend(payload);
      if (isMerchant && !(sess.merchant || sess.role === 'merchant')) {
        setErrMsg(lang === 'ar' ? 'هذا الحساب لا يمتلك صلاحية متجر.' : 'This account does not have merchant access.');
        return;
      }
      if (!isMerchant && sess.role !== 'admin') {
        setErrMsg(lang === 'ar' ? 'هذا الحساب لا يمتلك صلاحية الإدارة.' : 'This account does not have admin access.');
        return;
      }
      pushToast('success', {
        ar: isMerchant ? 'تم تسجيل الدخول إلى بوابة التاجر.' : 'تم تسجيل الدخول إلى بوابة الإدارة.',
        en: isMerchant ? 'Signed in to Merchant Portal.' : 'Signed in to Admin Portal.',
      });
    } catch (err: any) {
      setErrMsg(err?.message || (lang === 'ar' ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${isMerchant ? 'bg-[#0F6B5D]' : 'bg-blue-700'}`}>
              {isMerchant ? <Store className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {isMerchant
                  ? lang === 'ar' ? 'بوابة التاجر — سودان فونز' : 'Merchant Portal — Sudan Phones'
                  : lang === 'ar' ? 'بوابة الإدارة — سودان فونز' : 'Admin Portal — Sudan Phones'}
              </h1>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'سجّل الدخول بالبريد الإلكتروني أو رقم الهاتف (+249)' : 'Sign in with email or Sudan phone (+249)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف (+249)' : 'Email or Phone (+249)'}
            </label>
            <input
              type="text"
              dir="ltr"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isMerchant ? 'merchant@sudanphones.sd or +249912345678' : 'founder@sudanphones.sd'}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F6B5D]"
            />
          </div>
          {errMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-800 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>{errMsg}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className={`w-full h-11 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-50 ${isMerchant ? 'bg-[#0F6B5D] hover:bg-[#0B5348]' : 'bg-blue-700 hover:bg-blue-800'}`}
          >
            {busy
              ? lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'
              : lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setPortal('customer')}
            className="text-slate-600 hover:text-[#0F6B5D] font-semibold inline-flex items-center gap-1"
          >
            {lang === 'ar' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            {lang === 'ar' ? 'العودة لتطبيق العملاء' : 'Back to Customer App'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductionShell() {
  const { lang, portal, setPortal, session } = usePrototype();
  const isMobileApp = import.meta.env.VITE_APP_MODE === 'mobile';

  useEffect(() => {
    if (portal === 'customer') return;
    let handle: { remove: () => Promise<void> } | null = null;
    CapApp.addListener('backButton', () => {
      setPortal('customer');
    })
      .then((h) => {
        handle = h;
      })
      .catch(() => {});
    return () => {
      if (handle) handle.remove().catch(() => {});
    };
  }, [portal, setPortal]);

  const renderSurface = () => {
    if (portal === 'merchant') {
      if (!session.authenticated || !(session.merchant || session.role === 'merchant')) {
        return <PortalLoginGate target="merchant" />;
      }
      return (
        <div className="min-h-screen flex flex-col">
          {isMobileApp && (
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs">
              <span className="font-bold">
                {lang === 'ar' ? 'بوابة التاجر' : 'Merchant Portal'}
              </span>
              <button
                type="button"
                onClick={() => setPortal('customer')}
                className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-semibold"
              >
                {lang === 'ar' ? 'العودة للتطبيق' : 'Back to App'}
              </button>
            </div>
          )}
          <div className="flex-1">
            <MerchantPortal />
          </div>
        </div>
      );
    }

    if (portal === 'admin') {
      if (!session.authenticated || session.role !== 'admin') {
        return <PortalLoginGate target="admin" />;
      }
      return <AdminPortal />;
    }

    return <CustomerApp />;
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <div className="flex-1">{renderSurface()}</div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <PrototypeProvider>
        <ProductionShell />
      </PrototypeProvider>
    </AppErrorBoundary>
  );
}
