/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-promo. Base: columns.
 * Source: https://www.va.gov/ (selector: #content > div.vads-u-background-color--primary-dark)
 * Generated: 2026-09-10
 *
 * Structure (from library-description.txt — "Columns"): flexible column count.
 *   Row 1: block name.
 *   Row 2: one cell per visual column.
 * Source: a primary-dark promo band (.homepage-blog) laid out as two columns —
 * an image column (.homepage-blog__image) and a text column containing an
 * eyebrow <h2> ("VA NEWS"), an <h3> title, a <p> with a <va-link>, and a
 * secondary <va-link>.
 */
export default function parse(element, { document }) {
  // The inner grid row holds the visual columns.
  const row = element.querySelector('.vads-grid-row') || element;
  let columns = Array.from(row.querySelectorAll(':scope > div[class*="grid-col"]'));
  if (!columns.length) {
    columns = Array.from(row.querySelectorAll(':scope > div'));
  }

  // Build one cell per column, collecting meaningful content from each.
  const rowCells = columns.map((col) => {
    const content = [];
    const img = col.querySelector('img, picture, va-icon');
    if (img) content.push(img);

    const textNodes = Array.from(col.querySelectorAll('h1, h2, h3, h4, h5, h6, p'));
    content.push(...textNodes);

    // CTA links not already inside a captured paragraph/heading.
    const links = Array.from(col.querySelectorAll('a, va-link'))
      .filter((a) => !content.some((el) => el.contains && el.contains(a)));
    content.push(...links);

    return content.length ? content : '';
  }).filter((cell) => cell !== '');

  // Empty-block guard.
  if (!rowCells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [rowCells];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-promo', cells });
  element.replaceWith(block);
}
