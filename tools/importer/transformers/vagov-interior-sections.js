/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: interior-2-col section breaks + Section Metadata.
 *
 * Inserts an <hr> before each non-first section and a Section Metadata block
 * for any section that declares metadata, driven by payload.template.sections.
 * Generalizes the education transformer: instead of only a `style`, each
 * section may carry a `metadata` object whose key/values become the Section
 * Metadata rows (e.g. { 'headline-icon': 'school' } on the hero section, or
 * { section: 'column-2' } on the right-column section).
 *
 * Breaks are inserted in beforeTransform (while every section element still
 * exists, before block parsers replace them) using a temporary marker;
 * metadata is inserted in afterTransform anchored to that marker. Sections are
 * processed in reverse so live-element inserts never disturb not-yet-processed
 * sections.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

function querySection(root, selectors) {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

// A section's metadata: prefer an explicit `metadata` object, else fall back to
// a lone `style` (education-style config). Returns null when there is none.
function sectionMetadata(section) {
  if (section.metadata && Object.keys(section.metadata).length) return section.metadata;
  if (section.style) return { style: section.style };
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const meta = sectionMetadata(section);
      if (i === 0 && !meta) continue; // first section: no leading break needed
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched — skip, never guess

      const hr = document.createElement('hr');
      if (meta) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const meta = sectionMetadata(section);
      if (!meta) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: meta,
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}
