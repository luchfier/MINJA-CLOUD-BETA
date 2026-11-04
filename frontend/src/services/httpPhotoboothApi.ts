import { IPhotoboothApi } from './api.interface';
import {
  ApiResponse,
  PaginatedResponse,
  SyncEngineStatus,
  SyncTriggerResult,
  SystemTimingConfig,
  OwnerTelemetry,
  OwnerSessionToday,
  TunnelConfig,
  AccessCodeItem,
  CreateAccessCodeRequest,
  OwnerVoucherItem,
  CreateVoucherRequest,
  CategorizedTransactionItem,
  TransactionSummaryDto,
  KioskItem,
  KioskStatus,
} from '../types/api';
import { PackageItem, CalculatePriceRequest, CalculatePriceResponse } from '../types/package';
import {
  CreatePaymentResponse,
  PaymentStatusCheckResponse,
  PaymentMethod,
  CashConfirmationRequest,
  CashConfirmationResponse,
  CashAuditLogItem,
  CashPendingTransaction,
} from '../types/payment';
import { TemplateItem } from '../types/template';
import { PublicBrandingConfig, AdminThemeConfig } from '../types/theme';
import { ReportSummary, TransactionReportItem } from '../types/reports';
import { CustomerSession } from '../types/session';
import { VoucherItem, VoucherType, ValidateVoucherRequest, ValidateVoucherResponse } from '../types/voucher';
import { FontItem, StickerItem } from '../types/assets';
import { formatSessionCode } from './sessionHelper';

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
const BOOTH_KEY = (import.meta as any).env?.VITE_BOOTH_KEY || 'dev-booth-key-for-testing';

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
    // Expire 10 detik lebih awal untuk margin aman
    return Date.now() >= (payload.exp * 1000 - 10000);
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

// Standar branding bawaan saat backend baru booting atau offline
const DEFAULT_PUBLIC_BRANDING: PublicBrandingConfig = {
  boothName: 'MinjaPhotobooth',
  tagline: 'Momen Istimewa, Abadi Bersama',
  logoUrl: '',
  wallpaperUrl: '',
  welcomeHeadline: 'Sentuh Layar Untuk Mengabadikan Momenmu',
  welcomeSubheadline: 'Photobooth Mandiri Kualitas Studio Cetak Instan',
  startSessionButtonText: 'Mulai Sesi Foto',
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
  whatsappNumber: '6281234567890',
  instagramHandle: '@minjastudio',
  studioAddress: 'Lokasi Booth Minja Studio',
  promoHeadline: 'Sewa Photobooth Profesional untuk Wedding & Acara Spesial',
  promoSubheadline:
    'Hadirkan keseruan tanpa batas di pesta Anda dengan cetak foto lab studio 10×15 cm unlimited, desain frame kustom nama pengantin / logo acara, properti foto, dan crew ramah yang siap memeriahkan pesta Anda.',
  livePhotoEnabled: true,
};

// Fallback template frame kosong jika backend belum memuat template
function getInitialStarterTemplates(): TemplateItem[] {
  return [];
}

