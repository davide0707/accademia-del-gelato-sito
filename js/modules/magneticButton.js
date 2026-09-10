import { hasFineHover } from './accessibility.js';

/** Bottone magnetico: segue leggermente il cursore, con rientro elastico. */
export function initMagneticButtons() {
  if (!hasFineHover) return;
  const gsap = window.gsap;

  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    const strength = 0.35;
    const label = btn.querySelector('span');

    btn.addEventListener('mousemove', (event) => {
      const rect = btn.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * strength;
      const y = (event.clientY - rect.top - rect.height / 2) * strength;

      if (gsap) {
        gsap.to(btn, { x, y, duration: 0.35, ease: 'power2.out' });
        if (label) gsap.to(label, { x: x * 0.4, y: y * 0.4, duration: 0.35, ease: 'power2.out' });
      } else {
        btn.style.transform = `translate(${x}px, ${y}px)`;
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (gsap) {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        if (label) gsap.to(label, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      } else {
        btn.style.transform = 'translate(0, 0)';
      }
    });
  });
}
