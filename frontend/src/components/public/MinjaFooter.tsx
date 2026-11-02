import React from 'react';
import { Instagram, MessageCircle, Mail } from 'lucide-react';

interface FooterProps {
  currentYear?: number;
  emailContact?: string;
  instagramHandle?: string;
  whatsappNumber?: string;
}

export const MinjaFooter: React.FC<FooterProps> = ({
  currentYear = 2026,
  emailContact = 'admin@minja.my.id',
  instagramHandle = 'minjabooth',
  whatsappNumber = '6281234567890',
}) => {
  return (
    <footer className="w-full bg-[#FAF9F6] border-t border-[#E5DFD5] text-[#1F2022] font-sans antialiased transition-colors">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          
          {/* Kolom 1: Identitas & Filosofi Studio (Kiri - 5 Kolom) */}
          <div className="md:col-span-6 lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-widest text-lg font-serif uppercase">
                MINJA
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F2022]" />
              <span className="text-xs uppercase tracking-widest text-[#8C857B] font-medium">
                SELF-SERVE BOOTH
              </span>
            </div>

            <p className="text-sm leading-relaxed text-[#5F5A52] font-serif italic max-w-md">
              &ldquo;Menyimpan kilas tawa, kehangatan momen personal, dan kebersamaan otentik tanpa batasan fotografer. Abadikan cerita Anda dengan sentuhan studio mandiri.&rdquo;
            </p>

            {/* Saluran Kontak & Sosial */}
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-[#5F5A52]">
              <a
                href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 hover:text-[#1F2022] transition-colors"
              >
                <Instagram className="w-4 h-4 text-[#8C857B]" />
                <span>@{instagramHandle.replace('@', '')}</span>
              </a>

              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 hover:text-[#1F2022] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#8C857B]" />
                <span>WhatsApp Minja Resmi</span>
              </a>

              <a
                href={`mailto:${emailContact}`}
                className="flex items-center gap-1.5 hover:text-[#1F2022] transition-colors"
              >
                <Mail className="w-4 h-4 text-[#8C857B]" />
                <span>{emailContact}</span>
              </a>
            </div>
          </div>

          {/* Kolom 2: Navigasi Studio (Tengah - 3 Kolom) */}
          <div className="md:col-span-3 lg:col-span-3 space-y-3">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-[#8C857B]">
              Navigasi Studio
            </h4>
            <ul className="space-y-2.5 text-sm text-[#1F2022]">
              <li>
                <a
                  href="#cerita-kami"
                  className="hover:text-[#8C857B] transition-colors block py-0.5"
                >
                  Tentang Minja
                </a>
              </li>
              <li>
                <a
                  href="#hadirkan-di-acara"
                  className="hover:text-[#8C857B] transition-colors block py-0.5"
                >
                  Sewa Buat Acara
                </a>
              </li>
              <li>
                <a
                  href="#pilihan-bingkai"
                  className="hover:text-[#8C857B] transition-colors block py-0.5"
                >
                  Koleksi Bingkai
                </a>
              </li>
              <li>
                <a
                  href="https://gallery.minja.my.id"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-[#8C857B] transition-colors inline-flex items-center gap-1.5 py-0.5"
                >
                  <span>Galeri Online Tamu</span>
                  <span className="text-[10px] bg-[#E8ECE9] text-[#2D5A43] px-1.5 py-0.5 rounded font-medium">
                    Sesi
                  </span>
                </a>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Jam Operasional & Layanan (Kanan - 4 Kolom) */}
          <div className="md:col-span-3 lg:col-span-4 space-y-3">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-[#8C857B]">
              Jam Operasional
            </h4>
            <div className="space-y-2 text-sm text-[#5F5A52]">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span>Senin &ndash; Kamis</span>
                <span className="font-mono text-[#1F2022]">10.00 &ndash; 21.00 WIB</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span>Jumat &ndash; Minggu</span>
                <span className="font-mono text-[#1F2022]">09.00 &ndash; 22.00 WIB</span>
              </div>
              
              <div className="pt-2 flex items-center gap-2 text-xs text-[#2D5A43]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium">Layanan Sewa Acara 24/7 Terjadwal</span>
              </div>
            </div>
          </div>

        </div>

        {/* Garis Pembatas Bawah */}
        <div className="mt-12 pt-6 border-t border-[#E5DFD5] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8C857B]">
          <p className="order-2 md:order-1 text-center md:text-left">
            &copy; {currentYear} Minja Studio SELF-SERVE BOOTH. Seluruh hak cipta dilindungi.
          </p>

          <div className="order-1 md:order-2 flex flex-wrap items-center justify-center gap-4 text-xs">
            <a
              href={`mailto:${emailContact}`}
              className="hover:text-[#1F2022] transition-colors"
            >
              {emailContact}
            </a>
            <span className="text-[#D3CDC4]">&bull;</span>
            <span className="text-[#5F5A52]">Layanan Tersedia: Jakarta &bull; Bandung &bull; Bali</span>
            <span className="text-[#D3CDC4]">&bull;</span>
            <a
              href="https://minja.my.id"
              className="hover:text-[#1F2022] font-mono transition-colors"
            >
              minja.my.id
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MinjaFooter;
