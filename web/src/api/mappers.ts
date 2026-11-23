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
  return 'samsung';
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
  const brandId = toBrandId(brandName);
  const modelName = raw.model || `Model #${raw.variant_id}`;
  const storageGb = Number(raw.storage_gb || 128);
  const photos: ListingPhoto[] = (raw.media || raw.media_status || []).map((m: any, idx: number) => ({
    id: String(m.id || idx),
    url: m.url || m.thumbnail_url || '',
    kind: (m.kind === 'screen' ? 'screen_on' : m.kind === 'catalog' ? 'general' : m.kind || 'front') as ListingPhoto['kind'],
    label: bi(m.kind || 'photo'),
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
    arabicBrandPrefix: ARABIC_BRAND_PREFIX[brandId] || brandName,
    model: modelName,
    variantKey: `${brandId}-${modelName.toLowerCase().replace(/\s+/g, '-')}-${storageGb}`,
    storageGb,
    ramGb: Number(raw.ram_gb || 8),
    color: bi(raw.color || 'Black'),
    condition: cond,
    priceSdg: Math.round(Number(raw.price || 0)),
    stockQty: cond === 'new' ? Number(raw.quantity ?? 0) : undefined,
    usedAvailability: usedAv,
    usedUnitCode: raw.used_unit_code || undefined,
    usedGrade: cond === 'used' ? ((raw.grade || 'excellent') as UsedGrade) : undefined,
    batteryHealth: raw.battery_health ?? undefined,
    defectsDescription: raw.defects ? bi(raw.defects) : undefined,
    replacedParts: raw.replaced_parts ? bi(raw.replaced_parts) : undefined,
    hasBox: Boolean(raw.has_original_box),
    isSealed: Boolean(raw.is_sealed),
    warrantyMonths: raw.warranty_months ?? undefined,
    warrantyDays: raw.warranty_days ?? undefined,
    warrantyType: raw.warranty_type ? bi(raw.warranty_type) : undefined,
    publicationStatus: mapPublicationStatus(raw.status || 'published', raw.moderation || 'approved'),
    statusReason: raw.feedback ? bi(raw.feedback) : undefined,
    photos,
    featured: Boolean(raw.featured),
    viewsCount: Number(raw.views || 0),
    contactClicks: Number(raw.contact_leads || 0),
    createdAt: raw.created_at || new Date().toISOString(),
    updatedAt: raw.published_at || raw.created_at || new Date().toISOString(),
    priceHistory: (raw.price_history || []).map((h: any, idx: number, arr: any[]) => ({
      id: String(h.id || idx),
      oldPriceSdg: Math.round(Number(arr[idx + 1]?.price ?? h.price)),
      newPriceSdg: Math.round(Number(h.price)),
      changedBy: bi(h.changed_by || 'Merchant'),
      changedAt: h.created_at || '',
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
    status: raw.status || 'pending',
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
          : 'approval',
    targetId: String(raw.resource || ''),
    targetName: bi(raw.resource || raw.action),
    details: bi(JSON.stringify(raw.metadata || {})),
    timestamp: raw.created_at || '',
    ipAddress: raw.actor_ip || '—',
  };
}
