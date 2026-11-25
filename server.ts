import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.resolve(__dirname, 'web');
const DIST_DIR = path.resolve(WEB_DIR, 'dist');
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

// ============================================================================
// In-Memory Marketplace Store (mirrors backend/core/management/commands/seed_demo_marketplace.py)
// ============================================================================

interface UserRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'buyer' | 'merchant' | 'admin';
  merchant: boolean;
  is_superuser: boolean;
  role_id: number | null;
  phone_verified: boolean;
  email_verified: boolean;
  preferred_city: string;
  preferred_locale: 'ar' | 'en';
  store_id?: number;
}

interface BrandRecord {
  id: number;
  name: string;
  slug: string;
  name_ar: string;
  model_count: number;
}

interface ModelRecord {
  id: number;
  brand_id: number;
  brand: string;
  brand_slug: string;
  name: string;
  specifications: Record<string, unknown>;
}

interface VariantRecord {
  id: number;
  model_id: number;
  storage_gb: number;
  ram_gb: number;
  color: string;
}

interface StoreRecord {
  id: number;
  owner_id: number;
  owner_name: string;
  name: string;
  city: string;
  address: string;
  location_guidance: string;
  description: string;
  phone: string;
  whatsapp: string;
  opening_hours: string;
  contact_available: boolean;
  accepts_trade_in: boolean;
  latitude: number | null;
  longitude: number | null;
  banner_url: string;
  status: string;
  verified: boolean;
  created_at: string;
}

interface ListingRecord {
  id: number;
  store_id: number;
  variant_id: number;
  brand: string;
  brand_slug: string;
  brand_name_ar: string;
  model: string;
  storage_gb: number;
  ram_gb: number;
  color: string;
  condition: 'new' | 'used';
  price: string;
  previous_price: string | null;
  price_dropped: boolean;
  usd_price: number | null;
  accepts_trade_in: boolean;
  quantity: number;
  grade: string;
  battery_health: number | null;
  defects: string;
  replaced_parts: string;
  used_availability: string;
  used_unit_code: string;
  warranty_months: number | null;
  warranty_days: number | null;
  warranty_type: string;
  is_sealed: boolean;
  has_original_box: boolean;
  featured: boolean;
  status: string;
  moderation: string;
  feedback: string;
  views: number;
  contact_leads: number;
  version: number;
  specifications: Record<string, unknown>;
  media: Array<{ id: string; url: string; thumbnail_url: string; kind: string }>;
  price_history: Array<{ id: number; price: string; changed_by: string; created_at: string }>;
  created_at: string;
  published_at: string;
}

const nowIso = () => new Date().toISOString();
const dayAgoIso = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

const users: UserRecord[] = [
  {
    id: 1,
    name: 'Tariq Al-Fatih (Founder)',
    phone: '+249910000001',
    email: 'founder@sudanphones.sd',
    password: 'SudanAdmin@2026',
    role: 'admin',
    merchant: false,
    is_superuser: true,
    role_id: null,
    phone_verified: true,
    email_verified: true,
    preferred_city: 'khartoum',
    preferred_locale: 'ar',
  },
  {
    id: 2,
    name: 'Ahmed Al-Tayeb',
    phone: '+249911111111',
    email: 'buyer@sudanphones.sd',
    password: 'Buyer@2026',
    role: 'buyer',
    merchant: false,
    is_superuser: false,
    role_id: null,
    phone_verified: true,
    email_verified: true,
    preferred_city: 'khartoum',
    preferred_locale: 'ar',
  },
  {
    id: 3,
    name: 'Omar Al-Siddiq',
    phone: '+249912345678',
    email: 'merchant@sudanphones.sd',
    password: 'Merchant@2026',
    role: 'merchant',
    merchant: true,
    is_superuser: false,
    role_id: null,
    phone_verified: true,
    email_verified: true,
    preferred_city: 'khartoum',
    preferred_locale: 'ar',
    store_id: 1,
  },
  {
    id: 4,
    name: 'Yassin Osman',
    phone: '+249912345679',
    email: 'redsea@sudanphones.sd',
    password: 'Merchant@2026',
    role: 'merchant',
    merchant: true,
    is_superuser: false,
    role_id: null,
    phone_verified: true,
    email_verified: true,
    preferred_city: 'port_sudan',
    preferred_locale: 'ar',
    store_id: 2,
  },
  {
    id: 5,
    name: 'Khalid Ibrahim',
    phone: '+249912345681',
    email: 'jazirah@sudanphones.sd',
    password: 'Merchant@2026',
    role: 'merchant',
    merchant: true,
    is_superuser: false,
    role_id: null,
    phone_verified: true,
    email_verified: true,
    preferred_city: 'al_jazirah',
    preferred_locale: 'ar',
    store_id: 3,
  },
  {
    id: 6,
    name: 'Mustafa Hassan',
    phone: '+249912345680',
    email: 'pending@sudanphones.sd',
    password: 'Merchant@2026',
    role: 'merchant',
    merchant: true,
    is_superuser: false,
    role_id: null,
    phone_verified: true,
    email_verified: true,
    preferred_city: 'omdurman',
    preferred_locale: 'ar',
    store_id: 4,
  },
];

const brands: BrandRecord[] = [
  { id: 1, name: 'Apple', slug: 'apple', name_ar: 'آبل', model_count: 2 },
  { id: 2, name: 'Samsung', slug: 'samsung', name_ar: 'سامسونج', model_count: 2 },
  { id: 3, name: 'Xiaomi', slug: 'xiaomi', name_ar: 'شاومي', model_count: 1 },
  { id: 4, name: 'Tecno', slug: 'tecno', name_ar: 'تكنو', model_count: 1 },
  { id: 5, name: 'Infinix', slug: 'infinix', name_ar: 'إنفنكس', model_count: 0 },
];

const models: ModelRecord[] = [
  {
    id: 1,
    brand_id: 1,
    brand: 'Apple',
    brand_slug: 'apple',
    name: 'iPhone 15 Pro Max',
    specifications: {
      release_year: 2023,
      series: 'iPhone Pro',
      display: { size_inches: 6.7, type: 'LTPO Super Retina XDR OLED', resolution: '1290x2796', refresh_rate_hz: 120 },
      performance: { chipset: 'Apple A17 Pro', os: 'iOS 17 (Upgradable to iOS 18)' },
      camera: {
        rear_main_mp: 48,
        rear: '48 MP (wide) + 12 MP (5x periscope) + 12 MP (ultrawide)',
        rear_ois: true,
        front: '12 MP (TrueDepth)',
        video: '4K@60fps ProRes',
      },
      battery: { capacity_mah: 4441, charging_wired_w: 27, charging_wireless_w: 15 },
      connectivity: { network: '5G / 4G LTE', sim: 'Nano-SIM + eSIM', nfc: true, usb: 'USB Type-C 3.2 Gen 2', headphone_jack: false, microsd: false },
      build: { fingerprint: 'Face ID', ip_rating: 'IP68' },
    },
  },
  {
    id: 2,
    brand_id: 1,
    brand: 'Apple',
    brand_slug: 'apple',
    name: 'iPhone 14 Pro',
    specifications: {
      release_year: 2022,
      series: 'iPhone Pro',
      display: { size_inches: 6.1, type: 'LTPO Super Retina XDR OLED', resolution: '1179x2556', refresh_rate_hz: 120 },
      performance: { chipset: 'Apple A16 Bionic', os: 'iOS 16 (Upgradable to iOS 18)' },
      camera: {
        rear_main_mp: 48,
        rear: '48 MP (wide) + 12 MP (3x telephoto) + 12 MP (ultrawide)',
        rear_ois: true,
        front: '12 MP (TrueDepth)',
        video: '4K@60fps ProRes',
      },
      battery: { capacity_mah: 3200, charging_wired_w: 23, charging_wireless_w: 15 },
      connectivity: { network: '5G / 4G LTE', sim: 'Nano-SIM + eSIM', nfc: true, usb: 'Lightning (USB 2.0)', headphone_jack: false, microsd: false },
      build: { fingerprint: 'Face ID', ip_rating: 'IP68' },
    },
  },
  {
    id: 3,
    brand_id: 2,
    brand: 'Samsung',
    brand_slug: 'samsung',
    name: 'Galaxy S24 Ultra',
    specifications: {
      release_year: 2024,
      series: 'Galaxy S',
      display: { size_inches: 6.8, type: 'Dynamic LTPO AMOLED 2X', resolution: '1440x3120', refresh_rate_hz: 120 },
      performance: { chipset: 'Snapdragon 8 Gen 3', os: 'Android 14, One UI 6.1' },
      camera: {
        rear_main_mp: 200,
        rear: '200 MP (wide) + 50 MP (5x periscope) + 10 MP (3x telephoto) + 12 MP (ultrawide)',
        rear_ois: true,
        front: '12 MP',
        video: '8K@30fps / 4K@60fps',
      },
      battery: { capacity_mah: 5000, charging_wired_w: 45, charging_wireless_w: 15 },
      connectivity: { network: '5G / 4G LTE', sim: 'Dual SIM (Nano-SIM + eSIM)', nfc: true, usb: 'USB Type-C 3.2', headphone_jack: false, microsd: false },
      build: { fingerprint: 'Under-display (ultrasonic)', ip_rating: 'IP68' },
    },
  },
  {
    id: 4,
    brand_id: 2,
    brand: 'Samsung',
    brand_slug: 'samsung',
    name: 'Galaxy A55 5G',
    specifications: {
      release_year: 2024,
      series: 'Galaxy A',
      display: { size_inches: 6.6, type: 'Super AMOLED', resolution: '1080x2340', refresh_rate_hz: 120 },
      performance: { chipset: 'Exynos 1480', os: 'Android 14, One UI 6.1' },
      camera: {
        rear_main_mp: 50,
        rear: '50 MP (wide) + 12 MP (ultrawide) + 5 MP (macro)',
        rear_ois: true,
        front: '32 MP',
        video: '4K@30fps / 1080p@60fps',
      },
      battery: { capacity_mah: 5000, charging_wired_w: 25, charging_wireless_w: 0 },
      connectivity: { network: '5G / 4G LTE', sim: 'Dual SIM (Nano-SIM / eSIM)', nfc: true, usb: 'USB Type-C 2.0', headphone_jack: false, microsd: true },
      build: { fingerprint: 'Under-display (optical)', ip_rating: 'IP67' },
    },
  },
  {
    id: 5,
    brand_id: 3,
    brand: 'Xiaomi',
    brand_slug: 'xiaomi',
    name: 'Redmi Note 13 Pro',
    specifications: {
      release_year: 2024,
      series: 'Redmi Note',
      display: { size_inches: 6.67, type: 'AMOLED (1.5K CrystalRes)', resolution: '1220x2712', refresh_rate_hz: 120 },
      performance: { chipset: 'Snapdragon 7s Gen 2', os: 'Android 13, MIUI 14' },
      camera: {
        rear_main_mp: 200,
        rear: '200 MP (wide) + 8 MP (ultrawide) + 2 MP (macro)',
        rear_ois: true,
        front: '16 MP',
        video: '4K@30fps / 1080p@60fps',
      },
      battery: { capacity_mah: 5100, charging_wired_w: 67, charging_wireless_w: 0 },
      connectivity: { network: '5G / 4G LTE', sim: 'Dual SIM (Nano-SIM + eSIM)', nfc: true, usb: 'USB Type-C 2.0', headphone_jack: true, microsd: false },
      build: { fingerprint: 'Under-display (optical)', ip_rating: 'IP54' },
    },
  },
  {
    id: 6,
    brand_id: 4,
    brand: 'Tecno',
    brand_slug: 'tecno',
    name: 'Camon 30 Pro 5G',
    specifications: {
      release_year: 2024,
      series: 'Camon',
      display: { size_inches: 6.78, type: 'AMOLED', resolution: '1080x2436', refresh_rate_hz: 144 },
      performance: { chipset: 'MediaTek Dimensity 8200 Ultimate', os: 'Android 14, HIOS 14' },
      camera: {
        rear_main_mp: 50,
        rear: '50 MP (wide, Sony IMX890) + 50 MP (ultrawide) + 2 MP (depth)',
        rear_ois: true,
        front: '50 MP (AF)',
        video: '4K@60fps / 1080p@60fps',
      },
      battery: { capacity_mah: 5000, charging_wired_w: 70, charging_wireless_w: 0 },
      connectivity: { network: '5G / 4G LTE', sim: 'Dual SIM (Nano-SIM)', nfc: true, usb: 'USB Type-C 2.0', headphone_jack: false, microsd: false },
      build: { fingerprint: 'Under-display (optical)', ip_rating: 'None' },
    },
  },
];

