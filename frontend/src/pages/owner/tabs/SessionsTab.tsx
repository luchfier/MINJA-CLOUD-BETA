// frontend/src/pages/owner/tabs/SessionsTab.tsx
// TAB FEED SESI FOTO PELANGGAN REAL-TIME SELURUH JARINGAN

import React from 'react';
import { Cloud, Mail } from 'lucide-react';
import { NetworkSessionItem } from '../../../types/api';

export interface SessionsTabProps {
  networkSessions: NetworkSessionItem[];
  sessionTotalCount: number;
  isSessionsLoading: boolean;
  sessionSearch: string;
  setSessionSearch: (val: string) => void;
  sessionStatus: string;
  setSessionStatus: (val: string) => void;
  sessionPage: number;
  setSessionPage: React.Dispatch<React.SetStateAction<number>>;
  sessionTotalPages: number;
  onResendEmail: (session: { id: string; code: string; email?: string }) => void;
}

export const SessionsTab: React.FC<SessionsTabProps> = ({
  networkSessions,
  sessionTotalCount,
  isSessionsLoading,
  sessionSearch,
  setSessionSearch,
  sessionStatus,
  setSessionStatus,
  sessionPage,
  setSessionPage,
  sessionTotalPages,
  onResendEmail,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl">
        <div>
          <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">
            Real-Time Customer Feed
          </span>
          <h1 className="text-lg sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
            <span>Sesi Foto Pelanggan ({sessionTotalCount})</span>
            {isSessionsLoading && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal animate-pulse">
                Memuat...
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live feed sesi pelanggan dengan identitas lengkap Mitra, Booth, Kasir, status cetak & email
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Cari kode sesi / nama booth..."
            value={sessionSearch}
            onChange={(e) => setSessionSearch(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
          />
          <select
            value={sessionStatus}
            onChange={(e) => setSessionStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
          >
            <option value="ALL">Semua Status</option>
            <option value="COMPLETED">Selesai (COMPLETED)</option>
            <option value="PRINTING">Sedang Cetak (PRINTING)</option>
            <option value="PHOTO_EDITING">Sedang Edit (EDITING)</option>
            <option value="CAPTURE_ACTIVE">Sedang Foto (CAPTURE)</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {networkSessions.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-slate-800 text-xs text-slate-500">
            Belum ada sesi foto yang tercatat sesuai filter
          </div>
        ) : (
          networkSessions.map((s) => (
            <div
              key={s.id}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition shadow-xl space-y-3"
            >
              {/* IDENTITAS LENGKAP BADGES */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Badge Mitra */}
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-bold">
                  🏛️ {s.partnerName}
                </span>

                {/* Badge Booth */}
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] sm:text-xs font-bold">
                  📸 [{s.kioskCode}] {s.kioskName}
                </span>

                {/* Badge Kasir */}
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] sm:text-xs font-bold">
                  👤 {s.cashierName}
                </span>

                {/* Badge ID Sesi Unik */}
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono font-bold">
                  #{s.sessionCode}
                </span>

                {/* Badge Status Sesi */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                    s.state === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : s.state === 'PRINTING'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {s.state}
                </span>
              </div>

              {/* Session Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-[11px] sm:text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Paket Foto</span>
                  <span className="font-bold text-white mt-0.5 block truncate">{s.packageName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Biaya & Pembayaran</span>
                  <span className="font-bold text-emerald-400 font-mono mt-0.5 block truncate">
                    Rp {s.totalPrice.toLocaleString('id-ID')} ({s.paymentMethod.toUpperCase()})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Cetak Fisik</span>
                  <span className="font-bold text-white mt-0.5 block">{s.totalPrints} Lembar</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Waktu Sesi</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">
                    {new Date(s.createdAt).toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
              </div>

              {/* Files & Email Action */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400">
                  <Cloud className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{s.files.length} File Foto</span>
                  {s.emailDelivery && (
                    <span className="text-emerald-400 text-[10px] sm:text-[11px] truncate max-w-[150px] sm:max-w-none">
                      • {s.emailDelivery.email}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() =>
                      onResendEmail({
                        id: s.id,
                        code: s.sessionCode,
                        email: s.emailDelivery?.email || '',
                      })
                    }
                    className="w-full sm:w-auto py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Kirim Ulang Email</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {sessionTotalPages > 1 && (
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800">
          <button
            disabled={sessionPage <= 1}
            onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-white font-bold cursor-pointer"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-slate-400 font-mono">
            Halaman {sessionPage} dari {sessionTotalPages}
          </span>
          <button
            disabled={sessionPage >= sessionTotalPages}
            onClick={() => setSessionPage((p) => Math.min(sessionTotalPages, p + 1))}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-white font-bold cursor-pointer"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
};

