import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Decorate the columns-search block.
 *
 * A balanced two-column layout: left column typically holds search tools
 * (heading, search field, action links); right column holds a list of
 * top/quick links. Decorates defensively for any column count.
 */
export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-search-${cols.length}-cols`);

  // setup image columns (if an author places an image alone in a column)
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          picWrapper.classList.add('columns-search-img-col');
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