const variants: VariantRecord[] = [
  { id: 1, model_id: 1, storage_gb: 256, ram_gb: 8, color: 'Natural Titanium' },
  { id: 2, model_id: 2, storage_gb: 128, ram_gb: 6, color: 'Deep Purple' },
  { id: 3, model_id: 3, storage_gb: 256, ram_gb: 12, color: 'Titanium Gray' },
  { id: 4, model_id: 4, storage_gb: 256, ram_gb: 8, color: 'Awesome Navy' },
  { id: 5, model_id: 5, storage_gb: 256, ram_gb: 8, color: 'Midnight Black' },
  { id: 6, model_id: 6, storage_gb: 256, ram_gb: 12, color: 'Iceland Basaltic Dark' },
];

const IMG_IPHONE = '/src/assets/images/phone_iphone_15_pro_1795165420234.jpg';
const IMG_GALAXY = '/src/assets/images/phone_galaxy_s24_ultra_1795165419921.jpg';
const IMG_XIAOMI = '/src/assets/images/phone_xiaomi_midrange_1795165422645.jpg';
const IMG_USED = '/src/assets/images/phone_used_unit_inspection_1795165421619.jpg';
const IMG_STORE = '/src/assets/images/storefront_sudan_mobile_shop_1795165421628.jpg';

const stores: StoreRecord[] = [
  {
    id: 1,
    owner_id: 3,
    owner_name: 'Omar Al-Siddiq',
    name: 'متجر النيل للهواتف — Nile Mobile Hub',
    city: 'khartoum',
    address: 'شارع القصر، عمارة الذهب، الطابق الأرضي — الخرطوم',
    location_guidance: 'بجوار بنك الخرطوم فرع شارع القصر',
    description: 'أجهزة أصلية مختومة ومستعملة مفحوصة بضمان فعلي في الخرطوم.',
    phone: '+249912345678',
    whatsapp: '+249912345678',
    opening_hours: 'السبت - الخميس: 9:00 ص - 9:00 م',
    contact_available: true,
    accepts_trade_in: true,
    latitude: 15.6093,
    longitude: 32.5316,
    banner_url: IMG_STORE,
    status: 'verified',
    verified: true,
    created_at: dayAgoIso(45),
  },
  {
    id: 2,
    owner_id: 4,
    owner_name: 'Yassin Osman',
    name: 'البحر الأحمر فونز — Red Sea Phones',
    city: 'port_sudan',
    address: 'السوق الرئيسي، تقاطع شارع الميناء — بورتسودان',
    location_guidance: 'مقابل مسجد السوق الكبير',
    description: 'تشكيلة واسعة من هواتف آبل وسامسونج وشاومي في بورتسودان.',
    phone: '+249912345679',
    whatsapp: '+249912345679',
    opening_hours: 'يومياً: 10:00 ص - 10:00 م',
    contact_available: true,
    accepts_trade_in: true,
    latitude: 19.6158,
    longitude: 37.2164,
    banner_url: IMG_STORE,
    status: 'verified',
    verified: true,
    created_at: dayAgoIso(32),
  },
  {
    id: 3,
    owner_id: 5,
    owner_name: 'Khalid Ibrahim',
    name: 'الجزيرة موبايل — Al Jazirah Mobile',
    city: 'al_jazirah',
    address: 'السوق الكبير، شارع النيل — ود مدني',
    location_guidance: 'قرب موقف ود مدني الرئيسي',
    description: 'هواتف جديدة ومستعملة بأسعار منافسة وضمان استبدال في ولاية الجزيرة.',
    phone: '+249912345681',
    whatsapp: '+249912345681',
    opening_hours: 'السبت - الخميس: 9:30 ص - 8:30 م',
    contact_available: true,
    accepts_trade_in: false,
    latitude: 14.4012,
    longitude: 33.5199,
    banner_url: IMG_STORE,
    status: 'verified',
    verified: true,
    created_at: dayAgoIso(20),
  },
  {
    id: 4,
    owner_id: 6,
    owner_name: 'Mustafa Hassan',
    name: 'أم درمان تيك — Omdurman Tech',
    city: 'omdurman',
    address: 'سوق أم درمان الشعبي، شارع الأربعين',
    location_guidance: 'بجوار عمارة البركة',
    description: 'متجر متخصص في الهواتف الذكية بانتظار اعتماد التوثيق.',
    phone: '+249912345680',
    whatsapp: '+249912349900',
    opening_hours: 'السبت - الخميس: 10:00 ص - 9:00 م',
    contact_available: true,
    accepts_trade_in: false,
    latitude: 15.6445,
    longitude: 32.4777,
    banner_url: IMG_STORE,
    status: 'pending_verification',
    verified: false,
    created_at: dayAgoIso(2),
  },
];

