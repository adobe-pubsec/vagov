import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
  readBlockConfig,
  toClassName,
  toCamelCase,
} from './aem.js';
import './datalayer.js';

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // Only bolded links become buttons. A bold link is primary; adding italic
    // (bold + italic) selects the secondary variant.
    const strong = a.closest('strong');
    if (!strong) return;
    const em = a.closest('em');

    p.className = 'button-wrapper';
    a.className = 'button';
    if (em) {
      a.classList.add('secondary');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else {
      a.classList.add('primary');
      strong.replaceWith(a);
    }
  });
}

/**
 * Applies `.section-metadata` blocks as section-level classes/styles.
 *
 * The vendored aem.js `decorateSections` omits the standard section-metadata
 * handling, so a `.section-metadata` block would otherwise render as literal
 * text and be mistaken for a loadable block. This reads each metadata block,
 * applies its keys (e.g. `style: primary-dark` → class `primary-dark`) to the
 * parent section, then removes the metadata block. Runs before decorateSections.
 * @param {Element} main The main element
 */
function decorateSectionMetadata(main) {
  main.querySelectorAll(':scope > div > div.section-metadata').forEach((metaBlock) => {
    const section = metaBlock.parentElement;
    const meta = readBlockConfig(metaBlock);
    Object.keys(meta).forEach((key) => {
      if (key === 'style') {
        meta.style.split(',').forEach((s) => section.classList.add(toClassName(s.trim())));
      } else {
        section.dataset[toCamelCase(key)] = meta[key];
      }
    });
    metaBlock.remove();
  });
}

/**
 * Adobe Experience Platform Web SDK (alloy) — direct/self-hosted loading per
 * https://www.aem.live/developer/target-integration, used for Target
 * personalization. The instance is named `webSdk` (not `alloy`) so it can
 * coexist with an Adobe Launch-delivered Web SDK instance without both
 * bootstraps fighting over `window.alloy`/`window.__alloyNS`.
 *
 * defaultConsent is 'pending': no data is collected and no decisions are
 * fetched until the consent state resolves (see consent wiring below), so a
 * visitor who has not consented is never tracked.
 */
function initWebSDK(path, config) {
  if (!window.webSdk) {
    // eslint-disable-next-line no-underscore-dangle -- global name expected by alloy.js
    (window.__alloyNS ||= []).push('webSdk');
    window.webSdk = (...args) => new Promise((resolve, reject) => {
      window.setTimeout(() => {
        window.webSdk.q.push([resolve, reject, args]);
      });
    });
    window.webSdk.q = [];
  }
  return new Promise((resolve) => {
    import(path)
      .then(() => window.webSdk('configure', config))
      // Never let a Web SDK load/configure failure hang the page: resolve anyway.
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.warn('[webSdk] load/configure failed, continuing without it:', error);
      })
      .finally(resolve);
  });
}

function toCssSelector(selector) {
  return selector.replace(/(\.\S+)?:eq\((\d+)\)/g, (_, clss, i) => `:nth-child(${Number(i) + 1}${clss ? ` of ${clss}` : ''})`);
}

async function getElementForProposition(proposition) {
  const selector = proposition.data.prehidingSelector
    || toCssSelector(proposition.data.selector);
  return document.querySelector(selector);
}

/**
 * Runs fn() once immediately if blocks/sections are already decorated, then
 * again every time more of them finish decorating asynchronously.
 * @param {Function} fn
 */
function onDecoratedElement(fn) {
  if (document.querySelector('[data-block-status="loaded"],[data-section-status="loaded"]')) {
    fn();
  }
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.target.tagName === 'BODY'
      || m.target.dataset.sectionStatus === 'loaded'
      || m.target.dataset.blockStatus === 'loaded')) {
      fn();
    }
  });
  observer.observe(document.querySelector('main'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-block-status', 'data-section-status'],
  });
  observer.observe(document.querySelector('body'), { childList: true });
}

