// server/src/templates/mobile-gallery/scripts.ts
// Bundle JavaScript Klien: Countdown, Web Share, Lightbox Swipe & Zoom, dan Pemutar Video

import type { SessionGalleryItem } from '../../services/storage.service.js';
import type { AlbumSlideItem } from './types.js';

export function renderGalleryScripts(
  sessionId: string,
  safeBoothName: string,
  expiresAt: string,
  token: string | undefined,
  allDownloadUrls: Array<{ name: string; url: string }>,
  photoFrameItems: SessionGalleryItem[],
  singleCutItems: SessionGalleryItem[]
): string {
  const photoFramesAlbum: AlbumSlideItem[] = photoFrameItems.map((it, idx) => ({
    title: it.fileName.replace(/\.[^/.]+$/, ''),
    subtitle: `FRAME 0${idx + 1} • High-Res Print`,
    url: it.url,
    fallbackUrl: `/storage/galleries/${encodeURIComponent(sessionId)}/${encodeURIComponent(it.fileName)}`,
    downloadUrl: it.downloadUrl || it.url,
    fileName: it.fileName,
  }));

  const singleCutsAlbum: AlbumSlideItem[] = singleCutItems.map((it, idx) => ({
    title: `Cut #${idx + 1}`,
    subtitle: `Foto Mentah Kamera #${idx + 1}`,
    url: it.url,
    fallbackUrl: `/storage/galleries/${encodeURIComponent(sessionId)}/${encodeURIComponent(it.fileName)}`,
    downloadUrl: it.downloadUrl || it.url,
    fileName: it.fileName,
  }));

  return `
  <script>
    const sessionId = ${JSON.stringify(sessionId)};
    const allFilesData = ${JSON.stringify(allDownloadUrls)};
    const frameFilesData = ${JSON.stringify(
      photoFrameItems.map((it) => ({
        name: it.fileName,
        url: it.url,
        fallbackUrl: `/storage/galleries/${encodeURIComponent(sessionId)}/${encodeURIComponent(it.fileName)}`,
        downloadUrl: it.downloadUrl || it.url,
      }))
    )};
    const photoFramesAlbum = ${JSON.stringify(photoFramesAlbum)};
    const singleCutsAlbum = ${JSON.stringify(singleCutsAlbum)};
    const expiryTimestamp = new Date('${expiresAt}').getTime();

    // ==========================================
    // 1. REAL-TIME TICKING COUNTDOWN TIMER
    // ==========================================
    function updateLiveCountdown() {
      const now = Date.now();
      const diffMs = Math.max(0, expiryTimestamp - now);

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const headerText = document.getElementById('header-countdown-text');
      const headerBadge = document.getElementById('header-countdown-badge');
      const bannerLive = document.getElementById('banner-countdown-live');
      const bannerCard = document.getElementById('banner-expiry-card');
      const bannerIcon = document.getElementById('banner-expiry-icon');

      const timeStr = hours + ' Jam : ' + String(minutes).padStart(2, '0') + ' Menit : ' + String(seconds).padStart(2, '0') + ' Detik';
      const shortStr = hours + 'h ' + minutes + 'm ' + seconds + 's';

      if (headerText) headerText.innerText = shortStr;
      if (bannerLive) bannerLive.innerText = 'Sisa Waktu: ' + timeStr;

      // Dynamic color styling based on remaining duration
      if (hours < 6) {
        if (headerBadge) {
          headerBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-700 font-bold text-xs animate-pulse border border-rose-500/30';
        }
        if (bannerCard) {
          bannerCard.className = 'mt-1 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-sm';
        }
        if (bannerIcon) {
          bannerIcon.className = 'material-symbols-outlined text-[20px] text-rose-600 animate-pulse';
        }
      } else if (hours < 24) {
        if (headerBadge) {
          headerBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 font-bold text-xs border border-amber-500/30';
        }
      }

      if (diffMs <= 0) {
        if (headerText) headerText.innerText = 'Kedaluwarsa';
        if (bannerLive) bannerLive.innerText = 'Masa simpan foto telah berakhir';
        clearInterval(countdownTimer);
      }
    }

    const countdownTimer = setInterval(updateLiveCountdown, 1000);
    updateLiveCountdown();

    // ==========================================
    // 2. WEB SHARE API & MULTI-TIER SAVE
    // ==========================================
    async function fetchBlobWithFallback(url, fallbackUrl) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.blob();
      } catch (e) {
        // coba fallback
      }
      if (fallbackUrl) {
        try {
          const resFallback = await fetch(fallbackUrl);
          if (resFallback.ok) return await resFallback.blob();
        } catch (e) {
          // ignore
        }
      }
      throw new Error('Gagal mengunduh berkas');
    }

    async function shareOrSaveItem(url, filename, title) {
      showToast('Menyiapkan file...', 'hourglass_top');
      const fallbackUrl = '/storage/galleries/' + encodeURIComponent(sessionId) + '/' + encodeURIComponent(filename);

      try {
        const blob = await fetchBlobWithFallback(url, fallbackUrl);
        const mimeType = blob.type || (filename.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
        const file = new File([blob], filename, { type: mimeType });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title || '${safeBoothName}',
            text: 'Foto seru dari ${safeBoothName}!',
            files: [file],
          });
          showToast('File siap disimpan / dibagikan!', 'check_circle');
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        console.warn('[WebShare] Gagal share file, beralih ke download langsung:', err);
      }

      // Fallback: Download langsung ke browser
      triggerDownload(filename);
      const dlLink = document.createElement('a');
      dlLink.href = url;
      dlLink.download = filename;
      dlLink.onerror = () => { dlLink.href = fallbackUrl; };
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
    }

    async function shareOrCopyGalleryLink() {
      if (navigator.share) {
        try {
          await navigator.share({
            title: '${safeBoothName} • Gallery Collection',
            text: 'Lihat koleksi foto sesi kita di ${safeBoothName}!',
            url: window.location.href,
          });
          showToast('Tautan galeri berhasil dibagikan!', 'check_circle');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }
      copyGalleryLink();
    }

    function downloadPhotoFramesOnly() {
      if (!frameFilesData || frameFilesData.length === 0) {
        showToast('Tidak ada frame foto untuk diunduh', 'info');
        return;
      }
      showToast('Mengunduh ' + frameFilesData.length + ' foto jadi...', 'photo_library');
      frameFilesData.forEach((item, index) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = item.url;
          a.download = item.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, index * 400);
      });
    }

    // ==========================================
    // 3. TAB CONTROLLER & UTILITIES
    // ==========================================
    function switchStudioTab(tab) {
      const framesPanel = document.getElementById('panel-frames');
      const cutsPanel = document.getElementById('panel-cuts');
      const livePanel = document.getElementById('panel-live');

      const btnFrames = document.getElementById('tab-btn-frames');
      const btnCuts = document.getElementById('tab-btn-cuts');
      const btnLive = document.getElementById('tab-btn-live');

      if (framesPanel) framesPanel.classList.add('hidden');
      if (cutsPanel) cutsPanel.classList.add('hidden');
      if (livePanel) livePanel.classList.add('hidden');

      [btnFrames, btnCuts, btnLive].forEach((btn) => {
        if (!btn) return;
        btn.classList.remove('bg-surface-container-lowest', 'shadow-sm', 'text-primary');
        btn.classList.add('text-on-surface-variant');
        const badge = btn.querySelector('span:last-child');
        if (badge) {
          badge.classList.remove('bg-primary', 'text-on-primary');
          badge.classList.add('bg-surface-container-highest', 'text-on-surface-variant');
        }
      });

      let targetBtn = btnFrames;
      if (tab === 'frames' && framesPanel) {
        framesPanel.classList.remove('hidden');
        targetBtn = btnFrames;
      } else if (tab === 'cuts' && cutsPanel) {
        cutsPanel.classList.remove('hidden');
        targetBtn = btnCuts;
      } else if (tab === 'live' && livePanel) {
        livePanel.classList.remove('hidden');
        targetBtn = btnLive;
      }

      if (targetBtn) {
        targetBtn.classList.remove('text-on-surface-variant');
        targetBtn.classList.add('bg-surface-container-lowest', 'shadow-sm', 'text-primary');
        const activeBadge = targetBtn.querySelector('span:last-child');
        if (activeBadge) {
          activeBadge.classList.remove('bg-surface-container-highest', 'text-on-surface-variant');
          activeBadge.classList.add('bg-primary', 'text-on-primary');
        }
      }
    }

    function showToast(msg, icon = 'check_circle') {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toast-msg');
      const toastIcon = document.getElementById('toast-icon');
      if (!toast || !toastMsg) return;

      toastMsg.innerText = msg;
      if (toastIcon) toastIcon.innerText = icon;

      toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-[-8px]');
      toast.classList.add('opacity-100', 'translate-y-0');

      setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-[-8px]');
      }, 2600);
    }

    function triggerDownload(filename) {
      showToast('Mengunduh: ' + filename, 'file_download');
    }

    function copyGalleryLink() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showToast('Tautan galeri berhasil disalin!', 'link');
        }).catch(() => {
          fallbackCopyText(window.location.href);
        });
      } else {
        fallbackCopyText(window.location.href);
      }
    }

    function fallbackCopyText(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('Tautan galeri berhasil disalin!', 'link');
      } catch (e) {
        showToast('Gagal menyalin tautan.', 'error');
      }
      document.body.removeChild(ta);
    }

    // ==========================================
    // 4. TOUCH SWIPE & ZOOM LIGHTBOX CONTROLLER
    // ==========================================
    let currentAlbum = photoFramesAlbum.length > 0 ? photoFramesAlbum : singleCutsAlbum;
    let currentSlideIndex = 0;
    let isLightboxZoomed = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let lastTapTime = 0;
    let initialPinchDist = 0;
    let isPinching = false;

    function renderLightboxSlide() {
      if (!currentAlbum || currentAlbum.length === 0) return;
      const item = currentAlbum[currentSlideIndex];
      if (!item) return;

      resetLightboxZoom();

      const titleEl = document.getElementById('modal-title');
      const subtitleEl = document.getElementById('modal-subtitle');
      const counterEl = document.getElementById('modal-counter');
      const imgEl = document.getElementById('modal-img');
      const dlBtn = document.getElementById('modal-download-btn');
      const shareBtn = document.getElementById('modal-share-btn');
      const prevBtn = document.getElementById('modal-prev-btn');
      const nextBtn = document.getElementById('modal-next-btn');

      if (titleEl) titleEl.innerText = item.title;
      if (subtitleEl) subtitleEl.innerText = item.subtitle;
      if (counterEl) {
        counterEl.innerText = (currentSlideIndex + 1) + ' / ' + currentAlbum.length;
        counterEl.style.display = currentAlbum.length > 1 ? 'inline-block' : 'none';
      }
      if (imgEl) {
        imgEl.onerror = () => {
          if (item.fallbackUrl && imgEl.src !== window.location.origin + item.fallbackUrl && imgEl.src !== item.fallbackUrl) {
            imgEl.src = item.fallbackUrl;
          }
        };
        imgEl.src = item.url;
        imgEl.alt = item.title;
      }
      if (dlBtn) {
        dlBtn.href = item.downloadUrl || item.url;
        dlBtn.setAttribute('download', item.fileName || item.title);
        dlBtn.onclick = () => triggerDownload(item.fileName || item.title);
      }
      if (shareBtn) {
        shareBtn.onclick = () => shareOrSaveItem(item.url, item.fileName || item.title, item.title);
      }

      const showNav = currentAlbum.length > 1;
      if (prevBtn) prevBtn.style.display = showNav ? 'flex' : 'none';
      if (nextBtn) nextBtn.style.display = showNav ? 'flex' : 'none';
    }

    function goToLightboxSlide(index, event) {
      if (event) {
        event.stopPropagation();
      }
      if (!currentAlbum || index < 0 || index >= currentAlbum.length) return;
      currentSlideIndex = index;
      renderLightboxSlide();
    }

    function prevLightboxSlide(event) {
      if (event) {
        event.stopPropagation();
      }
      if (!currentAlbum || currentAlbum.length <= 1) return;
      currentSlideIndex = (currentSlideIndex - 1 + currentAlbum.length) % currentAlbum.length;
      renderLightboxSlide();
    }

    function nextLightboxSlide(event) {
      if (event) {
        event.stopPropagation();
      }
      if (!currentAlbum || currentAlbum.length <= 1) return;
      currentSlideIndex = (currentSlideIndex + 1) % currentAlbum.length;
      renderLightboxSlide();
    }

    function openLightbox(albumType, startIndex = 0) {
      if (albumType === 'frames') {
        currentAlbum = photoFramesAlbum;
      } else if (albumType === 'cuts') {
        currentAlbum = singleCutsAlbum;
      } else if (Array.isArray(albumType)) {
        currentAlbum = albumType;
      } else {
        currentAlbum = photoFramesAlbum.length > 0 ? photoFramesAlbum : singleCutsAlbum;
      }

      currentSlideIndex = Math.max(0, Math.min(startIndex, Math.max(0, currentAlbum.length - 1)));
      renderLightboxSlide();

      const modal = document.getElementById('preview-modal');
      if (modal) {
        modal.classList.add('is-open');
      }
    }

    function toggleLightboxZoom() {
      const img = document.getElementById('modal-img');
      const icon = document.getElementById('modal-zoom-icon');
      const box = document.getElementById('modal-image-box');
      const helper = document.getElementById('modal-helper-pill');
      if (!img) return;

      isLightboxZoomed = !isLightboxZoomed;
      if (isLightboxZoomed) {
        img.style.transform = 'scale(1.8)';
        if (box) box.style.cursor = 'zoom-out';
        if (icon) icon.innerText = 'zoom_out';
        if (helper) helper.style.opacity = '0';
      } else {
        resetLightboxZoom();
      }
    }

    function resetLightboxZoom() {
      isLightboxZoomed = false;
      const img = document.getElementById('modal-img');
      const icon = document.getElementById('modal-zoom-icon');
      const box = document.getElementById('modal-image-box');
      const helper = document.getElementById('modal-helper-pill');
      if (img) img.style.transform = 'none';
      if (box) box.style.cursor = 'zoom-in';
      if (icon) icon.innerText = 'zoom_in';
      if (helper) helper.style.opacity = '1';
    }

    function closePreviewModal() {
      const modal = document.getElementById('preview-modal');
      if (modal) {
        modal.classList.remove('is-open');
      }
      resetLightboxZoom();
    }

    function previewItem(title, subtitle, imgUrl, downloadUrl, isVideo = false) {
      const foundFrame = photoFramesAlbum.findIndex(it => it.url === imgUrl);
      if (foundFrame !== -1) {
        openLightbox('frames', foundFrame);
        return;
      }
      const foundCut = singleCutsAlbum.findIndex(it => it.url === imgUrl);
      if (foundCut !== -1) {
        openLightbox('cuts', foundCut);
        return;
      }
      currentAlbum = [{
        title: title,
        subtitle: subtitle,
        url: imgUrl,
        fallbackUrl: imgUrl,
        downloadUrl: downloadUrl || imgUrl,
        fileName: title,
      }];
      currentSlideIndex = 0;
      renderLightboxSlide();
      const modal = document.getElementById('preview-modal');
      if (modal) {
        modal.classList.add('is-open');
      }
    }

    // Touch & Click Listeners on Lightbox Viewport
    const modalImageBox = document.getElementById('modal-image-box');
    if (modalImageBox) {
      modalImageBox.addEventListener('click', (e) => {
        toggleLightboxZoom();
      });

      modalImageBox.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          isPinching = true;
          initialPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        } else if (e.touches.length === 1) {
          isPinching = false;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchEndX = touchStartX;
          touchEndY = touchStartY;
        }
      }, { passive: true });

      modalImageBox.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && isPinching) {
          const currentDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (initialPinchDist > 10) {
            const rawScale = currentDist / initialPinchDist;
            const scaleFactor = Math.min(2.4, Math.max(0.9, rawScale));
            const img = document.getElementById('modal-img');
            const icon = document.getElementById('modal-zoom-icon');
            if (img) img.style.transform = 'scale(' + scaleFactor.toFixed(2) + ')';
            if (scaleFactor > 1.15) {
              isLightboxZoomed = true;
              if (icon) icon.innerText = 'zoom_out';
            } else {
              isLightboxZoomed = false;
              if (icon) icon.innerText = 'zoom_in';
            }
          }
        } else if (e.touches.length === 1 && !isPinching) {
          touchEndX = e.touches[0].clientX;
          touchEndY = e.touches[0].clientY;
        }
      }, { passive: true });

      modalImageBox.addEventListener('touchend', (e) => {
        if (isPinching) {
          isPinching = false;
          if (!isLightboxZoomed) {
            resetLightboxZoom();
          }
          return;
        }

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const dist = Math.hypot(diffX, diffY);

        // Check double tap (< 300ms, moved < 15px)
        const now = Date.now();
        if (now - lastTapTime < 300 && dist < 15) {
          toggleLightboxZoom();
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;

        if (isLightboxZoomed) return;

        // Horizontal swipe threshold: 40px
        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX < 0) {
            nextLightboxSlide();
          } else {
            prevLightboxSlide();
          }
        }
      }, { passive: true });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('preview-modal');
      if (!modal || !modal.classList.contains('is-open')) return;

      if (e.key === 'ArrowLeft') {
        prevLightboxSlide();
      } else if (e.key === 'ArrowRight') {
        nextLightboxSlide();
      } else if (e.key === 'Escape') {
        closePreviewModal();
      } else if (e.key === '+' || e.key === '=' || e.key.toLowerCase() === 'z') {
        toggleLightboxZoom();
      }
    });

    // Close modal on clicking outer backdrop or stage padding
    const previewModalEl = document.getElementById('preview-modal');
    if (previewModalEl) {
      previewModalEl.addEventListener('click', (e) => {
        if (e.target === previewModalEl || e.target.id === 'cinema-stage') {
          closePreviewModal();
        }
      });
    }

    // ==========================================
    // 5. AESTHETIC VIDEO PLAYER CONTROLLER
    // ==========================================
    function toggleVideoPlay(videoId) {
      const video = document.getElementById(videoId);
      if (!video) return;
      const idx = videoId.replace('video-player-', '');
      const playBtn = document.getElementById('video-play-btn-' + idx);
      const playIcon = document.getElementById('video-play-icon-' + idx);

      if (video.paused) {
        document.querySelectorAll('video').forEach((v) => {
          if (v !== video && !v.paused) {
            v.pause();
            const oIdx = v.id.replace('video-player-', '');
            const oBtn = document.getElementById('video-play-btn-' + oIdx);
            const oIcon = document.getElementById('video-play-icon-' + oIdx);
            if (oBtn) oBtn.classList.remove('opacity-0', 'pointer-events-none');
            if (oIcon) oIcon.innerText = 'play_arrow';
          }
        });

        video.play().then(() => {
          if (playBtn) playBtn.classList.add('opacity-0', 'pointer-events-none');
          if (playIcon) playIcon.innerText = 'pause';
        }).catch((err) => {
          console.warn('Playback error / autoplay restricted:', err);
        });
      } else {
        video.pause();
        if (playBtn) playBtn.classList.remove('opacity-0', 'pointer-events-none');
        if (playIcon) playIcon.innerText = 'play_arrow';
      }
    }

    function toggleVideoAudio(videoId, btnEl) {
      const video = document.getElementById(videoId);
      if (!video) return;
      const icon = btnEl.querySelector('span');

      video.muted = !video.muted;
      if (video.muted) {
        if (icon) icon.innerText = 'volume_off';
        showToast('Suara video dinonaktifkan', 'volume_off');
      } else {
        if (icon) icon.innerText = 'volume_up';
        showToast('Suara video diaktifkan', 'volume_up');
      }
    }

    function initVideoProgress() {
      document.querySelectorAll('video[id^="video-player-"]').forEach((video) => {
        const idx = video.id.replace('video-player-', '');
        const progressBar = document.getElementById('video-progress-' + idx);
        const playBtn = document.getElementById('video-play-btn-' + idx);
        const playIcon = document.getElementById('video-play-icon-' + idx);

        video.addEventListener('timeupdate', () => {
          if (progressBar && video.duration) {
            const pct = (video.currentTime / video.duration) * 100;
            progressBar.style.width = pct + '%';
          }
        });

        video.addEventListener('ended', () => {
          if (playBtn) playBtn.classList.remove('opacity-0', 'pointer-events-none');
          if (playIcon) playIcon.innerText = 'play_arrow';
        });

        video.addEventListener('pause', () => {
          if (playBtn) playBtn.classList.remove('opacity-0', 'pointer-events-none');
          if (playIcon) playIcon.innerText = 'play_arrow';
        });

        video.addEventListener('play', () => {
          if (playBtn) playBtn.classList.add('opacity-0', 'pointer-events-none');
          if (playIcon) playIcon.innerText = 'pause';
        });
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVideoProgress);
    } else {
      initVideoProgress();
    }

    // ==========================================
    // 6. SOCIAL SHARING & COMMUNITY HELPERS (No Coupon)
    // ==========================================
    function copySocialHandle(handle) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(handle).then(() => {
          showToast('Username ' + handle + ' disalin!', 'check_circle');
        }).catch(() => {
          fallbackCopyText(handle);
        });
      } else {
        fallbackCopyText(handle);
      }
    }

    async function shareToInstagramStory() {
      if (navigator.share) {
        try {
          await navigator.share({
            title: '${safeBoothName} • Story Momen',
            text: 'Cek foto & video seru kita di ${safeBoothName}! Tag @minjaphotobooth #MinjaMoments',
            url: window.location.href,
          });
          showToast('Siap dibagikan ke Story!', 'check_circle');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }
      copyGalleryLink();
    }

    function triggerZipDownload() {
      showToast('Menyiapkan dan mengunduh berkas ZIP galeri...', 'folder_zip');
    }

    function downloadAllFiles() {
      const zipUrl = '/api/public/gallery/' + encodeURIComponent(sessionId) + '/download-zip?token=' + encodeURIComponent('${token || ''}');
      showToast('Menyiapkan dan mengunduh berkas ZIP galeri...', 'folder_zip');
      window.location.href = zipUrl;
    }
  </script>
  `;
}

