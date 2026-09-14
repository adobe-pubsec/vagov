import { createOptimizedPicture } from '../../scripts/aem.js';

// A single standalone card: optional image + body (heading, text, buttons).
// Like one item of the `cards` block, but the block itself is the card.
export default function decorate(block) {
  [...block.children].forEach((row) => {
    [...row.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'card-image';
      else div.className = 'card-body';
      block.append(div);
    });
    row.remove();
  });

  block.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));

  // Card links are plain underlined links, not buttons. decorateButtons runs
  // first (globally), so revert any button it made inside the card.
  block.querySelectorAll('a.button').forEach((a) => {
    a.classList.remove('button', 'primary', 'secondary', 'accent');
    a.closest('p.button-wrapper')?.classList.remove('button-wrapper');
  });
}