let nextListingId = 10;
const listings: ListingRecord[] = [
  {
    id: 1,
    store_id: 1,
    variant_id: 1,
    brand: 'Apple',
    brand_slug: 'apple',
    brand_name_ar: 'آبل',
    model: 'iPhone 15 Pro Max',
    storage_gb: 256,
    ram_gb: 8,
    color: 'Natural Titanium',
    condition: 'new',
    price: '2850000.00',
    previous_price: '2950000.00',
    price_dropped: true,
    usd_price: 1180,
    accepts_trade_in: true,
    quantity: 5,
    grade: 'new',
    battery_health: 100,
    defects: '',
    replaced_parts: '',
    used_availability: '',
    used_unit_code: '',
    warranty_months: 12,
    warranty_days: null,
    warranty_type: 'ضمان الوكيل المعتمد',
    is_sealed: true,
    has_original_box: true,
    featured: true,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 142,
    contact_leads: 28,
    version: 1,
    specifications: models[0].specifications,
    media: [
      { id: 'm-1-1', url: IMG_IPHONE, thumbnail_url: IMG_IPHONE, kind: 'front' },
      { id: 'm-1-2', url: IMG_IPHONE, thumbnail_url: IMG_IPHONE, kind: 'seal' },
    ],
    price_history: [
      { id: 1, price: '2850000.00', changed_by: 'Omar Al-Siddiq', created_at: dayAgoIso(1) },
      { id: 2, price: '2950000.00', changed_by: 'Omar Al-Siddiq', created_at: dayAgoIso(6) },
    ],
    created_at: dayAgoIso(6),
    published_at: dayAgoIso(6),
  },
  {
    id: 2,
    store_id: 1,
    variant_id: 3,
    brand: 'Samsung',
    brand_slug: 'samsung',
    brand_name_ar: 'سامسونج',
    model: 'Galaxy S24 Ultra',
    storage_gb: 256,
    ram_gb: 12,
    color: 'Titanium Gray',
    condition: 'new',
    price: '2620000.00',
    previous_price: null,
    price_dropped: false,
    usd_price: 1080,
    accepts_trade_in: true,
    quantity: 4,
    grade: 'new',
    battery_health: 100,
    defects: '',
    replaced_parts: '',
    used_availability: '',
    used_unit_code: '',
    warranty_months: 12,
    warranty_days: null,
    warranty_type: 'ضمان الوكيل المعتمد',
    is_sealed: true,
    has_original_box: true,
    featured: true,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 118,
    contact_leads: 19,
    version: 1,
    specifications: models[2].specifications,
    media: [
      { id: 'm-2-1', url: IMG_GALAXY, thumbnail_url: IMG_GALAXY, kind: 'front' },
      { id: 'm-2-2', url: IMG_GALAXY, thumbnail_url: IMG_GALAXY, kind: 'seal' },
    ],
    price_history: [{ id: 3, price: '2620000.00', changed_by: 'Omar Al-Siddiq', created_at: dayAgoIso(5) }],
    created_at: dayAgoIso(5),
    published_at: dayAgoIso(5),
  },
  {
    id: 3,
    store_id: 1,
    variant_id: 2,
    brand: 'Apple',
    brand_slug: 'apple',
    brand_name_ar: 'آبل',
    model: 'iPhone 14 Pro',
    storage_gb: 128,
    ram_gb: 6,
    color: 'Deep Purple',
    condition: 'used',
    price: '1580000.00',
    previous_price: null,
    price_dropped: false,
    usd_price: 650,
    accepts_trade_in: true,
    quantity: 1,
    grade: 'excellent',
    battery_health: 91,
    defects: 'خدش طفيف جداً في الإطار الجانبي، الشاشة نظيفة 100%',
    replaced_parts: '',
    used_availability: 'available',
    used_unit_code: 'SD-101',
    warranty_months: null,
    warranty_days: 30,
    warranty_type: 'ضمان فحص المتجر',
    is_sealed: false,
    has_original_box: true,
    featured: false,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 87,
    contact_leads: 14,
    version: 1,
    specifications: models[1].specifications,
    media: [
      { id: 'm-3-1', url: IMG_USED, thumbnail_url: IMG_USED, kind: 'front' },
      { id: 'm-3-2', url: IMG_IPHONE, thumbnail_url: IMG_IPHONE, kind: 'back' },
      { id: 'm-3-3', url: IMG_USED, thumbnail_url: IMG_USED, kind: 'screen' },
    ],
    price_history: [{ id: 4, price: '1580000.00', changed_by: 'Omar Al-Siddiq', created_at: dayAgoIso(4) }],
    created_at: dayAgoIso(4),
    published_at: dayAgoIso(4),
  },
  {
    id: 4,
    store_id: 1,
    variant_id: 5,
    brand: 'Xiaomi',
    brand_slug: 'xiaomi',
    brand_name_ar: 'شاومي',
    model: 'Redmi Note 13 Pro',
    storage_gb: 256,
    ram_gb: 8,
    color: 'Midnight Black',
    condition: 'new',
    price: '790000.00',
    previous_price: '830000.00',
    price_dropped: true,
    usd_price: 325,
    accepts_trade_in: false,
    quantity: 12,
    grade: 'new',
    battery_health: 100,
    defects: '',
    replaced_parts: '',
    used_availability: '',
    used_unit_code: '',
    warranty_months: 12,
    warranty_days: null,
    warranty_type: 'ضمان الوكيل المعتمد',
    is_sealed: true,
    has_original_box: true,
    featured: false,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 96,
    contact_leads: 21,
    version: 1,
    specifications: models[4].specifications,
    media: [{ id: 'm-4-1', url: IMG_XIAOMI, thumbnail_url: IMG_XIAOMI, kind: 'front' }],
    price_history: [{ id: 5, price: '790000.00', changed_by: 'Omar Al-Siddiq', created_at: dayAgoIso(3) }],
    created_at: dayAgoIso(3),
    published_at: dayAgoIso(3),
  },
  {
    id: 5,
    store_id: 2,
    variant_id: 1,
    brand: 'Apple',
    brand_slug: 'apple',
    brand_name_ar: 'آبل',
    model: 'iPhone 15 Pro Max',
    storage_gb: 256,
    ram_gb: 8,
    color: 'Natural Titanium',
    condition: 'new',
    price: '2790000.00',
    previous_price: null,
    price_dropped: false,
    usd_price: 1150,
    accepts_trade_in: true,
    quantity: 3,
    grade: 'new',
    battery_health: 100,
    defects: '',
    replaced_parts: '',
    used_availability: '',
    used_unit_code: '',
    warranty_months: 12,
    warranty_days: null,
    warranty_type: 'ضمان الوكيل المعتمد',
    is_sealed: true,
    has_original_box: true,
    featured: true,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 109,
    contact_leads: 17,
    version: 1,
    specifications: models[0].specifications,
    media: [{ id: 'm-5-1', url: IMG_IPHONE, thumbnail_url: IMG_IPHONE, kind: 'front' }],
    price_history: [{ id: 6, price: '2790000.00', changed_by: 'Yassin Osman', created_at: dayAgoIso(2) }],
    created_at: dayAgoIso(2),
    published_at: dayAgoIso(2),
  },
  {
    id: 6,
    store_id: 2,
    variant_id: 4,
    brand: 'Samsung',
    brand_slug: 'samsung',
    brand_name_ar: 'سامسونج',
    model: 'Galaxy A55 5G',
    storage_gb: 256,
    ram_gb: 8,
    color: 'Awesome Navy',
    condition: 'new',
    price: '960000.00',
    previous_price: null,
    price_dropped: false,
    usd_price: 395,
    accepts_trade_in: false,
    quantity: 8,
    grade: 'new',
    battery_health: 100,
    defects: '',
    replaced_parts: '',
    used_availability: '',
    used_unit_code: '',
    warranty_months: 12,
    warranty_days: null,
    warranty_type: 'ضمان الوكيل المعتمد',
    is_sealed: true,
    has_original_box: true,
    featured: false,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 74,
    contact_leads: 11,
    version: 1,
    specifications: models[3].specifications,
    media: [{ id: 'm-6-1', url: IMG_GALAXY, thumbnail_url: IMG_GALAXY, kind: 'front' }],
    price_history: [{ id: 7, price: '960000.00', changed_by: 'Yassin Osman', created_at: dayAgoIso(2) }],
    created_at: dayAgoIso(2),
    published_at: dayAgoIso(2),
  },
  {
    id: 7,
    store_id: 2,
    variant_id: 3,
    brand: 'Samsung',
    brand_slug: 'samsung',
    brand_name_ar: 'سامسونج',
    model: 'Galaxy S24 Ultra',
    storage_gb: 256,
    ram_gb: 12,
    color: 'Titanium Gray',
    condition: 'used',
    price: '2150000.00',
    previous_price: '2250000.00',
    price_dropped: true,
    usd_price: 890,
    accepts_trade_in: true,
    quantity: 1,
    grade: 'like_new',
    battery_health: 96,
    defects: 'بحالة الوكالة مع القلم والكرتونة الأصلية',
    replaced_parts: '',
    used_availability: 'available',
    used_unit_code: 'SD-201',
    warranty_months: null,
    warranty_days: 45,
    warranty_type: 'ضمان فحص المتجر',
    is_sealed: false,
    has_original_box: true,
    featured: false,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 83,
    contact_leads: 16,
    version: 1,
    specifications: models[2].specifications,
    media: [
      { id: 'm-7-1', url: IMG_USED, thumbnail_url: IMG_USED, kind: 'front' },
      { id: 'm-7-2', url: IMG_GALAXY, thumbnail_url: IMG_GALAXY, kind: 'back' },
    ],
    price_history: [{ id: 8, price: '2150000.00', changed_by: 'Yassin Osman', created_at: dayAgoIso(1) }],
    created_at: dayAgoIso(1),
    published_at: dayAgoIso(1),
  },
  {
    id: 8,
    store_id: 3,
    variant_id: 6,
    brand: 'Tecno',
    brand_slug: 'tecno',
    brand_name_ar: 'تكنو',
    model: 'Camon 30 Pro 5G',
    storage_gb: 256,
    ram_gb: 12,
    color: 'Iceland Basaltic Dark',
    condition: 'new',
    price: '740000.00',
    previous_price: null,
    price_dropped: false,
    usd_price: 305,
    accepts_trade_in: false,
    quantity: 10,
    grade: 'new',
    battery_health: 100,
    defects: '',
    replaced_parts: '',
    used_availability: '',
    used_unit_code: '',
    warranty_months: 12,
    warranty_days: null,
    warranty_type: 'ضمان الوكيل المعتمد',
    is_sealed: true,
    has_original_box: true,
    featured: true,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 64,
    contact_leads: 9,
    version: 1,
    specifications: models[5].specifications,
    media: [{ id: 'm-8-1', url: IMG_XIAOMI, thumbnail_url: IMG_XIAOMI, kind: 'front' }],
    price_history: [{ id: 9, price: '740000.00', changed_by: 'Khalid Ibrahim', created_at: dayAgoIso(1) }],
    created_at: dayAgoIso(1),
    published_at: dayAgoIso(1),
  },
  {
    id: 9,
    store_id: 3,
    variant_id: 5,
    brand: 'Xiaomi',
    brand_slug: 'xiaomi',
    brand_name_ar: 'شاومي',
    model: 'Redmi Note 13 Pro',
    storage_gb: 256,
    ram_gb: 8,
    color: 'Midnight Black',
    condition: 'new',
    price: '775000.00',
    previous_price: null,
    price_dropped: false,
    usd_price: 320,
    accepts_trade_in: false,
    quantity: 7,
    grade: 'new',
    battery_health: 100,
    defects: '',
    replaced_parts: '',
    used_availability: '',
    used_unit_code: '',
    warranty_months: 12,
    warranty_days: null,
    warranty_type: 'ضمان الوكيل المعتمد',
    is_sealed: true,
    has_original_box: true,
    featured: false,
    status: 'published',
    moderation: 'approved',
    feedback: '',
    views: 52,
    contact_leads: 7,
    version: 1,
    specifications: models[4].specifications,
    media: [{ id: 'm-9-1', url: IMG_XIAOMI, thumbnail_url: IMG_XIAOMI, kind: 'front' }],
    price_history: [{ id: 10, price: '775000.00', changed_by: 'Khalid Ibrahim', created_at: dayAgoIso(1) }],
    created_at: dayAgoIso(1),
    published_at: dayAgoIso(1),
  },
];

const storeRatings: Array<{ id: number; store_id: number; stars: number; author_name: string; comment: string; created_at: string }> = [
  {
    id: 1,
    store_id: 1,
    stars: 5,
    author_name: 'Ahmed Al-Tayeb',
    comment: 'متجر ممتاز وتعامل راقٍ وأسعار مطابقة للإعلان.',
    created_at: dayAgoIso(3),
  },
  {
    id: 2,
    store_id: 2,
    stars: 5,
    author_name: 'Mona Hassan',
    comment: 'توصيل سريع وفحص شامل قبل الشراء في بورتسودان.',
    created_at: dayAgoIso(2),
  },
];

const modelRatings: Array<{ id: number; model_id: number; stars: number; author_name: string; comment: string; created_at: string }> = [
  {
    id: 1,
    model_id: 1,
    stars: 5,
    author_name: 'Ahmed Al-Tayeb',
    comment: 'أداء ممتاز وكاميرا احترافية وبطارية تصمد طوال اليوم.',
    created_at: dayAgoIso(2),
  },
];

const reports: Array<{
  id: number;
  target_type: 'listing' | 'store';
  listing_id?: number;
  store_id?: number;
  reason: string;
  details: string;
  reporter_contact: string;
  status: 'open' | 'reviewed' | 'dismissed';
  created_at: string;
}> = [
  {
    id: 1,
    target_type: 'listing',
    listing_id: 1,
    store_id: 1,
    reason: 'misleading_price',
    details: 'بلاغ تجريبي لمراجعة لوحة الإشراف في بوابة الإدارة.',
    reporter_contact: '+249911111111',
    status: 'open',
    created_at: dayAgoIso(1),
  },
];

const verifications: Array<{
  id: number;
  store_id: number;
  request_type: string;
  status: string;
  version: number;
  submitted_at: string;
  profile: Record<string, unknown>;
  documents: Array<{ id: string; kind: string; url: string; content_type: string }>;
}> = [
  {
    id: 1,
    store_id: 4,
    request_type: 'initial',
    status: 'pending_verification',
    version: 1,
    submitted_at: dayAgoIso(2),
    profile: {
      name: stores[3].name,
      city: stores[3].city,
      address: stores[3].address,
      phone: stores[3].phone,
      whatsapp: stores[3].whatsapp,
    },
    documents: [
      { id: 'doc-1', kind: 'id_front', url: IMG_STORE, content_type: 'image/jpeg' },
    ],
  },
];

const staffByStore = new Map<number, Array<{ id: number; name: string; phone: string; role: string; created_at: string }>>([
  [1, [{ id: 1, name: 'Omar Al-Siddiq', phone: '+249912345678', role: 'owner', created_at: dayAgoIso(45) }]],
  [2, [{ id: 2, name: 'Yassin Osman', phone: '+249912345679', role: 'owner', created_at: dayAgoIso(32) }]],
  [3, [{ id: 3, name: 'Khalid Ibrahim', phone: '+249912345681', role: 'owner', created_at: dayAgoIso(20) }]],
  [4, [{ id: 4, name: 'Mustafa Hassan', phone: '+249912345680', role: 'owner', created_at: dayAgoIso(2) }]],
]);

