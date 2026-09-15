// Promo banner: full-bleed green band with a circular image on the left and
// promo text + CTA link on the right. Content-first — author supplies an image
// cell and a text cell (with a link); this lays them out and appends a
// right-angle icon after the link.

export default function decorate(block) {
  const row = block.querySelector(':scope > div');
  const cells = row ? [...row.children] : [...block.children];

  const media = block.querySelector('picture, img');
  const mediaEl = media ? (media.closest('picture') || media) : null;
  // The content cell is whichever cell doesn't hold the media.
  const contentCell = cells.find((c) => !mediaEl || !c.contains(mediaEl)) || cells[0];

  const inner = document.createElement('div');
  inner.className = 'promo-banner-inner';

  if (mediaEl) {
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'promo-banner-media';
    mediaWrap.append(mediaEl);
    inner.append(mediaWrap);
  }

  const content = document.createElement('div');
  content.className = 'promo-banner-content';
  if (contentCell) content.append(...contentCell.childNodes);
  inner.append(content);

  // Right-angle icon after the CTA link (inside it, so it stays clickable and
  // inherits the link colour via currentColor).
  const link = content.querySelector('a[href]');
  if (link) {
    link.classList.add('promo-banner-cta');
    const arrow = document.createElement('span');
    arrow.className = 'promo-banner-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    link.append(arrow);
  }

  block.textContent = '';
  block.append(inner);
}
