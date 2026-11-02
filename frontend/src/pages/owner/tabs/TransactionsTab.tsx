// frontend/src/pages/owner/tabs/TransactionsTab.tsx
// TAB BUKU BESAR TRANSAKSI MULTI-TIER, FILTER, EKSPOR CSV & RINGKASAN EKSEKUTIF

import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  CategorizedTransactionItem,
  TransactionSummaryDto,
  TransactionCategory,
  TransactionStatus,
} from '../../../types/api';

export interface TransactionsTabProps {
  transactionTotal: number;
  isExportingCsv: boolean;
  onExportCsv: () => void;
  onOpenExecutiveSummary?: () => void;
  transactionSummary: TransactionSummaryDto | null;
  txDateMode: 'today' | 'monthly' | 'custom' | 'all';
  setTxDateMode: (mode: 'today' | 'monthly' | 'custom' | 'all') => void;
  txSelectedDate: string;
  setTxSelectedDate: (val: string) => void;
  txSelectedMonth: string;
  setTxSelectedMonth: (val: string) => void;
  txStartDate: string;
  setTxStartDate: (val: string) => void;
  txEndDate: string;
  setTxEndDate: (val: string) => void;
  txCategoryFilter: TransactionCategory | 'ALL';
  setTxCategoryFilter: (val: TransactionCategory | 'ALL') => void;
  txStatusFilter: TransactionStatus | 'ALL';
  setTxStatusFilter: (val: TransactionStatus | 'ALL') => void;
  txSearchQuery: string;
  setTxSearchQuery: (val: string) => void;
  transactions: CategorizedTransactionItem[];
  txTotalPages: number;
  txPage: number;
  setTxPage: React.Dispatch<React.SetStateAction<number>>;
  onSelectTxDetail: (tx: CategorizedTransactionItem) => void;
  getCategoryBadgeInfo: (category: TransactionCategory) => { label: string; bg: string };
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactionTotal,
  isExportingCsv,
  onExportCsv,
  onOpenExecutiveSummary,
  transactionSummary,
  txDateMode,
  setTxDateMode,
  txSelectedDate,
  setTxSelectedDate,
  txSelectedMonth,
  setTxSelectedMonth,
  txStartDate,
  setTxStartDate,
  txEndDate,
  setTxEndDate,
  txCategoryFilter,
  setTxCategoryFilter,
  txStatusFilter,
  setTxStatusFilter,
  txSearchQuery,
  setTxSearchQuery,
  transactions,
  txTotalPages,
  txPage,
  setTxPage,
  onSelectTxDetail,
  getCategoryBadgeInfo,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl">
        <div>
          <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">
            Comprehensive Financial Ledger
          </span>
          <h1 className="text-lg sm:text-2xl font-black text-white mt-0.5">
            Ledger Transaksi ({transactionTotal})
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Rekapitulasi transaksi terklasifikasi dengan filter periode, mitra, booth, dan ekspor
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {onOpenExecutiveSummary && (
            <button
              onClick={onOpenExecutiveSummary}
              className="flex-1 sm:flex-none py-2.5 px-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Buka Ringkasan Eksekutif & Bagi Hasil"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Ringkasan Eksekutif</span>
            </button>
          )}