const adminRoles: Array<{ id: number; name: string; description: string; permissions: string[]; version: number; user_ids: number[] }> = [
  {
    id: 1,
    name: 'Trust & Safety Reviewer',
    description: 'Reviews store verifications and customer reports',
    permissions: ['review_stores', 'view_private_evidence', 'moderate_listings'],
    version: 1,
    user_ids: [],
  },
];

const dualApprovals: Array<{
  id: number;
  operation: string;
  target_id: number;
  reason: string;
  requested_by_id: number;
  requested_by_name: string;
  status: string;
  version: number;
  created_at: string;
  decided_by_id?: number;
  decided_by_name?: string;
  decided_at?: string;
}> = [];

const auditEvents: Array<{
  id: number;
  actor_id: number;
  actor_name: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
  actor_ip: string;
  created_at: string;
}> = [
  {
    id: 1,
    actor_id: 1,
    actor_name: 'Tariq Al-Fatih (Founder)',
    action: 'verification.approved',
    resource: 'store:1',
    metadata: { store_name: stores[0].name },
    actor_ip: '127.0.0.1',
    created_at: dayAgoIso(40),
  },
];

interface StoreChatMessageRecord {
  id: string;
  store_id: number;
  sender_role: 'customer' | 'store';
  sender_name?: string;
  sender_phone?: string;
  text: string;
  listing_id?: number | null;
  listing_title?: string;
  listing_price_sdg?: number;
  is_auto_reply?: boolean;
  created_at: string;
}

const sessions = new Map<string, number>(); // token -> userId
const favoritesByUser = new Map<number, Set<number>>([[2, new Set([1, 2])]]);
const uploadedMedia = new Map<string, { id: string; kind: string; url: string }>();
const storeMessagesByThread = new Map<string, StoreChatMessageRecord[]>();

interface SponsoredAdDailyStatRecord {
  date: string;
  impressions: number;
  clicks: number;
}

interface SponsoredAdRecord {
  id: number;
  store_id: number;
  store_name: string;
  listing_id: number | null;
  title_ar: string;
  title_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  cta_label_ar: string;
  cta_label_en: string;
  badge_ar: string;
  badge_en: string;
  image_url: string;
  target_city: string;
  status: 'active' | 'paused' | 'scheduled' | 'ended';
  priority: number;
  skip_delay_sec: number;
  paid_amount_sdg: number;
  payment_status: 'paid' | 'pending' | 'invoiced';
  payment_ref: string;
  starts_at: string;
  ends_at: string;
  impressions: number;
  clicks: number;
  last_clicked_at: string | null;
  total_time_to_click_ms: number;
  timed_clicks: number;
  daily_stats: SponsoredAdDailyStatRecord[];
  created_at: string;
}

interface AdAnalyticsEventRecord {
  id: string;
  ad_id: number;
  store_id: number;
  type: 'impression' | 'click';
  city: string;
  locale: string;
  listing_id: number | null;
  time_to_click_ms: number | null;
  source: string;
  created_at: string;
}

const dateOffsetStr = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const adAnalyticsEvents: AdAnalyticsEventRecord[] = [];

let nextSponsoredAdId = 4;
const sponsoredAds: SponsoredAdRecord[] = [
  {
    id: 1,
    store_id: 1,
    store_name: stores[0].name,
    listing_id: 1,
    title_ar: 'عروض آيفون 15 برو ماكس — بضمان الوكيل في الخرطوم',
    title_en: 'iPhone 15 Pro Max Deals — Official Warranty in Khartoum',
    subtitle_ar: 'تخفيض فوري 100,000 ج.س مع إمكانية الاستبدال والفحص المباشر داخل المعرض.',
    subtitle_en: 'Save 100,000 SDG today with trade-in options and direct in-store inspection.',
    cta_label_ar: 'شاهد العرض الآن',
    cta_label_en: 'View Featured Deal',
    badge_ar: 'عرض حصري للمتجر',
    badge_en: 'Exclusive Store Offer',
    image_url: '/src/assets/images/nile_iphone_ad_1795533298478.jpg',
    target_city: 'all',
    status: 'active',
    priority: 100,
    skip_delay_sec: 3,
    paid_amount_sdg: 450000,
    payment_status: 'paid',
    payment_ref: 'BNK-2026-4418',
    starts_at: dateOffsetStr(-5),
    ends_at: dateOffsetStr(25),
    impressions: 1284,
    clicks: 196,
    last_clicked_at: dayAgoIso(0),
    total_time_to_click_ms: 196 * 2450,
    timed_clicks: 196,
    daily_stats: [
      { date: dateOffsetStr(-5), impressions: 180, clicks: 25 },
      { date: dateOffsetStr(-4), impressions: 210, clicks: 31 },
      { date: dateOffsetStr(-3), impressions: 224, clicks: 34 },
      { date: dateOffsetStr(-2), impressions: 238, clicks: 38 },
      { date: dateOffsetStr(-1), impressions: 245, clicks: 39 },
      { date: dateOffsetStr(0), impressions: 187, clicks: 29 },
    ],
    created_at: dayAgoIso(5),
  },
  {
    id: 2,
    store_id: 2,
    store_name: stores[1].name,
    listing_id: 4,
    title_ar: 'هواتف البحر الأحمر — وصلت دفعة Galaxy S24 Ultra الجديدة',
    title_en: 'Red Sea Phones — New Galaxy S24 Ultra Shipment Arrived',
    subtitle_ar: 'أجهزة جديدة ومستعملة مفحوصة بنسبة بطارية موثّقة في بورتسودان.',
    subtitle_en: 'Factory-sealed & inspected used units with verified battery health in Port Sudan.',
    cta_label_ar: 'تصفّح المتجر',
    cta_label_en: 'Visit Store',
    badge_ar: 'وصل حديثاً',
    badge_en: 'Just Arrived',
    image_url: '/src/assets/images/galaxy_store_ad_1795533259928.jpg',
    target_city: 'port_sudan',
    status: 'active',
    priority: 85,
    skip_delay_sec: 3,
    paid_amount_sdg: 300000,
    payment_status: 'paid',
    payment_ref: 'BNK-2026-4502',
    starts_at: dateOffsetStr(-2),
    ends_at: dateOffsetStr(18),
    impressions: 642,
    clicks: 89,
    last_clicked_at: dayAgoIso(0),
    total_time_to_click_ms: 89 * 2780,
    timed_clicks: 89,
    daily_stats: [
      { date: dateOffsetStr(-2), impressions: 212, clicks: 28 },
      { date: dateOffsetStr(-1), impressions: 240, clicks: 35 },
      { date: dateOffsetStr(0), impressions: 190, clicks: 26 },
    ],
    created_at: dayAgoIso(2),
  },
  {
    id: 3,
    store_id: 3,
    store_name: stores[2].name,
    listing_id: 8,
    title_ar: 'مهرجان الفئة الاقتصادية — شاومي وتكنو بأسعار الجملة',
    title_en: 'Value Phones Festival — Xiaomi & Tecno Special Pricing',
    subtitle_ar: 'ضمان رسمي 12 شهراً وتوصيل داخل أم درمان والخرطوم.',
    subtitle_en: '12-month official warranty with same-day delivery across Omdurman.',
    cta_label_ar: 'استكشف العروض',
    cta_label_en: 'Explore Offers',
    badge_ar: 'حملة مجدولة',
    badge_en: 'Scheduled Campaign',
    image_url: IMG_XIAOMI,
    target_city: 'omdurman',
    status: 'paused',
    priority: 60,
    skip_delay_sec: 3,
    paid_amount_sdg: 220000,
    payment_status: 'pending',
    payment_ref: 'INV-2026-0912',
    starts_at: dateOffsetStr(1),
    ends_at: dateOffsetStr(15),
    impressions: 0,
    clicks: 0,
    last_clicked_at: null,
    total_time_to_click_ms: 0,
    timed_clicks: 0,
    daily_stats: [],
    created_at: dayAgoIso(1),
  },
];

function serializeSponsoredAd(ad: SponsoredAdRecord) {
  const ctr_pct = ad.impressions > 0 ? Number(((ad.clicks / ad.impressions) * 100).toFixed(2)) : 0;
  const avg_time_to_click_ms =
    ad.timed_clicks > 0 ? Math.round(ad.total_time_to_click_ms / ad.timed_clicks) : null;
  return {
    id: ad.id,
    store_id: ad.store_id,
    store_name: ad.store_name,
    listing_id: ad.listing_id,
    title_ar: ad.title_ar,
    title_en: ad.title_en,
    subtitle_ar: ad.subtitle_ar,
    subtitle_en: ad.subtitle_en,
    cta_label_ar: ad.cta_label_ar,
    cta_label_en: ad.cta_label_en,
    badge_ar: ad.badge_ar,
    badge_en: ad.badge_en,
    image_url: ad.image_url,
    target_city: ad.target_city,
    status: ad.status,
    priority: ad.priority,
    skip_delay_sec: ad.skip_delay_sec,
    paid_amount_sdg: ad.paid_amount_sdg,
    payment_status: ad.payment_status,
    payment_ref: ad.payment_ref,
    starts_at: ad.starts_at,
    ends_at: ad.ends_at,
    impressions: ad.impressions,
    clicks: ad.clicks,
    ctr_pct,
    last_clicked_at: ad.last_clicked_at,
    avg_time_to_click_ms,
    daily_stats: ad.daily_stats.slice(-7),
    created_at: ad.created_at,
  };
}

function bumpDailyAdStat(ad: SponsoredAdRecord, field: 'impressions' | 'clicks') {
  const today = dateOffsetStr(0);
  let bucket = ad.daily_stats.find((d) => d.date === today);
  if (!bucket) {
    bucket = { date: today, impressions: 0, clicks: 0 };
    ad.daily_stats.push(bucket);
    if (ad.daily_stats.length > 14) {
      ad.daily_stats.splice(0, ad.daily_stats.length - 14);
    }
  }
  bucket[field] += 1;
}

function isAdActiveNow(ad: SponsoredAdRecord): boolean {
  if (ad.status !== 'active') return false;
  const today = new Date().toISOString().slice(0, 10);
  if (ad.starts_at && today < ad.starts_at) return false;
  if (ad.ends_at && today > ad.ends_at) return false;
  return true;
}

function getSessionUser(req: Request): UserRecord | null {
  const token = String(req.header('X-Session-Token') || req.header('x-session-token') || '').trim();
  if (!token) return null;
  const uid = sessions.get(token);
  if (!uid) return null;
  return users.find((u) => u.id === uid) || null;
}

