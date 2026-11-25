import { BilingualText, BrandId, Listing, PhoneSpecifications } from '../types';

/**
 * Resolves a phone listing's localized color name to its realistic hardware finish hex.
 */
export function resolvePhoneColorHex(color: BilingualText): string {
  const en = color.en.trim().toLowerCase();
  const ar = color.ar.trim();

  const exactMap: Record<string, string> = {
    'titanium black': '#26272B',
    'titanium gray': '#8E8B84',
    'titanium violet': '#585068',
    'natural titanium': '#BAB4A9',
    'blue titanium': '#3E4B5E',
    'titan gold': '#C9B182',
    graphite: '#4B4E53',
    'sierra blue': '#9BB5CE',
    'awesome navy': '#283A56',
    'awesome iceblue': '#CBE0EE',
    'bay blue': '#7FB2D8',
    obsidian: '#202124',
    'midnight black': '#1C1F26',
    'silky black': '#232426',
    'moonlight white': '#F4F5F7',
    'alps snowy silver': '#E2E6EB',
    'flowy emerald': '#2A6D56',
    'vintage green': '#4C6B58',
    'iceland basaltic dark': '#3E4248',
    'brave black': '#1E2024',
  };

  if (exactMap[en]) return exactMap[en];

  if (en.includes('black') || en.includes('obsidian') || en.includes('dark') || ar.includes('أسود')) return '#232528';
  if (en.includes('white') || en.includes('snow') || ar.includes('أبيض')) return '#F2F4F6';
  if (en.includes('silver') || ar.includes('فضي')) return '#D6DBE0';
  if (en.includes('gold') || en.includes('desert') || ar.includes('ذهبي')) return '#C8AF7E';
  if (en.includes('navy') || ar.includes('كحلي')) return '#283A56';
  if (en.includes('ice') || en.includes('sky') || ar.includes('ثلجي')) return '#CBE0EE';
  if (en.includes('blue') || ar.includes('أزرق')) return '#4B78A8';
  if (en.includes('emerald') || en.includes('green') || ar.includes('أخضر')) return '#2E6E57';
  if (en.includes('violet') || en.includes('purple') || ar.includes('بنفسجي')) return '#65577B';
  if (en.includes('red') || en.includes('crimson') || ar.includes('أحمر')) return '#B83A3A';
  if (en.includes('pink') || en.includes('rose') || ar.includes('وردي')) return '#DFA6B2';
  if (en.includes('titanium') || en.includes('gray') || en.includes('grey') || ar.includes('رمادي') || ar.includes('تيتانيوم')) return '#8F8D86';

  return '#7B8A82';
}

/**
 * Detailed hardware specifications keyed by catalog model name.
 * Matches the backend API schema (note: `source` is internal provenance metadata and never displayed to customers).
 */
