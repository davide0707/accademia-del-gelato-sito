/** Pausa il marquee recensioni su hover (CSS), focus tastiera e fuori viewport. */
export function initReviewsMarquee() {
  const marquee = document.querySelector('[data-reviews-marquee]');
  if (!marquee) return;

  marquee.addEventListener('focusin', () => marquee.classList.add('is-paused'));
  marquee.addEventListener('focusout', () => marquee.classList.remove('is-paused'));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      marquee.classList.toggle('is-paused', !entry.isIntersecting);
    });
    observer.observe(marquee);
  }
}
