import {
  ApiResponse,
  AccessCodeItem,
  OwnerVoucherItem,
  CategorizedTransactionItem,
  TransactionSummaryDto,
  KioskItem,
  KioskStatus,
  NetworkFinancialAnalyticsResponse,
  PartnerDrilldownDetails,
  NetworkSessionsResponse,
  PartnerItem,
  CreatePartnerPassRequest,
  OperatorItem,
  PartnerFinancialAnalyticsResponse,
  PartnerTransactionItem,
  PartnerSessionItem,
  PartnerPackageItem,
  CreatePartnerPackageRequest,
  PartnerVoucherItem,
  CreatePartnerVoucherRequest,
  RecentSessionItem,
} from '../types/api';
import { PackageItem } from '../types/package';
import { PublicBrandingConfig } from '../types/theme';

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    if (port === '5174' || port === '5173') {
      return `${protocol}//${hostname}:4000/api`;
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:4000/api';
}

const API_BASE = getApiBaseUrl();

export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - 10000;
  } catch {
    return true;
  }
}

function notifyUnauthorized(url?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('minja:unauthorized', { detail: { url } }));
  }
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    const urlStr = typeof input === 'string' ? input : (input as any)?.url || '';
    notifyUnauthorized(urlStr);
  }
  return res;
}

function errResponse<T>(code: string, message: string): ApiResponse<T> {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}

const DEFAULT_PUBLIC_BRANDING: PublicBrandingConfig = {
  boothName: 'MinjaPhotobooth',
  tagline: 'Momen Istimewa, Abadi Bersama',
  logoUrl: '',
  wallpaperUrl: '',
  primaryColor: '#F59E0B',
  accentColor: '#38BDF8',
  darkSurfaceColor: '#0E131F',
  backgroundBlur: 8,
  backgroundOverlayOpacity: 50,
  backgroundFit: 'cover',
  backgroundOpacity: 100,
  logoHeight: 64,
  glassmorphismIntensity: 'medium',
  enableVignette: true,
  whatsappNumber: '6281321699090',
  instagramHandle: '@minjabooth',
  studioAddress: 'Lokasi Booth Minja Studio',
  promoHeadline: 'Sewa Photobooth Profesional untuk Wedding & Acara Spesial',
  promoSubheadline:
    'Hadirkan keseruan tanpa batas di pesta Anda dengan cetak foto lab studio 10×15 cm unlimited, desain frame kustom nama pengantin / logo acara, properti foto, dan crew ramah yang siap memeriahkan pesta Anda.',
};

export class CloudApi {
  // ==========================================
  // 1. Public Landing & Catalog
  // ==========================================
  async getPublicSettings(): Promise<ApiResponse<PublicBrandingConfig>> {
    try {
      const res = await apiFetch(`${API_BASE}/settings`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const config: PublicBrandingConfig = {
            boothName: d.boothName || DEFAULT_PUBLIC_BRANDING.boothName,
            tagline: d.brandTitle || d.tagline || DEFAULT_PUBLIC_BRANDING.tagline,
            logoUrl: d.logoUrl || '',
            wallpaperUrl: d.wallpaperUrl || '',
            primaryColor: d.primaryColor || DEFAULT_PUBLIC_BRANDING.primaryColor,
            accentColor: d.secondaryColor || d.accentColor || DEFAULT_PUBLIC_BRANDING.accentColor,
            darkSurfaceColor: d.darkSurfaceColor || DEFAULT_PUBLIC_BRANDING.darkSurfaceColor,
            backgroundBlur: d.backgroundBlur ?? DEFAULT_PUBLIC_BRANDING.backgroundBlur ?? 8,
            backgroundOverlayOpacity: d.backgroundOverlayOpacity ?? DEFAULT_PUBLIC_BRANDING.backgroundOverlayOpacity ?? 50,
            backgroundFit: d.backgroundFit || DEFAULT_PUBLIC_BRANDING.backgroundFit || 'cover',
            backgroundOpacity: d.backgroundOpacity ?? DEFAULT_PUBLIC_BRANDING.backgroundOpacity ?? 100,
            logoHeight: d.logoHeight ?? DEFAULT_PUBLIC_BRANDING.logoHeight ?? 64,
            glassmorphismIntensity: d.glassmorphismIntensity || DEFAULT_PUBLIC_BRANDING.glassmorphismIntensity || 'medium',
            enableVignette: d.enableVignette !== undefined ? d.enableVignette : true,
            whatsappNumber: d.whatsappNumber || DEFAULT_PUBLIC_BRANDING.whatsappNumber,
            instagramHandle: d.instagramHandle || DEFAULT_PUBLIC_BRANDING.instagramHandle,
            studioAddress: d.studioAddress || DEFAULT_PUBLIC_BRANDING.studioAddress,
            promoHeadline: d.promoHeadline || DEFAULT_PUBLIC_BRANDING.promoHeadline,
            promoSubheadline: d.promoSubheadline || DEFAULT_PUBLIC_BRANDING.promoSubheadline,
            eventPackages: d.eventPackages || DEFAULT_PUBLIC_BRANDING.eventPackages,
            pageBuilderLanding: d.pageBuilderLanding || undefined,
            pageBuilderGallery: d.pageBuilderGallery || undefined,
            customCss: d.customCss || '',
          };
          return { success: true, data: config, timestamp: json.timestamp || new Date().toISOString() };
        }
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal memuat public settings dari backend, menggunakan default tema:', e);
    }
    return { success: true, data: DEFAULT_PUBLIC_BRANDING, timestamp: new Date().toISOString() };
  }

