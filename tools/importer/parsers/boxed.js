/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the "boxed" callout. VA.gov has two variants:
 *   - <div class="feature">                  → boxed (feature)  [blue]
 *   - <div class="va-nav-linkslist--related"> → boxed           [gray, default]
 * The box's contents (a heading + prose/list of links) go into a single-cell
 * block. Pass { variant: 'feature' } for the blue variant.
 */
export default function parse(element, { document, variant }) {
  // Normalize <va-link> web components to real anchors so links survive.
  element.querySelectorAll('va-link').forEach((vl) => {
    const a = document.createElement('a');
    a.href = vl.getAttribute('href') || '#';
    a.textContent = (vl.getAttribute('text') || vl.textContent || a.href).trim();
    vl.replaceWith(a);
  });

  const nodes = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol'));
  const cell = nodes.filter((node) => !nodes.some((other) => other !== node && other.contains(node)));

  if (!cell.length) {
    element.remove();
    return;
  }

  const name = variant ? `boxed (${variant})` : 'boxed';
  const block = WebImporter.Blocks.createBlock(document, { name, cells: [[cell]] });
  element.replaceWith(block);
}
