/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsBenefitsParser from './parsers/cards-benefits.js';
import columnsPromoParser from './parsers/columns-promo.js';
import columnsSearchParser from './parsers/columns-search.js';
import formParser from './parsers/form.js';
import heroWelcomeParser from './parsers/hero-welcome.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/vagov-cleanup.js';
import sectionsTransformer from './transformers/vagov-sections.js';

// PARSER REGISTRY
const parsers = {
  'cards-benefits': cardsBenefitsParser,
  'columns-promo': columnsPromoParser,
  'columns-search': columnsSearchParser,
  'form': formParser,
  'hero-welcome': heroWelcomeParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'home',
  description: 'VA.gov homepage: hero welcome, search + top pages, news app promo, benefits card grid, feedback, and email signup.',
  urls: [
    'https://www.va.gov/',
  ],
  blocks: [
    {
      name: 'hero-welcome',
      instances: ['.homepage-hero__wrapper'],
    },
    {
      name: 'columns-search',
      instances: ['.template-module__JEykya__wrapper'],
    },
    {
      name: 'columns-promo',
      instances: ['#content > div.vads-u-background-color--primary-dark'],
    },
    {
      name: 'cards-benefits',
      instances: ['.vads-grid-row.vads-grid-gap-3'],
    },
    {
      name: 'form',
      instances: ['.homepage-email-input'],
    },
  ],
  sections: [
    {
      id: 'rc4c1',
      name: 'hero',
      selector: ['.homepage-hero__wrapper'],
      style: null,
      blocks: ['hero-welcome'],
      defaultContent: [],
    },
    {
      id: 'rc4c2',
      name: 'search-top-pages',
      selector: ['.template-module__JEykya__wrapper'],
      style: null,
      blocks: ['columns-search'],
      defaultContent: [],
    },
    {
      id: 'rc4c3',
      name: 'news-app-promo',
      selector: ['#content > div.vads-u-background-color--primary-dark'],
      style: 'primary-dark',
      blocks: ['columns-promo'],
      defaultContent: [],
    },
    {
      id: 'rc4c4',
      name: 'explore-benefits',
      selector: ['#content > section.vads-grid-container.vads-u-padding--2p5'],
      style: null,
      blocks: ['cards-benefits'],
      defaultContent: ['#content > section.vads-grid-container.vads-u-padding--2p5 > div:nth-of-type(1)'],
    },
    {
      id: 'rc4c5',
      name: 'feedback',
      selector: ['#content > div.vads-grid-container'],
      style: null,
      blocks: [],
      defaultContent: ['#content > div.vads-grid-container'],
    },
    {
      id: 'rc4c6',
      name: 'email-signup',
      selector: ['.homepage-email-update-wrapper'],
      style: 'primary-alt-lightest',
      blocks: ['form'],
      defaultContent: ['#vets-banner-1'],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then section breaks/metadata (afterTransform)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;

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
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path — map homepage root to /index
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
