/**
 * Decorate the form block.
 *
 * A lightweight signup form: an optional heading (authored above the block
 * or in the first cell), a required email input, and a submit button.
 * The authored table cells provide the field label, placeholder/label text,
 * and the submit button label. Decorates defensively so missing cells fall
 * back to sensible defaults.
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Pull authored text: row order is [label, submit label] when present.
  const cellText = (row) => (row ? row.textContent.trim() : '');
  const fieldLabel = cellText(rows[0]) || 'Email address';
  const submitLabel = cellText(rows[1]) || 'Sign up';

  const form = document.createElement('form');
  form.className = 'form-signup';
  form.setAttribute('novalidate', '');

  const fieldId = 'form-signup-email';

  const label = document.createElement('label');
  label.setAttribute('for', fieldId);
  label.innerHTML = `${fieldLabel} <span class="form-required">(*Required)</span>`;

  const input = document.createElement('input');
  input.type = 'email';
  input.id = fieldId;
  input.name = 'email';
  input.required = true;
  input.autocomplete = 'email';

  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = submitLabel;
  button.className = 'button primary';

  form.append(label, input, button);

  block.textContent = '';
  block.append(form);
}
