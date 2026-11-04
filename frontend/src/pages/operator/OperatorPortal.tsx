// frontend/src/pages/operator/OperatorPortal.tsx
// Operator Session Portal: Antarmuka kasir lapangan Ultra-Modern Liquid Glassmorphism
// Fitur Lengkap:
// 1. Dual-Mode Generate PASS Tunai: [Sesi Foto Baru] vs [Tambah Lembar Cetak Ekstra]
// 2. Catatan Kasir (Customer Note) tersimpan secara akuntabel di audit log
// 3. Riwayat Kode PASS Operator dengan status badge (Aktif / Digunakan / Kadaluarsa)
// 4. Cetak Struk Kasir Thermal (58mm / 80mm) via browser system print (window.print())
// 5. Pemantauan & Update Manual Sisa Kertas Booth
// 6. Emergency Reprint Tool: Melihat 10 sesi terakhir dengan thumbnail foto & trigger cetak ulang

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  KeyRound,
  RefreshCw,
  LogOut,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Clock,
  RotateCcw,
  Check,
  FileImage,
  PlusCircle,
  Sparkles,
  X,
  Search,
  Lock,
  Coins,
  Smartphone,
} from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';
import { isJwtExpired } from '../../services/httpPhotoboothApi';
import { RecentSessionItem, AccessCodeItem } from '../../types/api';
import { PackageItem } from '../../types/package';
import { QRCodeCanvas } from '../../components/common/QRCodeCanvas';