async function getAndApplyRenderDecisions() {
  // Fetch decisions without auto-rendering, so we can apply them in step with
  // the EDS page-load sequence. webPageDetails.viewName (fed from
  // window.dataLayer.page.name) is what Target uses to resolve the named view.
  const response = await window.webSdk('sendEvent', {
    type: 'web.webpagedetails.pageViews',
    renderDecisions: false,
    xdm: {
      web: {
        webInteraction: { URL: window.location.href, name: document.title },
        webPageDetails: { name: document.title, viewName: window.dataLayer?.page?.name },
      },
    },
  });
  const { propositions } = response;
  onDecoratedElement(async () => {
    const applicable = propositions.filter((p) => p.items.length > 0);
    if (applicable.length === 0) return;
    await window.webSdk('applyPropositions', { propositions: applicable });
    // Drop dom-action items once applied so re-runs don't re-apply them.
    await Promise.all(applicable.map(async (p) => {
      const keepFlags = await Promise.all(p.items.map(async (i) => (
        i.schema !== 'https://ns.adobe.com/personalization/dom-action'
        || !(await getElementForProposition(i))
      )));
      p.items = p.items.filter((_, index) => keepFlags[index]);
    }));
  });
  // Defer display reporting to avoid adding to long tasks.
  window.setTimeout(() => {
    window.webSdk('sendEvent', {
      xdm: {
        eventType: 'decisioning.propositionDisplay',
        _experience: { decisioning: { propositions } },
      },
    });
  });
}

const alloyLoadedPromise = initWebSDK('./alloy.js', {
  datastreamId: '52111c1f-3550-417e-a968-2f17fb6ab876',
  orgId: '0E061E2D61F93F260A495FD6@AdobeOrg',
  defaultConsent: 'pending',
});

// Bridge the site consent decision (dispatched by consent-check.js) to the
// Web SDK. 'in' releases queued events and lets decisions/analytics flow;
// 'out' keeps the SDK from collecting. Fires render decisions once granted.
let renderDecisionsRequested = false;
window.addEventListener('consent.update', ({ detail }) => {
  const collect = detail?.consented ? 'y' : 'n';
  window.webSdk('setConsent', {
    consent: [{
      standard: 'Adobe',
      version: '2.0',
      value: { collect: { val: collect } },
    }],
  });
  if (detail?.consented && !renderDecisionsRequested) {
    renderDecisionsRequested = true;
    alloyLoadedPromise.then(() => getAndApplyRenderDecisions().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('[webSdk] getAndApplyRenderDecisions failed:', error);
    }));
  }
});

/**
 * Splits a section into columns when it has an `item-widths` section-metadata
 * value (e.g. `50,50`). Content is grouped into one column per width; place a
 * `column-separator` block between blocks to mark where each column starts.
 * @param {Element} main The main element
 */
function applySectionItemWidths(main) {
  main.querySelectorAll(':scope > div.section[data-item-widths]').forEach((section) => {
    const widths = section.dataset.itemWidths.split(',').map((w) => w.trim()).filter(Boolean);
    if (widths.length < 2) return;

    const groups = [[]];
    [...section.children].forEach((child) => {
      if (child.querySelector(':scope > .column-separator')) {
        child.remove();
        groups.push([]);
      } else {
        groups[groups.length - 1].push(child);
      }
    });

    const container = document.createElement('div');
    container.className = 'section-columns';
    groups.forEach((group, i) => {
      const column = document.createElement('div');
      column.className = 'section-column';
      if (widths[i]) column.style.setProperty('--section-column-width', `${widths[i]}%`);
      group.forEach((el) => column.append(el));
      container.append(column);
    });
    section.append(container);
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSectionMetadata(main);
  decorateSections(main);
  decorateBlocks(main);
  applySectionItemWidths(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('body > footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  import('./consent-check.js');
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
