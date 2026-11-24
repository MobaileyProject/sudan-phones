import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSearch,
  FileText,
  Flag,
  LayoutGrid,
  Lock,
  LogOut,
  Maximize2,
  Menu,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Slash,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import {
  AdminPermission,
  AdminRole,
  CityId,
  Listing,
  PublicationStatus,
  Store,
  VerificationStatus,
} from '../../types';
import {
  CITIES,
  formatCity,
  formatCondition,
  formatListingTitle,
  formatPublicationStatus,
  formatSdg,
  formatVerificationStatus,
  tText,
} from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';
import { getReportReasonLabel } from '../customer/ReportTargetSheet';
import {
  ConfirmDialog,
  LtrValue,
  OfflineBanner,
  PublicationStatusLabel,
  SafeImage,
  TableRowsSkeleton,
  VerificationStatusLabel,
} from '../../components/DesignSystem';

type AdminSection = 'overview' | 'verification' | 'moderation' | 'roles' | 'audit';

const ALL_PERMISSIONS: { id: AdminPermission; group: { ar: string; en: string }; label: { ar: string; en: string } }[] = [
  { id: 'review_stores', group: { ar: 'التوثيق', en: 'Verification' }, label: { ar: 'مراجعة طلبات المتاجر واتخاذ قرارات التوثيق', en: 'Review store applications & issue verification decisions' } },
  { id: 'view_private_evidence', group: { ar: 'التوثيق', en: 'Verification' }, label: { ar: 'الاطلاع على مستندات الهوية الخاصة للمتاجر (المؤسسون فقط)', en: 'Inspect private merchant identity evidence (Founders only)' } },
  { id: 'moderate_listings', group: { ar: 'الإشراف', en: 'Moderation' }, label: { ar: 'مراجعة الإعلانات المنشورة وتعليمها أو إزالتها', en: 'Post-publication listing moderation (clear/flag/remove)' } },
  { id: 'suspend_stores', group: { ar: 'الإشراف', en: 'Moderation' }, label: { ar: 'تعليق المتاجر وإخفاء إعلاناتها', en: 'Suspend verified stores and hide listings' } },
  { id: 'manage_roles', group: { ar: 'الحوكمة', en: 'Governance' }, label: { ar: 'إنشاء وتعديل الأدوار وإسناد الصلاحيات', en: 'Create/edit roles and assign admin permissions' } },
  { id: 'view_audit_logs', group: { ar: 'الحوكمة', en: 'Governance' }, label: { ar: 'استعراض سجل التدقيق غير القابل للتعديل', en: 'View immutable administrative audit logs' } },
  { id: 'approve_sensitive', group: { ar: 'الحوكمة', en: 'Governance' }, label: { ar: 'تقديم الموافقة الثانية للإجراءات الحساسة', en: 'Provide second approval on sensitive actions' } },
];

