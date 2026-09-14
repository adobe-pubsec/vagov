/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion (interior-2-col right column). Base: accordion.
 * Source: https://www.va.gov/education/ (selectors: "#hub-rail va-accordion", "va-accordion")
 * Generated: 2026-09-11
 *
 * Structure (EDS "Accordion" convention + blocks/accordion-contact/metadata.json):
 *   2-column table. Row 1 = block name only.
 *   Each subsequent row = one accordion panel:
 *     cell 1 (title, mandatory)   = the clickable panel label,
 *     cell 2 (content, mandatory) = the panel body (a link list: contact
 *              links, phone numbers, audience links, email/social).
 *   Rendered downstream as native <details>/<summary> disclosure panels.
 *
 * Source: the matched element is a <va-accordion> web component whose direct
 * children are <va-accordion-item> panels. In the hydrated live DOM each item
 * exposes its label via a `header` attribute; the slotted body is one or more
 * <section> blocks (each with an <h3> sub-heading + <ul> of links) or a plain
 * content <div>. Some links are <va-link> custom elements (empty in raw
 * markup, hydrated via the component) — we normalize those to real anchors so
 * the link list survives markdown conversion.
 */
export default function parse(element, { document }) {
  // Direct-child accordion panels. Fall back to any descendant item.
  let items = Array.from(element.querySelectorAll(':scope > va-accordion-item'));
  if (!items.length) {
    items = Array.from(element.querySelectorAll('va-accordion-item'));
  }

  const cells = [];

  items.forEach((item) => {
    // ---- Cell 1: panel label (title, mandatory) -----------------------
    // Prefer the hydrated `header` attribute; otherwise derive from the
    // first heading inside the panel (which we then drop from the body).
    let label = (item.getAttribute('header') || '').trim();
    let labelHeading = null;
    if (!label) {
      labelHeading = item.querySelector('h1, h2, h3, h4, h5, h6');
      if (labelHeading) label = (labelHeading.textContent || '').trim();
    }

    // ---- Cell 2: panel body (content, mandatory) ----------------------
    // Clone the panel's children so we can normalize without touching the
    // live DOM the validator runs against.
    const body = document.createElement('div');
    Array.from(item.childNodes).forEach((node) => {
      body.appendChild(node.cloneNode(true));
    });

    // If the label came from an in-body heading (no `header` attribute),
    // remove the matching heading from the body to avoid duplication.
    if (labelHeading) {
      const clonedHeadings = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const dupe = clonedHeadings.find(
        (h) => (h.textContent || '').trim() === label,
      );
      if (dupe) dupe.remove();
    }

    // Normalize <va-link> custom elements to real anchors so their hrefs
    // and labels are preserved in the markdown link list.
    body.querySelectorAll('va-link').forEach((vl) => {
      const href = vl.getAttribute('href') || '#';
      const text = (vl.textContent || '').trim()
        || vl.getAttribute('text')
        || vl.getAttribute('label')
        || href;
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      vl.replaceWith(a);
    });

    // Collect the meaningful body children for the cell.
    const bodyContent = Array.from(body.childNodes).filter((node) => {
      if (node.nodeType === 3) return (node.textContent || '').trim().length > 0; // text
      return node.nodeType === 1; // element
    });

    // Emit the row only if there is a label or body content. Both cells are
    // mandatory per the convention, so pad any missing cell with ''.
    if (label || bodyContent.length) {
      cells.push([label || '', bodyContent.length ? bodyContent : '']);
    }
  });

  // Empty-block guard: nothing extracted — unwrap in place.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion', cells });
  element.replaceWith(block);
}