          <button
            onClick={onExportCsv}
            disabled={isExportingCsv}
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExportingCsv ? 'Mengekspor...' : 'Ekspor Laporan CSV'}</span>
          </button>
        </div>
      </div>

      {/* Transaction Summary Mini Cards */}
      {transactionSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Omzet Transaksi</span>
            <span className="text-sm sm:text-lg font-black text-white font-mono mt-0.5 block truncate">
              Rp {transactionSummary.totalGrossRevenue.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
              {transactionSummary.totalTransactions} Transaksi Terdata
            </span>
          </div>
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-[10px] uppercase font-bold text-indigo-400 block">QRIS Midtrans</span>
            <span className="text-sm sm:text-lg font-black text-indigo-300 font-mono mt-0.5 block truncate">
              Rp {(transactionSummary.breakdown?.qris?.totalRevenue || 0).toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-indigo-300/70 mt-0.5 block truncate">
              {transactionSummary.breakdown?.qris?.count || 0} Transaksi
            </span>
          </div>
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Tunai + PASS</span>
            <span className="text-sm sm:text-lg font-black text-emerald-300 font-mono mt-0.5 block truncate">
              Rp {(
                (transactionSummary.breakdown?.cashDesk?.totalRevenue || 0) +
                (transactionSummary.breakdown?.cashPasscode?.totalRevenue || 0)
              ).toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-300/70 mt-0.5 block truncate">
              {(transactionSummary.breakdown?.cashDesk?.count || 0) +
                (transactionSummary.breakdown?.cashPasscode?.count || 0)}{' '}
              Transaksi
            </span>
          </div>
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-[10px] uppercase font-bold text-cyan-400 block">Cetak Ekstra & Diskon</span>
            <span className="text-sm sm:text-lg font-black text-cyan-300 font-mono mt-0.5 block truncate">
              Rp {(transactionSummary.breakdown?.extraPrints?.totalRevenue || 0).toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-rose-300/80 mt-0.5 block truncate">
              Diskon: Rp {(transactionSummary.breakdown?.voucherPromo?.totalDiscountGiven || 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      )}

      {/* Multi-Tier Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Date Mode */}
          <select
            value={txDateMode}
            onChange={(e) => setTxDateMode(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="today">Hari Ini</option>
            <option value="monthly">Bulanan</option>
            <option value="custom">Rentang Tanggal</option>
            <option value="all">Semua Waktu</option>
          </select>

          {txDateMode === 'today' && (
            <input
              type="date"
              value={txSelectedDate}
              onChange={(e) => setTxSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
            />
          )}

          {txDateMode === 'monthly' && (
            <input
              type="month"
              value={txSelectedMonth}
              onChange={(e) => setTxSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
            />
          )}

          {txDateMode === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={txStartDate}
                onChange={(e) => setTxStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
              />
              <span className="text-xs text-slate-500">s/d</span>
              <input
                type="date"
                value={txEndDate}
                onChange={(e) => setTxEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
              />
            </div>
          )}

          {/* Filter Kategori */}
          <select
            value={txCategoryFilter}
            onChange={(e) => setTxCategoryFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="QRIS_MIDTRANS">QRIS Midtrans</option>
            <option value="CASH_DESK">Tunai Kasir</option>
            <option value="CASH_PASSCODE">Kode Akses PASS</option>
            <option value="EXTRA_PRINTS">Cetak Tambahan</option>
            <option value="VOUCHER_PROMO">Diskon Voucher</option>
          </select>

          {/* Filter Status */}
          <select
            value={txStatusFilter}
            onChange={(e) => setTxStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="SETTLED">Lunas (SETTLED)</option>
            <option value="PENDING">Menunggu (PENDING)</option>
            <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
            <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
          </select>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Cari order ID / kasir..."
            value={txSearchQuery}
            onChange={(e) => setTxSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 flex-1 min-w-[150px]"
          />
        </div>
      </div>

      {/* Transactions Table with Responsive Horizontal Scroll */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
        <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between sm:hidden text-[10px] text-slate-400">
          <span>👈 Geser tabel ke samping untuk melihat kolom lengkap</span>
          <span className="font-mono text-indigo-400">{transactions.length} baris</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="min-w-[680px] w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order ID & Sesi</th>
                <th className="py-3 px-4">Mitra & Booth</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Paket</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-500">
                    Tidak ada transaksi yang cocok
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const badge = getCategoryBadgeInfo(tx.category);
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => onSelectTxDetail(tx)}
                      className="hover:bg-slate-800/50 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        <div>{tx.orderId}</div>
                        <span className="text-[10px] text-slate-400">#{tx.sessionCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-amber-300 block">{tx.partnerName || 'Minja Pusat'}</span>
                        <span className="text-[10px] text-slate-400">
                          {tx.kioskName ? `[${tx.kioskCode}] ${tx.kioskName}` : 'Lokal'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-medium">{tx.packageName}</td>
                      <td className="py-3 px-4 text-slate-400">{tx.cashierName || 'Self-Service'}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-400">
                        Rp {tx.grossAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            tx.isSettled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {tx.isSettled ? 'LUNAS' : tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {txTotalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
            <button
              disabled={txPage <= 1}
              onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-white font-bold cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Halaman {txPage} dari {txTotalPages}
            </span>
            <button
              disabled={txPage >= txTotalPages}
              onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-white font-bold cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

