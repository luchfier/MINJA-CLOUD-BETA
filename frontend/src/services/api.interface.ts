import { ApiResponse, PaginatedResponse, SyncEngineStatus, SyncTriggerResult, SystemTimingConfig, KioskItem, KioskStatus } from '../types/api';
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
import { VoucherItem, ValidateVoucherRequest, ValidateVoucherResponse } from '../types/voucher';
import { FontItem, StickerItem } from '../types/assets';

export interface IPhotoboothApi {
  // Public & Customer Endpoints
  getPublicSettings(): Promise<ApiResponse<PublicBrandingConfig>>;
  getPackages(kioskId?: string): Promise<ApiResponse<PackageItem[]>>;
  calculatePrice(req: CalculatePriceRequest): Promise<ApiResponse<CalculatePriceResponse>>;
  validateVoucher(req: ValidateVoucherRequest): Promise<ApiResponse<ValidateVoucherResponse>>;
  createSession(packageId: string): Promise<ApiResponse<CustomerSession>>;
  createPayment(
    sessionId: string,
    paymentMethod?: PaymentMethod,
    voucherCode?: string
  ): Promise<ApiResponse<CreatePaymentResponse>>;
  createExtraPrintsPayment(
    sessionId: string,
    additionalPrints: number,
    paymentMethod?: PaymentMethod
  ): Promise<ApiResponse<CreatePaymentResponse>>;
  checkPaymentStatus(orderId: string): Promise<ApiResponse<PaymentStatusCheckResponse>>;
  cancelSession(sessionId: string): Promise<ApiResponse<{ cancelled: boolean }>>;
  forcePaymentSettlement(orderId: string): Promise<ApiResponse<PaymentStatusCheckResponse>>;
  completeSession(
    sessionId: string,
    selectedPhotoIds: string[],
    templateId?: string
  ): Promise<ApiResponse<{ success: boolean; sessionCode: string }>>;

  // Templates
  getTemplates(): Promise<ApiResponse<TemplateItem[]>>;

  // Creative Assets (Fonts & Stickers)
  getPublicFonts(): Promise<ApiResponse<FontItem[]>>;
  getPublicStickers(): Promise<ApiResponse<StickerItem[]>>;

  // Delivery
  sendEmail(sessionId: string, email: string): Promise<ApiResponse<{ sent: boolean; messageId: string }>>;
  getGalleryUrl(sessionId: string): Promise<ApiResponse<{ qrString: string; galleryUrl: string; expiresAt: string }>>;
  uploadGalleryFile?(
    sessionId: string,
    fileType: 'print_strip' | 'single_photo' | 'animated_gif' | 'live_video',
    dataUrl: string,
    fileName?: string
  ): Promise<ApiResponse<{ id: string; fileType: string; storageUrl: string }>>;
  composeLivePhoto?(
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
  }>>;
  composeSlideshow?(
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
  }>>;

  // Admin Endpoints
  loginAdmin(pin: string): Promise<ApiResponse<{ token: string; expiresIn: number }>>;
  changePin(token: string, currentPin: string, newPin: string): Promise<ApiResponse<{ message: string }>>;
  getAdminSettings(token: string): Promise<ApiResponse<AdminThemeConfig>>;
  updateAdminSettings(token: string, settings: Partial<AdminThemeConfig>): Promise<ApiResponse<AdminThemeConfig>>;
  getAdminPackages(token: string): Promise<ApiResponse<PackageItem[]>>;
  createPackage(token: string, pkg: Omit<PackageItem, 'id'>): Promise<ApiResponse<PackageItem>>;
  updatePackage(token: string, id: string, pkg: Partial<PackageItem>): Promise<ApiResponse<PackageItem>>;
  deletePackage(token: string, id: string): Promise<ApiResponse<{ message: string }>>;
  getAdminTemplates(token: string): Promise<ApiResponse<TemplateItem[]>>;
  createTemplate(token: string, tpl: Omit<TemplateItem, 'id'>): Promise<ApiResponse<TemplateItem>>;
  updateTemplate(token: string, id: string, tpl: Partial<TemplateItem>): Promise<ApiResponse<TemplateItem>>;
  deleteTemplate(token: string, id: string): Promise<ApiResponse<{ message: string }>>;

