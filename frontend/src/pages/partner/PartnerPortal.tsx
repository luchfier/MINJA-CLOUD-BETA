// frontend/src/pages/partner/PartnerPortal.tsx
// Portal Manajemen Mitra Resmi MinjaPhotobooth — Enterprise Franchise Management
// Tampilan Ultra-Modern Liquid Glassmorphism & 100% Mobile Responsive
// Fitur Komprehensif:
// 1. Dashboard Finansial Utama (Flagship): Filter Hari/Bulan/Kustom, Filter per Booth, 5 KPI, Multi-Channel Breakdown, Ekspor CSV
// 2. Kelola Voucher Promo: Buat Kupon Diskon Spesifik Booth / Semua Booth, Kuota, Masa Berlaku, Toggle Aktif
// 3. Monitor Sesi Pelanggan: Feed Sesi Real-time per Booth, Status Foto Cetak, Galeri & Email
// 4. Kelola Paket: Aktifkan / Nonaktifkan Paket Foto per Booth
// 5. Kendali Booth Lengkap: Reset Sesi Darurat (Bypass), Mode Pemeliharaan (Kunci Booth), Refill Kertas, Edit Profil Booth
// 6. Manajemen Akun Operator Kasir Lapangan (Penugasan Spesifik Operator -> Booth)
// 7. Audit Riwayat Kode Akses Tunai (PASS)
// 8. Kustomisasi Struk Thermal Kasir

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ThermalReceiptSettingsTab = lazy(() =>
  import('./components/ThermalReceiptSettingsTab').then((m) => ({ default: m.ThermalReceiptSettingsTab }))
);
import {
  Printer,
  Users,
  Lock,
  Unlock,
  RefreshCw,
  LogOut,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  UploadCloud,
  Receipt,
  Building2,
  Edit,
  KeyRound,
  X,
  Ticket,
  Sparkles,
  Search,
  Layers,
  BarChart3,
  Check,
  Trash2,
  Power,
  ChevronDown,
  FileSpreadsheet,
  Monitor,
  Smartphone,
  ChevronRight,
  Clock,
  Copy,
  Share2,
  Eye,
  Ban,
  FileText,
  Zap,
} from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';
import { isJwtExpired } from '../../services/httpPhotoboothApi';
import { ExecutiveSummaryModal } from '../../components/admin/ExecutiveSummaryModal';
import { usePwaInstall } from '../../utils/usePwaInstall';
import {
  KioskItem,
  OperatorItem,
  PartnerItem,
  AccessCodeItem,
  PartnerFinancialAnalyticsResponse,
  PartnerTransactionItem,
  PartnerSessionItem,
  PartnerPackageItem,
  PartnerVoucherItem,
} from '../../types/api';

type TabKey = 'analytics' | 'vouchers' | 'sessions' | 'packages' | 'kiosks' | 'operators' | 'passes' | 'receipt';

