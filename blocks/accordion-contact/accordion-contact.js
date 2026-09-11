/*
 * accordion-contact — sidebar "Ask questions" contact accordion.
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
    summary.className = 'accordion-contact-item-label';
    summary.append(...label.childNodes);

    const details = document.createElement('details');
    details.className = 'accordion-contact-item';

    if (body) {
      body.className = 'accordion-contact-item-body';
      details.append(summary, body);
    } else {
      details.append(summary);
    }
    row.replaceWith(details);
  });
}
