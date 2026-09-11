/* eslint-disable */
/* global WebImporter */
/**
 * Parser for form. Base: form (not in library catalog — inferred from source HTML).
 * Source: https://www.va.gov/ (selector: .homepage-email-input)
 * Generated: 2026-09-10
 *
 * Structure: single-column block.
 *   Row 1: block name.
 *   Row 2: one cell holding the form's static content.
 * Source: the selector matches the <va-text-input class="homepage-email-input">
 * inside an email-signup <form id="email-signup-form"> (text input + submit
 * <va-button>). The interactive fields are hydrated web components with no
 * static text; we capture any heading/label/paragraph text and the form
 * controls so the block is preserved.
 */
export default function parse(element, { document }) {
  // The instance selector targets the input; climb to the form / wrapper.
  const container = element.closest('form')
    || element.closest('.email-signup-form')
    || element.closest('.homepage-email-update-wrapper')
    || element.parentElement
    || element;

  const contentCell = [];

  // Clone nodes into the cell — the matched element (va-text-input) is itself
  // one of the captured controls, so referencing live nodes would make the new
  // block contain its own replacement target and break element.replaceWith().

  // Any static text content (headings, labels, paragraphs) describing the form.
  const textNodes = Array.from(
    container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, label'),
  );
  textNodes.forEach((node) => {
    if (!textNodes.some((other) => other !== node && other.contains(node))) {
      contentCell.push(node.cloneNode(true));
    }
  });

  // The interactive form controls (text input + submit button).
  const controls = Array.from(
    container.querySelectorAll('va-text-input, input, va-button, button, va-select, va-checkbox'),
  );
  controls.forEach((ctrl) => {
    if (!controls.some((other) => other !== ctrl && other.contains(ctrl))) {
      contentCell.push(ctrl.cloneNode(true));
    }
  });

  // Empty-block guard.
  if (!contentCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[contentCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'form', cells });
  element.replaceWith(block);
}
