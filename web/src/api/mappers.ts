/**
 * Maps live Django REST Framework DTOs to the frontend's TypeScript domain types.
 */

import {
  AdminRole,
  AdminUser,
  AuditLogEntry,
  BilingualText,
  BrandId,
  CityId,
  CustomerReport,
  DualApprovalRequest,
  Listing,
  ListingPhoto,
  PublicationStatus,
  SponsoredAd,
  SponsoredAdPaymentStatus,
  SponsoredAdStatus,
  Store,
  StoreStaffMember,
  UsedAvailability,
  UsedGrade,
  VerificationStatus,
} from '../types';

export function bi(text: string | undefined | null, fallback = ''): BilingualText {
  const val = (text ?? fallback).trim();
  return { ar: val, en: val };
}

const ARABIC_BRAND_PREFIX: Record<string, string> = {
  apple: 'آبل',
  samsung: 'سامسونج',
  xiaomi: 'شاومي',
  google: 'جوجل',
  oneplus: 'ون بلس',
  tecno: 'تكنو',
  infinix: 'إنفنكس',
  oppo: 'أوبو',
  realme: 'ريلمي',
  vivo: 'فيفو',
  huawei: 'هواوي',
  honor: 'هونر',
  nokia: 'نوكيا',
  motorola: 'موتورولا',
  itel: 'آيتل',
  sony: 'سوني',
  asus: 'أسوس',
  lenovo: 'لينوفو',
  zte: 'زد تي إي',
  nothing: 'ناثينج',
  meizu: 'ميزو',
  htc: 'إتش تي سي',
  lg: 'إل جي',
  blackberry: 'بلاك بيري',
  alcatel: 'ألكاتيل',
};

export function toBrandId(brandName: string): BrandId {
  const slug = (brandName || '').toLowerCase().trim();
  if (slug in ARABIC_BRAND_PREFIX) return slug as BrandId;
  if (slug.includes('iphone') || slug.includes('apple')) return 'apple';
  if (slug.includes('samsung') || slug.includes('galaxy')) return 'samsung';
  if (slug.includes('xiaomi') || slug.includes('redmi') || slug.includes('poco')) return 'xiaomi';
  if (slug.includes('pixel') || slug.includes('google')) return 'google';
  if (slug.includes('oneplus')) return 'oneplus';
  if (slug.includes('tecno')) return 'tecno';
  if (slug.includes('infinix')) return 'infinix';
  return slug.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other';
}

export function mapVerificationStatus(status: string): VerificationStatus {
  switch (status) {
    case 'verified':
      return 'verified';
    case 'pending_verification':
      return 'submitted';
    case 'changes_requested':
      return 'changes_requested';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'suspended';
    default:
      return 'draft';
  }
}

export function mapPublicationStatus(status: string, moderation: string): PublicationStatus {
  if (status === 'removed') return 'removed_suspended';
  if (moderation === 'flagged') return 'flagged';
  if (status === 'paused') return 'paused';
  if (status === 'processing') return 'processing';
  if (status === 'published') return 'published';
  return 'draft';
}

