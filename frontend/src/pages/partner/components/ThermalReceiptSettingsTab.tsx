// frontend/src/pages/partner/components/ThermalReceiptSettingsTab.tsx
// Studio Kustomisasi Lengkap Struk Thermal Kasir & Simulator Real-Time

import React, { useState, useEffect, useRef } from 'react';
import {
  Receipt,
  Printer,
  RefreshCw,
  ImageIcon,
  UploadCloud,
  Trash2,
  Building2,
  Sliders,
  Edit,
  Loader2,
  Check,
  QrCode,
} from 'lucide-react';
import { photoboothApi } from '../../../services/photoboothApi';
import type { PartnerItem, OperatorItem, KioskItem } from '../../../types/api';

export interface ThermalReceiptSettingsTabProps {
  partnerToken: string | null;
  partnerInfo: PartnerItem | null;
  setPartnerInfo: React.Dispatch<React.SetStateAction<PartnerItem | null>>;
  myOperators?: OperatorItem[];
  myKiosks?: KioskItem[];
  showNotification: (successMsg?: string, errorMsg?: string) => void;
}

export const ThermalReceiptSettingsTab: React.FC<ThermalReceiptSettingsTabProps> = ({
  partnerToken,
  partnerInfo,
  setPartnerInfo,
  myOperators = [],
  myKiosks = [],
  showNotification,
}) => {
  // Form States
  const [receiptHeaderInput, setReceiptHeaderInput] = useState('');
  const [receiptTaglineInput, setReceiptTaglineInput] = useState('');
  const [receiptFooterInput, setReceiptFooterInput] = useState('');
  const [partnerPhoneInput, setPartnerPhoneInput] = useState('');
  const [receiptAddressInput, setReceiptAddressInput] = useState('');
  const [receiptSocialInput, setReceiptSocialInput] = useState('');
  const [receiptPolicyInput, setReceiptPolicyInput] = useState('');
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<58 | 80>(58);
  const [receiptDividerStyle, setReceiptDividerStyle] = useState<'dashed' | 'dotted' | 'solid' | 'stars'>('dashed');
  const [receiptLogo, setReceiptLogo] = useState<string | null>(null);
  const [receiptLogoSize, setReceiptLogoSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Full Checklist Toggles (On/Off for ALL Design Elements)
  const [receiptShowLogo, setReceiptShowLogo] = useState(true);
  const [receiptShowHeader, setReceiptShowHeader] = useState(true);
  const [receiptShowTagline, setReceiptShowTagline] = useState(true);
  const [receiptShowBranch, setReceiptShowBranch] = useState(true);
  const [receiptShowAddress, setReceiptShowAddress] = useState(true);
  const [receiptShowPhone, setReceiptShowPhone] = useState(true);
  const [receiptShowSocial, setReceiptShowSocial] = useState(true);
  const [receiptShowOrderId, setReceiptShowOrderId] = useState(true);
  const [receiptShowDateTime, setReceiptShowDateTime] = useState(true);
  const [receiptShowCashier, setReceiptShowCashier] = useState(true);
  const [receiptShowKiosk, setReceiptShowKiosk] = useState(true);
  const [receiptShowNote, setReceiptShowNote] = useState(true);
  const [receiptShowItems, setReceiptShowItems] = useState(true);
  const [receiptShowPayment, setReceiptShowPayment] = useState(true);
  const [receiptShowPassBox, setReceiptShowPassBox] = useState(true);
  const [receiptShowQr, setReceiptShowQr] = useState(true);
  const [receiptShowFooter, setReceiptShowFooter] = useState(true);
  const [receiptShowPolicy, setReceiptShowPolicy] = useState(true);
  const [receiptShowWatermark, setReceiptShowWatermark] = useState(true);

  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial values from partnerInfo
  useEffect(() => {
    if (partnerInfo) {
      setReceiptHeaderInput((partnerInfo as any).receiptHeader || '');
      setReceiptFooterInput((partnerInfo as any).receiptFooter || '');
      setPartnerPhoneInput((partnerInfo as any).phone || '');
      setReceiptAddressInput((partnerInfo as any).receiptAddress || '');
      setReceiptSocialInput((partnerInfo as any).receiptSocial || '');
      setReceiptPolicyInput((partnerInfo as any).receiptPolicy || '');
      setReceiptPaperWidth(((partnerInfo as any).receiptPaperWidth as 58 | 80) || 58);
      const cfg = (partnerInfo as any).receiptConfig;
      if (cfg) {
        if (cfg.logoUrl !== undefined) setReceiptLogo(cfg.logoUrl);
        if (cfg.logoSize !== undefined) setReceiptLogoSize(cfg.logoSize);
        if (cfg.tagline !== undefined) setReceiptTaglineInput(cfg.tagline);
        if (cfg.dividerStyle !== undefined) setReceiptDividerStyle(cfg.dividerStyle);
        if (cfg.showLogo !== undefined) setReceiptShowLogo(cfg.showLogo);
        if (cfg.showHeader !== undefined) setReceiptShowHeader(cfg.showHeader);
        if (cfg.showTagline !== undefined) setReceiptShowTagline(cfg.showTagline);
        if (cfg.showBranch !== undefined) setReceiptShowBranch(cfg.showBranch);
        if (cfg.showAddress !== undefined) setReceiptShowAddress(cfg.showAddress);
        if (cfg.showPhone !== undefined) setReceiptShowPhone(cfg.showPhone);
        if (cfg.showSocial !== undefined) setReceiptShowSocial(cfg.showSocial);
        if (cfg.showOrderId !== undefined) setReceiptShowOrderId(cfg.showOrderId);
        if (cfg.showDateTime !== undefined) setReceiptShowDateTime(cfg.showDateTime);
        if (cfg.showCashier !== undefined) setReceiptShowCashier(cfg.showCashier);
        if (cfg.showKiosk !== undefined) setReceiptShowKiosk(cfg.showKiosk);
        if (cfg.showNote !== undefined) setReceiptShowNote(cfg.showNote);
        if (cfg.showItems !== undefined) setReceiptShowItems(cfg.showItems);
        if (cfg.showPayment !== undefined) setReceiptShowPayment(cfg.showPayment);
        if (cfg.showPassBox !== undefined) setReceiptShowPassBox(cfg.showPassBox);
        if (cfg.showQr !== undefined) setReceiptShowQr(cfg.showQr);
        if (cfg.showFooter !== undefined) setReceiptShowFooter(cfg.showFooter);
        if (cfg.showPolicy !== undefined) setReceiptShowPolicy(cfg.showPolicy);
        if (cfg.showWatermark !== undefined) setReceiptShowWatermark(cfg.showWatermark);
      }
    }
  }, [partnerInfo]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotification(undefined, 'Ukuran logo maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 400;
        const maxH = 200;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width / height > maxW / maxH) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          setReceiptLogo(dataUrl);
          setReceiptShowLogo(true);
          showNotification('Logo struk berhasil diunggah!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setReceiptLogo(null);
    setReceiptShowLogo(false);
    showNotification('Logo struk berhasil dihapus.');
  };

  const handleResetReceiptToDefault = () => {
    setReceiptShowLogo(true);
    setReceiptShowHeader(true);
    setReceiptShowTagline(true);
    setReceiptShowBranch(true);
    setReceiptShowAddress(true);
    setReceiptShowPhone(true);
    setReceiptShowSocial(true);
    setReceiptShowOrderId(true);
    setReceiptShowDateTime(true);
    setReceiptShowCashier(true);
    setReceiptShowKiosk(true);
    setReceiptShowNote(true);
    setReceiptShowItems(true);
    setReceiptShowPayment(true);
    setReceiptShowPassBox(true);
    setReceiptShowQr(true);
    setReceiptShowFooter(true);
    setReceiptShowPolicy(true);
    setReceiptShowWatermark(true);
    setReceiptDividerStyle('dashed');
    setReceiptLogoSize('medium');
    showNotification('Desain struk dikembalikan ke pengaturan standar bawaan.');
  };

  const renderDivider = () => {
    if (receiptDividerStyle === 'dotted') {
      return <div className="my-2 border-b border-dotted border-slate-400" />;
    }
    if (receiptDividerStyle === 'solid') {
      return <div className="my-2 border-b border-slate-900" />;
    }
    if (receiptDividerStyle === 'stars') {
      return (
        <div className="my-2 text-center text-[10px] tracking-widest text-slate-500 select-none overflow-hidden leading-none">
          * * * * * * * * * * *
        </div>
      );
    }
    return <div className="my-2 border-b border-dashed border-slate-400" />;
  };

  const handleSaveReceiptSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerToken) return;
    setIsSavingReceipt(true);

    try {
      const configObj = {
        logoUrl: receiptLogo,
        logoSize: receiptLogoSize,
        tagline: receiptTaglineInput.trim(),
        dividerStyle: receiptDividerStyle,
        showLogo: receiptShowLogo,
        showHeader: receiptShowHeader,
        showTagline: receiptShowTagline,
        showBranch: receiptShowBranch,
        showAddress: receiptShowAddress,
        showPhone: receiptShowPhone,
        showSocial: receiptShowSocial,
        showOrderId: receiptShowOrderId,
        showDateTime: receiptShowDateTime,
        showCashier: receiptShowCashier,
        showKiosk: receiptShowKiosk,
        showNote: receiptShowNote,
        showItems: receiptShowItems,
        showPayment: receiptShowPayment,
        showPassBox: receiptShowPassBox,
        showQr: receiptShowQr,
        showFooter: receiptShowFooter,
        showPolicy: receiptShowPolicy,
        showWatermark: receiptShowWatermark,
      };

      const res = await photoboothApi.updatePartnerProfile(partnerToken, {
        receiptHeader: receiptHeaderInput.trim(),
        receiptFooter: receiptFooterInput.trim(),
        phone: partnerPhoneInput.trim(),
        receiptAddress: receiptAddressInput.trim(),
        receiptSocial: receiptSocialInput.trim(),
        receiptPolicy: receiptPolicyInput.trim(),
        receiptPaperWidth,
        receiptConfig: configObj,
      });

      if (res.success) {
        setPartnerInfo(res.data);
        localStorage.setItem('minja_partner_info', JSON.stringify(res.data));
        showNotification('Format struk thermal kasir & simulator berhasil disimpan!');
      } else {
        showNotification(undefined, res.error?.message || 'Gagal menyimpan format struk.');
      }
    } catch (e: any) {
      showNotification(undefined, e?.message || 'Koneksi gagal');
    } finally {
      setIsSavingReceipt(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <span>Studio Kustomisasi Lengkap Struk Thermal Kasir</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kustomisasi 100% penuh: upload logo bisnis, saklar On/Off untuk setiap elemen struk, format garis, dan simulator visual real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Paper Width Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-semibold px-2">Kertas:</span>
            <button
              type="button"
              onClick={() => setReceiptPaperWidth(58)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                receiptPaperWidth === 58
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              58 mm (Mini)
            </button>
            <button
              type="button"
              onClick={() => setReceiptPaperWidth(80)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                receiptPaperWidth === 80
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              80 mm (POS)
            </button>
          </div>

          {/* Reset to Default Button */}
          <button
            type="button"
            onClick={handleResetReceiptToDefault}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
            title="Kembalikan semua checklist ke standar bawaan"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (Col 7) vs Right Live Simulator (Col 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Form Controls & Full Customization */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSaveReceiptSettings} className="space-y-5">
            {/* CARD 1: LOGO BISNIS & FORMAT VISUAL */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Logo Bisnis & Format Garis</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-400">
                  <input
                    type="checkbox"
                    checked={receiptShowLogo}
                    onChange={(e) => setReceiptShowLogo(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Aktifkan Logo</span>
                </label>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
              />

              {/* Upload & Preview Box */}
              {receiptLogo ? (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-white p-2 flex items-center justify-center border border-slate-300 shadow-inner">
                      <img
                        src={receiptLogo}
                        alt="Logo Struk"
                        className="max-h-full max-w-full object-contain filter grayscale contrast-150"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Logo Terpasang</span>
                      <span className="text-[11px] text-emerald-400 font-medium">Tampil di bagian atas struk thermal</span>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-slate-400">Ukuran:</span>
                        {(['small', 'medium', 'large'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setReceiptLogoSize(sz)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              receiptLogoSize === sz
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {sz === 'small' ? 'Kecil' : sz === 'medium' ? 'Sedang' : 'Besar'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Ganti Logo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer text-center transition-all group"
                >
                  <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-bold text-slate-300 group-hover:text-white">
                    Klik untuk Mengunggah Logo Struk (PNG / JPEG / WebP)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Maksimal 2MB. Logo otomatis disesuaikan dengan kontras tinggi printer thermal.
                  </p>
                </div>
              )}

              {/* Divider Style Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Gaya Garis Pemisah (Divider Struk):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'dashed', label: 'Putus-putus', sample: '- - - - - -' },
                    { id: 'dotted', label: 'Titik-titik', sample: '• • • • • •' },
                    { id: 'solid', label: 'Garis Lurus', sample: '─────────' },
                    { id: 'stars', label: 'Bintang', sample: '* * * * * *' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setReceiptDividerStyle(d.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        receiptDividerStyle === d.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold shadow-md'
                          : 'bg-slate-800/40 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-mono">{d.sample}</div>
                      <div className="text-[10px] mt-0.5">{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 2: INFORMASI BISNIS & HEADER TEXT */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Identitas Toko & Kontak Cabang</h3>
                </div>
                <span className="text-[11px] text-slate-400">Teks Header Utama</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Nama Toko / Brand Header
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={receiptShowHeader}
                        onChange={(e) => setReceiptShowHeader(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
                      />
                      <span>Tampilkan</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={receiptHeaderInput}
                    onChange={(e) => setReceiptHeaderInput(e.target.value)}
                    placeholder="MINJA PHOTOBOOTH - CABANG ATRIUM"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Slogan / Sub-Header
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={receiptShowTagline}
                        onChange={(e) => setReceiptShowTagline(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
                      />
                      <span>Tampilkan</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={receiptTaglineInput}
                    onChange={(e) => setReceiptTaglineInput(e.target.value)}
                    placeholder="Capture Your Best Moments Instant Studio"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Alamat Lengkap Lokasi Cabang
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={receiptShowAddress}
                        onChange={(e) => setReceiptShowAddress(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
                      />
                      <span>Tampilkan</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={receiptAddressInput}
                    onChange={(e) => setReceiptAddressInput(e.target.value)}
                    placeholder="Lantai 2, Main Atrium Pondok Indah Mall, Jakarta Selatan"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      WhatsApp CS / Kasir
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={receiptShowPhone}
                        onChange={(e) => setReceiptShowPhone(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
                      />
                      <span>Tampilkan</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={partnerPhoneInput}
                    onChange={(e) => setPartnerPhoneInput(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Media Sosial / Website
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={receiptShowSocial}
                        onChange={(e) => setReceiptShowSocial(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
                      />
                      <span>Tampilkan</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={receiptSocialInput}
                    onChange={(e) => setReceiptSocialInput(e.target.value)}
                    placeholder="@minja.photobooth"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* CARD 3: CHECKLIST ON/OFF SEMUA ELEMEN DESAIN STRUK */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Saklar Visibilitas Semua Elemen Struk</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  On / Off Checklist
                </span>
              </div>

              {/* Group 1: Informasi Transaksi */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  1. Metadata & Identitas Transaksi:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Nomor Sesi / Order ID', checked: receiptShowOrderId, setChecked: setReceiptShowOrderId },
                    { label: 'Tanggal & Jam Transaksi', checked: receiptShowDateTime, setChecked: setReceiptShowDateTime },
                    { label: 'Nama Kasir / Operator Shift', checked: receiptShowCashier, setChecked: setReceiptShowCashier },
                    { label: 'Nama & Kode Booth Penugasan', checked: receiptShowKiosk, setChecked: setReceiptShowKiosk },
                    { label: 'Catatan Khusus Pelanggan', checked: receiptShowNote, setChecked: setReceiptShowNote },
                    { label: 'Nama Cabang Mitra Resmi', checked: receiptShowBranch, setChecked: setReceiptShowBranch },
                  ].map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        item.checked
                          ? 'bg-slate-800/60 border-slate-700 text-white font-medium'
                          : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                      }`}
                    >
                      <span className="text-xs">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.setChecked(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 2: Finansial & Produk */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  2. Finansial & Produk Pembelian:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Rincian Paket & Add-On Cetak', checked: receiptShowItems, setChecked: setReceiptShowItems },
                    { label: 'Rincian Pembayaran & Kembalian', checked: receiptShowPayment, setChecked: setReceiptShowPayment },
                    { label: 'Kotak Sorot Kode PASS Tunai', checked: receiptShowPassBox, setChecked: setReceiptShowPassBox },
                    { label: 'QR Code Validasi Transaksi', checked: receiptShowQr, setChecked: setReceiptShowQr },
                  ].map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        item.checked
                          ? 'bg-slate-800/60 border-slate-700 text-white font-medium'
                          : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                      }`}
                    >
                      <span className="text-xs">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.setChecked(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 3: Footer & Kebijakan */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  3. Bagian Bawah & Kebijakan:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Pesan Footer / Ucapan Terima Kasih', checked: receiptShowFooter, setChecked: setReceiptShowFooter },
                    { label: 'Syarat & Kebijakan Komplain', checked: receiptShowPolicy, setChecked: setReceiptShowPolicy },
                    { label: 'Watermark MinjaPhotobooth', checked: receiptShowWatermark, setChecked: setReceiptShowWatermark },
                  ].map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        item.checked
                          ? 'bg-slate-800/60 border-slate-700 text-white font-medium'
                          : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                      }`}
                    >
                      <span className="text-xs">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.setChecked(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 4: PESAN FOOTER & KEBIJAKAN KOMPLAIN */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-400" />
                  <span>Pesan Footer & Syarat Ketentuan</span>
                </h3>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Pesan Footer / Ucapan Pelanggan
                  </label>
                  <textarea
                    rows={2}
                    value={receiptFooterInput}
                    onChange={(e) => setReceiptFooterInput(e.target.value)}
                    placeholder="Terima kasih telah berfoto bersama kami! Tag foto seru kamu di Instagram."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Kebijakan Cetak & Syarat Komplain (Dicetak di Bawah Struk)
                  </label>
                  <textarea
                    rows={2}
                    value={receiptPolicyInput}
                    onChange={(e) => setReceiptPolicyInput(e.target.value)}
                    placeholder="Komplain hasil cetak fisik wajib menyertakan struk ini maksimal 10 menit setelah sesi selesai."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSavingReceipt}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 disabled:opacity-50"
            >
              {isSavingReceipt ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Pengaturan Struk...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Desain Struk & Ukuran Kertas</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right 5 Columns: Live Interactive Physical Thermal Receipt Simulator */}
        <div className="lg:col-span-5 backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Pratinjau Kertas Thermal ({receiptPaperWidth}mm)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Visual live persis seperti cetakan fisik dari printer thermal kasir
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cetak Test</span>
            </button>
          </div>

          {/* Paper Body Mockup */}
          <div
            className={`mx-auto bg-white text-slate-950 p-6 rounded-lg shadow-2xl font-mono text-xs border border-slate-300 select-none transition-all duration-300 ${
              receiptPaperWidth === 58 ? 'max-w-[280px]' : 'max-w-[360px]'
            }`}
            style={{
              filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.45))',
            }}
          >
            {/* Top Logo if Enabled */}
            {receiptShowLogo && receiptLogo && (
              <div className="text-center pb-2">
                <img
                  src={receiptLogo}
                  alt="Logo Struk"
                  className="mx-auto filter grayscale contrast-200"
                  style={{
                    maxWidth:
                      receiptLogoSize === 'small' ? '70px' : receiptLogoSize === 'large' ? '150px' : '100px',
                    maxHeight: '70px',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}

            {/* Paper Header / Store Brand */}
            <div className="text-center pb-2">
              {receiptShowHeader && (
                <p className="font-black text-sm uppercase tracking-wider">
                  {receiptHeaderInput || 'MINJA PHOTOBOOTH'}
                </p>
              )}
              {receiptShowTagline && receiptTaglineInput && (
                <p className="text-[10px] text-slate-600 italic mt-0.5">{receiptTaglineInput}</p>
              )}
              {receiptShowBranch && (
                <p className="text-[10px] text-slate-700 font-bold mt-0.5">
                  {partnerInfo?.name || 'Cabang Resmi Mitra'}
                </p>
              )}
              {receiptShowAddress && receiptAddressInput && (
                <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">{receiptAddressInput}</p>
              )}
              {receiptShowPhone && partnerPhoneInput && (
                <p className="text-[9px] text-slate-600 mt-0.5">WA: {partnerPhoneInput}</p>
              )}
              {receiptShowSocial && receiptSocialInput && (
                <p className="text-[9px] text-slate-600">IG/Web: {receiptSocialInput}</p>
              )}
            </div>

            {/* Divider 1 */}
            {renderDivider()}

            {/* Transaction metadata */}
            <div className="space-y-1 text-[10px]">
              {receiptShowOrderId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">NO. SESI:</span>
                  <span className="font-bold">MJA-20261031-0001</span>
                </div>
              )}
              {receiptShowDateTime && (
                <div className="flex justify-between">
                  <span className="text-slate-500">WAKTU:</span>
                  <span>{new Date().toLocaleDateString('id-ID')} 15:30</span>
                </div>
              )}
              {receiptShowCashier && (
                <div className="flex justify-between">
                  <span className="text-slate-500">KASIR:</span>
                  <span>{myOperators[0]?.name || 'Petugas Kasir Shift'}</span>
                </div>
              )}
              {receiptShowKiosk && (
                <div className="flex justify-between">
                  <span className="text-slate-500">BOOTH:</span>
                  <span>
                    [{myKiosks[0]?.code || 'MJA-01'}] {myKiosks[0]?.name || 'Booth Utama'}
                  </span>
                </div>
              )}
              {receiptShowNote && (
                <div className="flex justify-between">
                  <span className="text-slate-500">CATATAN:</span>
                  <span className="text-slate-800">Meja 03 / Pelanggan</span>
                </div>
              )}
            </div>

            {/* Divider 2 */}
            {receiptShowItems && renderDivider()}

            {/* Items list */}
            {receiptShowItems && (
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>1x Sesi Foto Bestie</span>
                  <span>Rp 45.000</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>+ 1 Lembar Cetak Ekstra</span>
                  <span>Rp 15.000</span>
                </div>
                <div className="flex justify-between text-emerald-700 text-[10px]">
                  <span>Diskon Voucher Promo</span>
                  <span>-Rp 5.000</span>
                </div>
              </div>
            )}

            {/* Divider 3 */}
            {receiptShowPayment && renderDivider()}

            {/* Total calculation */}
            {receiptShowPayment && (
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-black text-sm">
                  <span>TOTAL BAYAR</span>
                  <span>Rp 55.000</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>METODE:</span>
                  <span>TUNAI (KASIR)</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>UANG TUNAI:</span>
                  <span>Rp 60.000</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>KEMBALIAN:</span>
                  <span>Rp 5.000</span>
                </div>
              </div>
            )}

            {/* Cash Pass Highlight Box */}
            {receiptShowPassBox && (
              <div className="my-3 p-2.5 bg-slate-100 border border-dashed border-slate-400 rounded text-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  KODE SESI TUNAI (KETIK DI LAYAR BOOTH)
                </span>
                <div className="text-2xl font-black tracking-widest text-slate-900 mt-1 font-mono">
                  PASS-8921
                </div>
                <span className="text-[8px] text-slate-500 mt-0.5 block">Masa aktif: 24 Jam</span>
              </div>
            )}

            {/* QR Code Validation */}
            {receiptShowQr && (
              <div className="my-2 p-2 text-center border-t border-b border-dashed border-slate-300">
                <div className="w-14 h-14 bg-slate-900 text-white mx-auto flex items-center justify-center rounded">
                  <QrCode className="w-10 h-10" />
                </div>
                <span className="text-[8px] text-slate-400 mt-1 block">Scan untuk Verifikasi Transaksi</span>
              </div>
            )}

            {/* Divider 4 */}
            {renderDivider()}

            {/* Footer message & Policy */}
            <div className="text-center pt-1 text-[10px] text-slate-600 leading-tight space-y-1">
              {receiptShowFooter && (
                <p className="whitespace-pre-line">
                  {receiptFooterInput || 'Terima kasih atas kunjungan Anda!'}
                </p>
              )}
              {receiptShowPolicy && receiptPolicyInput && (
                <p className="text-[8px] text-slate-500 italic mt-1 pt-1 border-t border-dotted border-slate-300 leading-tight">
                  {receiptPolicyInput}
                </p>
              )}
              {receiptShowWatermark && (
                <p className="pt-2 text-[8px] text-slate-400 font-mono">MinjaPhotobooth Enterprise Kiosk V2</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

