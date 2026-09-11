/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: VA.gov EDUCATION section breaks + Section Metadata.
 * Inserts <hr> before each non-first section and a Section Metadata block after
 * each section that declares a style, driven by payload.template.sections.
 *
 * Section selectors come from tools/importer/page-templates.json (template
 * "education", DOM-verified during page analysis). The education template has
 * 8 sections (s1..s8):
 *   s1 hero-intro            (first, no style)   -> no break
 *   s2 on-this-page                              -> <hr>
 *   s3 get-gi-bill-benefits                      -> <hr>
 *   s4 manage-benefits                           -> <hr>
 *   s5 more-information                          -> <hr>
 *   s6 other-va-benefits     (style: grey)       -> <hr> + Section Metadata
 *   s7 ask-questions-contact                     -> <hr>
 *   s8 veteran-portraits-band                    -> <hr>
 * Expected: 7 <hr> breaks (sections.length - 1) and 1 Section Metadata block
 * (only s6 carries a style).
 *
 * Breaks are inserted in beforeTransform (while every section element still
 * exists, before block parsers replace them) using a temporary marker; metadata
 * is inserted in afterTransform anchored to that marker. Sections are processed
 * in reverse so live-element inserts never disturb not-yet-processed sections.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors — try each in order, first match wins.
function querySection(root, selectors) {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before parsers can replace any section element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no break, no metadata needed
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched on this page — skip, never guess a replacement

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have now run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to whichever still exists: the
    // marker <hr> placed above, or (first section, no marker inserted) the
    // original element itself.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue; // neither survived — no selector matched post-parse; skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}
