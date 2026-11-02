// server/src/templates/mobile-gallery/components/StudioPolicySection.ts
// Kebijakan Privasi & Garansi Keamanan Penyimpanan Soft File 48 Jam

export function renderStudioPolicySection(): string {
  return `
  <!-- Studio Policy & Assurance Section -->
  <section class="mt-8 mb-2">
    <div class="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 flex flex-col gap-1.5">
      <div class="flex items-center gap-1.5 text-primary">
        <span class="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
        <h5 class="text-xs font-bold">Privasi & Penyimpanan Soft File</h5>
      </div>
      <p class="text-[11px] text-on-surface-variant leading-relaxed">
        Demi keamanan dan privasi Anda, file foto dan video dienkripsi dan akan terhapus permanen dari server dalam 48 jam. Pastikan Anda mengunduh seluruh file ke galeri ponsel Anda.
      </p>
    </div>
  </section>
  `;
}

