// Structural marker only. Placing it between blocks in a section splits the
// section into columns; widths come from the section's `item-widths` metadata
// (handled in scripts.js). Renders nothing on the live page.
export default function decorate(block) {
  block.setAttribute('aria-hidden', 'true');
}
