import { prefersReducedMotion } from './accessibility.js';

/**
 * Accento hero in Canvas 2D: blob a gradiente radiale bordeaux/oro/crema che si
 * muovono con moto pseudo-organico (somma di sinusoidi sfasate), sovrapposti in
 * "screen" per un effetto luminoso simile a un gelato che si scioglie/forma.
 * Nessuna libreria di noise, nessun WebGL: stesso impatto visivo, zero rischio
 * di compatibilità shader. Si ferma fuori viewport e su prefers-reduced-motion
 * disegna un solo frame statico.
 *
 * Nota performance: la morbidezza del fondo NON usa ctx.filter='blur()' —
 * un blur reale ricalcolato ogni frame su un canvas a piena risoluzione è
 * costosissimo (misurato: >4s di Total Blocking Time in audit Lighthouse).
 * Si disegna invece a risoluzione ridotta (RENDER_SCALE) e si lascia che
 * l'upscaling del browser sull'elemento <canvas> produca la sfocatura,
 * praticamente gratis in confronto.
 */
export function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  const hero = canvas?.closest('.hero');
  if (!canvas || !hero) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const RENDER_SCALE = 0.45;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  const blobs = [
    { baseX: 0.26, baseY: 0.38, r: 0.42, color: '110,30,42', speed: 0.00018, phase: 0 },
    { baseX: 0.72, baseY: 0.26, r: 0.32, color: '198,164,104', speed: 0.00024, phase: 2.1 },
    { baseX: 0.56, baseY: 0.7, r: 0.36, color: '147,40,58', speed: 0.0002, phase: 4.2 },
    { baseX: 0.16, baseY: 0.78, r: 0.24, color: '231,218,195', speed: 0.00016, phase: 1.4 },
  ];

  let width = 0;
  let height = 0;
  let rafId = null;
  let isVisible = true;

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const scale = RENDER_SCALE * dpr;
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function drawFrame(time) {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';

    blobs.forEach((blob) => {
      const angle = time * blob.speed + blob.phase;
      const x = (blob.baseX + Math.sin(angle) * 0.06) * width;
      const y = (blob.baseY + Math.cos(angle * 0.8) * 0.06) * height;
      const radius = blob.r * Math.max(width, height);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${blob.color}, 0.55)`);
      gradient.addColorStop(1, `rgba(${blob.color}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(time) {
    drawFrame(time);
    if (isVisible) rafId = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);

  if (prefersReducedMotion) {
    drawFrame(0);
    return;
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && rafId === null) rafId = requestAnimationFrame(loop);
      if (!isVisible && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
    observer.observe(hero);
  }

  rafId = requestAnimationFrame(loop);
}