export const PHONE_SPECIFICATIONS_BY_MODEL: Record<string, PhoneSpecifications> = {
  'Galaxy S24 Ultra': {
    release_year: 2024,
    series: 'Galaxy S',
    display: {
      size_inches: 6.8,
      type: 'Dynamic LTPO AMOLED 2X',
      resolution: '1440x3120',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'Snapdragon 8 Gen 3',
      os: 'Android 14, One UI 6.1',
    },
    camera: {
      rear_main_mp: 200,
      rear: '200 MP (wide) + 50 MP (5x periscope) + 10 MP (3x telephoto) + 12 MP (ultrawide)',
      rear_ois: true,
      front: '12 MP',
      video: '8K@30fps / 4K@60fps',
    },
    battery: {
      capacity_mah: 5000,
      charging_wired_w: 45,
      charging_wireless_w: 15,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Dual SIM (Nano-SIM + eSIM)',
      nfc: true,
      usb: 'USB Type-C 3.2',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Under-display (ultrasonic)',
      ip_rating: 'IP68',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'sam-s24-ultra-5g',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/sam-s24-ultra',
    },
  },
  'Galaxy A55 5G': {
    release_year: 2024,
    series: 'Galaxy A',
    display: {
      size_inches: 6.6,
      type: 'Super AMOLED',
      resolution: '1080x2340',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'Exynos 1480',
      os: 'Android 14, One UI 6.1',
    },
    camera: {
      rear_main_mp: 50,
      rear: '50 MP (wide) + 12 MP (ultrawide) + 5 MP (macro)',
      rear_ois: true,
      front: '32 MP',
      video: '4K@30fps / 1080p@60fps',
    },
    battery: {
      capacity_mah: 5000,
      charging_wired_w: 25,
      charging_wireless_w: 0,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Dual SIM (Nano-SIM / eSIM)',
      nfc: true,
      usb: 'USB Type-C 2.0',
      headphone_jack: false,
      microsd: true,
    },
    build: {
      fingerprint: 'Under-display (optical)',
      ip_rating: 'IP67',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'sam-a55-5g',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/sam-a55-5g',
    },
  },
  'iPhone 15 Pro Max': {
    release_year: 2023,
    series: 'iPhone Pro',
    display: {
      size_inches: 6.7,
      type: 'LTPO Super Retina XDR OLED',
      resolution: '1290x2796',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'Apple A17 Pro',
      os: 'iOS 17 (Upgradable to iOS 18)',
    },
    camera: {
      rear_main_mp: 48,
      rear: '48 MP (wide) + 12 MP (5x periscope) + 12 MP (ultrawide)',
      rear_ois: true,
      front: '12 MP (TrueDepth)',
      video: '4K@60fps ProRes',
    },
    battery: {
      capacity_mah: 4441,
      charging_wired_w: 27,
      charging_wireless_w: 15,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Nano-SIM + eSIM',
      nfc: true,
      usb: 'USB Type-C 3.2 Gen 2',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Face ID',
      ip_rating: 'IP68',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'apl-15-pro-max',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/apl-15-pro-max',
    },
  },
  'iPhone 13 Pro': {
    release_year: 2021,
    series: 'iPhone Pro',
    display: {
      size_inches: 6.1,
      type: 'Super Retina XDR OLED',
      resolution: '1170x2532',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'Apple A15 Bionic',
      os: 'iOS 15 (Upgradable to iOS 18)',
    },
    camera: {
      rear_main_mp: 12,
      rear: '12 MP (wide) + 12 MP (3x telephoto) + 12 MP (ultrawide)',
      rear_ois: true,
      front: '12 MP (TrueDepth)',
      video: '4K@60fps ProRes',
    },
    battery: {
      capacity_mah: 3095,
      charging_wired_w: 23,
      charging_wireless_w: 15,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Nano-SIM + eSIM',
      nfc: true,
      usb: 'Lightning (USB 2.0)',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Face ID',
      ip_rating: 'IP68',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'apl-13-pro',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/apl-13-pro',
    },
  },
  'Redmi Note 13 Pro+': {
    release_year: 2024,
    series: 'Redmi Note',
    display: {
      size_inches: 6.67,
      type: 'AMOLED (1.5K CrystalRes)',
      resolution: '1220x2712',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'MediaTek Dimensity 7200 Ultra',
      os: 'Android 13, HyperOS',
    },
    camera: {
      rear_main_mp: 200,
      rear: '200 MP (wide) + 8 MP (ultrawide) + 2 MP (macro)',
      rear_ois: true,
      front: '16 MP',
      video: '4K@30fps / 1080p@60fps',
    },
    battery: {
      capacity_mah: 5000,
      charging_wired_w: 120,
      charging_wireless_w: 0,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Dual SIM (Nano-SIM + eSIM)',
      nfc: true,
      usb: 'USB Type-C 2.0',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Under-display (optical)',
      ip_rating: 'IP68',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'xmi-note-13-pro-plus',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/xmi-note-13-pro-plus',
    },
  },
  'Pixel 8 Pro': {
    release_year: 2023,
    series: 'Pixel',
    display: {
      size_inches: 6.7,
      type: 'LTPO OLED (Super Actua)',
      resolution: '1344x2992',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'Google Tensor G3',
      os: 'Android 14',
    },
    camera: {
      rear_main_mp: 50,
      rear: '50 MP (wide) + 48 MP (5x telephoto) + 48 MP (ultrawide)',
      rear_ois: true,
      front: '10.5 MP',
      video: '4K@60fps (10-bit HDR)',
    },
    battery: {
      capacity_mah: 5050,
      charging_wired_w: 30,
      charging_wireless_w: 23,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Nano-SIM + eSIM',
      nfc: true,
      usb: 'USB Type-C 3.2',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Under-display (optical)',
      ip_rating: 'IP68',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'ggl-pixel-8-pro',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/ggl-pixel-8-pro',
    },
  },
  'OnePlus 12': {
    release_year: 2024,
    series: 'OnePlus Flagship',
    display: {
      size_inches: 6.82,
      type: 'LTPO AMOLED (ProXDR)',
      resolution: '1440x3168',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'Snapdragon 8 Gen 3',
      os: 'Android 14, OxygenOS 14',
    },
    camera: {
      rear_main_mp: 50,
      rear: '50 MP (wide) + 64 MP (3x periscope) + 48 MP (ultrawide)',
      rear_ois: true,
      front: '32 MP',
      video: '8K@24fps / 4K@60fps',
    },
    battery: {
      capacity_mah: 5400,
      charging_wired_w: 100,
      charging_wireless_w: 50,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Dual SIM (Nano-SIM + eSIM)',
      nfc: true,
      usb: 'USB Type-C 3.2',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Under-display (optical)',
      ip_rating: 'IP65',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'opl-12-5g',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/opl-12',
    },
  },
  'Camon 30 Pro 5G': {
    release_year: 2024,
    series: 'Camon',
    display: {
      size_inches: 6.78,
      type: 'AMOLED',
      resolution: '1080x2436',
      refresh_rate_hz: 144,
    },
    performance: {
      chipset: 'MediaTek Dimensity 8200 Ultimate',
      os: 'Android 14, HIOS 14',
    },
    camera: {
      rear_main_mp: 50,
      rear: '50 MP (wide, Sony IMX890) + 50 MP (ultrawide) + 2 MP (depth)',
      rear_ois: true,
      front: '50 MP (AF)',
      video: '4K@60fps / 1080p@60fps',
    },
    battery: {
      capacity_mah: 5000,
      charging_wired_w: 70,
      charging_wireless_w: 0,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Dual SIM (Nano-SIM)',
      nfc: true,
      usb: 'USB Type-C 2.0',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Under-display (optical)',
      ip_rating: 'None',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'tec-camon-30-pro-5g',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/tec-camon-30-pro',
    },
  },
  'iPhone 14 Pro': {
    release_year: 2022,
    series: 'iPhone Pro',
    display: {
      size_inches: 6.1,
      type: 'LTPO Super Retina XDR OLED',
      resolution: '1179x2556',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'Apple A16 Bionic',
      os: 'iOS 16 (Upgradable to iOS 18)',
    },
    camera: {
      rear_main_mp: 48,
      rear: '48 MP (wide) + 12 MP (3x telephoto) + 12 MP (ultrawide)',
      rear_ois: true,
      front: '12 MP (TrueDepth)',
      video: '4K@60fps ProRes',
    },
    battery: {
      capacity_mah: 3200,
      charging_wired_w: 23,
      charging_wireless_w: 15,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Nano-SIM + eSIM',
      nfc: true,
      usb: 'Lightning (USB 2.0)',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Face ID',
      ip_rating: 'IP68',
    },
  },
  'Redmi Note 13 Pro': {
    release_year: 2024,
    series: 'Redmi Note',
    display: {
      size_inches: 6.67,
      type: 'AMOLED (1.5K CrystalRes)',
      resolution: '1220x2712',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'Snapdragon 7s Gen 2',
      os: 'Android 13, MIUI 14',
    },
    camera: {
      rear_main_mp: 200,
      rear: '200 MP (wide) + 8 MP (ultrawide) + 2 MP (macro)',
      rear_ois: true,
      front: '16 MP',
      video: '4K@30fps / 1080p@60fps',
    },
    battery: {
      capacity_mah: 5100,
      charging_wired_w: 67,
      charging_wireless_w: 0,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Dual SIM (Nano-SIM + eSIM)',
      nfc: true,
      usb: 'USB Type-C 2.0',
      headphone_jack: true,
      microsd: false,
    },
    build: {
      fingerprint: 'Under-display (optical)',
      ip_rating: 'IP54',
    },
  },
  'Note 40 Pro': {
    release_year: 2024,
    series: 'Note',
    display: {
      size_inches: 6.78,
      type: 'Curved AMOLED',
      resolution: '1080x2436',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: 'MediaTek Helio G99 Ultimate',
      os: 'Android 14, XOS 14',
    },
    camera: {
      rear_main_mp: 108,
      rear: '108 MP (wide) + 2 MP (macro) + 2 MP (depth)',
      rear_ois: true,
      front: '32 MP',
      video: '1440p@30fps / 1080p@60fps',
    },
    battery: {
      capacity_mah: 5000,
      charging_wired_w: 70,
      charging_wireless_w: 20,
    },
    connectivity: {
      network: '4G LTE',
      sim: 'Dual SIM (Nano-SIM)',
      nfc: true,
      usb: 'USB Type-C 2.0',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: 'Under-display (optical)',
      ip_rating: 'IP54',
    },
    source: {
      provider: 'gsm_catalog',
      external_id: 'inf-note-40-pro',
      fetched_at: '2026-10-01T00:00:00Z',
      source_url: 'internal://catalog/inf-note-40-pro',
    },
  },
};

