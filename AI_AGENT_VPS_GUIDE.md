# Panduan Operasional & Deployment AI Agent di Linux VPS — Minja Cloud Platform

> **Instruksi untuk AI Agent / DevOps Engineer di VPS:**  
> Dokumen ini adalah panduan langkah-demi-langkah resmi (*standard operating procedure*) untuk menyiapkan, menginstal, mengonfigurasi, dan menjalankan **Minja Cloud Platform** di server Linux VPS (Ubuntu 22.04/24.04 LTS). Ikuti seluruh instruksi secara presisi.

---

## 1. Arsitektur & Aturan Mutlak Domain

Platform ini melayani 3 subdomain utama melalui 1 backend Node.js Fastify terpadu (Port `3000`) dan antarmuka SPA Vite React di folder `frontend/dist`:

| Domain / Subdomain | Target Aplikasi | Keterangan & Aturan |
| :--- | :--- | :--- |
| **`minja.my.id`** | Landing Page Publik | Menampilkan promosi studio, info franchise, lokasi booth, dan tombol CTA. |
| **`gallery.minja.my.id`** | Mobile Web Gallery | Tempat pelanggan mengunduh foto/video (aktif 48 jam) atau memasukkan nomor sesi & PIN. |
| **`rich.minja.my.id`** | Subdomain Management | **Default tanpa route (`/`) OTOMATIS ke `/partner`**.<br/>• `/partner`: Portal Mitra/Franchise.<br/>• `/owner`: Panel Super Admin.<br/>• `/operator`: Portal Kasir Desk. |

> ⚠️ **HUKUM ABSOLUT:** DILARANG membuat subdomain lain seperti `partner.minja.my.id` atau `kasir.minja.my.id`. Seluruh manajemen berpusat di `rich.minja.my.id`!

---

## 2. Prasyarat Sistem VPS (Prerequisites)

Jalankan perintah berikut di terminal Linux VPS untuk memastikan runtime dan tool yang dibutuhkan telah terpasang:

```bash
# 1. Update package repository
sudo apt update && sudo apt upgrade -y

# 2. Pasang utilitas dasar
sudo apt install -y curl wget git unzip nginx certbot python3-certbot-nginx

# 3. Pasang Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi versi (Wajib Node >= 20.0.0)
node -v
npm -v

# 4. Pasang PM2 Process Manager secara global
sudo npm install -g pm2
```

---

## 3. Langkah Instalasi Step-by-Step

### Langkah 3.0: Clone / Update Kode dari GitHub
Gunakan repository resmi **`MINJA-CLOUD-BETA`**:

```bash
# Untuk instalasi baru pertama kali:
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
git clone https://github.com/luchfier/MINJA-CLOUD-BETA.git /var/www/minja-cloud
cd /var/www/minja-cloud

# ATAU untuk update kode yang sudah ada:
cd /var/www/minja-cloud
git pull origin main
```

### Langkah 3.1: Konfigurasi File Environment Server (`server/.env`)
Salin template environment dan sesuaikan dengan kredensial Supabase & Cloudflare R2 Anda:

```bash
cd /var/www/minja-cloud/server
cp .env.example .env
nano .env
```

> 💡 **PENTING:** Kredensial Midtrans (`MIDTRANS_SERVER_KEY`) **TIDAK DIBUTUHKAN** di VPS Cloud. Pemrosesan pembayaran QRIS/Tunai dilakukan langsung oleh unit Kiosk mandiri (`minja-app`). VPS Cloud fokus pada manajemen armada (*fleet*), portal multi-tenant, dan hosting galeri 48 jam.

**Contoh isi `.env` produksi yang valid:**
```ini
# 1. DATABASE UTAMA (PostgreSQL via Supabase / Dedicated Postgres)
# Jika menggunakan Supabase Transaction Pooler (Port 6543) - Sangat direkomendasikan untuk VPS:
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# 2. KEAMANAN & AUTENTIKASI (JWT)
JWT_SECRET="isi_dengan_string_acak_minimal_32_karakter_contoh_openssl_rand_base64_32"
CLOUD_MASTER_KEY="minja_cloud_master_secret_key_change_me"
BOOTH_API_KEY="mja_kiosk_live_master_sync_key"

# 3. RUNTIME & LOGGING
NODE_ENV="production"
PORT=3000
LOG_LEVEL="info"

# 4. DOMAIN PUBLIK GALERI PELANGGAN
GALLERY_BASE_URL="https://gallery.minja.my.id"

# 5. OBJECT STORAGE (Cloudflare R2 / AWS S3 - Penyimpanan Soft File 48 Jam)
S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
S3_ACCESS_KEY="<YOUR_R2_ACCESS_KEY_ID>"
S3_SECRET_KEY="<YOUR_R2_SECRET_ACCESS_KEY>"
S3_BUCKET_NAME="minjaphotobooth"
S3_REGION="auto"
R2_PUBLIC_DOMAIN="https://pub-<HASH>.r2.dev"

# 6. EMAIL DELIVERY SERVICE (Pilih salah satu)
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM="Minja Photobooth <noreply@minja.my.id>"
```

### Langkah 3.3: Install Dependensi & Build
Project telah dilengkapi bundle prebuilt di `dist/`. Namun untuk memastikan binary C++ native (Sharp, Argon2) terkompilasi sesuai arsitektur Linux VPS x64, jalankan install:

