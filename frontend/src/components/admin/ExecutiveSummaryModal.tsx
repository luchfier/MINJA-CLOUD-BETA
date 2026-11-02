// frontend/src/components/admin/ExecutiveSummaryModal.tsx
// MODAL & CETAK RESMI: LAPORAN RINGKASAN EKSEKUTIF FINANSIAL & BAGI HASIL
// Mendukung Cetak / Simpan PDF (A4 Clean Print) dan Ekspor Spreadsheet Excel (.xls)

import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Percent,
  FileText,
} from 'lucide-react';

export interface ExecutiveKioskPerformance {
  code: string;
  name: string;
  sessions: number;
  revenue: number;
  location?: string;
}

export interface ExecutiveSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  periodLabel: string;
  partnerName: string;
  kioskName: string;
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  totalSessions: number;
  channelBreakdown: {
    qris: number;
    cash: number;
    accessCode: number;
    extraPrints?: number;
  };
  kioskList?: ExecutiveKioskPerformance[];
  defaultPartnerSharePercent?: number;
}

export const ExecutiveSummaryModal: React.FC<ExecutiveSummaryProps> = ({
  isOpen,
  onClose,
  periodLabel,
  partnerName,
  kioskName,
  grossRevenue,
  totalDiscount,
  netRevenue,
  totalSessions,
  channelBreakdown,
  kioskList = [],
  defaultPartnerSharePercent = 70,
}) => {
  const [partnerPercent, setPartnerPercent] = useState<number>(defaultPartnerSharePercent);
  const [operationalDeduction, setOperationalDeduction] = useState<number>(0);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Perhitungan Bagi Hasil
  const ownerPercent = Math.max(0, 100 - partnerPercent);
  const netAfterDeduction = Math.max(0, netRevenue - operationalDeduction);
  const partnerShareAmount = Math.round((netAfterDeduction * partnerPercent) / 100);
  const ownerShareAmount = netAfterDeduction - partnerShareAmount;
  const aov = totalSessions > 0 ? Math.round(netRevenue / totalSessions) : 0;

  const reportNumber = `MINJA-EXC/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;
  const printedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Handler: Cetak / Simpan PDF via Browser Print Engine
  const handlePrintPdf = () => {
    window.print();
  };

  // Handler: Ekspor Format Excel Spreadsheet (.xls berformat HTML table)
  const handleExportExcel = () => {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Ringkasan Eksekutif</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          body { font-family: Calibri, sans-serif; }
          .header { font-size: 16pt; font-weight: bold; color: #1e1b4b; text-align: center; }
          .sub { font-size: 11pt; color: #475569; text-align: center; }
          .title { font-weight: bold; background-color: #f1f5f9; }
          .num { mso-number-format:"\\#,##0"; text-align: right; }
          .highlight { background-color: #e0e7ff; font-weight: bold; }
          th { background-color: #312e81; color: #ffffff; font-weight: bold; text-align: left; }
          td { border: 0.5pt solid #cbd5e1; padding: 4px 8px; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="4" class="header">MINJA PHOTOBOOTH ENTERPRISE</td></tr>
          <tr><td colspan="4" class="sub">LAPORAN RINGKASAN EKSEKUTIF & BAGI HASIL</td></tr>
          <tr><td colspan="4" style="text-align:center;">No. Laporan: ${reportNumber} | Tanggal Cetak: ${printedDate}</td></tr>
          <tr><td colspan="4">&nbsp;</td></tr>
          
          <tr class="title"><td colspan="4">PARAMETER LAPORAN</td></tr>
          <tr><td colspan="2">Periode Transaksi</td><td colspan="2"><b>${periodLabel}</b></td></tr>
          <tr><td colspan="2">Mitra / Jaringan</td><td colspan="2"><b>${partnerName}</b></td></tr>
          <tr><td colspan="2">Booth / Lokasi</td><td colspan="2"><b>${kioskName}</b></td></tr>
          <tr><td colspan="4">&nbsp;</td></tr>

          <tr class="title"><td colspan="4">RINGKASAN FINANSIAL UTAMA</td></tr>
          <tr><td colspan="2">Total Omzet Kotor (Gross Revenue)</td><td colspan="2" class="num">${grossRevenue}</td></tr>
          <tr><td colspan="2">Diskon Promo & Voucher</td><td colspan="2" class="num" style="color:red;">-${totalDiscount}</td></tr>
          <tr class="highlight"><td colspan="2">Total Omzet Bersih Diterima</td><td colspan="2" class="num">${netRevenue}</td></tr>
          <tr><td colspan="2">Total Sesi Foto Sukses</td><td colspan="2" class="num">${totalSessions} sesi</td></tr>
          <tr><td colspan="2">Rata-rata Nilai Transaksi (AOV)</td><td colspan="2" class="num">${aov}</td></tr>
          <tr><td colspan="4">&nbsp;</td></tr>

          <tr class="title"><td colspan="4">BREAKDOWN METODE PEMBAYARAN</td></tr>
          <tr><td colspan="2">QRIS Dinamis</td><td colspan="2" class="num">${channelBreakdown.qris}</td></tr>
          <tr><td colspan="2">Tunai Kasir</td><td colspan="2" class="num">${channelBreakdown.cash}</td></tr>
          <tr><td colspan="2">Kode Akses Sesi (PASS)</td><td colspan="2" class="num">${channelBreakdown.accessCode}</td></tr>
          ${channelBreakdown.extraPrints ? `<tr><td colspan="2">Cetak Lembar Tambahan</td><td colspan="2" class="num">${channelBreakdown.extraPrints}</td></tr>` : ''}
          <tr><td colspan="4">&nbsp;</td></tr>

          <tr class="title"><td colspan="4">KALKULASI SKEMA BAGI HASIL</td></tr>
          <tr><td colspan="2">Total Omzet Bersih Dasar</td><td colspan="2" class="num">${netRevenue}</td></tr>
          <tr><td colspan="2">Biaya Operasional / Bahan</td><td colspan="2" class="num">-${operationalDeduction}</td></tr>
          <tr><td colspan="2">Dasar Bagi Hasil</td><td colspan="2" class="num">${netAfterDeduction}</td></tr>
          <tr style="background-color:#dcfce7; font-weight:bold;">
            <td colspan="2">Hak Bersih Mitra (${partnerPercent}%)</td>
            <td colspan="2" class="num">${partnerShareAmount}</td>
          </tr>
          <tr style="background-color:#ede9fe; font-weight:bold;">
            <td colspan="2">Hak Bersih Minja Pusat (${ownerPercent}%)</td>
            <td colspan="2" class="num">${ownerShareAmount}</td>
          </tr>
          <tr><td colspan="4">&nbsp;</td></tr>

          ${
            kioskList.length > 0
              ? `
          <tr class="title"><td colspan="4">RINCIAN PERFORMA PER BOOTH</td></tr>
          <tr style="background-color:#1e293b; color:#ffffff;">
            <th>Kode</th>
            <th>Nama Booth</th>
            <th>Sesi Foto</th>
            <th>Total Omzet</th>
          </tr>
          ${kioskList
            .map(
              (k) => `
            <tr>
              <td>${k.code}</td>
              <td>${k.name}</td>
              <td class="num">${k.sessions}</td>
              <td class="num">${k.revenue}</td>
            </tr>
          `
            )
            .join('')}
          `
              : ''
          }
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ringkasan_Eksekutif_Minja_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      {/* Container Dialog */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden my-auto">
        {/* Top Control Bar (Tidak tampil saat print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Ringkasan Eksekutif Finansial</h2>
              <p className="text-xs text-slate-400">Format Resmi Siap Cetak PDF & Ekspor Excel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all shadow-sm"
              title="Unduh file Microsoft Excel (.xls)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Ekspor Excel (.xls)</span>
            </button>
            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              title="Cetak atau Simpan PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar (Pengaturan Bagi Hasil Interaktif - Hidden on Print) */}
        <div className="px-6 py-3 bg-indigo-950/20 border-b border-indigo-900/30 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-300">Bagi Hasil Mitra:</span>
              <div className="flex items-center gap-1">
                {[50, 60, 70, 80].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setPartnerPercent(pct)}
                    className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs transition-all ${
                      partnerPercent === pct
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={partnerPercent}
                  onChange={(e) => setPartnerPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-14 px-2 py-0.5 text-center font-mono font-bold bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="text-slate-400">Minja Pusat:</span>
              <span className="font-mono font-bold text-indigo-400">{ownerPercent}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Biaya Bahan / Operasional:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">Rp</span>
              <input
                type="number"
                min="0"
                step="10000"
                value={operationalDeduction || ''}
                placeholder="0"
                onChange={(e) => setOperationalDeduction(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 pl-7 pr-2 py-1 font-mono text-xs text-right bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/50 print:bg-white print:p-0">
          {/* Printable White Sheet Document */}
          <div
            ref={reportRef}
            className="w-full max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl p-6 sm:p-10 border border-slate-200 print:border-none print:shadow-none print:p-0 print:rounded-none"
          >
            {/* Header Surat Laporan Resmi */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-black text-sm">
                    M
                  </div>
                  <span className="text-xl font-black tracking-tight text-slate-950 font-mono">
                    MINJA PHOTOBOOTH
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">
                  Enterprise Photobooth Network Command
                </p>
                <p className="text-[11px] text-slate-400">
                  Layanan Self-Service Kiosk & Kemitraan Digital
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded bg-indigo-50 text-indigo-900 font-mono text-[10px] font-bold tracking-wider uppercase border border-indigo-200">
                  Ringkasan Eksekutif
                </span>
                <p className="font-mono text-xs font-bold text-slate-700 mt-1">{reportNumber}</p>
                <p className="text-[10px] text-slate-500">Dicetak: {printedDate}</p>
              </div>
            </div>

            {/* Scope / Metadata Section */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Periode Laporan</span>
                <span className="font-bold text-slate-900">{periodLabel}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Mitra / Rekanan</span>
                <span className="font-bold text-slate-900">{partnerName}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cakupan Booth</span>
                <span className="font-bold text-slate-900">{kioskName}</span>
              </div>
            </div>

            {/* Main Financial Highlights */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                1. Kinerja Finansial Utama
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Omzet Kotor (Gross)</span>
                  <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                    Rp {grossRevenue.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-rose-600 block">Diskon Voucher</span>
                  <span className="text-sm sm:text-base font-black font-mono text-rose-700">
                    -Rp {totalDiscount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 font-bold block">Omzet Bersih (Net)</span>
                  <span className="text-sm sm:text-base font-black font-mono text-indigo-950">
                    Rp {netRevenue.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Total Sesi Foto</span>
                  <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                    {totalSessions.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">sesi</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Kanal Pembayaran & Bagi Hasil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Kanal Pembayaran */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Komposisi Kanal Bayar
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-600">QRIS Dinamis (EMVCo)</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rp {channelBreakdown.qris.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-600">Tunai Kasir Fisik</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rp {channelBreakdown.cash.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-600">Kode Akses Sesi (PASS)</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rp {channelBreakdown.accessCode.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {channelBreakdown.extraPrints ? (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">Cetak Ekstra (Add-On)</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp {channelBreakdown.extraPrints.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Rekapitulasi Bagi Hasil */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-3">
                    Kalkulasi Bagi Hasil (Settlement)
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-indigo-100">
                      <span className="text-slate-600">Dasar Bagi Hasil</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp {netAfterDeduction.toLocaleString('id-ID')}
                      </span>
                    </div>
                    {operationalDeduction > 0 && (
                      <div className="flex justify-between items-center py-1 border-b border-indigo-100 text-rose-600">
                        <span>Biaya Operasional/Bahan</span>
                        <span className="font-mono font-bold">-Rp {operationalDeduction.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1.5 font-bold text-emerald-800 bg-emerald-50 px-2 rounded">
                      <span>Hak Bersih Mitra ({partnerPercent}%)</span>
                      <span className="font-mono">Rp {partnerShareAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 font-bold text-indigo-900 bg-indigo-100/60 px-2 rounded">
                      <span>Hak Minja Pusat ({ownerPercent}%)</span>
                      <span className="font-mono">Rp {ownerShareAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performa per Kiosk (Bila ada) */}
            {kioskList.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  2. Kontribusi Performa Per Photobooth
                </h3>
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Kode</th>
                        <th className="p-2.5">Nama Booth / Kiosk</th>
                        <th className="p-2.5 text-center">Sesi</th>
                        <th className="p-2.5 text-right">Omzet Bersih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {kioskList.map((k) => (
                        <tr key={k.code} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-indigo-900">{k.code}</td>
                          <td className="p-2.5 font-medium text-slate-800">{k.name}</td>
                          <td className="p-2.5 text-center font-mono">{k.sessions}</td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            Rp {k.revenue.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Signature Block (Untuk Bukti Settlement & Pengesahan Dokumen) */}
            <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <p className="text-slate-500 mb-14">Divalidasi & Disetujui Oleh,<br /><b>Manajemen Minja Photobooth</b></p>
                <div className="w-36 mx-auto border-b border-slate-400"></div>
                <p className="text-[11px] text-slate-600 mt-1">(Tanda Tangan & Cap)</p>
              </div>

              <div>
                <p className="text-slate-500 mb-14">Diterima & Disepakati Oleh,<br /><b>Mitra / Rekanan Pengelola</b></p>
                <div className="w-36 mx-auto border-b border-slate-400"></div>
                <p className="text-[11px] text-slate-600 mt-1">{partnerName}</p>
              </div>
            </div>

            {/* Footer Cetak */}
            <div className="mt-8 text-center text-[10px] text-slate-400 font-mono">
              Dokumen ini dihasilkan secara otomatis oleh Minja Photobooth Enterprise Engine.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
