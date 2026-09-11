import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Decorate the columns-promo block.
 *
 * A promotional two-column layout: a graphic/image on one side and
 * promo text (eyebrow, heading, paragraph with inline link, and a
 * "more" link) on the other. Typically rendered on a dark section band.
 */
export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-promo-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          picWrapper.classList.add('columns-promo-img-col');
        }
      }
      const img = col.querySelector('picture > img');
      if (img) {
        const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
        img.closest('picture').replaceWith(optimized);
      }
    });
  });
}
