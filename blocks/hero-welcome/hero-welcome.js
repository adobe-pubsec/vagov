import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Decorate the hero-welcome block.
 *
 * Authored content model (single cell, defensive):
 *   - Eyebrow (h1) — "Welcome to VA.gov"
 *   - Headline (h2) — large serif intro heading
 *   - Intro paragraph(s)
 *   - Optional primary CTA link
 *   - Optional account-card heading (2nd h2) + card copy/button/secondary link
 *
 * Renders a full-bleed banner: intro on the left, an optional boxed
 * account card on the right. The card region begins at the second
 * level-2 heading (the account-creation copy).
 */
export default function decorate(block) {
  // Optimize any images the author placed (e.g. a background/foreground graphic)
  block.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '1600' }]);
    img.closest('picture').replaceWith(optimized);
  });

  // Flatten to the innermost content wrapper that holds the authored elements.
  const firstRow = block.firstElementChild;
  const content = firstRow?.querySelector(':scope > div') || firstRow;
  if (!content) return;

  const nodes = [...content.children];

  // The account card starts at the second <h2> (the "Create an account…" copy).
  const h2s = nodes.filter((n) => n.tagName === 'H2');
  const cardStart = h2s.length >= 2 ? nodes.indexOf(h2s[1]) : -1;

  const mainNodes = cardStart === -1 ? nodes : nodes.slice(0, cardStart);
  const cardNodes = cardStart === -1 ? [] : nodes.slice(cardStart);

  // Build the main (left) region.
  const main = document.createElement('div');
  main.className = 'hero-welcome-main';
  mainNodes.forEach((n) => main.append(n));

  // Mark the eyebrow (first heading) so the rules render around it.
  const eyebrow = main.querySelector('h1, h2, h3');
  if (eyebrow) eyebrow.classList.add('hero-welcome-eyebrow');

  // Rebuild the block.
  block.textContent = '';
  block.append(main);

  if (cardNodes.length) {
    const card = document.createElement('div');
    card.className = 'hero-welcome-card';
    cardNodes.forEach((n) => card.append(n));
    block.append(card);
  } else {
    block.classList.add('hero-welcome-single');
  }
}