const BRAND_DEFAULT_SERIES: Record<BrandId, string> = {
  apple: 'iPhone',
  samsung: 'Galaxy',
  xiaomi: 'Redmi',
  google: 'Pixel',
  oneplus: 'OnePlus',
  tecno: 'Camon',
  infinix: 'Note',
};

function parseFirstNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const m = value.match(/(\d+(?:\.\d+)?)/);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Always returns complete structured specifications for any listing, normalizing partial or
 * legacy backend payloads and falling back gracefully to catalog defaults.
 */
export function getPhoneSpecifications(listing: Listing): PhoneSpecifications {
  const direct = PHONE_SPECIFICATIONS_BY_MODEL[listing.model];
  const fallback: PhoneSpecifications = direct ?? {
    release_year: 2024,
    series: BRAND_DEFAULT_SERIES[listing.brand] ?? 'Smartphone',
    display: {
      size_inches: 6.6,
      type: 'AMOLED',
      resolution: '1080x2400',
      refresh_rate_hz: 120,
    },
    performance: {
      chipset: listing.brand === 'apple' ? 'Apple Silicon' : 'Octa-Core 5G Processor',
      os: listing.brand === 'apple' ? 'iOS 17' : 'Android 14',
    },
    camera: {
      rear_main_mp: 50,
      rear: '50 MP (wide) + 8 MP (ultrawide)',
      rear_ois: true,
      front: '16 MP',
      video: '4K@30fps / 1080p@60fps',
    },
    battery: {
      capacity_mah: 5000,
      charging_wired_w: 33,
      charging_wireless_w: 0,
    },
    connectivity: {
      network: '5G / 4G LTE',
      sim: 'Dual SIM (Nano-SIM)',
      nfc: true,
      usb: 'USB Type-C 2.0',
      headphone_jack: false,
      microsd: false,
    },
    build: {
      fingerprint: listing.brand === 'apple' ? 'Face ID' : 'Under-display',
      ip_rating: 'IP54',
    },
  };

  const raw = listing.specifications as Record<string, any> | undefined;
  if (!raw || typeof raw !== 'object') return fallback;

  const rawDisplay = raw.display ?? {};
  const rawPerf = raw.performance ?? raw.platform ?? {};
  const rawCam = raw.camera ?? {};
  const rawBat = raw.battery ?? {};
  const rawConn = raw.connectivity ?? {};
  const rawBuild = raw.build ?? {};

  return {
    release_year: parseFirstNumber(raw.release_year) ?? fallback.release_year,
    series: typeof raw.series === 'string' && raw.series.trim() ? raw.series : fallback.series,
    display: {
      size_inches:
        parseFirstNumber(rawDisplay.size_inches) ??
        parseFirstNumber(rawDisplay.size) ??
        fallback.display.size_inches,
      type:
        typeof rawDisplay.type === 'string' && rawDisplay.type.trim()
          ? rawDisplay.type
          : fallback.display.type,
      resolution:
        typeof rawDisplay.resolution === 'string' && rawDisplay.resolution.trim()
          ? rawDisplay.resolution
          : fallback.display.resolution,
      refresh_rate_hz:
        parseFirstNumber(rawDisplay.refresh_rate_hz) ?? fallback.display.refresh_rate_hz,
    },
    performance: {
      chipset:
        typeof rawPerf.chipset === 'string' && rawPerf.chipset.trim()
          ? rawPerf.chipset
          : fallback.performance.chipset,
      os:
        typeof rawPerf.os === 'string' && rawPerf.os.trim()
          ? rawPerf.os
          : fallback.performance.os,
    },
    camera: {
      rear_main_mp:
        parseFirstNumber(rawCam.rear_main_mp) ??
        parseFirstNumber(rawCam.main) ??
        fallback.camera.rear_main_mp,
      rear:
        typeof rawCam.rear === 'string' && rawCam.rear.trim()
          ? rawCam.rear
          : typeof rawCam.main === 'string' && rawCam.main.trim()
            ? rawCam.main
            : fallback.camera.rear,
      rear_ois: typeof rawCam.rear_ois === 'boolean' ? rawCam.rear_ois : fallback.camera.rear_ois,
      front:
        typeof rawCam.front === 'string' && rawCam.front.trim()
          ? rawCam.front
          : typeof rawCam.selfie === 'string' && rawCam.selfie.trim()
            ? rawCam.selfie
            : fallback.camera.front,
      video:
        typeof rawCam.video === 'string' && rawCam.video.trim()
          ? rawCam.video
          : fallback.camera.video,
    },
    battery: {
      capacity_mah:
        parseFirstNumber(rawBat.capacity_mah) ??
        parseFirstNumber(rawBat.capacity) ??
        fallback.battery.capacity_mah,
      charging_wired_w:
        parseFirstNumber(rawBat.charging_wired_w) ?? fallback.battery.charging_wired_w,
      charging_wireless_w:
        parseFirstNumber(rawBat.charging_wireless_w) ?? fallback.battery.charging_wireless_w,
    },
    connectivity: {
      network:
        typeof rawConn.network === 'string' && rawConn.network.trim()
          ? rawConn.network
          : fallback.connectivity.network,
      sim:
        typeof rawConn.sim === 'string' && rawConn.sim.trim()
          ? rawConn.sim
          : fallback.connectivity.sim,
      nfc: typeof rawConn.nfc === 'boolean' ? rawConn.nfc : fallback.connectivity.nfc,
      usb:
        typeof rawConn.usb === 'string' && rawConn.usb.trim()
          ? rawConn.usb
          : fallback.connectivity.usb,
      headphone_jack:
        typeof rawConn.headphone_jack === 'boolean'
          ? rawConn.headphone_jack
          : fallback.connectivity.headphone_jack,
      microsd:
        typeof rawConn.microsd === 'boolean' ? rawConn.microsd : fallback.connectivity.microsd,
    },
    build: {
      fingerprint:
        typeof rawBuild.fingerprint === 'string' && rawBuild.fingerprint.trim()
          ? rawBuild.fingerprint
          : fallback.build.fingerprint,
      ip_rating:
        typeof rawBuild.ip_rating === 'string' && rawBuild.ip_rating.trim()
          ? rawBuild.ip_rating
          : fallback.build.ip_rating,
    },
  };
}