export const OperatorPortal: React.FC = () => {
  // Auth states
  const [operatorToken, setOperatorToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('minja_operator_token');
    if (saved && !isJwtExpired(saved)) {
      return saved;
    }
    localStorage.removeItem('minja_operator_token');
    localStorage.removeItem('minja_operator_info');
    return null;
  });
  const [operatorInfo, setOperatorInfo] = useState<any | null>(() => {
    const saved = localStorage.getItem('minja_operator_info');
    return saved ? JSON.parse(saved) : null;
  });

  // Login states
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Kiosk & Session states
  const [kioskStatus, setKioskStatus] = useState<any | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSessionItem[]>([]);
  const [myPasses, setMyPasses] = useState<AccessCodeItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tangkap event 401 Unauthorized secara terpusat & watchdog kedaluwarsa JWT proaktif
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('minja_operator_token');
      localStorage.removeItem('minja_operator_info');
      setOperatorToken(null);
      setOperatorInfo(null);
      setLoginError('Sesi kasir telah kedaluwarsa. Silakan login kembali.');
    };

    window.addEventListener('minja:unauthorized', handleUnauthorized);

    const checkTokenExpiry = () => {
      const saved = localStorage.getItem('minja_operator_token');
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

  // Shift summary state
  const [shiftSummary, setShiftSummary] = useState<{
    todayDate: string;
    totalCashAmount: number;
    totalPasses: number;
    usedPasses: number;
    activePasses: number;
    expiredPasses: number;
    extraPrintsCount: number;
  } | null>(null);

  // History search and filter state
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'ACTIVE' | 'USED' | 'EXPIRED'>('ALL');
  const [shiftDateFilter, setShiftDateFilter] = useState<'TODAY' | 'ALL'>('TODAY');
  const [visiblePassesLimit, setVisiblePassesLimit] = useState(25);

  // Thermal Receipt Format
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('58mm');

  // Filtered passes
  const filteredPasses = useMemo(() => {
    const todayStr = new Date().toDateString();
    return myPasses.filter((pass) => {
      const matchDate =
        shiftDateFilter === 'ALL' ||
        new Date(pass.createdAt).toDateString() === todayStr;
      const matchStatus = historyStatusFilter === 'ALL' || pass.status === historyStatusFilter;
      const q = historySearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        pass.code.toLowerCase().includes(q) ||
        (pass.customerNote && pass.customerNote.toLowerCase().includes(q)) ||
        (pass.packageName && pass.packageName.toLowerCase().includes(q));
      return matchDate && matchStatus && matchSearch;
    });
  }, [myPasses, shiftDateFilter, historyStatusFilter, historySearchQuery]);

  // Generate PASS State
  const [passType, setPassType] = useState<'SESSION' | 'EXTRA_PRINT'>('SESSION');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [passAmount, setPassAmount] = useState('35000');
  const [extraPrints, setExtraPrints] = useState(1);
  const [passNote, setPassNote] = useState('');
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);
  const [generatedPassResult, setGeneratedPassResult] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Auto-Print Preference
  const [autoPrintOnGenerate, setAutoPrintOnGenerate] = useState<boolean>(() => {
    return localStorage.getItem('minja_operator_autoprint') === 'true';
  });

  const toggleAutoPrint = (val: boolean) => {
    setAutoPrintOnGenerate(val);
    localStorage.setItem('minja_operator_autoprint', String(val));
  };

  // Helper: Buka WhatsApp langsung tanpa API (100% Client-side Direct URL)
  const sharePassToCustomer = (passItem: AccessCodeItem) => {
    const storeName =
      kioskStatus?.partnerReceiptHeader ||
      kioskStatus?.receiptHeader ||
      operatorInfo?.partnerName ||
      'MinjaPhotobooth';
    const boothName = `[${kioskStatus?.code || 'BOOTH'}] ${kioskStatus?.name || 'Kiosk'}`;
    const serviceName =
      passItem.type === 'EXTRA_PRINT'
        ? `Tambah Cetak (${passItem.extraPrints || 1} Lembar)`
        : passItem.packageName || 'Sesi Foto Lengkap';

    const text =
      `Halo Kak! Terima kasih sudah bertransaksi di ${storeName}.\n\n` +
      `📸 *KODE AKSES TIKET FOTO:* *${passItem.code}*\n` +
      `🎫 Layanan: ${serviceName}\n` +
      `💰 Nominal: ${formatRupiah(passItem.amount)}\n` +
      `📍 Booth: ${boothName}\n\n` +
      `*Cara Penggunaan:*\n` +
      `1. Sentuh layar booth foto untuk mulai\n` +
      `2. Pilih paket dan tekan "Punya Kode Akses / Tiket Tunai"\n` +
      `3. Masukkan kode: *${passItem.code}*\n` +
      `4. Selamat menikmati sesi foto! ✨`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  // Render Divider Struk Sesuai Konfigurasi Desain Mitra
  const renderReceiptDivider = () => {
    const style = kioskStatus?.receiptConfig?.dividerStyle || 'dashed';
    if (style === 'dotted') {
      return <div className="border-b border-dotted border-gray-400 my-2" />;
    }
    if (style === 'solid') {
      return <div className="border-b border-gray-900 my-2" />;
    }
    if (style === 'stars') {
      return (
        <div className="text-center text-[10px] tracking-widest text-gray-500 my-2 select-none overflow-hidden leading-none">
          * * * * * * * * * * *
        </div>
      );
    }
    return <div className="border-b border-dashed border-gray-400 my-2" />;
  };

  // Thermal Receipt Modal
  const [receiptPassData, setReceiptPassData] = useState<AccessCodeItem | null>(null);
  const receiptPrintRef = useRef<HTMLDivElement | null>(null);

  // Manual Paper Adjustment Modal
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [manualPaperInput, setManualPaperInput] = useState('400');
  const [isUpdatingPaper, setIsUpdatingPaper] = useState(false);

  // Emergency Reprint Modal
  const [selectedSessionForReprint, setSelectedSessionForReprint] = useState<RecentSessionItem | null>(null);
  const [reprintCopies, setReprintCopies] = useState(1);
  const [reprintReason, setReprintReason] = useState('Kertas macet / Paper Jam');
  const [isReprinting, setIsReprinting] = useState(false);

  // Active view tab: 'generator' | 'history' | 'reprint'
  const [activeTab, setActiveTab] = useState<'generator' | 'history' | 'reprint'>('generator');

  // Load Kiosk Status, Recent Sessions, Operator Passes, Packages & Shift Summary
  const fetchAllOperatorData = useCallback(async () => {
    if (!operatorToken) return;
    setIsLoading(true);
    try {
      const [kioskRes, sessionsRes, passesRes, packagesRes, shiftRes] = await Promise.all([
        photoboothApi.getOperatorKioskStatus(operatorToken),
        photoboothApi.getOperatorRecentSessions(operatorToken, 10),
        photoboothApi.getOperatorPasses(operatorToken),
        photoboothApi.getOperatorPackages(operatorToken),
        photoboothApi.getOperatorShiftSummary(operatorToken),
      ]);

      if (kioskRes.success && kioskRes.data) {
        const kioskObj = kioskRes.data.kiosk || kioskRes.data;
        setKioskStatus(kioskObj);
        if (kioskObj.paperRemaining !== undefined) {
          setManualPaperInput(String(kioskObj.paperRemaining));
        }
        if (kioskObj.receiptPaperWidth === 80) {
          setReceiptWidth('80mm');
        }
      }
      if (sessionsRes.success && sessionsRes.data) {
        setRecentSessions(sessionsRes.data);
      }
      if (passesRes.success && passesRes.data) {
        setMyPasses(passesRes.data);
      }
      if (packagesRes.success && packagesRes.data) {
        setPackages(packagesRes.data);
        if (packagesRes.data.length > 0 && !selectedPackageId) {
          setSelectedPackageId(packagesRes.data[0].id);
          setPassAmount(String(packagesRes.data[0].price));
        }
      }
      if (shiftRes.success && shiftRes.data) {
        setShiftSummary(shiftRes.data);
      }
    } catch {
      // Graceful offline
    } finally {
      setIsLoading(false);
    }
  }, [operatorToken, selectedPackageId]);

  useEffect(() => {
    if (operatorToken) {
      fetchAllOperatorData();
      const interval = setInterval(fetchAllOperatorData, 10000);
      return () => clearInterval(interval);
    }
  }, [operatorToken, fetchAllOperatorData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await photoboothApi.operatorLogin(username.trim(), pin.trim());
      if (res.success) {
        const { token, operator } = res.data;
        setOperatorToken(token);
        setOperatorInfo(operator);
        localStorage.setItem('minja_operator_token', token);
        localStorage.setItem('minja_operator_info', JSON.stringify(operator));
      } else {
        setLoginError(res.error.message || 'Username atau PIN salah.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Gagal menghubungi server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setOperatorToken(null);
    setOperatorInfo(null);
    localStorage.removeItem('minja_operator_token');
    localStorage.removeItem('minja_operator_info');
  };

  const handlePackageChange = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const found = packages.find((p) => p.id === pkgId);
    if (found) {
      setPassAmount(String(found.price));
    }
  };

  const handleExtraPrintsChange = (prints: number) => {
    setExtraPrints(prints);
    // Dinamis: Ambil harga lembar tambahan dari paket cabang mitra
    const unitPrice =
      packages.find((p) => p.id === selectedPackageId)?.additionalPrintPrice ||
      packages[0]?.additionalPrintPrice ||
      15000;
    const calculatedPrice = prints * unitPrice;
    setPassAmount(String(calculatedPrice));
  };

  const handleGeneratePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorToken) return;
    setIsGeneratingPass(true);
    try {
      const res = await photoboothApi.operatorGeneratePass(operatorToken, {
        packageId: passType === 'SESSION' ? selectedPackageId || undefined : undefined,
        amount: parseInt(passAmount, 10) || (passType === 'SESSION' ? 35000 : 15000),
        type: passType,
        extraPrints: passType === 'EXTRA_PRINT' ? extraPrints : 0,
        customerNote: passNote.trim() || undefined,
      });

      if (res.success) {
        setGeneratedPassResult(res.data);
        setStatusMessage({
          type: 'success',
          text: `Kode akses tunai ${res.data.code} berhasil digenerate!`,
        });
        fetchAllOperatorData();
        if (autoPrintOnGenerate) {
          setReceiptPassData(res.data);
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error.message || 'Gagal membuat kode akses.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setIsGeneratingPass(false);
    }
  };

  const handleCopyPass = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleUpdatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorToken) return;
    setIsUpdatingPaper(true);
    try {
      const count = parseInt(manualPaperInput, 10) || 0;
      const res = await photoboothApi.updateOperatorPaper(operatorToken, count);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Jumlah sisa kertas berhasil diperbarui menjadi ${count} lembar!`,
        });
        setShowPaperModal(false);
        fetchAllOperatorData();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error.message || 'Gagal memperbarui data kertas.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal memperbarui data kertas.',
      });
    } finally {
      setIsUpdatingPaper(false);
    }
  };

  const handleExecuteReprint = async () => {
    if (!selectedSessionForReprint || !operatorToken) return;
    setIsReprinting(true);
    try {
      const res = await photoboothApi.operatorReprintSession(
        operatorToken,
        selectedSessionForReprint.id,
        reprintCopies,
        reprintReason
      );

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Perintah cetak ulang untuk ${selectedSessionForReprint.customerName || selectedSessionForReprint.sessionCode || 'Sesi'} (${reprintCopies} lembar) berhasil dikirim ke printer booth!`,
        });
        setSelectedSessionForReprint(null);
        fetchAllOperatorData();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error.message || 'Gagal memicu cetak ulang.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal memicu cetak ulang.',
      });
    } finally {
      setIsReprinting(false);
    }
  };

  const handlePrintReceipt = (passItem: AccessCodeItem) => {
    setReceiptPassData(passItem);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Login Screen if not authenticated
  if (!operatorToken) {
    return (
      <div className="w-screen h-screen bg-[#070A10] text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm p-8 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black mb-3 shadow-glow-primary">
              <Receipt className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Portal Operator Booth</h1>
            <p className="text-xs text-slate-400 mt-1">
              Kasir Tunai • Cetak Struk • Cetak Ulang Darurat
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username Kasir
              </label>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan Username Kasir"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                PIN Kasir
              </label>
              <input
                type="password"
                required
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk Sekarang</span>
              )}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center mt-6">
            Akun kasir dibuat dan dikelola oleh Mitra Pengelola Booth. Seluruh aktivitas tercatat dan dilindungi sesuai kebijakan keamanan serta hukum yang berlaku.
          </p>
        </motion.div>
      </div>
    );
  }

  const paperRemaining = kioskStatus?.paperRemaining ?? 400;
  const paperRollCapacity = kioskStatus?.paperRollCapacity ?? 400;
  const paperPct = Math.min(100, Math.round((paperRemaining / paperRollCapacity) * 100));
  const isLowPaper = paperRemaining <= 50;

  return (
    <div className="w-screen h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Glow Ambients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-16 px-4 md:px-6 bg-[#0E131F]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-glow-primary">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold text-white tracking-wide">
                Kasir: <span className="text-amber-400">{operatorInfo?.name || 'Petugas'}</span>
              </h1>
              {kioskStatus && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  [{kioskStatus.code}] {kioskStatus.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Paper Remaining Indicator with Quick Adjust */}
          {kioskStatus?.paperTrackingEnabled ? (
            <button
              onClick={() => {
                setManualPaperInput(String(paperRemaining));
                setShowPaperModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs transition"
              title="Klik untuk update jumlah fisik sisa kertas"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400 hidden sm:inline">Kertas:</span>
              <span className={`font-mono font-bold ${isLowPaper ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {paperRemaining} lbr ({paperPct}%)
              </span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-400"
              title="Pelacakan sisa kertas dinonaktifkan oleh Mitra"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline text-slate-500">Kertas:</span>
              <span className="font-medium text-slate-400">Bebas Cetak</span>
            </div>
          )}

          <button
            onClick={fetchAllOperatorData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <div className="bg-[#0E131F]/60 backdrop-blur-md border-b border-white/10 px-4 md:px-6 py-2.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'generator'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Generate PASS</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Riwayat PASS ({myPasses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reprint')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'reprint'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cetak Ulang ({recentSessions.length})</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
          <span>Struk:</span>
          <span className="font-semibold text-slate-200 truncate max-w-[200px]">
            {kioskStatus?.partnerReceiptHeader || kioskStatus?.receiptHeader || operatorInfo?.receiptHeader || 'MINJA PHOTOBOOTH'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar max-w-5xl mx-auto w-full space-y-6">
        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg ${statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="underline text-[11px]">
              Tutup
            </button>
          </div>
        )}

        {/* Warning Banners */}
        {kioskStatus?.isLocked && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">BOOTH DIKUNCI OLEH MITRA / OWNER:</span>
                <span className="ml-1 text-slate-300">
                  {kioskStatus.lockReason || 'Sesi foto di booth dinonaktifkan sementara untuk maintenance.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {Boolean(kioskStatus?.paperTrackingEnabled && paperRemaining <= 30) && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold">PERINGATAN SISA KERTAS KRITIS:</span>
                <span className="ml-1 text-slate-300">
                  Sisa kertas {paperRemaining} lembar! Segera isi ulang roll kertas printer booth agar tidak terjadi kendala cetak.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setManualPaperInput(String(paperRemaining));
                setShowPaperModal(true);
              }}
              className="px-3 py-1 rounded-xl bg-rose-500/30 hover:bg-rose-500/40 text-rose-200 font-bold transition text-[11px]"
            >
              Update Kertas
            </button>
          </div>
        )}

        {/* Shift Cash Summary Widget */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Uang Tunai Shift Hari Ini</span>
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg md:text-xl font-black font-mono text-emerald-400">
              {formatRupiah(shiftSummary?.totalCashAmount ?? myPasses.reduce((sum, p) => sum + (p.amount || 0), 0))}
            </div>
            <span className="text-[10px] text-slate-500">Penerimaan fisik kasir</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Total PASS Diterbitkan</span>
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg md:text-xl font-black font-mono text-amber-300">
              {shiftSummary?.totalPasses ?? myPasses.length} <span className="text-xs font-normal text-slate-400">Tiket</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {shiftSummary?.extraPrintsCount ?? myPasses.filter(p => p.type === 'EXTRA_PRINT').length} cetak ekstra
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Selesai Digunakan</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-lg md:text-xl font-black font-mono text-sky-300">
              {shiftSummary?.usedPasses ?? myPasses.filter(p => p.status === 'USED').length} <span className="text-xs font-normal text-slate-400">Sesi</span>
            </div>
            <span className="text-[10px] text-slate-500">Sudah foto di booth</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Menunggu Digunakan</span>
              <Clock className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg md:text-xl font-black font-mono text-purple-300">
              {shiftSummary?.activePasses ?? myPasses.filter(p => p.status === 'ACTIVE').length} <span className="text-xs font-normal text-slate-400">Aktif</span>
            </div>
            <span className="text-[10px] text-slate-500">Belum diinput ke booth</span>
          </div>
        </div>

        {/* TAB 1: GENERATE PASS TUNAI */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="md:col-span-2 p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-xl space-y-5">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Generate Kode Sesi Tunai (PASS)</h2>
                    <p className="text-xs text-slate-400">Pilih tipe sesi tunai yang diinginkan pelanggan</p>
                  </div>
                </div>
              </div>

              {/* Segmented Control: [Sesi Foto Baru] vs [Tambah Lembar Cetak Ekstra] */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950/60 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setPassType('SESSION');
                    if (packages.length > 0) {
                      const found = packages.find((p) => p.id === selectedPackageId) || packages[0];
                      setPassAmount(String(found.price));
                    }
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${passType === 'SESSION'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sesi Foto Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPassType('EXTRA_PRINT');
                    setPassAmount(String(extraPrints * 15000));
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${passType === 'EXTRA_PRINT'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Tambah Lembar Cetak</span>
                </button>
              </div>

              <form onSubmit={handleGeneratePass} className="space-y-4">
                {/* Tipe: Sesi Foto Baru */}
                {passType === 'SESSION' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Pilih Paket Sesi Foto
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          onClick={() => handlePackageChange(pkg.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${selectedPackageId === pkg.id
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-glow-primary/10'
                            : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/20'
                            }`}
                        >
                          <div>
                            <span className="text-xs font-bold block">{pkg.name}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
                              {pkg.printCopies || 1} lbr cetak
                            </span>
                          </div>
                          <span className="text-xs font-black font-mono text-amber-300 mt-2 block">
                            {formatRupiah(pkg.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tipe: Tambah Lembar Cetak Ekstra */}
                {passType === 'EXTRA_PRINT' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Pilih Jumlah Lembar Cetak Tambahan
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[1, 2, 3].map((num) => (
                        <div
                          key={num}
                          onClick={() => handleExtraPrintsChange(num)}
                          className={`p-3 rounded-2xl border cursor-pointer transition text-center ${extraPrints === num
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-glow-primary/10'
                            : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/20'
                            }`}
                        >
                          <span className="text-base font-black font-mono block">{num} Lembar</span>
                          <span className="text-xs font-bold font-mono text-amber-300 mt-1 block">
                            {formatRupiah(num * 15000)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nominal Input & Catatan Kasir */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nominal Uang Tunai Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      value={passAmount}
                      onChange={(e) => setPassAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-amber-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Catatan Kasir / Meja (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Meja 4 / Baju Biru"
                      value={passNote}
                      onChange={(e) => setPassNote(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingPass}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses Kode...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Buat Kode Akses Tunai Sekarang</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Result Column / Quick Stats */}
            <div className="space-y-4">
              {generatedPassResult ? (
                <div className="p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 backdrop-blur-2xl shadow-xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                    Kode Sesi Baru Siap!
                  </span>
                  <div className="w-full my-3 p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30">
                    <span className="text-3xl font-black font-mono tracking-widest text-amber-300 block">
                      {generatedPassResult.code}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      {formatRupiah(generatedPassResult.amount)} • Berlaku 1 Jam
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                      onClick={() => handleCopyPass(generatedPassResult.code)}
                      className="py-2.5 px-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-95 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Disalin' : 'Salin'}</span>
                    </button>

                    <button
                      onClick={() => sharePassToCustomer(generatedPassResult)}
                      className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
                      title="Kirim detail kode PASS ke WhatsApp Pelanggan (Tanpa API)"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Kirim WA</span>
                    </button>

                    <button
                      onClick={() => handlePrintReceipt(generatedPassResult)}
                      className="py-2.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1 shadow-md shadow-amber-500/20"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Cetak Struk</span>
                    </button>
                  </div>

                  {/* Auto-print toggle switch */}
                  <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-amber-500/20 text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Auto-buka dialog cetak</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={autoPrintOnGenerate}
                      onChange={(e) => toggleAutoPrint(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm font-bold text-white">Panduan Kasir Tunai</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      1. Terima pembayaran tunai dari pelanggan di booth.<br />
                      2. Tekan <strong className="text-amber-300">Buat Kode Akses</strong>.<br />
                      3. Berikan kode <span className="font-mono text-amber-400">PASS-XXXX</span> atau cetak struk thermal kasir.<br />
                      4. Pelanggan mengetik kode ini di layar booth untuk mulai foto!
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 text-[11px] text-slate-400">
                    Sisa Kertas: <strong className="text-white">{paperRemaining} lembar</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RIWAYAT KODE PASS */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">Riwayat Kode Akses Operator</h2>
                <p className="text-xs text-slate-400">Daftar kode sesi tunai dan cetak ekstra yang Anda terbitkan</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Menampilkan {filteredPasses.length} dari {myPasses.length} tiket
              </span>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Cari kode PASS atau catatan..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* Date Filter Pills */}
                <div className="flex items-center p-0.5 rounded-xl bg-white/[0.05] border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShiftDateFilter('TODAY')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${shiftDateFilter === 'TODAY'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftDateFilter('ALL')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${shiftDateFilter === 'ALL'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    Semua
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'ACTIVE', 'USED', 'EXPIRED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setHistoryStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${historyStatusFilter === st
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white'
                      }`}
                  >
                    {st === 'ALL' && 'Semua'}
                    {st === 'ACTIVE' && 'Aktif'}
                    {st === 'USED' && 'Digunakan'}
                    {st === 'EXPIRED' && 'Kadaluarsa'}
                  </button>
                ))}
              </div>
            </div>

            {filteredPasses.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-slate-400 text-xs">
                {myPasses.length === 0
                  ? 'Belum ada kode akses yang digenerate oleh akun operator Anda.'
                  : 'Tidak ada kode akses yang sesuai dengan filter pencarian.'}
              </div>
            ) : (
              <>
                {/* Mobile Card View (< md) */}
                <div className="md:hidden space-y-3">
                  {filteredPasses.slice(0, visiblePassesLimit).map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[#0E131F]/90 border border-white/10 shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-amber-300 text-lg">
                          {item.code}
                        </span>
                        <div>
                          {item.status === 'ACTIVE' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              Aktif
                            </span>
                          )}
                          {item.status === 'USED' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px] font-bold">
                              Digunakan
                            </span>
                          )}
                          {item.status === 'EXPIRED' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              Kadaluarsa
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1 border-t border-white/5">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Layanan</span>
                          <span className="font-semibold">
                            {item.type === 'EXTRA_PRINT'
                              ? `Cetak Ekstra (${item.extraPrints || 1} lbr)`
                              : item.packageName || 'Sesi Foto'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Nominal Tunai</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatRupiah(item.amount)}
                          </span>
                        </div>
                      </div>

                      {item.customerNote && (
                        <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2 rounded-xl">
                          <span className="text-slate-500">Catatan: </span>
                          {item.customerNote}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-500">
                        <span>
                          {new Date(item.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => sharePassToCustomer(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold transition flex items-center gap-1"
                            title="Kirim ke WhatsApp Pelanggan (Tanpa API)"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>WA</span>
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(item)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition flex items-center gap-1.5"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Cetak Struk</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block rounded-2xl bg-[#0E131F]/90 border border-white/10 overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Kode Akses</th>
                        <th className="py-3 px-4">Tipe</th>
                        <th className="py-3 px-4">Nominal</th>
                        <th className="py-3 px-4">Catatan Kasir</th>
                        <th className="py-3 px-4">Waktu Dibuat</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {filteredPasses.slice(0, visiblePassesLimit).map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4 font-mono font-bold text-amber-300 text-sm">
                            {item.code}
                          </td>
                          <td className="py-3 px-4">
                            {item.type === 'EXTRA_PRINT' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                Cetak Ekstra ({item.extraPrints || 1} lbr)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Sesi Foto {item.package?.name ? `(${item.package.name})` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {formatRupiah(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-400 max-w-[150px] truncate">
                            {item.customerNote || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(item.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            {item.status === 'ACTIVE' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                Aktif
                              </span>
                            )}
                            {item.status === 'USED' && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px] font-bold">
                                Digunakan
                              </span>
                            )}
                            {item.status === 'EXPIRED' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                Kadaluarsa
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => sharePassToCustomer(item)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                                title="Kirim ke WhatsApp Pelanggan (Tanpa API)"
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePrintReceipt(item)}
                                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 transition"
                                title="Cetak Struk Thermal"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tombol Tampilkan Lebih Banyak Jika Riwayat > 25 */}
                {filteredPasses.length > visiblePassesLimit && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setVisiblePassesLimit((prev) => prev + 25)}
                      className="px-5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 border border-white/10 text-xs font-bold transition active:scale-95 shadow-sm"
                    >
                      Tampilkan Lebih Banyak ({filteredPasses.length - visiblePassesLimit} riwayat tersisa)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: EMERGENCY REPRINT TOOL */}
        {activeTab === 'reprint' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-400" />
                  <span>Alat Cetak Ulang Darurat (Emergency Reprint Tool)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Gunakan alat ini jika kertas macet atau cetakan rusak saat sesi pelanggan berlangsung
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">10 Sesi Terakhir</span>
            </div>

            {recentSessions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-slate-400 text-xs">
                Belum ada data sesi foto tersimpan di booth ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-2xl bg-[#0E131F]/90 border border-white/10 shadow-lg flex flex-col justify-between hover:border-amber-500/30 transition group"
                  >
                    <div>
                      {/* Thumbnail Preview */}
                      <div className="w-full h-44 rounded-xl bg-slate-900 overflow-hidden relative border border-white/5 flex items-center justify-center mb-3">
                        {session.finalPhotoUrl || session.printPreviewUrl || session.templateThumbnail ? (
                          <img
                            src={(session.finalPhotoUrl || session.printPreviewUrl || session.templateThumbnail) as string}
                            alt="Hasil Sesi"
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (session.templateThumbnail && target.src !== session.templateThumbnail) {
                                target.src = session.templateThumbnail;
                              } else {
                                target.style.display = 'none';
                                const fallbackEl = target.parentElement?.querySelector('.fallback-placeholder');
                                if (fallbackEl) (fallbackEl as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="fallback-placeholder flex-col items-center text-slate-500 text-xs gap-1"
                          style={{ display: (session.finalPhotoUrl || session.printPreviewUrl || session.templateThumbnail) ? 'none' : 'flex' }}
                        >
                          <FileImage className="w-8 h-8 opacity-40" />
                          <span>Soft file di server</span>
                        </div>
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-mono text-amber-300 font-bold border border-white/10">
                          {session.packageName || 'Paket Foto'}
                        </span>
                      </div>

                      {/* Session Details */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-400 text-[11px]">
                            ID: {(session.orderId || session.sessionCode || session.id).slice(-8)}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(session.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-300 font-semibold truncate max-w-[150px]">
                            {session.customerName || 'Pelanggan Booth'}
                          </span>
                          <span className="text-emerald-400 font-bold font-mono">
                            {formatRupiah(session.totalAmount || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedSessionForReprint(session);
                        setReprintCopies(session.copies || session.totalPrints || 1);
                      }}
                      className="w-full mt-3 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Cetak Ulang Sesi Ini</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: CETAK STRUK THERMAL KASIR (58mm / 80mm) */}
      <AnimatePresence>
        {receiptPassData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-3xl bg-[#0E131F] border border-white/15 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Struk Kasir Thermal</h3>
                </div>
                <button
                  onClick={() => setReceiptPassData(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Paper Width Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 mb-3 rounded-xl bg-white/[0.04] border border-white/10">
                <button
                  type="button"
                  onClick={() => setReceiptWidth('58mm')}
                  className={`py-1 text-center text-[11px] font-bold rounded-lg transition ${receiptWidth === '58mm'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Lebar 58mm (Mini)
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptWidth('80mm')}
                  className={`py-1 text-center text-[11px] font-bold rounded-lg transition ${receiptWidth === '80mm'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Lebar 80mm (POS Kasir)
                </button>
              </div>

              {/* Printable Receipt Paper Mockup */}
              <div
                id="thermal-receipt-print"
                ref={receiptPrintRef}
                className={`bg-white text-black p-5 rounded-2xl font-mono text-xs shadow-inner space-y-2.5 mx-auto transition-all ${receiptWidth === '80mm' ? 'w-full max-w-[340px]' : 'w-full max-w-[270px]'
                  }`}
              >
                {/* Top Logo if configured by Partner */}
                {(kioskStatus?.receiptConfig?.showLogo ?? true) && kioskStatus?.receiptConfig?.logoUrl && (
                  <div className="text-center pb-1">
                    <img
                      src={kioskStatus.receiptConfig.logoUrl}
                      alt="Logo Struk"
                      className="mx-auto filter grayscale contrast-200"
                      style={{
                        maxWidth:
                          kioskStatus.receiptConfig.logoSize === 'small'
                            ? '70px'
                            : kioskStatus.receiptConfig.logoSize === 'large'
                              ? '140px'
                              : '95px',
                        maxHeight: '65px',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                )}

                {/* Header & Store Brand */}
                <div className="text-center space-y-0.5">
                  {(kioskStatus?.receiptConfig?.showHeader ?? true) && (
                    <h4 className="font-black text-sm uppercase tracking-wider">
                      {kioskStatus?.receiptConfig?.header || kioskStatus?.partnerReceiptHeader || kioskStatus?.receiptHeader || operatorInfo?.receiptHeader || 'MINJA PHOTOBOOTH'}
                    </h4>
                  )}
                  {(kioskStatus?.receiptConfig?.showTagline ?? true) && kioskStatus?.receiptConfig?.tagline && (
                    <p className="text-[10px] text-gray-600 italic leading-tight">{kioskStatus.receiptConfig.tagline}</p>
                  )}
                  {(kioskStatus?.receiptConfig?.showBranch ?? true) && (
                    <p className="text-[10px] text-gray-800 font-bold">
                      [{kioskStatus?.code || 'BOOTH-1'}] {kioskStatus?.name || 'Kiosk'}
                    </p>
                  )}
                  {(kioskStatus?.receiptConfig?.showAddress ?? true) && (kioskStatus?.receiptAddress || kioskStatus?.receiptConfig?.address) && (
                    <p className="text-[9px] text-gray-600 leading-tight">
                      {kioskStatus?.receiptAddress || kioskStatus?.receiptConfig?.address}
                    </p>
                  )}
                  {(kioskStatus?.receiptConfig?.showPhone ?? true) && (kioskStatus?.partnerPhone || kioskStatus?.receiptConfig?.phone) && (
                    <p className="text-[9px] text-gray-600">
                      WA: {kioskStatus?.partnerPhone || kioskStatus?.receiptConfig?.phone}
                    </p>
                  )}
                  {(kioskStatus?.receiptConfig?.showSocial ?? true) && (kioskStatus?.receiptSocial || kioskStatus?.receiptConfig?.social) && (
                    <p className="text-[9px] text-gray-600">
                      IG/Web: {kioskStatus?.receiptSocial || kioskStatus?.receiptConfig?.social}
                    </p>
                  )}
                </div>

                {/* Divider 1 */}
                {renderReceiptDivider()}

                {/* Metadata Transaksi */}
                <div className="space-y-1 text-[10px]">
                  {(kioskStatus?.receiptConfig?.showOrderId ?? true) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">NO. TIKET:</span>
                      <span className="font-bold">{receiptPassData.code}</span>
                    </div>
                  )}
                  {(kioskStatus?.receiptConfig?.showDateTime ?? true) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">WAKTU:</span>
                      <span>{new Date(receiptPassData.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {(kioskStatus?.receiptConfig?.showCashier ?? true) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">KASIR:</span>
                      <span className="font-bold">{operatorInfo?.name || receiptPassData.cashierName || 'Petugas'}</span>
                    </div>
                  )}
                  {(kioskStatus?.receiptConfig?.showKiosk ?? true) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">BOOTH:</span>
                      <span>[{kioskStatus?.code || 'BOOTH-1'}] {kioskStatus?.name || 'Kiosk'}</span>
                    </div>
                  )}
                  {(kioskStatus?.receiptConfig?.showNote ?? true) && receiptPassData.customerNote && (
                    <div className="flex justify-between text-gray-600">
                      <span className="text-gray-500">CATATAN:</span>
                      <span>{receiptPassData.customerNote}</span>
                    </div>
                  )}
                </div>

                {/* Divider 2 */}
                {(kioskStatus?.receiptConfig?.showItems ?? true) && renderReceiptDivider()}

                {/* Items & Layanan */}
                {(kioskStatus?.receiptConfig?.showItems ?? true) && (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span>
                        {receiptPassData.type === 'EXTRA_PRINT'
                          ? `Tambah Cetak (${receiptPassData.extraPrints || 1} lbr)`
                          : `Sesi Foto (${receiptPassData.package?.name || 'Standar'})`}
                      </span>
                      <span>{formatRupiah(receiptPassData.amount)}</span>
                    </div>
                  </div>
                )}

                {/* Divider 3 */}
                {(kioskStatus?.receiptConfig?.showPayment ?? true) && renderReceiptDivider()}

                {/* Payment Summary */}
                {(kioskStatus?.receiptConfig?.showPayment ?? true) && (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-black text-sm">
                      <span>TOTAL BAYAR</span>
                      <span>{formatRupiah(receiptPassData.amount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 text-[10px]">
                      <span>METODE:</span>
                      <span>TUNAI (KASIR)</span>
                    </div>
                  </div>
                )}

                {/* Big PASS Code Display Box */}
                {(kioskStatus?.receiptConfig?.showPassBox ?? true) && (
                  <div className="my-2.5 p-2.5 bg-gray-100 border border-dashed border-gray-400 rounded-xl text-center">
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider block">
                      KODE SESI TUNAI (KETIK DI LAYAR BOOTH)
                    </span>
                    <div className="text-2xl font-black tracking-widest my-1 text-black font-mono">
                      {receiptPassData.code}
                    </div>
                    <span className="text-[8px] text-gray-500 block">Masa aktif: 1 Jam</span>
                  </div>
                )}

                {/* QR Code Validation */}
                {(kioskStatus?.receiptConfig?.showQr ?? true) && (
                  <div className="flex flex-col items-center text-center py-1">
                    <div className="my-1 bg-white p-1 rounded-lg border border-gray-200">
                      <QRCodeCanvas
                        value={receiptPassData.code}
                        size={100}
                        fgColor="#000000"
                        bgColor="#ffffff"
                      />
                    </div>
                    <span className="text-[8px] text-gray-400">Scan untuk Verifikasi Transaksi</span>
                  </div>
                )}

                {/* Divider 4 */}
                {renderReceiptDivider()}

                {/* Footer & Policy */}
                <div className="text-center space-y-1 text-[9px] text-gray-500 leading-tight">
                  {(kioskStatus?.receiptConfig?.showFooter ?? true) && (
                    <p className="whitespace-pre-line">
                      {kioskStatus?.receiptConfig?.footer || kioskStatus?.partnerReceiptFooter || kioskStatus?.receiptFooter || operatorInfo?.receiptFooter || 'Terima kasih atas kunjungan Anda! Simpan struk ini sebagai bukti pembayaran.'}
                    </p>
                  )}
                  {(kioskStatus?.receiptConfig?.showPolicy ?? true) && (kioskStatus?.receiptPolicy || kioskStatus?.receiptConfig?.policy) && (
                    <p className="text-[8px] text-gray-500 italic pt-1 border-t border-dotted border-gray-300">
                      {kioskStatus?.receiptPolicy || kioskStatus?.receiptConfig?.policy}
                    </p>
                  )}
                  {(kioskStatus?.receiptConfig?.showWatermark ?? true) && (
                    <p className="text-[8px] text-gray-400 font-mono pt-1">MinjaPhotobooth Enterprise Kiosk V2</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setReceiptPassData(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => sharePassToCustomer(receiptPassData)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                  title="Kirim detail kode PASS ke WhatsApp Pelanggan (Tanpa API)"
                >
                  <Smartphone className="w-4 h-4 text-emerald-200" />
                  <span>Kirim WA</span>
                </button>
                <button
                  type="button"
                  onClick={triggerBrowserPrint}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Struk</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MANUAL PAPER COUNT ADJUSTMENT */}
      <AnimatePresence>
        {showPaperModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-3xl bg-[#0E131F] border border-white/15 shadow-2xl text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Update Sisa Kertas Fisik</h3>
              <p className="text-xs text-slate-400 mb-4">
                Ketik jumlah lembar kertas nyata yang saat ini ada di baki printer booth.
              </p>

              <form onSubmit={handleUpdatePaper} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sisa Lembar Kertas Saat Ini
                  </label>
                  <input
                    type="number"
                    required
                    value={manualPaperInput}
                    onChange={(e) => setManualPaperInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-sky-400 transition"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sistem akan otomatis mengurangi hitungan ini setiap ada sesi foto tercetak.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPaperModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPaper}
                    className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isUpdatingPaper ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Jumlah</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: KONFIRMASI CETAK ULANG (EMERGENCY REPRINT) */}
      <AnimatePresence>
        {selectedSessionForReprint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-3xl bg-[#0E131F] border border-white/15 shadow-2xl text-left"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cetak Ulang Sesi Foto</h3>
                  <p className="text-xs text-slate-400">Kirim ulang lembar cetak ke printer fisik</p>
                </div>
              </div>

              {/* Photo Preview Mini */}
              {(selectedSessionForReprint.finalPhotoUrl || selectedSessionForReprint.printPreviewUrl || selectedSessionForReprint.templateThumbnail) && (
                <div className="w-full h-36 rounded-xl bg-slate-900 border border-white/10 overflow-hidden mb-3 flex items-center justify-center">
                  <img
                    src={(selectedSessionForReprint.finalPhotoUrl || selectedSessionForReprint.printPreviewUrl || selectedSessionForReprint.templateThumbnail) as string}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (selectedSessionForReprint.templateThumbnail && target.src !== selectedSessionForReprint.templateThumbnail) {
                        target.src = selectedSessionForReprint.templateThumbnail;
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jumlah Lembar Cetak</label>
                  <select
                    value={reprintCopies}
                    onChange={(e) => setReprintCopies(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                  >
                    <option value={1}>1 Lembar Cetak</option>
                    <option value={2}>2 Lembar Cetak</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Alasan Cetak Ulang</label>
                  <select
                    value={reprintReason}
                    onChange={(e) => setReprintReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                  >
                    <option value="Kertas macet / Paper Jam">Kertas macet / Paper Jam</option>
                    <option value="Hasil cetak bergaris / pudar">Hasil cetak bergaris / pudar</option>
                    <option value="Kertas habis di tengah sesi">Kertas habis di tengah sesi</option>
                    <option value="Permintaan pelanggan langsung">Permintaan pelanggan langsung</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSessionForReprint(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isReprinting}
                    onClick={handleExecuteReprint}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isReprinting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Cetak Sekarang</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OperatorPortal;
