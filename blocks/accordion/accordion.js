/*
 * accordion — sidebar "Ask questions" contact accordion.
 * Each authored row is [label, body]; body holds a link list (contact links,
 * phone numbers, audience links, email/social). Rendered as native
 * <details>/<summary> disclosure panels (expand/collapse on click).
 */

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const label = row.children[0];
    const body = row.children[1];
    if (!label) return;

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);

    const details = document.createElement('details');
    details.className = 'accordion-item';

    if (body) {
      body.className = 'accordion-item-body';
      details.append(summary, body);
    } else {
      details.append(summary);
    }
    row.replaceWith(details);
  });
}
