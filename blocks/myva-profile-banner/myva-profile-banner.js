// My VA profile banner — a full-bleed band showing the signed-in user's name,
// service branch (with its seal) and disability rating. All data comes from the
// user's row in /sign-in/users.json (via auth.js). Authored content is empty.

import { getUser, findUserById } from '../../scripts/auth.js';

// branch value → full display name
const BRANCH_NAMES = {
  army: 'United States Army',
  navy: 'United States Navy',
  airforce: 'United States Air Force',
  'air force': 'United States Air Force',
  marines: 'United States Marine Corps',
  'marine corps': 'United States Marine Corps',
  'marine-corps': 'United States Marine Corps',
  coastguard: 'United States Coast Guard',
  'coast guard': 'United States Coast Guard',
  spaceforce: 'United States Space Force',
  'space force': 'United States Space Force',
};

// branch value → seal file in /icons (only these seals exist today)
const BRANCH_SEALS = {
  army: 'army',
  navy: 'navy',
  airforce: 'airforce',
  'air force': 'airforce',
  marines: 'marines',
  'marine corps': 'marines',
  'marine-corps': 'marines',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export default async function decorate(block) {
  block.textContent = '';

  const user = getUser();
  if (!user) return; // signed out — nothing to show

  const rec = (await findUserById(user.id)) || {};
  const branchKey = (rec.branch || '').trim().toLowerCase();
  const branchName = BRANCH_NAMES[branchKey] || rec.branch || '';
  const seal = BRANCH_SEALS[branchKey];
  const fullName = [rec.firstName || user.firstName, rec.lastName].filter(Boolean).join(' ');

  const inner = el('div', 'myva-profile-inner');

  if (seal) {
    const sealWrap = el('div', 'myva-profile-seal');
    const img = el('img');
    img.src = `${window.hlx.codeBasePath}/icons/${seal}.svg`;
    img.alt = branchName ? `${branchName} seal` : '';
    sealWrap.append(img);
    inner.append(sealWrap);
  }

  const info = el('div', 'myva-profile-info');
  if (fullName) info.append(el('p', 'myva-profile-name', fullName));
  if (branchName) info.append(el('p', 'myva-profile-branch', branchName));
  if (rec.disabilityRating) {
    const rating = el('p', 'myva-profile-rating');
    rating.append('Your disability rating: ');
    const link = el('a', 'myva-profile-rating-link', rec.disabilityRating);
    link.href = rec['disabilityRating-url'] || '#';
    rating.append(link);
    info.append(rating);
  }
  inner.append(info);

  block.append(inner);
}
