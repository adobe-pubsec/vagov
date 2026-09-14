/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsBenefitsParser from './parsers/cards-benefits.js';
import heroWelcomeParser from './parsers/hero-welcome.js';
import accordionContactParser from './parsers/accordion-contact.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/vagov-cleanup.js';
import sectionsTransformer from './transformers/vagov-education-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-welcome': heroWelcomeParser,
  'cards-benefits': cardsBenefitsParser,
  'accordion-contact': accordionContactParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'education',
  description: 'VA education benefits hub landing page: hero intro, on-this-page anchors, grouped benefit link sections, a grey \'other benefits\' box, and a sidebar contact accordion.',
  urls: [
    'https://www.va.gov/education/',
  ],
  blocks: [
    {
      name: 'hero-welcome',
      instances: ['#content article > div:nth-of-type(1)'],
    },
    {
      name: 'cards-benefits',
      instances: [
        '#content article > div:nth-of-type(2)',
        '#content article > div:nth-of-type(3)',
        '#content article > div:nth-of-type(4)',
        '#content article > section',
      ],
    },
    {
      name: 'accordion-contact',
      instances: ['#hub-rail va-accordion', 'va-accordion'],
    },
  ],
  sections: [
    { id: 's1', name: 'hero-intro', selector: ['#content article > div:nth-of-type(1)'], style: null, blocks: ['hero-welcome'], defaultContent: [] },
    { id: 's2', name: 'on-this-page', selector: ['#content article > va-on-this-page'], style: null, blocks: [], defaultContent: ['#content article > va-on-this-page'] },
    { id: 's3', name: 'get-gi-bill-benefits', selector: ['#content article > div:nth-of-type(2)'], style: null, blocks: ['cards-benefits'], defaultContent: ['#content article > div:nth-of-type(2) > h2'] },
    { id: 's4', name: 'manage-benefits', selector: ['#content article > div:nth-of-type(3)'], style: null, blocks: ['cards-benefits'], defaultContent: ['#content article > div:nth-of-type(3) > h2'] },
    { id: 's5', name: 'more-information', selector: ['#content article > div:nth-of-type(4)'], style: null, blocks: ['cards-benefits'], defaultContent: ['#content article > div:nth-of-type(4) > h2'] },
    { id: 's6', name: 'other-va-benefits', selector: ['#content article > section'], style: 'grey', blocks: ['cards-benefits'], defaultContent: ['#content article > section > h2'] },
    { id: 's7', name: 'ask-questions-contact', selector: ['#hub-rail va-accordion', 'va-accordion'], style: null, blocks: ['accordion-contact'], defaultContent: [] },
    { id: 's8', name: 'veteran-portraits-band', selector: ['#content > div:nth-of-type(2)'], style: null, blocks: [], defaultContent: ['#content > div:nth-of-type(2)'] },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then section breaks/metadata (afterTransform)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

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
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform cleanup
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block (skip elements already replaced by a prior parser)
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

    // 4. afterTransform cleanup + section breaks/metadata
    executeTransformers('afterTransform', main, payload);

    // 5. Built-in WebImporter rules
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path — map root to /index (education is /education/ → /education/index)
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
