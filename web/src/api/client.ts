/**
 * Typed HTTP client for Sudan Phones Django REST Framework API (/api/v1/*).
 * Handles CSRF session bootstrap, Idempotency-Key headers, pure-JS SHA-256 fallback
 * (for HTTP/WebView environments without crypto.subtle), and 3-step signed uploads.
 */

import { Preferences } from '@capacitor/preferences';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const SESSION_TOKEN_KEY = 'sp_session_token_v1';
const CACHED_AUTH_KEY = 'sp_cached_auth_v1';
let cachedCsrfToken = '';
let memorySessionToken = '';
let storageInitialized = false;
let storageInitPromise: Promise<void> | null = null;

function readLocalStorage(key: string): string {
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeLocalStorage(key: string, value: string | null) {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

// Hydrate synchronous memory mirror immediately from localStorage
memorySessionToken = readLocalStorage(SESSION_TOKEN_KEY);

/** Load persisted session token & auth snapshot from native Android SharedPreferences if localStorage was cleared. */
export async function initSessionStorage(): Promise<void> {
  if (storageInitialized) return;
  if (storageInitPromise) return storageInitPromise;
  storageInitPromise = (async () => {
    try {
      const { value: nativeToken } = await Preferences.get({ key: SESSION_TOKEN_KEY });
      if (nativeToken && !memorySessionToken) {
        memorySessionToken = nativeToken;
        writeLocalStorage(SESSION_TOKEN_KEY, nativeToken);
      } else if (memorySessionToken && !nativeToken) {
        await Preferences.set({ key: SESSION_TOKEN_KEY, value: memorySessionToken });
      }
      const { value: nativeAuth } = await Preferences.get({ key: CACHED_AUTH_KEY });
      if (nativeAuth && !readLocalStorage(CACHED_AUTH_KEY)) {
        writeLocalStorage(CACHED_AUTH_KEY, nativeAuth);
      }
    } catch {
      // Running in plain browser or Preferences unavailable
    } finally {
      storageInitialized = true;
    }
  })();
  return storageInitPromise;
}

export function hasStoredSessionToken(): boolean {
  return Boolean(memorySessionToken || readLocalStorage(SESSION_TOKEN_KEY));
}

function getStoredSessionToken(): string {
  if (memorySessionToken) return memorySessionToken;
  const fromLs = readLocalStorage(SESSION_TOKEN_KEY);
  if (fromLs) memorySessionToken = fromLs;
  return fromLs;
}

function setStoredSessionToken(token: string | null) {
  memorySessionToken = token || '';
  writeLocalStorage(SESSION_TOKEN_KEY, token);
  if (token) {
    Preferences.set({ key: SESSION_TOKEN_KEY, value: token }).catch(() => {});
  } else {
    Preferences.remove({ key: SESSION_TOKEN_KEY }).catch(() => {});
  }
}

export function getCachedAuth(): { session: ApiSession; me: ApiMe | null } | null {
  try {
    const raw = readLocalStorage(CACHED_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.session && parsed.session.authenticated) {
      return parsed;
    }
  } catch {
    // ignore corrupted cache
  }
  return null;
}

export function setCachedAuth(auth: { session: ApiSession; me: ApiMe | null } | null) {
  const serialized = auth && auth.session.authenticated ? JSON.stringify(auth) : null;
  writeLocalStorage(CACHED_AUTH_KEY, serialized);
  if (serialized) {
    Preferences.set({ key: CACHED_AUTH_KEY, value: serialized }).catch(() => {});
  } else {
    Preferences.remove({ key: CACHED_AUTH_KEY }).catch(() => {});
  }
}

function captureAuthHeaders(res: Response) {
  const headerToken = res.headers.get('X-CSRFToken') || res.headers.get('x-csrftoken');
  if (headerToken) cachedCsrfToken = headerToken;
  const sessionToken = res.headers.get('X-Session-Token') || res.headers.get('x-session-token');
  if (sessionToken) setStoredSessionToken(sessionToken);
}

function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function getCsrfToken(): string {
  return readCsrfCookie() || cachedCsrfToken;
}

export function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Pure-JS SHA-256 fallback when window.crypto.subtle is unavailable (e.g. plain HTTP). */
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const bytes = new Uint8Array(buffer);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const bitLen = bytes.length * 8;
  const padLen = ((bytes.length + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(padLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);
  const w = new Int32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < padLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = view.getInt32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[j] + w[j]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => (v >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiSession {
  authenticated: boolean;
  role: 'guest' | 'buyer' | 'merchant' | 'admin';
  permissions: string[];
  user_id: number | null;
  merchant: boolean;
  phone_verified: boolean;
  email_verified: boolean;
}

export interface ApiBrand {
  id: number;
  name: string;
  slug?: string;
  name_ar?: string;
}

export interface ApiCatalogModel {
  id: number;
  name: string;
  brand_id: number;
  specifications?: Record<string, any>;
}

export interface ApiCatalogVariant {
  id: number;
  model_id: number;
  storage_gb: number;
  ram_gb: number;
  color: string;
}

export interface ApiMe {
  id: number;
  name: string;
  phone: string;
  email: string;
  phone_verified: boolean;
  email_verified: boolean;
  preferred_city: string;
  preferred_locale: 'ar' | 'en';
  role: 'guest' | 'buyer' | 'merchant' | 'admin';
  merchant: boolean;
}

export async function ensureCsrf(): Promise<ApiSession> {
  await initSessionStorage();
  const headers: Record<string, string> = { Accept: 'application/json' };
  const sessionToken = getStoredSessionToken();
  if (sessionToken) headers['X-Session-Token'] = sessionToken;
  const res = await fetch(`${API_BASE}/api/v1/auth/session`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
  captureAuthHeaders(res);
  const json = await res.json();
  const data = json.data as ApiSession;
  if (res.ok && data && !data.authenticated && sessionToken) {
    setStoredSessionToken(null);
    setCachedAuth(null);
  }
  return data;
}

export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
    idempotent?: boolean;
    idempotencyKey?: string;
    lang?: 'ar' | 'en';
  } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (isMutation && !getCsrfToken()) {
    await ensureCsrf();
  }
  let url = `${API_BASE}${path}`;
  if (options.query) {
    const params = new URLSearchParams();
    Object.entries(options.query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': options.lang || 'ar',
  };
  const sessionToken = getStoredSessionToken();
  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (isMutation) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRFToken'] = csrf;
  }
  if (options.idempotent || options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey || newUuid();
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  captureAuthHeaders(res);

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(
      res.status,
      err?.code || `HTTP_${res.status}`,
      err?.message || res.statusText || 'Request failed',
      err?.details
    );
  }
  return json as T;
}

/** 3-step presigned upload (init -> PUT binary -> complete) for listing images & verification docs/PDFs. */
export async function uploadMediaFile(
  file: File,
  kind: string,
  purpose: 'listing' | 'verification' = 'listing'
): Promise<string> {
  const buf = await file.arrayBuffer();
  const sha256 = await sha256Hex(buf);
  const contentType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  const endpoint = purpose === 'verification' ? '/api/v1/stores/me/verification/documents' : '/api/v1/media/uploads';
  const initRes = await apiRequest<{ data: { id: string; url: string; headers: Record<string, string> } }>(endpoint, {
    method: 'POST',
    body: {
      kind,
      content_type: contentType,
      size: buf.byteLength,
      sha256,
    },
  });
  const { id, url, headers } = initRes.data;
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, ...(headers || {}) },
    body: buf,
  });
  if (!putRes.ok) {
    throw new ApiError(putRes.status, 'UPLOAD_FAILED', 'Failed to upload file bytes');
  }
  await apiRequest(`/api/v1/media/uploads/${id}/complete`, { method: 'POST' });
  return id;
}

export function normalizeSudanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('249') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+249${digits.slice(1)}`;
  if (digits.length === 9) return `+249${digits}`;
  return raw.startsWith('+') ? raw.replace(/\s+/g, '') : `+249${digits}`;
}

export const api = {
  // Bootstrap & Auth
  getSession: () => ensureCsrf(),
  logout: async () => {
    try {
      await apiRequest('/api/v1/auth/session', { method: 'DELETE' });
    } finally {
      setStoredSessionToken(null);
      setCachedAuth(null);
    }
  },
  login: async (payload: { phone?: string; email?: string; password: string }) => {
    const res = await apiRequest<{ data: ApiSession }>('/api/v1/auth/login', {
      method: 'POST',
      body: payload,
    });
    await ensureCsrf(); // refresh rotated CSRF cookie after login
    return res.data;
  },
  loginGoogle: async (idToken: string) => {
    const res = await apiRequest<{ data: ApiSession }>('/api/v1/auth/google', {
      method: 'POST',
      body: { id_token: idToken },
    });
    await ensureCsrf();
    return res.data;
  },
  registerBuyer: async (payload: { phone: string; password: string; name: string; email?: string; channel?: 'whatsapp' | 'email' }) => {
    const res = await apiRequest<{ data: ApiSession }>('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    });
    await ensureCsrf();
    return res.data;
  },
  registerMerchant: async (payload: { phone: string; password: string; name: string; email?: string; channel?: 'whatsapp' | 'email' }) => {
    const res = await apiRequest<{ data: ApiSession }>('/api/v1/merchant/auth/register', {
      method: 'POST',
      body: payload,
    });
    await ensureCsrf();
    return res.data;
  },
  verifyOtp: (payload: { code?: string; channel?: 'whatsapp' | 'email' }) =>
    apiRequest('/api/v1/merchant/auth/verify', { method: 'POST', body: payload }),
  recoverPassword: (payload: { phone: string; channel?: 'whatsapp' | 'email'; code?: string; password?: string }) =>
    apiRequest('/api/v1/auth/recover', { method: 'POST', body: payload }),
  getMe: () => apiRequest<{ data: ApiMe }>('/api/v1/me'),
  updateMe: (payload: { name?: string; preferred_city?: string; preferred_locale?: 'ar' | 'en' }) =>
    apiRequest<{ data: ApiMe }>('/api/v1/me', { method: 'PATCH', body: payload }),

  // Public Discovery & Catalog
  getConfig: () => apiRequest('/api/v1/config'),
  getHome: (city?: string) =>
    apiRequest('/api/v1/home', { query: city && city !== 'all' ? { city } : undefined }),
  getBrands: () => apiRequest('/api/v1/brands', { query: { limit: 100, offset: 0 } }),
  getPublicModels: (query?: { brand?: string; brand_id?: number; city?: string; q?: string; limit?: number }) =>
    apiRequest('/api/v1/models', { query: { limit: 100, ...query } }),
  searchListings: (query?: Record<string, string | number | undefined>) =>
    apiRequest('/api/v1/listings', { query: { limit: 100, ...query } }),
  getListing: (id: string | number) => apiRequest(`/api/v1/listings/${id}`),
  getFeaturedStores: () => apiRequest('/api/v1/stores/featured', { query: { limit: 50, offset: 0 } }),
  getStore: (id: string | number) => apiRequest(`/api/v1/stores/${id}`),
  getStoreListings: (id: string | number) => apiRequest(`/api/v1/stores/${id}/listings`, { query: { limit: 100 } }),
  getContactMethods: (listingId: string | number) =>
    apiRequest<{ data: { phone_url: string; whatsapp_url: string } }>(`/api/v1/listings/${listingId}/contact-methods`),
  recordContactEvent: (listingId: string | number, method: 'whatsapp' | 'phone') =>
    apiRequest(`/api/v1/listings/${listingId}/contact-events`, {
      method: 'POST',
      body: { event_id: newUuid(), method },
    }),

  // Ratings & Reports
  getStoreRatings: (storeId: string | number) => apiRequest(`/api/v1/stores/${storeId}/ratings`, { query: { limit: 50 } }),
  submitStoreRating: (storeId: string | number, stars: number, comment: string) =>
    apiRequest(`/api/v1/stores/${storeId}/ratings`, { method: 'POST', body: { stars, comment } }),
  getModelRatings: (modelId: string | number) => apiRequest(`/api/v1/models/${modelId}/ratings`, { query: { limit: 50 } }),
  submitModelRating: (modelId: string | number, stars: number, comment: string) =>
    apiRequest(`/api/v1/models/${modelId}/ratings`, { method: 'POST', body: { stars, comment } }),
  submitReport: (payload: { target_type: 'listing' | 'store'; target_id: number; reason: string; details: string; reporter_contact?: string }) =>
    apiRequest('/api/v1/reports', { method: 'POST', body: payload }),

  // Merchant Portal
  getMyStore: () => apiRequest('/api/v1/stores/me'),
  updateStoreProfile: (payload: Record<string, unknown>) =>
    apiRequest('/api/v1/stores/me/profile', { method: 'PUT', body: payload }),
  updateStoreSettings: (payload: Record<string, unknown>) =>
    apiRequest('/api/v1/stores/me', { method: 'PUT', body: payload }),
  getMyVerification: () => apiRequest('/api/v1/stores/me/verification'),
  submitVerification: (documents: string[]) =>
    apiRequest('/api/v1/stores/me/verification/submit', { method: 'POST', body: { documents } }),
  requestReverification: (payload: { note: string; name?: string; city?: string; documents?: string[] }) =>
    apiRequest('/api/v1/stores/me/reverification', { method: 'POST', body: payload }),
  getMyDashboard: () => apiRequest('/api/v1/stores/me/dashboard'),
  getMyListings: () => apiRequest('/api/v1/stores/me/listings', { query: { limit: 100 } }),
  getCatalogBrands: (q?: string) =>
    apiRequest<{ data: ApiBrand[] }>('/api/v1/catalog/brands', { query: { q, limit: 100 } }),
  getCatalogModels: (query?: { brand_id?: number; q?: string; limit?: number; offset?: number }) =>
    apiRequest<{ data: ApiCatalogModel[] }>('/api/v1/catalog/models', {
      query: { limit: 100, ...query },
    }),
  getCatalogVariants: (modelId?: number) =>
    apiRequest<{ data: ApiCatalogVariant[] }>('/api/v1/catalog/variants', {
      query: { model_id: modelId, limit: 100 },
    }),
  createListing: (payload: Record<string, unknown>, idempotencyKey?: string) =>
    apiRequest('/api/v1/stores/me/listings', { method: 'POST', body: payload, idempotent: true, idempotencyKey }),
  updateListingPrice: (id: string | number, version: number, price: number, idempotencyKey?: string) =>
    apiRequest(`/api/v1/stores/me/listings/${id}/price`, {
      method: 'PATCH',
      body: { version, price: price.toFixed(2) },
      idempotent: true,
      idempotencyKey,
    }),
  updateListingStock: (id: string | number, version: number, quantity: number, usedAvailability?: string, idempotencyKey?: string) =>
    apiRequest(`/api/v1/stores/me/listings/${id}/stock`, {
      method: 'PATCH',
      body: usedAvailability ? { version, quantity, used_availability: usedAvailability } : { version, quantity },
      idempotent: true,
      idempotencyKey,
    }),
  editListing: (id: string | number, payload: Record<string, unknown>, idempotencyKey?: string) =>
    apiRequest(`/api/v1/stores/me/listings/${id}`, { method: 'PATCH', body: payload, idempotent: true, idempotencyKey }),
  getMyStaff: () => apiRequest('/api/v1/stores/me/staff'),
  addStaff: (payload: { phone?: string; user_id?: number; role: 'manager' | 'clerk' | 'staff' }) =>
    apiRequest('/api/v1/stores/me/staff', { method: 'POST', body: payload }),
  removeStaff: (memberId: string | number) =>
    apiRequest(`/api/v1/stores/me/staff/${memberId}`, { method: 'DELETE' }),

  // Admin Portal
  getAdminOverview: () => apiRequest('/api/v1/admin/overview'),
  getAdminVerifications: () => apiRequest('/api/v1/admin/verifications', { query: { limit: 100 } }),
  getAdminVerificationDocs: (id: string | number) => apiRequest(`/api/v1/admin/verifications/${id}/documents`),
  decideVerification: (id: string | number, decision: string, version: number, reason: string) =>
    apiRequest(`/api/v1/admin/verifications/${id}/decision`, {
      method: 'POST',
      body: { decision, version, reason },
    }),
  getModerationQueue: () => apiRequest('/api/v1/admin/moderation/queue', { query: { limit: 100 } }),
  moderateListing: (id: string | number, action: string, version: number, reason: string) =>
    apiRequest(`/api/v1/admin/listings/${id}/moderate`, {
      method: 'POST',
      body: { action, version, reason },
    }),
  getAdminReports: (status = 'all') => apiRequest('/api/v1/admin/reports', { query: { status, limit: 100 } }),
  resolveReport: (id: string | number, status: 'reviewed' | 'dismissed', resolutionNote: string, flagListing = false) =>
    apiRequest(`/api/v1/admin/reports/${id}/resolve`, {
      method: 'POST',
      body: { status, resolution_note: resolutionNote, flag_listing: flagListing },
    }),
  suspendStore: (storeId: string | number, reason: string) =>
    apiRequest(`/api/v1/admin/stores/${storeId}/suspend`, { method: 'POST', body: { reason } }),
  getAdminRoles: () => apiRequest('/api/v1/admin/roles', { query: { limit: 100 } }),
  saveAdminRole: (payload: Record<string, unknown>) =>
    apiRequest('/api/v1/admin/roles', { method: 'POST', body: payload }),
  getAdminUsers: () => apiRequest('/api/v1/admin/users'),
  getDualApprovals: (status = 'all') => apiRequest('/api/v1/admin/dual-approvals', { query: { status, limit: 100 } }),
  decideDualApproval: (id: string | number, decision: 'approve' | 'reject', version: number) =>
    apiRequest(`/api/v1/admin/dual-approvals/${id}/decision`, {
      method: 'POST',
      body: { decision, version },
    }),
  getAuditEvents: (query?: Record<string, string | number | undefined>) =>
    apiRequest('/api/v1/admin/audit-events', { query: { limit: 100, ...query } }),
};
