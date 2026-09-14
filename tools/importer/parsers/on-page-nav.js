/* eslint-disable */
/* global WebImporter */
/**
 * Parser for on-page-nav (interior-2-col template).
 * Source: https://www.va.gov/education/ (selector: va-on-this-page)
 *
 * The on-page-nav block collects the page's main-content <h2 id> headings at
 * runtime, so the authored block carries no content — just the block name. The
 * source <va-on-this-page> element is replaced by an empty on-page-nav block,
 * which the interior template places in the right column (Section: column-2).
 */
export default function parse(element, { document }) {
  const block = WebImporter.Blocks.createBlock(document, { name: 'on-page-nav', cells: [''] });
  element.replaceWith(block);
}
