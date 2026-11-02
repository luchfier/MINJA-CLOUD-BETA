// frontend/src/pages/owner/tabs/FleetTab.tsx
// TAB ARBITRASE & MONITORING HARDWARE SELURUH BOOTH JARINGAN

import React from 'react';
import {
  Printer,
  Lock,
  Unlock,
  Plus,
  Layers,
  Trash2,
} from 'lucide-react';
import { KioskItem, PartnerItem } from '../../../types/api';

export interface FleetTabProps {
  kiosks: KioskItem[];
  partners: PartnerItem[];
  globalPartnerFilter: string;
  onOpenCreateModal: () => void;
  onOpenRefillModal: (kiosk: KioskItem) => void;
  onOpenLockModal: (kiosk: KioskItem) => void;
  onUnlockKiosk: (id: string, code: string) => void;
  onConfigurePackages: (kiosk: KioskItem) => void;
  onRemoteReset: (id: string, code: string) => void;
  onRotateApiKey: (id: string, code: string) => void;
  onDeleteKiosk: (kiosk: KioskItem) => void;
}

export const FleetTab: React.FC<FleetTabProps> = ({
  kiosks,
  partners,
  globalPartnerFilter,
  onOpenCreateModal,
  onOpenRefillModal,
  onOpenLockModal,
  onUnlockKiosk,
  onConfigurePackages,
  onRemoteReset,
  onRotateApiKey,
  onDeleteKiosk,
}) => {
  const relevantKiosks =
    globalPartnerFilter === 'ALL'
      ? kiosks
      : kiosks.filter((k) => k.partnerId === globalPartnerFilter);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl">
        <div>
          <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">
            Network Hardware Telemetry
          </span>
          <h1 className="text-lg sm:text-2xl font-black text-white mt-0.5">
            Booth ({relevantKiosks.length} Mesin)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoring sisa kertas foto, kunci jarak jauh, dan reset sesi seluruh booth fisik
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Daftarkan Booth Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {relevantKiosks.map((k) => {
          const partner = partners.find((p) => p.id === k.partnerId);
          const isLowPaper = k.paperRemaining <= 50;

          return (
            <div
              key={k.id}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-3 sm:space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      {k.code}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        k.isLocked
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : k.status === 'ONLINE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {k.isLocked ? 'Terkunci' : k.status}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white mt-2">{k.name}</h3>
                  <p className="text-xs text-slate-400">📍 {k.location}</p>
                  <p className="text-[11px] text-indigo-300 mt-1">
                    Mitra: {partner?.name || 'Pusat Minja (Direct)'}
                  </p>
                </div>
              </div>

              {/* Paper Status Gauge */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Sisa Kertas Lab:</span>
                  <span
                    className={`font-mono font-bold ${
                      isLowPaper ? 'text-rose-400 animate-pulse' : 'text-white'
                    }`}
                  >
                    {k.paperRemaining} / {k.paperRollCapacity} lbr
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isLowPaper ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (k.paperRemaining / (k.paperRollCapacity || 400)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onOpenRefillModal(k)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Refill</span>
                </button>

                {k.isLocked ? (
                  <button
                    onClick={() => onUnlockKiosk(k.id, k.code)}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Buka Kunci</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenLockModal(k)}
                    className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/30"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Kunci Booth</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onConfigurePackages(k)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 text-xs font-bold border border-slate-700 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Atur Paket</span>
                </button>
                <button
                  onClick={() => onRemoteReset(k.id, k.code)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-bold border border-slate-700 cursor-pointer"
                >
                  Reset Sesi
                </button>
                <button
                  onClick={() => onRotateApiKey(k.id, k.code)}
                  className="py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                  title="Rotasi API Key"
                >
                  Rotasi Key
                </button>
              </div>

              {/* TOMBOL HAPUS BOOTH & PUTUS AKSES API */}
              <button
                onClick={() => onDeleteKiosk(k)}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-bold border border-rose-800/50 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Hapus Booth & Putus Akses API</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

