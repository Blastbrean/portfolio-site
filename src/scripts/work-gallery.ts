const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
let active: HTMLVideoElement | undefined;
let pending: HTMLElement | undefined;
let engaged: HTMLElement | undefined;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let resize: ResizeObserver | undefined;
let visibility: IntersectionObserver | undefined;
let layoutFrame: number | undefined;

const cardFor = (node: Element | null) => node?.closest<HTMLElement>('[data-work-card]');
const setPreviewState = (video: HTMLVideoElement, playing: boolean) => {
  const card = cardFor(video);
  if (card) card.dataset.previewing = String(playing);
};
const stopPreview = () => {
  if (previewTimer !== undefined) clearTimeout(previewTimer);
  previewTimer = undefined;
  pending = undefined;
  if (engaged) {
    delete engaged.dataset.previewEngaged;
    engaged.querySelector('.gallery-animation')?.removeAttribute('src');
    engaged = undefined;
  }
  const video = active;
  active = undefined;
  if (!video) return;
  setPreviewState(video, false);
  video.pause();
  video.removeAttribute('src');
  video.load();
};
const startPreview = async (card: HTMLElement) => {
  const video = card.querySelector<HTMLVideoElement>('.gallery-preview');
  if (active === video && video) return;
  if (card.dataset.previewMode !== 'hover' || reduced.matches || connection?.saveData || document.documentElement.dataset.motionPaused === 'true') return;
  stopPreview();
  engaged = card;
  card.dataset.previewEngaged = 'true';
  if (!video?.dataset.previewSource) return;
  active = video;
  video.muted = true;
  video.src = video.dataset.previewSource;
  try {
    await video.play();
    if (active === video) setPreviewState(video, true);
  } catch {
    if (active !== video) return;
    // WKWebView can reject WebM even when Safari supports the same codec.
    // Load the original animation only for the currently hovered tile.
    video.pause();
    video.removeAttribute('src');
    video.load();
    active = undefined;
    const fallback = card.querySelector<HTMLImageElement>('.gallery-animation');
    if (fallback && card.dataset.previewImage) fallback.src = card.dataset.previewImage;
  }
};
const schedulePreview = (card: HTMLElement) => {
  if (engaged === card || pending === card) return;
  stopPreview();
  engaged = card;
  card.dataset.previewEngaged = 'true';
  pending = card;
  previewTimer = setTimeout(() => {
    previewTimer = undefined;
    pending = undefined;
    void startPreview(card);
  }, 160);
};
const stopViewer = (dialog: HTMLDialogElement) => {
  dialog.querySelectorAll<HTMLVideoElement>('video').forEach(video => {
    video.pause();
    video.hidden = false;
    video.removeAttribute('src');
    video.querySelectorAll('track').forEach(track => track.removeAttribute('src'));
    video.load();
  });
  dialog.querySelectorAll('.viewer-fallback').forEach(image => image.remove());
  dialog.querySelectorAll<HTMLImageElement>('img[data-viewer-source]').forEach(image => image.removeAttribute('src'));
};
const layout = () => {
  layoutFrame = undefined;
  const gallery = document.querySelector<HTMLElement>('.work-gallery');
  if (!gallery) return;
  const cards = [...gallery.querySelectorAll<HTMLElement>('[data-work-card]')];
  const width = gallery.clientWidth;
  const gap = 12;
  const ratios = cards.map(card => {
    const image = card.querySelector<HTMLImageElement>('.gallery-poster');
    return image ? Number(image.getAttribute('width')) / Number(image.getAttribute('height')) : 4 / 3;
  });
  // Choose rows close to the target height, then share their width by aspect ratio.
  // Every row fills the available space without cropping any image.
  const target = width < 580 ? width : 270;
  const costs = Array(cards.length + 1).fill(Infinity);
  const next = Array(cards.length).fill(0);
  costs[cards.length] = 0;
  for (let start = cards.length - 1; start >= 0; start--) {
    let sum = 0;
    for (let end = start; end < cards.length; end++) {
      if (width < 580 && end > start) break;
      sum += ratios[end];
      const height = (width - gap * (end - start)) / sum;
      if (height <= 0) break;
      const cost = (height - target) ** 2 + costs[end + 1];
      if (cost < costs[start]) { costs[start] = cost; next[start] = end + 1; }
    }
  }
  for (let start = 0; start < cards.length;) {
    const end = next[start];
    const sum = ratios.slice(start, end).reduce((a, b) => a + b, 0);
    for (let i = start; i < end; i++) {
      const share = ratios[i] / sum;
      const value = `calc(${share * 100}% - ${gap * (end - start - 1) * share}px)`;
      if (cards[i].style.width !== value) cards[i].style.width = value;
    }
    start = end;
  }
  gallery.dataset.masonry = 'true';
};
const scheduleLayout = () => {
  if (layoutFrame === undefined) layoutFrame = requestAnimationFrame(layout);
};
const initialize = () => {
  resize?.disconnect();
  visibility?.disconnect();
  const cards = document.querySelectorAll<HTMLElement>('[data-work-card]');
  if (!cards.length) return;
  resize = new ResizeObserver(scheduleLayout);
  visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if ((!entry.isIntersecting || entry.intersectionRatio < 0.1) && (entry.target === engaged || entry.target === pending)) stopPreview();
    }
  }, { threshold: 0.1 });
  cards.forEach(card => {
    card.querySelector('[data-work-open]')?.setAttribute('aria-haspopup', 'dialog');
    visibility!.observe(card);
  });
  resize.observe(document.querySelector('.work-gallery')!);
  layout();
};
document.addEventListener('pointerover', event => {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
  const card = event.target instanceof Element ? cardFor(event.target) : undefined;
  if (card && !(event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) schedulePreview(card);
});
document.addEventListener('pointerout', event => {
  if (event.pointerType === 'touch') return;
  const card = event.target instanceof Element ? cardFor(event.target) : undefined;
  if (card && !(event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) && (engaged === card || pending === card)) stopPreview();
});
document.addEventListener('focusin', event => {
  if (!(event.target instanceof Element) || !event.target.matches('[data-work-open]:focus-visible')) return;
  const card = cardFor(event.target);
  if (card) schedulePreview(card);
});
document.addEventListener('focusout', event => {
  const card = event.target instanceof Element ? cardFor(event.target) : undefined;
  if (card && !(event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) && (engaged === card || pending === card)) stopPreview();
});
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const opener = event.target.closest<HTMLAnchorElement>('[data-work-open]');
  if (opener) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const dialog = document.getElementById(opener.dataset.workOpen!) as HTMLDialogElement | null;
    if (!dialog) return;
    event.preventDefault();
    stopPreview();
    dialog.querySelectorAll<HTMLElement>('[data-viewer-source]').forEach(media => media.setAttribute('src', media.dataset.viewerSource!));
    dialog.querySelectorAll('video').forEach(video => {
      if (video.dataset.viewerPoster) video.poster = video.dataset.viewerPoster;
      video.load();
    });
    dialog.showModal();
    return;
  }
  const closer = event.target.closest('[data-work-close]');
  if (closer) { closer.closest('dialog')?.close(); return; }
  if (event.target instanceof HTMLDialogElement) {
    const bounds = event.target.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
  }
});
document.addEventListener('error', event => {
  const video = event.target;
  if (!(video instanceof HTMLVideoElement) || !video.dataset.viewerFallback || video.hidden || !video.closest('dialog[open]')) return;
  const image = document.createElement('img');
  image.className = 'viewer-fallback';
  image.src = video.dataset.viewerFallback;
  image.alt = video.getAttribute('aria-description') ?? video.getAttribute('aria-label') ?? '';
  video.hidden = true;
  video.after(image);
}, true);
document.addEventListener('close', event => {
  if (event.target instanceof HTMLDialogElement) stopViewer(event.target);
}, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPreview(); });
window.addEventListener('blur', stopPreview);
reduced.addEventListener('change', stopPreview);
connection?.addEventListener('change', () => { if (connection.saveData) stopPreview(); });
let previousPause = document.documentElement.dataset.motionPaused;
new MutationObserver(() => {
  const paused = document.documentElement.dataset.motionPaused;
  if (paused === 'true' && previousPause !== paused) stopPreview();
  previousPause = paused;
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion-paused'] });
document.addEventListener('astro:before-swap', () => {
  stopPreview();
  resize?.disconnect();
  visibility?.disconnect();
  if (layoutFrame !== undefined) cancelAnimationFrame(layoutFrame);
  layoutFrame = undefined;
  document.querySelectorAll<HTMLDialogElement>('.work-viewer[open]').forEach(dialog => { stopViewer(dialog); dialog.close(); });
});
document.addEventListener('astro:page-load', initialize);
initialize();
