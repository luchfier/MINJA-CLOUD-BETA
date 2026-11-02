export enum ErrorCode {
  // General
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CONFLICT = "CONFLICT",
  RATE_LIMITED = "RATE_LIMITED",

  // Admin Auth
  INVALID_PIN = "INVALID_PIN",
  ADMIN_LOCKED_OUT = "ADMIN_LOCKED_OUT",
  PIN_TOO_SHORT = "PIN_TOO_SHORT",
  PIN_CHANGE_REQUIRES_CURRENT = "PIN_CHANGE_REQUIRES_CURRENT",
  ADMIN_NOT_INITIALIZED = "ADMIN_NOT_INITIALIZED",

  // Session
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  INVALID_SESSION_STATE = "INVALID_SESSION_STATE",
  SESSION_ALREADY_COMPLETED = "SESSION_ALREADY_COMPLETED",
  SESSION_ALREADY_CANCELLED = "SESSION_ALREADY_CANCELLED",
  PHOTO_LIMIT_EXCEEDED = "PHOTO_LIMIT_EXCEEDED",

  // Package
  PACKAGE_NOT_FOUND = "PACKAGE_NOT_FOUND",
  PACKAGE_INACTIVE = "PACKAGE_INACTIVE",

  // Payment
  PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND",
  PAYMENT_ALREADY_PROCESSED = "PAYMENT_ALREADY_PROCESSED",
  PAYMENT_EXPIRED = "PAYMENT_EXPIRED",
  MIDTRANS_ERROR = "MIDTRANS_ERROR",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  PRICE_CALCULATION_MISMATCH = "PRICE_CALCULATION_MISMATCH",

  // Hardware
  CAMERA_NOT_FOUND = "CAMERA_NOT_FOUND",
  CAMERA_BUSY = "CAMERA_BUSY",
  CAMERA_CAPTURE_FAILED = "CAMERA_CAPTURE_FAILED",
  PRINTER_OFFLINE = "PRINTER_OFFLINE",
  PRINTER_OUT_OF_PAPER = "PRINTER_OUT_OF_PAPER",
  PRINTER_OUT_OF_RIBBON = "PRINTER_OUT_OF_RIBBON",
  PRINT_JOB_FAILED = "PRINT_JOB_FAILED",

  // Delivery
  EMAIL_FAILED = "EMAIL_FAILED",
  EMAIL_INVALID_ADDRESS = "EMAIL_INVALID_ADDRESS",
  GALLERY_EXPIRED = "GALLERY_EXPIRED",
  STORAGE_UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED"
}

