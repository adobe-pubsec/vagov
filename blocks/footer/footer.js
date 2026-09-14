// VA.gov footer. Content-first: all copy/links/images come from
// footer.plain.html. This module reads that DOM and lays it out:
// a primary link-column grid, a language-assistance row, the VA.gov logo,
// and a bottom legal/utility link row.

import { createOptimizedPicture } from '../../scripts/aem.js';

/** Fetch the footer fragment. */
async function fetchFooter() {
  const resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const tpl = document.createElement('div');
  tpl.innerHTML = html;
  return tpl;
}

/** A section is the bottom legal row if it is a lone <ul> with no heading. */
function isLegalRow(section) {
  return !section.querySelector('h2') && section.querySelector('ul');
}

/** A section is the promo banner if it is a lone image with no links. */
function isBannerImage(section) {
  return !!section.querySelector('img') && !section.querySelector('a');
}

/** A section is the logo block if it has an image inside a link. */
function hasLogo(section) {
  return !!section.querySelector('a img, p > a');
}

/** A section is the language row if its only heading is "Language assistance". */
function isLanguageRow(section) {
  const h2s = section.querySelectorAll('h2');
  return h2s.length === 1 && /language assistance/i.test(h2s[0].textContent);
}

export default async function fetchAndDecorate(block) {
  const frag = await fetchFooter();
  block.textContent = '';
  if (!frag) return;

  const sections = [...frag.children].filter((c) => c.tagName === 'DIV');

  // Full-bleed promo banner (global, above the navy footer body).
  let bannerWrap = null;

  const footer = document.createElement('div');
  footer.className = 'va-footer';

  // Primary link columns: sections with headings that are not language/logo/legal.
  const columnsWrap = document.createElement('div');
  columnsWrap.className = 'va-footer-columns';

  const bottomWrap = document.createElement('div');
  bottomWrap.className = 'va-footer-bottom';

  sections.forEach((section) => {
    if (isBannerImage(section)) {
      bannerWrap = document.createElement('div');
      bannerWrap.className = 'va-footer-banner';
      const img = section.querySelector('img');
      if (img) {
        // Rebuild the picture at a larger rendition; the fragment's fallback
        // <img> is only 750px wide, too soft for the full-bleed banner.
        bannerWrap.append(createOptimizedPicture(img.src, img.alt, false, [
          { media: '(min-width: 600px)', width: '1250' },
          { width: '750' },
        ]));
      }
      return;
    }
    if (hasLogo(section)) {
      // Logo block → bottom row, left
      const logo = document.createElement('a');
      logo.className = 'va-footer-logo';
      const srcLink = section.querySelector('p > a');
      logo.href = srcLink ? srcLink.getAttribute('href') : '/';
      const img = section.querySelector('img');
      if (img) logo.append(img.cloneNode(true));
      logo.setAttribute('aria-label', img ? img.getAttribute('alt') : 'Go to VA.gov');
      bottomWrap.append(logo);
      return;
    }
    if (isLanguageRow(section)) {
      const lang = document.createElement('div');
      lang.className = 'va-footer-language';
      lang.append(...[...section.children].map((c) => c.cloneNode(true)));
      bottomWrap.append(lang);
      return;
    }
    if (isLegalRow(section)) {
      const legal = document.createElement('div');
      legal.className = 'va-footer-legal';
      const ul = section.querySelector('ul');
      legal.append(ul.cloneNode(true));
      bottomWrap.append(legal);
      return;
    }
    // Otherwise a primary link column (may contain multiple h2+ul pairs)
    const col = document.createElement('div');
    col.className = 'va-footer-column';
    col.append(...[...section.children].map((c) => c.cloneNode(true)));
    columnsWrap.append(col);
  });

  footer.append(columnsWrap);
  footer.append(bottomWrap);
  if (bannerWrap) block.append(bannerWrap);
  block.append(footer);

  // The portraits are cut-outs, so the banner band must sit on the same
  // background as the LAST section of the page it's on (light blue on the
  // homepage, white elsewhere). Read that section's resolved background and
  // apply it to the band so it blends with the page above the navy footer.
  if (bannerWrap) {
    const setBannerBackground = () => {
      const sectionEls = [...document.querySelectorAll('main > .section')];
      const last = sectionEls[sectionEls.length - 1];
      const c = last ? window.getComputedStyle(last).backgroundColor : '';
      // Use the last section's own background; if it's transparent (a plain
      // white page section), fall back to the page background.
      const transparent = !c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
      bannerWrap.style.backgroundColor = transparent
        ? getComputedStyle(document.body).backgroundColor || '#fff'
        : c;
    };
    setBannerBackground();
  }

  // Mobile accordion: each heading toggles its following list(s).
  // On desktop the CSS keeps everything expanded regardless of state.
  const mobile = window.matchMedia('(max-width: 899px)');
  footer.querySelectorAll('.va-footer-column h2, .va-footer-language h2').forEach((h) => {
    h.setAttribute('role', 'button');
    h.setAttribute('tabindex', '0');
    h.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      if (!mobile.matches) return;
      const open = h.classList.toggle('open');
      h.setAttribute('aria-expanded', String(open));
    };
    h.addEventListener('click', toggle);
    h.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  // Reset accordion state when crossing to desktop.
  mobile.addEventListener('change', () => {
    footer.querySelectorAll('[aria-expanded]').forEach((h) => {
      h.classList.remove('open');
      h.setAttribute('aria-expanded', 'false');
    });
  });
}
