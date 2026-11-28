export type Language = 'ar' | 'en';

export type PortalMode = 'customer' | 'merchant' | 'admin';

export type CityId =
  | 'port_sudan'
  | 'khartoum'
  | 'omdurman'
  | 'al_jazirah'
  | 'river_nile'
  | 'northern'
  | 'kassala'
  | 'gedaref'
  | 'sennar'
  | 'white_nile'
  | 'blue_nile'
  | 'north_kordofan'
  | 'south_kordofan'
  | 'west_kordofan'
  | 'north_darfur'
  | 'south_darfur'
  | 'west_darfur'
  | 'central_darfur'
  | 'east_darfur';

export type VerificationStatus =
  | 'draft'
  | 'submitted'
  | 'changes_requested'
  | 'verified'
  | 'suspended'
  | 'rejected';

export type PublicationStatus =
  | 'draft'
  | 'processing'
  | 'needs_correction'
  | 'published'
  | 'flagged'
  | 'removed_suspended';

export type DeviceCondition = 'new' | 'used';

export type UsedGrade = 'like_new' | 'excellent' | 'good' | 'fair';

export type UsedAvailability = 'available' | 'reserved' | 'sold';

export type BrandId = string;

export interface BilingualText {
  ar: string;
  en: string;
}

export interface VerificationDocument {
  id: string;
  type: 'national_id_front' | 'national_id_back' | 'commercial_reg' | 'storefront_photo';
  label: BilingualText;
  fileName: string;
  uploadedAt: string;
  status: 'uploaded' | 'uploading' | 'failed' | 'missing';
  imageUrl: string;
  notes?: string;
}

export interface StoreReviewEntry {
  id: string;
  timestamp: string;
  reviewerName: BilingualText;
  decision: 'submitted' | 'approved' | 'changes_requested' | 'rejected' | 'suspended' | 'reinstated';
  note: BilingualText;
}

export type StoreStaffRole = 'owner' | 'manager' | 'clerk';

export interface StoreStaffMember {
  id: string;
  name: BilingualText;
  phone: string;
  role: StoreStaffRole;
  addedAt: string;
  active: boolean;
}

export interface RatingReview {
  id: string;
  targetType: 'store' | 'product';
  targetId: string; // Store ID (for 'store') or Listing/Product ID (for 'product')
  authorName: string;
  rating: number; // 1..5
  comment?: string;
  createdAt: string;
  /** For 'product' ratings: links this product rating to its single phone model key (`brand::model`). */
  modelKey?: string;
  listingId?: string;
  storeId?: string;
  storeName?: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  breakdown: [number, number, number, number, number]; // [5★, 4★, 3★, 2★, 1★]
  reviews: RatingReview[];
  /** For model summaries aggregated from product ratings: number of distinct products with ratings. */
  linkedProductCount?: number;
}

export type ReportTargetType = 'listing' | 'store';

export type ReportReasonId =
  | 'misleading_price'
  | 'fake_or_counterfeit'
  | 'wrong_condition_specs'
  | 'already_sold'
  | 'suspicious_photos'
  | 'fraud_or_scam'
  | 'wrong_location_hours'
  | 'unresponsive'
  | 'refused_warranty'
  | 'other';

export interface CustomerReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle: BilingualText;
  storeId?: string;
  reasonId: ReportReasonId;
  details?: string;
  reporterContact?: string;
  createdAt: string;
  status: 'open' | 'reviewed' | 'dismissed';
}


export interface Store {
  id: string;
  name: BilingualText;
  city: CityId;
  address: BilingualText;
  locationGuidance: BilingualText;
  phone: string;
  whatsapp: string;
  description: BilingualText;
  openingHours: BilingualText;
  bannerImage: string;
  verificationStatus: VerificationStatus;
  submittedAt?: string;
  verifiedAt?: string;
  applicantName: BilingualText;
  applicantPhone: string;
  documents: VerificationDocument[];
  reviewHistory: StoreReviewEntry[];
  reviewerFeedback?: BilingualText;
  staff: StoreStaffMember[];
  contactAvailable?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  acceptsTradeIn?: boolean;
  stats: {
    views7d: number;
    contactClicks7d: number;
    dailyViews: { day: BilingualText; views: number; contacts: number }[];
  };
}