export interface ApiError {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T> =
  | { success: true; data: T; timestamp: string }
  | { success: false; error: ApiError; timestamp: string };

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PendingSyncItem {
  sessionId: string;
  sessionCode: string;
  localFolderPath: string;
  filesCount: number;
  recipientEmail?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  r2Uploaded: boolean;
  databaseSynced: boolean;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  errorMsg?: string;
}

export interface SyncEngineStatus {
  isOnline: boolean;
  isDatabaseConnected: boolean;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  totalQueued: number;
  lastSyncAt: string | null;
  items: PendingSyncItem[];
}

export interface SyncTriggerResult {
  processed: number;
  succeeded: number;
  failed: number;
  status: SyncEngineStatus;
  message: string;
}

export interface SystemTimingConfig {
  syncIntervalSeconds: number;
  cleanupIntervalHours: number;
  printRetentionHours: number;
  galleryRetentionHours: number;
}

export interface TunnelConfig {
  tunnelUrl: string;
  provider: 'cloudflare' | 'custom';
  updatedAt: string;
  isActive: boolean;
}

export interface OwnerTelemetry {
  kioskStatus: 'IDLE' | 'IN_SESSION' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE';
  isMaintenance: boolean;
  maintenanceReason?: string;
  boothName: string;
  activeSession: {
    sessionId: string;
    sessionCode: string;
    packageName: string;
    state: string;
    totalPrice: number;
    totalPrints: number;
  } | null;
  financialToday: {
    totalRevenue: number;
    qrisRevenue: number;
    cashRevenue: number;
    transactionsCount: number;
    totalSessions: number;
    completedSessions: number;
    totalPrints: number;
    estimatedPaperRemaining: number;
    paperRollCapacity: number;
  };
  hardware: {
    selectedPrinter: string;
    isPrinterOnline: boolean;
    detectedPrintersCount: number;
  };
  syncStatus: {
    isOnline: boolean;
    isDatabaseConnected: boolean;
    pendingQueueCount: number;
    failedQueueCount: number;
    lastSyncAt: string | null;
  };
  tunnel: TunnelConfig;
  serverTime: string;
}

export interface OwnerSessionToday {
  id: string;
  sessionCode: string;
  packageName: string;
  state: string;
  totalPrice: number;
  totalAmount?: number;
  customerName?: string;
  kioskId?: string;
  totalPrints: number;
  createdAt: string;
  payment: {
    orderId: string;
    paymentType: string;
    grossAmount: number;
    status: string;
    settlementTime: string | null;
  } | null;
  emailDelivery: {
    status: string;
    email: string;
    sentAt: string | null;
  } | null;
  files: Array<{
    fileName: string;
    url: string;
    sizeBytes: number;
    category: 'Photo Frame' | 'Single Cut' | 'Live Video';
  }>;
}

export interface AccessCodeItem {
  id: string;
  code: string;
  packageId: string | null;
  amount: number;
  type?: 'SESSION' | 'EXTRA_PRINT';
  extraPrints?: number;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  customerNote: string | null;
  cashierName: string;
  operatorName?: string | null;
  operatorUsername?: string | null;
  kioskId?: string | null;
  kioskCode?: string | null;
  kioskName?: string | null;
  packageName?: string;
  expiresAt: string;
  usedAt: string | null;
  usedSessionId: string | null;
  createdAt: string;
  remainingMinutes?: number;
  remainingHours?: number;
  isExpired?: boolean;
  package?: {
    id: string;
    name: string;
    price: number;
  } | null;
  session?: {
    id: string;
    sessionCode: string;
    createdAt: string;
  } | null;
}

export interface CreateAccessCodeRequest {
  packageId?: string | null;
  amount?: number;
  type?: 'SESSION' | 'EXTRA_PRINT';
  extraPrints?: number;
  customerNote?: string | null;
  cashierName?: string;
  expiresInHours?: number;
}

export interface OwnerVoucherItem {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minTransaction: number;
  quota: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateVoucherRequest {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number | null;
  validFrom?: string;
  validUntil: string;
  usageLimit?: number;
  isActive?: boolean;
}

export type TransactionCategory =
  | 'QRIS_MIDTRANS'
  | 'CASH_DESK'
  | 'CASH_PASSCODE'
  | 'EXTRA_PRINTS'
  | 'VOUCHER_PROMO';

export type TransactionStatus =
  | 'SETTLEMENT'
  | 'SETTLED'
  | 'PENDING'
  | 'EXPIRED'
  | 'CANCELLED';

export interface CategorizedTransactionItem {
  id: string;
  orderId: string;
  kioskId?: string | null;
  kioskCode?: string | null;
  kioskName?: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
  category: TransactionCategory;
  categoryLabel: string;
  categoryBadgeColor: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose';
  grossAmount: number;
  baseAmount: number;
  basePrice?: number;
  discountAmount: number;
  voucherCode?: string | null;
  hasVoucher: boolean;
  status: TransactionStatus;
  statusLabel: string;
  isSettled: boolean;
  paymentType: string;
  sessionId: string;
  sessionCode: string;
  packageName: string;
  itemType: 'PACKAGE' | 'EXTRA_PRINT';
  extraPrintsCount: number;
  additionalPrints?: number;
  additionalPrintsCost?: number;
  cashierName?: string;
  accessCode?: string;
  accessPasscode?: string;
  customerNote?: string;
  createdAt: string;
  settlementTime?: string | null;
  settledAt?: string | null;
  isToday: boolean;
}

export interface TransactionSummaryDto {
  totalGrossRevenue: number;
  totalTransactions: number;
  todayGrossRevenue: number;
  todayTransactionsCount: number;
  monthlyGrossRevenue?: number;
  monthlyTransactionsCount?: number;
  periodGrossRevenue?: number;
  periodTransactionsCount?: number;
  periodLabel?: string;
  breakdown: {
    qris: {
      count: number;
      totalRevenue: number;
      percentage: number;
    };
    cashDesk: {
      count: number;
      totalRevenue: number;
      percentage: number;
    };
    cashPasscode: {
      count: number;
      totalRevenue: number;
      percentage: number;
    };
    extraPrints: {
      count: number;
      totalRevenue: number;
      totalPrints: number;
    };
    voucherPromo: {
      count: number;
      totalDiscountGiven: number;
    };
  };
  // Shorthand helpers for direct access
  qris?: { count: number; totalAmount: number };
  cashDesk?: { count: number; totalAmount: number };
  cashPasscode?: { count: number; totalAmount: number };
  extraPrints?: { count: number; totalAmount: number; totalPrints: number };
  voucherPromo?: { voucherUsageCount: number; discountSavings: number };
}

export interface IntegrationConfig {
  kioskCode: string;
  kioskName: string;
  kioskLocation: string;
  boothApiKey?: string;
  isActivated?: boolean;
  midtransServerKey: string;
  midtransClientKey: string;
  midtransIsProduction: boolean;
  hasMidtransServerKey: boolean;
  resendApiKey: string;
  hasResendApiKey: boolean;
  resendFrom: string;
  galleryBaseUrl: string;
  s3Endpoint?: string;
  s3AccessKey?: string;
  hasS3SecretKey?: boolean;
  s3BucketName?: string;
  s3Region?: string;
}

export interface UpdateIntegrationRequest {
  kioskCode?: string;
  kioskName?: string;
  kioskLocation?: string;
  boothApiKey?: string;
  midtransServerKey?: string;
  midtransClientKey?: string;
  midtransIsProduction?: boolean;
  resendApiKey?: string;
  resendFrom?: string;
  s3Endpoint?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3BucketName?: string;
  s3Region?: string;
  galleryBaseUrl?: string;
}

export type KioskStatus = 'ONLINE' | 'OFFLINE' | 'IN_SESSION' | 'PRINTING' | 'MAINTENANCE';

export interface KioskItem {
  id: string;
  code: string;
  name: string;
  location: string;
  apiKey: string;
  status: KioskStatus;
  paperRemaining: number;
  paperRollCapacity: number;
  printerStatus: string | null;
  cameraStatus: string | null;
  isLocked: boolean;
  lockReason: string | null;
  lastHeartbeat: string | null;
  ipAddress: string | null;
  appVersion: string | null;
  partnerId?: string | null;
  partner?: { id: string; name: string } | null;
  disabledPackageIds?: string[] | null;
  createdAt: string;
  updatedAt: string;
  todayRevenue: number;
  todaySessionsCount: number;
}

export interface KioskActivationStatus {
  isActivated: boolean;
  message?: string;
  kiosk?: {
    id?: string;
    code: string;
    name: string;
    location: string;
    status?: string;
    partnerName?: string | null;
  };
}

export interface PartnerItem {
  id: string;
  name: string;
  code?: string;
  email: string;
  rawPassword?: string | null;
  phone?: string | null;
  revenueSharePct: number;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  receiptAddress?: string | null;
  receiptSocial?: string | null;
  receiptPolicy?: string | null;
  receiptPaperWidth?: number | null;
  receiptConfig?: any;
  isActive: boolean;
  kiosksCount: number;
  operatorsCount: number;
  kiosks?: { id: string; code: string; name: string; status: string; paperRemaining: number }[];
  operators?: { id: string; name: string; username: string; isActive: boolean; kioskId?: string | null }[];
  createdAt: string;
}

export interface OperatorItem {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  kioskId?: string | null;
  kioskCode?: string | null;
  kioskName?: string | null;
  kiosk?: { id: string; code: string; name: string } | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface KioskDetailItem {
  kiosk: KioskItem;
  stats: {
    todayGross: number;
    todayPrints: number;
    todaySessionsCount: number;
    totalTransactionsCount: number;
  };
  operators: { id: string; name: string; username: string; isActive: boolean }[];
  packages: any[];
  recentSessions: {
    id: string;
    sessionCode: string;
    packageName: string;
    totalPrice: number;
    state: string;
    photosPrinted: number;
    createdAt: string;
  }[];
}

export interface RecentSessionItem {
  id: string;
  sessionCode: string;
  packageName: string;
  templateName?: string;
  templateThumbnail?: string | null;
  printPreviewUrl?: string | null;
  finalPhotoUrl?: string | null;
  orderId?: string | null;
  customerName?: string | null;
  totalAmount?: number;
  copies?: number;
  totalPrints?: number;
  photosPrinted?: number;
  createdAt: string;
}

// ==========================================
// PARTNER PORTAL EXTENDED INTERFACES
// ==========================================

export interface PartnerFinancialSummary {
  grossRevenue: number;
  netPartnerShare: number;
  minjaRoyalty: number;
  totalSessions: number;
  aov: number;
  totalPaperUsed: number;
  totalExtraPrints: number;
  totalDiscountGiven: number;
}

export interface PartnerPaymentMethodBreakdown {
  qris: { count: number; totalAmount: number; percentage: number };
  cashDesk: { count: number; totalAmount: number; percentage: number };
  cashPass: { count: number; totalAmount: number; percentage: number };
  extraPrints: { count: number; totalAmount: number; percentage: number };
  voucherPromo: { count: number; discountSavings: number };
}

export interface PartnerKioskComparisonItem {
  kioskId: string;
  kioskCode: string;
  kioskName: string;
  status: string;
  paperRemaining: number;
  paperRollCapacity: number;
  grossRevenue: number;
  partnerShare: number;
  sessionsCount: number;
  paperUsed: number;
}

export interface PartnerDailyTrendItem {
  date: string;
  label: string;
  revenue: number;
  partnerShare: number;
  sessionsCount: number;
}

export interface PartnerFinancialAnalyticsResponse {
  period: string;
  periodLabel: string;
  dateRange: { start: string; end: string };
  partner: {
    id: string;
    name: string;
    revenueSharePct: number;
  };
  selectedKioskId: string | null;
  selectedKioskCode: string | null;
  selectedKioskName: string | null;
  summary: PartnerFinancialSummary;
  breakdown: PartnerPaymentMethodBreakdown;
  kiosksComparison: PartnerKioskComparisonItem[];
  dailyTrend: PartnerDailyTrendItem[];
}

export interface PartnerTransactionItem {
  id: string;
  sessionId: string;
  sessionCode: string;
  orderId: string;
  kioskId: string;
  kioskCode: string;
  kioskName: string;
  packageName: string;
  additionalPrints: number;
  grossAmount: number;
  partnerShare: number;
  minjaRoyalty: number;
  paymentMethod: string;
  state: string;
  statusLabel: string;
  photosPrinted: number;
  cashierName: string;
  customerNote: string;
  createdAt: string;
}

export interface PartnerSessionItem {
  id: string;
  sessionCode: string;
  kioskId: string;
  kioskCode: string;
  kioskName: string;
  packageName: string;
  totalPrice: number;
  photosPrinted: number;
  totalPrints: number;
  additionalPrints: number;
  shotsTaken: number;
  state: string;
  hasGallery: boolean;
  galleryToken: string | null;
  emailDeliveryStatus: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PartnerPackageItem {
  id: string;
  name: string;
  description: string;
  price: number;
  durationSeconds: number;
  maxShots: number;
  maxSelections: number;
  totalPrints: number;
  additionalPrintPrice: number;
  isCustom?: boolean;
  partnerId?: string | null;
  isActive?: boolean;
}

export interface CreatePartnerPackageRequest {
  name: string;
  description?: string;
  price: number;
  durationSeconds?: number;
  maxShots?: number;
  maxSelections?: number;
  defaultPrints?: number;
  additionalPrintPrice?: number;
}

export interface CreatePartnerPassRequest {
  packageId?: string | null;
  type?: 'SESSION' | 'EXTRA_PRINT';
  extraPrints?: number;
  kioskId?: string | null;
  amount?: number;
  customerNote?: string;
  cashierName?: string;
  expiresInHours?: number;
}

export interface PartnerVoucherItem {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minTransaction: number;
  quota: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  kioskId?: string | null;
  kioskCode?: string | null;
  kioskName?: string | null;
  createdAt: string;
}

export interface CreatePartnerVoucherRequest {
  code: string;
  name?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number;
  validFrom?: string;
  validUntil: string;
  usageLimit?: number;
  isActive?: boolean;
  kioskId?: string | null;
}

// ==========================================
// SUPER ADMIN / OWNER NETWORK INTERFACES
// ==========================================

export interface NetworkCriticalPaperAlert {
  kioskId: string;
  kioskCode: string;
  kioskName: string;
  partnerName: string;
  paperRemaining: number;
  paperRollCapacity: number;
  isOnline: boolean;
}

export interface NetworkLeaderboardPartner {
  partnerId: string;
  partnerName: string;
  email: string;
  revenueSharePct: number;
  kiosksCount: number;
  grossRevenue: number;
  partnerShare: number;
  minjaRoyalty: number;
  transactionsCount: number;
}

export interface NetworkKioskBreakdownItem {
  kioskId: string;
  kioskCode: string;
  kioskName: string;
  partnerId: string | null;
  partnerName: string;
  status: string;
  paperRemaining: number;
  paperRollCapacity: number;
  grossRevenue: number;
  transactionsCount: number;
}

export interface NetworkFinancialAnalyticsResponse {
  period: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  partnerId: string | null;
  kioskId: string | null;
  summary: {
    grossRevenue: number;
    partnerShare: number;
    minjaRoyalty: number;
    transactionsCount: number;
    totalSessions: number;
    totalPrints: number;
    extraPrintsCount: number;
    extraPrintsRevenue: number;
    voucherDiscountsTotal: number;
    averageOrderValue: number;
  };
  breakdownByChannel: {
    qris: { count: number; total: number };
    cashDesk: { count: number; total: number };
    cashPass: { count: number; total: number };
    extraPrints: { count: number; total: number };
  };
  partnersLeaderboard: NetworkLeaderboardPartner[];
  kiosksBreakdown: NetworkKioskBreakdownItem[];
  criticalPaperAlerts: NetworkCriticalPaperAlert[];
}

export interface PartnerDrilldownDetails {
  partner: {
    id: string;
    name: string;
    email: string;
    rawPassword?: string | null;
    phone?: string | null;
    revenueSharePct: number;
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    isActive: boolean;
    createdAt: string;
  };
  kiosks: Array<{
    id: string;
    code: string;
    name: string;
    location: string;
    status: string;
    paperRemaining: number;
    paperRollCapacity: number;
    isLocked: boolean;
    lockReason?: string | null;
    disabledPackageIds?: string[] | null;
    lastHeartbeat?: string | null;
  }>;
  operators: Array<{
    id: string;
    name: string;
    username: string;
    kioskId?: string | null;
    kioskName?: string;
    isActive: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
  }>;
  vouchers: Array<{
    id: string;
    code: string;
    name?: string | null;
    discountType: string;
    discountValue: number;
    minSpend: number;
    maxDiscount?: number | null;
    validFrom: string;
    validUntil: string;
    usageLimit: number;
    usedCount: number;
    isActive: boolean;
    kioskCode?: string | null;
    kioskName?: string;
  }>;
  packages: Array<{
    id: string;
    name: string;
    price: number;
    shotsCount?: number;
    maxShots?: number;
    printCopies?: number;
    defaultPrints?: number;
    durationSeconds: number;
  }>;
  accessCodes?: Array<{
    id: string;
    code: string;
    amount: number;
    type?: string;
    extraPrints?: number;
    status: string;
    customerNote?: string | null;
    cashierName: string;
    packageName: string;
    kioskCode?: string | null;
    kioskName?: string;
    expiresAt: string;
    usedAt?: string | null;
    createdAt: string;
  }>;
  financialSummary: {
    totalGrossRevenue: number;
    totalPartnerShare: number;
    totalMinjaRoyalty: number;
    totalTransactions: number;
    monthlyGrossRevenue: number;
    monthlyPartnerShare: number;
  };
}

export interface NetworkSessionItem {
  id: string;
  sessionCode: string;
  kioskId: string | null;
  kioskCode: string;
  kioskName: string;
  partnerId: string | null;
  partnerName: string;
  cashierName: string;
  packageName: string;
  totalPrice: number;
  totalPrints: number;
  photosPrinted: number;
  paymentMethod: string;
  paymentStatus: string;
  orderId: string | null;
  state: string;
  createdAt: string;
  emailDelivery: {
    status: string;
    email?: string;
    sentAt?: string | null;
  } | null;
  files: Array<{
    fileName: string;
    url: string;
    sizeBytes: number;
    category: string;
  }>;
}

export interface NetworkSessionsResponse {
  items: NetworkSessionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