export const PartnerPortal: React.FC = () => {
  // Auth state
  const [partnerToken, setPartnerToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('minja_partner_token');
    if (saved && !isJwtExpired(saved)) {
      return saved;
    }
    localStorage.removeItem('minja_partner_token');
    localStorage.removeItem('minja_partner_info');
    return null;
  });
  const [partnerInfo, setPartnerInfo] = useState<PartnerItem | null>(() => {
    const saved = localStorage.getItem('minja_partner_info');
    return saved ? JSON.parse(saved) : null;
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab — DEFAULT TO 'analytics' (Fitur Finansial Utama)
  const [activeTab, setActiveTab] = useState<TabKey>('analytics');

  // Shared Data States
  const [myKiosks, setMyKiosks] = useState<KioskItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [isSyncingPending, setIsSyncingPending] = useState(false);

  // Tangkap event 401 Unauthorized secara terpusat & watchdog kedaluwarsa JWT proaktif
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('minja_partner_token');
      localStorage.removeItem('minja_partner_info');
      setPartnerToken(null);
      setPartnerInfo(null);
      setLoginError('Sesi login telah kedaluwarsa. Silakan masukkan kata sandi kembali.');
    };

    window.addEventListener('minja:unauthorized', handleUnauthorized);

    const checkTokenExpiry = () => {
      const saved = localStorage.getItem('minja_partner_token');
      if (saved && isJwtExpired(saved)) {
        handleUnauthorized();
      }
    };

    const intervalId = setInterval(checkTokenExpiry, 30000);
    window.addEventListener('visibilitychange', checkTokenExpiry);

    return () => {
      window.removeEventListener('minja:unauthorized', handleUnauthorized);
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', checkTokenExpiry);
    };
  }, []);

  // ==========================================
  // DEVICE & USER-AGENT AUTO DETECTION ENGINE
  // ==========================================
  const getDetectedMode = (): 'desktop' | 'mobile' => {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
    const isNarrow = window.innerWidth < 1024;
    return (isMobileUA || isNarrow) ? 'mobile' : 'desktop';
  };

  const [devicePref, setDevicePref] = useState<'auto' | 'desktop' | 'mobile'>(() => {
    return (localStorage.getItem('minja_partner_device_pref') as any) || 'auto';
  });
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>(() => {
    const pref = localStorage.getItem('minja_partner_device_pref');
    if (pref === 'desktop' || pref === 'mobile') return pref;
    return getDetectedMode();
  });
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const handleResize = () => {
      if (devicePref === 'auto') {
        setDeviceMode(getDetectedMode());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [devicePref]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDeviceModeChange = (pref: 'auto' | 'desktop' | 'mobile') => {
    setDevicePref(pref);
    localStorage.setItem('minja_partner_device_pref', pref);
    if (pref === 'auto') {
      setDeviceMode(getDetectedMode());
    } else {
      setDeviceMode(pref);
    }
  };

  // ==========================================
  // TAB 1: FINANCIAL ANALYTICS STATES
  // ==========================================
  const [financialPeriod, setFinancialPeriod] = useState<string>('today');
  const [financialKioskId, setFinancialKioskId] = useState<string>('ALL');
  const [financialStartDate, setFinancialStartDate] = useState<string>('');
  const [financialEndDate, setFinancialEndDate] = useState<string>('');
  const [financialData, setFinancialData] = useState<PartnerFinancialAnalyticsResponse | null>(null);
  const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);

  // Transactions list inside Financial tab
  const [transactions, setTransactions] = useState<PartnerTransactionItem[]>([]);
  const [txSearch, setTxSearch] = useState<string>('');
  const [txStatus, setTxStatus] = useState<string>('ALL');
  const [txPage, setTxPage] = useState<number>(1);
  const [txTotalPages, setTxTotalPages] = useState<number>(1);
  const [txTotal, setTxTotal] = useState<number>(0);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const { isInstallable, triggerInstall } = usePwaInstall();

  // ==========================================
  // TAB 2: VOUCHERS STATES
  // ==========================================
  const [vouchers, setVouchers] = useState<PartnerVoucherItem[]>([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [showCreateVoucherModal, setShowCreateVoucherModal] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherName, setVoucherName] = useState('');
  const [voucherType, setVoucherType] = useState<'percentage' | 'fixed'>('percentage');
  const [voucherValue, setVoucherValue] = useState('10');
  const [voucherMaxDiscount, setVoucherMaxDiscount] = useState('15000');
  const [voucherMinSpend, setVoucherMinSpend] = useState('35000');
  const [voucherQuota, setVoucherQuota] = useState('50');
  const [voucherValidUntil, setVoucherValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [voucherTargetKioskId, setVoucherTargetKioskId] = useState('');
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);

  // ==========================================
  // TAB 3: CUSTOMER SESSIONS STATES
  // ==========================================
  const [sessions, setSessions] = useState<PartnerSessionItem[]>([]);
  const [sessionKioskFilter, setSessionKioskFilter] = useState('ALL');
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotalPages, setSessionTotalPages] = useState(1);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // ==========================================
  // TAB 4: PACKAGES MANAGEMENT STATES
  // ==========================================
  const [packagesList, setPackagesList] = useState<PartnerPackageItem[]>([]);
  const [packageKiosksData, setPackageKiosksData] = useState<{ id: string; code: string; name: string; disabledPackageIds: string[] }[]>([]);
  const [selectedPackageKioskId, setSelectedPackageKioskId] = useState<string>('');
  const [disabledPkgIds, setDisabledPkgIds] = useState<string[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [isSavingPackages, setIsSavingPackages] = useState(false);

  // Custom Package Modal States
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PartnerPackageItem | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgPrice, setPkgPrice] = useState('45000');
  const [pkgDuration, setPkgDuration] = useState('300');
  const [pkgMaxShots, setPkgMaxShots] = useState('8');
  const [pkgMaxSelections, setPkgMaxSelections] = useState('4');
  const [pkgTotalPrints, setPkgTotalPrints] = useState('2');
  const [pkgAdditionalPrintPrice, setPkgAdditionalPrintPrice] = useState('10000');
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);

  // ==========================================
  // TAB 5 & SHARED: KIOSKS & OPERATORS STATES
  // ==========================================
  const [myOperators, setMyOperators] = useState<OperatorItem[]>([]);
  const [myPasses, setMyPasses] = useState<AccessCodeItem[]>([]);

  // PASS Generation & Drilldown States
  const [showCreatePassModal, setShowCreatePassModal] = useState(false);
  const [passType, setPassType] = useState<'SESSION' | 'EXTRA_PRINT'>('SESSION');
  const [passPackageId, setPassPackageId] = useState<string>('');
  const [passExtraPrints, setPassExtraPrints] = useState<number>(1);
  const [passKioskId, setPassKioskId] = useState<string>('ALL');
  const [passAmount, setPassAmount] = useState<string>('45000');
  const [passCustomerNote, setPassCustomerNote] = useState<string>('');
  const [passCashierName, setPassCashierName] = useState<string>('');
  const [passExpiresInHours, setPassExpiresInHours] = useState<number>(24);
  const [isCreatingPass, setIsCreatingPass] = useState(false);
  const [createdPassResult, setCreatedPassResult] = useState<AccessCodeItem | null>(null);
  const [selectedPassDetail, setSelectedPassDetail] = useState<AccessCodeItem | null>(null);

  // Pass management states (delete, revoke, extend)
  const [passToDelete, setPassToDelete] = useState<AccessCodeItem | null>(null);
  const [isDeletingPass, setIsDeletingPass] = useState(false);
  const [passToRevoke, setPassToRevoke] = useState<AccessCodeItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevokingPass, setIsRevokingPass] = useState(false);
  const [passToExtend, setPassToExtend] = useState<AccessCodeItem | null>(null);
  const [extendHours, setExtendHours] = useState<number>(24);
  const [isExtendingPass, setIsExtendingPass] = useState(false);

  // Modal create operator
  const [showCreateOpModal, setShowCreateOpModal] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [newOpUsername, setNewOpUsername] = useState('');
  const [newOpPin, setNewOpPin] = useState('');
  const [newOpKioskId, setNewOpKioskId] = useState('');
  const [isCreatingOp, setIsCreatingOp] = useState(false);

  // Modal edit operator
  const [editingOperator, setEditingOperator] = useState<OperatorItem | null>(null);
  const [editOpName, setEditOpName] = useState('');
  const [editOpPin, setEditOpPin] = useState('');
  const [editOpKioskId, setEditOpKioskId] = useState('');
  const [editOpActive, setEditOpActive] = useState(true);
  const [isUpdatingOp, setIsUpdatingOp] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<OperatorItem | null>(null);
  const [isDeletingOp, setIsDeletingOp] = useState(false);

  // Change Password Modal States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Refill / Manual Paper adjustment modal
  const [paperModalKiosk, setPaperModalKiosk] = useState<KioskItem | null>(null);
  const [paperInputSheets, setPaperInputSheets] = useState('400');
  const [isSavingPaper, setIsSavingPaper] = useState(false);

  // Remote lock modal
  const [lockKiosk, setLockKiosk] = useState<KioskItem | null>(null);
  const [lockReason, setLockReason] = useState('Pengisian ulang kertas / pemeliharaan berkala');
  const [isLocking, setIsLocking] = useState(false);

  // Remote Reset confirmation modal
  const [resetKioskTarget, setResetKioskTarget] = useState<KioskItem | null>(null);
  const [isResettingKiosk, setIsResettingKiosk] = useState(false);

  // Remote Bypass Booth confirmation modal
  const [bypassKioskTarget, setBypassKioskTarget] = useState<KioskItem | null>(null);
  const [isBypassingKiosk, setIsBypassingKiosk] = useState(false);

  // Edit Booth Details Modal
  const [editingKiosk, setEditingKiosk] = useState<KioskItem | null>(null);
  const [editKioskName, setEditKioskName] = useState('');
  const [editKioskLocation, setEditKioskLocation] = useState('');
  const [editKioskCode, setEditKioskCode] = useState('');
  const [editKioskCapacity, setEditKioskCapacity] = useState('400');
  const [isUpdatingKiosk, setIsUpdatingKiosk] = useState(false);

  // Notification helper
  const showNotification = (successMsg?: string, errorMsg?: string) => {
    if (successMsg) {
      setActionSuccessMsg(successMsg);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
    if (errorMsg) {
      setActionErrorMsg(errorMsg);
      setTimeout(() => setActionErrorMsg(null), 5000);
    }
  };

  // ==========================================
  // DATA FETCHING FUNCTIONS
  // ==========================================

  // 1. Fetch Booths & Core Profile
  const fetchKiosksAndProfile = useCallback(async () => {
    if (!partnerToken) return;
    setIsLoading(true);
    try {
      const kiosksRes = await photoboothApi.getMyKiosks(partnerToken);
      if (kiosksRes.success && kiosksRes.data) {
        setMyKiosks(kiosksRes.data);
        if (!selectedPackageKioskId && kiosksRes.data.length > 0) {
          setSelectedPackageKioskId(kiosksRes.data[0].id);
        }
      }
    } catch (e: any) {
      console.error('Failed to load kiosks:', e);
    } finally {
      setIsLoading(false);
    }
  }, [partnerToken, selectedPackageKioskId]);

  // 2. Fetch Financial Analytics
  const fetchFinancialAnalytics = useCallback(async () => {
    if (!partnerToken) return;
    setIsLoadingFinancial(true);
    try {
      const res = await photoboothApi.getPartnerFinancialAnalytics(partnerToken, {
        period: financialPeriod,
        kioskId: financialKioskId !== 'ALL' ? financialKioskId : undefined,
        startDate: financialPeriod === 'custom' ? financialStartDate : undefined,
        endDate: financialPeriod === 'custom' ? financialEndDate : undefined,
      });
      if (res.success && res.data) {
        setFinancialData(res.data);
      }
    } catch (e: any) {
      console.error('Failed to load financial analytics:', e);
    } finally {
      setIsLoadingFinancial(false);
    }
  }, [partnerToken, financialPeriod, financialKioskId, financialStartDate, financialEndDate]);

  // 3. Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    if (!partnerToken) return;
    setIsLoadingTx(true);
    try {
      const res = await photoboothApi.getPartnerTransactions(partnerToken, {
        kioskId: financialKioskId !== 'ALL' ? financialKioskId : undefined,
        status: txStatus !== 'ALL' ? txStatus : undefined,
        search: txSearch.trim() || undefined,
        period: financialPeriod,
        startDate: financialPeriod === 'custom' ? financialStartDate : undefined,
        endDate: financialPeriod === 'custom' ? financialEndDate : undefined,
        page: txPage,
        limit: 15,
      });
      if (res.success && res.data) {
        setTransactions(res.data.items);
        setTxTotalPages(res.data.pagination.totalPages);
        setTxTotal(res.data.pagination.total);
      }
    } catch (e: any) {
      console.error('Failed to load transactions:', e);
    } finally {
      setIsLoadingTx(false);
    }
  }, [partnerToken, financialKioskId, txStatus, txSearch, financialPeriod, financialStartDate, financialEndDate, txPage]);

  // 4. Fetch Vouchers
  const fetchVouchers = useCallback(async () => {
    if (!partnerToken) return;
    setIsLoadingVouchers(true);
    try {
      const res = await photoboothApi.getPartnerVouchers(partnerToken);
      if (res.success && res.data) {
        setVouchers(res.data);
      }
    } catch (e: any) {
      console.error('Failed to load vouchers:', e);
    } finally {
      setIsLoadingVouchers(false);
    }
  }, [partnerToken]);

  // 5. Fetch Customer Sessions
  const fetchSessions = useCallback(async () => {
    if (!partnerToken) return;
    setIsLoadingSessions(true);
    try {
      const res = await photoboothApi.getPartnerSessions(partnerToken, {
        kioskId: sessionKioskFilter !== 'ALL' ? sessionKioskFilter : undefined,
        search: sessionSearch.trim() || undefined,
        page: sessionPage,
        limit: 15,
      });
      if (res.success && res.data) {
        setSessions(res.data.items);
        setSessionTotalPages(res.data.pagination.totalPages);
      }
    } catch (e: any) {
      console.error('Failed to load sessions:', e);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [partnerToken, sessionKioskFilter, sessionSearch, sessionPage]);

  // 6. Fetch Packages
  const fetchPackages = useCallback(async () => {
    if (!partnerToken) return;
    setIsLoadingPackages(true);
    try {
      const res = await photoboothApi.getPartnerPackages(partnerToken);
      if (res.success && res.data) {
        setPackagesList(res.data.packages);
        setPackageKiosksData(res.data.kiosks);
        const currentKiosk = res.data.kiosks.find((k) => k.id === selectedPackageKioskId);
        if (currentKiosk) {
          setDisabledPkgIds(currentKiosk.disabledPackageIds || []);
        }
      }
    } catch (e: any) {
      console.error('Failed to load packages:', e);
    } finally {
      setIsLoadingPackages(false);
    }
  }, [partnerToken, selectedPackageKioskId]);

  // 7. Fetch Operators & Passes
  const fetchOperatorsAndPasses = useCallback(async () => {
    if (!partnerToken) return;
    try {
      const [opsRes, passesRes] = await Promise.all([
        photoboothApi.getPartnerOperators(partnerToken),
        photoboothApi.getPartnerPasses(partnerToken, 100),
      ]);
      if (opsRes.success && opsRes.data) setMyOperators(opsRes.data);
      if (passesRes.success && passesRes.data) setMyPasses(passesRes.data);
    } catch (e: any) {
      console.error('Failed to load operators & passes:', e);
    }
  }, [partnerToken]);

  // Initial load
  useEffect(() => {
    if (partnerToken) {
      fetchKiosksAndProfile();
      fetchFinancialAnalytics();
      fetchTransactions();
    }
  }, [partnerToken, fetchKiosksAndProfile, fetchFinancialAnalytics, fetchTransactions]);

  // Fetch data on tab change
  useEffect(() => {
    if (!partnerToken) return;
    if (activeTab === 'analytics') {
      fetchFinancialAnalytics();
      fetchTransactions();
    } else if (activeTab === 'vouchers') {
      fetchVouchers();
    } else if (activeTab === 'sessions') {
      fetchSessions();
    } else if (activeTab === 'packages') {
      fetchPackages();
    } else if (activeTab === 'kiosks') {
      fetchKiosksAndProfile();
    } else if (activeTab === 'operators' || activeTab === 'passes') {
      fetchOperatorsAndPasses();
    }
  }, [
    activeTab,
    partnerToken,
    fetchFinancialAnalytics,
    fetchTransactions,
    fetchVouchers,
    fetchSessions,
    fetchPackages,
    fetchKiosksAndProfile,
    fetchOperatorsAndPasses,
  ]);

  // Update selected kiosk packages when packageKiosk changes
  useEffect(() => {
    if (packageKiosksData.length > 0 && selectedPackageKioskId) {
      const found = packageKiosksData.find((k) => k.id === selectedPackageKioskId);
      if (found) {
        setDisabledPkgIds(found.disabledPackageIds || []);
      }
    }
  }, [selectedPackageKioskId, packageKiosksData]);

  // ==========================================
  // HANDLERS
  // ==========================================

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await photoboothApi.partnerLogin(loginEmail, loginPassword);
      if (res.success) {
        localStorage.setItem('minja_partner_token', res.data.token);
        localStorage.setItem('minja_partner_info', JSON.stringify(res.data.partner));
        setPartnerToken(res.data.token);
        setPartnerInfo(res.data.partner);
        showNotification(`Selamat datang kembali, ${res.data.partner.name}!`);
      } else {
        setLoginError(res.error?.message || 'Email atau kata sandi tidak sesuai.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Gagal menghubungi server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('minja_partner_token');
    localStorage.removeItem('minja_partner_info');
    setPartnerToken(null);
    setPartnerInfo(null);
    setLoginPassword('');
  };

  // Manual Force Sync Cloud handler for Partner
  const handlePartnerForceSync = async () => {
    if (!partnerToken) return;
    setIsSyncingPending(true);
    try {
      const res = await photoboothApi.partnerForceSync(partnerToken);
      if (res.success && res.data) {
        showNotification(`✅ ${res.data.message || 'Data pending berhasil disinkronkan ke database!'}`);
        if (activeTab === 'analytics') {
          fetchFinancialAnalytics();
          fetchTransactions();
        } else if (activeTab === 'sessions') {
          fetchSessions();
        } else if (activeTab === 'kiosks') {
          fetchKiosksAndProfile();
        }
      } else {
        const errMsg = !res.success ? res.error?.message : 'Gagal sinkronisasi data pending.';
        showNotification(undefined, errMsg || 'Gagal sinkronisasi.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsSyncingPending(false);
    }
  };

  // CSV Export handler
  const handleExportCsv = async () => {
    if (!partnerToken) return;
    setIsExportingCsv(true);
    try {
      const csvString = await photoboothApi.exportPartnerTransactionsCsv(partnerToken, {
        kioskId: financialKioskId !== 'ALL' ? financialKioskId : undefined,
        status: txStatus !== 'ALL' ? txStatus : undefined,
        search: txSearch.trim() || undefined,
        period: financialPeriod,
        startDate: financialPeriod === 'custom' ? financialStartDate : undefined,
        endDate: financialPeriod === 'custom' ? financialEndDate : undefined,
      });

      if (!csvString) {
        showNotification(undefined, 'Gagal mengunduh CSV atau data kosong.');
        return;
      }

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transaksi-mitra-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Laporan transaksi berhasil diekspor ke file CSV.');
    } catch (e: any) {
      showNotification(undefined, 'Gagal mengekspor data: ' + e?.message);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Create Voucher handler
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerToken) return;
    setIsCreatingVoucher(true);

    try {
      const res = await photoboothApi.createPartnerVoucher(partnerToken, {
        code: voucherCode.trim().toUpperCase(),
        name: voucherName.trim() || voucherCode.trim().toUpperCase(),
        discountType: voucherType,
        discountValue: Number(voucherValue),
        maxDiscount: voucherType === 'percentage' && voucherMaxDiscount ? Number(voucherMaxDiscount) : undefined,
        minSpend: voucherMinSpend ? Number(voucherMinSpend) : 0,
        usageLimit: voucherQuota ? Number(voucherQuota) : 100,
        validUntil: voucherValidUntil,
        kioskId: voucherTargetKioskId && voucherTargetKioskId !== 'ALL' ? voucherTargetKioskId : null,
      });

      if (res.success) {
        showNotification(`Voucher ${res.data?.code} berhasil dibuat.`);
        setShowCreateVoucherModal(false);
        setVoucherCode('');
        setVoucherName('');
        fetchVouchers();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal membuat voucher.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  // Toggle Voucher status
  const handleToggleVoucher = async (id: string) => {
    if (!partnerToken) return;
    try {
      const res = await photoboothApi.togglePartnerVoucher(partnerToken, id);
      if (res.success) {
        showNotification('Status voucher berhasil diperbarui.');
        fetchVouchers();
      }
    } catch (e: any) {
      showNotification(undefined, 'Gagal mengubah status: ' + e?.message);
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = async (id: string, code: string) => {
    if (!partnerToken) return;
    if (!window.confirm(`Hapus voucher ${code}? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      const res = await photoboothApi.deletePartnerVoucher(partnerToken, id);
      if (res.success) {
        showNotification(`Voucher ${code} berhasil dihapus.`);
        fetchVouchers();
      }
    } catch (e: any) {
      showNotification(undefined, 'Gagal menghapus: ' + e?.message);
    }
  };

  // Toggle Package for Booth
  const handleTogglePackageForBooth = (pkgId: string) => {
    setDisabledPkgIds((prev) => {
      if (prev.includes(pkgId)) {
        return prev.filter((id) => id !== pkgId);
      } else {
        return [...prev, pkgId];
      }
    });
  };

  // Save Packages Configuration
  const handleSavePackagesConfig = async () => {
    if (!partnerToken || !selectedPackageKioskId) return;
    setIsSavingPackages(true);

    try {
      const res = await photoboothApi.updatePartnerKioskPackages(partnerToken, selectedPackageKioskId, disabledPkgIds);
      if (res.success) {
        showNotification('Konfigurasi paket booth berhasil disimpan.');
        fetchPackages();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal menyimpan konfigurasi.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsSavingPackages(false);
    }
  };

  // Remote Reset (Bypass) Booth
  const handleConfirmResetKiosk = async () => {
    if (!partnerToken || !resetKioskTarget) return;
    setIsResettingKiosk(true);

    try {
      const res = await photoboothApi.remoteResetPartnerKiosk(partnerToken, resetKioskTarget.id);
      if (res.success) {
        showNotification(`Booth [${resetKioskTarget.code}] berhasil direset ke mode standby.`);
        setResetKioskTarget(null);
        fetchKiosksAndProfile();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal mereset booth.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsResettingKiosk(false);
    }
  };

  // Remote Bypass Booth (Loloskan pembayaran sesi aktif atau terbitkan PASS bypass instan)
  const handleConfirmBypassKiosk = async () => {
    if (!partnerToken || !bypassKioskTarget) return;
    setIsBypassingKiosk(true);

    try {
      const res = await photoboothApi.remoteBypassPartnerKiosk(partnerToken, bypassKioskTarget.id);
      if (res.success && res.data) {
        showNotification(res.data.message || `Booth [${bypassKioskTarget.code}] berhasil di-bypass.`);
        if (res.data.mode === 'PASS_CODE_GENERATED' && res.data.passCode) {
          setCreatedPassResult({
            id: 'temp-' + Date.now(),
            code: res.data.passCode,
            type: 'SESSION',
            amount: 0,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            createdAt: new Date().toISOString(),
            kioskCode: bypassKioskTarget.code,
            kioskName: bypassKioskTarget.name,
            customerNote: 'Bypass Jarak Jauh Mitra',
          } as any);
        }
        setBypassKioskTarget(null);
        fetchKiosksAndProfile();
        fetchOperatorsAndPasses();
      } else {
        const errMsg = !res.success ? (res as any).error?.message : 'Gagal mem-bypass booth.';
        showNotification(undefined, errMsg || 'Gagal mem-bypass booth.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsBypassingKiosk(false);
    }
  };

  // Remote Lock / Maintenance Mode
  const handleToggleLockKiosk = async () => {
    if (!partnerToken || !lockKiosk) return;
    setIsLocking(true);

    try {
      const targetState = !lockKiosk.isLocked;
      const res = await photoboothApi.remoteLockPartnerKiosk(
        partnerToken,
        lockKiosk.id,
        targetState,
        targetState ? lockReason : undefined
      );

      if (res.success) {
        showNotification(`Booth [${lockKiosk.code}] berhasil ${targetState ? 'DIKUNCI (Mode Pemeliharaan)' : 'DIBUKA KEMBALI'}.`);
        setLockKiosk(null);
        fetchKiosksAndProfile();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal mengubah status lock booth.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsLocking(false);
    }
  };

  // Save Paper Refill
  const handleSavePaper = async () => {
    if (!partnerToken || !paperModalKiosk) return;
    const sheets = parseInt(paperInputSheets, 10);
    if (isNaN(sheets) || sheets < 0) {
      showNotification(undefined, 'Jumlah lembar kertas tidak valid.');
      return;
    }

    setIsSavingPaper(true);
    try {
      const res = await photoboothApi.updatePartnerKioskPaper(partnerToken, paperModalKiosk.id, sheets, true);
      if (res.success) {
        showNotification(`Sisa kertas [${paperModalKiosk.code}] diperbarui menjadi ${sheets} lembar (Pelacakan Aktif).`);
        setPaperModalKiosk(null);
        fetchKiosksAndProfile();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal memperbarui kertas.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsSavingPaper(false);
    }
  };

  // Toggle Paper Tracking Option
  const handleTogglePaperTracking = async (kiosk: KioskItem) => {
    if (!partnerToken) return;
    const nextState = !kiosk.paperTrackingEnabled;
    try {
      const res = await photoboothApi.updatePartnerKioskPaper(partnerToken, kiosk.id, kiosk.paperRemaining, nextState);
      if (res.success) {
        showNotification(
          nextState
            ? `Pelacakan sisa kertas pada booth [${kiosk.code}] diaktifkan.`
            : `Pelacakan sisa kertas pada booth [${kiosk.code}] dinonaktifkan (bebas cetak).`
        );
        fetchKiosksAndProfile();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal mengubah status pelacakan kertas.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    }
  };

  // Save Edit Booth
  const handleSaveEditKiosk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerToken || !editingKiosk) return;
    setIsUpdatingKiosk(true);

    try {
      const res = await photoboothApi.updatePartnerKiosk(partnerToken, editingKiosk.id, {
        name: editKioskName.trim(),
        location: editKioskLocation.trim(),
        code: editKioskCode.trim().toUpperCase(),
        paperRollCapacity: Number(editKioskCapacity) || 400,
      });

      if (res.success) {
        showNotification(`Detail booth [${editKioskCode}] berhasil diperbarui.`);
        setEditingKiosk(null);
        fetchKiosksAndProfile();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal memperbarui booth.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsUpdatingKiosk(false);
    }
  };

  // Create / Update Custom Package
  const handleSaveCustomPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerToken) return;

    const price = parseInt(pkgPrice, 10);
    const duration = parseInt(pkgDuration, 10);
    const maxShots = parseInt(pkgMaxShots, 10);
    const maxSelections = parseInt(pkgMaxSelections, 10);
    const defaultPrints = parseInt(pkgTotalPrints, 10);
    const addPrintPrice = parseInt(pkgAdditionalPrintPrice, 10);

    if (!pkgName.trim()) {
      showNotification(undefined, 'Nama paket wajib diisi.');
      return;
    }
    if (isNaN(price) || price < 0) {
      showNotification(undefined, 'Harga paket tidak valid.');
      return;
    }

    setIsSubmittingPackage(true);
    try {
      if (editingPackage) {
        const res = await photoboothApi.updatePartnerPackage(partnerToken, editingPackage.id, {
          name: pkgName.trim(),
          description: pkgDescription.trim(),
          price,
          durationSeconds: duration,
          maxShots,
          maxSelections,
          defaultPrints,
          additionalPrintPrice: addPrintPrice,
        });
        if (res.success) {
          showNotification(`Paket "${pkgName}" berhasil diperbarui.`);
          setShowCreatePackageModal(false);
          setEditingPackage(null);
          fetchPackages();
        } else {
          showNotification(undefined, res.error?.message || 'Gagal memperbarui paket.');
        }
      } else {
        const res = await photoboothApi.createPartnerPackage(partnerToken, {
          name: pkgName.trim(),
          description: pkgDescription.trim(),
          price,
          durationSeconds: duration,
          maxShots,
          maxSelections,
          defaultPrints,
          additionalPrintPrice: addPrintPrice,
        });
        if (res.success) {
          showNotification(`Paket sesi baru "${pkgName}" berhasil dibuat!`);
          setShowCreatePackageModal(false);
          setPkgName('');
          setPkgDescription('');
          fetchPackages();
        } else {
          showNotification(undefined, res.error?.message || 'Gagal membuat paket sesi.');
        }
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  // Delete Custom Package
  const handleDeletePackage = async (pkg: PartnerPackageItem) => {
    if (!partnerToken) return;
    if (!window.confirm(`Yakin ingin menghapus paket khusus "${pkg.name}"? Paket ini tidak akan lagi muncul di booth Anda.`)) {
      return;
    }

    setDeletingPackageId(pkg.id);
    try {
      const res = await photoboothApi.deletePartnerPackage(partnerToken, pkg.id);
      if (res.success) {
        showNotification(`Paket "${pkg.name}" berhasil dihapus.`);
        fetchPackages();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal menghapus paket.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setDeletingPackageId(null);
    }
  };

  // Create PASS code directly from Partner Portal
  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerToken) return;

    const amount = parseInt(passAmount, 10);
    if (isNaN(amount) || amount < 0) {
      showNotification(undefined, 'Nominal harga PASS tidak valid.');
      return;
    }

    setIsCreatingPass(true);
    try {
      const res = await photoboothApi.createPartnerPass(partnerToken, {
        type: passType,
        packageId: passType === 'SESSION' && passPackageId ? passPackageId : null,
        extraPrints: passType === 'EXTRA_PRINT' ? passExtraPrints : 0,
        kioskId: passKioskId && passKioskId !== 'ALL' ? passKioskId : null,
        amount,
        customerNote: passCustomerNote.trim() || undefined,
        cashierName: passCashierName.trim() || `Mitra (${partnerInfo?.name || 'Portal'})`,
        expiresInHours: passExpiresInHours,
      });

      if (res.success) {
        showNotification(`Kode PASS [${res.data.code}] berhasil diterbitkan!`);
        setCreatedPassResult(res.data);
        setShowCreatePassModal(false);
        setPassCustomerNote('');
        fetchOperatorsAndPasses();
      } else {
        const errMsg = !res.success ? (res as any).error?.message : 'Gagal menerbitkan kode PASS.';
        showNotification(undefined, errMsg || 'Gagal menerbitkan kode PASS.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsCreatingPass(false);
    }
  };

  // Delete PASS
  const handleDeletePass = async (pass: AccessCodeItem) => {
    if (!partnerToken) return;
    if (pass.status === 'USED') {
      showNotification(undefined, 'Kode PASS yang sudah digunakan tidak dapat dihapus.');
      return;
    }
    setIsDeletingPass(true);
    try {
      const res = await photoboothApi.deletePartnerPass(partnerToken, pass.id);
      if (res.success) {
        showNotification(res.data?.message || `Kode PASS [${pass.code}] berhasil dihapus!`);
        setPassToDelete(null);
        if (selectedPassDetail?.id === pass.id) {
          setSelectedPassDetail(null);
        }
        await fetchOperatorsAndPasses();
      } else {
        const errMsg = !res.success ? (res as any).error?.message : 'Gagal menghapus kode PASS.';
        showNotification(undefined, errMsg || 'Gagal menghapus kode PASS.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsDeletingPass(false);
    }
  };

  // Revoke PASS
  const handleRevokePass = async (pass: AccessCodeItem, reason?: string) => {
    if (!partnerToken) return;
    if (pass.status === 'USED') {
      showNotification(undefined, 'Kode PASS yang sudah digunakan tidak dapat dibatalkan.');
      return;
    }
    setIsRevokingPass(true);
    try {
      const res = await photoboothApi.revokePartnerPass(partnerToken, pass.id, reason);
      if (res.success) {
        showNotification(res.data?.message || `Kode PASS [${pass.code}] berhasil dibatalkan.`);
        setPassToRevoke(null);
        setRevokeReason('');
        if (selectedPassDetail?.id === pass.id) {
          setSelectedPassDetail((prev) => (prev ? { ...prev, status: 'REVOKED' } : null));
        }
        await fetchOperatorsAndPasses();
      } else {
        const errMsg = !res.success ? (res as any).error?.message : 'Gagal membatalkan kode PASS.';
        showNotification(undefined, errMsg || 'Gagal membatalkan kode PASS.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsRevokingPass(false);
    }
  };

  // Extend PASS
  const handleExtendPass = async (pass: AccessCodeItem, hours = 24) => {
    if (!partnerToken) return;
    if (pass.status === 'USED') {
      showNotification(undefined, 'Kode PASS yang sudah digunakan tidak dapat diperpanjang.');
      return;
    }
    setIsExtendingPass(true);
    try {
      const res = await photoboothApi.extendPartnerPass(partnerToken, pass.id, hours);
      if (res.success) {
        showNotification(res.data?.message || `Masa berlaku kode [${pass.code}] diperpanjang +${hours} jam!`);
        setPassToExtend(null);
        if (selectedPassDetail?.id === pass.id) {
          setSelectedPassDetail((prev) =>
            prev
              ? {
                ...prev,
                status: 'ACTIVE',
                expiresAt: res.data?.expiresAt || prev.expiresAt,
                isExpired: false,
              }
              : null
          );
        }
        await fetchOperatorsAndPasses();
      } else {
        const errMsg = !res.success ? (res as any).error?.message : 'Gagal memperpanjang masa berlaku.';
        showNotification(undefined, errMsg || 'Gagal memperpanjang masa berlaku.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsExtendingPass(false);
    }
  };

  // Helper: Buka WhatsApp langsung tanpa API (100% Client-side Direct URL)
  const sendWhatsApp = (text: string, phone?: string) => {
    let cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Kirim rincian PASS ke WhatsApp Operator / Kasir (Tanpa API)
  const sharePassToOperator = (pass: AccessCodeItem, opPhone?: string) => {
    const formattedExpires = new Date(pass.expiresAt).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const boothName = pass.kioskCode ? `[${pass.kioskCode}] ${pass.kioskName}` : 'Semua Booth Cabang';
    const note = pass.customerNote ? `"${pass.customerNote}"` : '-';
    const passTypeStr = pass.type === 'EXTRA_PRINT' ? `Cetak Tambahan (+${pass.extraPrints || 1} Lembar)` : 'Sesi Foto Penuh';

    const msg = `Halo Kasir / Operator! 👋\n` +
      `Mitra telah menerbitkan *Kode PASS Tunai* baru untuk booth:\n\n` +
      `🔑 *Kode PASS:* ${pass.code}\n` +
      `📦 *Paket:* ${pass.packageName}\n` +
      `🏷️ *Tipe:* ${passTypeStr}\n` +
      `💰 *Nominal Tunai:* ${formatRp(pass.amount)}\n` +
      `📍 *Booth Tujuan:* ${boothName}\n` +
      `📝 *Catatan:* ${note}\n` +
      `⏰ *Batas Waktu:* ${formattedExpires} WIB\n\n` +
      `Mohon serahkan kode ini kepada pelanggan untuk digunakan di booth atau input di kasir. Terima kasih! 🚀📸`;

    sendWhatsApp(msg, opPhone);
  };

  // Kirim rincian PASS ke WhatsApp Pelanggan (Tanpa API)
  const sharePassToCustomer = (pass: AccessCodeItem, custPhone?: string) => {
    const formattedExpires = new Date(pass.expiresAt).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const boothName = pass.kioskCode ? `[${pass.kioskCode}] ${pass.kioskName}` : 'Booth Minja';

    const msg = `Halo! Terima kasih telah berkunjung ke MinjaPhotobooth. 📸✨\n\n` +
      `Berikut adalah *Kode Akses Foto Tunai* Anda:\n\n` +
      `🔑 *Kode PASS:* ${pass.code}\n` +
      `📦 *Paket:* ${pass.packageName}\n` +
      `💰 *Nominal:* ${formatRp(pass.amount)}\n` +
      `📍 *Booth:* ${boothName}\n` +
      `⏰ *Berlaku Hingga:* ${formattedExpires} WIB\n\n` +
      `👉 *Cara Pakai:* Sentuh tombol "Kode Akses / Voucher Tunai" pada layar booth dan masukkan kode di atas untuk memulai sesi foto. Selamat berfoto! 🎉`;

    sendWhatsApp(msg, custPhone);
  };

  // Kirim info akun kasir via WhatsApp (Tanpa API)
  const shareOperatorInfoViaWa = (op: OperatorItem) => {
    const kioskName = op.kiosk ? `[${op.kiosk.code}] ${op.kiosk.name}` : 'Akses ke Seluruh Booth Cabang';
    const portalUrl = `${window.location.origin}/operator`;
    const msg = `Halo ${op.name}! 👋\n` +
      `Berikut adalah informasi akun Kasir Lapangan MinjaPhotobooth Anda:\n\n` +
      `👤 *Nama:* ${op.name}\n` +
      `🔑 *Username:* @${op.username}\n` +
      `📍 *Booth Penugasan:* ${kioskName}\n` +
      `🌐 *Link Portal Kasir:* ${portalUrl}\n\n` +
      `Silakan buka link di atas menggunakan smartphone/laptop dan login dengan username serta PIN 4-digit Anda. Selamat bertugas! 🚀💼`;

    sendWhatsApp(msg);
  };

  // Create Operator
  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerToken) return;
    setIsCreatingOp(true);

    try {
      const res = await photoboothApi.createPartnerOperator(partnerToken, {
        name: newOpName.trim(),
        username: newOpUsername.trim().toLowerCase(),
        pin: newOpPin.trim(),
        kioskId: newOpKioskId && newOpKioskId !== 'ALL' ? newOpKioskId : undefined,
      });

      if (res.success) {
        showNotification(`Kasir baru ${newOpName} berhasil dibuat.`);
        setShowCreateOpModal(false);
        setNewOpName('');
        setNewOpUsername('');
        setNewOpPin('');
        setNewOpKioskId('');
        fetchOperatorsAndPasses();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal membuat akun kasir.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsCreatingOp(false);
    }
  };

  // Update Operator
  const handleUpdateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerToken || !editingOperator) return;
    setIsUpdatingOp(true);

    try {
      const res = await photoboothApi.updatePartnerOperator(partnerToken, editingOperator.id, {
        name: editOpName.trim(),
        pin: editOpPin.trim() || undefined,
        kioskId: editOpKioskId && editOpKioskId !== 'ALL' ? editOpKioskId : null,
        isActive: editOpActive,
      });

      if (res.success) {
        showNotification(`Akun kasir ${editOpName} berhasil diperbarui.`);
        setEditingOperator(null);
        fetchOperatorsAndPasses();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal memperbarui kasir.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsUpdatingOp(false);
    }
  };

  // Delete Operator
  const handleDeleteOperator = async (op: OperatorItem) => {
    if (!partnerToken) return;
    setIsDeletingOp(true);
    try {
      const res = await photoboothApi.deletePartnerOperator(partnerToken, op.id);
      if (res.success) {
        showNotification(res.data.message || `Akun kasir @${op.username} berhasil diproses.`);
        setOperatorToDelete(null);
        fetchOperatorsAndPasses();
      } else {
        showNotification(undefined, res.error?.message || 'Gagal menghapus kasir.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsDeletingOp(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerToken) return;
    if (newPasswordInput.length < 6) {
      setChangePasswordError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setChangePasswordError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsChangingPassword(true);
    setChangePasswordError(null);
    try {
      const res = await photoboothApi.changePartnerPassword(currentPasswordInput, newPasswordInput, partnerToken);
      if (res.success) {
        showNotification('Kata sandi berhasil diperbarui.');
        setShowChangePasswordModal(false);
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        setChangePasswordError(res.error?.message || 'Gagal mengubah kata sandi.');
      }
    } catch (err: any) {
      setChangePasswordError(err?.message || 'Koneksi gagal saat mengubah kata sandi.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Format currency helper
  const formatRp = (val: number) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // ==========================================
  // VIEW: LOGIN SCREEN (IF NOT AUTHENTICATED)
  // ==========================================
  if (!partnerToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient liquid lighting */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 mb-4 shadow-xl shadow-emerald-950/40">
              <Building2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Portal Mitra Minja</h1>
            <p className="text-slate-400 text-sm mt-1">Akses Manajemen Mandiri Franchise & Pemilik Lokasi</p>
          </div>

          <div className="backdrop-blur-xl bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {loginError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Akun Mitra
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="mitra@cabang.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <span>Masuk ke Portal Mitra</span>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center text-xs text-slate-500">
            MinjaPhotobooth Enterprise Platform &copy; 2026. Semua hak cipta dilindungi.
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN PORTAL DASHBOARD (AUTHENTICATED)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative pb-24 md:pb-10 overflow-x-hidden selection:bg-emerald-500/30">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Toast notifications */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold border border-emerald-400/40"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </motion.div>
        )}
        {actionErrorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold border border-rose-400/40"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{actionErrorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* DESKTOP SIDEBAR COMMAND CENTER (WIDESCREEN ENTERPRISE)        */}
      {/* ============================================================== */}
      {deviceMode === 'desktop' && (
        <aside className="fixed top-0 bottom-0 left-0 w-72 bg-slate-950/95 border-r border-slate-800/80 backdrop-blur-2xl z-40 flex flex-col justify-between overflow-y-auto no-scrollbar shadow-2xl">
          <div className="p-6 space-y-6">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/20 flex-shrink-0 relative">
                <Building2 className="w-6 h-6 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-wider uppercase text-white">MINJA ENTERPRISE</span>
                </div>
                <p className="text-[11px] font-semibold text-emerald-400">Portal Manajemen Mitra</p>
              </div>
            </div>

            {/* Mitra Profile Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-inner space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate max-w-[140px]" title={partnerInfo?.name || 'Mitra Minja'}>
                  {partnerInfo?.name || 'Mitra Minja'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Mitra Resmi
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                <span className="text-slate-400">Porsi Bagi Hasil:</span>
                <span className="font-black text-emerald-400">{partnerInfo?.revenueSharePct ?? 70}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Unit:</span>
                <span className="font-bold text-slate-200">{myKiosks.length} Booth</span>
              </div>
            </div>

            {/* Quick Global Booth Filter in Sidebar */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Filter Booth Aktif
              </label>
              <div className="relative">
                <select
                  value={financialKioskId}
                  onChange={(e) => {
                    setFinancialKioskId(e.target.value);
                    setSessionKioskFilter(e.target.value);
                    if (e.target.value !== 'ALL') {
                      setSelectedPackageKioskId(e.target.value);
                    }
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 appearance-none"
                >
                  <option value="ALL">Semua Booth ({myKiosks.length})</option>
                  {myKiosks.map((k) => (
                    <option key={k.id} value={k.id}>
                      [{k.code}] {k.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Grouped Sidebar Navigation */}
            <div className="space-y-4 pt-1">
              {([
                {
                  cat: 'Finansial & Bisnis',
                  items: [
                    { key: 'analytics' as TabKey, label: 'Laporan Finansial', icon: TrendingUp },
                    { key: 'vouchers' as TabKey, label: 'Voucher Promo', icon: Ticket, badgeNum: vouchers.length },
                    { key: 'packages' as TabKey, label: 'Kelola Paket', icon: Sparkles, badgeNum: packagesList.length },
                  ] as { key: TabKey; label: string; icon: any; badgeText?: string; badgeNum?: number }[],
                },
                {
                  cat: 'Operasional & Kendali',
                  items: [
                    { key: 'sessions' as TabKey, label: 'Sesi Pelanggan', icon: Layers, badgeNum: sessions.length },
                    { key: 'kiosks' as TabKey, label: 'Daftar Booth', icon: Printer, badgeNum: myKiosks.length },
                    { key: 'operators' as TabKey, label: 'Kasir Lapangan', icon: Users, badgeNum: myOperators.length },
                    { key: 'passes' as TabKey, label: 'Audit Kode PASS', icon: KeyRound, badgeNum: myPasses.length },
                  ] as { key: TabKey; label: string; icon: any; badgeText?: string; badgeNum?: number }[],
                },
                {
                  cat: 'Konfigurasi',
                  items: [
                    { key: 'receipt' as TabKey, label: 'Struk Thermal', icon: Receipt },
                  ] as { key: TabKey; label: string; icon: any; badgeText?: string; badgeNum?: number }[],
                },
              ]).map((group) => (
                <div key={group.cat}>
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                    {group.cat}
                  </span>
                  <div className="space-y-1">
                    {group.items.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${isActive
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                            <span>{tab.label}</span>
                          </div>
                          {tab.badgeText && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}>
                              {tab.badgeText}
                            </span>
                          )}
                          {tab.badgeNum !== undefined && tab.badgeNum > 0 && !tab.badgeText && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                              }`}>
                              {tab.badgeNum}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
            {isInstallable && (
              <button
                type="button"
                onClick={triggerInstall}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pasang Aplikasi (PWA)</span>
              </button>
            )}

            {/* Device Switcher */}
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mode: <strong>Desktop</strong></span>
              </span>
              <button
                onClick={() => handleDeviceModeChange('mobile')}
                className="text-[10px] font-bold text-slate-400 hover:text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1 transition-all"
                title="Beralih ke tampilan Mobile"
              >
                <Smartphone className="w-3 h-3" />
                <span>Mobile View</span>
              </button>
            </div>

            {/* Server Clock */}
            <div className="flex items-center justify-between text-xs px-2 text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>WIB</span>
              </span>
              <span className="text-slate-200 font-semibold">{currentTimeStr || '--:--:--'}</span>
            </div>

            {/* Ganti Password */}
            <button
              onClick={() => {
                setChangePasswordError(null);
                setCurrentPasswordInput('');
                setNewPasswordInput('');
                setConfirmPasswordInput('');
                setShowChangePasswordModal(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Ganti Kata Sandi</span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Portal</span>
            </button>
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* MAIN LAYOUT WRAPPER (OFFSET BY PL-72 ON DESKTOP)               */}
      {/* ============================================================== */}
      <div className={`${deviceMode === 'desktop' ? 'pl-72' : ''} flex-1 flex flex-col min-h-screen`}>
        {/* DESKTOP TOP COMMAND BAR */}
        {deviceMode === 'desktop' ? (
          <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-8 py-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Portal Mitra</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-emerald-400 font-bold">
                  {activeTab === 'analytics' && 'Laporan Finansial'}
                  {activeTab === 'vouchers' && 'Voucher Promo'}
                  {activeTab === 'sessions' && 'Sesi Pelanggan'}
                  {activeTab === 'packages' && 'Kelola Paket'}
                  {activeTab === 'kiosks' && 'Daftar Booth'}
                  {activeTab === 'operators' && 'Kasir Lapangan'}
                  {activeTab === 'passes' && 'Audit Kode PASS'}
                  {activeTab === 'receipt' && 'Struk Thermal'}
                </span>
              </div>
              <h1 className="text-lg font-black text-white leading-tight mt-0.5">
                {activeTab === 'analytics' && 'Laporan Finansial & Omzet Mitra'}
                {activeTab === 'vouchers' && 'Manajemen Voucher Promosi Pelanggan'}
                {activeTab === 'sessions' && 'Monitoring Sesi Foto Pelanggan Real-time'}
                {activeTab === 'packages' && 'Konfigurasi Paket & Harga Booth'}
                {activeTab === 'kiosks' && 'Kendali Booth, Reset Sesi & Sisa Kertas'}
                {activeTab === 'operators' && 'Manajemen Akun Kasir Lapangan'}
                {activeTab === 'passes' && 'Audit Kode Sesi Tunai (PASS)'}
                {activeTab === 'receipt' && 'Pengaturan Format Struk Thermal Kasir'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Contextual Action Buttons */}
              {activeTab === 'analytics' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExecutiveModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Buka Dokumen Ringkasan Eksekutif & Bagi Hasil"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Ringkasan Eksekutif</span>
                  </button>

                  <button
                    onClick={handleExportCsv}
                    disabled={isExportingCsv}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {isExportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              )}

              {activeTab === 'vouchers' && (
                <button
                  onClick={() => setShowCreateVoucherModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Voucher Baru</span>
                </button>
              )}

              {activeTab === 'operators' && (
                <button
                  onClick={() => setShowCreateOpModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Kasir Baru</span>
                </button>
              )}

              {activeTab === 'passes' && (
                <button
                  onClick={() => {
                    setPassType('SESSION');
                    setPassPackageId(packagesList[0]?.id || '');
                    setPassAmount(String(packagesList[0]?.price || 45000));
                    setPassExtraPrints(1);
                    setPassKioskId('ALL');
                    setPassCustomerNote('');
                    setPassCashierName(`Mitra (${partnerInfo?.name || 'Cabang'})`);
                    setPassExpiresInHours(24);
                    setShowCreatePassModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Terbitkan Kode PASS</span>
                </button>
              )}

              {/* Force Sync Cloud Button for Partner */}
              <button
                onClick={handlePartnerForceSync}
                disabled={isSyncingPending}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-500/10"
                title="Sinkronkan data offline / transaksi pending ke database"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncingPending ? 'animate-bounce text-indigo-400' : 'text-indigo-400'}`} />
                <span>{isSyncingPending ? 'Menyinkronkan...' : 'Force Sync Cloud'}</span>
              </button>

              {/* Global Refresh Button */}
              <button
                onClick={() => {
                  if (activeTab === 'analytics') {
                    fetchFinancialAnalytics();
                    fetchTransactions();
                  } else if (activeTab === 'vouchers') {
                    fetchVouchers();
                  } else if (activeTab === 'sessions') {
                    fetchSessions();
                  } else if (activeTab === 'packages') {
                    fetchPackages();
                  } else if (activeTab === 'kiosks') {
                    fetchKiosksAndProfile();
                  } else {
                    fetchOperatorsAndPasses();
                  }
                  showNotification('Data berhasil disegarkan.');
                }}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
                title="Segarkan Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>

              {/* Mode Switcher Pill */}
              <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => handleDeviceModeChange('desktop')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${devicePref === 'desktop' || (devicePref === 'auto' && deviceMode === 'desktop') ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  title="Mode Desktop Widescreen"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Desktop</span>
                </button>
                <button
                  onClick={() => handleDeviceModeChange('mobile')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${devicePref === 'mobile' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  title="Mode Mobile Phone"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Mobile</span>
                </button>
                <button
                  onClick={() => handleDeviceModeChange('auto')}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${devicePref === 'auto' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  title="Deteksi Otomatis User-Agent"
                >
                  Auto
                </button>
              </div>
            </div>
          </header>
        ) : (
          /* MOBILE HEADER */
          <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm text-white leading-tight truncate max-w-[150px]">
                  {partnerInfo?.name || 'Mitra Minja'}
                </h1>
                <p className="text-[10px] text-slate-400">
                  Bagi Hasil: <strong className="text-emerald-400">{partnerInfo?.revenueSharePct ?? 70}%</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePartnerForceSync}
                disabled={isSyncingPending}
                className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs disabled:opacity-50"
                title="Force Sync Cloud (Sinkronkan Data Pending)"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncingPending ? 'animate-bounce text-indigo-400' : ''}`} />
              </button>

              <button
                onClick={() => {
                  if (activeTab === 'analytics') {
                    fetchFinancialAnalytics();
                    fetchTransactions();
                  } else if (activeTab === 'vouchers') {
                    fetchVouchers();
                  } else if (activeTab === 'sessions') {
                    fetchSessions();
                  } else if (activeTab === 'packages') {
                    fetchPackages();
                  } else if (activeTab === 'kiosks') {
                    fetchKiosksAndProfile();
                  } else {
                    fetchOperatorsAndPasses();
                  }
                  showNotification('Data berhasil disegarkan.');
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs"
                title="Segarkan Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => handleDeviceModeChange('desktop')}
                className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 text-[10px] font-bold flex items-center gap-1"
                title="Beralih ke tampilan Desktop"
              >
                <Monitor className="w-3 h-3 text-emerald-400" />
                <span>Desktop</span>
              </button>

              <button
                onClick={() => {
                  setChangePasswordError(null);
                  setCurrentPasswordInput('');
                  setNewPasswordInput('');
                  setConfirmPasswordInput('');
                  setShowChangePasswordModal(true);
                }}
                className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs"
                title="Ganti Kata Sandi"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>
        )}

        {/* MOBILE TOP NAVIGATION BAR (ONLY IN MOBILE MODE) */}
        {deviceMode === 'mobile' && (
          <nav className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
            {[
              { key: 'analytics' as TabKey, label: 'Laporan Finansial', icon: TrendingUp },
              { key: 'vouchers' as TabKey, label: 'Voucher Promo', icon: Ticket },
              { key: 'sessions' as TabKey, label: 'Sesi Pelanggan', icon: Layers },
              { key: 'packages' as TabKey, label: 'Kelola Paket', icon: Sparkles },
              { key: 'kiosks' as TabKey, label: 'Daftar Booth', icon: Printer, badge: myKiosks.length },
              { key: 'operators' as TabKey, label: 'Kasir Lapangan', icon: Users, badge: myOperators.length },
              { key: 'passes' as TabKey, label: 'Audit Kode PASS', icon: KeyRound },
              { key: 'receipt' as TabKey, label: 'Struk Thermal', icon: Receipt },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* MAIN CONTAINER */}
        <main className={`flex-1 w-full mx-auto space-y-6 ${deviceMode === 'desktop' ? 'max-w-[1700px] p-6 lg:p-8' : 'max-w-7xl p-4 pb-24'}`}>

          {/* ============================================================== */}
          {/* TAB 1: FINANCIAL ANALYTICS (FLAGSHIP / PRIMARY TAB)            */}
          {/* ============================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      <span>Laporan Finansial & Pendapatan Mitra</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      {isLoadingFinancial && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                      <span>Periode: <strong className="text-slate-200">{financialData?.periodLabel || 'Hari Ini'}</strong></span>
                      {financialData?.selectedKioskName && (
                        <span> • Booth: <strong className="text-emerald-400">[{financialData.selectedKioskCode}] {financialData.selectedKioskName}</strong></span>
                      )}
                    </p>
                  </div>

                  {/* Booth Selector Dropdown */}
                  <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5">
                    <div className="relative flex-1 sm:flex-initial">
                      <select
                        value={financialKioskId}
                        onChange={(e) => {
                          setFinancialKioskId(e.target.value);
                        }}
                        className="w-full sm:w-60 pl-3 pr-8 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 appearance-none"
                      >
                        <option value="ALL">Semua Booth ({myKiosks.length} Booth)</option>
                        {myKiosks.map((k) => (
                          <option key={k.id} value={k.id}>
                            [{k.code}] {k.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <button
                      onClick={handleExportCsv}
                      disabled={isExportingCsv}
                      className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
                    >
                      {isExportingCsv ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      )}
                      <span>Ekspor CSV</span>
                    </button>
                  </div>
                </div>

                {/* Period Selector Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  {[
                    { key: 'today', label: 'Hari Ini' },
                    { key: 'yesterday', label: 'Kemarin' },
                    { key: '7d', label: '7 Hari' },
                    { key: '30d', label: '30 Hari' },
                    { key: 'this_month', label: 'Bulan Ini' },
                    { key: 'last_month', label: 'Bulan Lalu' },
                    { key: 'custom', label: 'Kustom Tanggal' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => {
                        setFinancialPeriod(p.key);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${financialPeriod === p.key
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}

                  {financialPeriod === 'custom' && (
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                      <input
                        type="date"
                        value={financialStartDate}
                        onChange={(e) => setFinancialStartDate(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                      <span className="text-slate-500 text-xs">s/d</span>
                      <input
                        type="date"
                        value={financialEndDate}
                        onChange={(e) => setFinancialEndDate(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                      <button
                        onClick={() => fetchFinancialAnalytics()}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        Terapkan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 5 KPI METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Card 1: Gross Revenue */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Omzet Kotor</span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">
                    {formatRp(financialData?.summary.grossRevenue || 0)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Seluruh pendapatan transaksi</p>
                </div>

                {/* Card 2: Net Partner Share (PRIMARY) */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-900/80 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Bagi Hasil Mitra</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {partnerInfo?.revenueSharePct ?? 70}%
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                    {formatRp(financialData?.summary.netPartnerShare || 0)}
                  </div>
                  <p className="text-[11px] text-emerald-500/80 mt-1">Hak bersih pendapatan cabang Anda</p>
                </div>

                {/* Card 3: Minja Royalty */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Royalti Minja</span>
                  <div className="text-xl sm:text-2xl font-black text-slate-300 mt-1">
                    {formatRp(financialData?.summary.minjaRoyalty || 0)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Porsi operasional & sistem Minja</p>
                </div>

                {/* Card 4: Total Sessions & AOV */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sesi & AOV</span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">
                    {financialData?.summary.totalSessions || 0} <span className="text-xs font-normal text-slate-400">Sesi</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Rata-rata: <strong className="text-slate-300">{formatRp(financialData?.summary.aov || 0)}</strong>/sesi
                  </p>
                </div>

                {/* Card 5: Paper Used & Extra Prints */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kertas Fisik Digunakan</span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                    {financialData?.summary.totalPaperUsed || 0} <span className="text-xs font-normal text-slate-400">Lembar</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Termasuk <strong className="text-slate-300">{financialData?.summary.totalExtraPrints || 0}</strong> lembar cetak ekstra
                  </p>
                </div>
              </div>

              {/* PAYMENT METHOD BREAKDOWN */}
              <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Rincian Pembayaran Berdasarkan Kanal</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-400">QRIS Midtrans</span>
                      <span className="text-slate-400">{financialData?.breakdown.qris.count || 0} Transaksi</span>
                    </div>
                    <div className="text-base font-bold text-white mt-1">
                      {formatRp(financialData?.breakdown.qris.totalAmount || 0)}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${financialData?.breakdown.qris.percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-400">Tunai Kasir Desk</span>
                      <span className="text-slate-400">{financialData?.breakdown.cashDesk.count || 0} Transaksi</span>
                    </div>
                    <div className="text-base font-bold text-white mt-1">
                      {formatRp(financialData?.breakdown.cashDesk.totalAmount || 0)}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${financialData?.breakdown.cashDesk.percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-400">Kode Akses (PASS)</span>
                      <span className="text-slate-400">{financialData?.breakdown.cashPass.count || 0} Transaksi</span>
                    </div>
                    <div className="text-base font-bold text-white mt-1">
                      {formatRp(financialData?.breakdown.cashPass.totalAmount || 0)}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${financialData?.breakdown.cashPass.percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-cyan-400">Cetak Ekstra Add-On</span>
                      <span className="text-slate-400">{financialData?.breakdown.extraPrints.count || 0} Lembar</span>
                    </div>
                    <div className="text-base font-bold text-white mt-1">
                      {formatRp(financialData?.breakdown.extraPrints.totalAmount || 0)}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full"
                        style={{ width: `${financialData?.breakdown.extraPrints.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PER-BOOTH COMPARISON (IF MULTI-BOOTH) */}
              {financialKioskId === 'ALL' && (financialData?.kiosksComparison.length || 0) > 1 && (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>Performa Perbandingan Tiap Cabang Booth</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="py-2.5 px-3">Kode & Nama Booth</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Sisa Kertas</th>
                          <th className="py-2.5 px-3">Jumlah Sesi</th>
                          <th className="py-2.5 px-3">Omzet Kotor</th>
                          <th className="py-2.5 px-3 text-right">Bagi Hasil Mitra</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {financialData?.kiosksComparison.map((k) => (
                          <tr key={k.kioskId} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-white">
                              <span className="text-emerald-400">[{k.kioskCode}]</span> {k.kioskName}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${k.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                {k.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-300">
                              {(k as any).paperTrackingEnabled ? `${k.paperRemaining} / ${k.paperRollCapacity} lbr` : <span className="text-slate-500 text-xs">Nonaktif</span>}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-300">
                              {k.sessionsCount} sesi ({k.paperUsed} lbr)
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white">
                              {formatRp(k.grossRevenue)}
                            </td>
                            <td className="py-2.5 px-3 font-black text-emerald-400 text-right">
                              {formatRp(k.partnerShare)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DETAILED TRANSACTIONS SECTION */}
              <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Daftar Transaksi Rinci ({txTotal} Catatan)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Semua riwayat pembayaran dan sesi foto di booth Anda</p>
                  </div>

                  <div className="w-full sm:w-auto flex items-center gap-2">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={txSearch}
                        onChange={(e) => {
                          setTxSearch(e.target.value);
                          setTxPage(1);
                        }}
                        placeholder="Cari kode sesi, kasir..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <select
                      value={txStatus}
                      onChange={(e) => {
                        setTxStatus(e.target.value);
                        setTxPage(1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="COMPLETED">Lunas / Selesai</option>
                      <option value="CANCELLED">Dibatalkan</option>
                    </select>
                  </div>
                </div>

                {isLoadingTx ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                    <span className="text-xs">Memuat transaksi...</span>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Tidak ada transaksi yang sesuai dengan filter yang dipilih.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="py-2.5 px-3">Waktu</th>
                            <th className="py-2.5 px-3">Booth</th>
                            <th className="py-2.5 px-3">Kode Sesi</th>
                            <th className="py-2.5 px-3">Paket</th>
                            <th className="py-2.5 px-3">Metode</th>
                            <th className="py-2.5 px-3">Total Tagihan</th>
                            <th className="py-2.5 px-3">Bagi Hasil Mitra</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                                <span className="text-emerald-400">[{tx.kioskCode}]</span> {tx.kioskName}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold whitespace-nowrap">
                                {tx.sessionCode}
                              </td>
                              <td className="py-2.5 px-3 text-slate-200">
                                {tx.packageName}
                                {tx.additionalPrints > 0 && (
                                  <span className="ml-1 text-[10px] text-cyan-400 font-semibold">
                                    (+{tx.additionalPrints} lbr)
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                                  {tx.paymentMethod}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                                {formatRp(tx.grossAmount)}
                              </td>
                              <td className="py-2.5 px-3 font-black text-emerald-400 whitespace-nowrap">
                                {formatRp(tx.partnerShare)}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.state === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400'
                                  }`}>
                                  {tx.statusLabel}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                      <span>Halaman {txPage} dari {txTotalPages} ({txTotal} total transaksi)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                          disabled={txPage <= 1}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40"
                        >
                          Sebelumnya
                        </button>
                        <button
                          onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                          disabled={txPage >= txTotalPages}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40"
                        >
                          Berikutnya
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: VOUCHER PROMO MANAGEMENT                                */}
          {/* ============================================================== */}
          {activeTab === 'vouchers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-emerald-400" />
                    <span>Kelola Voucher Promosi & Kupon Diskon</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Buat promo khusus untuk menarik pelanggan di booth spesifik atau semua booth cabang Anda
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateVoucherModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Voucher Baru</span>
                </button>
              </div>

              {isLoadingVouchers ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                  <span className="text-xs">Memuat daftar voucher...</span>
                </div>
              ) : vouchers.length === 0 ? (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Belum Ada Voucher Promo</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Tingkatkan transaksi di booth Anda dengan membuat kupon potongan harga spesial untuk event atau promosi lokal.
                  </p>
                  <button
                    onClick={() => setShowCreateVoucherModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Buat Voucher Pertama
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vouchers.map((v) => {
                    const isExpired = new Date(v.validUntil) < new Date();
                    const isDepleted = v.usedCount >= v.quota;

                    return (
                      <div
                        key={v.id}
                        className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="px-2.5 py-1 rounded-lg font-mono font-black text-sm tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {v.code}
                              </span>
                              <h4 className="text-sm font-bold text-white mt-2 leading-tight">{v.name}</h4>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${!v.isActive
                              ? 'bg-slate-800 text-slate-400'
                              : isExpired
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : isDepleted
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}>
                              {!v.isActive ? 'Nonaktif' : isExpired ? 'Kedaluwarsa' : isDepleted ? 'Kuota Habis' : 'Aktif'}
                            </span>
                          </div>

                          {/* Discount Value */}
                          <div className="text-xl font-black text-white mt-1">
                            {v.type === 'percentage' ? (
                              <>
                                {v.discountValue}%{' '}
                                {v.maxDiscount && (
                                  <span className="text-xs font-semibold text-slate-400">
                                    (Maks {formatRp(v.maxDiscount)})
                                  </span>
                                )}
                              </>
                            ) : (
                              formatRp(v.discountValue)
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1">
                            Min. belanja: <strong className="text-slate-300">{formatRp(v.minTransaction)}</strong>
                          </p>

                          {/* Target Booth Tag */}
                          <div className="mt-3 py-1 px-2.5 rounded-lg bg-slate-800/50 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                            <Printer className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">
                              {v.kioskCode ? `[${v.kioskCode}] ${v.kioskName}` : 'Berlaku di Semua Booth Anda'}
                            </span>
                          </div>

                          {/* Quota Progress */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span>Pemakaian</span>
                              <span className="font-semibold text-white">
                                {v.usedCount} / {v.quota} digunakan
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.round((v.usedCount / v.quota) * 100))}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 mt-2.5">
                            Berlaku s/d: {new Date(v.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-3.5 mt-4 border-t border-slate-800/80">
                          <button
                            onClick={() => handleToggleVoucher(v.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${v.isActive
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                              }`}
                          >
                            {v.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>

                          <button
                            onClick={() => handleDeleteVoucher(v.id, v.code)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Hapus Voucher"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CUSTOMER SESSIONS FEED                                  */}
          {/* ============================================================== */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <span>Sesi Pelanggan & Pemantauan Foto</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pantau aktivitas sesi foto, cetak lembar fisik, dan pengiriman galeri digital per booth
                  </p>
                </div>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <select
                    value={sessionKioskFilter}
                    onChange={(e) => {
                      setSessionKioskFilter(e.target.value);
                      setSessionPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="ALL">Semua Booth ({myKiosks.length})</option>
                    {myKiosks.map((k) => (
                      <option key={k.id} value={k.id}>
                        [{k.code}] {k.name}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sessionSearch}
                      onChange={(e) => {
                        setSessionSearch(e.target.value);
                        setSessionPage(1);
                      }}
                      placeholder="Cari ID sesi..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {isLoadingSessions ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                  <span className="text-xs">Memuat sesi pelanggan...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                  Tidak ada data sesi foto untuk filter yang dipilih.
                </div>
              ) : (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3">Booth</th>
                          <th className="py-2.5 px-3">Kode Sesi</th>
                          <th className="py-2.5 px-3">Paket</th>
                          <th className="py-2.5 px-3">Total Harga</th>
                          <th className="py-2.5 px-3">Cetak Lembar</th>
                          <th className="py-2.5 px-3">Status Galeri</th>
                          <th className="py-2.5 px-3 text-right">Status Sesi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {sessions.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                              {new Date(s.createdAt).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                              <span className="text-emerald-400">[{s.kioskCode}]</span> {s.kioskName}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {s.sessionCode}
                            </td>
                            <td className="py-2.5 px-3 text-slate-200">
                              {s.packageName}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                              {formatRp(s.totalPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {s.photosPrinted} / {s.totalPrints} lembar
                              {s.additionalPrints > 0 && (
                                <span className="ml-1 text-[10px] text-cyan-400 font-semibold">
                                  (+{s.additionalPrints} add-on)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {s.hasGallery ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                                  Galeri 48 Jam Siap
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.state === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                                }`}>
                                {s.state}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                    <span>Halaman {sessionPage} dari {sessionTotalPages}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                        disabled={sessionPage <= 1}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40"
                      >
                        Sebelumnya
                      </button>
                      <button
                        onClick={() => setSessionPage((p) => Math.min(sessionTotalPages, p + 1))}
                        disabled={sessionPage >= sessionTotalPages}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: MANAGE PACKAGES PER BOOTH                               */}
          {/* ============================================================== */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>Pengaturan Paket Foto Per Booth</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kelola paket master pusat, buat paket khusus cabang Anda, serta atur aktif/sembunyikan per unit booth
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPackage(null);
                      setPkgName('');
                      setPkgDescription('');
                      setPkgPrice('45000');
                      setPkgDuration('300');
                      setPkgMaxShots('8');
                      setPkgMaxSelections('4');
                      setPkgTotalPrints('2');
                      setPkgAdditionalPrintPrice('10000');
                      setShowCreatePackageModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Paket Sesi Baru</span>
                  </button>

                  <div className="relative">
                    <select
                      value={selectedPackageKioskId}
                      onChange={(e) => setSelectedPackageKioskId(e.target.value)}
                      className="pl-3 pr-8 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none appearance-none"
                    >
                      {myKiosks.map((k) => (
                        <option key={k.id} value={k.id}>
                          [{k.code}] {k.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    onClick={handleSavePackagesConfig}
                    disabled={isSavingPackages}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {isSavingPackages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Simpan Pengaturan Booth</span>
                  </button>
                </div>
              </div>

              {isLoadingPackages ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                  <span className="text-xs">Memuat paket foto...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packagesList.map((pkg) => {
                    const isDisabled = disabledPkgIds.includes(pkg.id);
                    const isCustom = !!pkg.isCustom;

                    return (
                      <div
                        key={pkg.id}
                        className={`backdrop-blur-xl rounded-2xl p-5 border transition-all flex flex-col justify-between ${isDisabled
                          ? 'bg-slate-900/30 border-slate-800 opacity-60'
                          : isCustom
                            ? 'bg-gradient-to-br from-amber-500/5 via-slate-900/80 to-slate-900/90 border-amber-500/30 shadow-xl'
                            : 'bg-slate-900/70 border-slate-700/80 shadow-xl'
                          }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  ⭐ Paket Cabang Anda
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-white">{pkg.name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">{pkg.description}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDisabled ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                              {isDisabled ? 'Dinonaktifkan' : 'Aktif'}
                            </span>
                          </div>

                          <div className="text-2xl font-black text-white mt-2">
                            {formatRp(pkg.price)}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] text-slate-300">
                            <div className="p-2 rounded-lg bg-slate-800/40">
                              <span className="text-slate-500 block text-[10px]">Cetak Bawaan</span>
                              <strong className="text-white">{pkg.totalPrints} Lembar</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/40">
                              <span className="text-slate-500 block text-[10px]">Batas Jepret</span>
                              <strong className="text-white">{pkg.maxShots} Foto</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/40">
                              <span className="text-slate-500 block text-[10px]">Durasi Sesi</span>
                              <strong className="text-white">{pkg.durationSeconds} Detik</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/40">
                              <span className="text-slate-500 block text-[10px]">Add-On Cetak</span>
                              <strong className="text-white">+{formatRp(pkg.additionalPrintPrice)}/lbr</strong>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-2">
                          {/* Tombol Edit & Hapus: Full Kontrol 100% untuk Mitra */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
                            <span className="text-[10px] text-amber-400 font-semibold">Tindakan Mitra:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingPackage(pkg);
                                  setPkgName(pkg.name);
                                  setPkgDescription(pkg.description || '');
                                  setPkgPrice(String(pkg.price));
                                  setPkgDuration(String(pkg.durationSeconds || 300));
                                  setPkgMaxShots(String(pkg.maxShots || 8));
                                  setPkgMaxSelections(String(pkg.maxSelections || 4));
                                  setPkgTotalPrints(String(pkg.totalPrints || 2));
                                  setPkgAdditionalPrintPrice(String(pkg.additionalPrintPrice || 10000));
                                  setShowCreatePackageModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all"
                              >
                                <Edit className="w-3 h-3 text-amber-400" />
                                <span>Ubah</span>
                              </button>
                              <button
                                onClick={() => handleDeletePackage(pkg)}
                                disabled={deletingPackageId === pkg.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center gap-1 transition-all"
                              >
                                {deletingPackageId === pkg.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              Tampilkan di booth ini?
                            </span>
                            <button
                              onClick={() => handleTogglePackageForBooth(pkg.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isDisabled
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                                }`}
                            >
                              {isDisabled ? 'Aktifkan Paket' : 'Sembunyikan'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: KIOSKS FLEET MANAGEMENT                                 */}
          {/* ============================================================== */}
          {activeTab === 'kiosks' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Printer className="w-5 h-5 text-emerald-400" />
                    <span>Daftar Booth Mesin Mandiri ({myKiosks.length} Unit)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kendali jarak jauh status hardware, refill kertas, darurat reset sesi, dan pemeliharaan
                  </p>
                </div>
              </div>

              {myKiosks.length === 0 ? (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <Printer className="w-12 h-12 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Belum Ada Booth Ditugaskan</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Hubungi tim Minja Super Admin untuk menghubungkan unit booth fisik ke akun mitra Anda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myKiosks.map((kiosk) => {
                    const paperPct = Math.round((kiosk.paperRemaining / (kiosk.paperRollCapacity || 400)) * 100);
                    const isPaperLow = kiosk.paperRemaining < 50;

                    return (
                      <div
                        key={kiosk.id}
                        className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
                      >
                        <div>
                          {/* Header card */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  {kiosk.code}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${kiosk.isLocked
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : kiosk.status === 'ONLINE'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                  {kiosk.isLocked ? 'DIKUNCI' : kiosk.status}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-white mt-1.5 leading-snug">{kiosk.name}</h3>
                              <p className="text-xs text-slate-400 mt-0.5">{kiosk.location || 'Lokasi belum disetel'}</p>
                            </div>

                            <button
                              onClick={() => {
                                setEditingKiosk(kiosk);
                                setEditKioskName(kiosk.name);
                                setEditKioskLocation(kiosk.location || '');
                                setEditKioskCode(kiosk.code);
                                setEditKioskCapacity(String(kiosk.paperRollCapacity || 400));
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Edit Info Booth"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Paper Status with Optional Toggle */}
                          <div className="mt-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/80 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                <Printer className="w-3.5 h-3.5 text-slate-400" />
                                <span>Lacak Sisa Kertas</span>
                              </span>
                              {/* Toggle Switch */}
                              <button
                                type="button"
                                onClick={() => handleTogglePaperTracking(kiosk)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  kiosk.paperTrackingEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                                }`}
                                title={kiosk.paperTrackingEnabled ? 'Klik untuk nonaktifkan pelacakan kertas' : 'Klik untuk aktifkan pelacakan kertas'}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    kiosk.paperTrackingEnabled ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            {kiosk.paperTrackingEnabled ? (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[11px] text-slate-400">Sisa Lembar:</span>
                                  <span className={`font-mono font-bold ${isPaperLow ? 'text-rose-400' : 'text-slate-200'}`}>
                                    {kiosk.paperRemaining} / {kiosk.paperRollCapacity || 400} lbr ({paperPct}%)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isPaperLow ? 'bg-rose-500' : paperPct < 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, paperPct))}%` }}
                                  />
                                </div>
                                {isPaperLow && (
                                  <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Kertas hampir habis! Segera isi ulang di lokasi.</span>
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">
                                Nonaktif (Default) — Booth dapat mencetak tanpa peringatan stok habis.
                              </p>
                            )}
                          </div>

                          {/* Hardware Telemetry Summary */}
                          <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                            <div className="p-2 rounded-lg bg-slate-800/30">
                              <span className="text-slate-500 block text-[10px]">Printer</span>
                              <span className="font-bold text-slate-200">{kiosk.printerStatus || 'READY'}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/30">
                              <span className="text-slate-500 block text-[10px]">Kamera</span>
                              <span className="font-bold text-slate-200">{kiosk.cameraStatus || 'READY'}</span>
                            </div>
                          </div>

                          {kiosk.isLocked && kiosk.lockReason && (
                            <div className="mt-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                              Alasan Kunci: {kiosk.lockReason}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="space-y-2 pt-3 border-t border-slate-800/80">
                          <div className="grid grid-cols-2 gap-2">
                            {kiosk.paperTrackingEnabled ? (
                              <button
                                onClick={() => {
                                  setPaperModalKiosk(kiosk);
                                  setPaperInputSheets(String(kiosk.paperRemaining));
                                }}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all text-center"
                              >
                                Isi Ulang Kertas
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePaperTracking(kiosk)}
                                className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all text-center"
                              >
                                Aktifkan Kertas
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setLockKiosk(kiosk);
                                setLockReason(kiosk.lockReason || 'Pemeliharaan berkala oleh Mitra');
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${kiosk.isLocked
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                            >
                              {kiosk.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              <span>{kiosk.isLocked ? 'Buka Kunci' : 'Kunci Booth'}</span>
                            </button>
                          </div>

                          {/* Akses Bypass Booth & Reset Sesi */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setBypassKioskTarget(kiosk)}
                              className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                              title="Loloskan sesi bayar aktif atau buat tiket PASS gratis untuk booth ini"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>Akses Bypass</span>
                            </button>
                            <button
                              onClick={() => setResetKioskTarget(kiosk)}
                              className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Reset darurat booth ke layar awal"
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>Reset Sesi</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: OPERATORS (KASIR LAPANGAN)                              */}
          {/* ============================================================== */}
          {activeTab === 'operators' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>Akun Kasir Lapangan ({myOperators.length} Orang)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Petugas kasir di lokasi untuk menerima pembayaran tunai dan menerbitkan kode PASS
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateOpModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kasir Baru</span>
                </button>
              </div>

              {myOperators.length === 0 ? (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                  Belum ada kasir yang ditambahkan. Buat akun kasir pertama untuk melayani transaksi tunai di lokasi.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myOperators.map((op) => (
                    <div
                      key={op.id}
                      className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-bold text-white">{op.name}</h4>
                            <span className="font-mono text-xs text-emerald-400">@{op.username}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${op.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}>
                            {op.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>

                        <div className="mt-3 py-1.5 px-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {op.kiosk ? `Ditugaskan ke [${op.kiosk.code}] ${op.kiosk.name}` : 'Akses ke Seluruh Booth Mitra'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-2">
                          Terakhir login: {op.lastLoginAt ? new Date(op.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah login'}
                        </div>
                      </div>

                      <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-end gap-2">
                        <button
                          onClick={() => shareOperatorInfoViaWa(op)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                          title="Kirim info login akun kasir via WhatsApp (Tanpa API)"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Kirim Info WA</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingOperator(op);
                            setEditOpName(op.name);
                            setEditOpKioskId(op.kioskId || '');
                            setEditOpActive(op.isActive);
                            setEditOpPin('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Ubah Data & PIN</span>
                        </button>
                        <button
                          onClick={() => setOperatorToDelete(op)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                          title="Hapus atau nonaktifkan akun kasir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: PASS AUDIT LOGS                                         */}
          {/* ============================================================== */}
          {activeTab === 'passes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-emerald-400" />
                    <span>Audit & Penerbitan Kode Akses Tunai (PASS)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pantau seluruh riwayat penerbitan, tanggal kadaluwarsa, sisa waktu, dan terbitkan kode PASS baru langsung dari portal mitra
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPassType('SESSION');
                      setPassPackageId(packagesList[0]?.id || '');
                      setPassAmount(String(packagesList[0]?.price || 45000));
                      setPassExtraPrints(1);
                      setPassKioskId('ALL');
                      setPassCustomerNote('');
                      setPassCashierName(`Mitra (${partnerInfo?.name || 'Cabang'})`);
                      setPassExpiresInHours(24);
                      setShowCreatePassModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Terbitkan Kode PASS Baru</span>
                  </button>
                </div>
              </div>

              <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
                {myPasses.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                    <KeyRound className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p>Belum ada kode PASS yang diterbitkan di cabang ini.</p>
                    <button
                      onClick={() => setShowCreatePassModal(true)}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      + Terbitkan Kode PASS Pertama Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="py-2.5 px-3">Waktu Dibuat</th>
                          <th className="py-2.5 px-3">Kode PASS</th>
                          <th className="py-2.5 px-3">Masa Berlaku (Expired)</th>
                          <th className="py-2.5 px-3">Booth Tujuan</th>
                          <th className="py-2.5 px-3">Paket / Nominal</th>
                          <th className="py-2.5 px-3">Kasir & Catatan</th>
                          <th className="py-2.5 px-3">Status Penggunaan</th>
                          <th className="py-2.5 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {myPasses.map((p) => {
                          const createdDate = new Date(p.createdAt);
                          const expiresDate = new Date(p.expiresAt);
                          const isExpired = p.status === 'EXPIRED' || (p.status === 'ACTIVE' && expiresDate < new Date());
                          const isUsed = p.status === 'USED';

                          // Sisa Waktu Format
                          const now = Date.now();
                          const diffMs = expiresDate.getTime() - now;
                          const diffHours = Math.floor(diffMs / (3600 * 1000));
                          const diffMins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));

                          let countdownLabel = '';
                          if (isUsed) {
                            countdownLabel = 'Selesai Dipakai';
                          } else if (isExpired) {
                            countdownLabel = 'Kedaluwarsa';
                          } else if (diffHours > 24) {
                            countdownLabel = `Sisa ${Math.floor(diffHours / 24)} Hari`;
                          } else if (diffHours > 0) {
                            countdownLabel = `Sisa ${diffHours} Jam ${diffMins}m`;
                          } else if (diffMins > 0) {
                            countdownLabel = `Sisa ${diffMins} Menit`;
                          } else {
                            countdownLabel = '< 1 Menit';
                          }

                          return (
                            <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                              {/* 1. Waktu Dibuat */}
                              <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                                <span className="block font-medium">
                                  {createdDate.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {createdDate.toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })} WIB
                                </span>
                              </td>

                              {/* 2. Kode PASS & Tipe */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-sm text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/25 tracking-wider">
                                    {p.code}
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(p.code);
                                      showNotification(`Kode ${p.code} disalin ke clipboard!`);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                    title="Salin Kode PASS"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="inline-block mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  {p.type === 'EXTRA_PRINT' ? `🖨️ Cetak Ekstra (+${p.extraPrints || 1} lbr)` : '📸 Sesi Foto'}
                                </span>
                              </td>

                              {/* 3. Masa Berlaku & Countdown */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="text-slate-300">
                                  {expiresDate.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })} {expiresDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span className={`text-[10px] font-bold ${isUsed
                                    ? 'text-slate-500'
                                    : isExpired
                                      ? 'text-rose-400'
                                      : 'text-emerald-400 font-mono'
                                    }`}>
                                    {countdownLabel}
                                  </span>
                                </div>
                              </td>

                              {/* 4. Booth Tujuan */}
                              <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                                {p.kioskCode ? (
                                  <div>
                                    <span className="font-bold text-white">[{p.kioskCode}]</span>{' '}
                                    <span className="text-xs text-slate-400">{p.kioskName}</span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-semibold border border-slate-700">
                                    🌐 Semua Booth Cabang
                                  </span>
                                )}
                              </td>

                              {/* 5. Paket & Nominal */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="block font-medium text-white">{p.packageName}</span>
                                <span className="font-black text-amber-400 text-xs">
                                  {formatRp(p.amount)}
                                </span>
                              </td>

                              {/* 6. Kasir & Catatan */}
                              <td className="py-3 px-3 max-w-xs">
                                <span className="block font-semibold text-white">
                                  {p.operatorName || p.cashierName || 'Kasir'}
                                </span>
                                <span className="text-[11px] text-slate-400 line-clamp-1">
                                  {p.customerNote ? `"${p.customerNote}"` : '-'}
                                </span>
                              </td>

                              {/* 7. Status Penggunaan */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {isUsed ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Sudah Dipakai</span>
                                    </span>
                                    {p.usedAt && (
                                      <span className="block text-[9px] text-slate-500 mt-0.5">
                                        {new Date(p.usedAt).toLocaleString('id-ID', {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    )}
                                    {p.usedSessionId && (
                                      <span className="block font-mono text-[9px] text-slate-400">
                                        #{p.usedSessionId.slice(-6).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                ) : isExpired ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Kedaluwarsa</span>
                                  </span>
                                ) : p.status === 'REVOKED' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500">
                                    Dibatalkan
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span>Aktif (Siap Pakai)</span>
                                  </span>
                                )}
                              </td>

                              {/* 8. Aksi Manajemen (Detail, Perpanjang, Batalkan, Hapus) */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Detail Button */}
                                  <button
                                    onClick={() => setSelectedPassDetail(p)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1"
                                    title="Lihat Detail Audit"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                    <span className="hidden xl:inline">Detail</span>
                                  </button>

                                  {/* Send WA to Operator (Without API) */}
                                  <button
                                    onClick={() => sharePassToOperator(p)}
                                    className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                    title="Kirim Kode PASS ke WhatsApp Operator / Kasir (Tanpa API)"
                                  >
                                    <Smartphone className="w-3.5 h-3.5" />
                                    <span className="hidden 2xl:inline">WA Operator</span>
                                  </button>

                                  {/* Extend Expiration if NOT USED */}
                                  {!isUsed && (
                                    <button
                                      onClick={() => {
                                        setPassToExtend(p);
                                        setExtendHours(24);
                                      }}
                                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                      title="Perpanjang Masa Berlaku"
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                      <span className="hidden xl:inline">+24 Jam</span>
                                    </button>
                                  )}

                                  {/* Revoke / Cancel if ACTIVE */}
                                  {p.status === 'ACTIVE' && !isUsed && !isExpired && (
                                    <button
                                      onClick={() => {
                                        setPassToRevoke(p);
                                        setRevokeReason('');
                                      }}
                                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                      title="Batalkan Kode PASS"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      <span className="hidden xl:inline">Batalkan</span>
                                    </button>
                                  )}

                                  {/* Delete button if NOT USED */}
                                  {!isUsed && (
                                    <button
                                      onClick={() => setPassToDelete(p)}
                                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                      title="Hapus Kode PASS"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="hidden xl:inline">Hapus</span>
                                    </button>
                                  )}

                                  {/* Locked badge if USED */}
                                  {isUsed && (
                                    <span className="text-[10px] text-slate-500 font-semibold px-2 py-1 rounded bg-slate-800/40 border border-slate-700/50">
                                      Audit Terkunci
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 8: THERMAL RECEIPT SETTINGS & SIMULATOR                    */}
          {/* ============================================================== */}
          {activeTab === 'receipt' && (
            <Suspense
              fallback={
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-xs text-slate-400">Memuat Studio Kustomisasi Struk Thermal...</span>
                </div>
              }
            >
              <ThermalReceiptSettingsTab
                partnerToken={partnerToken}
                partnerInfo={partnerInfo}
                setPartnerInfo={setPartnerInfo}
                myOperators={myOperators}
                myKiosks={myKiosks}
                showNotification={showNotification}
              />
            </Suspense>
          )}

        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION DOCK (STICKY, ONLY IN MOBILE MODE) */}
      {deviceMode === 'mobile' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl bg-slate-950/90 border-t border-slate-800/80 px-2 py-2 flex items-center justify-around shadow-2xl">
          {[
            { key: 'analytics' as TabKey, label: 'Finansial', icon: TrendingUp },
            { key: 'vouchers' as TabKey, label: 'Voucher', icon: Ticket },
            { key: 'sessions' as TabKey, label: 'Sesi', icon: Layers },
            { key: 'packages' as TabKey, label: 'Paket', icon: Sparkles },
            { key: 'kiosks' as TabKey, label: 'Booth', icon: Printer },
            { key: 'operators' as TabKey, label: 'Kasir', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all ${isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS                                                         */}
      {/* ============================================================== */}

      {/* MODAL RINGKASAN EKSEKUTIF FINANSIAL & BAGI HASIL */}
      <ExecutiveSummaryModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        periodLabel={financialData?.periodLabel || (financialPeriod === 'today' ? 'Hari Ini' : financialPeriod === 'this_month' ? 'Bulan Ini' : 'Rentang Pilihan')}
        partnerName={financialData?.partner?.name || 'Mitra Photobooth'}
        kioskName={financialKioskId === 'ALL' ? 'Semua Booth Terdaftar' : myKiosks.find((k) => k.id === financialKioskId)?.name || 'Booth'}
        grossRevenue={financialData?.summary?.grossRevenue || 0}
        totalDiscount={financialData?.summary?.totalDiscountGiven || 0}
        netRevenue={
          (financialData?.summary?.grossRevenue || 0) -
          (financialData?.summary?.totalDiscountGiven || 0)
        }
        totalSessions={financialData?.summary?.totalSessions || 0}
        channelBreakdown={{
          qris: financialData?.breakdown?.qris?.totalAmount || 0,
          cash: financialData?.breakdown?.cashDesk?.totalAmount || 0,
          accessCode: financialData?.breakdown?.cashPass?.totalAmount || 0,
          extraPrints: financialData?.breakdown?.extraPrints?.totalAmount || 0,
        }}
        kioskList={myKiosks.map((k) => ({
          code: k.code,
          name: k.name,
          sessions: 0,
          revenue: 0,
          location: k.location,
        }))}
        defaultPartnerSharePercent={financialData?.partner?.revenueSharePct || 70}
      />

      {/* MODAL 1: CREATE VOUCHER */}
      <AnimatePresence>
        {showCreateVoucherModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateVoucherModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-400" />
                <span>Buat Voucher Promosi Baru</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">Kupon diskon akan otomatis berlaku di booth yang Anda tentukan</p>

              <form onSubmit={handleCreateVoucher} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Kode Kupon (Contoh: LIBURAN20)
                  </label>
                  <input
                    type="text"
                    required
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="DISKON10"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Nama Promosi
                  </label>
                  <input
                    type="text"
                    required
                    value={voucherName}
                    onChange={(e) => setVoucherName(e.target.value)}
                    placeholder="Promo Akhir Pekan Ceria"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Tipe Diskon
                    </label>
                    <select
                      value={voucherType}
                      onChange={(e) => setVoucherType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                    >
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed">Nominal Tetap (Rp)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Nilai Potongan {voucherType === 'percentage' ? '(%)' : '(Rp)'}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={voucherValue}
                      onChange={(e) => setVoucherValue(e.target.value)}
                      placeholder={voucherType === 'percentage' ? '15' : '10000'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {voucherType === 'percentage' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Batas Maksimal Diskon (Rp)
                    </label>
                    <input
                      type="number"
                      value={voucherMaxDiscount}
                      onChange={(e) => setVoucherMaxDiscount(e.target.value)}
                      placeholder="15000"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Min. Transaksi (Rp)
                    </label>
                    <input
                      type="number"
                      value={voucherMinSpend}
                      onChange={(e) => setVoucherMinSpend(e.target.value)}
                      placeholder="35000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Kuota Pemakaian
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={voucherQuota}
                      onChange={(e) => setVoucherQuota(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Berlaku Hingga
                    </label>
                    <input
                      type="date"
                      required
                      value={voucherValidUntil}
                      onChange={(e) => setVoucherValidUntil(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Target Booth
                    </label>
                    <select
                      value={voucherTargetKioskId}
                      onChange={(e) => setVoucherTargetKioskId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                    >
                      <option value="ALL">Semua Booth Anda</option>
                      {myKiosks.map((k) => (
                        <option key={k.id} value={k.id}>
                          [{k.code}] {k.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreatingVoucher}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {isCreatingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Terbitkan Voucher</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RESET BOOTH CONFIRMATION */}
      <AnimatePresence>
        {resetKioskTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setResetKioskTarget(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <Power className="w-6 h-6" />
              </div>

              <h3 className="text-base font-black text-white">Reset Darurat Booth?</h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Anda akan melakukan reset darurat pada booth <strong className="text-white">[{resetKioskTarget.code}] {resetKioskTarget.name}</strong>.
                Jika terdapat sesi pelanggan yang sedang macet di layar atau belum selesai, sesi tersebut akan dibatalkan dan booth akan dikembalikan ke layar awal standby.
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setResetKioskTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetKiosk}
                  disabled={isResettingKiosk}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isResettingKiosk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                  <span>Reset Sekarang</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.5: BYPASS BOOTH CONFIRMATION */}
      <AnimatePresence>
        {bypassKioskTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setBypassKioskTarget(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
                <Zap className="w-6 h-6 fill-current" />
              </div>

              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Bypass Jarak Jauh Booth</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {bypassKioskTarget.code}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Aksi ini akan memeriksa booth <strong className="text-white">[{bypassKioskTarget.code}] {bypassKioskTarget.name}</strong>:
              </p>
              <ul className="text-xs text-slate-400 mt-2 space-y-1.5 list-disc list-inside bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <li><strong className="text-amber-300">Jika sedang di layar bayar:</strong> Sesi langsung diloloskan (settled) dan booth otomatis meluncur ke kamera countdown.</li>
                <li><strong className="text-amber-300">Jika sedang di layar awal:</strong> Sistem otomatis menerbitkan <strong>Kode PASS Bypass (Gratis Rp 0)</strong> khusus untuk booth ini.</li>
              </ul>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setBypassKioskTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBypassKiosk}
                  disabled={isBypassingKiosk}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isBypassingKiosk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                  <span>{isBypassingKiosk ? 'Memproses...' : 'Eksekusi Bypass'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: REFILL PAPER */}
      <AnimatePresence>
        {paperModalKiosk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setPaperModalKiosk(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-white mb-1">Isi Ulang Kertas Cetak</h3>
              <p className="text-xs text-slate-400 mb-4">
                Booth: <strong>[{paperModalKiosk.code}] {paperModalKiosk.name}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Sisa Lembar Kertas Baru
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    value={paperInputSheets}
                    onChange={(e) => setPaperInputSheets(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2 mt-2">
                    {['200', '400', '600', '800'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPaperInputSheets(preset)}
                        className="flex-1 py-1 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        {preset} lbr
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSavePaper}
                  disabled={isSavingPaper}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isSavingPaper ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Simpan Sisa Kertas</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: REMOTE LOCK BOOTH */}
      <AnimatePresence>
        {lockKiosk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setLockKiosk(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-white mb-1">
                {lockKiosk.isLocked ? 'Buka Kunci Booth' : 'Kunci Booth (Maintenance Mode)'}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Booth: <strong>[{lockKiosk.code}] {lockKiosk.name}</strong>
              </p>

              <div className="space-y-4">
                {!lockKiosk.isLocked && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                      Alasan Pemeliharaan (Tampil di Layar Kiosk)
                    </label>
                    <textarea
                      rows={2}
                      value={lockReason}
                      onChange={(e) => setLockReason(e.target.value)}
                      placeholder="Pengisian ulang kertas / pemeliharaan berkala"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleToggleLockKiosk}
                  disabled={isLocking}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${lockKiosk.isLocked
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                >
                  {isLocking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : lockKiosk.isLocked ? (
                    <Unlock className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{lockKiosk.isLocked ? 'Buka Kunci Sekarang' : 'Kunci Booth Sekarang'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: EDIT BOOTH INFO */}
      <AnimatePresence>
        {editingKiosk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setEditingKiosk(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-white mb-4">Edit Rincian Booth</h3>

              <form onSubmit={handleSaveEditKiosk} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Kode Booth (Contoh: MJA-01)
                  </label>
                  <input
                    type="text"
                    required
                    value={editKioskCode}
                    onChange={(e) => setEditKioskCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Nama Booth
                  </label>
                  <input
                    type="text"
                    required
                    value={editKioskName}
                    onChange={(e) => setEditKioskName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Lokasi Booth
                  </label>
                  <input
                    type="text"
                    value={editKioskLocation}
                    onChange={(e) => setEditKioskLocation(e.target.value)}
                    placeholder="Lantai 1 Atrium Mall"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Kapasitas Roll Kertas
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    value={editKioskCapacity}
                    onChange={(e) => setEditKioskCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingKiosk}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {isUpdatingKiosk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: CREATE OPERATOR */}
      <AnimatePresence>
        {showCreateOpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateOpModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-white mb-4">Tambah Kasir Lapangan Baru</h3>

              <form onSubmit={handleCreateOperator} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Nama Petugas Kasir
                  </label>
                  <input
                    type="text"
                    required
                    value={newOpName}
                    onChange={(e) => setNewOpName(e.target.value)}
                    placeholder="Budi Santoso"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    value={newOpUsername}
                    onChange={(e) => setNewOpUsername(e.target.value.toLowerCase())}
                    placeholder="budi_kasir"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    PIN Keamanan (Minimal 4 Angka)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newOpPin}
                    onChange={(e) => setNewOpPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Penugasan Booth
                  </label>
                  <select
                    value={newOpKioskId}
                    onChange={(e) => setNewOpKioskId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  >
                    <option value="ALL">Dapat Mengakses Seluruh Booth Mitra</option>
                    {myKiosks.map((k) => (
                      <option key={k.id} value={k.id}>
                        [{k.code}] {k.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreatingOp}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {isCreatingOp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Buat Akun Kasir</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: EDIT OPERATOR */}
      <AnimatePresence>
        {editingOperator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setEditingOperator(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-white mb-4">Edit Akun Kasir</h3>

              <form onSubmit={handleUpdateOperator} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Nama Petugas
                  </label>
                  <input
                    type="text"
                    required
                    value={editOpName}
                    onChange={(e) => setEditOpName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    PIN Baru (Kosongkan jika tidak diubah)
                  </label>
                  <input
                    type="password"
                    value={editOpPin}
                    onChange={(e) => setEditOpPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Penugasan Booth
                  </label>
                  <select
                    value={editOpKioskId}
                    onChange={(e) => setEditOpKioskId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  >
                    <option value="ALL">Dapat Mengakses Seluruh Booth Mitra</option>
                    {myKiosks.map((k) => (
                      <option key={k.id} value={k.id}>
                        [{k.code}] {k.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editOpActive"
                    checked={editOpActive}
                    onChange={(e) => setEditOpActive(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="editOpActive" className="text-xs text-slate-300">
                    Akun Kasir Aktif
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingOp}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {isUpdatingOp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 8: CREATE / EDIT CUSTOM PACKAGE */}
      <AnimatePresence>
        {showCreatePackageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative my-8"
            >
              <button
                onClick={() => {
                  setShowCreatePackageModal(false);
                  setEditingPackage(null);
                }}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingPackage ? 'Ubah Rincian Paket Khusus Mitra' : 'Buat Paket Sesi Baru (Khusus Cabang)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Paket ini eksklusif untuk cabang mitra Anda dan tidak mengubah paket master pusat.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveCustomPackage} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nama Paket Sesi *
                  </label>
                  <input
                    type="text"
                    required
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    placeholder="Contoh: Bestie Duo Exclusive"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Deskripsi Singkat Paket
                  </label>
                  <input
                    type="text"
                    value={pkgDescription}
                    onChange={(e) => setPkgDescription(e.target.value)}
                    placeholder="Contoh: Sesi santai 2 orang, 8 jepretan, 2 cetak lembar fisik"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Harga Sesi (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={pkgPrice}
                      onChange={(e) => setPkgPrice(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Durasi Sesi Foto (Detik) *
                    </label>
                    <input
                      type="number"
                      required
                      min={60}
                      value={pkgDuration}
                      onChange={(e) => setPkgDuration(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      ≈ {Math.floor((Number(pkgDuration) || 0) / 60)} Menit
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Batas Jepret Kamera (Foto) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={pkgMaxShots}
                      onChange={(e) => setPkgMaxShots(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Foto Pilihan Pelanggan *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={12}
                      value={pkgMaxSelections}
                      onChange={(e) => setPkgMaxSelections(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Lembar Cetak Bawaan (Default) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={pkgTotalPrints}
                      onChange={(e) => setPkgTotalPrints(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Harga Add-On per Lembar (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={pkgAdditionalPrintPrice}
                      onChange={(e) => setPkgAdditionalPrintPrice(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreatePackageModal(false);
                      setEditingPackage(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingPackage}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSubmittingPackage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Check className="w-4 h-4 text-slate-950" />
                    )}
                    <span>{editingPackage ? 'Simpan Perubahan' : 'Terbitkan Paket'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 9: CREATE PASS ACCESS CODE */}
      <AnimatePresence>
        {showCreatePassModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative my-8"
            >
              <button
                onClick={() => setShowCreatePassModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Terbitkan Kode Akses Tunai (PASS)</h3>
                  <p className="text-xs text-slate-400">
                    Hasilkan token sesi pembayaran tunai sekali pakai untuk pelanggan kasir booth.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreatePass} className="mt-5 space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Tipe Kode PASS *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPassType('SESSION');
                        const defaultPkg = packagesList[0];
                        if (defaultPkg) {
                          setPassPackageId(defaultPkg.id);
                          setPassAmount(String(defaultPkg.price));
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${passType === 'SESSION'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                    >
                      <span>📸 Sesi Foto Penuh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPassType('EXTRA_PRINT');
                        setPassAmount('10000');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${passType === 'EXTRA_PRINT'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                    >
                      <span>🖨️ Cetak Ekstra Add-On</span>
                    </button>
                  </div>
                </div>

                {/* Session Package or Extra Print count */}
                {passType === 'SESSION' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Paket Foto Sesi *
                    </label>
                    <select
                      value={passPackageId}
                      onChange={(e) => {
                        setPassPackageId(e.target.value);
                        const sel = packagesList.find((p) => p.id === e.target.value);
                        if (sel) {
                          setPassAmount(String(sel.price));
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      {packagesList.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — {formatRp(pkg.price)} ({pkg.totalPrints} lbr cetak)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Jumlah Lembar Cetak Ekstra *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={passExtraPrints}
                      onChange={(e) => {
                        const count = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setPassExtraPrints(count);
                        setPassAmount(String(count * 10000));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Target Booth & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Booth Tujuan *
                    </label>
                    <select
                      value={passKioskId}
                      onChange={(e) => setPassKioskId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="ALL">🌐 Semua Booth Cabang Mitra</option>
                      {myKiosks.map((k) => (
                        <option key={k.id} value={k.id}>
                          [{k.code}] {k.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Nominal Uang Diterima (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={500}
                      value={passAmount}
                      onChange={(e) => setPassAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Expiration Duration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Masa Berlaku Kode PASS *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { hours: 24, label: '24 Jam' },
                      { hours: 48, label: '48 Jam' },
                      { hours: 168, label: '7 Hari' },
                      { hours: 720, label: '30 Hari' },
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setPassExpiresInHours(opt.hours)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${passExpiresInHours === opt.hours
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cashier & Customer Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Nama Kasir Penerbit
                    </label>
                    <input
                      type="text"
                      value={passCashierName}
                      onChange={(e) => setPassCashierName(e.target.value)}
                      placeholder="Contoh: Kasir Budi"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Catatan Pelanggan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={passCustomerNote}
                      onChange={(e) => setPassCustomerNote(e.target.value)}
                      placeholder="Contoh: Event Ultah / Meja 3"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreatePassModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isCreatingPass}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isCreatingPass ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-slate-950" />
                    )}
                    <span>Terbitkan Kode PASS</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 10: CREATED PASS RESULT MODAL */}
      <AnimatePresence>
        {createdPassResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative"
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">
                Kode PASS Berhasil Diterbitkan!
              </span>
              <h3 className="text-xl font-black text-white mt-1">Berikan Kode Ini ke Pelanggan</h3>

              {/* Large Gold Monospace Code */}
              <div className="my-5 p-4 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/50 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Kode Akses Touchscreen Kiosk:
                </span>
                <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-amber-400 select-all">
                  {createdPassResult.code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdPassResult.code);
                    showNotification(`Kode ${createdPassResult.code} disalin ke clipboard!`);
                  }}
                  className="mt-2 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kode</span>
                </button>
              </div>

              {/* Summary Details */}
              <div className="text-left text-xs space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Paket:</span>
                  <span className="font-bold text-white">{createdPassResult.packageName || 'Sesi Foto'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nominal:</span>
                  <span className="font-bold text-amber-400">{formatRp(createdPassResult.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Berlaku Hingga:</span>
                  <span className="font-medium text-slate-200">
                    {new Date(createdPassResult.expiresAt).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} WIB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Booth:</span>
                  <span className="font-medium text-slate-200">
                    {createdPassResult.kioskCode ? `[${createdPassResult.kioskCode}] ${createdPassResult.kioskName}` : 'Semua Booth Cabang'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => sharePassToOperator(createdPassResult)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                    title="Kirim detail kode PASS ke WhatsApp Operator / Kasir (Tanpa API)"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-200" />
                    <span>Kirim WA ke Operator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sharePassToCustomer(createdPassResult)}
                    className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all"
                    title="Kirim detail kode PASS ke WhatsApp Pelanggan (Tanpa API)"
                  >
                    <Share2 className="w-4 h-4 text-teal-200" />
                    <span>Kirim WA ke Pelanggan</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdPassResult.code);
                      showNotification(`Kode ${createdPassResult.code} disalin ke clipboard!`);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Salin Kode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreatedPassResult(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 11: PASS DETAIL DRILLDOWN DRAWER / MODAL */}
      <AnimatePresence>
        {selectedPassDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative my-8"
            >
              <button
                onClick={() => setSelectedPassDetail(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Rincian Audit Kode Akses PASS</h3>
                  <span className="font-mono text-xs font-bold text-amber-400">{selectedPassDetail.code}</span>
                </div>
              </div>

              {/* Status Header Banner */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 mb-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Token:</span>
                  <span className={`text-sm font-black ${selectedPassDetail.status === 'USED'
                    ? 'text-emerald-400'
                    : new Date(selectedPassDetail.expiresAt) < new Date()
                      ? 'text-rose-400'
                      : 'text-amber-400'
                    }`}>
                    {selectedPassDetail.status === 'USED'
                      ? '✅ Selesai Digunakan'
                      : new Date(selectedPassDetail.expiresAt) < new Date()
                        ? '❌ Sudah Kedaluwarsa'
                        : '⚡ Aktif & Siap Digunakan'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nominal Tagihan:</span>
                  <span className="text-base font-black text-amber-400">
                    {formatRp(selectedPassDetail.amount)}
                  </span>
                </div>
              </div>

              {/* Comprehensive Key-Value Audit Table */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/30">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Waktu Dibuat:</span>
                    <strong className="text-white block mt-0.5">
                      {new Date(selectedPassDetail.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(selectedPassDetail.createdAt).toLocaleTimeString('id-ID')} WIB
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Batas Kedaluwarsa:</span>
                    <strong className="text-white block mt-0.5">
                      {new Date(selectedPassDetail.expiresAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(selectedPassDetail.expiresAt).toLocaleTimeString('id-ID')} WIB
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tipe PASS:</span>
                    <span className="font-bold text-white">
                      {selectedPassDetail.type === 'EXTRA_PRINT' ? 'Cetak Ekstra Add-On' : 'Sesi Foto Penuh'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paket Terkait:</span>
                    <span className="font-bold text-emerald-400">
                      {selectedPassDetail.packageName || 'Sesi Foto'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Booth Penugasan:</span>
                    <span className="font-bold text-white">
                      {selectedPassDetail.kioskCode ? `[${selectedPassDetail.kioskCode}] ${selectedPassDetail.kioskName}` : 'Semua Booth Cabang'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kasir Penerbit:</span>
                    <span className="font-semibold text-white">
                      {selectedPassDetail.operatorName || selectedPassDetail.cashierName || 'Mitra / Kasir'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Catatan Khusus:</span>
                    <span className="font-medium text-slate-300 italic">
                      {selectedPassDetail.customerNote || 'Tidak ada catatan'}
                    </span>
                  </div>
                </div>

                {/* Usage Audit details if USED */}
                {selectedPassDetail.status === 'USED' && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                      Informasi Penebusan Token:
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Waktu Penebusan:</span>
                      <span className="font-bold text-white">
                        {selectedPassDetail.usedAt
                          ? new Date(selectedPassDetail.usedAt).toLocaleString('id-ID')
                          : '-'}
                      </span>
                    </div>
                    {selectedPassDetail.usedSessionId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">ID Sesi Foto:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          #{selectedPassDetail.usedSessionId.slice(-8).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {/* Delete button if NOT USED */}
                  {selectedPassDetail.status !== 'USED' && (
                    <button
                      type="button"
                      onClick={() => setPassToDelete(selectedPassDetail)}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}

                  {/* Revoke button if ACTIVE and not EXPIRED */}
                  {selectedPassDetail.status === 'ACTIVE' && new Date(selectedPassDetail.expiresAt) > new Date() && (
                    <button
                      type="button"
                      onClick={() => {
                        setPassToRevoke(selectedPassDetail);
                        setRevokeReason('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Batalkan</span>
                    </button>
                  )}

                  {/* Extend button if NOT USED */}
                  {selectedPassDetail.status !== 'USED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPassToExtend(selectedPassDetail);
                        setExtendHours(24);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Perpanjang</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {/* WhatsApp to Operator (Without API) */}
                  <button
                    type="button"
                    onClick={() => sharePassToOperator(selectedPassDetail)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    title="Kirim Kode PASS ke WhatsApp Operator (Tanpa API)"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Kirim WA Operator</span>
                  </button>

                  {/* WhatsApp to Customer (Without API) */}
                  <button
                    type="button"
                    onClick={() => sharePassToCustomer(selectedPassDetail)}
                    className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-teal-600/20"
                    title="Kirim Kode PASS ke WhatsApp Pelanggan (Tanpa API)"
                  >
                    <Share2 className="w-3.5 h-3.5 text-teal-200" />
                    <span>Kirim WA Pelanggan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedPassDetail.code);
                      showNotification(`Kode ${selectedPassDetail.code} disalin ke clipboard!`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Salin Kode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPassDetail(null)}
                    className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 12: KONFIRMASI HAPUS KODE PASS */}
      <AnimatePresence>
        {passToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
            >
              <button
                onClick={() => setPassToDelete(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Hapus Kode PASS?</h3>
                  <span className="font-mono text-xs font-bold text-rose-400">{passToDelete.code}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 mb-5 space-y-2">
                <p className="text-xs text-rose-200">
                  Apakah Anda yakin ingin menghapus kode <strong className="font-mono font-bold text-white">{passToDelete.code}</strong> secara permanen?
                </p>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paket:</span>
                    <span className="font-semibold text-white">{passToDelete.packageName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nominal:</span>
                    <span className="font-bold text-amber-400">{formatRp(passToDelete.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status Saat Ini:</span>
                    <span className="font-bold text-slate-300">{passToDelete.status}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * Catatan: Kode yang sudah pernah ditebus (USED) tidak dapat dihapus untuk melindungi integritas transaksi finansial.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeletingPass}
                  onClick={() => setPassToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingPass}
                  onClick={() => handleDeletePass(passToDelete)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/25 disabled:opacity-50"
                >
                  {isDeletingPass ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Permanen</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 13: KONFIRMASI BATALKAN KODE PASS */}
      <AnimatePresence>
        {passToRevoke && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
            >
              <button
                onClick={() => setPassToRevoke(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Batalkan Kode PASS?</h3>
                  <span className="font-mono text-xs font-bold text-amber-400">{passToRevoke.code}</span>
                </div>
              </div>

              <div className="space-y-4 mb-5">
                <p className="text-xs text-slate-300">
                  Kode <strong className="font-mono text-amber-400">{passToRevoke.code}</strong> akan dinonaktifkan sehingga tidak dapat ditebus oleh pelanggan di booth manapun.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Alasan Pembatalan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Contoh: Pelanggan batal bayar tunai / salah input nominal"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isRevokingPass}
                  onClick={() => setPassToRevoke(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={isRevokingPass}
                  onClick={() => handleRevokePass(passToRevoke, revokeReason)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isRevokingPass ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Membatalkan...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Ya, Batalkan Kode</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 14: PERPANJANG MASA BERLAKU KODE PASS */}
      <AnimatePresence>
        {passToExtend && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
            >
              <button
                onClick={() => setPassToExtend(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Perpanjang Masa Berlaku</h3>
                  <span className="font-mono text-xs font-bold text-emerald-400">{passToExtend.code}</span>
                </div>
              </div>

              <div className="space-y-4 mb-5">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Batas Waktu Saat Ini:</span>
                    <span className="font-mono text-white">
                      {new Date(passToExtend.expiresAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold text-emerald-400">{passToExtend.status}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                    Pilih Durasi Tambahan:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { hours: 12, label: '+12 Jam (Setengah Hari)' },
                      { hours: 24, label: '+24 Jam (1 Hari)' },
                      { hours: 48, label: '+48 Jam (2 Hari)' },
                      { hours: 168, label: '+7 Hari (1 Minggu)' },
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setExtendHours(opt.hours)}
                        className={`p-3 rounded-xl border text-left transition-all ${extendHours === opt.hours
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                      >
                        <div className="text-xs">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isExtendingPass}
                  onClick={() => setPassToExtend(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isExtendingPass}
                  onClick={() => handleExtendPass(passToExtend, extendHours)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                >
                  {isExtendingPass ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Perpanjang Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 15: KONFIRMASI HAPUS KASIR */}
      <AnimatePresence>
        {operatorToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
            >
              <button
                onClick={() => setOperatorToDelete(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Hapus Akun Kasir?</h3>
                  <span className="font-mono text-xs font-bold text-rose-400">@{operatorToDelete.username}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 mb-5 space-y-2">
                <p className="text-xs text-rose-200">
                  Apakah Anda yakin ingin menghapus akun kasir <strong className="text-white">{operatorToDelete.name}</strong> (@{operatorToDelete.username})?
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  * Catatan: Jika kasir ini sudah pernah menerbitkan transaksi kode tiket PASS, sistem akan secara otomatis menonaktifkan akun demi menjaga integritas rekonsiliasi kas shift.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeletingOp}
                  onClick={() => setOperatorToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingOp}
                  onClick={() => handleDeleteOperator(operatorToDelete)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/25 disabled:opacity-50"
                >
                  {isDeletingOp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Hapus Kasir</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 16: GANTI KATA SANDI MANDIRI MITRA */}
      <AnimatePresence>
        {showChangePasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
            >
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Ganti Kata Sandi Mitra</h3>
                  <p className="text-xs text-slate-400">Perbarui kata sandi login akun mitra Anda</p>
                </div>
              </div>

              {changePasswordError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {changePasswordError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Kata Sandi Saat Ini
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="Ketik password lama Anda..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Kata Sandi Baru (Minimal 6 Karakter)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Ketik password baru..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Ulangi Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3">
                  <button
                    type="button"
                    disabled={isChangingPassword}
                    onClick={() => setShowChangePasswordModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-500/25 disabled:opacity-50"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Kata Sandi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