  async getPackages(kioskId?: string): Promise<ApiResponse<PackageItem[]>> {
    try {
      const url = kioskId ? `${API_BASE}/packages?kioskId=${encodeURIComponent(kioskId)}` : `${API_BASE}/packages`;
      const res = await apiFetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped: PackageItem[] = json.data.map((p: any, idx: number) => {
            const b = p.badge?.trim() || p.badgeText?.trim() || (idx === 1 ? 'Paling Populer' : undefined);
            return {
              id: p.id,
              name: p.name,
              badge: b,
              badgeText: b,
              description: p.description || '',
              price: p.price,
              durationSeconds: p.durationSeconds || 180,
              printCopies: p.defaultPrints ?? p.printCopies ?? 1,
              additionalPrintPrice: p.additionalPrintPrice ?? 15000,
              maxPhotos: p.maxShots || p.maxPhotos || 6,
              colorGradient: p.colorGradient || (idx === 1 ? 'from-amber-500 to-amber-600' : 'from-sky-500 to-sky-600'),
              isActive: p.isActive ?? true,
              sortOrder: p.sortOrder ?? idx,
            };
          });
          return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
        }
      }
      return errResponse('FETCH_ERROR', 'Gagal memuat daftar paket');
    } catch (e: any) {
      console.warn('[CloudApi] Gagal memuat paket dari backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  // ==========================================
  // 2. Super Admin / Owner Portal (/owner)
  // ==========================================
  async loginAdmin(
    usernameOrPin: string,
    password?: string
  ): Promise<ApiResponse<{ token: string; expiresAt?: string; expiresIn?: number; admin?: { id: string; username: string; email?: string | null } }>> {
    try {
      const payload = password !== undefined
        ? { username: usernameOrPin, password }
        : { pin: usernameOrPin };

      const res = await apiFetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('INVALID_CREDENTIALS', json?.error?.message || 'Username atau password Super Admin salah');
    } catch (e: any) {
      console.warn('[CloudApi] Gagal login via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Gagal terhubung ke backend server');
    }
  }

  async changePassword(token: string, currentPass: string, newPass: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('CHANGE_PASSWORD_FAILED', json?.error?.message || 'Gagal mengubah password admin');
    } catch (e: any) {
      console.warn('[CloudApi] Gagal changePassword via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async changePin(token: string, currentPin: string, newPin: string): Promise<ApiResponse<{ message: string }>> {
    return this.changePassword(token, currentPin, newPin);
  }

  async ownerResendEmail(sessionId: string, targetEmail?: string, token?: string): Promise<ApiResponse<{ sent: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/actions/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, targetEmail }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('RESEND_EMAIL_FAILED', json?.error?.message || 'Gagal mengirim ulang email');
    } catch (e: any) {
      console.warn('[CloudApi] Gagal ownerResendEmail via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async toggleOwnerVoucher(id: string, isActive: boolean, token?: string): Promise<ApiResponse<OwnerVoucherItem>> {
    const url = `${API_BASE}/owner/vouchers/${encodeURIComponent(id)}/toggle`;
    try {
      const res = await apiFetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal toggleOwnerVoucher via backend:', e);
    }
    return errResponse('UPDATE_FAILED', 'Gagal mengubah status voucher');
  }

  async deleteOwnerVoucher(id: string, token?: string): Promise<ApiResponse<{ success: boolean }>> {
    const url = `${API_BASE}/owner/vouchers/${encodeURIComponent(id)}`;
    try {
      const res = await apiFetch(url, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal deleteOwnerVoucher via backend:', e);
    }
    return errResponse('DELETE_FAILED', 'Gagal menghapus voucher');
  }

  async getOwnerTransactions(
    filters?: {
      category?: string;
      status?: string;
      isTodayOnly?: boolean;
      dateMode?: 'today' | 'monthly' | 'custom' | 'all';
      selectedDate?: string;
      selectedMonth?: string;
      startDate?: string;
      endDate?: string;
      partnerId?: string;
      kioskId?: string;
      search?: string;
      limit?: number;
      offset?: number;
      page?: number;
    },
    token?: string
  ): Promise<ApiResponse<{ items: CategorizedTransactionItem[]; total: number; limit: number; offset: number; page?: number; totalPages?: number }>> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.category && filters.category !== 'ALL') queryParams.append('category', filters.category);
      if (filters?.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
      if (filters?.isTodayOnly !== undefined) queryParams.append('isTodayOnly', String(filters.isTodayOnly));
      if (filters?.dateMode) queryParams.append('dateMode', filters.dateMode);
      if (filters?.selectedDate) queryParams.append('selectedDate', filters.selectedDate);
      if (filters?.selectedMonth) queryParams.append('selectedMonth', filters.selectedMonth);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.partnerId && filters.partnerId !== 'ALL') queryParams.append('partnerId', filters.partnerId);
      if (filters?.kioskId && filters.kioskId !== 'ALL') queryParams.append('kioskId', filters.kioskId);
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.limit) queryParams.append('limit', String(filters.limit));
      if (filters?.offset !== undefined) queryParams.append('offset', String(filters.offset));
      if (filters?.page) queryParams.append('page', String(filters.page));

      const url = `${API_BASE}/owner/transactions?${queryParams.toString()}`;
      const res = await apiFetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal memuat getOwnerTransactions dari backend:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat transaksi owner dari backend');
  }

  async getOwnerTransactionSummary(
    filters?: {
      dateMode?: 'today' | 'monthly' | 'custom' | 'all';
      selectedDate?: string;
      selectedMonth?: string;
      startDate?: string;
      endDate?: string;
      partnerId?: string;
      kioskId?: string;
      isTodayOnly?: boolean;
    },
    token?: string
  ): Promise<ApiResponse<TransactionSummaryDto>> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.dateMode) queryParams.append('dateMode', filters.dateMode);
      if (filters?.selectedDate) queryParams.append('selectedDate', filters.selectedDate);
      if (filters?.selectedMonth) queryParams.append('selectedMonth', filters.selectedMonth);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.partnerId && filters.partnerId !== 'ALL') queryParams.append('partnerId', filters.partnerId);
      if (filters?.kioskId && filters.kioskId !== 'ALL') queryParams.append('kioskId', filters.kioskId);
      if (filters?.isTodayOnly !== undefined) queryParams.append('isTodayOnly', String(filters.isTodayOnly));

      const url = `${API_BASE}/owner/transactions/summary?${queryParams.toString()}`;
      const res = await apiFetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal memuat getOwnerTransactionSummary dari backend:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat ringkasan transaksi');
  }

  async exportOwnerTransactionsCsv(
    filters?: {
      category?: string;
      status?: string;
      isTodayOnly?: boolean;
      dateMode?: 'today' | 'monthly' | 'custom' | 'all';
      selectedDate?: string;
      selectedMonth?: string;
      startDate?: string;
      endDate?: string;
      partnerId?: string;
      kioskId?: string;
      search?: string;
    },
    token?: string
  ): Promise<string> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.category && filters.category !== 'ALL') queryParams.append('category', filters.category);
      if (filters?.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
      if (filters?.isTodayOnly !== undefined) queryParams.append('isTodayOnly', String(filters.isTodayOnly));
      if (filters?.dateMode) queryParams.append('dateMode', filters.dateMode);
      if (filters?.selectedDate) queryParams.append('selectedDate', filters.selectedDate);
      if (filters?.selectedMonth) queryParams.append('selectedMonth', filters.selectedMonth);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.partnerId && filters.partnerId !== 'ALL') queryParams.append('partnerId', filters.partnerId);
      if (filters?.kioskId && filters.kioskId !== 'ALL') queryParams.append('kioskId', filters.kioskId);
      if (filters?.search) queryParams.append('search', filters.search);

      const url = `${API_BASE}/owner/transactions/export/csv?${queryParams.toString()}`;
      const res = await apiFetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal mengekspor CSV dari backend:', e);
    }
    return 'ORDER_ID,SESSION_CODE,PAKET,KATEGORI,STATUS,GROSS_AMOUNT,WAKTU\n';
  }

  async getNetworkFinancialAnalytics(
    params?: {
      period?: string;
      startDate?: string;
      endDate?: string;
      partnerId?: string;
      kioskId?: string;
    },
    token?: string
  ): Promise<ApiResponse<NetworkFinancialAnalyticsResponse>> {
    try {
      const q = new URLSearchParams();
      if (params?.period) q.append('period', params.period);
      if (params?.startDate) q.append('startDate', params.startDate);
      if (params?.endDate) q.append('endDate', params.endDate);
      if (params?.partnerId && params.partnerId !== 'ALL') q.append('partnerId', params.partnerId);
      if (params?.kioskId && params.kioskId !== 'ALL') q.append('kioskId', params.kioskId);

      const url = `${API_BASE}/owner/network-analytics?${q.toString()}`;
      const res = await apiFetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal memuat getNetworkFinancialAnalytics:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat analitik finansial jaringan');
  }

  async getPartnerDrilldown(
    partnerId: string,
    token?: string
  ): Promise<ApiResponse<PartnerDrilldownDetails>> {
    try {
      const url = `${API_BASE}/owner/partners/${partnerId}/drilldown`;
      const res = await apiFetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal memuat getPartnerDrilldown:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat detail drilldown mitra');
  }

  async getNetworkSessions(
    params?: {
      partnerId?: string;
      kioskId?: string;
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
    token?: string
  ): Promise<ApiResponse<NetworkSessionsResponse>> {
    try {
      const q = new URLSearchParams();
      if (params?.partnerId && params.partnerId !== 'ALL') q.append('partnerId', params.partnerId);
      if (params?.kioskId && params.kioskId !== 'ALL') q.append('kioskId', params.kioskId);
      if (params?.search) q.append('search', params.search);
      if (params?.status && params.status !== 'ALL') q.append('status', params.status);
      if (params?.page) q.append('page', String(params.page));
      if (params?.limit) q.append('limit', String(params.limit));

      const url = `${API_BASE}/owner/network-sessions?${q.toString()}`;
      const res = await apiFetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal memuat getNetworkSessions:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat daftar sesi jaringan');
  }

  async resetOperatorPin(
    operatorId: string,
    newPin: string,
    token?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const url = `${API_BASE}/owner/operators/${operatorId}/reset-pin`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newPin }),
      });
      if (res.ok) return await res.json();
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
      const err = await res.json().catch(() => ({}));
      return errResponse(err.code || 'RESET_PIN_FAILED', err.message || 'Gagal mereset PIN operator');
    } catch (e) {
      console.warn('[CloudApi] Gagal resetOperatorPin:', e);
      return errResponse('NETWORK_ERROR', 'Gagal terhubung ke server');
    }
  }

  async remoteResetKioskSession(
    kioskId: string,
    token?: string
  ): Promise<ApiResponse<{ success: boolean; cancelledSessionsCount: number; message: string }>> {
    try {
      const url = `${API_BASE}/owner/kiosks/${kioskId}/reset`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) return await res.json();
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
      const err = await res.json().catch(() => ({}));
      return errResponse(err.code || 'RESET_FAILED', err.message || 'Gagal mereset sesi booth');
    } catch (e) {
      console.warn('[CloudApi] Gagal remoteResetKioskSession:', e);
      return errResponse('NETWORK_ERROR', 'Gagal terhubung ke server');
    }
  }

  async updateKioskPackages(
    kioskId: string,
    disabledPackageIds: string[],
    token?: string
  ): Promise<ApiResponse<{ success: boolean; disabledPackageIds: string[]; message: string }>> {
    try {
      const url = `${API_BASE}/owner/kiosks/${kioskId}/packages`;
      const res = await apiFetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ disabledPackageIds }),
      });
      if (res.ok) return await res.json();
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
      const err = await res.json().catch(() => ({}));
      return errResponse(err.code || 'UPDATE_FAILED', err.message || 'Gagal menyimpan konfigurasi paket');
    } catch (e) {
      console.warn('[CloudApi] Gagal updateKioskPackages:', e);
      return errResponse('NETWORK_ERROR', 'Gagal terhubung ke server');
    }
  }

  async getOwnerKiosks(token?: string): Promise<ApiResponse<KioskItem[]>> {
    const url = `${API_BASE}/owner/kiosks`;
    try {
      const res = await apiFetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[CloudApi] Gagal memuat daftar booth kiosks via backend:', e);
    }
    return errResponse('FETCH_FAILED', 'Gagal memuat daftar mesin booth');
  }

  async createOwnerKiosk(
    token: string | undefined,
    data: { name: string; location: string; code?: string; paperRollCapacity?: number }
  ): Promise<ApiResponse<KioskItem>> {
    const url = `${API_BASE}/owner/kiosks`;
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('CREATE_FAILED', err?.error?.message || 'Gagal mendaftarkan mesin booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async toggleOwnerKioskLock(
    token: string | undefined,
    id: string,
    enabled: boolean,
    reason?: string
  ): Promise<ApiResponse<{ id: string; code: string; isLocked: boolean; lockReason: string | null; status: KioskStatus }>> {
    const url = `${API_BASE}/owner/kiosks/${encodeURIComponent(id)}/lock`;
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ enabled, reason }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('LOCK_FAILED', err?.error?.message || 'Gagal mengubah status kunci booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async rotateOwnerKioskApiKey(
    token: string | undefined,
    id: string
  ): Promise<ApiResponse<{ id: string; code: string; apiKey: string }>> {
    const url = `${API_BASE}/owner/kiosks/${encodeURIComponent(id)}/rotate-key`;
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('ROTATE_FAILED', err?.error?.message || 'Gagal merotasi API key booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async resetOwnerKioskHardware(
    token: string | undefined,
    id: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const url = `${API_BASE}/owner/kiosks/${encodeURIComponent(id)}/reset-hardware`;
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('RESET_HARDWARE_FAILED', err?.error?.message || 'Gagal mereset ikatan hardware booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async deleteOwnerKiosk(
    token: string | undefined,
    id: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const url = `${API_BASE}/owner/kiosks/${encodeURIComponent(id)}`;
    try {
      const res = await apiFetch(url, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('DELETE_FAILED', err?.error?.message || 'Gagal menghapus registrasi booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async getAdminPartners(token?: string): Promise<ApiResponse<PartnerItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/partners`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal mengambil data mitra');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async createAdminPartner(
    token: string | undefined,
    data: { name: string; email: string; password: string; phone?: string; revenueSharePct?: number }
  ): Promise<ApiResponse<PartnerItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/partners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('CREATE_FAILED', err?.error?.message || 'Gagal mendaftarkan mitra baru.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async assignKioskToPartner(token: string | undefined, kioskId: string, partnerId: string | null): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/kiosks/${encodeURIComponent(kioskId)}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ partnerId }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('ASSIGN_FAILED', err?.error?.message || 'Gagal menugaskan booth ke mitra.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async updateAdminPartner(
    token: string | undefined,
    id: string,
    data: { name?: string; email?: string; password?: string; phone?: string; revenueSharePct?: number; receiptHeader?: string; receiptFooter?: string; isActive?: boolean }
  ): Promise<ApiResponse<PartnerItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/partners/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal memperbarui data mitra.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async deleteAdminPartner(token: string | undefined, id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/partners/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('DELETE_FAILED', err?.error?.message || 'Gagal menghapus mitra.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  // ==========================================
  // 3. Partner Portal (/partner)
  // ==========================================
  async partnerLogin(email: string, pass: string): Promise<ApiResponse<{ token: string; partner: any }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('LOGIN_FAILED', err?.error?.message || 'Email atau kata sandi mitra salah.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Gagal menghubungi server.');
    }
  }

  async updatePartnerProfile(
    token: string | undefined,
    data: {
      name?: string;
      phone?: string;
      receiptHeader?: string;
      receiptFooter?: string;
      receiptAddress?: string;
      receiptSocial?: string;
      receiptPolicy?: string;
      receiptPaperWidth?: number;
      receiptConfig?: any;
    }
  ): Promise<ApiResponse<PartnerItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal menyimpan profil mitra.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async changePartnerPassword(
    currentPassword: string,
    newPassword: string,
    token?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('CHANGE_PASSWORD_FAILED', err?.error?.message || 'Gagal memperbarui kata sandi mitra.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getPartnerPasses(token?: string, limit = 100): Promise<ApiResponse<AccessCodeItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/passes?limit=${limit}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat riwayat kode kasir');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async createPartnerPass(
    token: string | undefined,
    data: CreatePartnerPassRequest
  ): Promise<ApiResponse<AccessCodeItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/passes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('CREATE_PASS_FAILED', err?.error?.message || 'Gagal menerbitkan kode PASS');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async deletePartnerPass(token: string | undefined, passId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/passes/${encodeURIComponent(passId)}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('DELETE_PASS_FAILED', err?.error?.message || 'Gagal menghapus kode PASS');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async revokePartnerPass(token: string | undefined, passId: string, reason?: string): Promise<ApiResponse<{ success: boolean; message: string; status: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/passes/${encodeURIComponent(passId)}/revoke`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('REVOKE_PASS_FAILED', err?.error?.message || 'Gagal membatalkan kode PASS');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async extendPartnerPass(token: string | undefined, passId: string, hours = 24): Promise<ApiResponse<{ success: boolean; message: string; expiresAt: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/passes/${encodeURIComponent(passId)}/extend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ hours }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('EXTEND_PASS_FAILED', err?.error?.message || 'Gagal memperpanjang kode PASS');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async updatePartnerKioskPaper(token: string | undefined, kioskId: string, paperRemaining?: number, paperTrackingEnabled?: boolean): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/kiosks/${encodeURIComponent(kioskId)}/paper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paperRemaining, paperTrackingEnabled }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal menyesuaikan sisa kertas.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async updatePartnerKiosk(
    token: string | undefined,
    kioskId: string,
    data: { name?: string; location?: string; code?: string; paperRollCapacity?: number }
  ): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/kiosks/${encodeURIComponent(kioskId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal memperbarui booth.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getMyKiosks(token?: string): Promise<ApiResponse<KioskItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/my-kiosks`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat booth milik Anda');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getPartnerOperators(token?: string): Promise<ApiResponse<OperatorItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/operators`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat daftar kasir');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async createPartnerOperator(
    token: string | undefined,
    data: { name: string; username: string; pin: string; kioskId?: string }
  ): Promise<ApiResponse<OperatorItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/operators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('CREATE_FAILED', err?.error?.message || 'Gagal menambahkan kasir baru.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async updatePartnerOperator(
    token: string | undefined,
    id: string,
    data: { name?: string; pin?: string; kioskId?: string | null; isActive?: boolean }
  ): Promise<ApiResponse<OperatorItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/operators/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal memperbarui kasir.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async deletePartnerOperator(
    token: string | undefined,
    id: string
  ): Promise<ApiResponse<{ success: boolean; isSoftDeleted: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/operators/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('DELETE_FAILED', err?.error?.message || 'Gagal menghapus kasir.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getPartnerFinancialAnalytics(
    token: string | undefined,
    params?: { period?: string; startDate?: string; endDate?: string; kioskId?: string }
  ): Promise<ApiResponse<PartnerFinancialAnalyticsResponse>> {
    try {
      const query = new URLSearchParams();
      if (params?.period) query.append('period', params.period);
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      if (params?.kioskId) query.append('kioskId', params.kioskId);

      const res = await apiFetch(`${API_BASE}/partner/financial-analytics?${query.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat analitik finansial mitra');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getPartnerTransactions(
    token: string | undefined,
    params?: { kioskId?: string; startDate?: string; endDate?: string; period?: string; status?: string; search?: string; page?: number; limit?: number }
  ): Promise<ApiResponse<{ items: PartnerTransactionItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>> {
    try {
      const query = new URLSearchParams();
      if (params?.kioskId) query.append('kioskId', params.kioskId);
      if (params?.period) query.append('period', params.period);
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      if (params?.status) query.append('status', params.status);
      if (params?.search) query.append('search', params.search);
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));

      const res = await apiFetch(`${API_BASE}/partner/transactions?${query.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat daftar transaksi');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async exportPartnerTransactionsCsv(
    token: string | undefined,
    params?: { kioskId?: string; startDate?: string; endDate?: string; period?: string; status?: string; search?: string }
  ): Promise<string> {
    try {
      const query = new URLSearchParams();
      if (params?.kioskId) query.append('kioskId', params.kioskId);
      if (params?.period) query.append('period', params.period);
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      if (params?.status) query.append('status', params.status);
      if (params?.search) query.append('search', params.search);

      const res = await apiFetch(`${API_BASE}/partner/transactions/export-csv?${query.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.text();
      return '';
    } catch (e: any) {
      console.error('[CloudApi] Gagal ekspor CSV transaksi:', e);
      return '';
    }
  }

  async getPartnerSessions(
    token: string | undefined,
    params?: { kioskId?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number }
  ): Promise<ApiResponse<{ items: PartnerSessionItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>> {
    try {
      const query = new URLSearchParams();
      if (params?.kioskId) query.append('kioskId', params.kioskId);
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      if (params?.search) query.append('search', params.search);
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));

      const res = await apiFetch(`${API_BASE}/partner/sessions?${query.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat daftar sesi');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getPartnerPackages(token: string | undefined): Promise<ApiResponse<{ packages: PartnerPackageItem[]; kiosks: { id: string; code: string; name: string; disabledPackageIds: string[] }[] }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/packages`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat paket foto');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async createPartnerPackage(
    token: string | undefined,
    data: CreatePartnerPackageRequest
  ): Promise<ApiResponse<PartnerPackageItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('CREATE_PACKAGE_FAILED', err?.error?.message || 'Gagal membuat paket');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async updatePartnerPackage(
    token: string | undefined,
    packageId: string,
    data: Partial<CreatePartnerPackageRequest> & { isActive?: boolean }
  ): Promise<ApiResponse<PartnerPackageItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/packages/${encodeURIComponent(packageId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_PACKAGE_FAILED', err?.error?.message || 'Gagal memperbarui paket');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async deletePartnerPackage(
    token: string | undefined,
    packageId: string
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/packages/${encodeURIComponent(packageId)}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('DELETE_PACKAGE_FAILED', err?.error?.message || 'Gagal menghapus paket');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async updatePartnerKioskPackages(token: string | undefined, kioskId: string, disabledPackageIds: string[]): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/kiosks/${encodeURIComponent(kioskId)}/packages`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ disabledPackageIds }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal memperbarui paket booth.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async remoteResetPartnerKiosk(token: string | undefined, kioskId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/kiosks/${encodeURIComponent(kioskId)}/reset`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('RESET_FAILED', err?.error?.message || 'Gagal mereset booth.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async remoteBypassPartnerKiosk(token: string | undefined, kioskId: string): Promise<ApiResponse<{ success: boolean; mode: string; sessionCode?: string; passCode?: string; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/kiosks/${encodeURIComponent(kioskId)}/bypass`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('BYPASS_FAILED', err?.error?.message || 'Gagal mem-bypass booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async remoteLockPartnerKiosk(token: string | undefined, kioskId: string, isLocked: boolean, reason?: string): Promise<ApiResponse<{ success: boolean; isLocked: boolean; lockReason?: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/kiosks/${encodeURIComponent(kioskId)}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isLocked, reason }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('LOCK_FAILED', err?.error?.message || 'Gagal mengubah status booth.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getPartnerVouchers(token: string | undefined): Promise<ApiResponse<PartnerVoucherItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/vouchers`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat voucher diskon');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async createPartnerVoucher(token: string | undefined, data: CreatePartnerVoucherRequest): Promise<ApiResponse<PartnerVoucherItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/vouchers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('CREATE_FAILED', err?.error?.message || 'Gagal membuat voucher.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async togglePartnerVoucher(token: string | undefined, id: string): Promise<ApiResponse<{ id: string; code: string; isActive: boolean }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/vouchers/${encodeURIComponent(id)}/toggle`, {
        method: 'PATCH',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal mengubah status voucher.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async deletePartnerVoucher(token: string | undefined, id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/vouchers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('DELETE_FAILED', err?.error?.message || 'Gagal menghapus voucher.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  // ==========================================
  // 4. Operator Field Desk (/operator)
  // ==========================================
  async operatorLogin(username: string, pin: string): Promise<ApiResponse<{ token: string; operator: any }>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('LOGIN_FAILED', err?.error?.message || 'Username atau PIN kasir salah.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Gagal menghubungi server.');
    }
  }

  async getOperatorKioskStatus(token?: string): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/kiosk-status`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memeriksa status booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async operatorGeneratePass(
    token: string | undefined,
    data: { packageId?: string; amount?: number; type?: 'SESSION' | 'EXTRA_PRINT'; extraPrints?: number; customerNote?: string }
  ): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/generate-pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('GENERATE_FAILED', err?.error?.message || 'Gagal menerbitkan kode tunai.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getOperatorPasses(token?: string, limit = 50): Promise<ApiResponse<AccessCodeItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/my-passes?limit=${limit}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat riwayat pass');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async updateOperatorPaper(token: string | undefined, paperRemaining: number): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/update-paper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paperRemaining }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal menyesuaikan sisa kertas.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getOperatorRecentSessions(token?: string, limit = 10): Promise<ApiResponse<RecentSessionItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/recent-sessions?limit=${limit}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat sesi terakhir');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async operatorReprintSession(
    token: string | undefined,
    sessionId: string,
    copies = 1,
    reason?: string
  ): Promise<ApiResponse<{ jobId: string; status: string; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/reprint-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, copies, reason }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('REPRINT_FAILED', err?.error?.message || 'Gagal mencetak ulang sesi.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getOperatorShiftSummary(token?: string): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/shift-summary`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat ringkasan shift');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getOperatorPackages(token?: string): Promise<ApiResponse<PackageItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/packages`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped: PackageItem[] = json.data.map((p: any, idx: number) => {
            const b = p.badge?.trim() || p.badgeText?.trim() || (idx === 1 ? 'Paling Populer' : undefined);
            return {
              id: p.id,
              name: p.name,
              badge: b,
              badgeText: b,
              description: p.description || '',
              price: p.price,
              durationSeconds: p.durationSeconds || 180,
              printCopies: p.defaultPrints ?? p.printCopies ?? 1,
              additionalPrintPrice: p.additionalPrintPrice ?? 15000,
              maxPhotos: p.maxShots || p.maxPhotos || 6,
              colorGradient: p.colorGradient || (idx === 1 ? 'from-amber-500 to-amber-600' : 'from-sky-500 to-sky-600'),
              isActive: p.isActive ?? true,
              sortOrder: p.sortOrder ?? idx,
            };
          });
          return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
        }
        return json;
      }
      return errResponse('FETCH_FAILED', 'Gagal memuat katalog paket operator');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }
}

export const cloudApi = new CloudApi();

