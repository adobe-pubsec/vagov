import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Decorate the cards-benefits block.
 *
 * A responsive grid of repeating items, each with a small colored icon,
 * a linked heading, and a short descriptive paragraph. Converts the
 * authored rows into a semantic <ul>/<li> grid.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-benefits-card-icon';
      } else {
        div.className = 'cards-benefits-card-body';
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '96' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}