/**
 * Helper scoring functions for fair, transparent spec-by-spec comparison.
 */
export function parseResolutionPixels(res: string): number {
  const match = res.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (!match) return 0;
  return Number(match[1]) * Number(match[2]);
}

export function parseFrontCameraMp(front: string): number {
  const match = front.match(/(\d+(?:\.\d+)?)\s*mp/i);
  return match ? Number(match[1]) : 0;
}

export function scoreChipsetTier(chipset: string): number {
  const c = chipset.toLowerCase();
  if (c.includes('8 gen 3') || c.includes('a17 pro')) return 95;
  if (c.includes('tensor g3')) return 84;
  if (c.includes('a15')) return 82;
  if (c.includes('dimensity 8200')) return 76;
  if (c.includes('exynos 1480')) return 68;
  if (c.includes('dimensity 7200')) return 67;
  if (c.includes('helio g99')) return 52;
  if (c.includes('dimensity 6100')) return 50;
  return 60;
}

export function scoreIpRating(ip: string): number {
  const upper = ip.trim().toUpperCase();
  if (!upper || upper === 'NONE') return 0;
  if (upper.includes('68') || upper.includes('69')) return 68;
  if (upper.includes('67')) return 67;
  if (upper.includes('65')) return 65;
  if (upper.includes('54')) return 54;
  if (upper.includes('53')) return 53;
  return 40;
}

