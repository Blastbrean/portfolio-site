const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let frame: number | undefined;
const update = () => {
  frame = undefined;
  if (reduced.matches) {
    document.documentElement.style.removeProperty('--timeline-shift');
    return;
  }
  if (document.documentElement.dataset.motionPaused === 'true') return;
  if (!document.querySelector('.experience-timeline')) return;
  // Move the colors twice the scroll distance so their motion is clearly visible.
  document.documentElement.style.setProperty('--timeline-shift', `${scrollY * 2}px`);
};
const schedule = () => {
  if (frame === undefined) frame = requestAnimationFrame(update);
};
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
document.addEventListener('astro:page-load', schedule);
reduced.addEventListener('change', schedule);
new MutationObserver(schedule).observe(document.documentElement, {
  attributes: true, attributeFilter: ['data-motion-paused'],
});
schedule();
