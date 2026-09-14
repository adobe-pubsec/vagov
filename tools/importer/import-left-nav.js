/* eslint-disable */
/* global WebImporter */

// Interior left-nav page importer → interior-left-nav template.
// These pages are almost entirely default content (h1 + prose + h2 sections),
// so this importer just cleans up the site chrome, drops the right rail /
// secondary nav (the left nav is built by the template at runtime), and writes
// the page metadata (template + the hub section title/icon).

import cleanupTransformer from './transformers/vagov-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'interior-left-nav',
  description: 'VA.gov interior page with a section left-nav rail and a wide content column. Content is default content; the left nav is built by the template.',
  urls: [
    'https://www.va.gov/education/about-gi-bill-benefits/',
  ],
};

function runCleanup(hookName, element, payload) {
  try {
    cleanupTransformer.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
  } catch (e) {
    console.error(`Cleanup failed at ${hookName}:`, e);
  }
}

// The hub section title/icon. The side-nav header carries them when present;
// otherwise fall back to the 2nd breadcrumb (the hub section), then a default.
function extractSection(document) {
  const headerEl = document.querySelector('#sidebar_header, .left-side-nav-title h4, va-sidenav h4');
  const iconEl = document.querySelector('.left-side-nav-title va-icon[icon], va-icon.hub-icon[icon]');

  let crumbTitle = '';
  const bc = document.querySelector('va-breadcrumbs[breadcrumb-list]');
  if (bc) {
    try {
      const list = JSON.parse(bc.getAttribute('breadcrumb-list'));
      if (Array.isArray(list) && list.length >= 2) crumbTitle = (list[1].label || '').trim();
    } catch (e) {
      // ignore malformed breadcrumb data
    }
  }

  const title = (headerEl && headerEl.textContent.trim()) || crumbTitle || 'Education and training';
  const icon = (iconEl && iconEl.getAttribute('icon')) || 'school';
  return { title, icon };
}

function createPageMetadata(main, document, section) {
  const cells = {};
  const title = document.querySelector('title');
  if (title) cells.Title = title.textContent.replace(/\s*\|.*$/, '').trim();
  const desc = document.querySelector('meta[name="description"]');
  if (desc && desc.content) cells.Description = desc.content.trim();
  cells.Template = 'interior-left-nav';
  if (section.title) cells['Section-Title'] = section.title;
  if (section.icon) cells['Section-Icon'] = `:${section.icon}:`;
  const block = WebImporter.Blocks.createBlock(document, { name: 'Metadata', cells });
  main.append(block);
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    // 1. Capture the hub section title/icon from the side-nav (it lives outside
    //    the article, so read it before scoping to the content).
    const section = extractSection(document);

    // 2. Scope to the main article content — the page is a Next.js app, so
    //    exporting the whole <body> would drag in the app shell/nav/scripts.
    //    The side-nav and on-this-page are siblings of <article> and are left
    //    out by scoping here (the left nav is built by the template).
    const main = document.querySelector('#content article')
      || document.querySelector('main article')
      || document.querySelector('article')
      || document.querySelector('main')
      || document.body;

    // 3. Clean up anything non-authorable that lives inside the content.
    runCleanup('beforeTransform', main, payload);
    WebImporter.DOMUtils.remove(main, [
      'va-sidenav',
      'va-on-this-page',
      'va-back-to-top',
      'nav[aria-label="Secondary"]',
    ]);
    runCleanup('afterTransform', main, payload);

    // 4. Metadata (template + section title/icon) and built-in image rules.
    const hr = document.createElement('hr');
    main.appendChild(hr);
    createPageMetadata(main, document, section);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5. Sanitized path (root → /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        sectionTitle: section.title,
        sectionIcon: section.icon,
      },
    }];
  },
};
