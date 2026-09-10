import { prefersReducedMotion } from './accessibility.js';

let lenisInstance = null;

/**
 * Inizializza Lenis per lo smooth scroll con inerzia, sincronizzato con
 * ScrollTrigger tramite gsap.ticker (pattern raccomandato da GSAP/Lenis).
 * Disattivato del tutto su prefers-reduced-motion.
 */
export function initSmoothScroll() {
  if (prefersReducedMotion || typeof window.Lenis === 'undefined') return null;

  lenisInstance = new window.Lenis({
    duration: 1.15,
    smoothWheel: true,
    wheelMultiplier: 1,
  });

  lenisInstance.on('scroll', () => {
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  });

  if (window.gsap) {
    window.gsap.ticker.add((time) => lenisInstance.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  return lenisInstance;
}

/**
 * Scroll verso un target (selettore o elemento), usato da nav e CTA.
 * Usa Lenis quando disponibile, altrimenti scrollIntoView nativo.
 */
export function scrollToTarget(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  if (lenisInstance) {
    lenisInstance.scrollTo(el, { offset: -76, duration: 1.2 });
  } else {
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
}