export function AdminPortal() {
  const {
    lang,
    session,
    me,
    loginWithBackend,
    logoutSession,
    stores,
    listings,
    adminOverview,
    adminRoles,
    adminUsers,
    auditLogs,
    dualApprovals,
    activeAdminUser,
    activeAdminRole,
    hasAdminPermission,
    reviewStoreApplication,
    moderateListing,
    suspendStoreDirectOrRequest,
    customerReports,
    resolveCustomerReport,
    saveAdminRole,
    deleteAdminRole,
    assignAdminRole,
    createDualApprovalRequest,
    resolveDualApproval,
    getStoreById,
    sim,
    pushToast,
  } = usePrototype();

  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Real Admin Sign-In State
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginBusy, setAdminLoginBusy] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  // Verification Queue & Review
  const [qSearch, setQSearch] = useState('');
  const [qStatus, setQStatus] = useState<'all' | VerificationStatus>('all');
  const [qCity, setQCity] = useState<'all' | CityId>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [liveDocs, setLiveDocs] = useState<Array<{ id: string; kind: string; content_type?: string; url: string; fileName: string }>>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [zoomDoc, setZoomDoc] = useState<{ title: string; url: string; fileName: string; isPdf?: boolean } | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    id_clear: false,
    name_matches: false,
    storefront_real: false,
  });
  const [decisionModal, setDecisionModal] = useState<'approved' | 'changes_requested' | 'rejected' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  // Listing Moderation
  const [modSearch, setModSearch] = useState('');
  const [modStatus, setModStatus] = useState<'all' | PublicationStatus>('all');
  const [modActionModal, setModActionModal] = useState<{
    listing: Listing;
    action: 'flag' | 'remove' | 'suspend_store';
  } | null>(null);
  const [modReason, setModReason] = useState('');
  const [suspendViaDual, setSuspendViaDual] = useState(true);

  // Roles & Permissions
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [confirmRoleSave, setConfirmRoleSave] = useState(false);

  // Audit Logs & Dual Approval
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('all');
  const [auditTargetFilter, setAuditTargetFilter] = useState<'all' | 'store' | 'listing' | 'role' | 'approval'>('all');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [newDualReqOpen, setNewDualReqOpen] = useState(false);
  const [dualTargetStoreId, setDualTargetStoreId] = useState('');
  const [dualReqReason, setDualReqReason] = useState('');

  // Derived metrics for Founder Overview (prefer live backend aggregates)
  const verifiedStoresCount = adminOverview?.verified_stores ?? stores.filter((s) => s.verificationStatus === 'verified').length;
  const totalStoresCount = adminOverview?.stores ?? stores.length;
  const pendingApplicationsCount =
    adminOverview?.pending_verifications ??
    stores.filter((s) => s.verificationStatus === 'submitted' || s.verificationStatus === 'changes_requested').length;
  const liveListingsCount = adminOverview?.published_listings ?? listings.filter((l) => l.publicationStatus === 'published').length;
  const flaggedListingsCount = adminOverview?.flagged_listings ?? listings.filter((l) => l.publicationStatus === 'flagged').length;
  const openCustomerReports = customerReports.filter((r) => r.status === 'open');
  const pendingDualCount = adminOverview?.pending_approvals ?? dualApprovals.filter((d) => d.status === 'awaiting_second_approval').length;
  const contactLeads7d = adminOverview?.contact_leads_7d ?? 0;

  // Filtered Verification Queue (A-02)
  const queueStores = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    return stores.filter((s) => {
      if (qStatus !== 'all' && s.verificationStatus !== qStatus) return false;
      if (qCity !== 'all' && s.city !== qCity) return false;
      if (q) {
        return (
          s.name.ar.toLowerCase().includes(q) ||
          s.name.en.toLowerCase().includes(q) ||
          s.applicantName.ar.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stores, qSearch, qStatus, qCity]);

  const selectedStore: Store | undefined = stores.find((s) => s.id === selectedStoreId) || queueStores[0];

  // Fetch live private verification documents (Images + PDFs) when selecting an application
  useEffect(() => {
    const verifId = (selectedStore as any)?._verificationId;
    if (!verifId || !session.authenticated || session.role !== 'admin') {
      setLiveDocs([]);
      return;
    }
    let cancelled = false;
    setDocsLoading(true);
    api
      .getAdminVerificationDocs(verifId)
      .then((res) => {
        if (cancelled) return;
        const docs = (res.data || []).map((d: any, idx: number) => ({
          id: String(d.id || idx),
          kind: d.kind || 'document',
          content_type: d.content_type || '',
          url: d.url || '',
          fileName: d.file_name || `${d.kind || 'doc'}-${idx + 1}`,
        }));
        setLiveDocs(docs);
      })
      .catch(() => {
        if (!cancelled) setLiveDocs([]);
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStore?.id, session.authenticated, session.role]);

  useEffect(() => {
    if (!dualTargetStoreId) {
      const firstVerified = stores.find((s) => s.verificationStatus === 'verified');
      if (firstVerified) setDualTargetStoreId(firstVerified.id);
    }
  }, [stores, dualTargetStoreId]);

  // Filtered Moderation Queue (A-05)
  const modListings = useMemo(() => {
    const q = modSearch.trim().toLowerCase();
    return listings.filter((l) => {
      if (l.publicationStatus === 'draft') return false;
      if (modStatus !== 'all' && l.publicationStatus !== modStatus) return false;
      if (q) {
        const st = getStoreById(l.storeId);
        return (
          l.model.toLowerCase().includes(q) ||
          l.arabicBrandPrefix.toLowerCase().includes(q) ||
          (st?.name.ar ?? '').toLowerCase().includes(q) ||
          (st?.name.en ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [listings, modSearch, modStatus, getStoreById]);

  // Filtered Audit Logs (A-07)
  const filteredAudits = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter((a) => {
      if (auditActorFilter !== 'all' && a.actorId !== auditActorFilter) return false;
      if (auditTargetFilter !== 'all' && a.targetType !== auditTargetFilter) return false;
      if (q) {
        return (
          a.targetName.ar.toLowerCase().includes(q) ||
          a.targetName.en.toLowerCase().includes(q) ||
          a.details.ar.toLowerCase().includes(q) ||
          a.action.includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, auditActorFilter, auditTargetFilter, auditSearch]);

  const handleConfirmStoreDecision = () => {
    if (!selectedStore || !decisionModal) return;
    if ((decisionModal === 'changes_requested' || decisionModal === 'rejected') && !decisionNote.trim()) {
      return;
    }
    reviewStoreApplication(selectedStore.id, decisionModal, {
      ar:
        decisionNote.trim() ||
        (decisionModal === 'approved'
          ? 'تم التحقق من الهوية القومية ومطابقة بيانات المتجر الفعلي.'
          : 'تمت المراجعة.'),
      en:
        decisionNote.trim() ||
        (decisionModal === 'approved'
          ? 'Verified National ID and physical retail storefront.'
          : 'Reviewed.'),
    });
    setDecisionModal(null);
    setDecisionNote('');
  };

  const handleConfirmModAction = () => {
    if (!modActionModal || !modReason.trim()) return;
    const { listing, action } = modActionModal;
    if (action === 'suspend_store') {
      suspendStoreDirectOrRequest(
        listing.storeId,
        { ar: modReason.trim(), en: modReason.trim() },
        suspendViaDual
      );
    } else {
      moderateListing(listing.id, action, { ar: modReason.trim(), en: modReason.trim() });
    }
    setModActionModal(null);
    setModReason('');
  };

  const navItems: {
    id: AdminSection;
    ar: string;
    en: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'overview', ar: 'نظرة عامة للمؤسس', en: 'Founder Overview', icon: LayoutGrid },
    { id: 'verification', ar: 'توثيق المتاجر', en: 'Store Verification', icon: FileSearch, count: pendingApplicationsCount },
    { id: 'moderation', ar: 'إشراف الإعلانات', en: 'Listing Moderation', icon: Flag, count: flaggedListingsCount + openCustomerReports.length },
    { id: 'roles', ar: 'الأدوار والصلاحيات', en: 'Roles & Permissions', icon: Users },
    { id: 'audit', ar: 'التدقيق والموافقة المزدوجة', en: 'Audit & Dual Approval', icon: Shield, count: pendingDualCount },
  ];

  // Distinct Dark Slate-Indigo Administrative Sidebar (visually separated from Merchant portal)
  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-200">
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {lang === 'ar' ? 'لوحة المؤسس والإدارة' : 'Founder & Admin Console'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {lang === 'ar' ? 'الحوكمة والتوثيق' : 'Governance & Trust Ops'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto thin-scroll">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                setMobileNavOpen(false);
              }}
              className={`w-full h-10 px-3 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{lang === 'ar' ? item.ar : item.en}</span>
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[11px] font-mono-num px-1.5 py-0.5 rounded ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-800 text-blue-300'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Authenticated Admin Identity Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 space-y-2 text-[11px]">
        <div>
          <p className="font-bold text-white truncate">{me?.name || tText(activeAdminUser.name, lang)}</p>
          <p className="text-slate-400 truncate">{tText(activeAdminRole.name, lang)}</p>
        </div>
        <button
          type="button"
          onClick={() => logoutSession()}
          className="w-full h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
        </button>
      </div>
    </div>
  );

  const safeFallbackSection: AdminSection = hasAdminPermission('moderate_listings')
    ? 'moderation'
    : 'overview';

  const renderRestrictedNotice = (requiredLabel: { ar: string; en: string }) => (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 mx-auto">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-base font-bold text-slate-900">
        {lang === 'ar' ? 'وصول مقيّد حسب صلاحيات الدور' : 'Restricted Access — Insufficient Permissions'}
      </h2>
      <p className="text-xs text-slate-600 leading-relaxed">
        {lang === 'ar'
          ? `حسابك الحالي (${activeAdminUser.name.ar} — ${activeAdminRole.name.ar}) لا يملك صلاحية: ${requiredLabel.ar}. الوثائق السرية والحوكمة مقصورة على المؤسسين المخوّلين فقط.`
          : `Your current role (${activeAdminUser.name.en} — ${activeAdminRole.name.en}) does not include permission: ${requiredLabel.en}. Private identity evidence and platform governance are restricted to authorized founders.`}
      </p>
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setSection(safeFallbackSection)}
          className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
        >
          {lang === 'ar' ? 'العودة إلى المساحة المتاحة لدورك' : 'Return to Available Workspace'}
        </button>
      </div>
    </div>
  );

  if (!session.authenticated || session.role !== 'admin') {
    return (
      <div className="min-h-[calc(100vh-52px)] bg-slate-100/80 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          {session.authenticated && session.role !== 'admin' ? (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'ar' ? 'الوصول مرفوض (403)' : 'Access Denied (403)'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? 'حسابك الحالي لا يملك صلاحيات الإدارة. يرجى تسجيل الخروج والدخول بحساب مؤسس أو مشرف مخوّل.'
                  : 'Your current account does not hold administrative privileges. Sign out and sign in with an authorized admin account.'}
              </p>
              <button
                type="button"
                onClick={() => logoutSession()}
                className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAdminLoginError('');
                setAdminLoginBusy(true);
                try {
                  const idVal = adminIdentifier.trim();
                  const payload = idVal.includes('@')
                    ? { email: idVal, password: adminPassword }
                    : { phone: idVal, password: adminPassword };
                  const sess = await loginWithBackend(payload);
                  if (sess.role !== 'admin') {
                    setAdminLoginError(
                      lang === 'ar'
                        ? 'هذا الحساب ليس لديه صلاحيات إدارية.'
                        : 'This account does not have administrative permissions.'
                    );
                  } else {
                    pushToast('success', {
                      ar: 'تم تسجيل الدخول إلى لوحة الإدارة.',
                      en: 'Signed in to Admin Console.',
                    });
                  }
                } catch (err: any) {
                  setAdminLoginError(
                    err?.message || (lang === 'ar' ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.')
                  );
                } finally {
                  setAdminLoginBusy(false);
                }
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {lang === 'ar' ? 'تسجيل دخول إدارة سودان فونز' : 'Sudan Phones Admin Sign-In'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'مخصص للمؤسسين وفريق التوثيق والإشراف المخوّل فقط.'
                      : 'Restricted to authorized founders, verifiers, and moderators.'}
                  </p>
                </div>
              </div>
              {adminLoginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {adminLoginError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف' : 'Admin Email or Phone'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  placeholder="admin@sudanphones.sd"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={adminLoginBusy}
                className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold"
              >
                {adminLoginBusy
                  ? lang === 'ar'
                    ? 'جاري التحقق...'
                    : 'Signing in...'
                  : lang === 'ar'
                    ? 'دخول لوحة الإدارة'
                    : 'Sign In to Admin Console'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-52px)] flex bg-slate-100/70">
      {/* Desktop Admin Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 sticky top-[52px] h-[calc(100vh-52px)]">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 bg-[#0F172A] text-white border-b border-slate-800">
              <span className="text-sm font-bold">{lang === 'ar' ? 'إدارة المنصة' : 'Admin Menu'}</span>
              <button type="button" onClick={() => setMobileNavOpen(false)} className="p-2 text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{SidebarContent}</div>
          </div>
          <div className="flex-1 bg-slate-950/50" onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <OfflineBanner />

        <header className="h-14 px-4 lg:px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 sticky top-[52px] z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">
                {lang === 'ar' ? 'إدارة عمليات سودان فونز' : 'Sudan Phones Platform Operations'}
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {tText(activeAdminUser.name, lang)} · {tText(activeAdminRole.name, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-[11px] font-medium text-slate-500">
              {lang === 'ar' ? 'مساحة إدارية منفصلة' : 'Isolated Admin Workspace'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto">
          {/* FOUNDER OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {lang === 'ar' ? 'نظرة عامة على المنصة' : 'Platform-Wide Founder Overview'}
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'ar'
                    ? 'مؤشرات السوق الكلية الحية من قاعدة البيانات عبر جميع ولايات السودان.'
                    : 'Live platform-wide operations metrics from the database across Sudan.'}
                </p>
              </div>

              {/* Platform-Wide KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                  <p className="text-xs text-slate-500">{lang === 'ar' ? 'المتاجر الموثّقة' : 'Verified Stores'}</p>
                  <p className="text-2xl font-bold text-slate-900 font-mono-num">{verifiedStoresCount}</p>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'ar' ? `من إجمالي ${totalStoresCount} متاجر مسجلة` : `out of ${totalStoresCount} total accounts`}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                  <p className="text-xs text-slate-500">
                    {lang === 'ar' ? 'طلبات توثيق بانتظار المراجعة' : 'Pending Store Applications'}
                  </p>
                  <p className="text-2xl font-bold text-amber-700 font-mono-num">{pendingApplicationsCount}</p>
                  <button
                    type="button"
                    onClick={() => setSection('verification')}
                    className="text-[11px] font-semibold text-blue-700 hover:underline"
                  >
                    {lang === 'ar' ? 'فتح قائمة المراجعة ←' : 'Open review queue →'}
                  </button>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                  <p className="text-xs text-slate-500">{lang === 'ar' ? 'الإعلانات المنشورة حالياً' : 'Live Public Listings'}</p>
                  <p className="text-2xl font-bold text-slate-900 font-mono-num">{liveListingsCount}</p>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'ar' ? `${flaggedListingsCount} مُعلّم للمراجعة اللاحقة` : `${flaggedListingsCount} flagged post-publication`}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                  <p className="text-xs text-slate-500">
                    {lang === 'ar' ? 'نقرات التواصل (آخر 7 أيام)' : 'Buyer Contact Leads (7d)'}
                  </p>
                  <p className="text-2xl font-bold text-blue-700 font-mono-num">{contactLeads7d}</p>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'ar' ? `${openCustomerReports.length} بلاغ عميل مفتوح` : `${openCustomerReports.length} open customer reports`}
                  </p>
                </div>
              </div>

              {/* Regional Distribution + Actionable Workload Shortcuts */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      {lang === 'ar' ? 'توزيع المتاجر والإعلانات حسب الولاية' : 'Live Store & Listing Distribution by State'}
                    </h3>
                    <span className="text-[11px] font-mono-num text-emerald-700 font-semibold">
                      {lang === 'ar' ? 'بيانات حية' : 'Live DB'}
                    </span>
                  </div>

                  {/* Active States Distribution */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {CITIES.filter(
                      (c) =>
                        stores.some((s) => s.city === c.id) ||
                        c.id === 'port_sudan' ||
                        c.id === 'khartoum' ||
                        c.id === 'omdurman'
                    ).map((c) => {
                      const stCount = stores.filter((s) => s.city === c.id && s.verificationStatus === 'verified').length;
                      const lsCount = listings.filter((l) => {
                        const st = getStoreById(l.storeId);
                        return st?.city === c.id && l.publicationStatus === 'published';
                      }).length;
                      return (
                        <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                          <p className="font-bold text-slate-900 truncate">{tText(c.name, lang)}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 font-mono-num">
                            {stCount} {lang === 'ar' ? 'متاجر' : 'stores'} · {lsCount} {lang === 'ar' ? 'إعلان' : 'live'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actionable Workload Shortcuts */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'ar' ? 'مهام المراجعة والحوكمة' : 'Actionable Review Workload'}
                  </h3>

                  <button
                    type="button"
                    onClick={() => setSection('verification')}
                    className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 text-start flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {lang === 'ar' ? 'قائمة توثيق المتاجر' : 'Store Verification Queue'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {lang === 'ar' ? `${pendingApplicationsCount} طلبات بانتظار المراجعة` : `${pendingApplicationsCount} applications awaiting action`}
                      </p>
                    </div>
                    <span className="h-7 px-2.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-mono-num font-bold flex items-center">
                      {pendingApplicationsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSection('moderation')}
                    className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 text-start flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {lang === 'ar' ? 'إشراف الإعلانات المنشورة' : 'Post-Publication Moderation'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {lang === 'ar' ? `${flaggedListingsCount} إعلان مُعلّم · ${openCustomerReports.length} بلاغ` : `${flaggedListingsCount} flagged · ${openCustomerReports.length} reports`}
                      </p>
                    </div>
                    <span className="h-7 px-2.5 rounded-lg bg-orange-100 text-orange-900 text-xs font-mono-num font-bold flex items-center">
                      {flaggedListingsCount + openCustomerReports.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSection('audit')}
                    className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 text-start flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {lang === 'ar' ? 'طلبات الموافقة المزدوجة' : 'Dual Approval Requests'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {lang === 'ar' ? `${pendingDualCount} طلب بانتظار موافقة ثانية` : `${pendingDualCount} awaiting second approver`}
                      </p>
                    </div>
                    <span className="h-7 px-2.5 rounded-lg bg-blue-100 text-blue-900 text-xs font-mono-num font-bold flex items-center">
                      {pendingDualCount}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* A-02, A-03, A-04: STORE VERIFICATION QUEUE, EVIDENCE REVIEW & DECISIONS */}
          {section === 'verification' && (
            !hasAdminPermission('review_stores') ? (
              renderRestrictedNotice({ ar: 'مراجعة توثيق المتاجر', en: 'Review store applications' })
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {lang === 'ar' ? 'قائمة توثيق المتاجر وفحص المستندات' : 'Store Verification Queue & Evidence Review'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {lang === 'ar'
                        ? 'مستندات التوثيق خاصة وسرية ولا تظهر للعملاء أبداً. القرار هنا ينعكس فوراً في بوابة التاجر.'
                        : 'Private documents never appear publicly. Approving or requesting changes updates the merchant store immediately.'}
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      placeholder={lang === 'ar' ? 'ابحث باسم المتجر أو المالك...' : 'Search store or applicant...'}
                      className="w-full h-9 ps-9 pe-3 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                  <select
                    value={qStatus}
                    onChange={(e) => setQStatus(e.target.value as 'all' | VerificationStatus)}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  >
                    <option value="all">{lang === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
                    <option value="submitted">{formatVerificationStatus('submitted', lang)}</option>
                    <option value="changes_requested">{formatVerificationStatus('changes_requested', lang)}</option>
                    <option value="verified">{formatVerificationStatus('verified', lang)}</option>
                    <option value="suspended">{formatVerificationStatus('suspended', lang)}</option>
                    <option value="rejected">{formatVerificationStatus('rejected', lang)}</option>
                  </select>
                  <select
                    value={qCity}
                    onChange={(e) => setQCity(e.target.value as 'all' | CityId)}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  >
                    <option value="all">{lang === 'ar' ? 'جميع ولايات السودان' : 'All Sudan States'}</option>
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {tText(c.name, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Split Layout: Queue List + Evidence Inspector */}
                <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
                  {/* A-02 Queue */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{lang === 'ar' ? `الطلبات (${queueStores.length})` : `Applications (${queueStores.length})`}</span>
                      <span className="text-amber-700 font-mono-num">
                        {pendingApplicationsCount} {lang === 'ar' ? 'معلّق' : 'pending'}
                      </span>
                    </div>

                    {sim.skeletonLoading ? (
                      <TableRowsSkeleton rows={4} cols={2} />
                    ) : queueStores.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        {lang === 'ar' ? 'لا توجد طلبات مطابقة للفلاتر.' : 'No matching store applications.'}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto thin-scroll">
                        {queueStores.map((st) => {
                          const active = selectedStoreId === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setSelectedStoreId(st.id)}
                              className={`w-full p-3.5 text-start transition-colors space-y-1.5 ${
                                active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {tText(st.name, lang)}
                                </p>
                                <VerificationStatusLabel status={st.verificationStatus} lang={lang} />
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {formatCity(st.city, lang)} · {tText(st.applicantName, lang)}
                              </p>
                              {st.submittedAt && (
                                <p className="text-[10px] text-slate-400 font-mono-num">
                                  {st.submittedAt}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* A-03 Evidence Review & A-04 Decision Panel */}
                  {selectedStore ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {tText(selectedStore.name, lang)}
                            </h3>
                            <VerificationStatusLabel status={selectedStore.verificationStatus} lang={lang} />
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {formatCity(selectedStore.city, lang)} · {tText(selectedStore.address, lang)}
                          </p>
                        </div>
                        <div className="text-xs text-end space-y-0.5">
                          <p className="font-semibold text-slate-900">{tText(selectedStore.applicantName, lang)}</p>
                          <LtrValue className="text-slate-500">{selectedStore.phone}</LtrValue>
                        </div>
                      </div>

                      {/* Private Documents Confidentiality Banner */}
                      <div className="p-3 rounded-xl bg-slate-900 text-slate-100 text-xs flex items-center gap-2.5">
                        <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>
                          {lang === 'ar'
                            ? 'وثائق توثيق سرّية — للمراجعة الداخلية فقط ولا تظهر مطلقاً في ملف المتجر العام.'
                            : 'CONFIDENTIAL EVIDENCE — Internal review only; strictly excluded from public store profiles.'}
                        </span>
                      </div>

                      {/* Documents Grid with Zoom & PDF Inspection — Strictly Founder/Private-Evidence Permission Only */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 mb-2.5">
                          {lang === 'ar'
                            ? `المستندات المرفقة (${liveDocs.length || selectedStore.documents.length})`
                            : `Submitted Private Documents (${liveDocs.length || selectedStore.documents.length})`}
                        </h4>
                        {!hasAdminPermission('view_private_evidence') ? (
                          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
                            <Lock className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              {lang === 'ar'
                                ? 'الاطلاع على صور البطاقة القومية ومستندات الهوية الخاصة مقصور على المؤسسين المخوّلين فقط.'
                                : 'Private identity documents (National ID & business filings) are restricted strictly to authorized founders.'}
                            </p>
                          </div>
                        ) : docsLoading ? (
                          <p className="text-xs text-slate-500 p-4 rounded-xl bg-slate-50 border border-slate-200">
                            {lang === 'ar' ? 'جاري تحميل روابط المستندات السرية...' : 'Loading private evidence links...'}
                          </p>
                        ) : liveDocs.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {liveDocs.map((doc) => {
                              const isPdf =
                                doc.content_type?.includes('pdf') ||
                                doc.fileName.toLowerCase().endsWith('.pdf') ||
                                doc.url.toLowerCase().includes('.pdf');
                              return (
                                <div
                                  key={doc.id}
                                  className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50"
                                >
                                  <div
                                    className="relative group cursor-zoom-in"
                                    onClick={() =>
                                      setZoomDoc({
                                        title: doc.kind,
                                        url: doc.url,
                                        fileName: doc.fileName,
                                        isPdf,
                                      })
                                    }
                                  >
                                    {isPdf ? (
                                      <div className="aspect-[4/3] bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-700">
                                        <FileText className="w-8 h-8 text-red-600" />
                                        <span className="text-[11px] font-bold">PDF Document</span>
                                      </div>
                                    ) : (
                                      <SafeImage src={doc.url} alt={doc.fileName} aspectClass="aspect-[4/3]" />
                                    )}
                                    <div className="absolute inset-0 bg-slate-950/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="px-2.5 py-1 rounded-lg bg-white text-slate-900 text-[11px] font-semibold flex items-center gap-1">
                                        <Maximize2 className="w-3 h-3" />
                                        {lang === 'ar' ? 'فحص مكبّر' : 'Inspect'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-2.5 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold text-slate-900 truncate">{doc.kind}</p>
                                      <p dir="ltr" className="text-[10px] font-mono-num text-slate-500 truncate">
                                        {doc.fileName}
                                      </p>
                                    </div>
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 shrink-0"
                                      title={lang === 'ar' ? 'فتح في نافذة جديدة' : 'Open in new tab'}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 p-4 rounded-xl bg-slate-50 border border-slate-200">
                            {lang === 'ar' ? 'لم يقم المتجر برفع مستندات بعد.' : 'No verification documents uploaded yet.'}
                          </p>
                        )}
                      </div>

                      {/* Reviewer Evidence Checklist */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <p className="font-bold text-slate-900">
                          {lang === 'ar' ? 'قائمة التحقق للمراجع' : 'Reviewer Evidence Checklist'}
                        </p>
                        {(
                          [
                            { id: 'id_clear', ar: 'البطاقة القومية واضحة وسارية المفعول (الوجهين)', en: 'National ID (front & back) is legible and valid' },
                            { id: 'name_matches', ar: 'اسم مقدم الطلب يطابق وثيقة الهوية', en: 'Applicant name matches identity document' },
                            { id: 'storefront_real', ar: 'لافتة المتجر أو السجل التجاري يثبت وجود محل فعلي في المدينة التجريبية', en: 'Storefront photo or commercial reg confirms physical shop in pilot city' },
                          ] as const
                        ).map((chk) => (
                          <label key={chk.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(checklist[chk.id])}
                              onChange={(e) =>
                                setChecklist((prev) => ({ ...prev, [chk.id]: e.target.checked }))
                              }
                              className="w-4 h-4 accent-blue-700"
                            />
                            <span>{lang === 'ar' ? chk.ar : chk.en}</span>
                          </label>
                        ))}
                      </div>

                      {/* A-04 Verification Decision Buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setDecisionModal('approved');
                            setDecisionNote('تم التحقق من الهوية القومية واللافتة الخارجية للمتجر الفعلي.');
                          }}
                          className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {lang === 'ar' ? 'اعتماد وتوثيق المتجر' : 'Approve & Verify Store'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDecisionModal('changes_requested');
                            setDecisionNote('');
                          }}
                          className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          {lang === 'ar' ? 'طلب تعديلات' : 'Request Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDecisionModal('rejected');
                            setDecisionNote('');
                          }}
                          className="h-10 px-4 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          {lang === 'ar' ? 'رفض الطلب' : 'Reject Application'}
                        </button>
                      </div>

                      {/* Review History */}
                      {selectedStore.reviewHistory.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <p className="text-xs font-bold text-slate-700">
                            {lang === 'ar' ? 'سجل المراجعات السابقة' : 'Review History'}
                          </p>
                          {selectedStore.reviewHistory.map((h) => (
                            <div key={h.id} className="text-xs flex items-start justify-between gap-2 text-slate-600">
                              <span>
                                <strong className="text-slate-900">{tText(h.reviewerName, lang)}:</strong>{' '}
                                {tText(h.note, lang)}
                              </span>
                              <LtrValue className="text-[11px] text-slate-400 shrink-0">{h.timestamp}</LtrValue>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-500">
                      {lang === 'ar' ? 'اختر طلباً من القائمة لفحص المستندات.' : 'Select an application to inspect evidence.'}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* A-05: FOUNDER LISTING MODERATION (POST-PUBLICATION OVERSIGHT) */}
          {section === 'moderation' && (
            !hasAdminPermission('moderate_listings') ? (
              renderRestrictedNotice({ ar: 'الإشراف على الإعلانات المنشورة', en: 'Moderate live listings' })
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lang === 'ar' ? 'إشراف الإعلانات اللاحق للنشر (A-05)' : 'Post-Publication Listing Moderation (A-05)'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? 'إعلانات المتاجر الموثقة تُنشر تلقائياً بعد الفحص الآلي؛ هذه القائمة مخصصة للإشراف اللاحق والتعامل مع المخالفات وبلاغات العملاء.'
                      : 'Verified store listings publish automatically after automated checks; this queue provides post-publication oversight and customer report review.'}
                  </p>
                </div>

                {/* Incoming Customer Reports Panel */}
                {customerReports.length > 0 && (
                  <div className="bg-white border border-red-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-red-600 shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900">
                          {lang === 'ar'
                            ? `بلاغات العملاء (${openCustomerReports.length} مفتوح)`
                            : `Customer Reports (${openCustomerReports.length} open)`}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono-num text-slate-500">
                        {customerReports.length}{' '}
                        {lang === 'ar' ? 'إجمالي' : 'total'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {customerReports.map((rep) => {
                        const targetListing =
                          rep.targetType === 'listing'
                            ? listings.find((l) => l.id === rep.targetId)
                            : undefined;
                        return (
                          <div
                            key={rep.id}
                            className={`rounded-xl border p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                              rep.status === 'open'
                                ? 'bg-red-50/50 border-red-200'
                                : 'bg-slate-50 border-slate-200 opacity-75'
                            }`}
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-bold text-slate-900">
                                  {tText(rep.targetTitle, lang)}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="font-semibold text-red-700">
                                  {rep.targetType === 'listing'
                                    ? lang === 'ar'
                                      ? 'بلاغ إعلان'
                                      : 'Listing Report'
                                    : lang === 'ar'
                                      ? 'بلاغ متجر'
                                      : 'Store Report'}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-500 font-mono-num">{rep.createdAt}</span>
                                {rep.status !== 'open' && (
                                  <>
                                    <span className="text-slate-400">·</span>
                                    <span className="font-semibold text-emerald-700">
                                      {rep.status === 'reviewed'
                                        ? lang === 'ar'
                                          ? 'تمت المراجعة'
                                          : 'Reviewed'
                                        : lang === 'ar'
                                          ? 'مستبعد'
                                          : 'Dismissed'}
                                    </span>
                                  </>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-800">
                                {lang === 'ar' ? 'السبب: ' : 'Reason: '}
                                {getReportReasonLabel(rep.reasonId, lang)}
                              </p>
                              {rep.details && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {rep.details}
                                </p>
                              )}
                              {rep.reporterContact && (
                                <p className="text-[11px] text-slate-500 font-mono-num">
                                  {lang === 'ar' ? 'تواصل المُبلّغ: ' : 'Reporter contact: '}
                                  <span dir="ltr">{rep.reporterContact}</span>
                                </p>
                              )}
                            </div>

                            {rep.status === 'open' && (
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {targetListing && targetListing.publicationStatus === 'published' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModActionModal({ listing: targetListing, action: 'flag' });
                                      setModReason(
                                        `${getReportReasonLabel(rep.reasonId, lang)}${rep.details ? ` — ${rep.details}` : ''}`
                                      );
                                    }}
                                    className="h-8 px-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1"
                                  >
                                    <Flag className="w-3.5 h-3.5" />
                                    {lang === 'ar' ? 'تعليم الإعلان' : 'Flag Listing'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => resolveCustomerReport(rep.id, 'reviewed')}
                                  className="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {lang === 'ar' ? 'تمت المراجعة' : 'Mark Reviewed'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => resolveCustomerReport(rep.id, 'dismissed')}
                                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                                >
                                  {lang === 'ar' ? 'استبعاد' : 'Dismiss'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={modSearch}
                      onChange={(e) => setModSearch(e.target.value)}
                      placeholder={lang === 'ar' ? 'ابحث بالموديل أو اسم المتجر...' : 'Search model or store...'}
                      className="w-full h-9 ps-9 pe-3 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                  <select
                    value={modStatus}
                    onChange={(e) => setModStatus(e.target.value as 'all' | PublicationStatus)}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  >
                    <option value="all">{lang === 'ar' ? 'جميع الإعلانات المنشورة والمُعلّمة' : 'All Live & Moderated Listings'}</option>
                    <option value="published">{formatPublicationStatus('published', lang)}</option>
                    <option value="flagged">{formatPublicationStatus('flagged', lang)}</option>
                    <option value="removed_suspended">{formatPublicationStatus('removed_suspended', lang)}</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {modListings.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2.5">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p className="text-sm font-bold text-slate-900">
                        {lang === 'ar' ? 'قائمة الإشراف خالية من العناصر المطابقة' : 'Moderation queue is clear'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {lang === 'ar'
                          ? 'لا توجد إعلانات مطابقة للبحث أو الحالة المختارة حالياً. يمكنك مسح الفلاتر لمراجعة جميع الإعلانات المنشورة.'
                          : 'No listings match the current search or status filter. Reset filters to inspect all published listings.'}
                      </p>
                      {(modSearch || modStatus !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setModSearch('');
                            setModStatus('all');
                          }}
                          className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {lang === 'ar' ? 'عرض جميع الإعلانات' : 'Show All Listings'}
                        </button>
                      )}
                    </div>
                  ) : modListings.map((item) => {
                    const st = getStoreById(item.storeId);
                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <SafeImage
                            src={item.photos[0]?.url}
                            alt={item.model}
                            aspectClass="w-20 h-16 rounded-xl shrink-0"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">
                                {formatListingTitle(item.arabicBrandPrefix, item.model, lang)} —{' '}
                                <span dir="ltr" className="font-mono-num">{item.storageGb} GB</span>
                              </h3>
                              <PublicationStatusLabel status={item.publicationStatus} lang={lang} />
                            </div>
                            <p className="text-xs text-slate-600">
                              <strong className="text-slate-900 font-mono-num">{formatSdg(item.priceSdg, lang)}</strong> ·{' '}
                              {formatCondition(item.condition, lang)} ·{' '}
                              {st ? `${tText(st.name, lang)} (${formatCity(st.city, lang)})` : ''}
                            </p>
                            {item.statusReason && (
                              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                                {tText(item.statusReason, lang)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {item.publicationStatus !== 'published' && (
                            <button
                              type="button"
                              onClick={() =>
                                moderateListing(item.id, 'clear', {
                                  ar: 'تمت المراجعة وتأكيد سلامة الإعلان.',
                                  en: 'Reviewed and cleared for public visibility.',
                                })
                              }
                              className="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {lang === 'ar' ? 'تبرئة / نشر' : 'Clear'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setModActionModal({ listing: item, action: 'flag' });
                              setModReason('');
                            }}
                            className="h-8 px-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'تعليم للتصحيح' : 'Flag'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setModActionModal({ listing: item, action: 'remove' });
                              setModReason('');
                            }}
                            className="h-8 px-3 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'إزالة الإعلان' : 'Remove'}
                          </button>
                          {hasAdminPermission('suspend_stores') && st?.verificationStatus === 'verified' && (
                            <button
                              type="button"
                              onClick={() => {
                                setModActionModal({ listing: item, action: 'suspend_store' });
                                setModReason('');
                              }}
                              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-red-900 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <Slash className="w-3.5 h-3.5" />
                              {lang === 'ar' ? 'تعليق المتجر' : 'Suspend Store'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* A-06: ROLES AND PERMISSIONS */}
          {section === 'roles' && (
            !hasAdminPermission('manage_roles') ? (
              renderRestrictedNotice({ ar: 'إدارة الأدوار والصلاحيات', en: 'Manage roles & permissions' })
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {lang === 'ar' ? 'الأدوار والصلاحيات الإدارية' : 'Admin Roles & Permissions'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {lang === 'ar'
                        ? 'حدّد صلاحيات كل دور إداري وأسند الأدوار لفريق التشغيل. أي تعديل حساس يتطلب تأكيداً ويُسجّل في التدقيق.'
                        : 'Configure permission groups per role and assign roles to administrators with audit logging.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRole({
                        id: `role-${Date.now()}`,
                        name: { ar: 'مشرف جودة الإعلانات', en: 'Listing Quality Moderator' },
                        description: {
                          ar: 'مراجعة الإعلانات المنشورة فقط بدون صلاحية تعليق المتاجر.',
                          en: 'Post-publication moderation only without store suspension.',
                        },
                        permissions: ['moderate_listings'],
                      })
                    }
                    className="h-9 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                  >
                    {lang === 'ar' ? '+ إنشاء دور جديد' : '+ Create New Role'}
                  </button>
                </div>

                {/* Role Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {adminRoles.map((role) => (
                    <div
                      key={role.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{tText(role.name, lang)}</h3>
                          <span className="text-[11px] font-mono-num text-blue-700 font-semibold">
                            {role.permissions.length} {lang === 'ar' ? 'صلاحيات' : 'perms'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {tText(role.description, lang)}
                        </p>
                        <ul className="pt-2 space-y-1 text-[11px] text-slate-700 border-t border-slate-100">
                          {role.permissions.map((p) => {
                            const meta = ALL_PERMISSIONS.find((x) => x.id === p);
                            return (
                              <li key={p} className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{meta ? tText(meta.label, lang) : p}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRole({ ...role, permissions: [...role.permissions] })}
                          className="flex-1 h-9 rounded-xl border border-slate-200 hover:border-blue-400 text-xs font-semibold text-slate-800"
                        >
                          {lang === 'ar' ? 'تعديل الصلاحيات' : 'Edit Permissions'}
                        </button>
                        {role.id !== 'founder' && (
                          <button
                            type="button"
                            onClick={() => deleteAdminRole(role.id)}
                            title={lang === 'ar' ? 'طلب حذف الدور' : 'Request Role Deletion'}
                            className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Admin User Role Assignment */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'ar' ? 'إسناد الأدوار لأعضاء الإدارة' : 'Administrator Role Assignments'}
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {adminUsers.map((u) => (
                      <div key={u.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{tText(u.name, lang)}</p>
                          <p className="text-slate-500">
                            <LtrValue>{u.email}</LtrValue> · {formatCity(u.city, lang)}
                          </p>
                        </div>
                        <select
                          value={u.roleId}
                          onChange={(e) => assignAdminRole(u.id, e.target.value)}
                          className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                        >
                          {adminRoles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {tText(r.name, lang)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {/* A-07: AUDIT LOGS & DUAL APPROVAL */}
          {section === 'audit' && (
            !hasAdminPermission('view_audit_logs') ? (
              renderRestrictedNotice({ ar: 'استعراض سجل التدقيق والموافقة المزدوجة', en: 'View Audit Logs & Dual Approvals' })
            ) : (
              <div className="space-y-6">
                {/* DUAL APPROVAL SECTION */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {lang === 'ar' ? 'الموافقة المزدوجة للإجراءات الحساسة' : 'Sensitive-Action Dual Approval Queue'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lang === 'ar'
                          ? 'يجب أن يصدر الاعتماد الثاني من مشرف مخوّل مختلف عن مقدم الطلب (يُمنع الاعتماد الذاتي تقنياً).'
                          : 'Second approval must come from a different authorized administrator — self-approval is strictly blocked.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewDualReqOpen(true)}
                      className="h-9 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                    >
                      {lang === 'ar' ? '+ طلب إجراء حساس جديد' : '+ New Sensitive Request'}
                    </button>
                  </div>

                  {newDualReqOpen && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                      <p className="font-bold text-slate-900">
                        {lang === 'ar' ? 'إنشاء طلب تعليق متجر بموافقة مزدوجة' : 'Request Dual-Approved Store Suspension'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={dualTargetStoreId}
                          onChange={(e) => setDualTargetStoreId(e.target.value)}
                          className="h-9 px-3 rounded-lg border border-slate-200 bg-white"
                        >
                          {stores
                            .filter((s) => s.verificationStatus === 'verified')
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {tText(s.name, lang)} ({formatCity(s.city, lang)})
                              </option>
                            ))}
                        </select>
                        <input
                          type="text"
                          value={dualReqReason}
                          onChange={(e) => setDualReqReason(e.target.value)}
                          placeholder={lang === 'ar' ? 'السبب الإداري...' : 'Administrative reason...'}
                          className="h-9 px-3 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setNewDualReqOpen(false)}
                          className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600"
                        >
                          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const st = stores.find((s) => s.id === dualTargetStoreId);
                            if (!st) return;
                            createDualApprovalRequest({
                              actionType: 'suspend_store',
                              targetId: st.id,
                              targetName: st.name,
                              reason: { ar: dualReqReason, en: dualReqReason },
                              impactSummary: {
                                ar: `إخفاء جميع إعلانات "${st.name.ar}" من تطبيق العملاء فوراً عند الاعتماد الثاني.`,
                                en: `Immediately hides all listings of "${st.name.en}" upon second approval.`,
                              },
                            });
                            setNewDualReqOpen(false);
                          }}
                          className="h-8 px-4 rounded-lg bg-blue-700 text-white font-semibold"
                        >
                          {lang === 'ar' ? 'إرسال الطلب للموافقة الثانية' : 'Submit for 2nd Approval'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {dualApprovals.map((req) => {
                      const isSelf = req.requesterId === activeAdminUser.id;
                      const canApprove = hasAdminPermission('approve_sensitive') && !isSelf;
                      return (
                        <div
                          key={req.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {tText(req.targetName, lang)}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {lang === 'ar' ? 'مقدم الطلب: ' : 'Requested by: '}
                                <strong className="text-slate-700">{tText(req.requesterName, lang)}</strong> ·{' '}
                                <LtrValue>{req.createdAt}</LtrValue>
                              </p>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold ${
                                req.status === 'awaiting_second_approval'
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : req.status === 'approved'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-red-50 border-red-200 text-red-900'
                              }`}
                            >
                              {req.status === 'awaiting_second_approval'
                                ? lang === 'ar'
                                  ? 'بانتظار الموافقة الثانية'
                                  : 'Awaiting 2nd Approval'
                                : req.status === 'approved'
                                  ? lang === 'ar'
                                    ? 'معتمد ومنفّذ'
                                    : 'Approved'
                                  : lang === 'ar'
                                    ? 'مرفوض'
                                    : 'Rejected'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700 space-y-1">
                            <p>
                              <strong>{lang === 'ar' ? 'السبب: ' : 'Reason: '}</strong>
                              {tText(req.reason, lang)}
                            </p>
                            <p className="text-slate-600">
                              <strong>{lang === 'ar' ? 'الأثر المتوقع: ' : 'Impact: '}</strong>
                              {tText(req.impactSummary, lang)}
                            </p>
                          </div>

                          {req.status === 'awaiting_second_approval' ? (
                            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                              {isSelf ? (
                                <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5 shrink-0" />
                                  {lang === 'ar'
                                    ? 'لا يمكن لمقدم الطلب اعتماد الإجراء الحساس بنفسه — يتطلب هذا الإجراء موافقة مؤسس أو مشرف ثانٍ مخوّل.'
                                    : 'Self-approval is blocked — a different authorized founder or second approver must review and approve this request.'}
                                </p>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={!canApprove}
                                    onClick={() =>
                                      resolveDualApproval(req.id, 'approved', {
                                        ar: 'تمت مراجعة الأثر وتقديم الموافقة الثانية.',
                                        en: 'Reviewed impact and granted second approval.',
                                      })
                                    }
                                    className="h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {lang === 'ar' ? 'اعتماد الموافقة الثانية' : 'Grant 2nd Approval'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canApprove}
                                    onClick={() =>
                                      resolveDualApproval(req.id, 'rejected', {
                                        ar: 'تم رفض الإجراء الحساس لعدم كفاية المبررات.',
                                        en: 'Rejected sensitive action request.',
                                      })
                                    }
                                    className="h-9 px-4 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-800 text-xs font-semibold disabled:opacity-45"
                                  >
                                    {lang === 'ar' ? 'رفض الطلب' : 'Reject'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                              {lang === 'ar' ? 'الموافق الثاني: ' : 'Second Approver: '}
                              <strong>{req.secondApproverName ? tText(req.secondApproverName, lang) : ''}</strong> ·{' '}
                              <LtrValue>{req.resolvedAt}</LtrValue>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* READ-ONLY IMMUTABLE AUDIT LOGS */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {lang === 'ar' ? 'سجل التدقيق الإداري (للقراءة فقط)' : 'Immutable Administrative Audit Log (Read-Only)'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'ar'
                          ? 'جميع قرارات التوثيق والإشراف والصلاحيات موثقة تلقائياً ولا يمكن تعديلها أو حذفها.'
                          : 'Every verification, moderation, role, and dual-approval action is permanently logged.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder={lang === 'ar' ? 'ابحث بالهدف أو التفاصيل...' : 'Filter target or details...'}
                        className="w-full h-9 ps-9 pe-3 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <select
                      value={auditActorFilter}
                      onChange={(e) => setAuditActorFilter(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="all">{lang === 'ar' ? 'كل المشرفين' : 'All Actors'}</option>
                      {adminUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {tText(u.name, lang)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={auditTargetFilter}
                      onChange={(e) => setAuditTargetFilter(e.target.value as 'all' | 'store' | 'listing' | 'role' | 'approval')}
                      className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="all">{lang === 'ar' ? 'كل الأهداف' : 'All Target Types'}</option>
                      <option value="store">{lang === 'ar' ? 'المتاجر' : 'Stores'}</option>
                      <option value="listing">{lang === 'ar' ? 'الإعلانات' : 'Listings'}</option>
                      <option value="role">{lang === 'ar' ? 'الأدوار' : 'Roles'}</option>
                      <option value="approval">{lang === 'ar' ? 'الموافقات المزدوجة' : 'Dual Approvals'}</option>
                    </select>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredAudits.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        {lang === 'ar'
                          ? 'لا توجد سجلات تدقيق مطابقة للفلاتر الحالية.'
                          : 'No audit log entries match the current filters.'}
                      </div>
                    ) : filteredAudits.map((log) => {
                      const expanded = expandedAuditId === log.id;
                      return (
                        <div key={log.id} className="text-xs">
                          <button
                            type="button"
                            onClick={() => setExpandedAuditId(expanded ? null : log.id)}
                            className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50 text-start"
                          >
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="font-bold text-slate-900">{tText(log.actorName, lang)}</span>
                              <span className="text-slate-400">·</span>
                              <span className="font-mono-num text-[11px] text-blue-700 font-semibold">
                                {log.action}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-700 truncate">{tText(log.targetName, lang)}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-500">
                              <LtrValue>{log.ipAddress}</LtrValue>
                              <LtrValue>{log.timestamp}</LtrValue>
                              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>
                          {expanded && (
                            <div className="px-4 pb-3.5 pt-1 bg-slate-50 text-slate-700 space-y-1">
                              <p>{tText(log.details, lang)}</p>
                              <p className="text-[11px] text-slate-500">
                                {lang === 'ar' ? 'الدور: ' : 'Role: '}
                                {tText(log.actorRole, lang)} · ID: <LtrValue>{log.id}</LtrValue> · IP:{' '}
                                <LtrValue>{log.ipAddress}</LtrValue>
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )}
        </main>
      </div>

      {/* Private Document Zoom Modal (A-03) */}
      {zoomDoc && (
        <div className="fixed inset-0 z-[75] bg-slate-950/90 flex flex-col justify-between p-5">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-bold">{zoomDoc.title}</p>
              <p dir="ltr" className="text-xs font-mono-num text-slate-400">
                {zoomDoc.fileName} — PRIVATE INTERNAL REVIEW ONLY
              </p>
            </div>
            <button
              type="button"
              onClick={() => setZoomDoc(null)}
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-3xl w-full mx-auto my-auto">
            {zoomDoc.isPdf ? (
              <iframe
                src={zoomDoc.url}
                title={zoomDoc.title}
                className="w-full h-[70vh] rounded-xl bg-white"
              />
            ) : (
              <SafeImage src={zoomDoc.url} alt={zoomDoc.title} aspectClass="aspect-[16/10]" className="rounded-xl" />
            )}
          </div>
          <div className="text-center text-xs text-slate-400">
            {lang === 'ar' ? 'لا تُشارك هذه الوثيقة خارج بوابة الإدارة.' : 'Confidential verification asset.'}
          </div>
        </div>
      )}

      {/* A-04 Verification Decision Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(decisionModal && selectedStore)}
        title={
          decisionModal === 'approved'
            ? lang === 'ar'
              ? 'تأكيد توثيق المتجر'
              : 'Confirm Store Verification'
            : decisionModal === 'changes_requested'
              ? lang === 'ar'
                ? 'طلب تعديلات من التاجر'
                : 'Request Changes from Merchant'
              : lang === 'ar'
                ? 'تأكيد رفض طلب المتجر'
                : 'Confirm Store Rejection'
        }
        description={
          decisionModal === 'approved'
            ? lang === 'ar'
              ? `سيتم توثيق "${selectedStore?.name.ar}" وفتح صلاحية نشر الإعلانات فوراً.`
              : `Approving "${selectedStore?.name.en}" immediately unlocks listing publication.`
            : decisionModal === 'changes_requested'
              ? lang === 'ar'
                ? 'اذكر بوضوح التعديل المطلوب ليتمكن التاجر من تصحيحه وإعادة الإرسال.'
                : 'Provide an actionable reason so the merchant can correct and resubmit.'
              : lang === 'ar'
                ? 'يرجى إدخال سبب الرفض (مطلوب) لتوضيحه للتاجر وتوثيقه في سجل التدقيق.'
                : 'A documented rejection reason is required for merchant feedback and audit logs.'
        }
        confirmLabel={
          decisionModal === 'approved'
            ? lang === 'ar'
              ? 'اعتماد التوثيق'
              : 'Approve Store'
            : decisionModal === 'changes_requested'
              ? lang === 'ar'
                ? 'إرسال طلب التعديل'
                : 'Send Request'
              : lang === 'ar'
                ? 'تأكيد الرفض'
                : 'Reject Store'
        }
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone={decisionModal === 'approved' ? 'primary' : decisionModal === 'changes_requested' ? 'warning' : 'danger'}
        confirmDisabled={
          (decisionModal === 'changes_requested' || decisionModal === 'rejected') && !decisionNote.trim()
        }
        onConfirm={handleConfirmStoreDecision}
        onCancel={() => setDecisionModal(null)}
      >
        <textarea
          rows={3}
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          placeholder={
            lang === 'ar' ? 'اكتب سبب القرار أو التوجيه للتاجر...' : 'Enter decision note or required reason...'
          }
          className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
        />
      </ConfirmDialog>

      {/* A-05 Moderation / Store Suspension Dialog */}
      <ConfirmDialog
        open={Boolean(modActionModal)}
        title={
          modActionModal?.action === 'flag'
            ? lang === 'ar'
              ? 'تعليم الإعلان للتصحيح'
              : 'Flag Listing for Correction'
            : modActionModal?.action === 'remove'
              ? lang === 'ar'
                ? 'إزالة الإعلان من التطبيق العام'
                : 'Remove Live Listing'
              : lang === 'ar'
                ? 'تحذير: تعليق المتجر بالكامل'
                : 'High Impact: Suspend Store'
        }
        description={
          modActionModal?.action === 'suspend_store'
            ? lang === 'ar'
              ? 'سيؤدي تعليق المتجر إلى إخفاء جميع إعلاناته فوراً من تطبيق العملاء وقفل النشر حتى تسوية المخالفة.'
              : 'Suspending this store will immediately hide ALL of its listings from customer discovery and lock publishing.'
            : lang === 'ar'
              ? 'أدخل سبب الإجراء لإبلاغ التاجر وتوثيقه في سجل التدقيق (A-07).'
              : 'Enter the moderation reason for merchant notification and the audit log.'
        }
        confirmLabel={
          modActionModal?.action === 'suspend_store'
            ? suspendViaDual
              ? lang === 'ar'
                ? 'إرسال للموافقة المزدوجة (A-07)'
                : 'Submit for Dual Approval'
              : lang === 'ar'
                ? 'تعليق المتجر فوراً'
                : 'Suspend Store Immediately'
            : lang === 'ar'
              ? 'تأكيد الإجراء'
              : 'Confirm Action'
        }
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone={modActionModal?.action === 'flag' ? 'warning' : 'danger'}
        confirmDisabled={!modReason.trim()}
        onConfirm={handleConfirmModAction}
        onCancel={() => setModActionModal(null)}
      >
        <div className="space-y-3">
          <textarea
            rows={3}
            value={modReason}
            onChange={(e) => setModReason(e.target.value)}
            placeholder={lang === 'ar' ? 'السبب الإداري المطلوب...' : 'Required moderation reason...'}
            className="w-full p-3 rounded-xl border border-slate-200 text-xs"
          />
          {modActionModal?.action === 'suspend_store' && (
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={suspendViaDual}
                onChange={(e) => setSuspendViaDual(e.target.checked)}
                className="accent-blue-700"
              />
              <span>
                {lang === 'ar'
                  ? 'تمرير التعليق عبر طلب موافقة مزدوجة (موصى به)'
                  : 'Route suspension through Dual Approval (recommended)'}
              </span>
            </label>
          )}
        </div>
      </ConfirmDialog>

      {/* A-06 Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 z-[70] bg-slate-950/55 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'ar' ? 'تعديل الدور والصلاحيات' : 'Edit Role & Permissions'}
              </h3>
              <button type="button" onClick={() => setEditingRole(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'اسم الدور (عربي)' : 'Role Name (AR)'}
                </label>
                <input
                  type="text"
                  value={editingRole.name.ar}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, name: { ...editingRole.name, ar: e.target.value } })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ar' ? 'اسم الدور (إنجليزي)' : 'Role Name (EN)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingRole.name.en}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, name: { ...editingRole.name, en: e.target.value } })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto thin-scroll">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = editingRole.permissions.includes(perm.id);
                return (
                  <label
                    key={perm.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...editingRole.permissions, perm.id]
                          : editingRole.permissions.filter((p) => p !== perm.id);
                        setEditingRole({ ...editingRole, permissions: next });
                      }}
                      className="mt-0.5 accent-blue-700"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{tText(perm.group, lang)}</p>
                      <p className="text-slate-600">{tText(perm.label, lang)}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRoleSave(true)}
                className="h-9 px-5 rounded-lg bg-blue-700 text-white text-xs font-semibold"
              >
                {lang === 'ar' ? 'حفظ الصلاحيات' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRoleSave}
        title={lang === 'ar' ? 'تأكيد تعديل صلاحيات حساسة' : 'Confirm Sensitive Permission Update'}
        description={
          lang === 'ar'
            ? 'سيؤدي حفظ هذه التغييرات إلى تحديث صلاحيات جميع المشرفين المرتبطين بهذا الدور فوراً وتوثيق العملية في سجل التدقيق.'
            : 'Saving will immediately update access for all administrators assigned to this role and log an audit entry.'
        }
        confirmLabel={lang === 'ar' ? 'تأكيد وحفظ' : 'Confirm & Save'}
        cancelLabel={lang === 'ar' ? 'رجوع' : 'Back'}
        tone="warning"
        onConfirm={() => {
          if (editingRole) saveAdminRole(editingRole);
          setConfirmRoleSave(false);
          setEditingRole(null);
        }}
        onCancel={() => setConfirmRoleSave(false)}
      />
    </div>
  );
}
