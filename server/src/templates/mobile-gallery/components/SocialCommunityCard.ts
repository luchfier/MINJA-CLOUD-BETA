// server/src/templates/mobile-gallery/components/SocialCommunityCard.ts
// Kartu Komunitas Media Sosial (Tag Instagram Story & TikTok - Tanpa Kupon)

export function renderSocialCommunityCard(safeBoothName: string): string {
  return `
  <!-- Social Story & Branding Community (Aesthetic Callout - No Coupon) -->
  <section class="mt-8 mb-2">
    <div class="p-5 rounded-2xl bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container border border-outline-variant/30 photostrip-shadow flex flex-col gap-3.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <span class="material-symbols-outlined text-[18px]">photo_camera</span>
          </div>
          <div>
            <h4 class="text-sm font-bold text-primary">Bagikan Keseruanmu!</h4>
            <p class="text-[11px] text-on-surface-variant font-medium">Tandai momen terbaikmu di media sosial</p>
          </div>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          Komunitas Minja
        </span>
      </div>

      <p class="text-xs text-on-surface leading-relaxed">
        Unggah foto & video favoritmu dari ${safeBoothName} ke Instagram Story atau TikTok dengan menandai <strong class="text-primary font-semibold">@minjaphotobooth</strong> agar dapat kami repost di sorotan resmi studio!
      </p>

      <div class="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onclick="copySocialHandle('@minjaphotobooth')"
          class="flex-1 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high active:scale-98 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-outline-variant/30 shadow-xs"
          title="Salin username Instagram @minjaphotobooth"
        >
          <span class="material-symbols-outlined text-[16px]">content_copy</span>
          <span>Salin @minjaphotobooth</span>
        </button>
        <button
          type="button"
          onclick="shareToInstagramStory()"
          class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
          title="Bagikan tautan galeri ini ke Story"
        >
          <span class="material-symbols-outlined text-[16px]">ios_share</span>
          <span>Bagikan ke Story</span>
        </button>
      </div>

      <div class="flex items-center justify-center gap-2 pt-0.5 text-[11px] text-on-surface-variant font-mono">
        <span>#MinjaMoments</span>
        <span>•</span>
        <span>#MinjaPhotobooth</span>
        <span>•</span>
        <span>#PhotoboothAesthetic</span>
      </div>
    </div>
  </section>
  `;
}
