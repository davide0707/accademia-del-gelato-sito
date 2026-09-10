import { prefersReducedMotion, hasFineHover } from './accessibility.js';

// Configurazione hover per "linea" — vedi README per la logica di sistema.
// Ogni card gusto riceve lift verticale + tilt 3D con ampiezza/easing propri.
const LINEA_HOVER = {
  creme: { y: -6, tilt: 4, duration: 0.9, ease: 'power2.out' },
  frutta: { y: -9, tilt: 8, duration: 0.5, ease: 'back.out(2.4)' },
  vegani: { y: -5, tilt: 5, duration: 0.6, ease: 'power2.out' },
  'naturalmente-senza': { y: -3, tilt: 2, duration: 0.4, ease: 'power2.out' },
  'puro-zero': { y: -3, tilt: 3, duration: 0.25, ease: 'power1.out' },
  granite: { y: -4, tilt: 5, duration: 0.7, ease: 'sine.out' },
};
const DEFAULT_HOVER = { y: -5, tilt: 4, duration: 0.5, ease: 'power2.out' };

export function initScrollReveal() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;

  if (!gsap) {
    revealWithoutGsap();
    return;
  }
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);

  if (prefersReducedMotion) {
    document.querySelectorAll('.draw-path').forEach((path) => {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
    });
    return;
  }

  splitHeroTitle(gsap, SplitText);
  fadeEyebrow(gsap);
  revealGroups(gsap, ScrollTrigger);
  parallaxElements(gsap, ScrollTrigger);
  drawIcons(gsap, ScrollTrigger);
  animateMappa(gsap, ScrollTrigger);
  if (hasFineHover) tiltGustoCards(gsap);
}

/** Fallback minimo se GSAP non è disponibile: tutto resta semplicemente visibile. */
function revealWithoutGsap() {
  document.querySelectorAll('.draw-path').forEach((path) => {
    path.style.strokeDasharray = 'none';
  });
}

function splitHeroTitle(gsap, SplitText) {
  const el = document.querySelector('[data-split-text]');
  if (!el) return;

  if (!SplitText) {
    gsap.from(el, { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out', delay: 0.2 });
    return;
  }

  // Fraunces è caricato da Google Fonts: aspettiamo che sia pronto prima di
  // splittare, altrimenti SplitText misura la larghezza dei caratteri con il
  // font di fallback e lo swap successivo disallinea leggermente i caratteri.
  const runSplit = () => {
    const split = new SplitText(el, { type: 'words,chars', wordsClass: 'split-word', charsClass: 'split-char' });
    gsap.set(split.chars, { yPercent: 120, opacity: 0 });
    gsap.to(split.chars, {
      yPercent: 0,
      opacity: 1,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.018,
      delay: 0.15,
    });
  };

  if (document.fonts?.ready) {
    document.fonts.ready.then(runSplit);
  } else {
    runSplit();
  }
}

function fadeEyebrow(gsap) {
  document.querySelectorAll('[data-reveal-text]').forEach((el) => {
    gsap.set(el, { opacity: 0, y: 12 });
    gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.1 });
  });
}

/** Reveal a cascata: raggruppa i fratelli data-reveal per animarli con uno stagger comune. */
function revealGroups(gsap, ScrollTrigger) {
  const groups = new Map();
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });

  groups.forEach((elements) => {
    gsap.set(elements, { opacity: 0, y: 28 });
    const animConfig = {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.09,
    };
    if (ScrollTrigger) {
      animConfig.scrollTrigger = { trigger: elements[0], start: 'top 90%' };
    }
    gsap.to(elements, animConfig);
  });
}

function parallaxElements(gsap, ScrollTrigger) {
  if (!ScrollTrigger) return;
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    gsap.to(el, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

function drawIcons(gsap, ScrollTrigger) {
  document.querySelectorAll('.draw-path').forEach((path) => {
    const length = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 100;
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    if (!ScrollTrigger) {
      path.style.strokeDashoffset = '0';
      return;
    }
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.1,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: path, start: 'top 92%' },
    });
  });
}

/**
 * Coreografia d'ingresso della mappa stilizzata: il Duomo si affaccia con un
 * piccolo fade+scale, poi il pin cade dall'alto con un rimbalzo elastico. Le
 * vie e la sagoma del Duomo (.draw-path) sono già gestite da drawIcons(). Il
 * pulse del pin resta un loop CSS indipendente.
 */
function animateMappa(gsap, ScrollTrigger) {
  const mappa = document.querySelector('.mappa-stilizzata');
  if (!mappa) return;

  const duomo = mappa.querySelector('.mappa-stilizzata__duomo');
  const marker = mappa.querySelector('.mappa-stilizzata__marker');
  if (!marker) return;

  if (duomo) gsap.set(duomo, { opacity: 0, scale: 0.85 });
  gsap.set(marker, { opacity: 0, y: -40 });

  const tl = gsap.timeline({
    scrollTrigger: ScrollTrigger ? { trigger: mappa, start: 'top 80%' } : undefined,
  });

  if (duomo) tl.to(duomo, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
  tl.to(marker, { opacity: 1, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.55)' }, duomo ? '-=0.15' : 0);
}

/** Tilt 3D + lift, ampiezza/easing diversi per data-linea (solo desktop hover-capable). */
function tiltGustoCards(gsap) {
  document.querySelectorAll('.gusto-card').forEach((card) => {
    const config = LINEA_HOVER[card.dataset.linea] || DEFAULT_HOVER;

    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: config.y, duration: config.duration, ease: config.ease, overwrite: 'auto' });
    });

    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateX: py * -config.tilt,
        rotateY: px * config.tilt * 1.4,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        y: 0,
        rotateX: 0,
        rotateY: 0,
        duration: config.duration,
        ease: config.ease,
        overwrite: 'auto',
      });
    });
  });
}