export function scoreNetwork(network: string): number {
  if (network.includes('5G')) return 5;
  if (network.includes('4G')) return 4;
  return 3;
}

export function scoreVideo(video: string): number {
  if (video.includes('8K')) return 80;
  if (video.includes('4K@60')) return 60;
  if (video.includes('4K@30') || video.includes('4K')) return 45;
  if (video.includes('1440p')) return 30;
  if (video.includes('1080p@60')) return 25;
  return 20;
}

export function scoreUsb(usb: string): number {
  if (usb.includes('3.2')) return 32;
  if (usb.includes('3.1') || usb.includes('3.0')) return 30;
  if (usb.includes('Type-C')) return 20;
  return 10;
}

export function scoreWarrantyDays(listing: Listing): number {
  if (listing.condition === 'new') {
    return (listing.warrantyMonths ?? 0) * 30;
  }
  return listing.inspectionWarrantyDays ?? 0;
}

export type CompareVerdict = 'better' | 'worse' | 'equal';

export function evaluateNumericVerdict(
  a: number,
  b: number,
  prefer: 'higher' | 'lower' = 'higher'
): [CompareVerdict, CompareVerdict] {
  if (a === b) return ['equal', 'equal'];
  const aWins = prefer === 'higher' ? a > b : a < b;
  return aWins ? ['better', 'worse'] : ['worse', 'better'];
}
