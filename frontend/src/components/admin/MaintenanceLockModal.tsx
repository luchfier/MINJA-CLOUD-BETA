import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle, ShieldCheck, CheckCircle2, Clock, X, Eye, EyeOff } from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';

export interface MaintenanceLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCurrentlyMaintenance: boolean;
  currentReason?: string;
  token?: string;
  onSuccess: (isLocked: boolean, reason?: string) => void;
}

const PRESET_REASONS = [
  'Pengisian Ulang Kertas Foto (Refill Paper)',
  'Pemeriksaan & Kalibrasi Kamera',
  'Perawatan & Pembersihan Rutin',
  'Booth Ditutup Sementara',
  'Lainnya (Tulis Sendiri)',
];

export const MaintenanceLockModal: React.FC<MaintenanceLockModalProps> = ({
  isOpen,
  onClose,
  isCurrentlyMaintenance,
  currentReason,
  token,
  onSuccess,
}) => {
  const isLocking = !isCurrentlyMaintenance;
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const finalReason = isLocking
    ? selectedPreset === 'Lainnya (Tulis Sendiri)'
      ? (customReason.trim() || 'Pemeliharaan Teknis')
      : selectedPreset
    : undefined;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin || pin.length < 4) {
      setErrorMsg('Masukkan PIN Admin / Owner (minimal 4 digit).');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await photoboothApi.toggleKioskLock(
        isLocking,
        pin,
        finalReason,
        token
      );

      if (res.success) {
        onSuccess(isLocking, finalReason);
        onClose();
      } else {
        setErrorMsg(res.error?.message || 'PIN tidak valid atau gagal mengubah status.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                isLocking
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isLocking ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isLocking ? 'Kunci Kiosk (Mode Maintenance)' : 'Buka Kunci Layanan Kiosk'}
              </h3>
              <p className="text-xs text-slate-400">
                {isLocking
                  ? 'Kunci interaksi layar sentuh booth untuk pemeliharaan'
                  : 'Aktifkan kembali layanan dan sambut pelanggan baru'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Ongoing Session Grace Period Banner (Only when locking) */}
          {isLocking && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400 animate-pulse" />
              <div>
                <span className="font-bold">Jeda Hitung Mundur 15 Detik:</span>
                <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                  Jika kebetulan ada pelanggan yang sedang berfoto saat ini, booth akan memberikan peringatan dan hitung mundur 15 detik sebelum sesi diselesaikan secara aman dan layar terkunci.
                </p>
              </div>
            </div>
          )}

          {/* Reason Selection (Only when locking) */}
          {isLocking ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>Pilih Keterangan Alasan Maintenance</span>
                <span className="text-rose-400">*</span>
              </label>

              <div className="space-y-1.5">
                {PRESET_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedPreset(reason)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                      selectedPreset === reason
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                        : 'bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{reason}</span>
                    {selectedPreset === reason && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                ))}
              </div>

              {selectedPreset === 'Lainnya (Tulis Sendiri)' && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Tulis alasan spesifik pemeliharaan..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Alasan Kunci Sebelumnya:
              </span>
              <p className="text-xs text-slate-200 font-medium">
                {currentReason || 'Pemeliharaan berkala / pengisian kertas foto'}
              </p>
            </div>
          )}

          {/* PIN Verification Input (MANDATORY) */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Masukkan PIN Admin / Owner</span>
                <span className="text-rose-400">*</span>
              </span>
              <span className="text-[10px] text-slate-500">Wajib untuk otorisasi</span>
            </label>

            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ketik 6 digit PIN Admin..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-center tracking-widest text-lg font-mono text-white placeholder:text-xs placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                autoFocus={!isLocking}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                title={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Numpad for Touchscreen Kiosk */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    if (pin.length < 8) setPin((prev) => prev + digit);
                  }}
                  className="py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xs font-bold text-white transition-all border border-slate-700/50"
                >
                  {digit}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPin('')}
                className="text-[11px] text-slate-400 hover:text-rose-400 font-medium py-0.5"
              >
                Hapus PIN
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || pin.length < 4}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                isLocking
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLocking ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              <span>{isLocking ? 'Konfirmasi Kunci Kiosk' : 'Buka Kunci Sekarang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