  // Admin Creative Assets (Fonts & Stickers)
  getAdminFonts(token: string): Promise<ApiResponse<FontItem[]>>;
  createFont(token: string, font: { name: string; fontFamily: string; googleFont?: string; previewText?: string }): Promise<ApiResponse<FontItem>>;
  deleteFont(token: string, id: string): Promise<ApiResponse<{ success: boolean }>>;
  getAdminStickers(token: string): Promise<ApiResponse<StickerItem[]>>;
  createSticker(token: string, sticker: { name: string; category?: string; type: 'emoji' | 'image'; url: string }): Promise<ApiResponse<StickerItem>>;
  deleteSticker(token: string, id: string): Promise<ApiResponse<{ success: boolean }>>;

  // Admin Voucher Endpoints
  getAdminVouchers(token: string): Promise<ApiResponse<VoucherItem[]>>;
  createVoucher(token: string, voucher: Omit<VoucherItem, 'id' | 'usedCount' | 'createdAt'>): Promise<ApiResponse<VoucherItem>>;
  updateVoucher(token: string, id: string, voucher: Partial<VoucherItem>): Promise<ApiResponse<VoucherItem>>;
  deleteVoucher(token: string, id: string): Promise<ApiResponse<{ message: string }>>;

  // Admin Cash Desk & Confirmation Endpoints
  getCashPendingTransactions(token: string): Promise<ApiResponse<CashPendingTransaction[]>>;
  confirmCashPayment(token: string, req: CashConfirmationRequest): Promise<ApiResponse<CashConfirmationResponse>>;
  getCashAuditLogs(token: string): Promise<ApiResponse<CashAuditLogItem[]>>;

  // Reports
  getReportsSummary(token: string, params?: import('../types/reports').ReportFilterParams): Promise<ApiResponse<ReportSummary>>;
  getTransactions(token: string, params?: import('../types/reports').ReportFilterParams): Promise<ApiResponse<PaginatedResponse<TransactionReportItem>>>;
  exportTransactionsCsv(token: string, params?: import('../types/reports').ReportFilterParams): Promise<string>;

  // Auto-Sync & System Engine
  getSyncStatus(): Promise<ApiResponse<SyncEngineStatus>>;
  triggerSyncNow(): Promise<ApiResponse<SyncTriggerResult>>;
  getTimingConfig(): Promise<ApiResponse<SystemTimingConfig>>;
  updateTimingConfig(config: Partial<SystemTimingConfig>): Promise<ApiResponse<SystemTimingConfig & { message?: string }>>;

  // Public Kiosk Status (Lightweight without financial data)
  getKioskPublicStatus(): Promise<ApiResponse<{
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
  }>>;
  ackTestTrigger(id: string): Promise<ApiResponse<{ acknowledged: boolean }>>;

  // Remote Owner Management (Cloudflare Tunnel & Telemetry)
  triggerTestSession(req: { pin: string; packageId?: string; virtualPrint?: boolean }, token?: string): Promise<ApiResponse<{ triggerId: string; virtualPrint: boolean; packageId?: string; message: string }>>;
  getOwnerTelemetry(token?: string): Promise<ApiResponse<import('../types/api').OwnerTelemetry>>;
  getOwnerSessionsToday(limit?: number, token?: string): Promise<ApiResponse<import('../types/api').OwnerSessionToday[]>>;
  toggleKioskLock(enabled: boolean, pin: string, reason?: string, token?: string): Promise<ApiResponse<{ maintenanceMode: boolean; reason?: string; message: string }>>;
  ownerForceSync(token?: string): Promise<ApiResponse<{ processed: number; succeeded: number; failed: number; message: string }>>;
  ownerTriggerCleanup(token?: string): Promise<ApiResponse<{ deleted: number; freedBytes: number; message: string }>>;
  ownerResendEmail(sessionId: string, targetEmail?: string, token?: string): Promise<ApiResponse<{ sent: boolean; message: string }>>;
  ownerTestPrint(token?: string): Promise<ApiResponse<{ success: boolean; message: string }>>;
  getTunnelStatus(token?: string): Promise<ApiResponse<import('../types/api').TunnelConfig>>;
  updateTunnelStatus(tunnelUrl: string, isActive?: boolean, token?: string): Promise<ApiResponse<import('../types/api').TunnelConfig>>;

