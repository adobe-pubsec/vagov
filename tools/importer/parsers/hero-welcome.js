/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-welcome. Base: hero.
 * Source: https://www.va.gov/ (selector: .homepage-hero__wrapper)
 * Generated: 2026-09-10
 *
 * Structure (from library-description.txt — "Hero"): 1 column, up to 3 rows.
 *   Row 1: block name.
 *   Row 2 (optional): background image.
 *   Row 3: content cell (title, subheading, CTA).
 * Source: the homepage hero has no background image. Its content spans two
 * grid columns — left: <h1> welcome headline, <h2> subheading, <p> intro,
 * a <va-link-action> CTA; right: a "create an account" card (<h2>,
 * <va-button>, <va-link>). All static content is collected into the single
 * hero content cell.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Row 2 (optional): background image, if any.
  const bgImage = element.querySelector('img, picture');
  if (bgImage) {
    cells.push([bgImage]);
  }

  // Row 3: content cell — collect headings, paragraphs, and CTA links in
  // document order across both columns.
  const contentCell = [];
  const nodes = Array.from(
    element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, va-link-action, va-link, va-button, a'),
  );
  nodes.forEach((node) => {
    // Skip nodes nested inside another already-considered node (e.g. a link
    // inside a captured paragraph).
    if (!nodes.some((other) => other !== node && other.contains(node))) {
      contentCell.push(node);
    }
  });

  // Empty-block guard.
  if (!contentCell.length && !bgImage) {
    element.replaceWith(...element.childNodes);
    return;
  }

  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-welcome', cells });
  element.replaceWith(block);
}
