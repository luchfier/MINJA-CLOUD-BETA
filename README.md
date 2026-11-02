# Minja Cloud Platform (MINJA CLOUD BETA)

> **Minja Cloud Ecosystem** — Central Fleet Management, Multi-Portal (Owner, Partner, Operator) & Mobile Web Gallery Engine.

---

## 📌 Ringkasan Eksekutif

**Minja Cloud Platform** adalah platform cloud tersentralisasi berbasis Node.js Fastify dan React 18 (Vite) yang menghubungkan seluruh armada komputer booth fisik (**MinjaPhotobooth Kiosk Appliance**) ke dalam satu ekosistem terpadu.

### 🌐 Aturan Mutlak Domain & Routing (Multi-Domain Architecture)

Platform ini melayani 3 subdomain utama:

1. **`minja.my.id`** — **Landing Page Publik**
   - Menampilkan portofolio studio, paket sewa event/franchise, lokasi booth aktif, dan kontak WhatsApp.
2. **`gallery.minja.my.id`** — **Mobile Web Gallery**
   - Galeri privat hasil sesi pelanggan (berlaku 48 jam).
   - Mendukung download Single Photo Frame, Single Cuts, Live Photo Model A (MP4), dan 1-Click ZIP Download.
3. **`rich.minja.my.id`** — **Subdomain Manajemen Terpadu**
   - **Buka tanpa route (`/`)** -> **Otomatis mengarah ke `/partner`** (Rute Utama Default).
   - **`/partner`** -> Portal Mitra / Franchisee (Manajemen booth cabang, staf kasir, voucher promo, pendapatan & bagi hasil).
   - **`/owner`** -> Panel Super Admin Utama (Pusat kendali armada kiosk, rotasi API key, monitoring global telemetri & finansial).
   - **`/operator`** -> Portal Kasir Lapangan (Penerbitan kode tunai sesi PASS-XXXX, reprint darurat).

---

## 🛠️ Tech Stack

- **Backend API:** Node.js 20 LTS, Fastify 5, TypeScript, Zod, Pino Logger
- **Frontend UI:** React 18, Vite 6, Tailwind CSS, Lucide Icons, Framer Motion
- **Database Utama:** PostgreSQL 16 via Prisma ORM 5/6 (Kompatibel dengan Supabase Pooling & Direct Connection)
- **Object Storage:** Cloudflare R2 / AWS S3 (S3-Compatible Presigned URLs)
- **Process Manager:** PM2 Cluster/Fork (`ecosystem.config.cjs`)
- **Reverse Proxy:** Nginx Multi-Server Blocks + Certbot Let's Encrypt SSL

---

## 🚀 Panduan Deployment di VPS

Panduan deployment otomatis dan manual langkah demi langkah untuk AI Agent dan DevOps di Linux VPS (Ubuntu/Debian) tersedia lengkap di file:

👉 **[`AI_AGENT_VPS_GUIDE.md`](./AI_AGENT_VPS_GUIDE.md)**

### Quick Start (Local Development)

```bash
# 1. Install dependensi
npm run dev

# 2. Build produksi
npm run build

# 3. Sinkronisasi Database
npm run db:push
```

---

## 🔒 Lisensi & Hak Cipta

© 2026 Minja Photobooth Studio. Seluruh hak cipta dilindungi undang-undang.
