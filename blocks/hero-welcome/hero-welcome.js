import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Decorate the hero-welcome block.
 *
 * Authored as two columns (cells):
 *   1. Intro — eyebrow (h1) + serif headline (h2) + intro copy + optional CTA.
 *   2. Optional account card — heading + primary button + secondary link.
 *
 * Renders a full-bleed navy banner: intro on the left, boxed white card on the
 * right. Omit the second column for a single-column (intro-only) banner.
 */
export default function decorate(block) {
  block.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '1600' }]);
    img.closest('picture').replaceWith(optimized);
  });

  const row = block.firstElementChild;
  const [mainCell, cardCell] = row ? [...row.children] : [];
  if (!mainCell) return;

  block.textContent = '';

  mainCell.className = 'hero-welcome-main';
  const eyebrow = mainCell.querySelector('h1, h2, h3');
  if (eyebrow) eyebrow.classList.add('hero-welcome-eyebrow');
  block.append(mainCell);

  if (cardCell) {
    cardCell.className = 'hero-welcome-card';
    block.append(cardCell);
  } else {
    block.classList.add('hero-welcome-single');
  }
}