function buildSessionPayload(user: UserRecord | null) {
  if (!user) {
    return {
      authenticated: false,
      role: 'guest' as const,
      permissions: [] as string[],
      user_id: null,
      merchant: false,
      phone_verified: false,
      email_verified: false,
    };
  }
  return {
    authenticated: true,
    role: user.role,
    permissions: user.role === 'admin'
      ? ['review_stores', 'view_private_evidence', 'moderate_listings', 'suspend_stores', 'manage_roles', 'view_audit_logs', 'approve_sensitive']
      : [],
    user_id: user.id,
    merchant: user.merchant,
    phone_verified: user.phone_verified,
    email_verified: user.email_verified,
  };
}

function buildMePayload(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    phone_verified: user.phone_verified,
    email_verified: user.email_verified,
    preferred_city: user.preferred_city,
    preferred_locale: user.preferred_locale,
    role: user.role,
    merchant: user.merchant,
  };
}

function createApiRouter() {
  const router = express.Router();

  // Always attach CSRF header so client mutations succeed
  router.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-CSRFToken', 'sp-local-csrf-token');
    next();
  });

  // Auth & Session
  router.get('/auth/session', (req, res) => {
    const user = getSessionUser(req);
    res.json({ data: buildSessionPayload(user) });
  });

  router.delete('/auth/session', (req, res) => {
    const token = String(req.header('X-Session-Token') || '').trim();
    if (token) sessions.delete(token);
    res.json({ data: buildSessionPayload(null) });
  });

  router.post('/auth/login', (req, res) => {
    const { email, phone, password } = req.body || {};
    const identifier = String(email || phone || '').trim().toLowerCase();
    const matched = users.find(
      (u) =>
        (u.email.toLowerCase() === identifier || u.phone === String(phone || '').trim()) &&
        u.password === String(password || '')
    );
    if (!matched) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email/phone or password' } });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, matched.id);
    res.setHeader('X-Session-Token', token);
    res.json({ data: buildSessionPayload(matched) });
  });

  router.post('/auth/register', (req, res) => {
    const { phone, password, name, email } = req.body || {};
    const newUser: UserRecord = {
      id: users.length + 1,
      name: String(name || 'Customer'),
      phone: String(phone || `+24991${Date.now().toString().slice(-7)}`),
      email: String(email || `user${users.length + 1}@sudanphones.sd`),
      password: String(password || 'User@2026'),
      role: 'buyer',
      merchant: false,
      is_superuser: false,
      role_id: null,
      phone_verified: true,
      email_verified: Boolean(email),
      preferred_city: 'khartoum',
      preferred_locale: 'ar',
    };
    users.push(newUser);
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, newUser.id);
    res.setHeader('X-Session-Token', token);
    res.status(201).json({ data: buildSessionPayload(newUser) });
  });

  router.post('/merchant/auth/register', (req, res) => {
    const { phone, password, name, email } = req.body || {};
    const newStoreId = stores.length + 1;
    const newUserId = users.length + 1;
    const newUser: UserRecord = {
      id: newUserId,
      name: String(name || 'Merchant'),
      phone: String(phone || `+24991${Date.now().toString().slice(-7)}`),
      email: String(email || `merchant${newUserId}@sudanphones.sd`),
      password: String(password || 'Merchant@2026'),
      role: 'merchant',
      merchant: true,
      is_superuser: false,
      role_id: null,
      phone_verified: true,
      email_verified: Boolean(email),
      preferred_city: 'khartoum',
      preferred_locale: 'ar',
      store_id: newStoreId,
    };
    users.push(newUser);
    stores.push({
      id: newStoreId,
      owner_id: newUserId,
      owner_name: newUser.name,
      name: `${newUser.name} Store`,
      city: 'khartoum',
      address: '',
      location_guidance: '',
      description: '',
      phone: newUser.phone,
      whatsapp: newUser.phone,
      opening_hours: 'السبت - الخميس: 9:00 ص - 9:00 م',
      contact_available: true,
      accepts_trade_in: false,
      latitude: null,
      longitude: null,
      banner_url: IMG_STORE,
      status: 'draft',
      verified: false,
      created_at: nowIso(),
    });
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, newUser.id);
    res.setHeader('X-Session-Token', token);
    res.status(201).json({ data: buildSessionPayload(newUser) });
  });

  router.post('/auth/google', (_req, res) => {
    const buyer = users[1];
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, buyer.id);
    res.setHeader('X-Session-Token', token);
    res.json({ data: buildSessionPayload(buyer) });
  });

  router.post('/merchant/auth/verify', (_req, res) => {
    res.json({ data: { verified: true } });
  });

  router.post('/auth/recover', (_req, res) => {
    res.json({ data: { ok: true } });
  });

  router.get('/me', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    res.json({ data: buildMePayload(user) });
  });

  router.patch('/me', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    if (req.body?.name) user.name = String(req.body.name);
    if (req.body?.preferred_city) user.preferred_city = String(req.body.preferred_city);
    if (req.body?.preferred_locale) user.preferred_locale = req.body.preferred_locale === 'en' ? 'en' : 'ar';
    res.json({ data: buildMePayload(user) });
  });

  router.get('/me/favorites', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      res.json({ data: [] });
      return;
    }
    const favs = favoritesByUser.get(user.id) || new Set<number>();
    res.json({ data: listings.filter((l) => favs.has(l.id)) });
  });

  router.post('/me/favorites/:id', (req, res) => {
    const user = getSessionUser(req);
    if (user) {
      const set = favoritesByUser.get(user.id) || new Set<number>();
      set.add(Number(req.params.id));
      favoritesByUser.set(user.id, set);
    }
    res.json({ data: { ok: true } });
  });

  router.delete('/me/favorites/:id', (req, res) => {
    const user = getSessionUser(req);
    if (user) {
      const set = favoritesByUser.get(user.id);
      set?.delete(Number(req.params.id));
    }
    res.json({ data: { ok: true } });
  });

  // Public Discovery & Catalog
  router.get('/config', (_req, res) => {
    res.json({
      data: {
        cities: ['khartoum', 'omdurman', 'port_sudan', 'al_jazirah', 'kassala', 'atbara'],
        default_locale: 'ar',
      },
    });
  });

  router.get('/home', (req, res) => {
    const city = String(req.query.city || '').trim();
    const visibleStores = stores.filter((s) => s.verified && (!city || s.city === city));
    const storeIds = new Set(visibleStores.map((s) => s.id));
    const visibleListings = listings.filter((l) => l.status === 'published' && storeIds.has(l.store_id));
    res.json({
      data: {
        featured_listings: visibleListings.filter((l) => l.featured),
        recent_listings: visibleListings,
        featured_stores: visibleStores,
        brands,
      },
    });
  });

  router.get('/brands', (_req, res) => {
    res.json({ data: brands });
  });

  router.get('/models', (req, res) => {
    const brandParam = String(req.query.brand || '').toLowerCase().trim();
    const brandIdParam = req.query.brand_id ? Number(req.query.brand_id) : null;
    const q = String(req.query.q || '').toLowerCase().trim();
    let result = models;
    if (brandParam) result = result.filter((m) => m.brand_slug === brandParam || m.brand.toLowerCase() === brandParam);
    if (brandIdParam) result = result.filter((m) => m.brand_id === brandIdParam);
    if (q) result = result.filter((m) => m.name.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q));
    res.json({ data: result });
  });

  router.get('/listings', (req, res) => {
    const q = String(req.query.q || '').toLowerCase().trim();
    const city = String(req.query.city || '').trim();
    const brand = String(req.query.brand || '').toLowerCase().trim();
    const condition = String(req.query.condition || '').trim();
    const verifiedStoreIds = new Set(stores.filter((s) => s.verified && (!city || s.city === city)).map((s) => s.id));
    let result = listings.filter((l) => l.status === 'published' && l.moderation !== 'removed' && verifiedStoreIds.has(l.store_id));
    if (brand) result = result.filter((l) => l.brand_slug === brand || l.brand.toLowerCase() === brand);
    if (condition) result = result.filter((l) => l.condition === condition);
    if (q) {
      result = result.filter(
        (l) =>
          l.model.toLowerCase().includes(q) ||
          l.brand.toLowerCase().includes(q) ||
          l.brand_name_ar.includes(q)
      );
    }
    res.json({ data: result });
  });

  router.get('/listings/:id', (req, res) => {
    const item = listings.find((l) => l.id === Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listing not found' } });
      return;
    }
    item.views += 1;
    res.json({ data: item });
  });

  router.get('/listings/:id/contact-methods', (req, res) => {
    const item = listings.find((l) => l.id === Number(req.params.id));
    const store = item ? stores.find((s) => s.id === item.store_id) : null;
    if (!store) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listing not found' } });
      return;
    }
    const cleanWa = store.whatsapp.replace(/\D/g, '');
    res.json({
      data: {
        phone_url: `tel:${store.phone}`,
        whatsapp_url: `https://wa.me/${cleanWa}`,
      },
    });
  });

  router.post('/listings/:id/contact-events', (req, res) => {
    const item = listings.find((l) => l.id === Number(req.params.id));
    if (item) item.contact_leads += 1;
    res.status(201).json({ data: { recorded: true } });
  });

  router.get('/stores/featured', (_req, res) => {
    res.json({ data: stores.filter((s) => s.verified) });
  });

  // Merchant Portal (must come BEFORE /stores/:id)
  router.get('/stores/me', (req, res) => {
    const user = getSessionUser(req);
    const store = stores.find((s) => s.id === (user?.store_id || 1)) || stores[0];
    res.json({ data: store });
  });

  router.put('/stores/me/profile', (req, res) => {
    const user = getSessionUser(req);
    const store = stores.find((s) => s.id === (user?.store_id || 1)) || stores[0];
    Object.assign(store, req.body || {});
    res.json({ data: store });
  });

  router.put('/stores/me', (req, res) => {
    const user = getSessionUser(req);
    const store = stores.find((s) => s.id === (user?.store_id || 1)) || stores[0];
    Object.assign(store, req.body || {});
    res.json({ data: store });
  });

  router.get('/stores/me/verification', (req, res) => {
    const user = getSessionUser(req);
    const storeId = user?.store_id || 1;
    const v = verifications.find((item) => item.store_id === storeId) || null;
    res.json({ data: v });
  });

  router.post('/stores/me/verification/documents', (req, res) => {
    const id = crypto.randomUUID();
    uploadedMedia.set(id, { id, kind: String(req.body?.kind || 'id_front'), url: IMG_STORE });
    res.status(201).json({ data: { id, url: `/api/v1/media/mock-upload/${id}`, headers: {} } });
  });

  router.post('/stores/me/verification/submit', (req, res) => {
    const user = getSessionUser(req);
    const store = stores.find((s) => s.id === (user?.store_id || 1)) || stores[0];
    store.status = 'pending_verification';
    store.verified = false;
    const v = {
      id: verifications.length + 1,
      store_id: store.id,
      request_type: 'initial',
      status: 'pending_verification',
      version: 1,
      submitted_at: nowIso(),
      profile: { name: store.name, city: store.city, address: store.address, phone: store.phone, whatsapp: store.whatsapp },
      documents: [],
    };
    verifications.push(v);
    res.status(201).json({ data: v });
  });

  router.post('/stores/me/reverification', (req, res) => {
    const user = getSessionUser(req);
    const store = stores.find((s) => s.id === (user?.store_id || 1)) || stores[0];
    store.status = 'pending_verification';
    res.status(201).json({ data: { id: verifications.length + 1, store_id: store.id, status: 'pending_verification' } });
  });

  router.get('/stores/me/dashboard', (req, res) => {
    const user = getSessionUser(req);
    const storeId = user?.store_id || 1;
    const myListings = listings.filter((l) => l.store_id === storeId);
    const views = myListings.reduce((a, b) => a + b.views, 0);
    const contact_leads = myListings.reduce((a, b) => a + b.contact_leads, 0);
    res.json({
      data: {
        views,
        contact_leads,
        daily_views: [
          { day: '2026-11-17', count: Math.round(views * 0.12) },
          { day: '2026-11-18', count: Math.round(views * 0.15) },
          { day: '2026-11-19', count: Math.round(views * 0.13) },
          { day: '2026-11-20', count: Math.round(views * 0.18) },
          { day: '2026-11-21', count: Math.round(views * 0.14) },
          { day: '2026-11-22', count: Math.round(views * 0.16) },
          { day: '2026-11-23', count: Math.round(views * 0.12) },
        ],
      },
    });
  });

  router.get('/stores/me/listings', (req, res) => {
    const user = getSessionUser(req);
    const storeId = user?.store_id || 1;
    res.json({ data: listings.filter((l) => l.store_id === storeId && l.status !== 'removed') });
  });

  router.post('/stores/me/listings', (req, res) => {
    const user = getSessionUser(req);
    const storeId = user?.store_id || 1;
    const body = req.body || {};
    const variant = variants.find((v) => v.id === Number(body.variant_id)) || variants[0];
    const model = models.find((m) => m.id === variant.model_id) || models[0];
    const brand = brands.find((b) => b.id === model.brand_id) || brands[0];
    const created: ListingRecord = {
      id: nextListingId++,
      store_id: storeId,
      variant_id: variant.id,
      brand: brand.name,
      brand_slug: brand.slug,
      brand_name_ar: brand.name_ar,
      model: model.name,
      storage_gb: variant.storage_gb,
      ram_gb: variant.ram_gb,
      color: variant.color,
      condition: body.condition === 'used' ? 'used' : 'new',
      price: Number(body.price || 0).toFixed(2),
      previous_price: null,
      price_dropped: false,
      usd_price: body.usd_price ? Number(body.usd_price) : null,
      accepts_trade_in: Boolean(body.accepts_trade_in),
      quantity: Number(body.quantity ?? 1),
      grade: String(body.grade || 'new'),
      battery_health: body.battery_health != null ? Number(body.battery_health) : 100,
      defects: String(body.defects || ''),
      replaced_parts: String(body.replaced_parts || ''),
      used_availability: body.condition === 'used' ? 'available' : '',
      used_unit_code: body.condition === 'used' ? `SD-${storeId}${nextListingId}` : '',
      warranty_months: body.warranty_months ?? 12,
      warranty_days: body.warranty_days ?? null,
      warranty_type: String(body.warranty_type || 'ضمان المتجر'),
      is_sealed: Boolean(body.is_sealed),
      has_original_box: Boolean(body.has_original_box),
      featured: false,
      status: body.publish === false ? 'draft' : 'published',
      moderation: 'approved',
      feedback: '',
      views: 0,
      contact_leads: 0,
      version: 1,
      specifications: model.specifications,
      media: [{ id: `m-${nextListingId}`, url: IMG_IPHONE, thumbnail_url: IMG_IPHONE, kind: 'front' }],
      price_history: [{ id: Date.now(), price: Number(body.price || 0).toFixed(2), changed_by: user?.name || 'Merchant', created_at: nowIso() }],
      created_at: nowIso(),
      published_at: nowIso(),
    };
    listings.unshift(created);
    res.status(201).json({ data: created });
  });

  router.patch('/stores/me/listings/:id/price', (req, res) => {
    const item = listings.find((l) => l.id === Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listing not found' } });
      return;
    }
    const oldPrice = Number(item.price);
    const newPrice = Number(req.body?.price || oldPrice);
    item.previous_price = item.price;
    item.price = newPrice.toFixed(2);
    item.price_dropped = newPrice < oldPrice;
    item.version += 1;
    item.price_history.unshift({ id: Date.now(), price: item.price, changed_by: 'Merchant', created_at: nowIso() });
    res.json({ data: item });
  });

  router.patch('/stores/me/listings/:id/stock', (req, res) => {
    const item = listings.find((l) => l.id === Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listing not found' } });
      return;
    }
    if (req.body?.quantity != null) item.quantity = Number(req.body.quantity);
    if (req.body?.used_availability) item.used_availability = String(req.body.used_availability);
    item.version += 1;
    res.json({ data: item });
  });

  router.patch('/stores/me/listings/:id', (req, res) => {
    const item = listings.find((l) => l.id === Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listing not found' } });
      return;
    }
    Object.assign(item, req.body || {});
    item.version += 1;
    res.json({ data: item });
  });

  router.delete('/stores/me/listings/:id', (req, res) => {
    const item = listings.find((l) => l.id === Number(req.params.id));
    if (item) item.status = 'removed';
    res.json({ data: { deleted: true } });
  });

  router.post('/stores/me/listings/bulk-price', (req, res) => {
    const user = getSessionUser(req);
    const storeId = user?.store_id || 1;
    const { mode, percent, usd_rate, condition } = req.body || {};
    let updated = 0;
    for (const item of listings) {
      if (item.store_id !== storeId) continue;
      if (condition && condition !== 'all' && item.condition !== condition) continue;
      const prev = Number(item.price);
      let next = prev;
      if (mode === 'percent' && typeof percent === 'number') {
        next = Math.round(prev * (1 + percent / 100));
      } else if (mode === 'usd_rate' && typeof usd_rate === 'number' && item.usd_price) {
        next = Math.round(item.usd_price * usd_rate);
      }
      if (next !== prev) {
        item.previous_price = item.price;
        item.price = next.toFixed(2);
        item.price_dropped = next < prev;
        item.version += 1;
        updated += 1;
      }
    }
    res.json({ data: { updated_count: updated } });
  });

  router.post('/stores/me/listings/import', (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    let updated = 0;
    for (const row of rows) {
      const item = listings.find((l) => l.id === Number(row.listing_id));
      if (!item) continue;
      if (row.price != null) item.price = Number(row.price).toFixed(2);
      if (row.quantity != null) item.quantity = Number(row.quantity);
      if (row.usd_price !== undefined) item.usd_price = row.usd_price;
      if (row.accepts_trade_in !== undefined) item.accepts_trade_in = Boolean(row.accepts_trade_in);
      item.version += 1;
      updated += 1;
    }
    res.json({ data: { updated_count: updated, skipped_count: rows.length - updated, errors: [] } });
  });

  router.get('/stores/me/staff', (req, res) => {
    const user = getSessionUser(req);
    const storeId = user?.store_id || 1;
    res.json({ data: staffByStore.get(storeId) || [] });
  });

  router.post('/stores/me/staff', (req, res) => {
    const user = getSessionUser(req);
    const storeId = user?.store_id || 1;
    const list = staffByStore.get(storeId) || [];
    const member = {
      id: Date.now(),
      name: String(req.body?.phone || 'Staff Member'),
      phone: String(req.body?.phone || ''),
      role: String(req.body?.role || 'clerk'),
      created_at: nowIso(),
    };
    list.push(member);
    staffByStore.set(storeId, list);
    res.status(201).json({ data: member });
  });

  router.delete('/stores/me/staff/:id', (req, res) => {
    const user = getSessionUser(req);
    const storeId = user?.store_id || 1;
    const list = (staffByStore.get(storeId) || []).filter((m) => m.id !== Number(req.params.id));
    staffByStore.set(storeId, list);
    res.json({ data: { deleted: true } });
  });

  // Public Store detail & listings
  router.get('/stores/:id', (req, res) => {
    const store = stores.find((s) => s.id === Number(req.params.id));
    if (!store) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });
      return;
    }
    res.json({ data: store });
  });

  router.get('/stores/:id/listings', (req, res) => {
    const storeId = Number(req.params.id);
    res.json({ data: listings.filter((l) => l.store_id === storeId && l.status === 'published') });
  });

  // In-App Store Messaging
  const getThreadKey = (req: Request, storeId: number) => {
    const user = getSessionUser(req);
    const visitorId = String(req.header('X-Chat-Visitor-Id') || req.query.visitor_id || 'guest').trim();
    return `${storeId}:${user ? `u_${user.id}` : `v_${visitorId}`}`;
  };

  router.get('/stores/:id/messages', (req, res) => {
    const storeId = Number(req.params.id);
    const store = stores.find((s) => s.id === storeId);
    if (!store) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });
      return;
    }
    const key = getThreadKey(req, storeId);
    const thread = storeMessagesByThread.get(key) || [];
    res.json({ data: thread });
  });

  router.post('/stores/:id/messages', (req, res) => {
    const storeId = Number(req.params.id);
    const store = stores.find((s) => s.id === storeId);
    if (!store) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });
      return;
    }
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ error: { code: 'EMPTY_MESSAGE', message: 'Message text is required' } });
      return;
    }
    const user = getSessionUser(req);
    const key = getThreadKey(req, storeId);
    const thread = storeMessagesByThread.get(key) || [];
    const hadCustomerMsg = thread.some((m) => m.sender_role === 'customer');
    const listingId = req.body?.listing_id ? Number(req.body.listing_id) : null;
    if (listingId) {
      const targetListing = listings.find((l) => l.id === listingId);
      if (targetListing) targetListing.contact_leads += 1;
    }
    const customerMessage: StoreChatMessageRecord = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      store_id: storeId,
      sender_role: 'customer',
      sender_name: String(req.body?.sender_name || user?.name || '').trim() || undefined,
      sender_phone: String(req.body?.sender_phone || user?.phone || '').trim() || undefined,
      text,
      listing_id: listingId,
      listing_title: req.body?.listing_title ? String(req.body.listing_title) : undefined,
      listing_price_sdg: req.body?.listing_price_sdg != null ? Number(req.body.listing_price_sdg) : undefined,
      created_at: nowIso(),
    };
    thread.push(customerMessage);

    let autoReply: StoreChatMessageRecord | null = null;
    if (!hadCustomerMsg) {
      const langHeader = String(req.header('Accept-Language') || 'ar').toLowerCase();
      const isEn = langHeader.startsWith('en');
      autoReply = {
        id: `msg-${Date.now() + 1}-${Math.random().toString(36).slice(2, 7)}`,
        store_id: storeId,
        sender_role: 'store',
        sender_name: store.name,
        text: isEn
          ? `Thank you for messaging ${store.name}. We received your inquiry and our team will reply here shortly. Opening hours: ${store.opening_hours}.`
          : `شكراً لتواصلك مع ${store.name} عبر التطبيق. تم استلام رسالتك وسيرد عليك فريق المتجر في أقرب وقت. ساعات العمل: ${store.opening_hours}.`,
        is_auto_reply: true,
        created_at: new Date(Date.now() + 500).toISOString(),
      };
      thread.push(autoReply);
    }

    storeMessagesByThread.set(key, thread);
    res.status(201).json({ data: { message: customerMessage, reply: autoReply, messages: thread } });
  });

  // Ratings & Reports
  router.get('/stores/:id/ratings', (req, res) => {
    const storeId = Number(req.params.id);
    res.json({ data: storeRatings.filter((r) => r.store_id === storeId) });
  });

  router.post('/stores/:id/ratings', (req, res) => {
    const user = getSessionUser(req);
    const item = {
      id: storeRatings.length + 1,
      store_id: Number(req.params.id),
      stars: Number(req.body?.stars || 5),
      author_name: user?.name || 'Customer',
      comment: String(req.body?.comment || ''),
      created_at: nowIso(),
    };
    storeRatings.unshift(item);
    res.status(201).json({ data: item });
  });

  router.get('/models/:id/ratings', (req, res) => {
    const modelId = Number(req.params.id);
    res.json({ data: modelRatings.filter((r) => r.model_id === modelId) });
  });

  router.post('/models/:id/ratings', (req, res) => {
    const user = getSessionUser(req);
    const item = {
      id: modelRatings.length + 1,
      model_id: Number(req.params.id),
      stars: Number(req.body?.stars || 5),
      author_name: user?.name || 'Customer',
      comment: String(req.body?.comment || ''),
      created_at: nowIso(),
    };
    modelRatings.unshift(item);
    res.status(201).json({ data: item });
  });

  router.post('/reports', (req, res) => {
    const body = req.body || {};
    const rep = {
      id: reports.length + 1,
      target_type: body.target_type === 'store' ? ('store' as const) : ('listing' as const),
      listing_id: body.target_type === 'listing' ? Number(body.target_id) : undefined,
      store_id: body.target_type === 'store' ? Number(body.target_id) : undefined,
      reason: String(body.reason || 'other'),
      details: String(body.details || ''),
      reporter_contact: String(body.reporter_contact || ''),
      status: 'open' as const,
      created_at: nowIso(),
    };
    reports.unshift(rep);
    res.status(201).json({ data: rep });
  });

  // Catalog for Merchant Wizard
  router.get('/catalog/brands', (req, res) => {
    const q = String(req.query.q || '').toLowerCase().trim();
    res.json({ data: q ? brands.filter((b) => b.name.toLowerCase().includes(q) || b.name_ar.includes(q)) : brands });
  });

  router.get('/catalog/models', (req, res) => {
    const brandId = req.query.brand_id ? Number(req.query.brand_id) : null;
    const q = String(req.query.q || '').toLowerCase().trim();
    let result = models;
    if (brandId) result = result.filter((m) => m.brand_id === brandId);
    if (q) result = result.filter((m) => m.name.toLowerCase().includes(q));
    res.json({ data: result });
  });

  router.get('/catalog/variants', (req, res) => {
    const modelId = req.query.model_id ? Number(req.query.model_id) : null;
    res.json({ data: modelId ? variants.filter((v) => v.model_id === modelId) : variants });
  });

  // Media Uploads (in-memory stub)
  router.post('/media/uploads', (req, res) => {
    const id = crypto.randomUUID();
    uploadedMedia.set(id, { id, kind: String(req.body?.kind || 'front'), url: IMG_IPHONE });
    res.status(201).json({ data: { id, url: `/api/v1/media/mock-upload/${id}`, headers: {} } });
  });

  router.put('/media/mock-upload/:id', (_req, res) => {
    res.status(200).end();
  });

  router.post('/media/uploads/:id/complete', (req, res) => {
    res.json({ data: { id: req.params.id, status: 'ready' } });
  });

  // Public App-Open Sponsored Ads
  router.get('/ads/active', (req, res) => {
    const city = String(req.query.city || 'all').trim();
    const live = sponsoredAds
      .filter((ad) => {
        if (!isAdActiveNow(ad)) return false;
        if (city && city !== 'all') {
          return ad.target_city === 'all' || ad.target_city === city;
        }
        return true;
      })
      .sort((a, b) => {
        // Prefer city-matched campaigns over national campaigns when city is specified
        const aCityBoost = city !== 'all' && a.target_city === city ? 20 : 0;
        const bCityBoost = city !== 'all' && b.target_city === city ? 20 : 0;
        return (b.priority + bCityBoost) - (a.priority + aCityBoost) || b.id - a.id;
      });
    res.json({ data: live.map(serializeSponsoredAd) });
  });

  router.post('/ads/:id/impression', (req, res) => {
    const ad = sponsoredAds.find((a) => a.id === Number(req.params.id));
    if (!ad) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ad campaign not found' } });
      return;
    }
    const body = req.body || {};
    ad.impressions += 1;
    bumpDailyAdStat(ad, 'impressions');
    adAnalyticsEvents.unshift({
      id: crypto.randomUUID(),
      ad_id: ad.id,
      store_id: ad.store_id,
      type: 'impression',
      city: String(body.city || 'all').slice(0, 40),
      locale: String(body.locale || 'ar').slice(0, 10),
      listing_id: ad.listing_id,
      time_to_click_ms: null,
      source: String(body.source || 'app_open_overlay').slice(0, 40),
      created_at: nowIso(),
    });
    if (adAnalyticsEvents.length > 500) adAnalyticsEvents.length = 500;
    res.json({ data: serializeSponsoredAd(ad) });
  });

  router.post('/ads/:id/click', (req, res) => {
    const ad = sponsoredAds.find((a) => a.id === Number(req.params.id));
    if (!ad) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ad campaign not found' } });
      return;
    }
    const body = req.body || {};
    const timeToClick = Number(body.time_to_click_ms);
    ad.clicks += 1;
    ad.last_clicked_at = nowIso();
    bumpDailyAdStat(ad, 'clicks');
    if (Number.isFinite(timeToClick) && timeToClick > 0 && timeToClick < 120000) {
      ad.total_time_to_click_ms += Math.round(timeToClick);
      ad.timed_clicks += 1;
    }
    adAnalyticsEvents.unshift({
      id: crypto.randomUUID(),
      ad_id: ad.id,
      store_id: ad.store_id,
      type: 'click',
      city: String(body.city || 'all').slice(0, 40),
      locale: String(body.locale || 'ar').slice(0, 10),
      listing_id: body.listing_id ? Number(body.listing_id) : ad.listing_id,
      time_to_click_ms: Number.isFinite(timeToClick) && timeToClick > 0 ? Math.round(timeToClick) : null,
      source: String(body.source || 'app_open_overlay').slice(0, 40),
      created_at: nowIso(),
    });
    if (adAnalyticsEvents.length > 500) adAnalyticsEvents.length = 500;
    res.json({ data: serializeSponsoredAd(ad) });
  });

  // Merchant Store Owner Sponsored Ad Analytics (scoped strictly to authenticated owner's store)
  router.get('/stores/me/ads', (req, res) => {
    const user = getSessionUser(req);
    if (!user || (!user.merchant && user.role !== 'merchant')) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Merchant account required' } });
      return;
    }
    const myStore = stores.find((s) => s.owner_id === user.id || s.id === user.store_id);
    if (!myStore) {
      res.json({
        data: {
          campaigns: [],
          summary: {
            total_campaigns: 0,
            active_campaigns: 0,
            total_impressions: 0,
            total_clicks: 0,
            overall_ctr_pct: 0,
          },
        },
      });
      return;
    }
    const mine = sponsoredAds
      .filter((ad) => ad.store_id === myStore.id)
      .sort((a, b) => b.priority - a.priority || b.id - a.id);
    const totalImpressions = mine.reduce((sum, a) => sum + a.impressions, 0);
    const totalClicks = mine.reduce((sum, a) => sum + a.clicks, 0);
    res.json({
      data: {
        campaigns: mine.map(serializeSponsoredAd),
        summary: {
          total_campaigns: mine.length,
          active_campaigns: mine.filter((a) => isAdActiveNow(a)).length,
          total_impressions: totalImpressions,
          total_clicks: totalClicks,
          overall_ctr_pct:
            totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        },
      },
    });
  });

  // Admin Portal
  router.get('/admin/overview', (_req, res) => {
    res.json({
      data: {
        stores: stores.length,
        verified_stores: stores.filter((s) => s.verified).length,
        pending_verifications: verifications.filter((v) => v.status === 'pending_verification').length,
        published_listings: listings.filter((l) => l.status === 'published').length,
        flagged_listings: listings.filter((l) => l.moderation === 'flagged').length,
        open_reports: reports.filter((r) => r.status === 'open').length,
        pending_approvals: dualApprovals.filter((a) => a.status === 'pending').length,
        contact_leads_7d: listings.reduce((sum, l) => sum + l.contact_leads, 0),
        active_sponsored_ads: sponsoredAds.filter((a) => isAdActiveNow(a)).length,
        ad_revenue_sdg: sponsoredAds
          .filter((a) => a.payment_status === 'paid')
          .reduce((sum, a) => sum + a.paid_amount_sdg, 0),
      },
    });
  });

  router.get('/admin/verifications', (_req, res) => {
    res.json({ data: verifications });
  });

  router.get('/admin/verifications/:id/documents', (req, res) => {
    const v = verifications.find((item) => item.id === Number(req.params.id));
    res.json({ data: v?.documents || [] });
  });

  router.post('/admin/verifications/:id/decision', (req, res) => {
    const v = verifications.find((item) => item.id === Number(req.params.id));
    if (!v) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Verification not found' } });
      return;
    }
    const decision = String(req.body?.decision || 'approved');
    v.status = decision === 'approved' ? 'verified' : decision;
    v.version += 1;
    const store = stores.find((s) => s.id === v.store_id);
    if (store) {
      store.status = v.status;
      store.verified = decision === 'approved';
    }
    auditEvents.unshift({
      id: auditEvents.length + 1,
      actor_id: 1,
      actor_name: 'Tariq Al-Fatih (Founder)',
      action: `verification.${decision}`,
      resource: `store:${v.store_id}`,
      metadata: { reason: req.body?.reason || '' },
      actor_ip: '127.0.0.1',
      created_at: nowIso(),
    });
    res.json({ data: v });
  });

  router.get('/admin/moderation/queue', (_req, res) => {
    res.json({ data: listings });
  });

  router.post('/admin/listings/:id/moderate', (req, res) => {
    const item = listings.find((l) => l.id === Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listing not found' } });
      return;
    }
    const action = String(req.body?.action || 'clear');
    if (action === 'flag') item.moderation = 'flagged';
    else if (action === 'remove') item.status = 'removed';
    else item.moderation = 'approved';
    item.feedback = String(req.body?.reason || '');
    item.version += 1;
    res.json({ data: item });
  });

  router.get('/admin/reports', (req, res) => {
    const status = String(req.query.status || 'all');
    res.json({ data: status === 'all' ? reports : reports.filter((r) => r.status === status) });
  });

  router.post('/admin/reports/:id/resolve', (req, res) => {
    const rep = reports.find((r) => r.id === Number(req.params.id));
    if (rep) {
      rep.status = req.body?.status === 'dismissed' ? 'dismissed' : 'reviewed';
    }
    res.json({ data: rep || { ok: true } });
  });

  router.post('/admin/stores/:id/suspend', (req, res) => {
    const store = stores.find((s) => s.id === Number(req.params.id));
    if (store) {
      store.status = 'suspended';
      store.verified = false;
    }
    res.json({ data: store || { ok: true } });
  });

  router.get('/admin/roles', (_req, res) => {
    res.json({ data: adminRoles });
  });

  router.post('/admin/roles', (req, res) => {
    const body = req.body || {};
    const existing = adminRoles.find((r) => r.id === Number(body.id));
    if (existing) {
      existing.name = String(body.name || existing.name);
      existing.description = String(body.description || existing.description);
      existing.permissions = Array.isArray(body.permissions) ? body.permissions : existing.permissions;
      existing.version += 1;
      res.json({ data: existing });
      return;
    }
    const created = {
      id: adminRoles.length + 1,
      name: String(body.name || 'Custom Role'),
      description: String(body.description || ''),
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      version: 1,
      user_ids: [],
    };
    adminRoles.push(created);
    res.status(201).json({ data: created });
  });

  router.delete('/admin/roles/:id', (req, res) => {
    const idx = adminRoles.findIndex((r) => r.id === Number(req.params.id));
    if (idx !== -1) adminRoles.splice(idx, 1);
    res.json({ data: { deleted: true } });
  });

  router.get('/admin/users', (_req, res) => {
    res.json({
      data: users
        .filter((u) => u.role === 'admin')
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          is_superuser: u.is_superuser,
          role_id: u.role_id,
        })),
    });
  });

  router.get('/admin/dual-approvals', (req, res) => {
    const status = String(req.query.status || 'all');
    res.json({ data: status === 'all' ? dualApprovals : dualApprovals.filter((a) => a.status === status) });
  });

  router.post('/admin/dual-approvals/:id/decision', (req, res) => {
    const item = dualApprovals.find((a) => a.id === Number(req.params.id));
    if (item) {
      item.status = req.body?.decision === 'reject' ? 'rejected' : 'approved';
      item.decided_by_id = 1;
      item.decided_by_name = 'Tariq Al-Fatih (Founder)';
      item.decided_at = nowIso();
    }
    res.json({ data: item || { ok: true } });
  });

  router.get('/admin/audit-events', (_req, res) => {
    res.json({ data: auditEvents });
  });

  // Admin Sponsored Ads Management
  router.get('/admin/ads', (req, res) => {
    const actor = getSessionUser(req);
    if (!actor || actor.role !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin privileges required' } });
      return;
    }
    const sorted = [...sponsoredAds]
      .sort((a, b) => b.priority - a.priority || b.id - a.id)
      .map(serializeSponsoredAd);
    res.json({ data: sorted });
  });

  router.post('/admin/ads', (req, res) => {
    const actor = getSessionUser(req);
    if (!actor || actor.role !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin privileges required' } });
      return;
    }
    const body = req.body || {};
    const storeId = Number(body.store_id);
    const store = stores.find((s) => s.id === storeId);
    if (!store) {
      res.status(400).json({ error: { code: 'INVALID_STORE', message: 'Please select a valid sponsoring store' } });
      return;
    }
    const titleAr = String(body.title_ar || '').trim();
    const titleEn = String(body.title_en || titleAr).trim();
    if (!titleAr && !titleEn) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Ad headline is required' } });
      return;
    }
    const listingId = body.listing_id ? Number(body.listing_id) : null;
    const validStatus = ['active', 'paused', 'scheduled', 'ended'].includes(String(body.status))
      ? (String(body.status) as SponsoredAdRecord['status'])
      : 'active';
    const validPayment = ['paid', 'pending', 'invoiced'].includes(String(body.payment_status))
      ? (String(body.payment_status) as SponsoredAdRecord['payment_status'])
      : 'paid';

    const created: SponsoredAdRecord = {
      id: nextSponsoredAdId++,
      store_id: store.id,
      store_name: store.name,
      listing_id: listingId && !Number.isNaN(listingId) ? listingId : null,
      title_ar: titleAr || titleEn,
      title_en: titleEn || titleAr,
      subtitle_ar: String(body.subtitle_ar || '').trim(),
      subtitle_en: String(body.subtitle_en || body.subtitle_ar || '').trim(),
      cta_label_ar: String(body.cta_label_ar || 'زيارة المتجر').trim(),
      cta_label_en: String(body.cta_label_en || 'Visit Store').trim(),
      badge_ar: String(body.badge_ar || 'إعلان مموّل').trim(),
      badge_en: String(body.badge_en || 'Sponsored').trim(),
      image_url: String(body.image_url || store.banner_url || IMG_STORE).trim(),
      target_city: String(body.target_city || 'all').trim(),
      status: validStatus,
      priority: Math.max(1, Math.min(100, Number(body.priority ?? 50))),
      skip_delay_sec: Math.max(0, Math.min(10, Number(body.skip_delay_sec ?? 3))),
      paid_amount_sdg: Math.max(0, Math.round(Number(body.paid_amount_sdg ?? 0))),
      payment_status: validPayment,
      payment_ref: String(body.payment_ref || '').trim(),
      starts_at: String(body.starts_at || dateOffsetStr(0)).slice(0, 10),
      ends_at: String(body.ends_at || dateOffsetStr(14)).slice(0, 10),
      impressions: 0,
      clicks: 0,
      last_clicked_at: null,
      total_time_to_click_ms: 0,
      timed_clicks: 0,
      daily_stats: [],
      created_at: nowIso(),
    };
    sponsoredAds.unshift(created);
    auditEvents.unshift({
      id: auditEvents.length + 1,
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ad_created',
      resource: `ad:${created.id}`,
      metadata: {
        store_id: created.store_id,
        store_name: created.store_name,
        paid_amount_sdg: created.paid_amount_sdg,
        status: created.status,
      },
      actor_ip: req.ip || '127.0.0.1',
      created_at: nowIso(),
    });
    res.status(201).json({ data: serializeSponsoredAd(created) });
  });

  router.patch('/admin/ads/:id', (req, res) => {
    const actor = getSessionUser(req);
    if (!actor || actor.role !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin privileges required' } });
      return;
    }
    const ad = sponsoredAds.find((a) => a.id === Number(req.params.id));
    if (!ad) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ad campaign not found' } });
      return;
    }
    const body = req.body || {};
    if (body.store_id !== undefined) {
      const store = stores.find((s) => s.id === Number(body.store_id));
      if (store) {
        ad.store_id = store.id;
        ad.store_name = store.name;
      }
    }
    if (body.listing_id !== undefined) {
      ad.listing_id = body.listing_id ? Number(body.listing_id) : null;
    }
    if (body.title_ar !== undefined) ad.title_ar = String(body.title_ar).trim();
    if (body.title_en !== undefined) ad.title_en = String(body.title_en).trim();
    if (body.subtitle_ar !== undefined) ad.subtitle_ar = String(body.subtitle_ar).trim();
    if (body.subtitle_en !== undefined) ad.subtitle_en = String(body.subtitle_en).trim();
    if (body.cta_label_ar !== undefined) ad.cta_label_ar = String(body.cta_label_ar).trim();
    if (body.cta_label_en !== undefined) ad.cta_label_en = String(body.cta_label_en).trim();
    if (body.badge_ar !== undefined) ad.badge_ar = String(body.badge_ar).trim();
    if (body.badge_en !== undefined) ad.badge_en = String(body.badge_en).trim();
    if (body.image_url !== undefined) ad.image_url = String(body.image_url).trim();
    if (body.target_city !== undefined) ad.target_city = String(body.target_city).trim();
    if (body.status !== undefined && ['active', 'paused', 'scheduled', 'ended'].includes(String(body.status))) {
      ad.status = String(body.status) as SponsoredAdRecord['status'];
    }
    if (body.priority !== undefined) ad.priority = Math.max(1, Math.min(100, Number(body.priority)));
    if (body.skip_delay_sec !== undefined) ad.skip_delay_sec = Math.max(0, Math.min(10, Number(body.skip_delay_sec)));
    if (body.paid_amount_sdg !== undefined) ad.paid_amount_sdg = Math.max(0, Math.round(Number(body.paid_amount_sdg)));
    if (body.payment_status !== undefined && ['paid', 'pending', 'invoiced'].includes(String(body.payment_status))) {
      ad.payment_status = String(body.payment_status) as SponsoredAdRecord['payment_status'];
    }
    if (body.payment_ref !== undefined) ad.payment_ref = String(body.payment_ref).trim();
    if (body.starts_at !== undefined) ad.starts_at = String(body.starts_at).slice(0, 10);
    if (body.ends_at !== undefined) ad.ends_at = String(body.ends_at).slice(0, 10);

    auditEvents.unshift({
      id: auditEvents.length + 1,
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ad_updated',
      resource: `ad:${ad.id}`,
      metadata: {
        store_name: ad.store_name,
        status: ad.status,
        paid_amount_sdg: ad.paid_amount_sdg,
      },
      actor_ip: req.ip || '127.0.0.1',
      created_at: nowIso(),
    });
    res.json({ data: serializeSponsoredAd(ad) });
  });

  router.delete('/admin/ads/:id', (req, res) => {
    const actor = getSessionUser(req);
    if (!actor || actor.role !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin privileges required' } });
      return;
    }
    const idx = sponsoredAds.findIndex((a) => a.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ad campaign not found' } });
      return;
    }
    const [removed] = sponsoredAds.splice(idx, 1);
    auditEvents.unshift({
      id: auditEvents.length + 1,
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ad_deleted',
      resource: `ad:${removed.id}`,
      metadata: { store_name: removed.store_name, title: removed.title_en },
      actor_ip: req.ip || '127.0.0.1',
      created_at: nowIso(),
    });
    res.json({ data: { deleted: true } });
  });

  return router;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.use('/api/v1', createApiRouter());

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR);

  if (isProd) {
    app.use('/src/assets/images', express.static(path.join(WEB_DIR, 'src', 'assets', 'images')));
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  } else {
    const viteEntry = path.join(WEB_DIR, 'node_modules', 'vite', 'dist', 'node', 'index.js');
    const viteModule = fs.existsSync(viteEntry)
      ? await import(pathToFileURL(viteEntry).href)
      : await import('vite');
    const createViteServer = viteModule.createServer;
    const vite = await createViteServer({
      root: WEB_DIR,
      configFile: path.join(WEB_DIR, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Sudan Phones server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