export function mapStore(
  raw: any,
  staff: StoreStaffMember[] = [],
  dailyViews?: { day: BilingualText; views: number; contacts: number }[]
): Store {
  const status = raw.verified ? 'verified' : mapVerificationStatus(raw.status || 'draft');
  const defaultDays = ['1', '2', '3', '4', '5', '6', '7'].map((d) => ({
    day: bi(d),
    views: 0,
    contacts: 0,
  }));
  const dv = dailyViews && dailyViews.length > 0 ? dailyViews : defaultDays;
  return {
    id: String(raw.id),
    name: bi(raw.name, 'متجر'),
    city: (raw.city || 'khartoum') as CityId,
    address: bi(raw.address),
    locationGuidance: bi(raw.location_guidance || raw.address),
    description: bi(raw.description),
    openingHours: bi(raw.opening_hours, 'السبت - الخميس: 9:00 ص - 9:00 م'),
    phone: raw.phone || '',
    whatsapp: raw.whatsapp || '',
    contactAvailable: raw.contact_available !== false,
    latitude: raw.latitude != null ? Number(raw.latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : null,
    acceptsTradeIn: Boolean(raw.accepts_trade_in),
    verificationStatus: status,
    bannerImage: raw.banner_url || '',
    verifiedAt: status === 'verified' ? raw.created_at?.slice(0, 10) : undefined,
    applicantName: bi(raw.owner_name || raw.name || ''),
    applicantPhone: raw.phone || '',
    documents: [],
    reviewHistory: [],
    staff,
    stats: {
      views7d: dv.reduce((a, b) => a + b.views, 0),
      contactClicks7d: dv.reduce((a, b) => a + b.contacts, 0),
      dailyViews: dv,
    },
  };
}

export function mapListing(raw: any): Listing {
  const brandName = raw.brand || 'Samsung';
  const brandId = raw.brand_slug ? String(raw.brand_slug) : toBrandId(brandName);
  const modelName = raw.model || `Model #${raw.variant_id}`;
  const storageGb = Number(raw.storage_gb || 128);
  const KIND_CAPTIONS: Record<string, BilingualText> = {
    front: { ar: 'الواجهة الأمامية', en: 'Front View' },
    back: { ar: 'الجهة الخلفية', en: 'Back View' },
    screen: { ar: 'الشاشة مضاءة', en: 'Screen On' },
    screen_on: { ar: 'الشاشة مضاءة', en: 'Screen On' },
    seal: { ar: 'ختم المصنع والعلبة', en: 'Factory Seal & Box' },
    catalog: { ar: 'صورة الجهاز', en: 'Device Photo' },
    general: { ar: 'صورة إضافية', en: 'Additional Photo' },
    defect: { ar: 'ملاحظات الحالة', en: 'Condition Close-up' },
    other: { ar: 'صورة أخرى', en: 'Other Photo' },
  };
  const photos: ListingPhoto[] = (raw.media || raw.media_status || []).map((m: any, idx: number) => ({
    id: String(m.id || idx),
    url: m.url || m.thumbnail_url || '',
    kind: (m.kind === 'screen' ? 'screen_on' : m.kind === 'catalog' ? 'general' : m.kind || 'front') as ListingPhoto['kind'],
    caption: KIND_CAPTIONS[m.kind || 'front'] || bi(m.kind || 'صورة الجهاز'),
  }));
  const cond = raw.condition === 'used' ? 'used' : 'new';
  const usedAv: UsedAvailability | undefined =
    cond === 'used'
      ? ((raw.used_availability || (Number(raw.quantity) > 0 ? 'available' : 'sold')) as UsedAvailability)
      : undefined;

  return {
    id: String(raw.id),
    storeId: String(raw.store_id),
    brand: brandId,
    arabicBrandPrefix: raw.brand_name_ar || ARABIC_BRAND_PREFIX[brandId] || brandName,
    model: modelName,
    variantKey: `${brandId}-${modelName.toLowerCase().replace(/\s+/g, '-')}-${storageGb}`,
    storageGb,
    ramGb: Number(raw.ram_gb || 8),
    color: bi(raw.color || 'Black'),
    condition: cond,
    priceSdg: Math.round(Number(raw.price || 0)),
    previousPriceSdg: raw.previous_price != null ? Math.round(Number(raw.previous_price)) : null,
    priceDropped: Boolean(raw.price_dropped),
    usdPrice: raw.usd_price != null ? Number(raw.usd_price) : null,
    acceptsTradeIn: Boolean(raw.accepts_trade_in),
    stockQty: cond === 'new' ? Number(raw.quantity ?? 0) : undefined,
    usedAvailability: usedAv,
    usedUnitCode: raw.used_unit_code || undefined,
    usedGrade: cond === 'used' ? ((raw.grade || 'excellent') as UsedGrade) : undefined,
    batteryHealthPct: raw.battery_health != null ? Number(raw.battery_health) : null,
    defectsDescription: raw.defects ? bi(raw.defects) : undefined,
    replacedParts: raw.replaced_parts ? bi(raw.replaced_parts) : undefined,
    originalBox: Boolean(raw.has_original_box),
    sealedBox: Boolean(raw.is_sealed),
    warrantyMonths: raw.warranty_months ?? undefined,
    inspectionWarrantyDays: raw.warranty_days ?? undefined,
    warrantyType: raw.warranty_type ? bi(raw.warranty_type) : undefined,
    usedChecklist: raw.used_checklist
      ? {
          biometricsWorking: Boolean(raw.used_checklist.biometrics_working ?? raw.used_checklist.biometricsWorking ?? true),
          originalScreen: Boolean(raw.used_checklist.original_screen ?? raw.used_checklist.originalScreen ?? true),
          networkUnlocked: Boolean(raw.used_checklist.network_unlocked ?? raw.used_checklist.networkUnlocked ?? true),
          cleanImei: Boolean(raw.used_checklist.clean_imei ?? raw.used_checklist.cleanImei ?? true),
          accessoriesIncluded: Boolean(raw.used_checklist.accessories_included ?? raw.used_checklist.accessoriesIncluded ?? false),
        }
      : cond === 'used'
        ? {
            biometricsWorking: true,
            originalScreen: true,
            networkUnlocked: true,
            cleanImei: true,
            accessoriesIncluded: Boolean(raw.has_original_box),
          }
        : undefined,
    specifications: raw.specifications || undefined,
    publicationStatus: mapPublicationStatus(raw.status || 'published', raw.moderation || 'approved'),
    statusReason: raw.feedback ? bi(raw.feedback) : undefined,
    photos,
    featured: Boolean(raw.featured),
    viewsCount: Number(raw.views || 0),
    contactClicks: Number(raw.contact_leads || 0),
    createdAt: raw.created_at || new Date().toISOString(),
    updatedAt: raw.published_at || raw.created_at || new Date().toISOString(),
    version: Number(raw.version || 1),
    priceHistory: (raw.price_history || []).map((h: any, idx: number, arr: any[]) => ({
      id: String(h.id || idx),
      oldPriceSdg: Math.round(Number(arr[idx + 1]?.price ?? h.price)),
      newPriceSdg: Math.round(Number(h.price)),
      changedBy: bi(h.changed_by || 'Merchant'),
      timestamp: h.created_at || '',
    })),
    // Extra backend fields preserved as non-breaking properties for mutations
    ...({ _version: Number(raw.version || 1), _variantId: Number(raw.variant_id || 0), _specifications: raw.specifications || null } as any),
  };
}

export function mapReport(raw: any): CustomerReport {
  return {
    id: String(raw.id),
    targetType: raw.target_type === 'store' ? 'store' : 'listing',
    targetId: String(raw.target_type === 'store' ? raw.store_id : raw.listing_id),
    targetTitle: bi(
      raw.target_type === 'store' ? `Store #${raw.store_id}` : `Listing #${raw.listing_id}`
    ),
    storeId: raw.store_id ? String(raw.store_id) : undefined,
    reasonId: raw.reason,
    details: raw.details || '',
    reporterContact: raw.reporter_contact || undefined,
    status: raw.status || 'open',
    createdAt: raw.created_at || '',
  };
}

export function mapAdminRole(raw: any): AdminRole {
  return {
    id: String(raw.id),
    name: bi(raw.name),
    description: bi(raw.description || raw.name),
    permissions: raw.permissions || [],
    ...({ _version: Number(raw.version || 1), _userIds: raw.user_ids || [] } as any),
  };
}

export function mapAdminUser(raw: any): AdminUser {
  return {
    id: String(raw.id),
    name: bi(raw.name),
    email: raw.email || raw.phone || '',
    roleId: raw.is_superuser ? 'founder' : String(raw.role_id || ''),
    city: 'khartoum',
    lastActive: 'Now',
    ...({ _isSuperuser: Boolean(raw.is_superuser) } as any),
  };
}

export function mapDualApproval(raw: any): DualApprovalRequest {
  return {
    id: String(raw.id),
    actionType: raw.operation === 'suspend_store' ? 'suspend_store' : 'elevate_role_permissions',
    targetId: String(raw.target_id),
    targetName: bi(`${raw.operation} #${raw.target_id}`),
    reason: bi(raw.reason),
    requesterId: String(raw.requested_by_id),
    requesterName: bi(raw.requested_by_name || `Admin #${raw.requested_by_id}`),
    status: raw.status === 'pending' ? 'awaiting_second_approval' : raw.status || 'awaiting_second_approval',
    createdAt: raw.created_at || '',
    secondApproverId: raw.decided_by_id ? String(raw.decided_by_id) : undefined,
    secondApproverName: raw.decided_by_name ? bi(raw.decided_by_name) : undefined,
    resolvedAt: raw.decided_at || undefined,
    ...({ _version: Number(raw.version || 1) } as any),
  };
}

export function mapAuditLog(raw: any): AuditLogEntry {
  return {
    id: String(raw.id),
    actorId: String(raw.actor_id),
    actorName: bi(raw.actor_name || `User #${raw.actor_id}`),
    actorRole: bi('Admin'),
    action: raw.action,
    targetType: raw.action?.startsWith('store') || raw.action?.startsWith('verification')
      ? 'store'
      : raw.action?.startsWith('listing')
        ? 'listing'
        : raw.action?.startsWith('role')
          ? 'role'
          : raw.action?.startsWith('ad')
            ? 'ad'
            : 'approval',
    targetId: String(raw.resource || ''),
    targetName: bi(raw.resource || raw.action),
    details: bi(JSON.stringify(raw.metadata || {})),
    timestamp: raw.created_at || '',
    ipAddress: raw.actor_ip || '—',
  };
}

export function mapSponsoredAd(raw: any): SponsoredAd {
  return {
    id: String(raw.id),
    storeId: String(raw.store_id),
    storeName: {
      ar: String(raw.store_name_ar || raw.store_name || `متجر #${raw.store_id}`),
      en: String(raw.store_name_en || raw.store_name || `Store #${raw.store_id}`),
    },
    listingId: raw.listing_id != null && raw.listing_id !== '' ? String(raw.listing_id) : null,
    title: {
      ar: String(raw.title_ar || raw.title || ''),
      en: String(raw.title_en || raw.title_ar || raw.title || ''),
    },
    subtitle: {
      ar: String(raw.subtitle_ar || raw.subtitle || ''),
      en: String(raw.subtitle_en || raw.subtitle_ar || raw.subtitle || ''),
    },
    ctaLabel: {
      ar: String(raw.cta_label_ar || 'زيارة المتجر'),
      en: String(raw.cta_label_en || 'Visit Store'),
    },
    badgeText:
      raw.badge_ar || raw.badge_en
        ? {
            ar: String(raw.badge_ar || raw.badge_en || ''),
            en: String(raw.badge_en || raw.badge_ar || ''),
          }
        : undefined,
    imageUrl: String(raw.image_url || ''),
    targetCity: (raw.target_city || 'all') as CityId | 'all',
    status: (raw.status || 'active') as SponsoredAdStatus,
    priority: Number(raw.priority ?? 10),
    skipDelaySec: Number(raw.skip_delay_sec ?? 3),
    paidAmountSdg: Math.round(Number(raw.paid_amount_sdg || 0)),
    paymentStatus: (raw.payment_status || 'paid') as SponsoredAdPaymentStatus,
    paymentRef: raw.payment_ref ? String(raw.payment_ref) : undefined,
    startsAt: String(raw.starts_at || '').slice(0, 10),
    endsAt: String(raw.ends_at || '').slice(0, 10),
    impressions: Number(raw.impressions || 0),
    clicks: Number(raw.clicks || 0),
    ctrPct:
      raw.ctr_pct != null
        ? Number(raw.ctr_pct)
        : Number(raw.impressions || 0) > 0
          ? Number(((Number(raw.clicks || 0) / Number(raw.impressions || 0)) * 100).toFixed(2))
          : 0,
    lastClickedAt: raw.last_clicked_at ? String(raw.last_clicked_at) : null,
    avgTimeToClickMs: raw.avg_time_to_click_ms != null ? Number(raw.avg_time_to_click_ms) : null,
    dailyStats: Array.isArray(raw.daily_stats)
      ? raw.daily_stats.map((d: any) => ({
          date: String(d.date || ''),
          impressions: Number(d.impressions || 0),
          clicks: Number(d.clicks || 0),
        }))
      : [],
    createdAt: String(raw.created_at || ''),
  };
}