  // Voucher & Cash Access Code Management
  getOwnerAccessCodes(status?: string, token?: string): Promise<ApiResponse<import('../types/api').AccessCodeItem[]>>;
  createOwnerAccessCode(req: import('../types/api').CreateAccessCodeRequest, token?: string): Promise<ApiResponse<import('../types/api').AccessCodeItem>>;
  revokeOwnerAccessCode(id: string, reason?: string, token?: string): Promise<ApiResponse<import('../types/api').AccessCodeItem>>;
  redeemAccessCode(sessionId: string, code: string): Promise<ApiResponse<{ success: boolean; session: any; accessCode: import('../types/api').AccessCodeItem }>>;
  redeemExtraPrintAccessCode(
    sessionId: string,
    code: string,
    requiredPrints?: number
  ): Promise<ApiResponse<{ success: boolean; session: any; accessCode: import('../types/api').AccessCodeItem; extraPrints: number }>>;
  getOwnerVouchers(token?: string): Promise<ApiResponse<import('../types/api').OwnerVoucherItem[]>>;
  createOwnerVoucher(req: import('../types/api').CreateVoucherRequest, token?: string): Promise<ApiResponse<import('../types/api').OwnerVoucherItem>>;
  toggleOwnerVoucher(id: string, isActive: boolean, token?: string): Promise<ApiResponse<import('../types/api').OwnerVoucherItem>>;
  deleteOwnerVoucher(id: string, token?: string): Promise<ApiResponse<{ success: boolean }>>;

