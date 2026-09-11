import { createOptimizedPicture } from '../../scripts/aem.js';

// Icons variant: pair the icon glyph (rendered white on a coloured circle via
// CSS) with the title on one row, description below. Handles icons authored as
// EDS icon spans (:name:) or as pictures.
function decorateIconsCards(ul) {
  ul.querySelectorAll(':scope > li').forEach((li) => {
    const cells = [...li.children];
    const iconCell = cells.find((c) => c.querySelector('span.icon, picture, img'));
    const bodyCell = cells.find((c) => c !== iconCell);
    if (!iconCell || !bodyCell) return;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'cards-icon';
    const iconEl = iconCell.querySelector('span.icon, picture, img');
    if (iconEl) iconWrap.append(iconEl);

    const title = bodyCell.querySelector('h1, h2, h3, h4, h5, h6') || bodyCell.querySelector('p');
    const header = document.createElement('div');
    header.className = 'cards-card-header';
    header.append(iconWrap);
    if (title) header.append(title);

    bodyCell.className = 'cards-card-body';
    iconCell.remove();
    li.prepend(header);
  });
}

export default function decorate(block) {
  const iconsVariant = block.classList.contains('icons');

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));

  if (iconsVariant) decorateIconsCards(ul);

  block.replaceChildren(ul);
}
