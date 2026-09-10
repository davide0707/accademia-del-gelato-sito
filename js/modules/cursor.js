import { hasFineHover, prefersReducedMotion } from './accessibility.js';

/** Cursore custom: punto rigido + anello con inerzia (lerp), disattivato su touch. */
export function initCursor() {
  if (!hasFineHover) return;
  const cursor = document.getElementById('cursore');
  if (!cursor) return;

  const dot = cursor.querySelector('.cursore__punto');
  const ring = cursor.querySelector('.cursore__anello');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    cursor.classList.remove('is-hidden');
  });

  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));

  const interactiveSelector = 'a, button, [role="tab"], input, .gusto-card, [data-magnetic]';
  document.addEventListener('mouseover', (event) => {
    if (event.target.closest(interactiveSelector)) cursor.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (event) => {
    if (event.target.closest(interactiveSelector)) cursor.classList.remove('is-hover');
  });

  const ease = prefersReducedMotion ? 1 : 0.18;
  function animateRing() {
    ringX += (mouseX - ringX) * ease;
    ringY += (mouseY - ringY) * ease;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  }
  requestAnimationFrame(animateRing);
}