  // Dedicated Transaction Engine Methods
  getOwnerTransactions(
    params?: {
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
  ): Promise<ApiResponse<{ items: import('../types/api').CategorizedTransactionItem[]; total: number; limit: number; offset: number; page?: number; totalPages?: number }>>;
  getOwnerTransactionSummary(
    params?: {
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
  ): Promise<ApiResponse<import('../types/api').TransactionSummaryDto>>;
  exportOwnerTransactionsCsv(
    params?: {
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
  ): Promise<string>;

  // Super Admin Network Operations
  getNetworkFinancialAnalytics(
    params?: { period?: string; startDate?: string; endDate?: string; partnerId?: string; kioskId?: string },
    token?: string
  ): Promise<ApiResponse<import('../types/api').NetworkFinancialAnalyticsResponse>>;
  getPartnerDrilldown(
    partnerId: string,
    token?: string
  ): Promise<ApiResponse<import('../types/api').PartnerDrilldownDetails>>;
  getNetworkSessions(
    params?: { partnerId?: string; kioskId?: string; search?: string; status?: string; page?: number; limit?: number },
    token?: string
  ): Promise<ApiResponse<import('../types/api').NetworkSessionsResponse>>;
  resetOperatorPin(
    operatorId: string,
    newPin: string,
    token?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>>;
  remoteResetKioskSession(
    kioskId: string,
    token?: string
  ): Promise<ApiResponse<{ success: boolean; cancelledSessionsCount: number; message: string }>>;
  updateKioskPackages(
    kioskId: string,
    disabledPackageIds: string[],
    token?: string
  ): Promise<ApiResponse<{ success: boolean; disabledPackageIds: string[]; message: string }>>;

  // Integrations & Kiosk Identity Management
  getAdminIntegrations(token: string): Promise<ApiResponse<import('../types/api').IntegrationConfig>>;
  updateAdminIntegrations(req: import('../types/api').UpdateIntegrationRequest, token: string): Promise<ApiResponse<import('../types/api').IntegrationConfig>>;
  testAdminEmail(testEmail: string, token: string): Promise<ApiResponse<{ sent: boolean; messageId: string; message: string }>>;
  testAdminMidtrans(token: string): Promise<ApiResponse<{ success: boolean; message: string; isProduction: boolean }>>;
  testAdminS3(token: string): Promise<ApiResponse<{ success: boolean; message: string }>>;

  // Multi-Kiosk Fleet Management (Control Tower)
  getOwnerKiosks(token?: string): Promise<ApiResponse<KioskItem[]>>;
  createOwnerKiosk(
    token: string | undefined,
    data: { name: string; location: string; code?: string; paperRollCapacity?: number; partnerId?: string | null }
  ): Promise<ApiResponse<KioskItem>>;
  updateOwnerKiosk(
    token: string | undefined,
    id: string,
    data: { name?: string; location?: string; paperRollCapacity?: number }
  ): Promise<ApiResponse<KioskItem>>;
  toggleOwnerKioskLock(
    token: string | undefined,
    id: string,
    enabled: boolean,
    reason?: string
  ): Promise<ApiResponse<{ id: string; code: string; isLocked: boolean; lockReason: string | null; status: KioskStatus }>>;
  refillOwnerKioskPaper(
    token: string | undefined,
    id: string,
    capacity?: number
  ): Promise<ApiResponse<{ id: string; code: string; paperRemaining: number; paperRollCapacity: number }>>;
  rotateOwnerKioskApiKey(
    token: string | undefined,
    id: string
  ): Promise<ApiResponse<{ id: string; code: string; apiKey: string }>>;
  deleteOwnerKiosk(
    token: string | undefined,
    id: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>>;

  // Kiosk License & Activation
  getKioskActivationStatus(): Promise<ApiResponse<import('../types/api').KioskActivationStatus>>;
  activateKiosk(apiKey: string): Promise<ApiResponse<{ success: boolean; message: string; kiosk: any }>>;

  // Super Admin Partner & Booth Management
  getAdminPartners(token?: string): Promise<ApiResponse<import('../types/api').PartnerItem[]>>;
  createAdminPartner(
    token: string | undefined,
    data: { name: string; email: string; password: string; phone?: string; revenueSharePct?: number }
  ): Promise<ApiResponse<import('../types/api').PartnerItem>>;
  updateAdminPartner(
    token: string | undefined,
    id: string,
    data: { name?: string; email?: string; password?: string; phone?: string; revenueSharePct?: number; receiptHeader?: string; receiptFooter?: string; isActive?: boolean }
  ): Promise<ApiResponse<import('../types/api').PartnerItem>>;
  deleteAdminPartner(
    token: string | undefined,
    id: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>>;
  assignKioskToPartner(token: string | undefined, kioskId: string, partnerId: string | null): Promise<ApiResponse<any>>;
  updateAdminKiosk(
    token: string | undefined,
    id: string,
    data: { name?: string; location?: string; code?: string; paperRollCapacity?: number; partnerId?: string | null }
  ): Promise<ApiResponse<any>>;
  getKioskDetails(token: string | undefined, id: string): Promise<ApiResponse<import('../types/api').KioskDetailItem>>;

  // Partner Portal (Mitra)
  partnerLogin(email: string, pass: string): Promise<ApiResponse<{ token: string; partner: any }>>;
  updatePartnerProfile(
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
  ): Promise<ApiResponse<import('../types/api').PartnerItem>>;
  changePartnerPassword(
    currentPassword: string,
    newPassword: string,
    token?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>>;
  getMyKiosks(token?: string): Promise<ApiResponse<KioskItem[]>>;
  getPartnerPasses(token?: string, limit?: number): Promise<ApiResponse<import('../types/api').AccessCodeItem[]>>;
  createPartnerPass(
    token: string | undefined,
    data: import('../types/api').CreatePartnerPassRequest
  ): Promise<ApiResponse<import('../types/api').AccessCodeItem>>;
  deletePartnerPass(token: string | undefined, passId: string): Promise<ApiResponse<{ success: boolean; message: string }>>;
  revokePartnerPass(token: string | undefined, passId: string, reason?: string): Promise<ApiResponse<{ success: boolean; message: string; status: string }>>;
  extendPartnerPass(token: string | undefined, passId: string, hours?: number): Promise<ApiResponse<{ success: boolean; message: string; expiresAt: string }>>;
  updatePartnerKioskPaper(token: string | undefined, kioskId: string, paperRemaining?: number, paperTrackingEnabled?: boolean): Promise<ApiResponse<any>>;
  updatePartnerKiosk(
    token: string | undefined,
    kioskId: string,
    data: { name?: string; location?: string; code?: string; paperRollCapacity?: number }
  ): Promise<ApiResponse<any>>;
  getPartnerKioskDetails(token: string | undefined, kioskId: string): Promise<ApiResponse<import('../types/api').KioskDetailItem>>;
  getPartnerOperators(token?: string): Promise<ApiResponse<import('../types/api').OperatorItem[]>>;
  createPartnerOperator(
    token: string | undefined,
    data: { name: string; username: string; pin: string; kioskId?: string }
  ): Promise<ApiResponse<import('../types/api').OperatorItem>>;
  updatePartnerOperator(
    token: string | undefined,
    id: string,
    data: { name?: string; pin?: string; kioskId?: string | null; isActive?: boolean }
  ): Promise<ApiResponse<import('../types/api').OperatorItem>>;
  deletePartnerOperator(
    token: string | undefined,
    id: string
  ): Promise<ApiResponse<{ success: boolean; isSoftDeleted: boolean; message: string }>>;
  getPartnerAnalytics(token: string | undefined, params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<any>>;
  getPartnerFinancialAnalytics(
    token: string | undefined,
    params?: { period?: string; startDate?: string; endDate?: string; kioskId?: string }
  ): Promise<ApiResponse<import('../types/api').PartnerFinancialAnalyticsResponse>>;
  getPartnerTransactions(
    token: string | undefined,
    params?: { kioskId?: string; startDate?: string; endDate?: string; period?: string; status?: string; search?: string; page?: number; limit?: number }
  ): Promise<ApiResponse<{ items: import('../types/api').PartnerTransactionItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>>;
  exportPartnerTransactionsCsv(
    token: string | undefined,
    params?: { kioskId?: string; startDate?: string; endDate?: string; period?: string; status?: string; search?: string }
  ): Promise<string>;
  getPartnerSessions(
    token: string | undefined,
    params?: { kioskId?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number }
  ): Promise<ApiResponse<{ items: import('../types/api').PartnerSessionItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>>;
  getPartnerPackages(token: string | undefined): Promise<ApiResponse<{ packages: import('../types/api').PartnerPackageItem[]; kiosks: { id: string; code: string; name: string; disabledPackageIds: string[] }[] }>>;
  createPartnerPackage(
    token: string | undefined,
    data: import('../types/api').CreatePartnerPackageRequest
  ): Promise<ApiResponse<import('../types/api').PartnerPackageItem>>;
  updatePartnerPackage(
    token: string | undefined,
    packageId: string,
    data: Partial<import('../types/api').CreatePartnerPackageRequest> & { isActive?: boolean }
  ): Promise<ApiResponse<import('../types/api').PartnerPackageItem>>;
  deletePartnerPackage(
    token: string | undefined,
    packageId: string
  ): Promise<ApiResponse<{ success: boolean; message?: string }>>;
  updatePartnerKioskPackages(token: string | undefined, kioskId: string, disabledPackageIds: string[]): Promise<ApiResponse<any>>;
  remoteResetPartnerKiosk(token: string | undefined, kioskId: string): Promise<ApiResponse<{ success: boolean; message: string }>>;
  remoteBypassPartnerKiosk(token: string | undefined, kioskId: string): Promise<ApiResponse<{ success: boolean; mode: string; sessionCode?: string; passCode?: string; message: string }>>;
  remoteLockPartnerKiosk(token: string | undefined, kioskId: string, isLocked: boolean, reason?: string): Promise<ApiResponse<{ success: boolean; isLocked: boolean; lockReason?: string }>>;
  getPartnerVouchers(token: string | undefined): Promise<ApiResponse<import('../types/api').PartnerVoucherItem[]>>;
  createPartnerVoucher(token: string | undefined, data: import('../types/api').CreatePartnerVoucherRequest): Promise<ApiResponse<import('../types/api').PartnerVoucherItem>>;
  togglePartnerVoucher(token: string | undefined, id: string): Promise<ApiResponse<{ id: string; code: string; isActive: boolean }>>;
  deletePartnerVoucher(token: string | undefined, id: string): Promise<ApiResponse<{ success: boolean }>>;
  partnerForceSync(token: string | undefined): Promise<ApiResponse<{ processed: number; succeeded: number; failed: number; message: string }>>;

  // Operator Field Desk
  operatorLogin(username: string, pin: string): Promise<ApiResponse<{ token: string; operator: any }>>;
  getOperatorKioskStatus(token?: string): Promise<ApiResponse<any>>;
  operatorGeneratePass(
    token: string | undefined,
    data: { packageId?: string; amount?: number; type?: 'SESSION' | 'EXTRA_PRINT'; extraPrints?: number; customerNote?: string }
  ): Promise<ApiResponse<any>>;
  getOperatorPasses(token?: string, limit?: number): Promise<ApiResponse<import('../types/api').AccessCodeItem[]>>;
  updateOperatorPaper(token: string | undefined, paperRemaining: number): Promise<ApiResponse<any>>;
  getOperatorRecentSessions(token?: string, limit?: number): Promise<ApiResponse<import('../types/api').RecentSessionItem[]>>;
  operatorReprintSession(
    token: string | undefined,
    sessionId: string,
    copies?: number,
    reason?: string
  ): Promise<ApiResponse<{ jobId: string; status: string; message: string }>>;
  getOperatorShiftSummary(token?: string): Promise<ApiResponse<any>>;
  getOperatorPackages(token?: string): Promise<ApiResponse<import('../types/package').PackageItem[]>>;
}





