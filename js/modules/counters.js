import { prefersReducedMotion } from './accessibility.js';

/** Contatori numerici (rating, cifre brand) che salgono da 0 al valore reale. */
export function initCounters() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const target = parseFloat(el.dataset.countTo);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';

    const render = (value) => {
      el.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
    };

    if (prefersReducedMotion || !gsap) {
      render(target);
      return;
    }

    const counter = { value: 0 };
    const animConfig = {
      value: target,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => render(counter.value),
    };
    if (ScrollTrigger) {
      animConfig.scrollTrigger = { trigger: el, start: 'top 92%', once: true };
    }
    gsap.to(counter, animConfig);
  });
}
