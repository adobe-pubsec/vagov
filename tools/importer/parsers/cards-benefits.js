/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-benefits. Base: cards.
 * Source: https://www.va.gov/ (selector: .vads-grid-row.vads-grid-gap-3)
 * Generated: 2026-09-10
 *
 * Structure (from library-description.txt — "Cards"): 2-column table.
 *   Row 1: block name.
 *   Each subsequent row = one card: [icon/image cell, text-content cell].
 * Source: the matched element is a grid row (.vads-grid-row) whose direct
 * children (.tablet-lg:vads-grid-col-4) are individual benefit cards. Each
 * card has a <va-icon> (hub icon), an <h3> wrapping a <va-link> (title/CTA),
 * and a <p> (description).
 */
export default function parse(element, { document }) {
  // Direct-child cards within this grid row. Fall back to any grid-col child.
  let cards = Array.from(element.querySelectorAll(':scope > div[class*="grid-col"]'));
  if (!cards.length) {
    cards = Array.from(element.querySelectorAll(':scope > div'));
  }

  const cells = [];

  cards.forEach((card) => {
    // First cell: icon (or image if present).
    const icon = card.querySelector('va-icon, img, svg, [class*="icon"]');
    const iconCell = icon || '';

    // Second cell: heading (with its link) + description + any standalone CTA.
    const contentCell = [];
    const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) contentCell.push(heading);

    const description = card.querySelector('p');
    if (description) contentCell.push(description);

    // Any CTA link not already inside the heading.
    const ctas = Array.from(card.querySelectorAll(':scope > a, :scope > va-link'))
      .filter((a) => !heading || !heading.contains(a));
    contentCell.push(...ctas);

    // Only add a card row if there is meaningful content.
    if (contentCell.length || icon) {
      cells.push([iconCell, contentCell.length ? contentCell : '']);
    }
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-benefits', cells });
  element.replaceWith(block);
}
