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
  decorateBlock,
  loadBlock,
  readBlockConfig,
  toClassName,
  toCamelCase,
  getMetadata,
} from './aem.js';
import './datalayer.js';
// auth.js lazily imports the fragment block (for the sign-in modal), which imports
// this module — a runtime-safe cycle broken by that dynamic import.
// eslint-disable-next-line import/no-cycle
import { getUser, openSignInModal, establishTestUserFromParam } from './auth.js';

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
  main.querySelectorAll('p a[href], li a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const wrapper = a.closest('p, li');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || wrapper.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // Bold → button (primary; bold + italic → secondary), only in a paragraph
    // (the CTA convention). Emphasis → a link with a leading circle-arrow, in
    // paragraphs or lists. Formatting wrappers are unwrapped so the link never
    // renders italic/bold text.
    const strong = a.closest('strong');
    const em = a.closest('em');

    if (strong && wrapper.tagName === 'P') {
      wrapper.className = 'button-wrapper';
      a.className = 'button';
      if (em) {
        a.classList.add('secondary');
        const outer = strong.contains(em) ? strong : em;
        outer.replaceWith(a);
      } else {
        a.classList.add('primary');
        strong.replaceWith(a);
      }
    } else if (em) {
      em.replaceWith(a);
    } else {
      return;
    }

    // Emphasized links get a leading circle-arrow icon matching the link colour.
    if (em) {
      const arrow = document.createElement('span');
      arrow.className = 'cta-arrow';
      a.prepend(arrow);
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
  // eslint-disable-next-line no-console
  console.log('[Target debug] getAndApplyRenderDecisions entry', {
    authenticated: !!getUser(),
    consented: localStorage.getItem('va-consent') === 'accept',
    page: window.location.href,
  });
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
  // eslint-disable-next-line no-console
  console.log('[Target debug] decision response received', {
    propositionCount: propositions.length,
    itemCount: propositions.reduce((sum, proposition) => sum + proposition.items.length, 0),
    authenticated: !!getUser(),
  });
  onDecoratedElement(async () => {
    // eslint-disable-next-line no-console
    console.log('[Target debug] onDecoratedElement fired', {
      authenticated: !!getUser(),
      loadedBlocks: document.querySelectorAll('[data-block-status="loaded"]').length,
      loadedSections: document.querySelectorAll('[data-section-status="loaded"]').length,
    });
    const applicable = propositions.filter((p) => p.items.length > 0);
    // eslint-disable-next-line no-console
    console.log('[Target debug] applicable propositions', {
      count: applicable.length,
      authenticated: !!getUser(),
    });
    if (applicable.length === 0) return;
    // eslint-disable-next-line no-console
    console.log('[Target debug] applyPropositions start', applicable.map((p) => ({
      id: p.id,
      items: p.items.map((item) => ({
        id: item.id,
        schema: item.schema,
        type: item.data?.type,
        selector: item.data?.selector,
      })),
    })));
    try {
      await window.webSdk('applyPropositions', { propositions: applicable });
      // eslint-disable-next-line no-console
      console.log('[Target debug] applyPropositions success', {
        promoBannerPresent: !!document.querySelector('.promo-banner'),
        heroWelcomePresent: !!document.querySelector('.hero-welcome'),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Target debug] applyPropositions failed', error);
    }
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

// AEP Demo System enrichment. Every Experience Event must carry
// _demosystem4.identification.core.ecid or it fails AEP schema validation and
// never lands on the profile (this is separate from Target, which doesn't need
// it). The ECID comes from the Web SDK identity (cached once resolved), and
// onBeforeEventSend stamps it onto every outgoing event's XDM — page views and
// interactions alike.
let demoEcid = '';

// Identity namespace for a signed-in user's Demo System User ID — the stable GUID
// (from /sign-in/users.json) that already exists on their AEP profile. Sent via
// identityMap on login so AEP recognizes the browser as that existing profile and
// stitches this ECID onto it. Namespace symbol confirmed in AEP: "Demo System -
// User ID" → `userId`. (This is the authoritative stitch mechanism; no XDM field
// stamping needed — that's ECID-only below, a separate demo-system requirement.)
const DEMO_USER_ID_NAMESPACE = 'userId';

function enrichDemoSystem(content) {
  /* eslint-disable no-underscore-dangle */
  const xdm = content.xdm || (content.xdm = {});
  const ds = xdm._demosystem4 || (xdm._demosystem4 = {});
  const id = ds.identification || (ds.identification = {});
  const core = id.core || (id.core = {});
  if (!core.ecid && demoEcid) core.ecid = demoEcid;
  /* eslint-enable no-underscore-dangle */
}

async function cacheEcid() {
  try {
    const { identity } = await window.webSdk('getIdentity', { namespaces: ['ECID'] });
    if (identity && identity.ECID) demoEcid = identity.ECID;
  } catch (e) {
    // identity not available yet — events still carry the _demosystem4 shape
  }
}

const alloyLoadedPromise = initWebSDK('./alloy.js', {
  datastreamId: '52111c1f-3550-417e-a968-2f17fb6ab876',
  orgId: '0E061E2D61F93F260A495FD6@AdobeOrg',
  defaultConsent: 'pending',
  onBeforeEventSend: enrichDemoSystem,
  // Adobe Brand Concierge (beta): Web SDK handles identity/context; the client
  // UI is loaded by the brand-concierge block. region: va7 | or2 | irl1.
  conversation: {
    region: 'va7',
    stickyConversationSession: true,
    collectSources: true,
  },
});

// --- Interaction tracking (education-benefits clicks, etc.) ----------------
// Adobe Tags/Launch is not on the page, so interactions are sent from here via
// the direct Web SDK. Every content link click is reported as a linkClicks
// event (the _demosystem4 ECID is added by onBeforeEventSend). Blocks can also
// call window.trackInteraction(name, url) directly.
let analyticsConsented = false;

function trackInteraction(name, url) {
  if (!analyticsConsented || !window.webSdk) return;
  window.webSdk('sendEvent', {
    xdm: {
      eventType: 'web.webinteraction.linkClicks',
      web: {
        webInteraction: {
          name: name || url || '',
          URL: url || window.location.href,
          linkClicks: { value: 1 },
          type: 'other',
        },
      },
    },
  });
}
window.trackInteraction = trackInteraction;

// Bridge the mock authentication (auth.js dispatches `auth.update`) to the
// martech stack. The data layer always reflects the signed-in state; once
// consented, the authenticated identity is attached to the Web SDK — the Demo
// System User ID as the PRIMARY identity (so AEP recognizes the existing profile
// and stitches this browser's ECID onto it), with email as a secondary identity.
function reflectAuthInDataLayer(user) {
  // merge=false so the `user` object is replaced wholesale (a deep merge would
  // leave a stale id/provider behind after sign-out) while `page` is preserved.
  window.updateDataLayer?.({
    user: user
      ? {
        authenticated: true,
        id: user.id,
        provider: user.provider,
        demoSystemUserId: user.demoSystemUserId,
      }
      : { authenticated: false },
  }, false);
}

function sendAuthenticatedIdentity(user) {
  if (!analyticsConsented || !window.webSdk || !user) return;
  const identityMap = {};
  if (user.demoSystemUserId) {
    identityMap[DEMO_USER_ID_NAMESPACE] = [
      { id: user.demoSystemUserId, primary: true, authenticatedState: 'authenticated' },
    ];
  }
  if (user.email) {
    identityMap.Email = [
      { id: user.email, primary: !user.demoSystemUserId, authenticatedState: 'authenticated' },
    ];
  }
  window.webSdk('sendEvent', {
    xdm: {
      eventType: 'web.webinteraction.linkClicks',
      identityMap,
      web: {
        webInteraction: {
          name: `sign-in:${user.provider}`,
          linkClicks: { value: 1 },
          type: 'other',
        },
      },
    },
  });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || !a.closest('main')) return; // content links only
  const name = (a.textContent || a.getAttribute('aria-label') || a.href).trim();
  trackInteraction(name, a.href);
});

// Bridge the site consent decision (dispatched by consent-check.js) to the
// Web SDK. 'in' releases queued events and lets decisions/analytics flow;
// 'out' keeps the SDK from collecting. Fires render decisions once granted.
let renderDecisionsRequested = false;
window.addEventListener('consent.update', async ({ detail }) => {
  const collect = detail?.consented ? 'y' : 'n';
  analyticsConsented = !!detail?.consented;
  try {
    // eslint-disable-next-line no-console
    console.log('[Target debug] consent.update start', {
      consented: !!detail?.consented,
      authenticated: !!getUser(),
      renderDecisionsRequested,
    });
    await alloyLoadedPromise;
    // eslint-disable-next-line no-console
    console.log('[Target debug] alloy configured', {
      authenticated: !!getUser(),
      renderDecisionsRequested,
    });
    await window.webSdk('setConsent', {
      consent: [{
        standard: 'Adobe',
        version: '2.0',
        value: { collect: { val: collect } },
      }],
    });
    // eslint-disable-next-line no-console
    console.log('[Target debug] setConsent success', {
      consented: !!detail?.consented,
      authenticated: !!getUser(),
    });
    if (detail?.consented && !renderDecisionsRequested) {
      renderDecisionsRequested = true;
      await cacheEcid(); // resolve the ECID first so events carry _demosystem4
      // eslint-disable-next-line no-console
      console.log('[Target debug] cacheEcid success', {
        authenticated: !!getUser(),
        hasUser: !!getUser(),
      });
      sendAuthenticatedIdentity(getUser()); // link a pre-existing session
      // eslint-disable-next-line no-console
      console.log('[Target debug] sendAuthenticatedIdentity dispatched', {
        authenticated: !!getUser(),
        hasDemoSystemUserId: !!getUser()?.demoSystemUserId,
      });
      await getAndApplyRenderDecisions();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[webSdk] consent/render flow failed:', error);
  }
});

// Reflect any existing session on load (pre-consent: data layer only), then keep
// both the data layer and Web SDK identity in step with sign-in / sign-out.
reflectAuthInDataLayer(getUser());
window.addEventListener('auth.update', ({ detail }) => {
  const user = detail?.user || null;
  reflectAuthInDataLayer(user);
  if (user) sendAuthenticatedIdentity(user);
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
 * Prepends an icon (white glyph on a navy circle) to the H1 of any section
 * whose section-metadata sets `headline-icon` (→ `data-headline-icon="name"`).
 * The glyph is pulled from `/icons/<name>.svg`.
 * @param {Element} main The main element
 */
function decorateHeadlineIcons(main) {
  main.querySelectorAll(':scope > .section[data-headline-icon]').forEach((section) => {
    const name = section.dataset.headlineIcon;
    const h1 = section.querySelector('h1');
    if (!name || !h1) return;
    const icon = document.createElement('span');
    icon.className = 'headline-icon';
    const img = document.createElement('img');
    img.src = `${window.hlx.codeBasePath}/icons/${name}.svg`;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    icon.append(img);
    h1.prepend(icon);
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
  decorateHeadlineIcons(main);
  decorateButtons(main);
}

/**
 * Builds a breadcrumb trail (nav > ol) from the URL path: a home link, one
 * link per ancestor path segment (title from the prettified slug), and the
 * current page (from the page h1). Matches the Block Collection markup.
 */
function buildBreadcrumbs() {
  const nav = document.createElement('nav');
  nav.className = 'breadcrumbs';
  nav.setAttribute('aria-label', 'Breadcrumb');
  const ol = document.createElement('ol');
  nav.append(ol);

  const addCrumb = (title, href, current) => {
    const li = document.createElement('li');
    if (current || !href) {
      li.textContent = title;
      if (current) li.setAttribute('aria-current', 'page');
    } else {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = title;
      li.append(a);
    }
    ol.append(li);
  };

  addCrumb('VA.gov home', '/');
  const segments = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  let path = '';
  segments.forEach((seg, i) => {
    path += `/${seg}`;
    const last = i === segments.length - 1;
    const title = last
      ? (document.querySelector('main h1')?.textContent.trim() || document.title)
      : seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    addCrumb(title, path, last);
  });

  return nav;
}

/**
 * `interior-2-col` template: split the page into a wide main column and a
 * narrow right rail. Sections with section-metadata `Section: column-2`
 * (rendered as `data-section="column-2"`) go to the rail; everything else
 * stacks in the main column. A breadcrumb trail spans the top. Applied only to
 * the page main (not fragments), after sections are decorated.
 * @param {Element} main The main element
 */
function decorateTwoColTemplate(main) {
  if (!document.body.classList.contains('interior-2-col')) return;
  const sections = [...main.querySelectorAll(':scope > .section')];
  if (!sections.length) return;

  const starDivider = () => {
    const div = document.createElement('div');
    div.className = 'section-divider';
    const img = document.createElement('img');
    img.src = `${window.hlx.codeBasePath}/icons/stars-E7HVB7EU.png`;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    div.append(img);
    return div;
  };

  const mainCol = document.createElement('div');
  mainCol.className = 'interior-main';
  const rail = document.createElement('div');
  rail.className = 'interior-rail';
  sections.forEach((s) => {
    if (s.dataset.section === 'column-2') {
      rail.append(s);
      return;
    }
    // separate each main-column section with a ruled-stars divider
    if (mainCol.children.length) mainCol.append(starDivider());
    mainCol.append(s);
  });

  main.append(mainCol);
  if (rail.children.length) main.append(rail);
  else main.classList.add('interior-no-rail');

  main.prepend(buildBreadcrumbs());
}

/**
 * `interior-left-nav` template: a narrow left rail (secondary nav) beside a
 * wide main content column — the mirror of interior-2-col. Sections that hold a
 * `leftnav` block (or set section-metadata `Section: left`) go to the left
 * rail; everything else stacks in the main column. A breadcrumb trail spans the
 * top. Applied only to the page main (not fragments), after sections decorate.
 * @param {Element} main The main element
 */
function decorateLeftNavTemplate(main) {
  if (!document.body.classList.contains('interior-left-nav')) return;
  const sections = [...main.querySelectorAll(':scope > .section')];
  if (!sections.length) return;

  const rail = document.createElement('div');
  rail.className = 'leftnav-rail';
  const mainCol = document.createElement('div');
  mainCol.className = 'leftnav-main';
  sections.forEach((s) => {
    const isRail = s.dataset.section === 'left' || s.querySelector('.leftnav');
    (isRail ? rail : mainCol).append(s);
  });

  // Autoblock the leftnav when none was authored, so every interior-left-nav
  // page gets the left rail (title from metadata + nav loaded from a document).
  if (!rail.querySelector('.leftnav')) {
    const section = document.createElement('div');
    section.className = 'section';
    const wrapper = document.createElement('div');
    const block = document.createElement('div');
    block.className = 'leftnav';
    wrapper.append(block);
    section.append(wrapper);
    rail.append(section);
    decorateBlock(block);
    loadBlock(block);
  }

  main.append(rail); // left rail first
  main.append(mainCol);

  main.prepend(buildBreadcrumbs());
}

// Classes that carry a leading token but are NOT blocks — don't treat as blocks.
const NON_BLOCK_CLASSES = new Set([
  'block', 'section', 'default-content-wrapper', 'button-container', 'button', 'icon', 'cta-arrow',
  'section-columns', 'section-column',
]);

/**
 * Is this a block that was injected post-load (e.g. by a Target activity) and
 * hasn't been decorated yet? A block's first class is its name; skip structural
 * wrappers and anything already inside a decorated block (which covers a block's
 * own generated children, so we never recurse into them).
 * @param {Element} el
 */
function isUndecoratedBlock(el) {
  if (!(el instanceof Element)
    || el.dataset.blockStatus
    || el.classList.contains('block')
    || el.classList.contains('section')) return false;
  const name = el.classList[0];
  if (!name || NON_BLOCK_CLASSES.has(name) || name.endsWith('-wrapper') || name.endsWith('-container')) {
    return false;
  }
  return !el.closest('[data-block-status]');
}

function decorateIfInjectedBlock(el) {
  if (!isUndecoratedBlock(el)) return;
  decorateBlock(el);
  loadBlock(el);
}

/**
 * Decorates blocks that appear in `main` after initial load — e.g. a promo-banner
 * inserted by a Target activity — so they get the same decorate()/CSS treatment
 * as authored blocks. Started only after initial decoration completes, so it
 * never races or double-decorates the page's own blocks.
 *
 * The observer is attached first, then we sweep any blocks already present: with
 * eager consent the Target decision can insert its block BEFORE this runs (fast/
 * cached loads), so a live observer alone would intermittently miss it. The sweep
 * catches those; the observer catches everything injected afterward. Both paths
 * are idempotent (the data-block-status guard skips already-decorated blocks).
 * @param {Element} main
 */
function observeInjectedBlocks(main) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        decorateIfInjectedBlock(node);
        node.querySelectorAll('[class]').forEach(decorateIfInjectedBlock);
      });
    });
  });
  observer.observe(main, { childList: true, subtree: true });
  main.querySelectorAll('[class]').forEach(decorateIfInjectedBlock);
}

/**
 * Auth-gated pages: if the page sets metadata `auth` (true/yes/1) and no one is
 * signed in, automatically open the sign-in chooser modal. After signing in the
 * visitor is returned to this page (authenticated). The modal is still
 * dismissible — content decides how much to reveal to a signed-out visitor.
 */
function enforceAuthGate() {
  const flag = (getMetadata('auth') || '').trim().toLowerCase();
  if (!['true', 'yes', '1'].includes(flag)) return;
  if (getUser()) return;
  if (/^\/sign-in\/?/.test(window.location.pathname)) return; // never on sign-in itself
  const ret = window.location.pathname + window.location.search + window.location.hash;
  // Non-dismissible: the visitor must sign in to see an auth-gated page.
  openSignInModal(ret, { dismissible: false });
}

/**
 * Reads the persisted consent decision synchronously (localStorage or the
 * ?consent= override, matching consent-check.js). Lets us release the Web SDK and
 * request Target/personalization decisions eagerly for returning, already-
 * consented visitors — so the decision is in-flight before the hero paints,
 * instead of waiting for the late consent banner in loadDelayed(). This closes
 * the Target flicker (FOOC) window without hiding any content, so no CWV impact.
 * First-time visitors stay gated (pending) until they choose.
 * @returns {boolean}
 */
function consentAlreadyGranted() {
  try {
    const param = new URLSearchParams(window.location.search).get('consent');
    if (param !== null) return ['accept', 'true', '1', 'yes'].includes(param.toLowerCase());
    return localStorage.getItem('va-consent') === 'accept';
  } catch (e) {
    return false;
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  // Demo/test aid: `?user=<id|email>` signs in as a sheet user before anything
  // decorates, so auth-gated UI renders without the login flow. No-op otherwise.
  await establishTestUserFromParam();
  // For a returning, already-consented visitor, kick off the consented Web SDK
  // path now (setConsent + render decisions) so personalization lands before the
  // hero renders. The renderDecisionsRequested guard in the consent.update
  // handler keeps the later banner dispatch from re-fetching.
  if (consentAlreadyGranted()) {
    window.dispatchEvent(new CustomEvent('consent.update', { detail: { consented: true } }));
  }
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    decorateTwoColTemplate(main);
    decorateLeftNavTemplate(main);
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

  // Now that the page's own blocks are decorated, watch for blocks injected
  // later (e.g. by a Target activity) and decorate them too.
  observeInjectedBlocks(main);

  // Auth-gated pages: prompt sign-in when the visitor isn't authenticated.
  enforceAuthGate();

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