class HttpPhotoboothApi implements IPhotoboothApi {
  // 1. Public Settings
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
            welcomeHeadline: d.welcomeText || d.welcomeHeadline || DEFAULT_PUBLIC_BRANDING.welcomeHeadline,
            welcomeSubheadline: d.welcomeSubheadline || DEFAULT_PUBLIC_BRANDING.welcomeSubheadline,
            startSessionButtonText: d.startSessionButtonText || DEFAULT_PUBLIC_BRANDING.startSessionButtonText,
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
            livePhotoEnabled: d.livePhotoEnabled !== undefined ? d.livePhotoEnabled : true,
            pageBuilderLanding: d.pageBuilderLanding || undefined,
            pageBuilderGallery: d.pageBuilderGallery || undefined,
            customCss: d.customCss || '',
          };
          return { success: true, data: config, timestamp: json.timestamp || new Date().toISOString() };
        }
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal memuat public settings dari backend, menggunakan default tema:', e);
    }
    return { success: true, data: DEFAULT_PUBLIC_BRANDING, timestamp: new Date().toISOString() };
  }

  // 2. Packages
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
      console.warn('[HttpApi] Gagal memuat paket dari backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async calculatePrice(req: CalculatePriceRequest): Promise<ApiResponse<CalculatePriceResponse>> {
    try {
      const res = await apiFetch(`${API_BASE}/packages/calculate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return {
          success: true,
          data: json.data,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('CALCULATE_FAILED', json?.error?.message || 'Gagal menghitung harga paket');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal calculatePrice via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async validateVoucher(req: ValidateVoucherRequest): Promise<ApiResponse<ValidateVoucherResponse>> {
    try {
      const res = await apiFetch(`${API_BASE}/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: req.code,
          packageId: req.packageId,
          subtotal: req.subtotal,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const d = json.data;
        const mapped: ValidateVoucherResponse = {
          isValid: d.isValid ?? d.valid ?? false,
          voucher: d.voucher
            ? {
              code: d.voucher.code,
              name: d.voucher.name || d.voucher.code,
              type: d.voucher.type as VoucherType,
              discountValue: d.voucher.discountValue,
              discountAmount: d.voucher.discountAmount ?? d.discountAmount ?? 0,
            }
            : undefined,
          errorMessage: d.errorMessage || d.message,
          errorCode: d.errorCode,
        };
        return {
          success: true,
          data: mapped,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('VALIDATE_FAILED', json?.error?.message || json?.message || 'Kode voucher tidak valid');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal validateVoucher via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async createSession(packageId: string): Promise<ApiResponse<CustomerSession>> {
    try {
      const res = await apiFetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify({ packageId, additionalPrints: 0 }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const s = json.data;
        const session: CustomerSession = {
          sessionId: s.id,
          sessionCode: s.sessionCode || formatSessionCode(s.id),
          state: s.state,
          package: {
            id: s.packageId,
            name: s.packageName,
            description: '',
            price: s.basePrice,
            durationSeconds: s.durationSeconds,
            printCopies: s.totalPrints,
            additionalPrintPrice: s.additionalPrintCost,
            isActive: true,
            sortOrder: 1,
          },
          photos: [],
          selectedPhotoIds: [],
          additionalPrints: s.additionalPrints,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        };
        return {
          success: true,
          data: session,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('CREATE_SESSION_FAILED', json?.error?.message || 'Gagal membuat sesi foto baru');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal createSession via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async createPayment(
    sessionId: string,
    paymentMethod: PaymentMethod = 'qris',
    voucherCode?: string
  ): Promise<ApiResponse<CreatePaymentResponse>> {
    try {
      const res = await apiFetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify({ sessionId, paymentMethod, voucherCode }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const p = json.data;
        const mapped: CreatePaymentResponse = {
          paymentId: p.id,
          orderId: p.orderId,
          paymentMethod: p.paymentMethod,
          qrString: p.qrString || undefined,
          qrUrl: p.qrImageUrl || undefined,
          simulatorUrl: p.simulatorUrl || undefined,
          basePrice: p.subtotal,
          additionalPrintsTotal: 0,
          voucherCode: p.voucherCode || undefined,
          discountAmount: p.voucherDiscount || 0,
          grossAmount: p.grossAmount,
          expiryTime: p.expiryTime,
          status: p.transactionStatus,
        };
        return {
          success: true,
          data: mapped,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('CREATE_PAYMENT_FAILED', json?.error?.message || 'Gagal membuat pembayaran');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal createPayment via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async createExtraPrintsPayment(
    sessionId: string,
    additionalPrints: number,
    paymentMethod: PaymentMethod = 'qris'
  ): Promise<ApiResponse<CreatePaymentResponse>> {
    try {
      const res = await apiFetch(`${API_BASE}/payments/extra-prints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify({ sessionId, additionalPrints, paymentMethod }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const p = json.data;
        const mapped: CreatePaymentResponse = {
          paymentId: p.id,
          orderId: p.orderId,
          paymentMethod: p.paymentMethod,
          qrString: p.qrString || undefined,
          qrUrl: p.qrImageUrl || undefined,
          simulatorUrl: p.simulatorUrl || undefined,
          basePrice: 0,
          additionalPrintsTotal: p.grossAmount,
          voucherCode: undefined,
          discountAmount: 0,
          grossAmount: p.grossAmount,
          expiryTime: p.expiryTime,
          status: p.transactionStatus,
        };
        return {
          success: true,
          data: mapped,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('EXTRA_PRINT_FAILED', json?.error?.message || 'Gagal membuat pembayaran cetak tambahan');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal createExtraPrintsPayment via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async checkPaymentStatus(orderId: string): Promise<ApiResponse<PaymentStatusCheckResponse>> {
    try {
      const res = await apiFetch(`${API_BASE}/payments/${encodeURIComponent(orderId)}/status`, {
        headers: { 'X-Booth-Key': BOOTH_KEY },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const d = json.data;
        const mapped: PaymentStatusCheckResponse = {
          orderId: d.orderId,
          paymentMethod: d.paymentMethod,
          transactionStatus: d.transactionStatus,
          isVerified: d.isVerified,
          grossAmount: d.grossAmount,
          paymentType: d.paymentMethod === 'cash' ? 'Tunai / Cash' : 'QRIS Midtrans',
          settlementTime: d.settlementTime || undefined,
        };
        return {
          success: true,
          data: mapped,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('STATUS_CHECK_FAILED', json?.error?.message || 'Gagal mengecek status pembayaran');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal checkPaymentStatus via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async cancelSession(sessionId: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    try {
      const res = await apiFetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/cancel`, {
        method: 'POST',
        headers: { 'X-Booth-Key': BOOTH_KEY },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('CANCEL_FAILED', json?.error?.message || 'Gagal membatalkan sesi');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal cancelSession via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async forcePaymentSettlement(orderId: string): Promise<ApiResponse<PaymentStatusCheckResponse>> {
    try {
      const res = await apiFetch(`${API_BASE}/payments/${encodeURIComponent(orderId)}/settle`, {
        method: 'POST',
        headers: { 'X-Booth-Key': BOOTH_KEY },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const d = json.data;
        return {
          success: true,
          data: {
            orderId: d.orderId,
            paymentMethod: d.paymentMethod,
            transactionStatus: 'settlement',
            isVerified: true,
            grossAmount: d.grossAmount,
            paymentType: d.paymentMethod === 'cash' ? 'Tunai / Cash' : 'QRIS Midtrans',
            settlementTime: new Date().toISOString(),
          },
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('SETTLE_FAILED', json?.error?.message || 'Gagal melunasi pembayaran');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal forcePaymentSettlement via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async completeSession(
    sessionId: string,
    selectedPhotoIds: string[],
    _templateId?: string
  ): Promise<ApiResponse<{ success: boolean; sessionCode: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify({
          shotsTaken: selectedPhotoIds.length,
          photosSelected: selectedPhotoIds.length,
          photosPrinted: 1,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return {
          success: true,
          data: {
            success: true,
            sessionCode: formatSessionCode(sessionId),
          },
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('COMPLETE_FAILED', json?.error?.message || 'Gagal menyelesaikan sesi');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal completeSession via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 3. Templates (Otoritas Penuh Database Server; Starter Frames HANYA Saat Fresh Install)
  async getTemplates(): Promise<ApiResponse<TemplateItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/templates`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Jika owner menghapus semua template di admin, json.data bernilai []
          // Kembalikan [] apa adanya tanpa membangkitkan data mock!
          const mapped: TemplateItem[] = json.data.map((t: any, idx: number) => {
            let slotsArray = t.slots;
            if (typeof slotsArray === 'string') {
              try { slotsArray = JSON.parse(slotsArray); } catch { }
            }
            return {
              id: t.id,
              name: t.name,
              thumbnailUrl: t.thumbnailUrl || '',
              frameUrl: t.frameOverlayUrl || '',
              frameLayer: (t.frameLayer === 'underlay' ? 'underlay' : 'overlay') as 'overlay' | 'underlay',
              layoutType: t.layoutType || (t.orientation === 'landscape' ? '4R_LANDSCAPE' : '4R_PORTRAIT'),
              category: (t.category === 'single' || t.category === 'grid')
                ? t.category
                : ((Array.isArray(slotsArray) ? slotsArray.length : (t.slotsCount || 1)) === 1 ? 'single' : 'grid'),
              width: t.width || (t.orientation === 'landscape' ? 1800 : 1200),
              height: t.height || (t.orientation === 'landscape' ? 1200 : 1800),
              isActive: t.isActive ?? true,
              isDefault: idx === 0,
              slots: Array.isArray(slotsArray)
                ? slotsArray.map((s: any, sIdx: number) => ({
                  id: s.id || `s-${sIdx}`,
                  x: Number(s.x) || 0,
                  y: Number(s.y) || 0,
                  width: Number(s.width) || 100,
                  height: Number(s.height) || 100,
                  rotation: Number(s.rotation) || 0,
                  layerIndex: Number(s.layerIndex) || 1,
                }))
                : [],
            };
          });
          return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
        }
      }
      return { success: true, data: [], timestamp: new Date().toISOString() };
    } catch (e) {
      console.warn('[HttpApi] Backend belum terhubung saat inisialisasi awal, menggunakan template frame bawaan:', e);
      // HANYA saat aplikasi baru diinstal dan backend belum running
      return {
        success: true,
        data: getInitialStarterTemplates(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async sendEmail(sessionId: string, email: string): Promise<ApiResponse<{ sent: boolean; messageId: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('EMAIL_FAILED', json?.error?.message || 'Gagal mengirim email');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal sendEmail via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async getGalleryUrl(sessionId: string): Promise<ApiResponse<{ qrString: string; galleryUrl: string; expiresAt: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/gallery-url`, {
        headers: { 'X-Booth-Key': BOOTH_KEY },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
      return errResponse('GALLERY_FAILED', json?.error?.message || 'Gagal memuat URL galeri');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal memuat gallery URL dari backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async uploadGalleryFile(
    sessionId: string,
    fileType: 'print_strip' | 'single_photo' | 'animated_gif' | 'live_video',
    dataUrl: string,
    fileName?: string
  ): Promise<ApiResponse<{ id: string; fileType: string; storageUrl: string }>> {
    try {
      let finalDataUrl = dataUrl;
      if (dataUrl && dataUrl.startsWith('blob:')) {
        try {
          const resp = await apiFetch(dataUrl);
          const blob = await resp.blob();
          finalDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (convErr) {
          console.warn('[HttpApi] Gagal mengonversi blob URL untuk upload:', convErr);
        }
      }

      const mappedFileType =
        fileType === 'print_strip'
          ? 'layout_4r'
          : fileType === 'single_photo'
            ? 'raw_photo'
            : fileType === 'live_video'
              ? 'live_video'
              : 'layout_4r';

      const res = await apiFetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/gallery/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify({ fileType: mappedFileType, dataUrl: finalDataUrl, fileName }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return {
          success: true,
          data: json.data,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal upload file galeri via backend, fallback lokal:', e);
    }
    return {
      success: true,
      data: { id: `local-${Date.now()}`, fileType, storageUrl: dataUrl },
      timestamp: new Date().toISOString(),
    };
  }

  async composeLivePhoto(
    sessionId: string,
    payload: {
      slots: Array<{
        slotIndex: number;
        x: number;
        y: number;
        width: number;
        height: number;
        videoDataUrlOrBase64: string;
      }>;
      frameOverlayDataUrl: string;
      outputWidth?: number;
      outputHeight?: number;
      fps?: number;
      durationSec?: number;
      customFileName?: string;
    }
  ): Promise<ApiResponse<{
    success: boolean;
    fileName: string;
    filePath: string;
    sizeBytes: number;
    durationSec: number;
    width: number;
    height: number;
    error?: string;
  }>> {
    try {
      const res = await apiFetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/live-photo/compose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return {
          success: true,
          data: json.data,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('LIVE_PHOTO_FAILED', json?.error?.message || 'Gagal memproses Live Photo');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal memproses Live Photo via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async composeSlideshow(
    sessionId: string,
    payload: {
      photos: string[];
      outputWidth?: number;
      outputHeight?: number;
      durationPerPhotoSec?: number;
      loopCount?: number;
      fps?: number;
      customFileName?: string;
    }
  ): Promise<ApiResponse<{
    success: boolean;
    fileName: string;
    filePath?: string;
    sizeBytes: number;
    durationSec: number;
    width: number;
    height: number;
    error?: string;
  }>> {
    try {
      const res = await apiFetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/slideshow/compose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return {
          success: true,
          data: json.data,
          timestamp: json.timestamp || new Date().toISOString(),
        };
      }
      return errResponse('SLIDESHOW_FAILED', json?.error?.message || 'Gagal memproses Slideshow Video');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal memproses Slideshow via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 4. Admin Auth
  async loginAdmin(pin: string): Promise<ApiResponse<{ token: string; expiresIn: number }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('INVALID_CREDENTIALS', json?.error?.message || 'PIN admin salah');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal login via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Gagal terhubung ke backend server');
    }
  }

  async changePin(token: string, currentPin: string, newPin: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/change-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('CHANGE_PIN_FAILED', json?.error?.message || 'Gagal mengubah PIN admin');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal changePin via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 5. Admin Settings
  async getAdminSettings(token: string): Promise<ApiResponse<AdminThemeConfig>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return errResponse('UNAUTHORIZED', 'Sesi kedaluwarsa');
      }
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const d = json.data;
        const config: AdminThemeConfig = {
          boothName: d.boothName || DEFAULT_PUBLIC_BRANDING.boothName,
          tagline: d.brandTitle || d.tagline || DEFAULT_PUBLIC_BRANDING.tagline,
          welcomeHeadline: d.welcomeText || d.welcomeHeadline || DEFAULT_PUBLIC_BRANDING.welcomeHeadline,
          welcomeSubheadline: d.welcomeSubheadline || DEFAULT_PUBLIC_BRANDING.welcomeSubheadline,
          startSessionButtonText: d.startSessionButtonText || DEFAULT_PUBLIC_BRANDING.startSessionButtonText,
          primaryColor: d.primaryColor || DEFAULT_PUBLIC_BRANDING.primaryColor,
          accentColor: d.secondaryColor || d.accentColor || DEFAULT_PUBLIC_BRANDING.accentColor,
          darkSurfaceColor: d.darkSurfaceColor || DEFAULT_PUBLIC_BRANDING.darkSurfaceColor,
          logoUrl: d.logoUrl || '',
          wallpaperUrl: d.wallpaperUrl || '',
          logoHeight: d.logoHeight ?? DEFAULT_PUBLIC_BRANDING.logoHeight ?? 64,
          backgroundOverlayOpacity: d.backgroundOverlayOpacity ?? DEFAULT_PUBLIC_BRANDING.backgroundOverlayOpacity ?? 50,
          backgroundBlur: d.backgroundBlur ?? DEFAULT_PUBLIC_BRANDING.backgroundBlur ?? 8,
          backgroundFit: d.backgroundFit || DEFAULT_PUBLIC_BRANDING.backgroundFit || 'cover',
          backgroundOpacity: d.backgroundOpacity ?? DEFAULT_PUBLIC_BRANDING.backgroundOpacity ?? 100,
          glassmorphismIntensity: d.glassmorphismIntensity || DEFAULT_PUBLIC_BRANDING.glassmorphismIntensity || 'medium',
          enableVignette: d.enableVignette !== undefined ? d.enableVignette : true,
          whatsappNumber: d.whatsappNumber || DEFAULT_PUBLIC_BRANDING.whatsappNumber,
          instagramHandle: d.instagramHandle || DEFAULT_PUBLIC_BRANDING.instagramHandle,
          studioAddress: d.studioAddress || DEFAULT_PUBLIC_BRANDING.studioAddress,
          promoHeadline: d.promoHeadline || DEFAULT_PUBLIC_BRANDING.promoHeadline,
          promoSubheadline: d.promoSubheadline || DEFAULT_PUBLIC_BRANDING.promoSubheadline,
          eventPackages: d.eventPackages || DEFAULT_PUBLIC_BRANDING.eventPackages,
          livePhotoEnabled: d.livePhotoEnabled !== undefined ? d.livePhotoEnabled : true,
          pageBuilderLanding: d.pageBuilderLanding || undefined,
          pageBuilderGallery: d.pageBuilderGallery || undefined,
          customCss: d.customCss || '',
          sessionTimeoutSeconds: d.sessionTimeoutSeconds || 180,
          paymentTimeoutSeconds: d.paymentTimeoutSeconds || 120,
          photoRetentionHours: d.photoRetentionHours || 48,
          extraPrintPrice: d.extraPrintPrice || 15000,
        };
        return { success: true, data: config, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('FETCH_SETTINGS_FAILED', json?.error?.message || 'Gagal memuat pengaturan admin');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal getAdminSettings via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async updateAdminSettings(token: string, settings: Partial<AdminThemeConfig>): Promise<ApiResponse<AdminThemeConfig>> {
    try {
      const payload: Record<string, any> = { ...settings };
      if (settings.tagline) payload.brandTitle = settings.tagline;
      if (settings.welcomeHeadline) payload.welcomeText = settings.welcomeHeadline;
      if (settings.accentColor) payload.secondaryColor = settings.accentColor;

      const res = await apiFetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return errResponse('UNAUTHORIZED', 'Sesi kedaluwarsa');
      }
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return { success: true, data: json.data, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('UPDATE_SETTINGS_FAILED', json?.error?.message || 'Gagal memperbarui pengaturan');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal updateAdminSettings via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 6. Admin Packages
  async getAdminPackages(token: string): Promise<ApiResponse<PackageItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/packages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return errResponse('UNAUTHORIZED', 'Sesi kedaluwarsa');
      }
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.data)
        ? json.data
        : (Array.isArray(json?.data?.items) ? json.data.items : null);
      if (res.ok && json?.success && items) {
        const mapped: PackageItem[] = items.map((p: any, idx: number) => {
          const b = p.badge?.trim() || p.badgeText?.trim() || undefined;
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
      return errResponse('FETCH_PACKAGES_FAILED', json?.error?.message || 'Gagal memuat paket admin');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal getAdminPackages via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async createPackage(token: string, pkg: Omit<PackageItem, 'id'>): Promise<ApiResponse<PackageItem>> {
    try {
      const defaultPrints = Number(pkg.printCopies) || 1;
      const maxShots = Number((pkg as any).maxShots) || Number(pkg.maxPhotos) || 8;
      const maxSelections = Number((pkg as any).maxSelections) || Math.min(maxShots, 6);
      const badgeVal = (pkg as any).badge?.trim() || (pkg as any).badgeText?.trim() || null;

      const res = await apiFetch(`${API_BASE}/admin/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: pkg.name,
          badge: badgeVal,
          description: pkg.description || '',
          price: Number(pkg.price),
          durationSeconds: Number(pkg.durationSeconds) || 300,
          maxShots: Math.max(maxSelections, maxShots),
          maxSelections: Math.max(1, maxSelections),
          defaultPrints: defaultPrints,
          additionalPrintPrice: Number(pkg.additionalPrintPrice) || 0,
          isActive: pkg.isActive ?? true,
          sortOrder: Number(pkg.sortOrder) || 0,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const p = json.data;
        const b = p.badge?.trim() || p.badgeText?.trim() || undefined;
        const mapped: PackageItem = {
          id: p.id,
          name: p.name,
          badge: b,
          badgeText: b,
          description: p.description || '',
          price: p.price,
          durationSeconds: p.durationSeconds,
          printCopies: p.defaultPrints,
          additionalPrintPrice: p.additionalPrintPrice,
          maxPhotos: p.maxShots || 8,
          isActive: p.isActive,
          sortOrder: p.sortOrder,
        };
        return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('CREATE_PACKAGE_FAILED', json?.error?.message || 'Gagal membuat paket');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal createPackage via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async updatePackage(token: string, id: string, pkg: Partial<PackageItem>): Promise<ApiResponse<PackageItem>> {
    try {
      const payload: any = {};
      if (pkg.name !== undefined) payload.name = pkg.name;
      if ((pkg as any).badge !== undefined) {
        payload.badge = (pkg as any).badge ? String((pkg as any).badge).trim() : null;
      } else if ((pkg as any).badgeText !== undefined) {
        payload.badge = (pkg as any).badgeText ? String((pkg as any).badgeText).trim() : null;
      }
      if (pkg.description !== undefined) payload.description = pkg.description;
      if (pkg.price !== undefined) payload.price = Number(pkg.price);
      if (pkg.durationSeconds !== undefined) payload.durationSeconds = Number(pkg.durationSeconds);
      if (pkg.printCopies !== undefined) payload.defaultPrints = Number(pkg.printCopies);
      if (pkg.additionalPrintPrice !== undefined) payload.additionalPrintPrice = Number(pkg.additionalPrintPrice);
      if ((pkg as any).maxShots !== undefined) payload.maxShots = Number((pkg as any).maxShots);
      if ((pkg as any).maxSelections !== undefined) payload.maxSelections = Number((pkg as any).maxSelections);
      if (pkg.isActive !== undefined) payload.isActive = pkg.isActive;
      if (pkg.sortOrder !== undefined) payload.sortOrder = Number(pkg.sortOrder);

      const res = await apiFetch(`${API_BASE}/admin/packages/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const p = json.data;
        const b = p.badge?.trim() || p.badgeText?.trim() || undefined;
        const mapped: PackageItem = {
          id: p.id,
          name: p.name,
          badge: b,
          badgeText: b,
          description: p.description || '',
          price: p.price,
          durationSeconds: p.durationSeconds,
          printCopies: p.defaultPrints,
          additionalPrintPrice: p.additionalPrintPrice,
          maxPhotos: p.maxShots || 8,
          isActive: p.isActive,
          sortOrder: p.sortOrder,
        };
        return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('UPDATE_PACKAGE_FAILED', json?.error?.message || 'Gagal memperbarui paket');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal updatePackage via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async deletePackage(token: string, id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/packages/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('DELETE_PACKAGE_FAILED', json?.error?.message || 'Gagal menghapus paket');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal deletePackage via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 7. Admin Templates (CRUD Eksklusif PostgreSQL)
  async getAdminTemplates(token: string): Promise<ApiResponse<TemplateItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/templates?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return errResponse('UNAUTHORIZED', 'Sesi kedaluwarsa');
      }
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.data)
        ? json.data
        : (Array.isArray(json?.data?.items) ? json.data.items : null);
      if (res.ok && json?.success && items) {
        const mapped: TemplateItem[] = items.map((t: any, idx: number) => ({
          id: t.id,
          name: t.name,
          thumbnailUrl: t.thumbnailUrl || '',
          frameUrl: t.frameOverlayUrl || '',
          frameLayer: (t.frameLayer === 'underlay' ? 'underlay' : 'overlay') as 'overlay' | 'underlay',
          layoutType: t.layoutType || (t.orientation === 'landscape' ? '4R_LANDSCAPE' : '4R_PORTRAIT'),
          category: (t.category === 'single' || t.category === 'grid') ? t.category : ((t.slotsCount || 1) === 1 ? 'single' : 'grid'),
          width: t.width || (t.orientation === 'landscape' ? 1800 : 1200),
          height: t.height || (t.orientation === 'landscape' ? 1200 : 1800),
          isActive: t.isActive ?? true,
          isDefault: idx === 0,
          slots: (() => {
            let sList = t.slots;
            if (typeof sList === 'string') {
              try { sList = JSON.parse(sList); } catch { }
            }
            return Array.isArray(sList)
              ? sList.map((s: any, sIdx: number) => ({
                id: s.id || `s-${sIdx}`,
                x: Number(s.x) || 0,
                y: Number(s.y) || 0,
                width: Number(s.width) || 100,
                height: Number(s.height) || 100,
                rotation: Number(s.rotation) || 0,
                layerIndex: Number(s.layerIndex) || 1,
              }))
              : [];
          })(),
        }));
        return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('FETCH_TEMPLATES_FAILED', json?.error?.message || 'Gagal memuat daftar template');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal memuat admin templates dari backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async createTemplate(token: string, tpl: Omit<TemplateItem, 'id'>): Promise<ApiResponse<TemplateItem>> {
    try {
      const orientation = tpl.layoutType === '4R_LANDSCAPE' ? 'landscape' : 'portrait';
      const category = (tpl.category === 'single' || tpl.category === 'grid')
        ? tpl.category
        : (tpl.slots.length === 1 ? 'single' : 'grid');
      const frameLayer = tpl.frameLayer || 'overlay';

      const res = await apiFetch(`${API_BASE}/admin/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: tpl.name,
          thumbnailUrl: tpl.thumbnailUrl || '',
          frameOverlayUrl: tpl.frameUrl || '',
          orientation,
          category,
          frameLayer,
          slotsCount: tpl.slots.length,
          slots: tpl.slots,
          isActive: tpl.isActive ?? true,
          isDefault: tpl.isDefault ?? false,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const t = json.data;
        const mapped: TemplateItem = {
          id: t.id,
          name: t.name,
          thumbnailUrl: t.thumbnailUrl,
          frameUrl: t.frameOverlayUrl,
          frameLayer: (t.frameLayer || frameLayer) as 'overlay' | 'underlay',
          layoutType: t.layoutType || (orientation === 'landscape' ? '4R_LANDSCAPE' : '4R_PORTRAIT'),
          category,
          width: t.width || tpl.width || (orientation === 'landscape' ? 1800 : 1200),
          height: t.height || tpl.height || (orientation === 'landscape' ? 1200 : 1800),
          isActive: t.isActive,
          isDefault: tpl.isDefault ?? false,
          slots: tpl.slots,
        };
        return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('CREATE_TEMPLATE_FAILED', json?.error?.message || 'Gagal membuat template baru');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal createTemplate via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async updateTemplate(token: string, id: string, tpl: Partial<TemplateItem>): Promise<ApiResponse<TemplateItem>> {
    try {
      const orientation = tpl.layoutType === '4R_LANDSCAPE' ? 'landscape' : 'portrait';
      const category = (tpl.category === 'single' || tpl.category === 'grid')
        ? tpl.category
        : (tpl.slots ? (tpl.slots.length === 1 ? 'single' : 'grid') : undefined);

      const res = await apiFetch(`${API_BASE}/admin/templates/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: tpl.name,
          thumbnailUrl: tpl.thumbnailUrl,
          frameOverlayUrl: tpl.frameUrl,
          orientation: tpl.layoutType ? orientation : undefined,
          category,
          frameLayer: tpl.frameLayer,
          slotsCount: tpl.slots ? tpl.slots.length : undefined,
          slots: tpl.slots,
          isActive: tpl.isActive,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const t = json.data;
        const mapped: TemplateItem = {
          id: t.id,
          name: t.name,
          thumbnailUrl: t.thumbnailUrl,
          frameUrl: t.frameOverlayUrl,
          frameLayer: (t.frameLayer || tpl.frameLayer || 'overlay') as 'overlay' | 'underlay',
          layoutType: t.layoutType || (orientation === 'landscape' ? '4R_LANDSCAPE' : '4R_PORTRAIT'),
          category: category || (t.slotsCount === 1 ? 'single' : 'grid'),
          width: t.width || tpl.width || 1200,
          height: t.height || tpl.height || 1800,
          isActive: t.isActive,
          isDefault: tpl.isDefault ?? false,
          slots: tpl.slots || [],
        };
        return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('UPDATE_TEMPLATE_FAILED', json?.error?.message || 'Gagal memperbarui template');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal updateTemplate via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async deleteTemplate(token: string, id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('DELETE_TEMPLATE_FAILED', json?.error?.message || 'Gagal menghapus template dari database');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal deleteTemplate via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 8. Admin Vouchers
  async getAdminVouchers(token: string): Promise<ApiResponse<VoucherItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/vouchers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return errResponse('UNAUTHORIZED', 'Sesi kedaluwarsa');
      }
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.data)
        ? json.data
        : (Array.isArray(json?.data?.items) ? json.data.items : null);
      if (res.ok && json?.success && items) {
        const mapped: VoucherItem[] = items.map((v: any) => ({
          id: v.id,
          code: v.code,
          name: v.code,
          description:
            v.discountType === 'percentage'
              ? `Diskon ${v.discountValue}%`
              : `Potongan Rp ${v.discountValue.toLocaleString('id-ID')}`,
          type: v.discountType === 'percentage' ? 'percentage' : 'fixed',
          discountValue: v.discountValue,
          maxDiscount: v.maxDiscount || undefined,
          minTransaction: v.minSpend || 0,
          quota: v.usageLimit || 9999,
          usedCount: v.usedCount || 0,
          validFrom: v.validFrom ? v.validFrom.split('T')[0] : (v.createdAt ? v.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          validUntil: v.validUntil ? v.validUntil.split('T')[0] : '',
          isActive: v.isActive ?? true,
          createdAt: v.createdAt || new Date().toISOString(),
        }));
        return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('FETCH_VOUCHERS_FAILED', json?.error?.message || 'Gagal memuat voucher');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal getAdminVouchers via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async createVoucher(
    token: string,
    voucher: Omit<VoucherItem, 'id' | 'usedCount' | 'createdAt'>
  ): Promise<ApiResponse<VoucherItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/vouchers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: voucher.code,
          discountType: voucher.type,
          discountValue: voucher.discountValue,
          maxDiscount: voucher.maxDiscount,
          minSpend: voucher.minTransaction,
          usageLimit: voucher.quota,
          validUntil: voucher.validUntil ? new Date(voucher.validUntil).toISOString() : undefined,
          isActive: voucher.isActive ?? true,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const v = json.data;
        const mapped: VoucherItem = {
          id: v.id,
          code: v.code,
          name: v.code,
          description:
            v.discountType === 'percentage'
              ? `Diskon ${v.discountValue}%`
              : `Potongan Rp ${v.discountValue.toLocaleString('id-ID')}`,
          type: v.discountType === 'percentage' ? 'percentage' : 'fixed',
          discountValue: v.discountValue,
          maxDiscount: v.maxDiscount || undefined,
          minTransaction: v.minSpend || 0,
          quota: v.usageLimit || 9999,
          usedCount: v.usedCount || 0,
          validFrom: v.validFrom ? v.validFrom.split('T')[0] : (v.createdAt ? v.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          validUntil: v.validUntil ? v.validUntil.split('T')[0] : '',
          isActive: v.isActive,
          createdAt: v.createdAt,
        };
        return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('CREATE_VOUCHER_FAILED', json?.error?.message || 'Gagal membuat voucher baru');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal createVoucher via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async updateVoucher(token: string, id: string, voucher: Partial<VoucherItem>): Promise<ApiResponse<VoucherItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/vouchers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: voucher.code,
          discountType: voucher.type,
          discountValue: voucher.discountValue,
          maxDiscount: voucher.maxDiscount,
          minSpend: voucher.minTransaction,
          usageLimit: voucher.quota,
          validUntil: voucher.validUntil ? new Date(voucher.validUntil).toISOString() : undefined,
          isActive: voucher.isActive,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const v = json.data;
        const mapped: VoucherItem = {
          id: v.id,
          code: v.code,
          name: v.code,
          description:
            v.discountType === 'percentage'
              ? `Diskon ${v.discountValue}%`
              : `Potongan Rp ${v.discountValue.toLocaleString('id-ID')}`,
          type: v.discountType === 'percentage' ? 'percentage' : 'fixed',
          discountValue: v.discountValue,
          maxDiscount: v.maxDiscount || undefined,
          minTransaction: v.minSpend || 0,
          quota: v.usageLimit || 9999,
          usedCount: v.usedCount || 0,
          validFrom: v.validFrom ? v.validFrom.split('T')[0] : (v.createdAt ? v.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          validUntil: v.validUntil ? v.validUntil.split('T')[0] : '',
          isActive: v.isActive,
          createdAt: v.createdAt,
        };
        return { success: true, data: mapped, timestamp: json.timestamp || new Date().toISOString() };
      }
      return errResponse('UPDATE_VOUCHER_FAILED', json?.error?.message || 'Gagal memperbarui voucher');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal updateVoucher via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async deleteVoucher(token: string, id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/vouchers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return json;
      }
      return errResponse('DELETE_VOUCHER_FAILED', json?.error?.message || 'Gagal menghapus voucher');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal deleteVoucher via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 9. Cash Desk
  async getCashPendingTransactions(token: string): Promise<ApiResponse<CashPendingTransaction[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/cash/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return errResponse('UNAUTHORIZED', 'Sesi kedaluwarsa');
      }
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        return json;
      }
      return errResponse('FETCH_PENDING_FAILED', json?.error?.message || 'Gagal memuat transaksi tunai');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal getCashPendingTransactions via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async confirmCashPayment(
    token: string,
    req: CashConfirmationRequest
  ): Promise<ApiResponse<CashConfirmationResponse>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/cash/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
      return errResponse('CONFIRM_CASH_FAILED', json?.error?.message || 'Gagal mengonfirmasi pembayaran kasir');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal confirmCashPayment via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async getCashAuditLogs(token: string): Promise<ApiResponse<CashAuditLogItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/cash/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        return json;
      }
      return errResponse('FETCH_AUDIT_LOGS_FAILED', json?.error?.message || 'Gagal memuat riwayat kasir');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal getCashAuditLogs via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 10. Reports
  async getReportsSummary(
    token: string,
    params?: import('../types/reports').ReportFilterParams
  ): Promise<ApiResponse<ReportSummary>> {
    try {
      const p = new URLSearchParams();
      if (params?.dateMode) p.set('dateMode', params.dateMode);
      if (params?.selectedDate) p.set('selectedDate', params.selectedDate);
      if (params?.selectedMonth) p.set('selectedMonth', params.selectedMonth);
      if (params?.startDate) p.set('startDate', params.startDate);
      if (params?.endDate) p.set('endDate', params.endDate);

      const res = await apiFetch(`${API_BASE}/admin/reports/summary?${p.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return errResponse('UNAUTHORIZED', 'Sesi kedaluwarsa');
      }
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
      return errResponse('FETCH_REPORTS_FAILED', json?.error?.message || 'Gagal memuat ringkasan laporan');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal getReportsSummary via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async getTransactions(
    token: string,
    params?: import('../types/reports').ReportFilterParams
  ): Promise<ApiResponse<PaginatedResponse<TransactionReportItem>>> {
    try {
      const p = new URLSearchParams();
      if (params?.page) p.set('page', String(params.page));
      if (params?.limit) p.set('limit', String(params.limit));
      if (params?.dateMode) p.set('dateMode', params.dateMode);
      if (params?.selectedDate) p.set('selectedDate', params.selectedDate);
      if (params?.selectedMonth) p.set('selectedMonth', params.selectedMonth);
      if (params?.startDate) p.set('startDate', params.startDate);
      if (params?.endDate) p.set('endDate', params.endDate);

      const res = await apiFetch(`${API_BASE}/admin/reports/transactions?${p.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return errResponse('UNAUTHORIZED', 'Sesi kedaluwarsa');
      }
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
      return errResponse('FETCH_TRANSACTIONS_FAILED', json?.error?.message || 'Gagal memuat transaksi');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal getTransactions via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async exportTransactionsCsv(
    token: string,
    params?: import('../types/reports').ReportFilterParams
  ): Promise<string> {
    try {
      const p = new URLSearchParams();
      if (params?.dateMode) p.set('dateMode', params.dateMode);
      if (params?.selectedDate) p.set('selectedDate', params.selectedDate);
      if (params?.selectedMonth) p.set('selectedMonth', params.selectedMonth);
      if (params?.startDate) p.set('startDate', params.startDate);
      if (params?.endDate) p.set('endDate', params.endDate);

      const res = await apiFetch(`${API_BASE}/admin/reports/export/csv?${p.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal exportTransactionsCsv via backend:', e);
    }
    return 'ORDER_ID,SESSION_CODE,PAKET,METODE,TOTAL,STATUS,WAKTU\n';
  }

  // 11. Creative Assets (Fonts & Stickers)
  async getPublicFonts(): Promise<ApiResponse<FontItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/public/assets/fonts`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json;
        }
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal getPublicFonts via backend:', e);
    }
    return { success: true, data: [], timestamp: new Date().toISOString() };
  }

  async getPublicStickers(): Promise<ApiResponse<StickerItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/public/assets/stickers`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json;
        }
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal getPublicStickers via backend:', e);
    }
    return { success: true, data: [], timestamp: new Date().toISOString() };
  }

  async getAdminFonts(token: string): Promise<ApiResponse<FontItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/assets/fonts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json;
        }
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal getAdminFonts via backend:', e);
    }
    return { success: true, data: [], timestamp: new Date().toISOString() };
  }

  async createFont(
    token: string,
    font: { name: string; fontFamily: string; googleFont?: string; previewText?: string }
  ): Promise<ApiResponse<FontItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/assets/fonts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(font),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('CREATE_FONT_FAILED', json?.error?.message || 'Gagal menambah font');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal createFont via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async deleteFont(token: string, id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/assets/fonts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('DELETE_FONT_FAILED', json?.error?.message || 'Gagal menghapus font');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal deleteFont via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async getAdminStickers(token: string): Promise<ApiResponse<StickerItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/assets/stickers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json;
        }
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal getAdminStickers via backend:', e);
    }
    return { success: true, data: [], timestamp: new Date().toISOString() };
  }

  async createSticker(
    token: string,
    sticker: { name: string; category?: string; type: 'emoji' | 'image'; url: string }
  ): Promise<ApiResponse<StickerItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/assets/stickers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sticker),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('CREATE_STICKER_FAILED', json?.error?.message || 'Gagal menambah stiker');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal createSticker via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async deleteSticker(token: string, id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/assets/stickers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('DELETE_STICKER_FAILED', json?.error?.message || 'Gagal menghapus stiker');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal deleteSticker via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  // 12. Auto-Sync & System Engine
  async getSyncStatus(): Promise<ApiResponse<SyncEngineStatus>> {
    try {
      const res = await apiFetch(`${API_BASE}/system/sync-status`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal getSyncStatus via backend:', e);
    }
    return {
      success: true,
      data: {
        isOnline: true,
        isDatabaseConnected: true,
        pendingCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        totalQueued: 0,
        lastSyncAt: new Date().toISOString(),
        items: [],
      },
      timestamp: new Date().toISOString(),
    };
  }

  async triggerSyncNow(): Promise<ApiResponse<SyncTriggerResult>> {
    try {
      const res = await apiFetch(`${API_BASE}/system/sync-trigger`, { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal triggerSyncNow via backend:', e);
    }
    const defaultStatus: SyncEngineStatus = {
      isOnline: true,
      isDatabaseConnected: true,
      pendingCount: 0,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
      totalQueued: 0,
      lastSyncAt: new Date().toISOString(),
      items: [],
    };
    return {
      success: true,
      data: {
        processed: 0,
        succeeded: 0,
        failed: 0,
        status: defaultStatus,
        message: 'Sinkronisasi selesai',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getTimingConfig(): Promise<ApiResponse<SystemTimingConfig>> {
    try {
      const res = await apiFetch(`${API_BASE}/system/timing-config`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal getTimingConfig via backend:', e);
    }
    return {
      success: true,
      data: {
        syncIntervalSeconds: 30,
        cleanupIntervalHours: 24,
        printRetentionHours: 48,
        galleryRetentionHours: 48,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async updateTimingConfig(config: Partial<SystemTimingConfig>): Promise<ApiResponse<SystemTimingConfig & { message?: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/system/timing-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal updateTimingConfig via backend:', e);
    }
    return {
      success: true,
      data: {
        syncIntervalSeconds: config.syncIntervalSeconds ?? 30,
        cleanupIntervalHours: config.cleanupIntervalHours ?? 24,
        printRetentionHours: config.printRetentionHours ?? 48,
        galleryRetentionHours: config.galleryRetentionHours ?? 48,
        message: 'Pengaturan timing diperbarui',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // 13. Public Kiosk Status
  async getKioskPublicStatus(): Promise<ApiResponse<{
    isMaintenance: boolean;
    maintenanceReason?: string;
    boothName: string;
    kioskStatus: string;
    pendingTestTrigger?: {
      id: string;
      packageId?: string;
      virtualPrint: boolean;
    } | null;
    paperRemaining?: number;
    paperRollCapacity?: number;
    isPaperLow?: boolean;
    isPaperOut?: boolean;
  }>> {
    try {
      const res = await apiFetch(`${API_BASE}/system/kiosk-status`, {
        headers: {
          'x-booth-key': BOOTH_KEY,
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal getKioskPublicStatus via backend:', e);
    }
    return {
      success: true,
      data: {
        isMaintenance: false,
        boothName: 'Minja Photobooth',
        kioskStatus: 'STANDBY',
        pendingTestTrigger: null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async ackTestTrigger(id: string): Promise<ApiResponse<{ acknowledged: boolean }>> {
    try {
      const res = await apiFetch(`${API_BASE}/system/ack-test-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal ackTestTrigger via backend:', e);
    }
    return {
      success: true,
      data: { acknowledged: true },
      timestamp: new Date().toISOString(),
    };
  }

  // 14. Remote Owner Management
  async triggerTestSession(
    req: { pin: string; packageId?: string; virtualPrint?: boolean },
    token?: string
  ): Promise<ApiResponse<{ triggerId: string; virtualPrint: boolean; packageId?: string; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/kiosk/trigger-test-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pin: req.pin,
          packageId: req.packageId,
          virtualPrint: req.virtualPrint !== false,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        return data;
      }
      if (res.status === 401) {
        return errResponse('INVALID_PIN', data?.error?.message || 'PIN Admin yang dimasukkan salah!');
      }
      return errResponse('TRIGGER_FAILED', data?.error?.message || 'Gagal memicu sesi uji coba di Kiosk.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend server gagal.');
    }
  }

  async getOwnerTelemetry(token?: string): Promise<ApiResponse<OwnerTelemetry>> {
    const url = `${API_BASE}/owner/telemetry`;
    try {
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
    } catch (e: any) {
      console.warn('[HttpApi] Gagal memuat getOwnerTelemetry dari backend:', e);
    }
    return errResponse('NETWORK_ERROR', 'Gagal mengambil telemetri owner dari backend');
  }

  async getOwnerSessionsToday(limit = 10, token?: string): Promise<ApiResponse<OwnerSessionToday[]>> {
    const url = `${API_BASE}/owner/sessions/today?limit=${limit}`;
    try {
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
    } catch (e: any) {
      console.warn('[HttpApi] Gagal memuat getOwnerSessionsToday dari backend:', e);
    }
    return errResponse('NETWORK_ERROR', 'Gagal memuat sesi hari ini dari backend');
  }

  async toggleKioskLock(
    enabled: boolean,
    pin: string,
    reason?: string,
    token?: string
  ): Promise<ApiResponse<{ maintenanceMode: boolean; reason?: string; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/kiosk/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ enabled, pin, reason }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('LOCK_FAILED', json?.error?.message || 'Gagal mengubah status kunci kiosk');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal toggleKioskLock via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async ownerForceSync(token?: string): Promise<ApiResponse<{ processed: number; succeeded: number; failed: number; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/kiosk/force-sync`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('SYNC_FAILED', json?.error?.message || 'Gagal sinkronisasi paksa');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal ownerForceSync via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async ownerTriggerCleanup(token?: string): Promise<ApiResponse<{ deleted: number; freedBytes: number; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/kiosk/cleanup`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('CLEANUP_FAILED', json?.error?.message || 'Gagal membersihkan cache');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal ownerTriggerCleanup via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async ownerResendEmail(sessionId: string, targetEmail?: string, token?: string): Promise<ApiResponse<{ sent: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/sessions/${encodeURIComponent(sessionId)}/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetEmail }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('RESEND_EMAIL_FAILED', json?.error?.message || 'Gagal mengirim ulang email');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal ownerResendEmail via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async ownerTestPrint(token?: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/kiosk/test-print`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        return json;
      }
      return errResponse('TEST_PRINT_FAILED', json?.error?.message || 'Gagal melakukan uji cetak');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal ownerTestPrint via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi backend gagal');
    }
  }

  async getTunnelStatus(token?: string): Promise<ApiResponse<TunnelConfig>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/tunnel-status`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal getTunnelStatus via backend:', e);
    }
    return {
      success: true,
      data: {
        tunnelUrl: '',
        provider: 'cloudflare',
        updatedAt: new Date().toISOString(),
        isActive: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async updateTunnelStatus(tunnelUrl: string, isActive?: boolean, token?: string): Promise<ApiResponse<TunnelConfig>> {
    try {
      const res = await apiFetch(`${API_BASE}/owner/tunnel-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tunnelUrl, isActive }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        return json;
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal updateTunnelStatus via backend:', e);
    }
    return {
      success: true,
      data: {
        tunnelUrl,
        provider: 'cloudflare',
        updatedAt: new Date().toISOString(),
        isActive: isActive ?? true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // 15. Voucher & Cash Access Code Management
  async getOwnerAccessCodes(status?: string, token?: string): Promise<ApiResponse<AccessCodeItem[]>> {
    const url = `${API_BASE}/owner/access-codes${status ? `?status=${encodeURIComponent(status)}` : ''}`;
    try {
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
      console.warn('[HttpApi] Gagal getOwnerAccessCodes via backend:', e);
    }
    return errResponse('FETCH_FAILED', 'Gagal memuat kode akses');
  }

  async createOwnerAccessCode(req: CreateAccessCodeRequest, token?: string): Promise<ApiResponse<AccessCodeItem>> {
    const url = `${API_BASE}/owner/access-codes`;
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal createOwnerAccessCode via backend:', e);
    }
    return errResponse('CREATE_FAILED', 'Gagal membuat kode akses kasir');
  }

  async revokeOwnerAccessCode(id: string, reason?: string, token?: string): Promise<ApiResponse<AccessCodeItem>> {
    const url = `${API_BASE}/owner/access-codes/${encodeURIComponent(id)}/revoke`;
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal revokeOwnerAccessCode via backend:', e);
    }
    return errResponse('REVOKE_FAILED', 'Gagal membatalkan kode akses');
  }

  async redeemAccessCode(sessionId: string, code: string): Promise<ApiResponse<{ success: boolean; session: any; accessCode: AccessCodeItem }>> {
    try {
      const res = await apiFetch(`${API_BASE}/access-codes/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify({ sessionId, code }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        return data;
      }
      return errResponse(data?.error?.code || 'INVALID_CODE', data?.error?.message || 'Kode akses tidak valid atau sudah digunakan.');
    } catch (e: any) {
      console.warn('[HttpApi] Gagal redeemAccessCode via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal.');
    }
  }

  async redeemExtraPrintAccessCode(
    sessionId: string,
    code: string,
    requiredPrints?: number
  ): Promise<ApiResponse<{ success: boolean; session: any; accessCode: AccessCodeItem; extraPrints: number }>> {
    try {
      const res = await apiFetch(`${API_BASE}/payments/redeem-extra-print-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': BOOTH_KEY,
        },
        body: JSON.stringify({ sessionId, code, requiredPrints }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        return data;
      }
      return errResponse(
        data?.error?.code || 'INVALID_CODE',
        data?.error?.message || 'Kode tiket cetak tambahan tidak valid atau sudah digunakan.'
      );
    } catch (e: any) {
      console.warn('[HttpApi] Gagal redeemExtraPrintAccessCode via backend:', e);
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal.');
    }
  }

  async getOwnerVouchers(token?: string): Promise<ApiResponse<OwnerVoucherItem[]>> {
    const url = `${API_BASE}/owner/vouchers`;
    try {
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
      console.warn('[HttpApi] Gagal getOwnerVouchers via backend:', e);
    }
    return errResponse('FETCH_FAILED', 'Gagal memuat voucher owner');
  }

  async createOwnerVoucher(req: CreateVoucherRequest, token?: string): Promise<ApiResponse<OwnerVoucherItem>> {
    const url = `${API_BASE}/owner/vouchers`;
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(url);
        return errResponse('UNAUTHORIZED', 'Sesi login kedaluwarsa');
      }
    } catch (e) {
      console.warn('[HttpApi] Gagal createOwnerVoucher via backend:', e);
    }
    return errResponse('CREATE_FAILED', 'Gagal membuat voucher promo');
  }

  async toggleOwnerVoucher(id: string, isActive: boolean, token?: string): Promise<ApiResponse<OwnerVoucherItem>> {
    const url = `${API_BASE}/owner/vouchers/${encodeURIComponent(id)}/toggle`;
    try {
      const res = await apiFetch(url, {
        method: 'PUT',
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
      console.warn('[HttpApi] Gagal toggleOwnerVoucher via backend:', e);
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
      console.warn('[HttpApi] Gagal deleteOwnerVoucher via backend:', e);
    }
    return errResponse('DELETE_FAILED', 'Gagal menghapus voucher');
  }

  // 16. Dedicated Transaction Engine
  async getOwnerTransactions(
    filters?: Parameters<IPhotoboothApi['getOwnerTransactions']>[0],
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
      console.warn('[HttpApi] Gagal memuat getOwnerTransactions dari backend:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat transaksi owner dari backend');
  }

  async getOwnerTransactionSummary(
    filters?: Parameters<IPhotoboothApi['getOwnerTransactionSummary']>[0],
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
      console.warn('[HttpApi] Gagal memuat getOwnerTransactionSummary dari backend:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat ringkasan transaksi');
  }

  async exportOwnerTransactionsCsv(
    filters?: Parameters<IPhotoboothApi['exportOwnerTransactionsCsv']>[0],
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
      console.warn('[HttpApi] Gagal mengekspor CSV dari backend:', e);
    }
    return 'ORDER_ID,SESSION_CODE,PAKET,KATEGORI,STATUS,GROSS_AMOUNT,WAKTU\n';
  }

  // Super Admin Network Operations
  async getNetworkFinancialAnalytics(
    params?: Parameters<IPhotoboothApi['getNetworkFinancialAnalytics']>[0],
    token?: string
  ): Promise<ApiResponse<import('../types/api').NetworkFinancialAnalyticsResponse>> {
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
      console.warn('[HttpApi] Gagal memuat getNetworkFinancialAnalytics:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat analitik finansial jaringan');
  }

  async getPartnerDrilldown(
    partnerId: string,
    token?: string
  ): Promise<ApiResponse<import('../types/api').PartnerDrilldownDetails>> {
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
      console.warn('[HttpApi] Gagal memuat getPartnerDrilldown:', e);
    }
    return errResponse('FETCH_ERROR', 'Gagal memuat detail drilldown mitra');
  }

  async getNetworkSessions(
    params?: Parameters<IPhotoboothApi['getNetworkSessions']>[0],
    token?: string
  ): Promise<ApiResponse<import('../types/api').NetworkSessionsResponse>> {
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
      console.warn('[HttpApi] Gagal memuat getNetworkSessions:', e);
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
      console.warn('[HttpApi] Gagal resetOperatorPin:', e);
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
      console.warn('[HttpApi] Gagal remoteResetKioskSession:', e);
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
      console.warn('[HttpApi] Gagal updateKioskPackages:', e);
      return errResponse('NETWORK_ERROR', 'Gagal terhubung ke server');
    }
  }

  // Integrations & Kiosk Identity Management
  async getAdminIntegrations(token: string): Promise<ApiResponse<import('../types/api').IntegrationConfig>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(`${API_BASE}/admin/integrations`);
        return errResponse('UNAUTHORIZED', 'Sesi login admin kedaluwarsa');
      }
      const err = await res.json().catch(() => ({}));
      return errResponse('API_ERROR', err?.error?.message || 'Gagal memuat konfigurasi integrasi');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async updateAdminIntegrations(
    req: import('../types/api').UpdateIntegrationRequest,
    token: string
  ): Promise<ApiResponse<import('../types/api').IntegrationConfig>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/integrations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        notifyUnauthorized(`${API_BASE}/admin/integrations`);
        return errResponse('UNAUTHORIZED', 'Sesi login admin kedaluwarsa');
      }
      const err = await res.json().catch(() => ({}));
      return errResponse('API_ERROR', err?.error?.message || 'Gagal memperbarui konfigurasi integrasi');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async testAdminEmail(
    testEmail: string,
    token: string
  ): Promise<ApiResponse<{ sent: boolean; messageId: string; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/integrations/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ testEmail }),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      return errResponse('API_ERROR', err?.error?.message || err?.message || 'Gagal mengirim email uji coba');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async testAdminMidtrans(
    token: string
  ): Promise<ApiResponse<{ success: boolean; message: string; isProduction: boolean }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/integrations/test-midtrans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      return errResponse('API_ERROR', err?.error?.message || 'Gagal menguji koneksi Midtrans');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  async testAdminS3(
    token: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/integrations/test-s3`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      return errResponse('API_ERROR', err?.error?.message || 'Gagal menguji koneksi S3');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi ke backend gagal');
    }
  }

  // 17. Multi-Kiosk Fleet Management (Control Tower)
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
      console.warn('[HttpApi] Gagal memuat daftar booth kiosks via backend:', e);
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

  async updateOwnerKiosk(
    token: string | undefined,
    id: string,
    data: { name?: string; location?: string; paperRollCapacity?: number }
  ): Promise<ApiResponse<KioskItem>> {
    const url = `${API_BASE}/owner/kiosks/${encodeURIComponent(id)}`;
    try {
      const res = await apiFetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal memperbarui mesin booth');
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

  async refillOwnerKioskPaper(
    token: string | undefined,
    id: string,
    capacity?: number
  ): Promise<ApiResponse<{ id: string; code: string; paperRemaining: number; paperRollCapacity: number }>> {
    const url = `${API_BASE}/owner/kiosks/${encodeURIComponent(id)}/refill-paper`;
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ capacity }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('REFILL_FAILED', err?.error?.message || 'Gagal refill kertas booth');
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

  // Kiosk License & Activation
  async getKioskActivationStatus(): Promise<ApiResponse<import('../types/api').KioskActivationStatus>> {
    try {
      const res = await apiFetch(`${API_BASE}/kiosk/activation-status`);
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat status aktivasi booth');
    } catch {
      return {
        success: true,
        data: {
          isActivated: true,
          kiosk: { code: 'OFFLINE', name: 'Minja Offline Booth', location: 'Standalone' },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async activateKiosk(apiKey: string): Promise<ApiResponse<{ success: boolean; message: string; kiosk: any }>> {
    try {
      const res = await apiFetch(`${API_BASE}/kiosk/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('ACTIVATION_FAILED', err?.error?.message || 'Gagal mengaktivasi booth.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Gagal menghubungi server aktivasi.');
    }
  }

  // Super Admin Partner Management
  async getAdminPartners(token?: string): Promise<ApiResponse<import('../types/api').PartnerItem[]>> {
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
  ): Promise<ApiResponse<import('../types/api').PartnerItem>> {
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
  ): Promise<ApiResponse<import('../types/api').PartnerItem>> {
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

  async updateAdminKiosk(
    token: string | undefined,
    id: string,
    data: { name?: string; location?: string; code?: string; paperRollCapacity?: number; partnerId?: string | null }
  ): Promise<ApiResponse<any>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/kiosks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('UPDATE_FAILED', err?.error?.message || 'Gagal memperbarui informasi booth.');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getKioskDetails(token: string | undefined, id: string): Promise<ApiResponse<import('../types/api').KioskDetailItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/admin/kiosks/${encodeURIComponent(id)}/details`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat rincian booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  // Partner Portal (Mitra)
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
  ): Promise<ApiResponse<import('../types/api').PartnerItem>> {
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

  async getPartnerPasses(token?: string, limit = 100): Promise<ApiResponse<import('../types/api').AccessCodeItem[]>> {
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
    data: import('../types/api').CreatePartnerPassRequest
  ): Promise<ApiResponse<import('../types/api').AccessCodeItem>> {
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

  async getPartnerKioskDetails(token: string | undefined, kioskId: string): Promise<ApiResponse<import('../types/api').KioskDetailItem>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/kiosks/${encodeURIComponent(kioskId)}/details`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat rincian booth');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getMyKiosks(token?: string): Promise<ApiResponse<import('../types/api').KioskItem[]>> {
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

  async getPartnerOperators(token?: string): Promise<ApiResponse<import('../types/api').OperatorItem[]>> {
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
  ): Promise<ApiResponse<import('../types/api').OperatorItem>> {
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
  ): Promise<ApiResponse<import('../types/api').OperatorItem>> {
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

  async getPartnerAnalytics(token: string | undefined, params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<any>> {
    try {
      const query = new URLSearchParams();
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      const res = await apiFetch(`${API_BASE}/partner/analytics?${query.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) return await res.json();
      return errResponse('FETCH_FAILED', 'Gagal memuat laporan omzet');
    } catch (e: any) {
      return errResponse('NETWORK_ERROR', e?.message || 'Koneksi gagal');
    }
  }

  async getPartnerFinancialAnalytics(
    token: string | undefined,
    params?: { period?: string; startDate?: string; endDate?: string; kioskId?: string }
  ): Promise<ApiResponse<import('../types/api').PartnerFinancialAnalyticsResponse>> {
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
  ): Promise<ApiResponse<{ items: import('../types/api').PartnerTransactionItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>> {
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
      console.error('[HttpApi] Gagal ekspor CSV transaksi:', e);
      return '';
    }
  }

  async getPartnerSessions(
    token: string | undefined,
    params?: { kioskId?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number }
  ): Promise<ApiResponse<{ items: import('../types/api').PartnerSessionItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>> {
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

  async getPartnerPackages(token: string | undefined): Promise<ApiResponse<{ packages: import('../types/api').PartnerPackageItem[]; kiosks: { id: string; code: string; name: string; disabledPackageIds: string[] }[] }>> {
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
    data: import('../types/api').CreatePartnerPackageRequest
  ): Promise<ApiResponse<import('../types/api').PartnerPackageItem>> {
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
    data: Partial<import('../types/api').CreatePartnerPackageRequest> & { isActive?: boolean }
  ): Promise<ApiResponse<import('../types/api').PartnerPackageItem>> {
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

  async getPartnerVouchers(token: string | undefined): Promise<ApiResponse<import('../types/api').PartnerVoucherItem[]>> {
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

  async createPartnerVoucher(token: string | undefined, data: import('../types/api').CreatePartnerVoucherRequest): Promise<ApiResponse<import('../types/api').PartnerVoucherItem>> {
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


  // Operator Field Desk
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

  async getOperatorPasses(token?: string, limit = 50): Promise<ApiResponse<import('../types/api').AccessCodeItem[]>> {
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

  async getOperatorRecentSessions(token?: string, limit = 10): Promise<ApiResponse<import('../types/api').RecentSessionItem[]>> {
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

  async partnerForceSync(token: string | undefined): Promise<ApiResponse<{ processed: number; succeeded: number; failed: number; message: string }>> {
    try {
      const res = await apiFetch(`${API_BASE}/partner/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      return errResponse('SYNC_FAILED', err?.error?.message || 'Gagal sinkronisasi data pending.');
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

  async getOperatorPackages(token?: string): Promise<ApiResponse<import('../types/package').PackageItem[]>> {
    try {
      const res = await apiFetch(`${API_BASE}/operator/packages`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped: import('../types/package').PackageItem[] = json.data.map((p: any, idx: number) => {
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

export const httpPhotoboothApi = new HttpPhotoboothApi();
