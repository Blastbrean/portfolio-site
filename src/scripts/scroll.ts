const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0;
let destination = 0;
let previousTime = 0;
let hideTimer: ReturnType<typeof setTimeout>;
const showScrollbar = () => {
  document.documentElement.dataset.scrollActive = 'true';
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => delete document.documentElement.dataset.scrollActive, 900);
};
const stop = () => {
  cancelAnimationFrame(frame);
  frame = 0;
  previousTime = 0;
};
const animate = (time: number) => {
  const elapsed = previousTime ? Math.min(time - previousTime, 50) : 16;
  previousTime = time;
  const distance = destination - scrollY;
  if (Math.abs(distance) < 0.5) {
    scrollTo({ top: destination, behavior: 'instant' });
    stop();
    return;
  }
  scrollTo({ top: scrollY + distance * (1 - Math.exp(-elapsed / 65)), behavior: 'instant' });
  frame = requestAnimationFrame(animate);
};
window.addEventListener('wheel', event => {
  // Leave trackpads, zoom gestures, horizontal scrolling and nested scrollers native.
  const wheelStep = event.deltaMode !== 0 || (Math.abs(event.deltaY) >= 80 && Number.isInteger(event.deltaY));
  if (!wheelStep || reducedMotion.matches || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { stop(); return; }
  for (let node = event.target instanceof Element ? event.target : null; node && node !== document.body; node = node.parentElement) {
    if (node.matches('dialog, input, textarea, select, [contenteditable="true"]') || (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY))) { stop(); return; }
  }
  const maximum = document.documentElement.scrollHeight - innerHeight;
  if (maximum <= 0) return;
  const multiplier = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? innerHeight : 1;
  const next = Math.max(0, Math.min(maximum, (frame ? destination : scrollY) + event.deltaY * multiplier));
  if (!frame && next === scrollY) return;
  event.preventDefault();
  destination = next;
  showScrollbar();
  if (!frame) frame = requestAnimationFrame(animate);
}, { passive: false });
window.addEventListener('scroll', showScrollbar, { passive: true });
const modalTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>();
document.addEventListener('scroll', event => {
  const modal = event.target;
  if (!(modal instanceof HTMLElement) || !modal.matches('.work-viewer')) return;
  modal.dataset.scrollActive = 'true';
  clearTimeout(modalTimers.get(modal));
  modalTimers.set(modal, setTimeout(() => delete modal.dataset.scrollActive, 900));
}, { capture: true, passive: true });
for (const event of ['pointerdown', 'touchstart', 'keydown', 'blur']) window.addEventListener(event, stop, { passive: true });
reducedMotion.addEventListener('change', stop);
document.addEventListener('astro:before-swap', stop);
document.addEventListener('astro:page-load', () => { stop(); delete document.documentElement.dataset.scrollActive; });
