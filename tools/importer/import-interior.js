/* eslint-disable */
/* global WebImporter */

// Interior page importer → interior-2-col template.
// Maps a VA.gov interior/hub page (e.g. https://www.va.gov/education/) to the
// authoring our interior-2-col template expects:
//   - page metadata `template: interior-2-col`
//   - a hero section (h1 + intro) with `headline-icon`
//   - the grouped benefit sections stacked in the main column (star dividers
//     and breadcrumbs are added by the template at runtime, not authored here)
//   - a right column (Section: column-2) with the on-page-nav block and the
//     contact accordion

// PARSER IMPORTS
import cardsBenefitsParser from './parsers/cards-benefits.js';
import onPageNavParser from './parsers/on-page-nav.js';
import accordionParser from './parsers/accordion.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/vagov-cleanup.js';
import sectionsTransformer from './transformers/vagov-interior-sections.js';

// PARSER REGISTRY
const parsers = {
  'cards-benefits': cardsBenefitsParser,
  'on-page-nav': onPageNavParser,
  accordion: accordionParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'interior-2-col',
  description: 'VA.gov interior/hub page: hero intro with a headline icon, grouped benefit sections in the main column, and a right column with on-page navigation and a contact accordion.',
  urls: [
    'https://www.va.gov/education/',
  ],
  blocks: [
    {
      name: 'cards-benefits',
      instances: [
        '#content article > div:nth-of-type(2)',
        '#content article > div:nth-of-type(3)',
        '#content article > div:nth-of-type(4)',
        '#content article > section',
      ],
    },
    { name: 'on-page-nav', instances: ['va-on-this-page'] },
    { name: 'accordion', instances: ['#hub-rail va-accordion', 'va-accordion'] },
  ],
  sections: [
    { id: 's1', name: 'hero-intro', selector: ['#content article > div:nth-of-type(1)'], metadata: { 'headline-icon': 'school' }, blocks: [], defaultContent: ['#content article > div:nth-of-type(1)'] },
    { id: 's2', name: 'get-gi-bill-benefits', selector: ['#content article > div:nth-of-type(2)'], blocks: ['cards-benefits'], defaultContent: ['#content article > div:nth-of-type(2) > h2'] },
    { id: 's3', name: 'manage-benefits', selector: ['#content article > div:nth-of-type(3)'], blocks: ['cards-benefits'], defaultContent: ['#content article > div:nth-of-type(3) > h2'] },
    { id: 's4', name: 'more-information', selector: ['#content article > div:nth-of-type(4)'], blocks: ['cards-benefits'], defaultContent: ['#content article > div:nth-of-type(4) > h2'] },
    { id: 's5', name: 'other-va-benefits', selector: ['#content article > section'], blocks: ['cards-benefits'], defaultContent: ['#content article > section > h2'] },
    { id: 's6', name: 'right-column', selector: ['#hub-rail'], metadata: { section: 'column-2' }, blocks: ['on-page-nav', 'accordion'], defaultContent: [] },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then section breaks/metadata
const transformers = [cleanupTransformer, sectionsTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        if (seen.has(element)) return; // a later selector already matched this element
        seen.add(element);
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// Co-locate the on-this-page nav with the contact accordion so they form a
// single right-column (#hub-rail) section that becomes Section: column-2.
function assembleRightColumn(document) {
  const onThisPage = document.querySelector('#content va-on-this-page, va-on-this-page');
  const rail = document.querySelector('#hub-rail');
  if (onThisPage && rail) rail.prepend(onThisPage);
}

// Page metadata block carrying the template (interior-2-col) plus title/desc.
function createPageMetadata(main, document) {
  const cells = {};
  const title = document.querySelector('title');
  if (title) cells.Title = title.textContent.replace(/\s*\|.*$/, '').trim();
  const desc = document.querySelector('meta[name="description"]');
  if (desc && desc.content) cells.Description = desc.content.trim();
  cells.Template = 'interior-2-col';
  const block = WebImporter.Blocks.createBlock(document, { name: 'Metadata', cells });
  main.append(block);
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform cleanup + section breaks
    executeTransformers('beforeTransform', main, payload);

    // 2. The hero icon is authored via the `headline-icon` section metadata, so
    // drop the source's inline <va-icon> from the hero to avoid a duplicate.
    document.querySelectorAll('#content article > div:nth-of-type(1) va-icon').forEach((n) => n.remove());

    // 3. Build the single right-column source (#hub-rail = on-this-page + accordion)
    assembleRightColumn(document);

    // 3. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 4. Parse each block (skip elements already replaced by a prior parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 5. afterTransform cleanup + section metadata
    executeTransformers('afterTransform', main, payload);

    // 6. Built-in WebImporter rules + template-carrying page metadata
    createPageMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 7. Sanitized path (root → /index)
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
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
