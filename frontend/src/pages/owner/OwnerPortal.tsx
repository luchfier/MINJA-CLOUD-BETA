// frontend/src/pages/owner/OwnerPortal.tsx
// SUPER ADMIN & EXECUTIVE NETWORK COMMAND CENTER (MinjaPhotobooth Enterprise)
// Mendukung Tampilan Desktop Widescreen (1700px) & Mobile Smartphone via Cloudflare Tunnel

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Printer,
  Smartphone,
  Copy,
  Mail,
  Clock,
  Layers,
  AlertTriangle,
  ChevronRight,
  Ticket,
  Plus,
  Receipt,
  Banknote,
  CheckCircle2,
  Monitor,
  Building2,
  ArrowLeft,
  TrendingUp,
  Wallet,
  Percent,
  Users,
  RotateCcw,
  Key,
  DollarSign,
  Activity,
  Filter,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  RefreshCw,
  Settings,
  Power,
  FileText,
} from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';
import { isJwtExpired } from '../../services/httpPhotoboothApi';
import { FleetTab } from './tabs/FleetTab';
import { SessionsTab } from './tabs/SessionsTab';
import { TransactionsTab } from './tabs/TransactionsTab';
import { ExecutiveSummaryModal } from '../../components/admin/ExecutiveSummaryModal';
import { usePwaInstall } from '../../utils/usePwaInstall';
import {
  CategorizedTransactionItem,
  TransactionSummaryDto,
  TransactionCategory,
  TransactionStatus,
  KioskItem,
  PartnerItem,
  NetworkFinancialAnalyticsResponse,
  PartnerDrilldownDetails,
  NetworkSessionItem,
} from '../../types/api';
import { PackageItem } from '../../types/package';

export type TabKey = 'overview' | 'partners' | 'fleet' | 'sessions' | 'transactions';