export interface PriceHistoryEntry {
  id: string;
  timestamp: string;
  oldPriceSdg: number;
  newPriceSdg: number;
  changedBy: BilingualText;
}

export interface ListingPhoto {
  id: string;
  url: string;
  caption: BilingualText;
  kind?: 'front' | 'back' | 'screen_on' | 'seal' | 'general';
}

export interface PhoneSpecifications {
  release_year: number;
  series: string;
  display: {
    size_inches: number;
    type: string;
    resolution: string;
    refresh_rate_hz: number;
  };
  performance: {
    chipset: string;
    os: string;
  };
  camera: {
    rear_main_mp: number;
    rear: string;
    rear_ois: boolean;
    front: string;
    video: string;
  };
  battery: {
    capacity_mah: number;
    charging_wired_w: number;
    charging_wireless_w: number;
  };
  connectivity: {
    network: string;
    sim: string;
    nfc: boolean;
    usb: string;
    headphone_jack: boolean;
    microsd: boolean;
  };
  build: {
    fingerprint: string;
    ip_rating: string;
  };
  /** Internal data-provenance metadata — must NOT be rendered in customer UI */
  source?: {
    provider: string;
    external_id: string;
    fetched_at: string;
    source_url: string;
  };
}

export interface UsedChecklist {
  biometricsWorking: boolean;
  originalScreen: boolean;
  networkUnlocked: boolean;
  cleanImei: boolean;
  accessoriesIncluded: boolean;
}

export interface PriceAlert {
  id: string;
  listingId: string;
  model: string;
  targetPriceSdg?: number | null;
  initialPriceSdg: number;
  createdAt: string;
}

export interface CustomerNotification {
  id: string;
  type: 'price_drop' | 'chat_reply' | 'new_message' | 'back_in_stock' | 'system';
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  listingId?: string | null;
  storeId?: string | null;
  threadKey?: string | null;
  read: boolean;
  createdAt: string;
}

export interface Listing {
  id: string;
  storeId: string;
  brand: BrandId;
  model: string; // e.g., "Galaxy S24 Ultra", "iPhone 13 Pro"
  arabicBrandPrefix: string; // e.g., "سامسونج", "آيفون"
  variantKey: string; // Exact variant matcher for Compare Offers, e.g. "samsung-s24-ultra-256"
  storageGb: number;
  ramGb?: number;
  color: BilingualText;
  condition: DeviceCondition;
  priceSdg: number;
  previousPriceSdg?: number | null;
  priceDropped?: boolean;
  usdPrice?: number | null;
  acceptsTradeIn?: boolean;
  // New phone fields
  stockQty?: number;
  sealedBox?: boolean;
  warrantyType?: BilingualText;
  warrantyMonths?: number;
  // Used phone fields (individual physical unit)
  usedUnitCode?: string;
  usedGrade?: UsedGrade;
  usedAvailability?: UsedAvailability;
  batteryHealthPct: number | null; // null = Not verified (never invent!)
  defectsDescription?: BilingualText;
  replacedParts?: BilingualText;
  originalBox?: boolean;
  inspectionWarrantyDays?: number;
  usedChecklist?: UsedChecklist;
  // Detailed hardware specifications (optional override; resolved via catalog specs by model)
  specifications?: PhoneSpecifications;
  // Common fields
  photos: ListingPhoto[];
  publicationStatus: PublicationStatus;
  statusReason?: BilingualText;
  createdAt: string;
  updatedAt: string;
  viewsCount: number;
  contactClicks: number;
  priceHistory: PriceHistoryEntry[];
  version: number; // Used to demonstrate M-10 concurrent staff edit conflict
  featured?: boolean;
}