```bash
# 1. Install dependensi server
cd /var/www/minja-cloud/server
npm install --production

# 2. Generate Prisma Client & Sinkronkan Skema ke Supabase
npx prisma generate
npx prisma db push

# (Opsional) Jika database masih kosong dan butuh data awal admin:
# npm run prisma:seed
```

*(Catatan: Folder `frontend/dist` telah disertakan siap saji. Jika Anda ingin melakukan build ulang frontend di VPS, jalankan `cd ../frontend && npm install && npm run build`)*.

### Langkah 3.4: Jalankan Backend API dengan PM2
Gunakan file `ecosystem.config.cjs` yang berada di root `/var/www/minja-cloud`:

```bash
cd /var/www/minja-cloud
pm2 start ecosystem.config.cjs

# Simpan state PM2 agar otomatis hidup saat VPS reboot
pm2 save
sudo pm2 startup
```

Periksa status backend:
```bash
pm2 status
curl http://127.0.0.1:3000/health
# Response yang diharapkan: {"status":"ok","service":"minja-cloud-vps",...}
```

---

## 4. Konfigurasi Nginx Reverse Proxy (Multi-Domain)

Buat file konfigurasi Nginx untuk memetakan domain `minja.my.id`, `gallery.minja.my.id`, dan `rich.minja.my.id`:

```bash
sudo nano /etc/nginx/sites-available/minja-cloud
```

Tempelkan konfigurasi berikut:

```nginx
# ==============================================================================
# 1. LANDING PAGE PUBLIK — minja.my.id
# ==============================================================================
server {
    listen 80;
    server_name minja.my.id www.minja.my.id;
    root /var/www/minja-cloud/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Reverse Proxy Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # Static Storage Proxy
    location /storage/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 1d;
        add_header Cache-Control "public, no-transform";
    }

    # Single Page Application Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# ==============================================================================
# 2. MOBILE WEB GALLERY USER — gallery.minja.my.id
# ==============================================================================
server {
    listen 80;
    server_name gallery.minja.my.id;
    root /var/www/minja-cloud/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    location /s/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /storage/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 1d;
        add_header Cache-Control "public, no-transform";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# ==============================================================================
# 3. SUBDOMAIN MANAGEMENT (Partner, Owner, Operator) — rich.minja.my.id
# ==============================================================================
server {
    listen 80;
    server_name rich.minja.my.id;
    root /var/www/minja-cloud/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    location /storage/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 1d;
        add_header Cache-Control "public, no-transform";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/minja-cloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Pemasangan Sertifikat SSL Gratis (HTTPS Certbot)

Jalankan Certbot untuk mengaktifkan HTTPS otomatis pada seluruh subdomain:

```bash
sudo certbot --nginx -d minja.my.id -d www.minja.my.id -d gallery.minja.my.id -d rich.minja.my.id
```
Pilih opsi **Redirect HTTP to HTTPS (Opsi 2)** saat diminta.

---

## 6. Protokol Komunikasi dengan Unit Mesin Kiosk (`minja-app`)

Komputer booth fisik di lokasi gerai / cabang menjalankan aplikasi `minja-app`. Hubungan antara komputer booth fisik dengan VPS ini diatur melalui protokol jaringan berikut:

1. **Heartbeat Telemetri Armada (Tiap 15 Detik):**
   - Kiosk mengirim `POST https://rich.minja.my.id/api/kiosk/heartbeat` dengan header `X-Booth-Key: <BOOTH_API_KEY>`.
   - Mengirim status: kertas tersisa, kesiapan kamera, dan status printer.
   - VPS merespons dengan status kunci booth (`isLocked: boolean`, `lockReason: string`).
2. **Penerbitan & Penebusan Kode Sesi Tunai (PASS-XXXX):**
   - Kasir membuka portal kasir di `https://rich.minja.my.id/operator` dan menekan tombol *Terbitkan Kode PASS*.
   - Kode tersimpan di Supabase dengan status `ACTIVE`.
   - Pelanggan memasukkan kode 4-digit di touchscreen booth fisik (`minja-app`).
   - Sesi foto langsung terbuka dan kode tunai otomatis diubah statusnya menjadi `USED` (anti duplikasi / double-spend).
3. **Pencadangan Soft File & Galeri 48 Jam:**
   - Foto dan video yang diambil di booth fisik otomatis diunggah langsung ke Cloudflare R2 / AWS S3.
   - Pelanggan memindai QR Code di layar booth yang mengarah ke `https://gallery.minja.my.id/s/<SESSION_ID>?token=<TOKEN>`.

---

## 7. Command Cheat Sheet untuk AI Agent di VPS

| Kebutuhan | Perintah Terminal |
| :--- | :--- |
| **Cek Log Backend API** | `pm2 logs minja-cloud` |
| **Restart Backend API** | `pm2 restart minja-cloud` |
| **Cek Pemakaian RAM & CPU** | `pm2 monit` |
| **Cek Log Error Nginx** | `sudo tail -f /var/log/nginx/error.log` |
| **Test Nginx Config** | `sudo nginx -t` |
| **Reload Nginx** | `sudo systemctl reload nginx` |
| **Update Database Schema** | `cd /var/www/minja-cloud/server && npx prisma db push` |
| **Buka Prisma Studio (Web GUI)** | `cd /var/www/minja-cloud/server && npx prisma studio --port 5555` |