export const OwnerPortal: React.FC = () => {
  // ==========================================
  // AUTENTIKASI PIN & SESI ADMIN
  // ==========================================
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('minja_owner_token');
    if (saved && saved.split('.').length === 3 && !isJwtExpired(saved)) {
      return saved;
    }
    localStorage.removeItem('minja_owner_token');
    return null;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // ==========================================
  // DEVICE DETECTION & RESPONSIVE ENGINE
  // ==========================================
  const getDetectedMode = (): 'desktop' | 'mobile' => {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
    const isNarrow = window.innerWidth < 1024;
    return isMobileUA || isNarrow ? 'mobile' : 'desktop';
  };

  const [devicePref, setDevicePref] = useState<'auto' | 'desktop' | 'mobile'>(() => {
    return (localStorage.getItem('minja_owner_device_pref') as any) || 'auto';
  });
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>(() => {
    const pref = localStorage.getItem('minja_owner_device_pref');
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
    const clockTimer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
    }, 1000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(clockTimer);
    };
  }, [devicePref]);

  const switchDeviceMode = (pref: 'auto' | 'desktop' | 'mobile') => {
    setDevicePref(pref);
    localStorage.setItem('minja_owner_device_pref', pref);
    if (pref === 'auto') {
      setDeviceMode(getDetectedMode());
    } else {
      setDeviceMode(pref);
    }
  };

  // ==========================================
  // ACTIVE NAVIGATION TAB
  // ==========================================
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // ==========================================
  // DATA STATES
  // ==========================================
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [kiosks, setKiosks] = useState<KioskItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);

  // Feedback Notification
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // PWA Install & Executive Report States
  const { isInstallable, triggerInstall } = usePwaInstall();
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);

  // Tangkap event 401 Unauthorized secara terpusat & watchdog kedaluwarsa JWT proaktif
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('minja_owner_token');
      setToken(null);
      setPinInput('');
      setPinError('Sesi login telah kedaluwarsa. Silakan masukkan PIN kembali.');
    };

    window.addEventListener('minja:unauthorized', handleUnauthorized);

    // Watchdog proaktif: periksa token setiap 30 detik atau saat tab dibuka kembali
    const checkTokenExpiry = () => {
      const saved = localStorage.getItem('minja_owner_token');
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
  // GLOBAL FILTER JARINGAN (MULTI-TIER)
  // ==========================================
  const [globalPartnerFilter, setGlobalPartnerFilter] = useState<string>('ALL');
  const [globalKioskFilter, setGlobalKioskFilter] = useState<string>('ALL');

  // Kiosk options filtered by selected partner
  const availableKiosksForFilter = useMemo(() => {
    if (globalPartnerFilter === 'ALL') return kiosks;
    return kiosks.filter((k) => k.partnerId === globalPartnerFilter);
  }, [kiosks, globalPartnerFilter]);

  // Handle partner filter change
  const handlePartnerFilterChange = (pId: string) => {
    setGlobalPartnerFilter(pId);
    setGlobalKioskFilter('ALL');
  };

  // ==========================================
  // 1. EXECUTIVE NETWORK ANALYTICS STATE
  // ==========================================
  const [networkPeriod, setNetworkPeriod] = useState<
    'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom'
  >('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [networkAnalytics, setNetworkAnalytics] = useState<NetworkFinancialAnalyticsResponse | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  const fetchNetworkAnalytics = useCallback(async () => {
    if (!token) return;
    setIsAnalyticsLoading(true);
    try {
      const res = await photoboothApi.getNetworkFinancialAnalytics(
        {
          period: networkPeriod,
          startDate: networkPeriod === 'custom' ? customStartDate : undefined,
          endDate: networkPeriod === 'custom' ? customEndDate : undefined,
          partnerId: globalPartnerFilter !== 'ALL' ? globalPartnerFilter : undefined,
          kioskId: globalKioskFilter !== 'ALL' ? globalKioskFilter : undefined,
        },
        token
      );
      if (res.success && res.data) {
        setNetworkAnalytics(res.data);
      }
    } catch (e) {
      console.warn('Gagal memuat network analytics:', e);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [token, networkPeriod, customStartDate, customEndDate, globalPartnerFilter, globalKioskFilter]);

  // ==========================================
  // 2. MASTER MANAGEMENT HUB (MITRA DRILLDOWN)
  // ==========================================
  const [selectedDrilldownPartner, setSelectedDrilldownPartner] = useState<PartnerDrilldownDetails | null>(null);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);
  const [drilldownSubTab, setDrilldownSubTab] = useState<'booths' | 'packages' | 'vouchers' | 'cashiers' | 'financials' | 'passes'>('booths');

  // Hapus Booth Modal State (Putus Akses API)
  const [kioskToDelete, setKioskToDelete] = useState<KioskItem | null>(null);
  const [isDeletingKiosk, setIsDeletingKiosk] = useState(false);

  // Akses Password Mitra (Show / Hide Password via Tombol Mata)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const toggleRevealPassword = (partnerId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [partnerId]: !prev[partnerId] }));
  };

  // Ubah Password Mitra Modal State
  const [editPartnerPasswordTarget, setEditPartnerPasswordTarget] = useState<PartnerItem | null>(null);
  const [newPartnerPasswordInput, setNewPartnerPasswordInput] = useState('');
  const [isUpdatingPartnerPassword, setIsUpdatingPartnerPassword] = useState(false);

  // Setting / Edit Data & Profil Mitra Modal State
  const [settingPartnerTarget, setSettingPartnerTarget] = useState<PartnerItem | null>(null);
  const [editPartnerName, setEditPartnerName] = useState('');
  const [editPartnerEmail, setEditPartnerEmail] = useState('');
  const [editPartnerPhone, setEditPartnerPhone] = useState('');
  const [editPartnerSharePct, setEditPartnerSharePct] = useState(70);
  const [editPartnerHeader, setEditPartnerHeader] = useState('');
  const [editPartnerFooter, setEditPartnerFooter] = useState('');
  const [editPartnerIsActive, setEditPartnerIsActive] = useState(true);
  const [isSavingPartnerSettings, setIsSavingPartnerSettings] = useState(false);

  // Hapus Kemitraan Mitra Modal State
  const [partnerToDelete, setPartnerToDelete] = useState<PartnerItem | null>(null);
  const [isDeletingPartner, setIsDeletingPartner] = useState(false);


  // Reset PIN Kasir Modal State
  const [resetPinTarget, setResetPinTarget] = useState<{ id: string; name: string } | null>(null);
  const [newCashierPin, setNewCashierPin] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);

  // Konfigurasi Paket Kiosk Modal State
  const [packageConfigKiosk, setPackageConfigKiosk] = useState<KioskItem | null>(null);
  const [disabledPackagesState, setDisabledPackagesState] = useState<string[]>([]);
  const [isSavingPackages, setIsSavingPackages] = useState(false);

  const fetchPartnerDrilldown = async (partnerId: string) => {
    if (!token) return;
    setIsDrilldownLoading(true);
    try {
      const res = await photoboothApi.getPartnerDrilldown(partnerId, token);
      if (res.success && res.data) {
        setSelectedDrilldownPartner(res.data);
      } else {
        showFeedback('error', 'Gagal memuat detail mitra');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server');
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  const handleConfirmResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resetPinTarget) return;
    if (newCashierPin.length < 4) {
      showFeedback('error', 'PIN minimal 4 digit angka');
      return;
    }
    setIsResettingPin(true);
    try {
      const res = await photoboothApi.resetOperatorPin(resetPinTarget.id, newCashierPin, token);
      if (res.success) {
        showFeedback('success', `PIN Kasir [${resetPinTarget.name}] berhasil diperbarui!`);
        setResetPinTarget(null);
        setNewCashierPin('');
        if (selectedDrilldownPartner) {
          fetchPartnerDrilldown(selectedDrilldownPartner.partner.id);
        }
      } else {
        showFeedback('error', res.error?.message || 'Gagal mereset PIN');
      }
    } catch {
      showFeedback('error', 'Gagal mereset PIN kasir');
    } finally {
      setIsResettingPin(false);
    }
  };

  const handleSavePackageConfig = async () => {
    if (!token || !packageConfigKiosk) return;
    setIsSavingPackages(true);
    try {
      const res = await photoboothApi.updateKioskPackages(packageConfigKiosk.id, disabledPackagesState, token);
      if (res.success) {
        showFeedback('success', `Konfigurasi paket untuk ${packageConfigKiosk.name} berhasil disimpan!`);
        setPackageConfigKiosk(null);
        if (selectedDrilldownPartner) {
          fetchPartnerDrilldown(selectedDrilldownPartner.partner.id);
        }
      } else {
        showFeedback('error', res.error?.message || 'Gagal menyimpan paket');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server');
    } finally {
      setIsSavingPackages(false);
    }
  };

  // Toggle Voucher Mitra
  const handleTogglePartnerVoucher = async (voucherId: string, currentActive: boolean) => {
    if (!token) return;
    try {
      const res = await photoboothApi.toggleOwnerVoucher(voucherId, !currentActive, token);
      if (res.success) {
        showFeedback('success', `Status voucher berhasil ${!currentActive ? 'diaktifkan' : 'dinonaktifkan'}`);
        if (selectedDrilldownPartner) {
          fetchPartnerDrilldown(selectedDrilldownPartner.partner.id);
        }
      }
    } catch {
      showFeedback('error', 'Gagal mengubah status voucher');
    }
  };

  // Hapus Voucher Mitra
  const handleDeletePartnerVoucher = async (voucherId: string) => {
    if (!token || !window.confirm('Yakin ingin menghapus voucher ini?')) return;
    try {
      const res = await photoboothApi.deleteOwnerVoucher(voucherId, token);
      if (res.success) {
        showFeedback('success', 'Voucher berhasil dihapus');
        if (selectedDrilldownPartner) {
          fetchPartnerDrilldown(selectedDrilldownPartner.partner.id);
        }
      }
    } catch {
      showFeedback('error', 'Gagal menghapus voucher');
    }
  };

  // Konfirmasi Hapus Booth & Putus Akses API
  const handleDeleteKioskConfirm = async () => {
    if (!token || !kioskToDelete) return;
    setIsDeletingKiosk(true);
    try {
      const res = await photoboothApi.deleteOwnerKiosk(token, kioskToDelete.id);
      if (res.success) {
        showFeedback('success', `Booth [${kioskToDelete.code}] berhasil dihapus & akses API dicabut!`);
        setKioskToDelete(null);
        fetchAllData();
        if (selectedDrilldownPartner) {
          fetchPartnerDrilldown(selectedDrilldownPartner.partner.id);
        }
      } else {
        showFeedback('error', res.error?.message || 'Gagal menghapus booth');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server');
    } finally {
      setIsDeletingKiosk(false);
    }
  };

  // Ubah Password Mitra
  const handleUpdatePartnerPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editPartnerPasswordTarget) return;
    if (newPartnerPasswordInput.length < 4) {
      showFeedback('error', 'Password minimal 4 karakter');
      return;
    }
    setIsUpdatingPartnerPassword(true);
    try {
      const res = await photoboothApi.updateAdminPartner(token, editPartnerPasswordTarget.id, {
        password: newPartnerPasswordInput,
      });
      if (res.success) {
        showFeedback('success', `Password mitra [${editPartnerPasswordTarget.name}] berhasil diubah!`);
        setEditPartnerPasswordTarget(null);
        setNewPartnerPasswordInput('');
        fetchAllData();
        if (selectedDrilldownPartner) {
          fetchPartnerDrilldown(selectedDrilldownPartner.partner.id);
        }
      } else {
        showFeedback('error', res.error?.message || 'Gagal mengubah password');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server');
    } finally {
      setIsUpdatingPartnerPassword(false);
    }
  };

  // Buka Modal Setting Mitra
  const handleOpenEditPartner = (p: PartnerItem) => {
    setSettingPartnerTarget(p);
    setEditPartnerName(p.name || '');
    setEditPartnerEmail(p.email || '');
    setEditPartnerPhone(p.phone || '');
    setEditPartnerSharePct(p.revenueSharePct ?? 70);
    setEditPartnerHeader(p.receiptHeader || '');
    setEditPartnerFooter(p.receiptFooter || '');
    setEditPartnerIsActive(p.isActive !== false);
  };

  // Simpan Pengaturan Mitra
  const handleSavePartnerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !settingPartnerTarget) return;
    if (!editPartnerName.trim()) {
      showFeedback('error', 'Nama mitra tidak boleh kosong');
      return;
    }
    if (!editPartnerEmail.trim()) {
      showFeedback('error', 'Email mitra tidak boleh kosong');
      return;
    }
    setIsSavingPartnerSettings(true);
    try {
      const res = await photoboothApi.updateAdminPartner(token, settingPartnerTarget.id, {
        name: editPartnerName.trim(),
        email: editPartnerEmail.trim(),
        phone: editPartnerPhone.trim() || undefined,
        revenueSharePct: editPartnerSharePct,
        receiptHeader: editPartnerHeader.trim() || undefined,
        receiptFooter: editPartnerFooter.trim() || undefined,
        isActive: editPartnerIsActive,
      });
      if (res.success) {
        showFeedback('success', `Pengaturan mitra [${editPartnerName}] berhasil disimpan!`);
        setSettingPartnerTarget(null);
        fetchAllData();
        if (selectedDrilldownPartner && selectedDrilldownPartner.partner.id === settingPartnerTarget.id) {
          fetchPartnerDrilldown(settingPartnerTarget.id);
        }
      } else {
        showFeedback('error', res.error?.message || 'Gagal menyimpan pengaturan mitra');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server');
    } finally {
      setIsSavingPartnerSettings(false);
    }
  };

  // Toggle Status Aktif / Nonaktif Mitra
  const handleTogglePartnerActive = async (partner: PartnerItem) => {
    if (!token) return;
    const newStatus = partner.isActive === false;
    try {
      const res = await photoboothApi.updateAdminPartner(token, partner.id, {
        isActive: newStatus,
      });
      if (res.success) {
        showFeedback(
          'success',
          `Mitra [${partner.name}] berhasil ${newStatus ? 'diaktifkan kembali' : 'dinonaktifkan (akses login & transaksi dibekukan)'}!`
        );
        fetchAllData();
        if (selectedDrilldownPartner && selectedDrilldownPartner.partner.id === partner.id) {
          fetchPartnerDrilldown(partner.id);
        }
      } else {
        showFeedback('error', res.error?.message || 'Gagal mengubah status aktif mitra');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server');
    }
  };

  // Konfirmasi Hapus Mitra & Kembalikan Seluruh Booth ke Pusat
  const handleDeletePartnerConfirm = async () => {
    if (!token || !partnerToDelete) return;
    setIsDeletingPartner(true);
    try {
      const res = await photoboothApi.deleteAdminPartner(token, partnerToDelete.id);
      if (res.success) {
        showFeedback(
          'success',
          `Kemitraan mitra [${partnerToDelete.name}] berhasil dihapus & seluruh booth otomatis dikembalikan ke Minja Pusat!`
        );
        const deletedId = partnerToDelete.id;
        setPartnerToDelete(null);
        if (selectedDrilldownPartner && selectedDrilldownPartner.partner.id === deletedId) {
          setSelectedDrilldownPartner(null);
        }
        fetchAllData();
      } else {
        showFeedback('error', res.error?.message || 'Gagal menghapus mitra');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server');
    } finally {
      setIsDeletingPartner(false);
    }
  };


  // ==========================================
  // 3. SESSIONS FEED WITH FULL IDENTITY
  // ==========================================
  const [networkSessions, setNetworkSessions] = useState<NetworkSessionItem[]>([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionStatus, setSessionStatus] = useState<string>('ALL');
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotalPages, setSessionTotalPages] = useState(1);
  const [sessionTotalCount, setSessionTotalCount] = useState(0);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);

  const fetchNetworkSessions = useCallback(async () => {
    if (!token) return;
    setIsSessionsLoading(true);
    try {
      const res = await photoboothApi.getNetworkSessions(
        {
          partnerId: globalPartnerFilter !== 'ALL' ? globalPartnerFilter : undefined,
          kioskId: globalKioskFilter !== 'ALL' ? globalKioskFilter : undefined,
          search: sessionSearch.trim() || undefined,
          status: sessionStatus !== 'ALL' ? sessionStatus : undefined,
          page: sessionPage,
          limit: 20,
        },
        token
      );
      if (res.success && res.data) {
        setNetworkSessions(res.data.items);
        setSessionTotalCount(res.data.total);
        setSessionTotalPages(res.data.totalPages);
      }
    } catch (e) {
      console.warn('Gagal memuat network sessions:', e);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [token, globalPartnerFilter, globalKioskFilter, sessionSearch, sessionStatus, sessionPage]);

  // ==========================================
  // 4. TRANSACTIONS LEDGER (MULTI-TIER)
  // ==========================================
  const [transactions, setTransactions] = useState<CategorizedTransactionItem[]>([]);
  const [transactionTotal, setTransactionTotal] = useState<number>(0);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummaryDto | null>(null);
  const [txCategoryFilter, setTxCategoryFilter] = useState<TransactionCategory | 'ALL'>('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState<TransactionStatus | 'ALL'>('ALL');
  const [txDateMode, setTxDateMode] = useState<'today' | 'monthly' | 'custom' | 'all'>('today');
  const [txSelectedDate, setTxSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [txSelectedMonth, setTxSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [txStartDate, setTxStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [txEndDate, setTxEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txPage, setTxPage] = useState<number>(1);
  const [txLimit] = useState<number>(15);
  const [txTotalPages, setTxTotalPages] = useState<number>(1);
  const [selectedTxDetail, setSelectedTxDetail] = useState<CategorizedTransactionItem | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const [txRes, sumRes] = await Promise.all([
        photoboothApi.getOwnerTransactions(
          {
            category: txCategoryFilter,
            status: txStatusFilter,
            dateMode: txDateMode,
            selectedDate: txSelectedDate,
            selectedMonth: txSelectedMonth,
            startDate: txStartDate,
            endDate: txEndDate,
            partnerId: globalPartnerFilter !== 'ALL' ? globalPartnerFilter : undefined,
            kioskId: globalKioskFilter !== 'ALL' ? globalKioskFilter : undefined,
            search: txSearchQuery.trim() || undefined,
            page: txPage,
            limit: txLimit,
          },
          token
        ),
        photoboothApi.getOwnerTransactionSummary(
          {
            dateMode: txDateMode,
            selectedDate: txSelectedDate,
            selectedMonth: txSelectedMonth,
            startDate: txStartDate,
            endDate: txEndDate,
            partnerId: globalPartnerFilter !== 'ALL' ? globalPartnerFilter : undefined,
            kioskId: globalKioskFilter !== 'ALL' ? globalKioskFilter : undefined,
          },
          token
        ),
      ]);

      if (txRes.success && txRes.data) {
        setTransactions(txRes.data.items);
        setTransactionTotal(txRes.data.total);
        setTxTotalPages(txRes.data.totalPages || Math.ceil(txRes.data.total / txLimit) || 1);
      }
      if (sumRes.success && sumRes.data) {
        setTransactionSummary(sumRes.data);
      }
    } catch (e) {
      console.warn('Gagal memuat transaksi:', e);
    }
  }, [
    token,
    txCategoryFilter,
    txStatusFilter,
    txDateMode,
    txSelectedDate,
    txSelectedMonth,
    txStartDate,
    txEndDate,
    txSearchQuery,
    txPage,
    txLimit,
    globalPartnerFilter,
    globalKioskFilter,
  ]);

  const handleExportTransactionsCsv = async () => {
    setIsExportingCsv(true);
    try {
      const csvContent = await photoboothApi.exportOwnerTransactionsCsv(
        {
          category: txCategoryFilter,
          status: txStatusFilter,
          dateMode: txDateMode,
          selectedDate: txSelectedDate,
          selectedMonth: txSelectedMonth,
          startDate: txStartDate,
          endDate: txEndDate,
          partnerId: globalPartnerFilter !== 'ALL' ? globalPartnerFilter : undefined,
          kioskId: globalKioskFilter !== 'ALL' ? globalKioskFilter : undefined,
          search: txSearchQuery.trim() || undefined,
        },
        token || undefined
      );
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `laporan_transaksi_minja_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showFeedback('success', 'File CSV berhasil diunduh!');
    } catch {
      showFeedback('error', 'Gagal mengekspor laporan CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // ==========================================
  // 5. MASTER DATA FETCHING
  // ==========================================
  const fetchAllData = useCallback(async () => {
    if (!token) return;

    try {
      const [packagesRes, kiosksRes, partnersRes] = await Promise.all([
        photoboothApi.getPackages(),
        photoboothApi.getOwnerKiosks(token),
        photoboothApi.getAdminPartners(token),
      ]);

      if ((kiosksRes && !kiosksRes.success && kiosksRes.error?.code === 'UNAUTHORIZED') ||
          (partnersRes && !partnersRes.success && partnersRes.error?.code === 'UNAUTHORIZED')) {
        localStorage.removeItem('minja_owner_token');
        setToken(null);
        setPinInput('');
        setPinError('Sesi login telah kedaluwarsa. Silakan masukkan PIN kembali.');
        return;
      }

      if (packagesRes.success && packagesRes.data) setPackages(packagesRes.data);
      if (kiosksRes && kiosksRes.success && kiosksRes.data) setKiosks(kiosksRes.data);
      if (partnersRes && partnersRes.success && partnersRes.data) setPartners(partnersRes.data);

      await Promise.all([fetchNetworkAnalytics(), fetchTransactions(), fetchNetworkSessions()]);
    } catch (e) {
      console.warn('Gagal memuat master data owner:', e);
    }
  }, [token, fetchNetworkAnalytics, fetchTransactions, fetchNetworkSessions]);

  // Polling Real-Time setiap 8 detik
  useEffect(() => {
    if (token) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 8000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [token, fetchAllData]);

  // Trigger saat filter global berubah
  useEffect(() => {
    if (token) {
      fetchNetworkAnalytics();
      fetchTransactions();
      fetchNetworkSessions();
    }
  }, [globalPartnerFilter, globalKioskFilter, fetchNetworkAnalytics, fetchTransactions, fetchNetworkSessions]);

  // ==========================================
  // OPERATIONAL ACTION MODALS
  // ==========================================
  // Modal: Tambah Mitra
  const [isCreatePartnerModalOpen, setIsCreatePartnerModalOpen] = useState(false);
  const [partnerNameInput, setPartnerNameInput] = useState('');
  const [partnerEmailInput, setPartnerEmailInput] = useState('');
  const [partnerPassInput, setPartnerPassInput] = useState('');
  const [partnerPhoneInput, setPartnerPhoneInput] = useState('');
  const [partnerSharePctInput, setPartnerSharePctInput] = useState<number>(70);
  const [isCreatingPartner, setIsCreatingPartner] = useState(false);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsCreatingPartner(true);
    try {
      const res = await photoboothApi.createAdminPartner(token, {
        name: partnerNameInput,
        email: partnerEmailInput,
        password: partnerPassInput,
        phone: partnerPhoneInput,
        revenueSharePct: partnerSharePctInput,
      });
      if (res.success) {
        showFeedback('success', `Mitra [${partnerNameInput}] berhasil didaftarkan!`);
        setIsCreatePartnerModalOpen(false);
        setPartnerNameInput('');
        setPartnerEmailInput('');
        setPartnerPassInput('');
        setPartnerPhoneInput('');
        fetchAllData();
      } else {
        showFeedback('error', res.error?.message || 'Gagal mendaftarkan mitra');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server');
    } finally {
      setIsCreatingPartner(false);
    }
  };

  // Modal: Tambah Booth Baru
  const [isCreateKioskModalOpen, setIsCreateKioskModalOpen] = useState(false);
  const [kioskNameInput, setKioskNameInput] = useState('');
  const [kioskLocationInput, setKioskLocationInput] = useState('');
  const [kioskCodeInput, setKioskCodeInput] = useState('');
  const kioskCapacityInput = 400;
  const [kioskPartnerIdInput, setKioskPartnerIdInput] = useState<string>('');
  const [isCreatingKiosk, setIsCreatingKiosk] = useState(false);
  const [createdKioskResult, setCreatedKioskResult] = useState<KioskItem | null>(null);

  const handleCreateKiosk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsCreatingKiosk(true);
    try {
      const res = await photoboothApi.createOwnerKiosk(token, {
        name: kioskNameInput,
        location: kioskLocationInput,
        code: kioskCodeInput.trim() || undefined,
        paperRollCapacity: kioskCapacityInput,
      });
      if (res.success && res.data) {
        if (kioskPartnerIdInput) {
          await photoboothApi.assignKioskToPartner(token, res.data.id, kioskPartnerIdInput);
        }
        setCreatedKioskResult(res.data);
        showFeedback('success', `Booth [${res.data.name}] berhasil didaftarkan!`);
        setKioskNameInput('');
        setKioskLocationInput('');
        setKioskCodeInput('');
        fetchAllData();
      } else {
        const errMsg = !res.success ? res.error?.message : 'Gagal mendaftarkan booth';
        showFeedback('error', errMsg || 'Gagal mendaftarkan booth');
      }
    } catch {
      showFeedback('error', 'Gagal mendaftarkan booth');
    } finally {
      setIsCreatingKiosk(false);
    }
  };



  // Modal: Lock / Unlock Booth
  const [isLockKioskModalOpen, setIsLockKioskModalOpen] = useState(false);
  const [targetLockKiosk, setTargetLockKiosk] = useState<KioskItem | null>(null);
  const [lockReasonInput, setLockReasonInput] = useState('Pengisian ulang kertas / pemeliharaan');
  const [isSubmittingLock, setIsSubmittingLock] = useState(false);

  const handleConfirmLockKiosk = async () => {
    if (!token || !targetLockKiosk) return;
    setIsSubmittingLock(true);
    try {
      const res = await photoboothApi.toggleOwnerKioskLock(token, targetLockKiosk.id, true, lockReasonInput);
      if (res.success) {
        showFeedback('success', `Booth [${targetLockKiosk.code}] berhasil dikunci.`);
        setIsLockKioskModalOpen(false);
        setTargetLockKiosk(null);
        fetchAllData();
      }
    } catch {
      showFeedback('error', 'Gagal mengunci booth');
    } finally {
      setIsSubmittingLock(false);
    }
  };

  const handleUnlockKiosk = async (kioskId: string, kioskCode: string) => {
    if (!token) return;
    try {
      const res = await photoboothApi.toggleOwnerKioskLock(token, kioskId, false);
      if (res.success) {
        showFeedback('success', `Booth [${kioskCode}] berhasil dibuka kembali.`);
        fetchAllData();
      }
    } catch {
      showFeedback('error', 'Gagal membuka kunci booth');
    }
  };

  // Remote Reset Sesi Booth
  const handleRemoteResetKiosk = async (kioskId: string, kioskCode: string) => {
    if (!token || !window.confirm(`Reset sesi aktif di booth [${kioskCode}] sekarang?`)) return;
    try {
      const res = await photoboothApi.remoteResetKioskSession(kioskId, token);
      if (res.success) {
        showFeedback('success', `Booth [${kioskCode}] berhasil direset.`);
        fetchAllData();
      }
    } catch {
      showFeedback('error', 'Gagal mereset booth');
    }
  };

  // Rotasi API Key
  const handleRotateApiKey = async (kioskId: string, kioskCode: string) => {
    if (!token || !window.confirm(`Rotasi API Key untuk booth [${kioskCode}]? Komputer booth harus diupdate dengan key baru.`)) return;
    try {
      const res = await photoboothApi.rotateOwnerKioskApiKey(token, kioskId);
      if (res.success && res.data) {
        navigator.clipboard.writeText(res.data.apiKey);
        showFeedback('success', `API Key [${kioskCode}] berhasil dirotasi & disalin ke clipboard!`);
        fetchAllData();
      }
    } catch {
      showFeedback('error', 'Gagal rotasi API Key');
    }
  };

  // Modal Ubah PIN Admin
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPin.length < 4 || newPin.length > 8) {
      setChangePinError('PIN baru harus 4 - 8 digit.');
      return;
    }
    if (newPin !== confirmPin) {
      setChangePinError('Konfirmasi PIN baru tidak cocok.');
      return;
    }
    setIsChangingPin(true);
    setChangePinError('');
    try {
      const res = await photoboothApi.changePin(token, oldPin, newPin);
      if (res.success) {
        showFeedback('success', 'PIN Keamanan berhasil diubah!');
        setIsChangePinOpen(false);
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setChangePinError(res.error?.message || 'Gagal mengubah PIN');
      }
    } catch {
      setChangePinError('Gagal menghubungi server');
    } finally {
      setIsChangingPin(false);
    }
  };

  // Resend Soft File Email
  const [resendModalSession, setResendModalSession] = useState<{ id: string; code: string } | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  const handleResendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resendModalSession) return;
    setIsResendingEmail(true);
    try {
      const res = await photoboothApi.ownerResendEmail(resendModalSession.id, targetEmail, token);
      if (res.success) {
        showFeedback('success', `Soft file berhasil dikirim ke ${targetEmail}`);
        setResendModalSession(null);
        setTargetEmail('');
      } else {
        showFeedback('error', res.error?.message || 'Gagal mengirim email');
      }
    } catch {
      showFeedback('error', 'Gagal mengirim email');
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Login Master Security Key Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.trim().length < 4) {
      setPinError('Masukkan Master Security Key (minimal 4 karakter).');
      return;
    }
    setIsLoggingIn(true);
    setPinError('');
    try {
      const res = await photoboothApi.loginAdmin(pinInput.trim());
      if (res.success && res.data) {
        localStorage.setItem('minja_owner_token', res.data.token);
        setToken(res.data.token);
        setPinInput('');
      } else {
        const errMsg = !res.success ? res.error?.message : 'Kredensial Master Key tidak valid.';
        setPinError(errMsg || 'Kredensial Master Key tidak valid.');
      }
    } catch {
      setPinError('Gagal menghubungi node server booth.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('minja_owner_token');
    setToken(null);
    showFeedback('success', 'Sesi Master Command Console telah diakhiri.');
  };

  // Helper Warna Kategori Transaksi
  const getCategoryBadgeInfo = (cat: TransactionCategory) => {
    switch (cat) {
      case 'QRIS_MIDTRANS':
        return { label: 'QRIS Midtrans', icon: Smartphone, bg: 'bg-violet-500/15 text-violet-300 border-violet-500/30' };
      case 'CASH_DESK':
        return { label: 'Tunai Kasir', icon: Banknote, bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'CASH_PASSCODE':
        return { label: 'Kode Akses (PASS)', icon: KeyRound, bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'EXTRA_PRINTS':
        return { label: 'Cetak Tambahan', icon: Printer, bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
      case 'VOUCHER_PROMO':
        return { label: 'Diskon Voucher', icon: Ticket, bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      default:
        return { label: 'Lainnya', icon: Layers, bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
    }
  };

  // ==========================================
  // VIEW: LOGIN SCREEN (EXECUTIVE ENTERPRISE COMMAND GATEWAY)
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
        {/* Subtle Ambient Radial Backdrops */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
          {/* Header Security Status Badge */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                ROOT AUTHORITY GATEWAY
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
              TIER-0 ACTIVE
            </span>
          </div>

          {/* Central Logo & Console Title */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white mx-auto flex items-center justify-center shadow-xl shadow-indigo-600/30 border border-indigo-400/30">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">MINJA EXECUTIVE HUB</h1>
            <p className="text-xs text-slate-400">
              Super Admin Network Control & Master Franchise Console
            </p>
          </div>

          {/* Credential Authority Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Tingkat Otoritas:</span>
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <span>👑 Super Administrator</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Protokol Keamanan:</span>
              <span className="font-mono text-indigo-300 text-[10px]">Argon2id • Zero-Trust Tunnel</span>
            </div>
          </div>

          {/* Form Login */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
                <span>Master Security Key</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Masukkan Security Key Admin..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono tracking-wider transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  title={showKey ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || pinInput.length < 4}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white font-black text-sm shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-400/20"
            >
              {isLoggingIn ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mengautentikasi Kredensial...</span>
                </div>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Buka Master Command Suite</span>
                </>
              )}
            </button>
          </form>

          {/* Security Footnote */}
          <div className="pt-2 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[10px] text-slate-500">
              MinjaPhotobooth Enterprise Platform v2.4 • Secured Node
            </p>
            <p className="text-[9px] text-slate-600 font-mono">
              Audit logging aktif. Seluruh upaya autentikasi dicatat secara permanen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // NAVIGATION MENU DEFINITION (5 TABS)
  // ==========================================
  const navTabs = [
    {
      group: 'RINGKASAN & BISNIS',
      items: [
        { id: 'overview' as const, label: 'Executive Command', icon: Layers, badge: undefined },
        { id: 'transactions' as const, label: 'Ledger Transaksi', icon: Receipt, badge: transactionTotal },
      ],
    },
    {
      group: 'JARINGAN & FRANCHISE',
      items: [
        { id: 'partners' as const, label: 'Master Mitra', icon: Building2, badge: partners.length },
        {
          id: 'fleet' as const,
          label: 'Booth',
          icon: Monitor,
          badge: kiosks.filter((k) => k.status === 'ONLINE' || k.status === 'IN_SESSION' || k.status === 'PRINTING').length,
        },
      ],
    },
    {
      group: 'MONITORING REAL-TIME',
      items: [
        { id: 'sessions' as const, label: 'Sesi Jaringan', icon: Clock, badge: sessionTotalCount },
      ],
    },
  ];

  // Helper Status Counts
  const onlineKiosksCount = kiosks.filter((k) => k.status === 'ONLINE' || k.status === 'IN_SESSION' || k.status === 'PRINTING').length;
  const lockedKiosksCount = kiosks.filter((k) => k.isLocked || k.status === 'MAINTENANCE').length;
  const offlineKiosksCount = kiosks.filter((k) => k.status === 'OFFLINE').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* ========================================================= */}
      {/* TOAST FEEDBACK NOTIFICATION                               */}
      {/* ========================================================= */}
      {feedbackMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 transition-all animate-bounce ${feedbackMsg.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
            }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* DESKTOP FIXED SIDEBAR (WIDESCREEN OBSIDIAN GLASS)         */}
      {/* ========================================================= */}
      {deviceMode === 'desktop' ? (
        <div className="flex min-h-screen">
          <aside className="w-72 shrink-0 border-r border-slate-800/80 bg-slate-900/70 backdrop-blur-2xl p-5 flex flex-col justify-between fixed inset-y-0 left-0 z-30 overflow-y-auto">
            <div className="space-y-6">
              {/* Brand & Live Indicator */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/25">
                    M
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-tight text-white">SUPER ADMIN</h2>
                    <span className="text-[10px] text-indigo-400 font-mono font-semibold">Minja Network Hub</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE</span>
                </div>
              </div>

              {/* GLOBAL NETWORK MULTI-TIER FILTER */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-indigo-400" /> Filter Jaringan
                  </span>
                  {(globalPartnerFilter !== 'ALL' || globalKioskFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setGlobalPartnerFilter('ALL');
                        setGlobalKioskFilter('ALL');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 text-[9px] font-bold cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Pilih Mitra:</label>
                  <select
                    value={globalPartnerFilter}
                    onChange={(e) => handlePartnerFilterChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Mitra ({partners.length})</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Pilih Booth:</label>
                  <select
                    value={globalKioskFilter}
                    onChange={(e) => setGlobalKioskFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Booth ({availableKiosksForFilter.length})</option>
                    {availableKiosksForFilter.map((k) => (
                      <option key={k.id} value={k.id}>
                        [{k.code}] {k.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* NAVIGATION MENU */}
              <nav className="space-y-4">
                {navTabs.map((group, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2">
                      {group.group}
                    </div>
                    {group.items.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setSelectedDrilldownPartner(null);
                          }}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                          </div>
                          {tab.badge !== undefined && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                                }`}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            {/* SIDEBAR FOOTER (DEVICE SWITCHER, PWA & LOGOUT) */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              {isInstallable && (
                <button
                  type="button"
                  onClick={triggerInstall}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pasang Aplikasi (PWA)</span>
                </button>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono">{currentTimeStr}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">Windows Kiosk</span>
              </div>

              {/* Device Mode Switcher */}
              <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
                <button
                  onClick={() => switchDeviceMode('desktop')}
                  className={`flex-1 py-1 rounded-lg text-center font-bold transition-all cursor-pointer ${devicePref === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => switchDeviceMode('mobile')}
                  className={`flex-1 py-1 rounded-lg text-center font-bold transition-all cursor-pointer ${devicePref === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Mobile
                </button>
                <button
                  onClick={() => switchDeviceMode('auto')}
                  className={`flex-1 py-1 rounded-lg text-center font-bold transition-all cursor-pointer ${devicePref === 'auto' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Auto
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/70 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-transparent hover:border-rose-500/30"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Portal</span>
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA FOR DESKTOP (WIDESCREEN 1700PX) */}
          <main className="flex-1 ml-72 p-6 sm:p-8 max-w-[1700px] w-full min-h-screen overflow-x-hidden space-y-6">
            {renderTabContent()}
          </main>
        </div>
      ) : (
        /* ========================================================= */
        /* MOBILE VIEW LAYOUT (STREAMLINED FOR SMARTPHONE)           */
        /* ========================================================= */
        <div className="min-h-screen pb-28">
          {/* Mobile Sticky Header */}
          <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                M
              </div>
              <div>
                <h1 className="text-xs font-black text-white">SUPER ADMIN</h1>
                <span className="text-[9px] text-indigo-400 font-mono">Minja Network Hub</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={triggerInstall}
                  className="px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Install</span>
                </button>
              )}
              <button
                onClick={() => switchDeviceMode(devicePref === 'desktop' ? 'mobile' : 'desktop')}
                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-bold"
              >
                Mode: {devicePref.toUpperCase()}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Mobile Global Filter Indicator */}
          <div className="p-3 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {globalPartnerFilter === 'ALL' ? 'Semua Mitra' : partners.find((p) => p.id === globalPartnerFilter)?.name}
                {globalKioskFilter !== 'ALL' && ` • Booth ${kiosks.find((k) => k.id === globalKioskFilter)?.code}`}
              </span>
            </div>
            <select
              value={globalPartnerFilter}
              onChange={(e) => handlePartnerFilterChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-white px-2 py-1"
            >
              <option value="ALL">Semua Mitra</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Main Content */}
          <main className="w-full max-w-full px-3 py-4 sm:p-6 space-y-4 overflow-x-hidden">
            {renderTabContent()}
          </main>

          {/* Fixed Bottom Dock Navigation (Native App UX) */}
          <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-2 py-1 flex items-center justify-around shadow-2xl">
            {[
              { id: 'overview' as const, label: 'Command', icon: Layers },
              { id: 'partners' as const, label: 'Mitra', icon: Building2, badge: partners.length },
              { id: 'fleet' as const, label: 'Booth', icon: Monitor, badge: onlineKiosksCount },
              { id: 'sessions' as const, label: 'Sesi', icon: Clock, badge: sessionTotalCount },
              { id: 'transactions' as const, label: 'Ledger', icon: Receipt, badge: transactionTotal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedDrilldownPartner(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${isActive ? 'text-indigo-400 font-bold' : 'text-slate-400'
                    }`}
                >
                  <div className={`p-1 rounded-lg relative ${isActive ? 'bg-indigo-500/20 text-indigo-400' : ''}`}>
                    <Icon className="w-4 h-4" />
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[8px] font-black flex items-center justify-center">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] mt-0.5">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* ========================================================= */}
      {/* ALL MODAL WINDOWS (SHARED ACROSS DESKTOP & MOBILE)        */}
      {/* ========================================================= */}
      {renderModals()}
    </div>
  );

  // =============================================================
  // SUB-RENDER: MAIN TAB ROUTER
  // =============================================================
  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'partners':
        return renderPartnersTab();
      case 'fleet':
        return (
          <FleetTab
            kiosks={kiosks}
            partners={partners}
            globalPartnerFilter={globalPartnerFilter}
            onOpenCreateModal={() => {
              setCreatedKioskResult(null);
              setIsCreateKioskModalOpen(true);
            }}
            onOpenLockModal={(k) => {
              setTargetLockKiosk(k);
              setIsLockKioskModalOpen(true);
            }}
            onUnlockKiosk={handleUnlockKiosk}
            onConfigurePackages={(k) => {
              setPackageConfigKiosk(k);
              setDisabledPackagesState((k.disabledPackageIds as string[]) || []);
            }}
            onRemoteReset={handleRemoteResetKiosk}
            onRotateApiKey={handleRotateApiKey}
            onDeleteKiosk={(k) => setKioskToDelete(k)}
          />
        );
      case 'sessions':
        return (
          <SessionsTab
            networkSessions={networkSessions}
            sessionTotalCount={sessionTotalCount}
            isSessionsLoading={isSessionsLoading}
            sessionSearch={sessionSearch}
            setSessionSearch={setSessionSearch}
            sessionStatus={sessionStatus}
            setSessionStatus={setSessionStatus}
            sessionPage={sessionPage}
            setSessionPage={setSessionPage}
            sessionTotalPages={sessionTotalPages}
            onResendEmail={(s) => {
              setResendModalSession({ id: s.id, code: s.code });
              setTargetEmail(s.email || '');
            }}
          />
        );
      case 'transactions':
        return (
          <TransactionsTab
            transactionTotal={transactionTotal}
            isExportingCsv={isExportingCsv}
            onExportCsv={handleExportTransactionsCsv}
            onOpenExecutiveSummary={() => setIsExecutiveModalOpen(true)}
            transactionSummary={transactionSummary}
            txDateMode={txDateMode}
            setTxDateMode={setTxDateMode}
            txSelectedDate={txSelectedDate}
            setTxSelectedDate={setTxSelectedDate}
            txSelectedMonth={txSelectedMonth}
            setTxSelectedMonth={setTxSelectedMonth}
            txStartDate={txStartDate}
            setTxStartDate={setTxStartDate}
            txEndDate={txEndDate}
            setTxEndDate={setTxEndDate}
            txCategoryFilter={txCategoryFilter}
            setTxCategoryFilter={setTxCategoryFilter}
            txStatusFilter={txStatusFilter}
            setTxStatusFilter={setTxStatusFilter}
            txSearchQuery={txSearchQuery}
            setTxSearchQuery={setTxSearchQuery}
            transactions={transactions}
            txTotalPages={txTotalPages}
            txPage={txPage}
            setTxPage={setTxPage}
            onSelectTxDetail={(tx) => setSelectedTxDetail(tx)}
            getCategoryBadgeInfo={getCategoryBadgeInfo}
          />
        );
      default:
        return renderOverviewTab();
    }
  }

  // =============================================================
  // TAB 1: EXECUTIVE NETWORK COMMAND CENTER
  // =============================================================
  function renderOverviewTab() {
    const analytics = networkAnalytics;
    const summary = analytics?.summary;
    const leaderboard = analytics?.partnersLeaderboard || [];
    const channelBreakdown = analytics?.breakdownByChannel;

    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header & Period Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
              Minja Executive Network Telemetry
            </span>
            <h1 className="text-lg sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
              <span>Command Center Jaringan</span>
              {isAnalyticsLoading && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal animate-pulse">
                  Memperbarui...
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Konsolidasi omzet seluruh mitra, bagi hasil, dan performa photobooth
            </p>
          </div>

          {/* Period Selector Tabs & Custom Range */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {[
                { id: 'today' as const, label: 'Hari Ini' },
                { id: 'yesterday' as const, label: 'Kemarin' },
                { id: '7d' as const, label: '7 Hari' },
                { id: '30d' as const, label: '30 Hari' },
                { id: 'this_month' as const, label: 'Bulan Ini' },
                { id: 'last_month' as const, label: 'Bulan Lalu' },
                { id: 'custom' as const, label: 'Kustom' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setNetworkPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${networkPeriod === p.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {networkPeriod === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto justify-between sm:justify-start">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-xs text-white px-2 py-1 focus:outline-none"
                />
                <span className="text-xs text-slate-500">s/d</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-xs text-white px-2 py-1 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PUSAT AKSI OPERASIONAL SUPER ADMIN (EXECUTIVE COMMAND MATRIX) */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-indigo-900/40 shadow-2xl space-y-3.5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                  Executive Operational Command // Tier-0 Root Authority
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white mt-0.5">
                Pusat Aksi Operasional Super Admin
              </h2>
              <p className="text-xs text-slate-400">
                Akses sentral onboarding mitra franchise, registrasi hardware booth, audit ledger transaksi, monitoring armada, dan master security
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsExecutiveModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-indigo-500/30"
                title="Buka Ringkasan Eksekutif Finansial & Dokumen Bagi Hasil"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ringkasan Eksekutif & Bagi Hasil</span>
              </button>

              <button
                onClick={fetchAllData}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sinkronisasi Telemetri</span>
              </button>
            </div>
          </div>

          {/* Action Grid (5 Executive Action Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* 1. Onboarding Mitra */}
            <button
              onClick={() => setIsCreatePartnerModalOpen(true)}
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block group-hover:text-indigo-300 transition-colors">
                  Daftarkan Mitra
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Onboarding franchise & bagi hasil
                </span>
              </div>
            </button>

            {/* 2. Provisioning Booth */}
            <button
              onClick={() => {
                setCreatedKioskResult(null);
                setIsCreateKioskModalOpen(true);
              }}
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 hover:bg-cyan-600/10 border border-slate-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block group-hover:text-cyan-300 transition-colors">
                  Daftarkan Booth
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Hardware key & roll kertas
                </span>
              </div>
            </button>

            {/* 3. Audit Ledger Transaksi */}
            <button
              onClick={() => setActiveTab('transactions')}
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 hover:bg-amber-600/10 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block group-hover:text-amber-300 transition-colors">
                  Audit Transaksi
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Ledger QRIS, tunai & voucher
                </span>
              </div>
            </button>

            {/* 4. Monitor Armada Booth */}
            <button
              onClick={() => setActiveTab('fleet')}
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 hover:bg-emerald-600/10 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block group-hover:text-emerald-300 transition-colors">
                  Armada Booth
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Cek kertas & hardware mesin
                </span>
              </div>
            </button>

            {/* 5. Master Security Key */}
            <button
              onClick={() => setIsChangePinOpen(true)}
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 hover:bg-violet-600/10 border border-slate-800 hover:border-violet-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between col-span-2 sm:col-span-1"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block group-hover:text-violet-300 transition-colors">
                  Master Security
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  PIN otorisasi & Argon2id
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 5 HERO KPI CARDS (2 COLS ON MOBILE, 5 COLS ON DESKTOP) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {/* 1. Gross Network Revenue (Span 2 on mobile) */}
          <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-slate-900/90 border border-indigo-900/50 shadow-xl relative overflow-hidden">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5 sm:mb-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Omzet Jaringan</span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 sm:mt-1 truncate">
              Rp {(summary?.grossRevenue || 0).toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-indigo-300 mt-1 block">Semua Mitra & Lokasi</span>
          </div>

          {/* 2. Net Minja Platform Royalty */}
          <div className="col-span-1 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-950/80 via-slate-900/90 to-slate-900/90 border border-emerald-900/50 shadow-xl relative overflow-hidden">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 sm:mb-3">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Royalty Minja</span>
            <div className="text-base sm:text-2xl font-black text-emerald-400 font-mono mt-0.5 sm:mt-1 truncate">
              Rp {(summary?.minjaRoyalty || 0).toLocaleString('id-ID')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-emerald-300/80 mt-1 block">Net Platform Earnings</span>
          </div>

          {/* 3. Total Partner Share Payout */}
          <div className="col-span-1 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-950/80 via-slate-900/90 to-slate-900/90 border border-amber-900/50 shadow-xl relative overflow-hidden">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 sm:mb-3">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Bagi Hasil Mitra</span>
            <div className="text-base sm:text-2xl font-black text-amber-400 font-mono mt-0.5 sm:mt-1 truncate">
              Rp {(summary?.partnerShare || 0).toLocaleString('id-ID')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-amber-300/80 mt-1 block">Total Hak Mitra</span>
          </div>

          {/* 4. Total Sesi & Lembar Cetak */}
          <div className="col-span-1 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-2 sm:mb-3">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sesi Foto</span>
            <div className="text-base sm:text-2xl font-black text-white font-mono mt-0.5 sm:mt-1">
              {summary?.totalSessions || 0} <span className="text-xs font-normal text-slate-400">Sesi</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-violet-300 mt-1 block truncate">{summary?.totalPrints || 0} Lbr Cetak</span>
          </div>

          {/* 5. Average Order Value (AOV) */}
          <div className="col-span-1 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2 sm:mb-3">
              <Percent className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rata-rata Order</span>
            <div className="text-base sm:text-2xl font-black text-cyan-400 font-mono mt-0.5 sm:mt-1 truncate">
              Rp {(summary?.averageOrderValue || 0).toLocaleString('id-ID')}
            </div>
            <span className="text-[9px] sm:text-[10px] text-cyan-300 mt-1 block">AOV Per Sesi</span>
          </div>
        </div>

        {/* STATUS BOOTH JARINGAN */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Status Booth ({kiosks.length} Unit)</h3>
            </div>
            <button
              onClick={() => setActiveTab('fleet')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Kelola</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Terdaftar</span>
              <span className="text-base sm:text-xl font-black text-white font-mono mt-0.5 sm:mt-1 block">{kiosks.length} Mesin</span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">🟢 Online</span>
              <span className="text-base sm:text-xl font-black text-emerald-300 font-mono mt-0.5 sm:mt-1 block">{onlineKiosksCount} Mesin</span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">🔒 Terkunci</span>
              <span className="text-base sm:text-xl font-black text-amber-300 font-mono mt-0.5 sm:mt-1 block">{lockedKiosksCount} Mesin</span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">⚪ Offline</span>
              <span className="text-base sm:text-xl font-black text-slate-300 font-mono mt-0.5 sm:mt-1 block">{offlineKiosksCount} Mesin</span>
            </div>
          </div>
        </div>



        {/* 2-COLUMN SECTION: LEADERBOARD MITRA & CHANNEL BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Leaderboard Performa Mitra */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Leaderboard Omzet Mitra</h3>
              </div>
              <button
                onClick={() => setActiveTab('partners')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 sm:space-y-2.5">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">Belum ada transaksi mitra pada periode ini</div>
              ) : (
                leaderboard.slice(0, 5).map((p, idx) => (
                  <div
                    key={p.partnerId}
                    onClick={() => {
                      setActiveTab('partners');
                      fetchPartnerDrilldown(p.partnerId);
                    }}
                    className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-800 text-slate-300 font-black text-xs flex items-center justify-center font-mono shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate max-w-[130px] sm:max-w-none">{p.partnerName}</span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {p.kiosksCount} Booth • Bagi Hasil {p.revenueSharePct}%
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black font-mono text-emerald-400 block">
                        Rp {p.grossRevenue.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-amber-400/90 font-mono">
                        Mitra: Rp {p.partnerShare.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Breakdown Multi-Channel Pembayaran */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Distribusi Multi-Channel Pembayaran</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <span className="text-[10px] uppercase font-bold text-violet-300 block">QRIS Midtrans</span>
                <span className="text-sm sm:text-lg font-black text-white font-mono mt-0.5 sm:mt-1 block truncate">
                  Rp {(channelBreakdown?.qris.total || 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-violet-300/80 mt-0.5 block">{channelBreakdown?.qris.count || 0} Transaksi</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Tunai Kasir Desk</span>
                <span className="text-sm sm:text-lg font-black text-white font-mono mt-0.5 sm:mt-1 block truncate">
                  Rp {(channelBreakdown?.cashDesk.total || 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-emerald-300/80 mt-0.5 block">{channelBreakdown?.cashDesk.count || 0} Transaksi</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">Kode Akses PASS</span>
                <span className="text-sm sm:text-lg font-black text-white font-mono mt-0.5 sm:mt-1 block truncate">
                  Rp {(channelBreakdown?.cashPass.total || 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-amber-300/80 mt-0.5 block">{channelBreakdown?.cashPass.count || 0} Transaksi</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block">Cetak Tambahan</span>
                <span className="text-sm sm:text-lg font-black text-white font-mono mt-0.5 sm:mt-1 block truncate">
                  Rp {(channelBreakdown?.extraPrints.total || 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-cyan-300/80 mt-0.5 block">{channelBreakdown?.extraPrints.count || 0} Lembar</span>
              </div>
            </div>

            <div className="p-3 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Penghematan Diskon Voucher:</span>
              <span className="font-mono font-bold text-rose-400">
                Rp {(summary?.voucherDiscountsTotal || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================
  // TAB 2: MASTER MANAGEMENT HUB (MITRA, PAKET, VOUCHER, KASIR)
  // =============================================================
  function renderPartnersTab() {
    if (isDrilldownLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold">Memuat data manajemen mitra...</span>
        </div>
      );
    }

    // JIKA MITRA TERPILIH (DRILLDOWN VIEW)
    if (selectedDrilldownPartner) {
      const p = selectedDrilldownPartner.partner;
      const fin = selectedDrilldownPartner.financialSummary;

      return (
        <div className="space-y-6 animate-fade-in">
          {/* Back Button & Header dengan Kontrol Operasional Super Admin */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDrilldownPartner(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">Detail Manajemen Mitra</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${p.isActive !== false
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${p.isActive !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>{p.isActive !== false ? 'Aktif' : 'Nonaktif (Suspended)'}</span>
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-white truncate">{p.name}</h1>
                <p className="text-xs text-slate-400 truncate">{p.email} {p.phone ? `• 📞 ${p.phone}` : ''}</p>
              </div>
            </div>

            {/* Aksi Operasional Mitra Super Admin */}
            <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end border-t lg:border-t-0 border-slate-800 pt-2 lg:pt-0">
              <div className="text-right pr-2 border-r border-slate-800 hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Bagi Hasil Mitra</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">{p.revenueSharePct}%</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const fullPartner = partners.find((item) => item.id === p.id) || (p as any);
                  handleOpenEditPartner(fullPartner);
                }}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                title="Setting profil mitra, nomor kontak, bagi hasil, dan teks struk termal"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span>Setting Mitra</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const fullPartner = partners.find((item) => item.id === p.id) || (p as any);
                  handleTogglePartnerActive(fullPartner);
                }}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${p.isActive !== false
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                title={p.isActive !== false ? "Nonaktifkan Akses Mitra" : "Aktifkan Kembali Akses Mitra"}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{p.isActive !== false ? 'Nonaktifkan' : 'Aktifkan'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const fullPartner = partners.find((item) => item.id === p.id) || (p as any);
                  setPartnerToDelete(fullPartner);
                }}
                className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-rose-500/30"
                title="Hapus kemitraan permanen & kembalikan seluruh booth ke Pusat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Mitra</span>
              </button>
            </div>
          </div>

          {/* KREDENSIAL LOGIN PORTAL MITRA (SUPER ADMIN INSPECTION & SHOW/HIDE PASSWORD) */}
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-indigo-900/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Kredensial Login Portal Mitra
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
                  <span className="text-slate-300 font-mono">Email: <strong>{p.email}</strong></span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-slate-300 font-mono flex items-center gap-1.5">
                    Password:
                    <strong className="text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {revealedPasswords[p.id] ? (p.rawPassword || 'mitra123') : '••••••••••••'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => toggleRevealPassword(p.id)}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                {revealedPasswords[p.id] ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                <span>{revealedPasswords[p.id] ? "Sembunyikan" : "Lihat Password"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const fullPartner = partners.find((item) => item.id === p.id) || (p as any);
                  setEditPartnerPasswordTarget(fullPartner);
                  setNewPartnerPasswordInput('');
                }}
                className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-indigo-600/30"
              >
                Ubah Password
              </button>
            </div>
          </div>

          {/* Partner Financial Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Omzet All-Time</span>
              <span className="text-sm sm:text-lg font-black text-white font-mono mt-0.5 block truncate">
                Rp {fin.totalGrossRevenue.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Bagi Hasil ({p.revenueSharePct}%)</span>
              <span className="text-sm sm:text-lg font-black text-amber-300 font-mono mt-0.5 block truncate">
                Rp {fin.totalPartnerShare.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Royalty Minja</span>
              <span className="text-sm sm:text-lg font-black text-emerald-300 font-mono mt-0.5 block truncate">
                Rp {fin.totalMinjaRoyalty.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Transaksi Selesai</span>
              <span className="text-sm sm:text-lg font-black text-white font-mono mt-0.5 block truncate">
                {fin.totalTransactions} Transaksi
              </span>
            </div>
          </div>

          {/* Drilldown Sub-Tab Navigation (5 Subtabs) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar w-full">
            {[
              { id: 'booths' as const, label: `Daftar Booth (${selectedDrilldownPartner.kiosks.length})`, icon: Monitor },
              { id: 'packages' as const, label: `Pengaturan Paket`, icon: Layers },
              { id: 'vouchers' as const, label: `Voucher Diskon (${selectedDrilldownPartner.vouchers.length})`, icon: Ticket },
              { id: 'passes' as const, label: `Kode Akses PASS (${selectedDrilldownPartner.accessCodes?.length || 0})`, icon: Banknote },
              { id: 'cashiers' as const, label: `Operator / Kasir (${selectedDrilldownPartner.operators.length})`, icon: Users },
            ].map((subTab) => {
              const Icon = subTab.icon;
              const isActive = drilldownSubTab === subTab.id;
              return (
                <button
                  key={subTab.id}
                  onClick={() => setDrilldownSubTab(subTab.id)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{subTab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SubTab 1: Booths under this Partner */}
          {drilldownSubTab === 'booths' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedDrilldownPartner.kiosks.map((k) => (
                <div key={k.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
                        {k.code}
                      </span>
                      <h4 className="text-base font-black text-white mt-1.5">{k.name}</h4>
                      <p className="text-xs text-slate-400">📍 {k.location}</p>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${k.isLocked
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                    >
                      {k.isLocked ? 'Terkunci' : 'Online'}
                    </span>
                  </div>



                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const fullKiosk = kiosks.find((item) => item.id === k.id);
                        if (fullKiosk) {
                          setPackageConfigKiosk(fullKiosk);
                          setDisabledPackagesState((k.disabledPackageIds as string[]) || []);
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-indigo-300 flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Atur Paket</span>
                    </button>

                    <button
                      onClick={() => handleRemoteResetKiosk(k.id, k.code)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-xs font-bold text-slate-400 hover:text-rose-300 flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Sesi</span>
                    </button>
                  </div>

                  {/* TOMBOL HAPUS BOOTH & PUTUS AKSES API */}
                  <button
                    onClick={() => {
                      const fullKiosk = kiosks.find((item) => item.id === k.id) || (k as any);
                      setKioskToDelete(fullKiosk);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-bold border border-rose-800/50 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Hapus Booth & Putus Akses API</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SubTab 2: Packages Configuration */}
          {drilldownSubTab === 'packages' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Konfigurasi Seluruh Paket Sesi</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paket aktif yang dapat dipilih oleh pelanggan saat berfoto di booth mitra ini
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDrilldownPartner.packages.map((pkg) => (
                  <div key={pkg.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{pkg.name}</span>
                      <span className="text-xs font-black font-mono text-emerald-400">
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {pkg.maxShots || pkg.shotsCount || 6} Foto • {pkg.defaultPrints || pkg.printCopies || 2} Lembar Cetak • Durasi {pkg.durationSeconds}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SubTab 3: Vouchers Created by Partner */}
          {drilldownSubTab === 'vouchers' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Voucher Promo Mitra</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Kode kupon diskon yang dibuat oleh mitra untuk booth mereka</p>
                </div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Mode Pengawasan & Audit
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDrilldownPartner.vouchers.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-xs text-slate-500">
                    Mitra belum membuat voucher promo
                  </div>
                ) : (
                  selectedDrilldownPartner.vouchers.map((v) => (
                    <div key={v.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm font-black font-mono text-amber-400">{v.code}</span>
                          <span className="text-xs text-slate-400 block">{v.name || 'Promo Khusus'}</span>
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${v.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500'
                            }`}
                        >
                          {v.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300">
                        Potongan:{' '}
                        <strong>
                          {v.discountType === 'percentage'
                            ? `${v.discountValue}% (Maks Rp ${(v.maxDiscount || 0).toLocaleString('id-ID')})`
                            : `Rp ${v.discountValue.toLocaleString('id-ID')}`}
                        </strong>
                      </div>

                      <div className="text-[11px] text-slate-400 flex justify-between">
                        <span>Pemakaian: {v.usedCount} / {v.usageLimit}</span>
                        <span>Berlaku s/d: {new Date(v.validUntil).toLocaleDateString('id-ID')}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => handleTogglePartnerVoucher(v.id, v.isActive)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer"
                        >
                          {v.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          onClick={() => handleDeletePartnerVoucher(v.id)}
                          className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SubTab 4: Kode Akses Tunai (PASS-XXXX) under this partner */}
          {drilldownSubTab === 'passes' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Kode Akses Sesi Tunai (PASS-XXXX)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Token sesi bayar tunai yang diterbitkan oleh kasir mitra</p>
                </div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Audit Kasir Tunai Lapangan
                </span>
              </div>

              {(!selectedDrilldownPartner.accessCodes || selectedDrilldownPartner.accessCodes.length === 0) ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 text-xs">
                  Belum ada kode akses tunai yang diterbitkan untuk mitra ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDrilldownPartner.accessCodes.map((ac) => (
                    <div key={ac.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                          {ac.code}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${ac.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          ac.status === 'USED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-500'
                          }`}>
                          {ac.status === 'ACTIVE' ? 'Aktif' : ac.status === 'USED' ? 'Terpakai' : ac.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-0.5">
                        <div>Paket: <span className="text-white font-bold">{ac.packageName}</span></div>
                        <div>Nominal: <span className="font-mono text-emerald-400 font-bold">Rp {ac.amount.toLocaleString('id-ID')}</span></div>
                        <div>Kasir: <span className="text-slate-300">{ac.cashierName} • {ac.kioskCode || 'Semua Booth'}</span></div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Kedaluwarsa: {new Date(ac.expiresAt).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubTab 5: Operators / Cashiers with Reset PIN */}
          {drilldownSubTab === 'cashiers' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Staf Kasir & Operator Mitra</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Akun operator lapangan yang bertugas melayani transaksi tunai dan cetak foto
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDrilldownPartner.operators.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-xs text-slate-500">
                    Belum ada kasir/operator yang didaftarkan di mitra ini
                  </div>
                ) : (
                  selectedDrilldownPartner.operators.map((op) => (
                    <div key={op.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{op.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">(@{op.username})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Penugasan: {op.kioskName}</span>
                        {op.lastLoginAt && (
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                            Login terakhir: {new Date(op.lastLoginAt).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setResetPinTarget({ id: op.id, name: op.name });
                          setNewCashierPin('');
                        }}
                        className="py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Reset PIN</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // JIKA TAMPILAN UTAMA LIST MITRA
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl">
          <div>
            <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Master Franchise Directory</span>
            <h1 className="text-lg sm:text-2xl font-black text-white mt-0.5">Daftar Seluruh Mitra ({partners.length})</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola entitas mitra franchise, kredensial login, bagi hasil royalti, dan penetapan unit booth
            </p>
          </div>

          <button
            onClick={() => setIsCreatePartnerModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer self-stretch sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan Mitra Baru</span>
          </button>
        </div>

        {/* PARTNERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {partners.map((p) => {
            const partnerKiosks = kiosks.filter((k) => k.partnerId === p.id);
            return (
              <div
                key={p.id}
                className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-3 sm:space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="text-base font-black text-white truncate">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">✉️ {p.email}</p>
                    {p.phone && <p className="text-xs text-slate-400 truncate">📞 {p.phone}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${p.isActive !== false
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.isActive !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      <span>{p.isActive !== false ? 'Aktif' : 'Nonaktif'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                      {p.revenueSharePct}% Share
                    </span>
                  </div>
                </div>

                {/* KREDENSIAL LOGIN MITRA (PASSWORD DENGAN TOMBOL MATA UNTUK ADMIN) */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <KeyRound className="w-3 h-3 text-amber-400" />
                      <span>Password Login Mitra</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRevealPassword(p.id)}
                      className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px]"
                      title={revealedPasswords[p.id] ? "Sembunyikan Password" : "Lihat Password"}
                    >
                      {revealedPasswords[p.id] ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
                      <span>{revealedPasswords[p.id] ? "Tutup" : "Lihat"}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white tracking-wide">
                      {revealedPasswords[p.id] ? (p.rawPassword || 'mitra123') : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditPartnerPasswordTarget(p);
                        setNewPartnerPasswordInput('');
                      }}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                    >
                      Ubah Password
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Jumlah Booth</span>
                    <span className="text-sm font-black text-white font-mono mt-0.5 block">{partnerKiosks.length} Unit</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Royalty Minja</span>
                    <span className="text-sm font-black text-indigo-400 font-mono mt-0.5 block">
                      {100 - (p.revenueSharePct || 70)}%
                    </span>
                  </div>
                </div>

                {/* AKSI KONTROL MITRA (DETAIL, SETTING, TOGGLE AKTIF, HAPUS) */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => fetchPartnerDrilldown(p.id)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                    title="Buka rincian lengkap mitra, booth, voucher, kasir & transaksi"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditPartner(p)}
                    className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1 border border-slate-700 transition cursor-pointer"
                    title="Setting data & profil mitra, no WA, bagi hasil, dan struk"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Setting</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePartnerActive(p)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition cursor-pointer ${p.isActive !== false
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    title={p.isActive !== false ? "Nonaktifkan Akses Mitra" : "Aktifkan Kembali Akses Mitra"}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{p.isActive !== false ? 'Nonaktif' : 'Aktifkan'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPartnerToDelete(p)}
                    className="py-2 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 text-xs font-bold flex items-center justify-center border border-rose-500/30 transition cursor-pointer"
                    title="Hapus kemitraan permanen & kembalikan seluruh booth ke Pusat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =============================================================
  // SUB-RENDER: ALL OPERATIONAL MODALS
  // =============================================================
  function renderModals() {
    return (
      <>
        {/* MODAL RINGKASAN EKSEKUTIF FINANSIAL & BAGI HASIL */}
        <ExecutiveSummaryModal
          isOpen={isExecutiveModalOpen}
          onClose={() => setIsExecutiveModalOpen(false)}
          periodLabel={
            networkPeriod === 'today'
              ? 'Hari Ini'
              : networkPeriod === 'yesterday'
              ? 'Kemarin'
              : networkPeriod === '7d'
              ? '7 Hari Terakhir'
              : networkPeriod === '30d'
              ? '30 Hari Terakhir'
              : networkPeriod === 'this_month'
              ? 'Bulan Ini'
              : networkPeriod === 'last_month'
              ? 'Bulan Lalu'
              : `${customStartDate} s/d ${customEndDate}`
          }
          partnerName={
            globalPartnerFilter === 'ALL'
              ? 'Seluruh Jaringan Mitra'
              : partners.find((p) => p.id === globalPartnerFilter)?.name || 'Mitra'
          }
          kioskName={
            globalKioskFilter === 'ALL'
              ? 'Seluruh Photobooth'
              : kiosks.find((k) => k.id === globalKioskFilter)?.name || 'Booth'
          }
          grossRevenue={networkAnalytics?.summary?.grossRevenue || 0}
          totalDiscount={networkAnalytics?.summary?.voucherDiscountsTotal || 0}
          netRevenue={
            (networkAnalytics?.summary?.grossRevenue || 0) -
            (networkAnalytics?.summary?.voucherDiscountsTotal || 0)
          }
          totalSessions={networkAnalytics?.summary?.totalSessions || 0}
          channelBreakdown={{
            qris: networkAnalytics?.breakdownByChannel?.qris?.total || 0,
            cash: networkAnalytics?.breakdownByChannel?.cashDesk?.total || 0,
            accessCode: networkAnalytics?.breakdownByChannel?.cashPass?.total || 0,
            extraPrints: networkAnalytics?.breakdownByChannel?.extraPrints?.total || 0,
          }}
          kioskList={kiosks.map((k) => ({
            code: k.code,
            name: k.name,
            sessions: 0,
            revenue: 0,
            location: k.location,
          }))}
        />
        {/* MODAL RESET PIN KASIR */}
        {resetPinTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Reset PIN Kasir</h3>
                  <p className="text-xs text-slate-400">{resetPinTarget.name}</p>
                </div>
              </div>

              <form onSubmit={handleConfirmResetPin} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">PIN Baru (Minimal 4 Digit):</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    value={newCashierPin}
                    onChange={(e) => setNewCashierPin(e.target.value)}
                    placeholder="Masukkan 4-6 digit PIN"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-center text-base font-mono tracking-widest text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetPinTarget(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPin || newCashierPin.length < 4}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-amber-600/30 cursor-pointer"
                  >
                    {isResettingPin ? 'Menyimpan...' : 'Simpan PIN Baru'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL KONFIGURASI PAKET BOOTH */}
        {packageConfigKiosk && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Atur Paket Aktif di Booth</h3>
                  <p className="text-xs text-slate-400">[{packageConfigKiosk.code}] {packageConfigKiosk.name}</p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {packages.map((pkg) => {
                  const isDisabled = disabledPackagesState.includes(pkg.id);
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        if (isDisabled) {
                          setDisabledPackagesState(disabledPackagesState.filter((id) => id !== pkg.id));
                        } else {
                          setDisabledPackagesState([...disabledPackagesState, pkg.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${!isDisabled
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{pkg.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Rp {pkg.price.toLocaleString('id-ID')}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${!isDisabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {!isDisabled ? '✓ Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPackageConfigKiosk(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingPackages}
                  onClick={handleSavePackageConfig}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {isSavingPackages ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DAFTARKAN MITRA BARU */}
        {isCreatePartnerModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Daftarkan Mitra Baru</h3>
                  <p className="text-xs text-slate-400">Pemilik lokasi atau cabang franchise baru</p>
                </div>
              </div>

              <form onSubmit={handleCreatePartner} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nama Mitra / PT:</label>
                  <input
                    type="text"
                    required
                    value={partnerNameInput}
                    onChange={(e) => setPartnerNameInput(e.target.value)}
                    placeholder="PT Berkah Jaya / Mitra Mall B"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Login Partner:</label>
                  <input
                    type="email"
                    required
                    value={partnerEmailInput}
                    onChange={(e) => setPartnerEmailInput(e.target.value)}
                    placeholder="mitra@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Password Login:</label>
                  <input
                    type="password"
                    required
                    value={partnerPassInput}
                    onChange={(e) => setPartnerPassInput(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">No. WhatsApp:</label>
                    <input
                      type="text"
                      value={partnerPhoneInput}
                      onChange={(e) => setPartnerPhoneInput(e.target.value)}
                      placeholder="08123456789"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Bagi Hasil (%):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={partnerSharePctInput}
                      onChange={(e) => setPartnerSharePctInput(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatePartnerModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPartner}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {isCreatingPartner ? 'Mendaftarkan...' : 'Daftarkan Mitra'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DAFTARKAN BOOTH BARU */}
        {isCreateKioskModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Daftarkan Booth Baru</h3>
                  <p className="text-xs text-slate-400">Hubungkan komputer photobooth baru ke jaringan</p>
                </div>
              </div>

              {createdKioskResult ? (
                <div className="space-y-3 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    <span className="font-bold block mb-1">✓ Booth Berhasil Didaftarkan!</span>
                    Kode: <strong>{createdKioskResult.code}</strong> • {createdKioskResult.name}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Salin ke .env PC Booth:</span>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-indigo-300 break-all select-all">
                      BOOTH_API_KEY={createdKioskResult.apiKey}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdKioskResult.apiKey);
                          showFeedback('success', 'API Key murni disalin ke clipboard!');
                        }}
                        className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Key Saja</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`BOOTH_API_KEY=${createdKioskResult.apiKey}`);
                          showFeedback('success', 'Format .env disalin ke clipboard!');
                        }}
                        className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Format .env</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateKioskModalOpen(false);
                      setCreatedKioskResult(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateKiosk} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Nama Booth:</label>
                    <input
                      type="text"
                      required
                      value={kioskNameInput}
                      onChange={(e) => setKioskNameInput(e.target.value)}
                      placeholder="Minja Booth 03 - Mall Gandaria"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Lokasi / Venue:</label>
                    <input
                      type="text"
                      required
                      value={kioskLocationInput}
                      onChange={(e) => setKioskLocationInput(e.target.value)}
                      placeholder="Lantai 1 Depan Funworld"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Kode Booth (Opsional):</label>
                      <input
                        type="text"
                        value={kioskCodeInput}
                        onChange={(e) => setKioskCodeInput(e.target.value)}
                        placeholder="MJA-03"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Tautkan ke Mitra (Opsional):</label>
                    <select
                      value={kioskPartnerIdInput}
                      onChange={(e) => setKioskPartnerIdInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Pusat Minja (Direct) --</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateKioskModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingKiosk}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      {isCreatingKiosk ? 'Mendaftarkan...' : 'Daftarkan Mesin'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}



        {/* MODAL KUNCI BOOTH */}
        {isLockKioskModalOpen && targetLockKiosk && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Kunci Booth [{targetLockKiosk.code}]?</h3>
                  <p className="text-xs text-slate-400">Kiosk akan seketika masuk ke Mode Pemeliharaan</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Alasan Penguncian:</label>
                <textarea
                  rows={2}
                  value={lockReasonInput}
                  onChange={(e) => setLockReasonInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLockKioskModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingLock}
                  onClick={handleConfirmLockKiosk}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  {isSubmittingLock ? 'Mengunci...' : 'Kunci Booth'}
                </button>
              </div>
            </div>
          </div>
        )}



        {/* MODAL UBAH PIN ADMIN */}
        {isChangePinOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Ubah PIN Admin</h3>
                  <p className="text-xs text-slate-400">Proteksi akses Super Admin</p>
                </div>
              </div>

              <form onSubmit={handleChangePin} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">PIN Lama:</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-center text-xs font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">PIN Baru:</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-center text-xs font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Ulangi PIN Baru:</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-center text-xs font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
                  />
                  {changePinError && <p className="text-rose-400 text-xs mt-1">{changePinError}</p>}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsChangePinOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPin || !oldPin || !newPin || !confirmPin}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {isChangingPin ? 'Menyimpan...' : 'Simpan PIN'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL RESEND EMAIL SOFT FILE */}
        {resendModalSession && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Kirim Ulang Soft File</h3>
                  <p className="text-xs text-slate-400">Sesi #{resendModalSession.code}</p>
                </div>
              </div>

              <form onSubmit={handleResendEmailSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Tujuan:</label>
                  <input
                    type="email"
                    required
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="pelanggan@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResendModalSession(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isResendingEmail || !targetEmail}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {isResendingEmail ? 'Mengirim...' : 'Kirim Sekarang'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DETAIL TRANSAKSI */}
        {selectedTxDetail && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-mono font-bold text-amber-300">#{selectedTxDetail.orderId}</span>
                <button
                  onClick={() => setSelectedTxDetail(null)}
                  className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Mitra:</span>
                  <span className="font-bold text-white">{selectedTxDetail.partnerName || 'Minja Pusat'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Booth:</span>
                  <span className="font-bold text-white">
                    {selectedTxDetail.kioskName ? `[${selectedTxDetail.kioskCode}] ${selectedTxDetail.kioskName}` : 'Lokal'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Kode Sesi:</span>
                  <span className="font-mono text-white">#{selectedTxDetail.sessionCode}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Paket:</span>
                  <span className="font-medium text-white">{selectedTxDetail.packageName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Petugas Kasir:</span>
                  <span className="text-white">{selectedTxDetail.cashierName || 'Self-Service'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Metode:</span>
                  <span className="text-white font-mono uppercase">{selectedTxDetail.paymentType}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800 font-bold text-sm">
                  <span>Total Bayar:</span>
                  <span className="font-mono text-emerald-400">
                    Rp {selectedTxDetail.grossAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTxDetail(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL KONFIRMASI HAPUS BOOTH & PUTUS AKSES API            */}
        {/* ========================================================= */}
        {kioskToDelete && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Hapus Booth & Putus Akses API?</h3>
                  <p className="text-xs text-rose-300 font-mono">[{kioskToDelete.code}] {kioskToDelete.name}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2 text-xs text-rose-200">
                <p className="font-bold flex items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Peringatan Pemutusan Akses Permanen</span>
                </p>
                <p>
                  Tindakan ini akan <strong>menghapus hardware booth ini secara permanen</strong> dan <strong>mencabut API Key booth</strong>.
                  Komputer di lokasi fisik tidak akan lagi bisa melakukan sinkronisasi atau memproses transaksi.
                </p>
                <p className="text-[11px] text-slate-400">
                  Riwayat transaksi dan sesi masa lalu akan tetap diarsipkan secara aman untuk integritas laporan finansial.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingKiosk}
                  onClick={() => setKioskToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingKiosk}
                  onClick={handleDeleteKioskConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isDeletingKiosk ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Putus & Hapus</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL UBAH PASSWORD MITRA                                 */}
        {/* ========================================================= */}
        {editPartnerPasswordTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Ubah Password Mitra</h3>
                  <p className="text-xs text-slate-400">{editPartnerPasswordTarget.name}</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePartnerPasswordSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Mitra:</label>
                  <input
                    type="text"
                    disabled
                    value={editPartnerPasswordTarget.email}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Password Baru:</label>
                  <input
                    type="text"
                    required
                    value={newPartnerPasswordInput}
                    onChange={(e) => setNewPartnerPasswordInput(e.target.value)}
                    placeholder="Masukkan password baru mitra"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPartnerPasswordTarget(null);
                      setNewPartnerPasswordInput('');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPartnerPassword || !newPartnerPasswordInput}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-amber-600/30 cursor-pointer"
                  >
                    {isUpdatingPartnerPassword ? 'Menyimpan...' : 'Simpan Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL SETTING / EDIT PROFIL & DATA MITRA                  */}
        {/* ========================================================= */}
        {settingPartnerTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Setting Profil & Data Mitra</h3>
                  <p className="text-xs text-slate-400">{settingPartnerTarget.name}</p>
                </div>
              </div>

              <form onSubmit={handleSavePartnerSettings} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nama Mitra / PT / Brand:</label>
                  <input
                    type="text"
                    required
                    value={editPartnerName}
                    onChange={(e) => setEditPartnerName(e.target.value)}
                    placeholder="PT Berkah Jaya / Mitra Mall A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Email Login Mitra:</label>
                    <input
                      type="email"
                      required
                      value={editPartnerEmail}
                      onChange={(e) => setEditPartnerEmail(e.target.value)}
                      placeholder="mitra@gmail.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">No. WhatsApp / Kontak:</label>
                    <input
                      type="text"
                      value={editPartnerPhone}
                      onChange={(e) => setEditPartnerPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Bagi Hasil Mitra (%):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={editPartnerSharePct}
                      onChange={(e) => setEditPartnerSharePct(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Royalty Minja: {100 - editPartnerSharePct}%</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Status Kemitraan:</label>
                    <select
                      value={editPartnerIsActive ? 'active' : 'suspended'}
                      onChange={(e) => setEditPartnerIsActive(e.target.value === 'active')}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="active">🟢 Aktif (Normal)</option>
                      <option value="suspended">🔴 Nonaktif (Suspended)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {editPartnerIsActive ? 'Mitra & booth beroperasi normal' : 'Akses login & booth dibekukan'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 block">Kustomisasi Struk Cetak Termal:</span>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Header Struk (Nama Usaha di Struk):</label>
                    <input
                      type="text"
                      value={editPartnerHeader}
                      onChange={(e) => setEditPartnerHeader(e.target.value)}
                      placeholder="MINJA PHOTOBOOTH - MALL A"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Footer Struk (Pesan Penutup):</label>
                    <input
                      type="text"
                      value={editPartnerFooter}
                      onChange={(e) => setEditPartnerFooter(e.target.value)}
                      placeholder="Terima kasih atas kunjungan Anda!"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSettingPartnerTarget(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPartnerSettings}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSavingPartnerSettings ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Pengaturan</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL KONFIRMASI HAPUS MITRA (PUTUS KEMITRAAN)            */}
        {/* ========================================================= */}
        {partnerToDelete && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Hapus Kemitraan Mitra?</h3>
                  <p className="text-xs text-rose-300 font-mono">{partnerToDelete.name}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2 text-xs text-rose-200">
                <p className="font-bold flex items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Peringatan Pemutusan Kemitraan Permanen</span>
                </p>
                <p>
                  Tindakan ini akan <strong>menghapus akun mitra [{partnerToDelete.name}] dan mencabut seluruh akses login operator/kasirnya</strong>.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <span className="font-bold text-amber-300 block">🛡️ Keamanan Aset Hardware Booth:</span>
                  <p>
                    Seluruh unit booth yang sebelumnya terdaftar pada mitra ini <strong>tidak akan terhapus</strong>, melainkan <strong>otomatis dikembalikan ke kendali langsung Minja Pusat</strong>.
                  </p>
                </div>
                <p className="text-[11px] text-slate-400">
                  Riwayat transaksi finansial masa lalu tetap diarsipkan secara aman untuk audit dan pelaporan.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingPartner}
                  onClick={() => setPartnerToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingPartner}
                  onClick={handleDeletePartnerConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isDeletingPartner ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Putus & Hapus</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </>
    );
  }
};