export interface CatalogModel {
  brand: BrandId;
  model: string;
  arabicBrandPrefix: string;
  storages: number[];
  ramOptions: number[];
  colors: BilingualText[];
  defaultImage: string;
}

export type AdminPermission =
  | 'review_stores'
  | 'view_private_evidence'
  | 'moderate_listings'
  | 'suspend_stores'
  | 'manage_roles'
  | 'view_audit_logs'
  | 'approve_sensitive';

export interface AdminRole {
  id: string;
  name: BilingualText;
  description: BilingualText;
  permissions: AdminPermission[];
  isSystem?: boolean;
}

export interface AdminUser {
  id: string;
  name: BilingualText;
  email: string;
  roleId: string;
  city: CityId;
  lastActive: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: BilingualText;
  actorRole: BilingualText;
  action:
    | 'store_approved'
    | 'store_changes_requested'
    | 'store_rejected'
    | 'store_suspended'
    | 'listing_cleared'
    | 'listing_flagged'
    | 'listing_removed'
    | 'role_updated'
    | 'dual_approval_requested'
    | 'dual_approval_approved'
    | 'dual_approval_rejected'
    | 'ad_created'
    | 'ad_updated'
    | 'ad_deleted';
  targetType: 'store' | 'listing' | 'role' | 'approval' | 'ad';
  targetId: string;
  targetName: BilingualText;
  ipAddress: string;
  details: BilingualText;
}

export type SponsoredAdStatus = 'active' | 'paused' | 'scheduled' | 'ended';
export type SponsoredAdPaymentStatus = 'paid' | 'pending' | 'invoiced';

export interface SponsoredAdDailyStat {
  date: string;
  impressions: number;
  clicks: number;
}

export interface AdAnalyticsMetadata {
  city?: string;
  locale?: Language;
  listingId?: string | null;
  timeToClickMs?: number;
  source?: string;
}

export interface SponsoredAd {
  id: string;
  storeId: string;
  storeName: BilingualText;
  listingId?: string | null;
  title: BilingualText;
  subtitle: BilingualText;
  ctaLabel: BilingualText;
  badgeText?: BilingualText;
  imageUrl: string;
  targetCity: CityId | 'all';
  status: SponsoredAdStatus;
  priority: number;
  skipDelaySec: number;
  paidAmountSdg: number;
  paymentStatus: SponsoredAdPaymentStatus;
  paymentRef?: string;
  startsAt: string;
  endsAt: string;
  impressions: number;
  clicks: number;
  ctrPct: number;
  lastClickedAt?: string | null;
  avgTimeToClickMs?: number | null;
  dailyStats: SponsoredAdDailyStat[];
  createdAt: string;
}

export interface DualApprovalRequest {
  id: string;
  createdAt: string;
  requesterId: string;
  requesterName: BilingualText;
  actionType: 'suspend_store' | 'elevate_role_permissions' | 'remove_bulk_listings';
  targetId: string;
  targetName: BilingualText;
  reason: BilingualText;
  impactSummary: BilingualText;
  status: 'awaiting_second_approval' | 'approved' | 'rejected';
  secondApproverId?: string;
  secondApproverName?: BilingualText;
  resolvedAt?: string;
  resolutionNote?: BilingualText;
}

export type OfflineSimMode = 'online' | 'slow' | 'offline_cached' | 'offline_empty' | 'reconnecting';
export type StartupSimMode = 'ready' | 'splash' | 'loading' | 'error';
export type SubmissionOutcomeMode = 'normal' | 'failure' | 'conflict' | 'uncertain';

export interface SimulationState {
  offlineMode: OfflineSimMode;
  startupMode: StartupSimMode;
  skeletonLoading: boolean;
  brokenImages: boolean;
  lowDataMode: boolean;
  submissionOutcome: SubmissionOutcomeMode;
  merchantSessionExpired: boolean;
  staffPermissionRevoked: boolean;
  mobileFrameStyle: 'android' | 'ios' | 'expanded';
}
