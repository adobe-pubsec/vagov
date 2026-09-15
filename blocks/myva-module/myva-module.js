// My VA module — a dynamic dashboard card list for the signed-in user.
//
// Authored content is just a category name (e.g. "claims"). At runtime we look up
// the authenticated user's id (from auth.js) and fetch their personal sheet
// (/sign-in/users.json?sheet=<id>), then render every row whose `category`
// matches the authored one as a status card.

import { getUser } from '../../scripts/auth.js';

const SHEET_PATH = '/sign-in/users.json';
const sheetCache = new Map();

async function fetchUserSheet(id) {
  if (!sheetCache.has(id)) {
    sheetCache.set(id, fetch(`${SHEET_PATH}?sheet=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => j.data || [])
      .catch(() => []));
  }
  return sheetCache.get(id);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Green check / blue info badge (colored circle + white glyph). Empty → no icon.
function statusIcon(name) {
  if (!name) return null;
  const icon = el('span', `myva-status-icon myva-status-icon-${name}`);
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function buildCard(row) {
  const card = el('div', 'myva-card');

  if (row['pre-title']) card.append(el('p', 'myva-card-pretitle', row['pre-title']));
  if (row.title) card.append(el('h3', 'myva-card-title', row.title));

  if (row.status || row.additional) {
    const statusRow = el('div', 'myva-card-status');
    const icon = statusIcon(row['status-icon']);
    if (icon) statusRow.append(icon);
    const text = el('div', 'myva-status-text');
    if (row.status) text.append(el('p', 'myva-status-line', row.status));
    if (row.additional) text.append(el('p', 'myva-card-additional', row.additional));
    statusRow.append(text);
    card.append(statusRow);
  }

  if (row['link-text']) {
    const link = el('a', 'myva-card-link', row['link-text']);
    link.href = row['link-url'] || '#';
    const arrow = el('span', 'myva-card-arrow');
    arrow.setAttribute('aria-hidden', 'true');
    link.append(arrow);
    card.append(link);
  }

  return card;
}

export default async function decorate(block) {
  const category = (block.textContent || '').trim().toLowerCase();
  block.textContent = '';

  const user = getUser();
  if (!user) {
    block.append(el('p', 'myva-empty', 'Sign in to see your personalized VA information.'));
    return;
  }

  const rows = await fetchUserSheet(user.id);
  const matches = rows.filter((r) => (r.category || '').trim().toLowerCase() === category);
  matches.forEach((row) => block.append(buildCard(row)));
}
