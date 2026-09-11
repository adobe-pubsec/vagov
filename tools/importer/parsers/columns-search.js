/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-search. Base: columns.
 * Source: https://www.va.gov/ (selector: .template-module__JEykya__wrapper)
 * Generated: 2026-09-10
 *
 * Structure (from library-description.txt — "Columns"): flexible column count.
 *   Row 1: block name.
 *   Row 2: one cell per visual column.
 * Source: a two-column module. Left column (columnLeft): "Search" heading,
 * a <va-search-input> widget, "Other search tools" heading, and a list of
 * <va-link-action> items. Right column (columnRight): "Top pages" heading
 * and a list of <va-link> items.
 */
export default function parse(element, { document }) {
  const row = element.querySelector('.vads-grid-row') || element;
  let columns = Array.from(row.querySelectorAll(':scope > div[class*="grid-col"]'));
  if (!columns.length) {
    columns = Array.from(row.querySelectorAll(':scope > div'));
  }

  const rowCells = columns.map((col) => {
    const content = [];
    // Preserve headings, search widget, and link lists in document order.
    const nodes = Array.from(
      col.querySelectorAll('h1, h2, h3, h4, h5, h6, ul, ol, va-search-input, p'),
    );
    // Keep only top-most nodes (drop any nested inside an already-captured node).
    nodes.forEach((node) => {
      if (!nodes.some((other) => other !== node && other.contains(node))) {
        content.push(node);
      }
    });
    return content.length ? content : '';
  }).filter((cell) => cell !== '');

  if (!rowCells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [rowCells];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-search', cells });
  element.replaceWith(block);
}
