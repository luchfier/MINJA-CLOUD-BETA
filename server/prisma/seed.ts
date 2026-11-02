// minja-cloud/server/prisma/seed.ts
// Database seed untuk Minja Cloud Platform
// Membuat data awal: admin, settings, paket contoh, template, dan voucher

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_CONFIG = {
  type: argon2.argon2id as const,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  saltLength: 16,
};

async function main(): Promise<void> {
  console.log('🌱 Seeding database Minja Cloud...\n');

  // 1. Admin (Default PIN: 123456)
  const existingAdmin = await prisma.admin.findFirst();
  if (!existingAdmin) {
    const pinHash = await argon2.hash('123456', ARGON2_CONFIG);
    await prisma.admin.create({
      data: { pinHash },
    });
    console.log('✅ Admin default dibuat (PIN: 123456)');
  } else {
    console.log('⏭️  Admin sudah ada, dilewati');
  }

  // 2. Settings (singleton)
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        boothName: 'MinjaPhotobooth',
        brandTitle: 'Minja Photobooth',
        welcomeText: 'Selamat datang di Minja Photobooth! 📸',
        primaryColor: '#6C5CE7',
        secondaryColor: '#A29BFE',
      },
    });
    console.log('✅ Pengaturan default berhasil dibuat');
  } else {
    console.log('⏭️  Pengaturan sudah ada, dilewati');
  }

  // 3. Paket contoh
  const existingPackages = await prisma.package.count();
  if (existingPackages === 0) {
    await prisma.package.createMany({
      data: [
        {
          name: 'Basic',
          badge: 'Hemat',
          description: '3 foto, 1 cetakan',
          price: 25000,
          durationSeconds: 180,
          maxShots: 5,
          maxSelections: 3,
          defaultPrints: 1,
          additionalPrintPrice: 15000,
          sortOrder: 1,
        },
        {
          name: 'Standard',
          badge: 'Paling Populer',
          description: '5 foto, 2 cetakan',
          price: 35000,
          durationSeconds: 300,
          maxShots: 8,
          maxSelections: 5,
          defaultPrints: 2,
          additionalPrintPrice: 15000,
          sortOrder: 2,
        },
        {
          name: 'Premium',
          badge: 'Best Value',
          description: '10 foto, 3 cetakan + filter premium',
          price: 50000,
          durationSeconds: 600,
          maxShots: 15,
          maxSelections: 10,
          defaultPrints: 3,
          additionalPrintPrice: 15000,
          sortOrder: 3,
        },
      ],
    });
    console.log('✅ 3 paket default dibuat (Basic, Standard, Premium)');
  } else {
    console.log('⏭️  Paket sudah ada, dilewati');
  }

  // 4. Template contoh
  const existingTemplates = await prisma.template.count();
  if (existingTemplates === 0) {
    await prisma.template.createMany({
      data: [
        {
          name: 'Classic 2-Strip',
          thumbnailUrl: '/templates/classic-2strip-thumb.png',
          frameOverlayUrl: '/templates/classic-2strip-overlay.png',
          orientation: 'portrait',
          slotsCount: 2,
          slots: [
            { index: 0, x: 50, y: 50, width: 1100, height: 800, rotation: 0 },
            { index: 1, x: 50, y: 900, width: 1100, height: 800, rotation: 0 },
          ],
        },
        {
          name: 'Modern 4-Grid',
          thumbnailUrl: '/templates/modern-4grid-thumb.png',
          frameOverlayUrl: '/templates/modern-4grid-overlay.png',
          orientation: 'portrait',
          slotsCount: 4,
          slots: [
            { index: 0, x: 50, y: 50, width: 540, height: 400, rotation: 0 },
            { index: 1, x: 610, y: 50, width: 540, height: 400, rotation: 0 },
            { index: 2, x: 50, y: 470, width: 540, height: 400, rotation: 0 },
            { index: 3, x: 610, y: 470, width: 540, height: 400, rotation: 0 },
          ],
        },
      ],
    });
    console.log('✅ 2 template default dibuat (Classic 2-Strip, Modern 4-Grid)');
  } else {
    console.log('⏭️  Template sudah ada, dilewati');
  }

  // 5. Voucher contoh
  const existingVouchers = await prisma.voucher.count();
  if (existingVouchers === 0) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 2);

    await prisma.voucher.createMany({
      data: [
        {
          code: 'MINJA20',
          discountType: 'percentage',
          discountValue: 20,
          maxDiscount: 20000,
          minSpend: 30000,
          usageLimit: 100,
          validUntil: nextYear,
          isActive: true,
        },
        {
          code: 'HEMAT10000',
          discountType: 'fixed',
          discountValue: 10000,
          minSpend: 30000,
          usageLimit: 50,
          validUntil: nextYear,
          isActive: true,
        },
        {
          code: 'DISKON5K',
          discountType: 'fixed',
          discountValue: 5000,
          minSpend: 25000,
          usageLimit: 200,
          validUntil: nextYear,
          isActive: true,
        },
      ],
    });
    console.log('✅ 3 voucher default dibuat (MINJA20, HEMAT10000, DISKON5K)');
  } else {
    console.log('⏭️  Voucher sudah ada, dilewati');
  }

  console.log('\n🎉 Inisialisasi database Minja Cloud selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
